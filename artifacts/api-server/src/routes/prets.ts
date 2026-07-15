import { Router, type IRouter } from "express";
import { db, pretsTable, pretRemboursementsTable, membresTable, cotisationsTable, parametresTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { CreatePretBody, ValiderPretBody, ListPretsQueryParams, MarquerEcheanceBody } from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";
import type { JwtPayload } from "../lib/auth";

const router: IRouter = Router();

async function loadParams(): Promise<Record<string, number>> {
  const rows = await db.select().from(parametresTable);
  const p: Record<string, number> = { plafondPretSante: 500000, maxMoisRemboursementPret: 20, differeMoisPret: 3 };
  for (const r of rows) p[r.cle] = Number(r.valeur);
  return p;
}

function buildPretResponse(pr: any, membre?: any) {
  return {
    id: pr.id, membreId: pr.membreId,
    membreNom: membre?.nom ?? null, membrePrenom: membre?.prenom ?? null, membreMatricule: membre?.matricule ?? null,
    motif: pr.motif, montantDemande: pr.montantDemande, montantAccorde: pr.montantAccorde,
    dureeMois: pr.dureeMois, differeMois: pr.differeMois, dateDecaissement: pr.dateDecaissement,
    statut: pr.statut, createdAt: pr.createdAt?.toISOString?.() ?? pr.createdAt,
  };
}

// GET /prets — liste (filtrable par membre/statut)
router.get("/prets", requireAuth, async (req, res): Promise<void> => {
  const parsed = ListPretsQueryParams.safeParse(req.query);
  const { membreId, statut } = (parsed.success ? parsed.data : {}) as any;
  const conditions: any[] = [];
  if (membreId) conditions.push(eq(pretsTable.membreId, Number(membreId)));
  if (statut) conditions.push(eq(pretsTable.statut, statut));
  const where = conditions.length ? and(...conditions) : undefined;

  const data = await db.select().from(pretsTable).where(where).orderBy(desc(pretsTable.createdAt));
  const membres = await db.select().from(membresTable);
  const membreMap = Object.fromEntries(membres.map(m => [m.id, m]));
  res.json(data.map(pr => buildPretResponse(pr, membreMap[pr.membreId])));
});

// POST /prets — demande de prêt (Art. 57 R.I. : plafond 500 000F, remboursable en 20 mois max)
router.post("/prets", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreatePretBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const user = (req as any).user as JwtPayload;
  const d = parsed.data;

  const [membre] = await db.select().from(membresTable).where(eq(membresTable.id, d.membreId));
  if (!membre) { res.status(404).json({ error: "Membre introuvable" }); return; }
  if (membre.statut !== "actif") {
    res.status(400).json({ error: "Seul un membre actif non suspendu peut bénéficier d'un prêt (Art. 57.1 R.I.)." });
    return;
  }

  const params = await loadParams();
  const plafond = params.plafondPretSante ?? 500000;
  if (d.montantDemande > plafond) {
    res.status(400).json({ error: `Le montant demandé dépasse le plafond autorisé de ${plafond.toLocaleString("fr-FR")} FCFA (Art. 57.2 R.I.).` });
    return;
  }

  // Vérifier qu'aucun prêt n'est en cours (non soldé) pour ce membre
  const enCours = await db.select().from(pretsTable).where(and(eq(pretsTable.membreId, d.membreId), eq(pretsTable.statut, "accorde")));
  if (enCours.length > 0) {
    res.status(400).json({ error: "Ce membre a déjà un prêt en cours non soldé.", code: "PRET_EN_COURS" });
    return;
  }

  const [pret] = await db.insert(pretsTable).values({
    membreId: d.membreId, motif: d.motif,
    montantDemande: d.montantDemande,
    dureeMois: Math.min(d.dureeMois ?? 20, params.maxMoisRemboursementPret ?? 20),
    differeMois: params.differeMoisPret ?? 3,
    statut: "commission_prets",
    createdById: user.userId,
  }).returning();

  res.status(201).json(buildPretResponse(pret, membre));
});

router.get("/prets/:id", requireAuth, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const [pr] = await db.select().from(pretsTable).where(eq(pretsTable.id, id));
  if (!pr) { res.status(404).json({ error: "Prêt introuvable" }); return; }
  const [membre] = await db.select().from(membresTable).where(eq(membresTable.id, pr.membreId));
  const echeances = await db.select().from(pretRemboursementsTable).where(eq(pretRemboursementsTable.pretId, id));
  res.json({ ...buildPretResponse(pr, membre), echeances });
});

// POST /prets/:id/valider — avis commission puis décaissement (Art. 57.3 R.I.)
router.post("/prets/:id/valider", requireAuth, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const parsed = ValiderPretBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const d = parsed.data;

  const [pr] = await db.select().from(pretsTable).where(eq(pretsTable.id, id));
  if (!pr) { res.status(404).json({ error: "Prêt introuvable" }); return; }

  if (d.decision === "rejeter") {
    const [updated] = await db.update(pretsTable).set({ statut: "rejete" }).where(eq(pretsTable.id, id)).returning();
    res.json(buildPretResponse(updated));
    return;
  }

  const ordre = ["commission_prets", "bureau", "direction_generale", "accorde"];
  const idx = ordre.indexOf(pr.statut);
  const prochain = idx >= 0 && idx < ordre.length - 1 ? ordre[idx + 1] : "accorde";

  const montantAccorde = d.montantAccorde ?? pr.montantAccorde ?? pr.montantDemande;
  const updateData: any = { statut: prochain };
  if (d.montantAccorde) updateData.montantAccorde = d.montantAccorde;

  if (prochain === "accorde") {
    updateData.montantAccorde = montantAccorde;
    updateData.dateDecaissement = new Date().toISOString().slice(0, 10);

    // Génère l'échéancier après le différé (Art. 57.2 : différé de 3 mois après reprise de service)
    const dureeMois = pr.dureeMois ?? 20;
    const differeMois = pr.differeMois ?? 3;
    const mensualite = Math.round(montantAccorde / dureeMois);
    const dateDebut = new Date();
    dateDebut.setMonth(dateDebut.getMonth() + differeMois);
    for (let i = 1; i <= dureeMois; i++) {
      const dateEcheance = new Date(dateDebut);
      dateEcheance.setMonth(dateEcheance.getMonth() + (i - 1));
      await db.insert(pretRemboursementsTable).values({
        pretId: id, echeance: i,
        dateEcheance: dateEcheance.toISOString().slice(0, 10),
        montant: mensualite,
      });
    }
  }

  const [updated] = await db.update(pretsTable).set(updateData).where(eq(pretsTable.id, id)).returning();
  res.json(buildPretResponse(updated));
});

// PATCH /prets/:pretId/echeances/:echeanceId — pointer un remboursement comme payé
router.patch("/prets/:pretId/echeances/:echeanceId", requireAuth, async (req, res): Promise<void> => {
  const echeanceId = Number(req.params.echeanceId);
  const parsed = MarquerEcheanceBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [updated] = await db.update(pretRemboursementsTable).set({
    paye: parsed.data.paye,
    datePaiement: parsed.data.paye ? new Date().toISOString().slice(0, 10) : null,
  }).where(eq(pretRemboursementsTable.id, echeanceId)).returning();
  if (!updated) { res.status(404).json({ error: "Échéance introuvable" }); return; }

  // Si toutes les échéances sont payées, solder le prêt
  const toutes = await db.select().from(pretRemboursementsTable).where(eq(pretRemboursementsTable.pretId, Number(req.params.pretId)));
  if (toutes.length > 0 && toutes.every(e => e.paye)) {
    await db.update(pretsTable).set({ statut: "solde" }).where(eq(pretsTable.id, Number(req.params.pretId)));
  }
  res.json(updated);
});

// GET /prets/stats/retards — prêts en retard (échéance dépassée non payée)
router.get("/prets/stats/retards", requireAuth, async (_req, res): Promise<void> => {
  const today = new Date().toISOString().slice(0, 10);
  const echeances = await db.select().from(pretRemboursementsTable);
  const enRetard = echeances.filter(e => !e.paye && e.dateEcheance && e.dateEcheance < today);
  const pretIds = [...new Set(enRetard.map(e => e.pretId))];
  res.json({ nombreEcheancesEnRetard: enRetard.length, pretIds });
});

export default router;
