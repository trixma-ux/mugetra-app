import { Router, type IRouter } from "express";
import { db, electionsTable, candidaturesTable, votesTable, membresTable, bureauMandatsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { CreateElectionBody, CreateCandidatureBody, VoteBody } from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

router.get("/elections", requireAuth, async (_req, res): Promise<void> => {
  const data = await db.select().from(electionsTable).orderBy(desc(electionsTable.createdAt));
  res.json(data);
});

router.post("/elections", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateElectionBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [e] = await db.insert(electionsTable).values(parsed.data).returning();
  res.status(201).json(e);
});

router.get("/elections/:id", requireAuth, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const [e] = await db.select().from(electionsTable).where(eq(electionsTable.id, id));
  if (!e) { res.status(404).json({ error: "Élection introuvable" }); return; }
  const candidatures = await db.select().from(candidaturesTable).where(eq(candidaturesTable.electionId, id));
  const membres = await db.select().from(membresTable);
  const map = Object.fromEntries(membres.map(m => [m.id, m]));
  res.json({
    ...e,
    candidatures: candidatures.map(c => ({ ...c, membreNom: map[c.membreId]?.nom, membrePrenom: map[c.membreId]?.prenom, matricule: map[c.membreId]?.matricule })),
  });
});

/**
 * POST /elections/:id/candidatures
 * Contrôle automatique d'éligibilité (Art. 12 R.I.) :
 *   - 5 ans d'ancienneté au sein de la NPG.CI ;
 *   - 2 ans d'ancienneté dans la mutuelle, sans discontinuité ;
 *   - ne pas être conseiller statutaire / délégué du personnel / cadre supérieur en fonction
 *     (sauf démission au moins 2 mois avant la date des élections — vérification manuelle ici,
 *     signalée via `incompatibiliteOk` à cocher par le secrétariat après contrôle du dossier).
 */
router.post("/elections/:id/candidatures", requireAuth, async (req, res): Promise<void> => {
  const electionId = Number(req.params.id);
  const parsed = CreateCandidatureBody.safeParse({ ...req.body, electionId });
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const d = parsed.data;

  const [membre] = await db.select().from(membresTable).where(eq(membresTable.id, d.membreId));
  if (!membre) { res.status(404).json({ error: "Membre introuvable" }); return; }

  const now = new Date();
  const ancienneteNpgMois = membre.dateEmbauche
    ? Math.floor((now.getTime() - new Date(membre.dateEmbauche).getTime()) / (30.44 * 24 * 3600 * 1000))
    : 0;
  const ancienneteMutuelleMois = Math.floor(
    (now.getTime() - new Date(membre.dateAdhesion).getTime()) / (30.44 * 24 * 3600 * 1000)
  );
  const ancienneteNpgOk = ancienneteNpgMois >= 60;
  const ancienneteMutuelleOk = ancienneteMutuelleMois >= 24 && membre.statut === "actif";

  if (!ancienneteNpgOk || !ancienneteMutuelleOk) {
    res.status(400).json({
      error: "Ce membre ne remplit pas les critères d'éligibilité (Art. 12 R.I. : 5 ans d'ancienneté NPG.CI et 2 ans d'ancienneté ininterrompue dans la mutuelle).",
      code: "INELIGIBLE",
      ancienneteNpgMois, ancienneteMutuelleMois,
    });
    return;
  }

  const [c] = await db.insert(candidaturesTable).values({
    electionId, membreId: d.membreId, ancienneteNpgOk, ancienneteMutuelleOk,
  }).returning();
  res.status(201).json(c);
});

router.post("/elections/candidatures/:candidatureId/valider", requireAuth, async (req, res): Promise<void> => {
  const id = Number(req.params.candidatureId);
  const decision = (req.body?.decision as string) === "rejeter" ? "rejetee" : "validee";
  const [updated] = await db.update(candidaturesTable).set({ statut: decision }).where(eq(candidaturesTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Candidature introuvable" }); return; }
  res.json(updated);
});

// POST /elections/:id/voter — vote électronique (bulletin secret par défaut, Art.13 R.I.)
router.post("/elections/:id/voter", requireAuth, async (req, res): Promise<void> => {
  const electionId = Number(req.params.id);
  const parsed = VoteBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const d = parsed.data;

  const [candidature] = await db.select().from(candidaturesTable).where(eq(candidaturesTable.id, d.candidatureId));
  if (!candidature || candidature.electionId !== electionId) { res.status(404).json({ error: "Candidature introuvable pour cette élection" }); return; }

  if (d.votantMembreId) {
    const dejaVote = await db.select().from(votesTable).where(
      and(eq(votesTable.electionId, electionId), eq(votesTable.votantMembreId, d.votantMembreId))
    );
    if (dejaVote.length > 0) { res.status(400).json({ error: "Ce membre a déjà voté pour cette élection." }); return; }
  }

  await db.insert(votesTable).values({ electionId, candidatureId: d.candidatureId, votantMembreId: d.votantMembreId });
  await db.update(candidaturesTable).set({ nombreVoix: (candidature.nombreVoix ?? 0) + 1 }).where(eq(candidaturesTable.id, d.candidatureId));
  res.status(201).json({ ok: true });
});

/**
 * POST /elections/:id/depouiller — Dépouillement automatique (Art.13 R.I.) :
 *   - majorité relative ;
 *   - en cas de candidature unique : élu par acclamation ;
 *   - en cas d'égalité : le plus ancien dans la mutuelle l'emporte, puis le plus âgé.
 * Crée aussi le mandat correspondant (3 ans, Art.20 Statuts / Art.22 R.I.).
 */
router.post("/elections/:id/depouiller", requireAuth, async (req, res): Promise<void> => {
  const electionId = Number(req.params.id);
  const [election] = await db.select().from(electionsTable).where(eq(electionsTable.id, electionId));
  if (!election) { res.status(404).json({ error: "Élection introuvable" }); return; }

  const candidatures = await db.select().from(candidaturesTable).where(
    and(eq(candidaturesTable.electionId, electionId), eq(candidaturesTable.statut, "validee"))
  );
  if (candidatures.length === 0) { res.status(400).json({ error: "Aucune candidature validée." }); return; }

  let gagnant = candidatures[0];
  if (candidatures.length > 1) {
    const maxVoix = Math.max(...candidatures.map(c => c.nombreVoix ?? 0));
    const enTete = candidatures.filter(c => (c.nombreVoix ?? 0) === maxVoix);
    if (enTete.length === 1) {
      gagnant = enTete[0];
    } else {
      // Égalité : critère 1 = ancienneté mutuelle, critère 2 = âge
      const membres = await db.select().from(membresTable);
      const map = Object.fromEntries(membres.map(m => [m.id, m]));
      enTete.sort((a, b) => {
        const ma = map[a.membreId], mb = map[b.membreId];
        const dateA = new Date(ma?.dateAdhesion ?? 0).getTime();
        const dateB = new Date(mb?.dateAdhesion ?? 0).getTime();
        if (dateA !== dateB) return dateA - dateB; // le plus ancien d'abord
        const naisA = new Date(ma?.dateNaissance ?? 0).getTime();
        const naisB = new Date(mb?.dateNaissance ?? 0).getTime();
        return naisA - naisB; // le plus âgé (date de naissance la plus ancienne) d'abord
      });
      gagnant = enTete[0];
    }
  }

  await db.update(candidaturesTable).set({ elu: true }).where(eq(candidaturesTable.id, gagnant.id));
  await db.update(electionsTable).set({ statut: "depouille" }).where(eq(electionsTable.id, electionId));

  const dateDebut = new Date().toISOString().slice(0, 10);
  const dateFin = new Date();
  dateFin.setFullYear(dateFin.getFullYear() + 3);
  const [mandat] = await db.insert(bureauMandatsTable).values({
    membreId: gagnant.membreId, poste: election.poste, dateDebut,
    dateFin: dateFin.toISOString().slice(0, 10), renouvelable: true,
  }).returning();

  res.json({ gagnant, mandat });
});

export default router;
