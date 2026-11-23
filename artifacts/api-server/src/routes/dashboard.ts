import { Router, type IRouter } from "express";
import { db, membresTable, cotisationsTable, assistancesTable, activityLogsTable, usersTable, parametresTable } from "@workspace/db";
import { eq, sql, desc, and, gte } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

const MOIS_LABELS = ["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"];

/** Statuts des membres tenus de cotiser chaque mois (les défaillants restent redevables). */
const STATUTS_COTISANTS = ["actif", "defaillant"];

async function getCotisationMensuelle(): Promise<number> {
  const [row] = await db.select().from(parametresTable).where(eq(parametresTable.cle, "cotisationMensuelle"));
  const v = Number(row?.valeur);
  return Number.isFinite(v) && v > 0 ? v : 7500;
}

type Membre = typeof membresTable.$inferSelect;

/** Membres tenus de cotiser pour le mois (annee, mois) : statut cotisant et adhésion au plus tard ce mois-là. */
function membresAttendus(membres: Membre[], annee: number, mois: number): number {
  const finMois = `${annee}-${String(mois).padStart(2, "0")}-31`;
  return membres.filter(m =>
    STATUTS_COTISANTS.includes(m.statut) && (!m.dateAdhesion || String(m.dateAdhesion).slice(0, 10) <= finMois),
  ).length;
}

/**
 * Agrégats d'un mois de cotisation (période annee/mois de la cotisation, pas la date de saisie) :
 * montant encaissé (somme des montants), nombre de membres payants (distincts), attendu et taux.
 */
function resumeMois(cots: (typeof cotisationsTable.$inferSelect)[], membres: Membre[], annee: number, mois: number, cotisationMensuelle: number) {
  const duMois = cots.filter(c => Number(c.annee) === annee && Number(c.mois) === mois);
  const montant = duMois.reduce((s, c) => s + Number(c.montant ?? 0), 0);
  const nombrePayants = new Set(duMois.map(c => c.membreId)).size;
  const nombreAttendus = membresAttendus(membres, annee, mois);
  const montantAttendu = nombreAttendus * cotisationMensuelle;
  const tauxRecouvrement = montantAttendu > 0 ? Math.round((montant / montantAttendu) * 100) : 0;
  return { montant, nombrePayants, nombreAttendus, montantAttendu, tauxRecouvrement };
}

router.get("/dashboard/stats", requireAuth, async (_req, res): Promise<void> => {
  const now = new Date();
  const annee = now.getFullYear();
  const mois = now.getMonth() + 1;
  const membres = await db.select().from(membresTable);
  const totalMembres = membres.length;
  const membresActifs = membres.filter(m => m.statut === "actif").length;
  const membresDefaillants = membres.filter(m => m.statut === "defaillant").length;
  const membresHonneur = membres.filter(m => m.statut === "honneur").length;

  const cotisationMensuelle = await getCotisationMensuelle();
  const cotMois = await db.select().from(cotisationsTable).where(and(eq(cotisationsTable.annee, annee), eq(cotisationsTable.mois, mois)));
  const r = resumeMois(cotMois, membres, annee, mois, cotisationMensuelle);

  const assistances = await db.select().from(assistancesTable);
  const assistancesEnAttente = assistances.filter(a => a.statut === "en_attente").length;
  const assistancesPayees = assistances.filter(a => a.statut === "payee");
  const assistancesPayeesTotal = assistancesPayees.length;
  const montantAssistancesPayees = assistancesPayees.reduce((s, a) => s + Number(a.montant ?? 0), 0);

  res.json({
    totalMembres, membresActifs, membresDefaillants, membresHonneur,
    annee, mois,
    cotisationMensuelle,
    /** Montant encaissé pour le mois en cours (F CFA). */
    cotisationsCollectees: r.montant,
    /** Nombre de membres ayant payé le mois en cours (un nombre, pas un montant). */
    nombrePayants: r.nombrePayants,
    /** @deprecated ancien nom du nombre de payants, conservé pour compatibilité. */
    cotisationsDuMois: r.nombrePayants,
    nombreAttendus: r.nombreAttendus,
    montantAttendu: r.montantAttendu,
    /** Encaissé / attendu (attendu = membres actifs ou défaillants × cotisation mensuelle), en %. */
    tauxRecouvrement: r.tauxRecouvrement,
    assistancesEnAttente, assistancesPayeesTotal, montantAssistancesPayees,
  });
});

/** GET /dashboard/cotisations-mensuelles?mois=6 — derniers N mois (défaut 12, max 24), par période de cotisation. */
router.get("/dashboard/cotisations-mensuelles", requireAuth, async (req, res): Promise<void> => {
  const n = Math.min(24, Math.max(1, parseInt(String(req.query.mois ?? "12")) || 12));
  const now = new Date();
  const membres = await db.select().from(membresTable);
  const cotisationMensuelle = await getCotisationMensuelle();
  const cots = await db.select().from(cotisationsTable);
  const result = [];
  for (let i = n - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const annee = date.getFullYear();
    const mois = date.getMonth() + 1;
    const r = resumeMois(cots, membres, annee, mois, cotisationMensuelle);
    result.push({ mois, annee, label: `${MOIS_LABELS[mois - 1]} ${annee}`, ...r });
  }
  res.json(result);
});

router.get("/dashboard/tresorerie", requireAuth, async (_req, res): Promise<void> => {
  const cotisations = await db.select().from(cotisationsTable);
  const assistancesPayees = await db.select().from(assistancesTable).where(eq(assistancesTable.statut, "payee"));
  const totalCotisations = cotisations.reduce((s, c) => s + Number(c.montant ?? 0), 0);
  const totalAssistancesPayees = assistancesPayees.reduce((s, a) => s + Number(a.montant ?? 0), 0);
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
