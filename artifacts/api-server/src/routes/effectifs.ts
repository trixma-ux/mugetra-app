import { Router, type IRouter } from "express";
import { db, mouvementsEffectifsTable, membresTable, personnesDeclareeesTable } from "@workspace/db";
import { desc, gte, lte, and, eq } from "drizzle-orm";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

// GET /effectifs/mouvements?debut=2026-01-01&fin=2026-12-31 — tableau des mouvements d'effectifs (Module 1.e)
router.get("/effectifs/mouvements", requireAuth, async (req, res): Promise<void> => {
  const { debut, fin, type } = req.query as Record<string, string | undefined>;
  const conditions: any[] = [];
  if (debut) conditions.push(gte(mouvementsEffectifsTable.createdAt, new Date(debut)));
  if (fin) conditions.push(lte(mouvementsEffectifsTable.createdAt, new Date(fin)));
  if (type) conditions.push(eq(mouvementsEffectifsTable.type, type));
  const where = conditions.length ? and(...conditions) : undefined;

  const mouvements = await db.select().from(mouvementsEffectifsTable).where(where).orderBy(desc(mouvementsEffectifsTable.createdAt));
  const membres = await db.select().from(membresTable);
  const map = Object.fromEntries(membres.map(m => [m.id, m]));

  const parType: Record<string, number> = {};
  for (const m of mouvements) parType[m.type] = (parType[m.type] ?? 0) + 1;

  res.json({
    mouvements: mouvements.map(m => ({ ...m, membreNom: map[m.membreId]?.nom, membrePrenom: map[m.membreId]?.prenom, matricule: map[m.membreId]?.matricule })),
    recapitulatif: parType,
  });
});

/**
 * GET /effectifs/alertes — Alertes automatiques listées au Module 1 du cahier des charges :
 *   - Enfant déclaré hors du délai de 15 jours suivant sa naissance (Art. 43 R.I.) ;
 *   - Conjoint absent alors que le membre se déclare marié ;
 *   - Membre suspendu / défaillant (non à jour de ses cotisations).
 */
router.get("/effectifs/alertes", requireAuth, async (_req, res): Promise<void> => {
  const membres = await db.select().from(membresTable);
  const personnes = await db.select().from(personnesDeclareeesTable);

  const enfantsHorsDelai = personnes.filter(p => {
    if (p.lienParente !== "enfant" || !p.dateNaissance) return false;
    const naissance = new Date(p.dateNaissance).getTime();
    const declaration = new Date(p.createdAt).getTime();
    const joursEcoules = (declaration - naissance) / (24 * 3600 * 1000);
    return joursEcoules > 15;
  });

  const conjointsAbsents = membres.filter(m =>
    m.statut === "actif" &&
    (m.situationFamiliale === "marie" || m.situationFamiliale === "mariee") &&
    !personnes.some(p => p.membreId === m.id && p.lienParente === "conjoint")
  );

  const membresDefaillants = membres.filter(m => m.statut === "defaillant");

  res.json({
    enfantsHorsDelai: enfantsHorsDelai.map(p => ({ personneId: p.id, membreId: p.membreId, nom: p.nom, prenom: p.prenom, dateNaissance: p.dateNaissance })),
    conjointsAbsents: conjointsAbsents.map(m => ({ membreId: m.id, matricule: m.matricule, nom: m.nom, prenom: m.prenom })),
    membresSuspendus: membresDefaillants.map(m => ({ membreId: m.id, matricule: m.matricule, nom: m.nom, prenom: m.prenom })),
  });
});

// GET /effectifs/annuaire — annuaire des membres avec photo (Module 1.d)
router.get("/effectifs/annuaire", requireAuth, async (_req, res): Promise<void> => {
  const membres = await db.select().from(membresTable).where(eq(membresTable.statut, "actif"));
  res.json(membres.map(m => ({
    id: m.id, matricule: m.matricule, nom: m.nom, prenom: m.prenom,
    fonction: m.fonction ?? m.poste, service: m.service, photoUrl: m.photoUrl, telephone: m.telephone,
  })));
});

export default router;
