import { Router, type IRouter } from "express";
import { db, sportsActivitesTable, sportsPhotosTable, documentsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { CreateActiviteSportBody } from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

router.get("/sports/activites", requireAuth, async (_req, res): Promise<void> => {
  const data = await db.select().from(sportsActivitesTable).orderBy(desc(sportsActivitesTable.dateActivite));
  res.json(data);
});

router.post("/sports/activites", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateActiviteSportBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [a] = await db.insert(sportsActivitesTable).values(parsed.data).returning();
  res.status(201).json(a);
});

router.get("/sports/activites/:id", requireAuth, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const [a] = await db.select().from(sportsActivitesTable).where(eq(sportsActivitesTable.id, id));
  if (!a) { res.status(404).json({ error: "Activité introuvable" }); return; }
  const photos = await db.select().from(sportsPhotosTable).where(eq(sportsPhotosTable.activiteId, id));
  const documentIds = photos.map(p => p.documentId);
  const docs = documentIds.length
    ? await db.select().from(documentsTable)
    : [];
  res.json({ ...a, photos: docs.filter(d => documentIds.includes(d.id)) });
});

router.post("/sports/activites/:id/photos", requireAuth, async (req, res): Promise<void> => {
  const activiteId = Number(req.params.id);
  const { documentId } = req.body as { documentId: number };
  const [p] = await db.insert(sportsPhotosTable).values({ activiteId, documentId }).returning();
  res.status(201).json(p);
});

export default router;
