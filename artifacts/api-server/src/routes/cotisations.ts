import { Router, type IRouter } from "express";
import { db, cotisationsTable, membresTable } from "@workspace/db";
import { eq, and, sql, desc, asc } from "drizzle-orm";
import {
  CreateCotisationBody, ImportCotisationsBody, RegulariserCotisationsBody,
  ListCotisationsQueryParams, GetCotisationsResumeParams,
} from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

function buildCotisationResponse(c: any, membre?: any) {
  return {
    id: c.id, membreId: c.membreId,
    membreNom: membre?.nom ?? null, membrePrenom: membre?.prenom ?? null,
    membreMatricule: membre?.matricule ?? null,
    annee: c.annee, mois: c.mois, montant: c.montant,
    dateReglement: c.datePaiement,
    typeReglement: c.modePaiement ?? "especes",
    notes: c.note ?? null,
    createdAt: c.createdAt?.toISOString?.() ?? c.createdAt,
  };
}

router.get("/cotisations", requireAuth, async (req, res): Promise<void> => {
  const parsed = ListCotisationsQueryParams.safeParse(req.query);
  const { page = 1, limit = 50, membreId, annee, mois } = (parsed.success ? parsed.data : {}) as any;

  const conditions: any[] = [];
  if (membreId) conditions.push(eq(cotisationsTable.membreId, Number(membreId)));
  if (annee) conditions.push(eq(cotisationsTable.annee, Number(annee)));
  if (mois) conditions.push(eq(cotisationsTable.mois, Number(mois)));

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const [countRes] = await db.select({ count: sql<number>`count(*)` }).from(cotisationsTable).where(where);
  const total = Number(countRes?.count ?? 0);
  const data = await db.select().from(cotisationsTable).where(where).orderBy(desc(cotisationsTable.annee), desc(cotisationsTable.mois)).limit(limit).offset((page - 1) * limit);

  const membres = await db.select().from(membresTable);
  const membreMap = Object.fromEntries(membres.map(m => [m.id, m]));

  res.json({
    data: data.map(c => buildCotisationResponse(c, membreMap[c.membreId])),
    total, page: Number(page), limit: Number(limit),
  });
});

router.post("/cotisations", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateCotisationBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const d = parsed.data as any;
  const [c] = await db.insert(cotisationsTable).values({
    membreId: d.membreId, annee: d.annee, mois: d.mois,
    montant: d.montant, datePaiement: d.dateReglement,
    modePaiement: d.typeReglement ?? "especes", note: d.notes,
  }).returning();
  const [membre] = await db.select().from(membresTable).where(eq(membresTable.id, c.membreId));
  res.status(201).json(buildCotisationResponse(c, membre));
});

router.post("/cotisations/import", requireAuth, async (req, res): Promise<void> => {
  const parsed = ImportCotisationsBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { annee, mois, cotisations } = parsed.data as any;
  const membres = await db.select().from(membresTable);
  const membreByMatricule = Object.fromEntries(membres.map(m => [m.matricule, m]));

  let importes = 0;
  const erreurs: { matricule: string; message: string }[] = [];

  for (const row of cotisations) {
    const membre = membreByMatricule[row.matricule];
    if (!membre) { erreurs.push({ matricule: row.matricule, message: "Matricule introuvable" }); continue; }
    try {
      await db.insert(cotisationsTable).values({
        membreId: membre.id, annee, mois, montant: row.montant,
        datePaiement: new Date().toISOString().slice(0, 10),
        modePaiement: "virement", note: row.notes,
      });
      importes++;
    } catch (e: any) {
      erreurs.push({ matricule: row.matricule, message: e.message ?? "Erreur" });
    }
  }

  res.json({ success: erreurs.length === 0, total: cotisations.length, importes, erreurs });
});

router.get("/cotisations/resume/:membreId", requireAuth, async (req, res): Promise<void> => {
  const params = GetCotisationsResumeParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "ID invalide" }); return; }
  const membreId = params.data.membreId;

  const [membre] = await db.select().from(membresTable).where(eq(membresTable.id, membreId));
  if (!membre) { res.status(404).json({ error: "Membre introuvable" }); return; }

  const cotisations = await db.select().from(cotisationsTable).where(eq(cotisationsTable.membreId, membreId)).orderBy(asc(cotisationsTable.annee), asc(cotisationsTable.mois));
  const totalPaye = cotisations.reduce((s, c) => s + c.montant, 0);
  const moisPaies = cotisations.length;
  const dateAdhesion = new Date(membre.dateAdhesion);
  const now = new Date();
  const moisDepuisAdhesion = (now.getFullYear() - dateAdhesion.getFullYear()) * 12 + (now.getMonth() - dateAdhesion.getMonth());
  const arrieres = Math.max(0, moisDepuisAdhesion - moisPaies) * 7500;

  const MOIS_LABELS = ["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"];
  const historique = cotisations.map(c => ({
    annee: c.annee, mois: c.mois, montant: c.montant,
    label: `${MOIS_LABELS[c.mois - 1]} ${c.annee}`, statut: "paye",
  }));

  res.json({ membreId, totalPaye, arrieres, moisPaies, historique });
});

router.post("/cotisations/regularisation", requireAuth, async (req, res): Promise<void> => {
  const parsed = RegulariserCotisationsBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { membreId, moisAReguler, montantUnitaire } = parsed.data as any;
  const montant = montantUnitaire ?? 7500;
  let moisRegularises = 0;

  for (const { annee, mois } of moisAReguler) {
    await db.insert(cotisationsTable).values({
      membreId, annee, mois, montant,
      datePaiement: new Date().toISOString().slice(0, 10),
      modePaiement: "regularisation",
    });
    moisRegularises++;
  }

  res.json({ success: true, moisRegularises, montantTotal: moisRegularises * montant });
});

export default router;
