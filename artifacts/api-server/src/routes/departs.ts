import { Router, type IRouter } from "express";
import { db, departsTable, membresTable, cotisationsTable, assistancesTable, mouvementsEffectifsTable, parametresTable } from "@workspace/db";
import { eq, and, or, desc } from "drizzle-orm";
import { CreateDepartBody } from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

async function loadParams(): Promise<Record<string, number>> {
  const rows = await db.select().from(parametresTable);
  const p: Record<string, number> = {
    delaiMinDemissionApresAssistance: 60,
    fractionIndemniteDemissionNpg: 1 / 4,
    fractionIndemniteDemissionMutuelle: 1 / 8,
  };
  for (const r of rows) p[r.cle] = Number(r.valeur);
  return p;
}

router.get("/departs", requireAuth, async (_req, res): Promise<void> => {
  const data = await db.select().from(departsTable).orderBy(desc(departsTable.createdAt));
  const membres = await db.select().from(membresTable);
  const map = Object.fromEntries(membres.map(m => [m.id, m]));
  res.json(data.map(d => ({ ...d, membreNom: map[d.membreId]?.nom, membrePrenom: map[d.membreId]?.prenom, matricule: map[d.membreId]?.matricule })));
});

/**
 * POST /departs — Instruction d'un départ (démission, licenciement, radiation).
 * Calcule automatiquement l'indemnité conformément à l'Article 98 du Règlement Intérieur :
 *   1. Aucune démission n'est recevable avant 5 ans (60 mois) si le membre a bénéficié
 *      d'une assistance sociale ou d'une adhésion exceptionnelle (sauf déduction du montant reçu) ;
 *   2. Démissionnaire de la NPG.CI (par ricochet de la mutuelle), jamais assisté : 1/4 des cotisations totales ;
 *   3. Démissionnaire de la seule mutuelle (reste à la NPG.CI), jamais assisté : 1/8 des cotisations totales ;
 *   5. Membre radié : aucun droit, cotisations acquises à la mutuelle.
 */
router.post("/departs", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateDepartBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const d = parsed.data;

  const [membre] = await db.select().from(membresTable).where(eq(membresTable.id, d.membreId));
  if (!membre) { res.status(404).json({ error: "Membre introuvable" }); return; }

  const cotisations = await db.select().from(cotisationsTable).where(eq(cotisationsTable.membreId, d.membreId));
  const totalCotisations = cotisations.reduce((s, c) => s + c.montant, 0);

  const assistancesRecues = await db.select().from(assistancesTable).where(
    and(eq(assistancesTable.membreId, d.membreId), or(eq(assistancesTable.statut, "approuvee"), eq(assistancesTable.statut, "payee")))
  );
  const aBeneficieAssistance = assistancesRecues.length > 0 || membre.typeAdhesion === "exceptionnel";

  const params = await loadParams();
  const moisAnciennete = Math.floor(
    (new Date(d.dateDepart).getTime() - new Date(membre.dateAdhesion).getTime()) / (30.44 * 24 * 3600 * 1000)
  );
  const bloqueParDelai = aBeneficieAssistance && moisAnciennete < (params.delaiMinDemissionApresAssistance ?? 60);

  let fraction = "aucune";
  let montantIndemnite = 0;

  if (d.type === "radiation") {
    fraction = "aucune"; montantIndemnite = 0; // Art. 98.5 : aucun droit
  } else if (!aBeneficieAssistance) {
    if (d.type === "demission_npg" || d.type === "licenciement") {
      fraction = "1/4";
      montantIndemnite = Math.round(totalCotisations * (params.fractionIndemniteDemissionNpg ?? 0.25));
    } else if (d.type === "demission_mutuelle") {
      fraction = "1/8";
      montantIndemnite = Math.round(totalCotisations * (params.fractionIndemniteDemissionMutuelle ?? 0.125));
    }
  }
  // Si bloqué par délai (< 5 ans et déjà assisté), l'indemnité éventuelle sera déduite du montant déjà perçu :
  // on n'annule pas le dossier mais on le signale (bloqueParDelai=true) pour arbitrage du B.E / des conseillers.

  const [depart] = await db.insert(departsTable).values({
    membreId: d.membreId, type: d.type, dateDepart: d.dateDepart, motif: d.motif,
    aBeneficieAssistanceSociale: aBeneficieAssistance,
    totalCotisations, fraction, montantIndemnite, bloqueParDelai,
    statut: "en_attente",
  }).returning();

  await db.insert(mouvementsEffectifsTable).values({
    membreId: d.membreId,
    type: d.type === "licenciement" ? "licenciement" : d.type === "radiation" ? "radiation" : "demission",
    details: d.motif,
  });

  res.status(201).json(depart);
});

router.post("/departs/:id/valider", requireAuth, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const [depart] = await db.select().from(departsTable).where(eq(departsTable.id, id));
  if (!depart) { res.status(404).json({ error: "Dossier introuvable" }); return; }

  const [updated] = await db.update(departsTable).set({ statut: "valide" }).where(eq(departsTable.id, id)).returning();

  const nouveauStatutMembre =
    depart.type === "radiation" ? "radie" :
    depart.type === "licenciement" ? "radie" : "demissionnaire";
  await db.update(membresTable).set({
    statut: nouveauStatutMembre, dateDepart: depart.dateDepart, motifDepart: depart.type,
  }).where(eq(membresTable.id, depart.membreId));

  res.json(updated);
});

export default router;
