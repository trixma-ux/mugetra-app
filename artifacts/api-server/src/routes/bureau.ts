import { Router, type IRouter } from "express";
import { db, bureauMandatsTable, reunionsBureauTable, presencesReunionBureauTable, decisionsBureauTable, membresTable, ecrituresComptablesTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { CreateMandatBody, CreateReunionBureauBody, UpdateReunionBureauBody, CreateDecisionBureauBody } from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";
import type { JwtPayload } from "../lib/auth";

const router: IRouter = Router();

// ─────────────────────────── MANDATS ───────────────────────────

router.get("/bureau/mandats", requireAuth, async (_req, res): Promise<void> => {
  const data = await db.select().from(bureauMandatsTable).orderBy(desc(bureauMandatsTable.createdAt));
  const membres = await db.select().from(membresTable);
  const map = Object.fromEntries(membres.map(m => [m.id, m]));
  res.json(data.map(m => ({ ...m, membreNom: map[m.membreId]?.nom, membrePrenom: map[m.membreId]?.prenom })));
});

// Le Président nomme les autres membres du B.E (Art. 21 R.I.) — sauf président/commissaires, qui sont élus (module élections)
router.post("/bureau/mandats", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateMandatBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  // Un membre ne peut cumuler deux postes actifs en même temps
  const actifs = await db.select().from(bureauMandatsTable).where(
    and(eq(bureauMandatsTable.membreId, parsed.data.membreId), eq(bureauMandatsTable.actif, true))
  );
  if (actifs.length > 0) {
    res.status(400).json({ error: "Ce membre occupe déjà un poste actif au Bureau Exécutif." });
    return;
  }
  const [m] = await db.insert(bureauMandatsTable).values(parsed.data).returning();
  res.status(201).json(m);
});

router.post("/bureau/mandats/:id/mettre-fin", requireAuth, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const [updated] = await db.update(bureauMandatsTable).set({
    actif: false, dateFin: new Date().toISOString().slice(0, 10),
  }).where(eq(bureauMandatsTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Mandat introuvable" }); return; }
  res.json(updated);
});

// ─────────────────────────── RÉUNIONS ───────────────────────────

router.get("/bureau/reunions", requireAuth, async (_req, res): Promise<void> => {
  const data = await db.select().from(reunionsBureauTable).orderBy(desc(reunionsBureauTable.dateReunion));
  res.json(data);
});

// Art. 12 Statuts / Art. 19.2 R.I. : le B.E se réunit au moins une fois par mois.
// Art. 79 R.I. : tout décaissement pour l'organisation de la réunion est prélevé sur le budget de fonctionnement du B.E.
router.post("/bureau/reunions", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateReunionBureauBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const user = (req as any).user as JwtPayload;
  const [r] = await db.insert(reunionsBureauTable).values(parsed.data).returning();

  if (parsed.data.decaissementMontant && parsed.data.decaissementMontant > 0) {
    await db.insert(ecrituresComptablesTable).values({
      date: parsed.data.dateReunion, type: "decaissement", categorie: "fonctionnement",
      libelle: `Frais de réunion du Bureau Exécutif du ${parsed.data.dateReunion}`,
      montant: parsed.data.decaissementMontant, compte: "caisse",
      refType: "reunion_bureau", refId: r.id, createdById: user.userId,
    });
  }
  res.status(201).json(r);
});

router.patch("/bureau/reunions/:id", requireAuth, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const parsed = UpdateReunionBureauBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [updated] = await db.update(reunionsBureauTable).set(parsed.data).where(eq(reunionsBureauTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Réunion introuvable" }); return; }
  res.json(updated);
});

router.post("/bureau/reunions/:id/presences", requireAuth, async (req, res): Promise<void> => {
  const reunionId = Number(req.params.id);
  const { membreId, present } = req.body as { membreId: number; present: boolean };
  const [existante] = await db.select().from(presencesReunionBureauTable).where(
    and(eq(presencesReunionBureauTable.reunionId, reunionId), eq(presencesReunionBureauTable.membreId, membreId))
  );
  if (existante) {
    const [updated] = await db.update(presencesReunionBureauTable).set({ present }).where(eq(presencesReunionBureauTable.id, existante.id)).returning();
    res.json(updated);
    return;
  }
  const [created] = await db.insert(presencesReunionBureauTable).values({ reunionId, membreId, present }).returning();
  res.status(201).json(created);
});

// ─────────────────────────── DÉCISIONS ───────────────────────────

router.get("/bureau/decisions", requireAuth, async (_req, res): Promise<void> => {
  const data = await db.select().from(decisionsBureauTable).orderBy(desc(decisionsBureauTable.createdAt));
  res.json(data);
});

router.post("/bureau/decisions", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateDecisionBureauBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [d] = await db.insert(decisionsBureauTable).values(parsed.data).returning();
  res.status(201).json(d);
});

export default router;
