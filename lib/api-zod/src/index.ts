import { z } from "zod";

export const HealthCheckResponse = z.object({
  status: z.literal("ok"),
});

/* ============================================================================
 * Paquet reconstruit (voir README.md racine). Contient la validation des
 * corps de requête / paramètres pour TOUTES les routes, anciennes et
 * nouvelles.
 * ========================================================================== */

const idParam = { id: z.coerce.number().int().positive() };
const optionalDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional();

// ─────────────────────────── MEMBRES ───────────────────────────

const PersonneDeclareeInput = z.object({
  nom: z.string().optional(),
  prenom: z.string().optional(),
  dateNaissance: optionalDate,
});

export const CreateMembreBody = z.object({
  matricule: z.string().optional(),
  nom: z.string().min(1),
  prenom: z.string().min(1),
  email: z.string().email().optional().nullable(),
  telephone: z.string().optional().nullable(),
  whatsapp: z.string().optional().nullable(),
  dateNaissance: optionalDate,
  lieuNaissance: z.string().optional(),
  dateEmbauche: optionalDate,
  dateCdi: optionalDate,
  dateAdhesion: optionalDate,
  typeCdi: z.enum(["ancien", "nouveau"]).optional(),
  statut: z.enum(["actif", "defaillant", "radie", "demissionnaire", "decede", "honneur"]).optional(),
  typeAdhesion: z.enum(["ordinaire", "exceptionnel", "non_national"]).optional(),
  situationFamiliale: z.string().optional(),
  departement: z.string().optional(),
  service: z.string().optional(),
  poste: z.string().optional(),
  fonction: z.string().optional(),
  permisConduire: z.boolean().optional(),
  retraiteComplementaire: z.boolean().optional(),
  renonciationAssistances: z.boolean().optional(),
  conjoint: PersonneDeclareeInput.optional(),
  enfants: z.array(PersonneDeclareeInput).optional(),
  parents: z.array(PersonneDeclareeInput).optional(),
  beauxParents: z.array(PersonneDeclareeInput).optional(),
});

export const UpdateMembreBody = CreateMembreBody.partial();
export const UpdateMembreStatutBody = z.object({
  statut: z.enum(["actif", "defaillant", "radie", "demissionnaire", "decede", "honneur"]),
});
export const DeclarerDecesMembreBody = z.object({
  dateDeces: z.string(),
  causeDeces: z.string().optional(),
});

export const ListMembresQueryParams = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  statut: z.string().optional(),
  search: z.string().optional(),
});

export const GetMembreParams = z.object(idParam);
export const UpdateMembreParams = z.object(idParam);
export const UpdateMembreStatutParams = z.object(idParam);
export const GetMembreCarenceParams = z.object(idParam);
export const DeclarerDecesMembreParams = z.object(idParam);
export const DeleteMembreParams = z.object(idParam);

// ─────────────────────────── COTISATIONS ───────────────────────────

export const CreateCotisationBody = z.object({
  membreId: z.coerce.number().int().positive(),
  annee: z.coerce.number().int(),
  mois: z.coerce.number().int().min(1).max(12),
  montant: z.coerce.number().int().positive(),
  dateReglement: optionalDate,
  typeReglement: z.enum(["especes", "virement", "prelevement", "regularisation"]).optional(),
  notes: z.string().optional(),
});

export const ImportCotisationsBody = z.object({
  annee: z.coerce.number().int(),
  mois: z.coerce.number().int().min(1).max(12),
  cotisations: z.array(z.object({
    matricule: z.string(),
    montant: z.coerce.number().int(),
    notes: z.string().optional(),
  })),
});

export const RegulariserCotisationsBody = z.object({
  membreId: z.coerce.number().int().positive(),
  moisAReguler: z.array(z.object({ annee: z.number().int(), mois: z.number().int() })),
  montantUnitaire: z.number().int().optional(),
});

export const ListCotisationsQueryParams = z.object({
  page: z.coerce.number().int().optional(),
  limit: z.coerce.number().int().optional(),
  membreId: z.coerce.number().int().optional(),
  annee: z.coerce.number().int().optional(),
  mois: z.coerce.number().int().optional(),
});

export const GetCotisationsResumeParams = z.object({ membreId: z.coerce.number().int().positive() });

// ─────────────────────────── ASSISTANCES ───────────────────────────

export const AssistanceType = z.enum([
  "deces_membre", "deces_membre_funerailles", "deces_conjoint", "deces_enfant", "deces_parent",
  "deces_beau_parent", "deces_mort_ne", "mariage", "retraite", "retraite_complementaire",
  "pret_sante", "licenciement", "sante_critique", "accident", "frais_mission_funerailles",
]);

export const CreateAssistanceBody = z.object({
  membreId: z.coerce.number().int().positive(),
  type: AssistanceType,
  dateEvenement: optionalDate,
  description: z.string().optional(),
  notes: z.string().optional(),
  beneficiaireNom: z.string().optional(),
  nomDefunt: z.string().optional(),
  beneficiairePrenom: z.string().optional(),
  beneficiaireRelation: z.string().optional(),
  lienParente: z.string().optional(),
  montantDemande: z.coerce.number().int().positive().optional(),
});

export const UpdateAssistanceBody = z.object({
  notes: z.string().optional(),
  montantApprouve: z.number().int().optional(),
  datePaiement: optionalDate,
});

export const ValiderAssistanceBody = z.object({
  decision: z.enum(["approuver", "rejeter"]),
  motif: z.string().optional(),
  montantApprouve: z.number().int().optional(),
});

export const ListAssistancesQueryParams = z.object({
  page: z.coerce.number().int().optional(),
  limit: z.coerce.number().int().optional(),
  statut: z.string().optional(),
  type: z.string().optional(),
  membreId: z.coerce.number().int().optional(),
});

export const GetAssistanceParams = z.object(idParam);
export const UpdateAssistanceParams = z.object(idParam);
export const ValiderAssistanceParams = z.object(idParam);

// ─────────────────────────── ANNONCES ───────────────────────────

export const CreateAnnonceBody = z.object({
  titre: z.string().min(1),
  contenu: z.string().min(1),
  important: z.boolean().optional(),
});
export const UpdateAnnonceBody = CreateAnnonceBody.partial();
export const UpdateAnnonceParams = z.object(idParam);
export const DeleteAnnonceParams = z.object(idParam);

// ─────────────────────────── PARAMÈTRES ───────────────────────────

export const UpdateParametresBody = z.record(z.string(), z.union([z.number(), z.string()]).nullable());

// ─────────────────────────── PRÊTS (Module 4) ───────────────────────────

export const CreatePretBody = z.object({
  membreId: z.coerce.number().int().positive(),
  motif: z.string().optional(),
  montantDemande: z.coerce.number().int().positive().max(500000, "Le plafond des prêts est de 500 000 FCFA (Art. 57 R.I.)"),
  dureeMois: z.coerce.number().int().min(1).max(20).optional(),
});

export const ValiderPretBody = z.object({
  decision: z.enum(["approuver", "rejeter"]),
  montantAccorde: z.number().int().optional(),
  motif: z.string().optional(),
});

export const ListPretsQueryParams = z.object({
  membreId: z.coerce.number().int().optional(),
  statut: z.string().optional(),
});

export const MarquerEcheanceBody = z.object({ paye: z.boolean() });

// ─────────────────────────── DÉPARTS (démissions/licenciements) ───────────────────────────

export const CreateDepartBody = z.object({
  membreId: z.coerce.number().int().positive(),
  type: z.enum(["demission_mutuelle", "demission_npg", "licenciement", "radiation"]),
  dateDepart: z.string(),
  motif: z.string().optional(),
});

// ─────────────────────────── PROJETS (immobilier + divers) ───────────────────────────

export const CreateProjetBody = z.object({
  nom: z.string().min(1),
  type: z.enum([
    "immobilier_logement", "immobilier_appartement", "immobilier_terrain",
    "bon_telephone", "bon_dady_shop", "bon_sicomex", "bon_librairie", "poulet_fin_annee", "autre",
  ]),
  description: z.string().optional(),
  dureeRemboursementMois: z.coerce.number().int().min(1).max(60).optional(),
});

export const CreateSouscriptionBody = z.object({
  projetId: z.coerce.number().int().positive(),
  membreId: z.coerce.number().int().positive(),
  quantite: z.coerce.number().int().min(1).optional(),
  typeBienImmobilier: z.string().optional(),
  coutTotal: z.coerce.number().int().min(0).optional(),
  fraisDossier: z.coerce.number().int().min(0).optional(),
  apportInitial: z.coerce.number().int().min(0).optional(),
  nombreMensualites: z.coerce.number().int().min(1).max(60).optional(),
  dateDebutPrelevement: optionalDate,
});

// ─────────────────────────── ASSEMBLÉES GÉNÉRALES ───────────────────────────

export const CreateAssembleeBody = z.object({
  type: z.enum(["ordinaire", "extraordinaire"]),
  titre: z.string().min(1),
  ordreDuJour: z.string().optional(),
  dateConvocation: optionalDate,
  dateTenue: optionalDate,
  lieu: z.string().optional(),
});

export const CloturerAssembleeBody = z.object({
  nombreMembresActifsTotal: z.number().int().min(0),
  nombrePresents: z.number().int().min(0),
});

export const CreateResolutionBody = z.object({
  assembleeId: z.coerce.number().int().positive(),
  titre: z.string().min(1),
  description: z.string().optional(),
  modeVote: z.enum(["main_levee", "bulletin_secret"]).optional(),
});

export const VoterResolutionBody = z.object({
  pour: z.number().int().min(0),
  contre: z.number().int().min(0),
  abstention: z.number().int().min(0),
});

export const MarquerPresenceBody = z.object({
  membreId: z.coerce.number().int().positive(),
  present: z.boolean(),
});

// ─────────────────────────── ÉLECTIONS ───────────────────────────

export const CreateElectionBody = z.object({
  poste: z.string().min(1),
  assembleeId: z.coerce.number().int().optional(),
  dateOuvertureCandidatures: optionalDate,
  dateClotureCandidatures: optionalDate,
  dateScrutin: optionalDate,
  modeVote: z.enum(["main_levee", "bulletin_secret"]).optional(),
});

export const CreateCandidatureBody = z.object({
  electionId: z.coerce.number().int().positive(),
  membreId: z.coerce.number().int().positive(),
});

export const VoteBody = z.object({
  candidatureId: z.coerce.number().int().positive(),
  votantMembreId: z.coerce.number().int().optional(),
});

// ─────────────────────────── BUREAU EXÉCUTIF ───────────────────────────

export const CreateMandatBody = z.object({
  membreId: z.coerce.number().int().positive(),
  poste: z.string().min(1),
  dateDebut: z.string(),
  dateFin: optionalDate,
  renouvelable: z.boolean().optional(),
});

export const CreateReunionBureauBody = z.object({
  dateReunion: z.string(),
  ordreDuJour: z.string().optional(),
  decaissementMontant: z.coerce.number().int().min(0).optional(),
});

export const UpdateReunionBureauBody = z.object({
  procesVerbal: z.string().optional(),
});

export const CreateDecisionBureauBody = z.object({
  reunionId: z.coerce.number().int().optional(),
  titre: z.string().min(1),
  description: z.string().optional(),
});

// ─────────────────────────── COMMISSARIAT AUX COMPTES ───────────────────────────

export const CreateControleBody = z.object({
  dateControle: z.string(),
  perimetre: z.string().optional(),
  observations: z.string().optional(),
});

// ─────────────────────────── COMPTABILITÉ ───────────────────────────

export const CreateEcritureBody = z.object({
  date: z.string(),
  type: z.enum(["encaissement", "decaissement"]),
  categorie: z.enum(["cotisation", "don", "ristourne", "assistance", "pret", "fonctionnement", "autre"]),
  libelle: z.string().min(1),
  montant: z.coerce.number().int().positive(),
  compte: z.enum(["caisse", "banque"]).optional(),
  refType: z.string().optional(),
  refId: z.coerce.number().int().optional(),
});

export const ListEcrituresQueryParams = z.object({
  annee: z.coerce.number().int().optional(),
  mois: z.coerce.number().int().optional(),
  compte: z.string().optional(),
  categorie: z.string().optional(),
});

export const CreateBudgetBody = z.object({
  annee: z.coerce.number().int(),
  type: z.enum(["annuel", "fonctionnement_be"]),
  montantPrevisionnel: z.coerce.number().int().min(0),
  adoptePar: z.string().optional(),
});

// ─────────────────────────── SPORTS ET LOISIRS ───────────────────────────

export const CreateActiviteSportBody = z.object({
  titre: z.string().min(1),
  type: z.enum(["tournoi", "sortie", "voyage", "autre"]).optional(),
  dateActivite: optionalDate,
  budget: z.coerce.number().int().min(0).optional(),
  description: z.string().optional(),
});

// ─────────────────────────── DOCUMENTS ───────────────────────────

export const DocumentCategorie = z.enum([
  "statut", "reglement_interieur", "pv", "rapport", "courrier", "decision", "contrat", "photo", "autre",
]);

export const UpdateDocumentBody = z.object({
  nom: z.string().optional(),
  categorie: DocumentCategorie.optional(),
});

// ─────────────────────────── COMMUNICATION ───────────────────────────

export const CreateCommunicationBody = z.object({
  canal: z.enum(["sms", "whatsapp", "email"]),
  sujet: z.string().optional(),
  message: z.string().min(1),
  cible: z.enum(["tous", "actifs", "defaillants", "honneur", "selection"]).optional(),
  destinataireIds: z.array(z.number().int()).optional(),
});

// ─────────────────────────── RETRAITE COMPLÉMENTAIRE ───────────────────────────

export const CreateCotisationRcBody = z.object({
  membreId: z.coerce.number().int().positive(),
  annee: z.coerce.number().int(),
  mois: z.coerce.number().int().min(1).max(12),
  montant: z.coerce.number().int().min(2500, "Le minimum est de 2500 FCFA par tranche (Fiche RC, Art.5)"),
});

export const RachatPartielRcBody = z.object({
  membreId: z.coerce.number().int().positive(),
  montant: z.coerce.number().int().positive(),
});
