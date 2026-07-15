import { Router, type IRouter } from "express";
import { db, assistancesTable, assistanceValidationsTable, membresTable, usersTable, cotisationsTable, parametresTable } from "@workspace/db";
import { eq, and, sql, desc, or } from "drizzle-orm";
import {
  CreateAssistanceBody, UpdateAssistanceBody, ValiderAssistanceBody,
  ListAssistancesQueryParams, GetAssistanceParams, UpdateAssistanceParams, ValiderAssistanceParams,
} from "@workspace/api-zod";
import { requireAuth } from "../lib/auth";
import type { JwtPayload } from "../lib/auth";

const router: IRouter = Router();

// Types gérés par Commission Affaires Sociales
const TYPES_CAS = ["deces_membre","deces_membre_funerailles","deces_conjoint","deces_enfant","deces_parent","deces_beau_parent","deces_mort_ne","accident","frais_mission_funerailles"];
// Types gérés par Commission des Prêts et Assistances Financières (Art. 53, 57 R.I. + procédure mariage)
const TYPES_PRETS = ["mariage","retraite","retraite_complementaire","pret_sante","licenciement","sante_critique"];
// Types de décès concernant une tierce personne (nécessitent bénéficiaire)
const TYPES_DECES_TIERS = ["deces_conjoint","deces_enfant","deces_parent","deces_beau_parent","deces_mort_ne"];
// Types pour lesquels la carence et les arriérés NE bloquent PAS (Art. 7.4 Statuts : décès d'un membre actif exempté)
const TYPES_SANS_CARENCE = ["deces_membre","deces_membre_funerailles","frais_mission_funerailles"];

/** Retourne le premier statut de workflow selon le type d'assistance */
function premierStatut(type: string): string {
  if (TYPES_CAS.includes(type)) return "commission_affaires_sociales";
  if (TYPES_PRETS.includes(type)) return "commission_prets";
  return "commission_prets";
}

/** Workflow complet par type de commission */
function workflowPourType(type: string): string[] {
  const base = ["tresorerie","bureau","approuvee"];
  if (TYPES_CAS.includes(type)) return ["commission_affaires_sociales", ...base];
  return ["commission_prets", ...base];
}

function nextStatut(current: string, type: string, decision: string): string {
  if (decision === "rejeter") return "rejetee";
  const steps = workflowPourType(type);
  const idx = steps.indexOf(current);
  if (idx < 0 || idx >= steps.length - 1) return "approuvee";
  return steps[idx + 1];
}

function buildAssistanceResponse(a: any, membre?: any) {
  return {
    id: a.id, membreId: a.membreId,
    membreNom: membre?.nom ?? null, membrePrenom: membre?.prenom ?? null,
    membreMatricule: membre?.matricule ?? null,
    type: a.type, statut: a.statut,
    montantDemande: a.montantDemande ?? a.montant ?? 0,
    montantApprouve: a.montant ?? null, motifRejet: a.commentaireRejet ?? null,
    lienParente: a.beneficiaireRelation ?? null,
    nomDefunt: a.beneficiaireNom ?? null,
    beneficiairePrenom: a.beneficiairePrenom ?? null,
    dateEvenement: a.dateEvenement ?? null,
    datePaiement: a.datePaiement ?? null,
    pieceJointe: null, notes: a.description ?? null,
    createdAt: a.createdAt?.toISOString?.() ?? a.createdAt,
  };
}

/** Charge les paramètres depuis la DB, avec valeurs par défaut */
async function loadParametres(): Promise<Record<string, number>> {
  const params = await db.select().from(parametresTable);
  const result: Record<string, number> = {
    delaiCarenceNouveauCdi: 3,
    delaiCarenceAncienCdi: 10,
    delaiCarenceRetraite: 60,
    delaiCarenceAdhesionExceptionnelle: 6,
    cotisationMensuelle: 7500,
    assistanceDecesDescendantConjoint: 500000,
    assistanceDecesAscendant: 400000,
    assistanceDecesBeauParent: 200000,
    assistanceDecesMortNe: 150000,
    assistanceDecesMembreActifFunerailles: 300000,
    assistanceDecesMembreActifAyantsDroit: 1200000,
    assistanceMariage: 100000,
    assistanceRetraite: 1000000,
    fractionAssistanceLicenciement: 2 / 3,
    moisMinCotiseLicenciement: 12,
    plafondPretSante: 500000,
    maxMoisRemboursementPret: 20,
    differeMoisPret: 3,
  };
  for (const p of params) result[p.cle] = Number(p.valeur);
  return result;
}

/** Montant que le règlement intérieur prévoit pour un type d'assistance donné (peut être ajusté par la commission). */
function montantSuggere(type: string, params: Record<string, number>): number | null {
  switch (type) {
    case "deces_membre":
      return params.assistanceDecesMembreActifAyantsDroit;
    case "deces_membre_funerailles":
      return params.assistanceDecesMembreActifFunerailles;
    case "deces_conjoint":
    case "deces_enfant":
      return params.assistanceDecesDescendantConjoint;
    case "deces_parent":
      return params.assistanceDecesAscendant;
    case "deces_beau_parent":
      return params.assistanceDecesBeauParent;
    case "deces_mort_ne":
      return params.assistanceDecesMortNe;
    case "mariage":
      return params.assistanceMariage;
    case "retraite":
      return params.assistanceRetraite;
    // frais_mission_funerailles (50k Abidjan / 100k intérieur), licenciement (2/3 cotisations)
    // et pret_sante/sante_critique (calculé selon montant demandé, plafonné) sont fixés au moment de la validation
    default:
      return null;
  }
}

interface CarenceResult {
  enCarence: boolean;
  moisRestants: number;
  dateFinCarence: string;
  motif: string;
  arrieres: number;
  arrearsBlocking: boolean;
}

/** Calcule la carence d'un membre selon toutes les règles métier */
async function calculerCarence(
  membre: any,
  cotisations: any[],
  params: Record<string, number>,
  typeAssistance?: string
): Promise<CarenceResult> {
  const dateRef = membre.dateCdi
    ? new Date(membre.dateCdi)
    : new Date(membre.dateAdhesion);
  const now = new Date();
  const moisDepuis = Math.floor((now.getTime() - dateRef.getTime()) / (30.44 * 24 * 3600 * 1000));

  // Délai selon typeAdhesion et type d'assistance
  let delai: number;
  let motif: string;

  const isRetraite = typeAssistance === "retraite" || typeAssistance === "retraite_complementaire";
  const isDecesOuMariage = ["deces_membre","deces_conjoint","deces_enfant","deces_parent","deces_beau_parent","deces_mort_ne","mariage"].includes(typeAssistance ?? "");

  if (isRetraite) {
    delai = params.delaiCarenceRetraite ?? 60;
    motif = `Retraite — ${delai} mois (5 ans) de carence (Art. 8 Statuts)`;
  } else if (membre.typeAdhesion === "exceptionnel") {
    delai = params.delaiCarenceAdhesionExceptionnelle ?? 6;
    motif = "Adhésion exceptionnelle — 6 mois de carence (Décision n°05-2025)";
  } else if (isDecesOuMariage && membre.typeCdi === "ancien") {
    delai = params.delaiCarenceAncienCdi ?? 10;
    motif = "Ancien CDI — 10 mois de carence pour décès/mariage (Art. 8 Statuts)";
  } else if (isDecesOuMariage) {
    delai = params.delaiCarenceNouveauCdi ?? 3;
    motif = "Nouveau CDI — 3 mois de carence pour décès/mariage (Art. 8 Statuts)";
  } else {
    delai = params.delaiCarenceNouveauCdi ?? 3;
    motif = "Carence ordinaire — 3 mois (Art. 8 Statuts)";
  }

  const moisRestantsCarence = Math.max(0, delai - moisDepuis);
  const dateFinCarence = new Date(dateRef);
  dateFinCarence.setMonth(dateFinCarence.getMonth() + delai);

  // Calcul des arriérés
  const moisDepuisAdhesion = Math.floor(
    (now.getTime() - new Date(membre.dateAdhesion).getTime()) / (30.44 * 24 * 3600 * 1000)
  );
  const moisPaies = cotisations.length;
  const arrieres = Math.max(0, moisDepuisAdhesion - moisPaies);
  // Si arriérés > 0, la carence bloque jusqu'au remboursement total
  const arrearsBlocking = arrieres > 0;

  const enCarence = moisRestantsCarence > 0 || arrearsBlocking;

  return {
    enCarence,
    moisRestants: moisRestantsCarence,
    dateFinCarence: dateFinCarence.toISOString().slice(0, 10),
    motif: arrearsBlocking
      ? `${motif} — Bloqué : ${arrieres} mois d'arriérés à régulariser`
      : motif,
    arrieres,
    arrearsBlocking,
  };
}

router.get("/assistances/stats", requireAuth, async (_req, res): Promise<void> => {
  const all = await db.select().from(assistancesTable);
  const byType: Record<string, { nombre: number; montantTotal: number }> = {};
  for (const a of all) {
    if (!byType[a.type]) byType[a.type] = { nombre: 0, montantTotal: 0 };
    byType[a.type].nombre++;
    byType[a.type].montantTotal += a.montant ?? 0;
  }
  res.json(Object.entries(byType).map(([type, v]) => ({ type, ...v })));
});

router.get("/assistances", requireAuth, async (req, res): Promise<void> => {
  const parsed = ListAssistancesQueryParams.safeParse(req.query);
  const { page = 1, limit = 20, statut, type: aType, membreId } = (parsed.success ? parsed.data : {}) as any;

  const conditions: any[] = [];
  if (statut) conditions.push(eq(assistancesTable.statut, statut));
  if (aType) conditions.push(eq(assistancesTable.type, aType));
  if (membreId) conditions.push(eq(assistancesTable.membreId, Number(membreId)));

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const [countRes] = await db.select({ count: sql<number>`count(*)` }).from(assistancesTable).where(where);
  const total = Number(countRes?.count ?? 0);
  const data = await db.select().from(assistancesTable).where(where).orderBy(desc(assistancesTable.createdAt)).limit(limit).offset((page - 1) * limit);

  const membres = await db.select().from(membresTable);
  const membreMap = Object.fromEntries(membres.map(m => [m.id, m]));

  res.json({
    data: data.map(a => buildAssistanceResponse(a, membreMap[a.membreId])),
    total, page: Number(page), limit: Number(limit),
  });
});

router.post("/assistances", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateAssistanceBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const user = (req as any).user as JwtPayload;
  const d = parsed.data as any;

  // ──────────────── VÉRIFICATIONS MÉTIER ────────────────

  // 1. Charger le membre
  const [membre] = await db.select().from(membresTable).where(eq(membresTable.id, d.membreId));
  if (!membre) { res.status(404).json({ error: "Membre introuvable" }); return; }

  // 2. Vérifier statut membre (radié / décédé ne peuvent pas demander)
  if (membre.statut === "radie" || membre.statut === "decede") {
    res.status(400).json({
      error: `Ce membre est ${membre.statut === "radie" ? "radié" : "décédé"} et ne peut pas faire de demande d'assistance.`,
      code: "MEMBRE_INELIGIBLE",
    });
    return;
  }

  // 3. Règle renonciation : si renonciationAssistances=true et type = décès d'une tierce personne
  if (membre.renonciationAssistances && TYPES_DECES_TIERS.includes(d.type)) {
    res.status(400).json({
      error: "Ce membre a renoncé aux assistances pour les tiers (conjoints, parents). Il n'est pas éligible à ce type d'assistance.",
      code: "RENONCIATION_ACTIVE",
    });
    return;
  }

  // 4. Vérification carence (exemptée pour le décès du membre actif lui-même — Art. 7.4 Statuts)
  const cotisations = await db.select().from(cotisationsTable).where(eq(cotisationsTable.membreId, membre.id));
  const params = await loadParametres();
  const carence = TYPES_SANS_CARENCE.includes(d.type)
    ? { enCarence: false, moisRestants: 0, dateFinCarence: "", motif: "", arrieres: 0, arrearsBlocking: false }
    : await calculerCarence(membre, cotisations, params, d.type);

  if (carence.enCarence) {
    res.status(400).json({
      error: `Demande refusée : ${carence.motif}.`,
      code: "EN_CARENCE",
      carence: {
        moisRestants: carence.moisRestants,
        dateFinCarence: carence.dateFinCarence,
        arrieres: carence.arrieres,
        arrearsBlocking: carence.arrearsBlocking,
      },
    });
    return;
  }

  // 5. Vérification doublon pour les décès de tiers (même type + même bénéficiaire déjà assisté)
  if (TYPES_DECES_TIERS.includes(d.type) && d.beneficiaireNom) {
    const doublons = await db.select().from(assistancesTable).where(
      and(
        eq(assistancesTable.membreId, d.membreId),
        eq(assistancesTable.type, d.type),
        or(
          eq(assistancesTable.statut, "approuvee"),
          eq(assistancesTable.statut, "payee")
        )
      )
    );
    const nomRecherche = (d.beneficiaireNom ?? "").toLowerCase().trim();
    const doublon = doublons.find(a =>
      (a.beneficiaireNom ?? "").toLowerCase().trim() === nomRecherche
    );
    if (doublon) {
      res.status(400).json({
        error: `Une assistance de type "${d.type}" a déjà été accordée pour "${d.beneficiaireNom}" (Réf. ASS-${String(doublon.id).padStart(4, "0")}). Une seule assistance par personne et par événement.`,
        code: "DOUBLON_ASSISTANCE",
        refExistante: doublon.id,
      });
      return;
    }
  }

  // 6. Pour décès du membre actif : vérifier qu'aucune demande similaire n'existe déjà
  if (d.type === "deces_membre" || d.type === "deces_membre_funerailles") {
    const existant = await db.select().from(assistancesTable).where(
      and(
        eq(assistancesTable.membreId, d.membreId),
        eq(assistancesTable.type, d.type),
        or(eq(assistancesTable.statut, "approuvee"), eq(assistancesTable.statut, "payee"))
      )
    );
    if (existant.length > 0) {
      res.status(400).json({
        error: "Une assistance de ce type a déjà été traitée pour ce membre.",
        code: "DOUBLON_ASSISTANCE",
      });
      return;
    }
  }

  // 7. Licenciement (Art. 56.2 R.I.) : au moins 12 mois cotisés, jamais bénéficié d'une assistance décès
  let montantCalcule: number | null = montantSuggere(d.type, params);
  if (d.type === "licenciement") {
    if (cotisations.length < (params.moisMinCotiseLicenciement ?? 12)) {
      res.status(400).json({
        error: `Éligibilité non remplie : au moins ${params.moisMinCotiseLicenciement ?? 12} mois de cotisation sont requis (Art. 56.2 R.I.). Ce membre en a ${cotisations.length}.`,
        code: "INELIGIBLE_LICENCIEMENT",
      });
      return;
    }
    const dejaAssisteDeces = await db.select().from(assistancesTable).where(
      and(eq(assistancesTable.membreId, d.membreId), eq(assistancesTable.type, "deces_membre"),
        or(eq(assistancesTable.statut, "approuvee"), eq(assistancesTable.statut, "payee")))
    );
    if (dejaAssisteDeces.length > 0) {
      res.status(400).json({ error: "Ce membre a déjà bénéficié d'une assistance décès et n'est donc pas éligible à l'assistance licenciement (Art. 56.2 R.I.).", code: "INELIGIBLE_LICENCIEMENT" });
      return;
    }
    const totalCotise = cotisations.reduce((s, c) => s + c.montant, 0);
    montantCalcule = Math.round(totalCotise * (params.fractionAssistanceLicenciement ?? 2 / 3));
  }
  if ((d.type === "pret_sante" || d.type === "sante_critique") && d.montantDemande) {
    montantCalcule = Math.min(Number(d.montantDemande), params.plafondPretSante ?? 500000);
  }

  // ──────────────── CRÉATION ────────────────

  const premiereEtape = premierStatut(d.type);
  const [a] = await db.insert(assistancesTable).values({
    membreId: d.membreId,
    type: d.type,
    statut: premiereEtape, // directement à la bonne commission, plus en_attente
    dateEvenement: d.dateEvenement,
    description: d.description ?? d.notes,
    beneficiaireNom: d.beneficiaireNom ?? d.nomDefunt,
    beneficiairePrenom: d.beneficiairePrenom,
    beneficiaireRelation: d.beneficiaireRelation ?? d.lienParente,
    montantDemande: montantCalcule ?? undefined,
    createdById: user.userId,
  }).returning();

  res.status(201).json(buildAssistanceResponse(a, membre));
});

router.get("/assistances/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetAssistanceParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "ID invalide" }); return; }
  const [a] = await db.select().from(assistancesTable).where(eq(assistancesTable.id, params.data.id));
  if (!a) { res.status(404).json({ error: "Assistance introuvable" }); return; }
  const [membre] = await db.select().from(membresTable).where(eq(membresTable.id, a.membreId));
  const validations = await db.select().from(assistanceValidationsTable).where(eq(assistanceValidationsTable.assistanceId, a.id));
  const users = await db.select().from(usersTable);
  const userMap = Object.fromEntries(users.map(u => [u.id, u]));

  res.json({
    ...buildAssistanceResponse(a, membre),
    membre: membre ? {
      id: membre.id, nom: membre.nom, prenom: membre.prenom,
      matricule: membre.matricule, statut: membre.statut,
      typeAdhesion: membre.typeAdhesion, dateAdhesion: membre.dateAdhesion,
      renonciationAssistances: membre.renonciationAssistances,
      createdAt: membre.createdAt?.toISOString?.(),
    } : null,
    validations: validations.map(v => ({
      id: v.id, etape: v.etape, decision: v.decision,
      validePar: userMap[v.validePar!] ? `${userMap[v.validePar!].prenom} ${userMap[v.validePar!].nom}` : "Inconnu",
      dateValidation: v.createdAt?.toISOString?.() ?? v.createdAt,
      motif: v.commentaire ?? null,
    })),
    prochainStatut: nextStatut(a.statut, a.type, "approuver"),
  });
});

router.put("/assistances/:id", requireAuth, async (req, res): Promise<void> => {
  const params = UpdateAssistanceParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "ID invalide" }); return; }
  const parsed = UpdateAssistanceBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const d = parsed.data as any;
  const [updated] = await db.update(assistancesTable).set({
    description: d.notes, montant: d.montantApprouve, datePaiement: d.datePaiement,
  }).where(eq(assistancesTable.id, params.data.id)).returning();
  if (!updated) { res.status(404).json({ error: "Assistance introuvable" }); return; }
  res.json(buildAssistanceResponse(updated));
});

router.post("/assistances/:id/valider", requireAuth, async (req, res): Promise<void> => {
  const params = ValiderAssistanceParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: "ID invalide" }); return; }
  const parsed = ValiderAssistanceBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const user = (req as any).user as JwtPayload;
  const d = parsed.data as any;

  const [a] = await db.select().from(assistancesTable).where(eq(assistancesTable.id, params.data.id));
  if (!a) { res.status(404).json({ error: "Assistance introuvable" }); return; }

  const newStatut = nextStatut(a.statut, a.type, d.decision);
  await db.insert(assistanceValidationsTable).values({
    assistanceId: a.id, etape: a.statut, decision: d.decision,
    commentaire: d.motif, validePar: user.userId,
  });

  const updateData: any = { statut: newStatut };
  if (d.montantApprouve) updateData.montant = d.montantApprouve;
  else if (d.decision === "approuver" && newStatut === "approuvee" && a.montantDemande) updateData.montant = a.montantDemande;
  if (d.decision === "rejeter") updateData.commentaireRejet = d.motif;

  const [updated] = await db.update(assistancesTable).set(updateData).where(eq(assistancesTable.id, a.id)).returning();
  const [membre] = await db.select().from(membresTable).where(eq(membresTable.id, updated.membreId));
  res.json(buildAssistanceResponse(updated, membre));
});

/** Route de vérification de carence (GET) — utilisée par le frontend avant soumission */
router.get("/assistances/carence/:membreId", requireAuth, async (req, res): Promise<void> => {
  const membreId = parseInt(req.params.membreId as string);
  const typeAssistance = req.query.type as string | undefined;

  if (isNaN(membreId)) { res.status(400).json({ error: "ID invalide" }); return; }

  const [membre] = await db.select().from(membresTable).where(eq(membresTable.id, membreId));
  if (!membre) { res.status(404).json({ error: "Membre introuvable" }); return; }

  const cotisations = await db.select().from(cotisationsTable).where(eq(cotisationsTable.membreId, membreId));
  const params = await loadParametres();
  const carence = (typeAssistance && TYPES_SANS_CARENCE.includes(typeAssistance))
    ? { enCarence: false, moisRestants: 0, dateFinCarence: "", motif: "Exempté de carence (décès du membre actif — Art. 7.4 Statuts)", arrieres: 0, arrearsBlocking: false }
    : await calculerCarence(membre, cotisations, params, typeAssistance);

  res.json({
    membreId: membre.id,
    matricule: membre.matricule,
    typeAdhesion: membre.typeAdhesion,
    renonciationAssistances: membre.renonciationAssistances,
    ...carence,
    eligible: !carence.enCarence,
    cotisations: { moisPaies: cotisations.length, arrieres: carence.arrieres },
  });
});

export default router;
