import { Router, type IRouter } from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import { db, documentsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { UpdateDocumentBody, DocumentCategorie } from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";
import type { JwtPayload } from "../lib/auth";

const router: IRouter = Router();

const UPLOAD_DIR = path.resolve(process.cwd(), "uploads", "documents");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const safe = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    cb(null, safe);
  },
});
const upload = multer({ storage, limits: { fileSize: 25 * 1024 * 1024 } });

// GET /documents?categorie=pv — archivage numérique (statuts, R.I., PV, rapports, courriers, décisions, contrats...)
router.get("/documents", requireAuth, async (req, res): Promise<void> => {
  const categorie = req.query.categorie as string | undefined;
  const rows = await db.select().from(documentsTable).orderBy(desc(documentsTable.createdAt));
  res.json(categorie ? rows.filter(r => r.categorie === categorie) : rows);
});

router.post("/documents", requireAuth, upload.single("fichier"), async (req, res): Promise<void> => {
  const file = (req as any).file as Express.Multer.File | undefined;
  if (!file) { res.status(400).json({ error: "Aucun fichier reçu (champ attendu : 'fichier')." }); return; }
  const categorieParsed = DocumentCategorie.safeParse(req.body.categorie);
  const user = (req as any).user as JwtPayload;

  const [doc] = await db.insert(documentsTable).values({
    nom: req.body.nom || file.originalname,
    categorie: categorieParsed.success ? categorieParsed.data : "autre",
    mimeType: file.mimetype,
    tailleOctets: file.size,
    cheminFichier: `/uploads/documents/${file.filename}`,
    uploadedById: user.userId,
  }).returning();
  res.status(201).json(doc);
});

router.patch("/documents/:id", requireAuth, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const parsed = UpdateDocumentBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [updated] = await db.update(documentsTable).set(parsed.data).where(eq(documentsTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Document introuvable" }); return; }
  res.json(updated);
});

router.delete("/documents/:id", requireAuth, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const [doc] = await db.select().from(documentsTable).where(eq(documentsTable.id, id));
  if (!doc) { res.status(404).json({ error: "Document introuvable" }); return; }
  const filePath = path.resolve(process.cwd(), doc.cheminFichier.replace(/^\//, ""));
  fs.rm(filePath, { force: true }, () => {});
  await db.delete(documentsTable).where(eq(documentsTable.id, id));
  res.status(204).send();
});

export default router;
