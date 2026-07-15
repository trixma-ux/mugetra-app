import { Router, type IRouter } from "express";
import { db, membresTable, cotisationsTable, assistancesTable, activityLogsTable, usersTable } from "@workspace/db";
import { eq, sql, desc, and, gte } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

const MOIS_LABELS = ["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"];

router.get("/dashboard/stats", requireAuth, async (_req, res): Promise<void> => {
  const now = new Date();
  const membres = await db.select().from(membresTable);
  const totalMembres = membres.length;
  const membresActifs = membres.filter(m => m.statut === "actif").length;
  const membresDefaillants = membres.filter(m => m.statut === "defaillant").length;
  const membresHonneur = membres.filter(m => m.statut === "honneur").length;

  const cotMois = await db.select().from(cotisationsTable).where(and(eq(cotisationsTable.annee, now.getFullYear()), eq(cotisationsTable.mois, now.getMonth() + 1)));
  const cotisationsDuMois = cotMois.length;
  const cotisationsCollectees = cotMois.reduce((s, c) => s + c.montant, 0);
  const tauxRecouvrement = membresActifs > 0 ? Math.round((cotisationsDuMois / membresActifs) * 100) : 0;

  const assistances = await db.select().from(assistancesTable);
  const assistancesEnAttente = assistances.filter(a => a.statut === "en_attente").length;
  const assistancesPayees = assistances.filter(a => a.statut === "payee");
  const assistancesPayeesTotal = assistancesPayees.length;
  const montantAssistancesPayees = assistancesPayees.reduce((s, a) => s + (a.montant ?? 0), 0);

  res.json({ totalMembres, membresActifs, membresDefaillants, membresHonneur, cotisationsDuMois, cotisationsCollectees, tauxRecouvrement, assistancesEnAttente, assistancesPayeesTotal, montantAssistancesPayees });
});

router.get("/dashboard/cotisations-mensuelles", requireAuth, async (_req, res): Promise<void> => {
  const now = new Date();
  const result = [];
  for (let i = 11; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const annee = date.getFullYear();
    const mois = date.getMonth() + 1;
    const cotisations = await db.select().from(cotisationsTable).where(and(eq(cotisationsTable.annee, annee), eq(cotisationsTable.mois, mois)));
    result.push({ mois, annee, label: `${MOIS_LABELS[mois - 1]} ${annee}`, montant: cotisations.reduce((s, c) => s + c.montant, 0), nombrePayants: cotisations.length });
  }
  res.json(result);
});

router.get("/dashboard/tresorerie", requireAuth, async (_req, res): Promise<void> => {
  const cotisations = await db.select().from(cotisationsTable);
  const assistancesPayees = await db.select().from(assistancesTable).where(eq(assistancesTable.statut, "payee"));
  const totalCotisations = cotisations.reduce((s, c) => s + c.montant, 0);
  const totalAssistancesPayees = assistancesPayees.reduce((s, a) => s + (a.montant ?? 0), 0);
  const solde = totalCotisations - totalAssistancesPayees;
  res.json({ totalCotisations, totalAssistancesPayees, solde, caisse: Math.round(solde * 0.3), banque: Math.round(solde * 0.7) });
});

router.get("/dashboard/activite", requireAuth, async (_req, res): Promise<void> => {
  const logs = await db.select().from(activityLogsTable).orderBy(desc(activityLogsTable.createdAt)).limit(20);
  const users = await db.select().from(usersTable);
  const userMap = Object.fromEntries(users.map(u => [u.id, u]));
  res.json(logs.map(l => ({
    id: l.id, action: l.action, description: l.details ?? l.action,
    utilisateur: l.userId && userMap[l.userId] ? `${userMap[l.userId].prenom} ${userMap[l.userId].nom}` : "Système",
    entiteType: l.entite, entiteId: l.entiteId,
    createdAt: l.createdAt?.toISOString?.() ?? l.createdAt,
  })));
});

export default router;
