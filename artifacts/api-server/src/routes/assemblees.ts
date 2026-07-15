import { Router, type IRouter } from "express";
import { db, assembleesTable, presencesAssembleeTable, resolutionsAssembleeTable, membresTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { CreateAssembleeBody, CloturerAssembleeBody, CreateResolutionBody, VoterResolutionBody, MarquerPresenceBody } from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

router.get("/assemblees", requireAuth, async (_req, res): Promise<void> => {
  const data = await db.select().from(assembleesTable).orderBy(desc(assembleesTable.createdAt));
  res.json(data);
});

// POST /assemblees — Art.15 R.I. : convoquée au moins 1 mois à l'avance (ordinaire) ;
// Art.18 R.I. : l'extraordinaire nécessite 2/3 des membres présents pour siéger.
router.post("/assemblees", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateAssembleeBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const d = parsed.data;
  const quorumRequisPct = d.type === "extraordinaire" ? 67 : 50;
  const [a] = await db.insert(assembleesTable).values({ ...d, quorumRequisPct }).returning();
  res.status(201).json(a);
});

router.get("/assemblees/:id", requireAuth, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const [a] = await db.select().from(assembleesTable).where(eq(assembleesTable.id, id));
  if (!a) { res.status(404).json({ error: "Assemblée introuvable" }); return; }
  const presences = await db.select().from(presencesAssembleeTable).where(eq(presencesAssembleeTable.assembleeId, id));
  const resolutions = await db.select().from(resolutionsAssembleeTable).where(eq(resolutionsAssembleeTable.assembleeId, id));
  const membres = await db.select().from(membresTable);
  const map = Object.fromEntries(membres.map(m => [m.id, m]));
  const presentsCount = presences.filter(p => p.present).length;
  const quorumAtteint = a.nombreMembresActifsTotal
    ? (presentsCount / a.nombreMembresActifsTotal) * 100 >= (a.quorumRequisPct ?? 50)
    : null;
  res.json({
    ...a,
    presences: presences.map(p => ({ ...p, membreNom: map[p.membreId]?.nom, membrePrenom: map[p.membreId]?.prenom })),
    resolutions,
    presentsCount,
    quorumAtteint,
  });
});

// POST /assemblees/:id/presences — émargement numérique
router.post("/assemblees/:id/presences", requireAuth, async (req, res): Promise<void> => {
  const assembleeId = Number(req.params.id);
  const parsed = MarquerPresenceBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const d = parsed.data;

  const [existante] = await db.select().from(presencesAssembleeTable).where(
    and(eq(presencesAssembleeTable.assembleeId, assembleeId), eq(presencesAssembleeTable.membreId, d.membreId))
  );
  if (existante) {
    const [updated] = await db.update(presencesAssembleeTable).set({
      present: d.present, emargementAt: d.present ? new Date() : null,
    }).where(eq(presencesAssembleeTable.id, existante.id)).returning();
    res.json(updated);
    return;
  }
  const [created] = await db.insert(presencesAssembleeTable).values({
    assembleeId, membreId: d.membreId, present: d.present, emargementAt: d.present ? new Date() : undefined,
  }).returning();
  res.status(201).json(created);
});

// POST /assemblees/:id/cloturer — enregistre le quorum final (calcul automatique Art.18.3 R.I.)
router.post("/assemblees/:id/cloturer", requireAuth, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const parsed = CloturerAssembleeBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [updated] = await db.update(assembleesTable).set({
    ...parsed.data, statut: "cloturee",
  }).where(eq(assembleesTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Assemblée introuvable" }); return; }
  res.json(updated);
});

// Résolutions + vote (main levée ou bulletin secret) + calcul d'adoption
router.post("/assemblees/:id/resolutions", requireAuth, async (req, res): Promise<void> => {
  const assembleeId = Number(req.params.id);
  const parsed = CreateResolutionBody.safeParse({ ...req.body, assembleeId });
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [r] = await db.insert(resolutionsAssembleeTable).values(parsed.data).returning();
  res.status(201).json(r);
});

router.post("/assemblees/resolutions/:resolutionId/voter", requireAuth, async (req, res): Promise<void> => {
  const id = Number(req.params.resolutionId);
  const parsed = VoterResolutionBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const d = parsed.data;
  const total = d.pour + d.contre + d.abstention;
  const [r] = await db.select().from(resolutionsAssembleeTable).where(eq(resolutionsAssembleeTable.id, id));
  if (!r) { res.status(404).json({ error: "Résolution introuvable" }); return; }
  const [assemblee] = await db.select().from(assembleesTable).where(eq(assembleesTable.id, r.assembleeId));

  // Majorité simple (AG ordinaire, Art.16.2 R.I.) ou 2/3 (AG extraordinaire, Art.18.3 R.I.)
  const seuil = assemblee?.type === "extraordinaire" ? 2 / 3 : 0.5;
  const adoptee = total > 0 && d.pour / total > seuil;

  const [updated] = await db.update(resolutionsAssembleeTable).set({ ...d, adoptee }).where(eq(resolutionsAssembleeTable.id, id)).returning();
  res.json(updated);
});

export default router;
