import { Router, type IRouter } from "express";
import { db, projetsTable, souscriptionsProjetTable, paiementsProjetTable, membresTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { CreateProjetBody, CreateSouscriptionBody } from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

router.get("/projets", requireAuth, async (_req, res): Promise<void> => {
  const data = await db.select().from(projetsTable).orderBy(desc(projetsTable.createdAt));
  res.json(data);
});

router.post("/projets", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateProjetBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [p] = await db.insert(projetsTable).values(parsed.data).returning();
  res.status(201).json(p);
});

router.get("/projets/:id", requireAuth, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const [p] = await db.select().from(projetsTable).where(eq(projetsTable.id, id));
  if (!p) { res.status(404).json({ error: "Projet introuvable" }); return; }
  const souscriptions = await db.select().from(souscriptionsProjetTable).where(eq(souscriptionsProjetTable.projetId, id));
  const membres = await db.select().from(membresTable);
  const map = Object.fromEntries(membres.map(m => [m.id, m]));
  res.json({
    ...p,
    souscriptions: souscriptions.map(s => ({ ...s, membreNom: map[s.membreId]?.nom, membrePrenom: map[s.membreId]?.prenom, matricule: map[s.membreId]?.matricule })),
  });
});

// POST /projets/:id/souscriptions — fiche de souscription (immobilier ou bon d'achat)
// Prélèvement échelonné en N mensualités, conformément aux fiches papier fournies (10 mois par défaut).
router.post("/projets/:id/souscriptions", requireAuth, async (req, res): Promise<void> => {
  const projetId = Number(req.params.id);
  const parsed = CreateSouscriptionBody.safeParse({ ...req.body, projetId });
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const d = parsed.data;

  const [projet] = await db.select().from(projetsTable).where(eq(projetsTable.id, projetId));
  if (!projet) { res.status(404).json({ error: "Projet introuvable" }); return; }

  const coutTotal = d.coutTotal ?? 0;
  const fraisDossier = d.fraisDossier ?? 0;
  const apportInitial = d.apportInitial ?? 0;
  const resteAPayer = Math.max(coutTotal + fraisDossier - apportInitial, 0);
  const nombreMensualites = d.nombreMensualites ?? projet.dureeRemboursementMois ?? 10;
  const montantMensuel = nombreMensualites > 0 ? Math.round(resteAPayer / nombreMensualites) : resteAPayer;

  const [s] = await db.insert(souscriptionsProjetTable).values({
    projetId, membreId: d.membreId, quantite: d.quantite ?? 1,
    typeBienImmobilier: d.typeBienImmobilier,
    coutTotal, fraisDossier, apportInitial,
    montantMensuel, nombreMensualites,
    dateDebutPrelevement: d.dateDebutPrelevement,
  }).returning();

  const dateDebut = d.dateDebutPrelevement ? new Date(d.dateDebutPrelevement) : new Date();
  for (let i = 0; i < nombreMensualites; i++) {
    const date = new Date(dateDebut);
    date.setMonth(date.getMonth() + i);
    await db.insert(paiementsProjetTable).values({
      souscriptionId: s.id, mois: date.getMonth() + 1, annee: date.getFullYear(), montant: montantMensuel,
    });
  }

  res.status(201).json(s);
});

router.patch("/projets/paiements/:paiementId", requireAuth, async (req, res): Promise<void> => {
  const id = Number(req.params.paiementId);
  const [updated] = await db.update(paiementsProjetTable).set({
    paye: true, datePaiement: new Date().toISOString().slice(0, 10),
  }).where(eq(paiementsProjetTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Échéance introuvable" }); return; }

  const restants = await db.select().from(paiementsProjetTable).where(eq(paiementsProjetTable.souscriptionId, updated.souscriptionId));
  if (restants.every(p => p.paye)) {
    await db.update(souscriptionsProjetTable).set({ statut: "solde" }).where(eq(souscriptionsProjetTable.id, updated.souscriptionId));
  }
  res.json(updated);
});

export default router;
