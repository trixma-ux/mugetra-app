import { Router, type IRouter } from "express";
import { db, annoncesTable, usersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { CreateAnnonceBody, UpdateAnnonceBody, UpdateAnnonceParams, DeleteAnnonceParams } from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";
import type { JwtPayload } from "../lib/auth";

const router: IRouter = Router();

function buildAnnonceResponse(a: any, auteur?: any) {
  return {
    id: a.id, titre: a.titre, contenu: a.contenu,
    publiePar: auteur ? `${auteur.prenom} ${auteur.nom}` : "Administration",
    important: a.priorite === "urgente",
    createdAt: a.createdAt?.toISOString?.() ?? a.createdAt,
  };
}

router.get("/annonces", requireAuth, async (_req, res): Promise<void> => {
  const annonces = await db.select().from(annoncesTable).orderBy(desc(annoncesTable.createdAt));
  const users = await db.select().from(usersTable);
  const userMap = Object.fromEntries(users.map(u => [u.id, u]));
  res.json(annonces.map(a => buildAnnonceResponse(a, a.auteurId ? userMap[a.auteurId] : null)));
});

router.post("/annonces", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateAnnonceBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const user = (req as any).user as JwtPayload;
  const d = parsed.data as any;
  const [a] = await db.insert(annoncesTable).values({
    titre: d.titre, contenu: d.contenu, auteurId: user.userId,
    priorite: d.important ? "urgente" : "normale",
  }).returning();
  const [auteur] = await db.select().from(usersTable).where(eq(usersTable.id, user.userId));
  res.status(201).json(buildAnnonceResponse(a, auteur));
});

router.put("/annonces/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateAnnonceParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "ID invalide" }); return; }
  const parsed = UpdateAnnonceBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const d = parsed.data as any;
  const [updated] = await db.update(annoncesTable).set({
    titre: d.titre, contenu: d.contenu,
    priorite: d.important ? "urgente" : "normale",
  }).where(eq(annoncesTable.id, params.data.id)).returning();
  if (!updated) { res.status(404).json({ error: "Annonce introuvable" }); return; }
  res.json(buildAnnonceResponse(updated));
});

router.delete("/annonces/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteAnnonceParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "ID invalide" }); return; }
  await db.delete(annoncesTable).where(eq(annoncesTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
