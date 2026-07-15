import { Router, type IRouter } from "express";
import { db, parametresTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { UpdateParametresBody } from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

const DEFAULT_PARAMETRES: Record<string, number> = {
  cotisationMensuelle: 7500,
  // Art. 47 R.I. — assistance décès des membres déclarés de la famille
  assistanceDecesDescendantConjoint: 500000, // décès d'un(e) descendant(e) ou conjoint(e)
  assistanceDecesAscendant: 400000, // décès d'un(e) ascendant(e)
  assistanceDecesBeauParent: 200000, // décès d'un beau-parent biologique
  assistanceDecesMortNe: 150000, // mort-né ou né-mort
  // Art. 48 R.I. — décès d'un membre actif
  assistanceDecesMembreActifFunerailles: 300000, // organisation des funérailles (à la demande de la famille)
  assistanceDecesMembreActifAyantsDroit: 1200000, // aux ayants droit, après les funérailles
  // Art. 49 R.I. — frais de mission du Bureau (déplacement pour les funérailles)
  fraisMissionAbidjan: 50000,
  fraisMissionInterieur: 100000,
  // Art. 52 R.I. — mariage
  assistanceMariage: 100000,
  // Art. 56 R.I. — retraite (2 ans de cotisation ininterrompue) et licenciement (2/3 des cotisations)
  assistanceRetraite: 1000000,
  fractionAssistanceLicenciement: 2 / 3,
  moisMinCotiseLicenciement: 12,
  // Art. 57 R.I. — prêts santé
  plafondPretSante: 500000,
  maxMoisRemboursementPret: 20,
  differeMoisPret: 3,
  // Art. 8 Statuts — délais de carence
  delaiCarenceNouveauCdi: 3, // nouveaux CDI, cas décès/mariage
  delaiCarenceAncienCdi: 10, // anciens CDI, cas décès/mariage
  delaiCarenceRetraite: 60, // 5 ans, cas retraite
  delaiCarenceAdhesionExceptionnelle: 6, // Décision n°05-2025
  // Art. 46 R.I. — remplacement de nom d'ascendant/conjoint(e)
  delaiCarenceRemplacementConjoint: 12,
  // Art. 8 Statuts — régularisation
  maxMoisRegularisation: 24,
  // Art. 98 R.I. — départ / démission
  delaiMinDemissionApresAssistance: 60, // 5 ans (60 mois)
  fractionIndemniteDemissionNpg: 1 / 4,
  fractionIndemniteDemissionMutuelle: 1 / 8,
  // Fiche RC — retraite complémentaire
  cotisationMinRc: 2500,
  tauxRachatPartielMaxRc: 0.5,
  moisMinRachatRc: 60,
  // Art. 80 R.I. — budget de fonctionnement du Bureau Exécutif
  pctBudgetBeCotisations: 0.05,
  pctBudgetBeDons: 0.15,
};

async function ensureDefaults() {
  const existing = await db.select().from(parametresTable);
  const existingKeys = new Set(existing.map(p => p.cle));
  for (const [cle, valeur] of Object.entries(DEFAULT_PARAMETRES)) {
    if (!existingKeys.has(cle)) {
      await db.insert(parametresTable).values({ cle, valeur: String(valeur), description: cle });
    }
  }
}

router.get("/parametres", requireAuth, async (_req, res): Promise<void> => {
  await ensureDefaults();
  const params = await db.select().from(parametresTable);
  const result: Record<string, number> = {};
  for (const p of params) {
    result[p.cle] = Number(p.valeur);
  }
  res.json(result);
});

router.put("/parametres", requireAuth, async (req, res): Promise<void> => {
  const parsed = UpdateParametresBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const updates = parsed.data as any;
  for (const [cle, valeur] of Object.entries(updates)) {
    if (valeur == null) continue;
    const existing = await db.select().from(parametresTable).where(eq(parametresTable.cle, cle));
    if (existing.length > 0) {
      await db.update(parametresTable).set({ valeur: String(valeur) }).where(eq(parametresTable.cle, cle));
    } else {
      await db.insert(parametresTable).values({ cle, valeur: String(valeur) });
    }
  }
  await ensureDefaults();
  const params = await db.select().from(parametresTable);
  const result: Record<string, number> = {};
  for (const p of params) result[p.cle] = Number(p.valeur);
  res.json(result);
});

export default router;
