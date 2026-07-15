import {
  pgTable, serial, text, integer, boolean, timestamp, date, varchar, jsonb,
} from "drizzle-orm/pg-core";

/* ============================================================================
 * NOTE IMPORTANTE
 * ----------------------------------------------------------------------------
 * Ce fichier de schéma a été RECONSTRUIT. Le paquet original `lib/db` n'était
 * pas présent dans l'archive fournie (seul le dossier `artifacts/` existait).
 * Les tables ci-dessous reproduisent fidèlement les colonnes utilisées dans
 * `artifacts/api-server/src/routes/*.ts` puis ajoutent toutes les tables
 * nécessaires aux modules manquants du cahier des charges (élections, AG,
 * bureau exécutif, comptabilité, projets immobiliers, prêts, etc.).
 *
 * Si une vraie base de données existait déjà en production avec un schéma
 * différent, il faudra comparer ce fichier à l'état réel avant de lancer
 * `drizzle-kit push`, pour éviter toute perte de données.
 * ========================================================================== */

// ─────────────────────────────────────────────────────────────────────────
// UTILISATEURS / AUTHENTIFICATION
// ─────────────────────────────────────────────────────────────────────────

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  motDePasse: text("mot_de_passe").notNull(),
  nom: text("nom").notNull(),
  prenom: text("prenom").notNull(),
  // president | vice_president | secretaire_general | secretaire_general_adjoint
  // tresorier_general | tresorier_adjoint | commissaire_comptes | responsable_affaires_sociales
  // responsable_prets | responsable_sports | conseiller_statutaire | mutualiste | admin
  role: text("role").notNull().default("mutualiste"),
  membreId: integer("membre_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─────────────────────────────────────────────────────────────────────────
// MEMBRES
// ─────────────────────────────────────────────────────────────────────────

export const membresTable = pgTable("membres", {
  id: serial("id").primaryKey(),
  matricule: text("matricule").notNull().unique(),
  nom: text("nom").notNull(),
  prenom: text("prenom").notNull(),
  email: text("email"),
  telephone: text("telephone"),
  whatsapp: text("whatsapp"),
  dateNaissance: date("date_naissance", { mode: "string" }),
  lieuNaissance: text("lieu_naissance"),
  dateEmbauche: date("date_embauche", { mode: "string" }),
  dateCdi: date("date_cdi", { mode: "string" }),
  dateAdhesion: date("date_adhesion", { mode: "string" }).notNull(),
  // ancien | nouveau — détermine le délai de carence (Art. 8 R.I. : 3 mois nouveaux CDI / 10 mois anciens CDI)
  typeCdi: text("type_cdi").default("nouveau"),
  // actif | defaillant | radie | demissionnaire | decede | honneur
  statut: text("statut").notNull().default("actif"),
  // ordinaire | exceptionnel (décision n°05-2025 : carence 6 mois)
  typeAdhesion: text("type_adhesion").default("ordinaire"),
  situationFamiliale: text("situation_familiale"),
  departement: text("departement"),
  service: text("service"),
  poste: text("poste"),
  fonction: text("fonction"),
  permisConduire: boolean("permis_conduire").default(false),
  photoUrl: text("photo_url"),
  cniUrl: text("cni_url"),
  retraiteComplementaire: boolean("retraite_complementaire").default(false),
  // renonciation à l'assistance décès des ascendants (Décision 05-2025, art.1.2)
  renonciationAssistances: boolean("renonciation_assistances").default(false),
  dateDeces: date("date_deces", { mode: "string" }),
  causeDeces: text("cause_deces"),
  dateDepart: date("date_depart", { mode: "string" }),
  motifDepart: text("motif_depart"), // demission_mutuelle | demission_npg | licenciement | radiation | deces
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Conjoint / enfants / parents / beaux-parents déclarés (Fiche de membre)
export const personnesDeclareeesTable = pgTable("personnes_declarees", {
  id: serial("id").primaryKey(),
  membreId: integer("membre_id").notNull(),
  lienParente: text("lien_parente").notNull(), // conjoint | enfant | parent | beau_parent
  nom: text("nom"),
  prenom: text("prenom"),
  dateNaissance: date("date_naissance", { mode: "string" }),
  // Article 46 R.I. : toute modification de nom d'ascendant/conjoint(e) n'est prise
  // en compte qu'après 1 an, sauf décès du/de la conjoint(e).
  dateModification: date("date_modification", { mode: "string" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Historique des mouvements d'effectifs (Module 1 cahier des charges)
export const mouvementsEffectifsTable = pgTable("mouvements_effectifs", {
  id: serial("id").primaryKey(),
  membreId: integer("membre_id").notNull(),
  type: text("type").notNull(), // adhesion | demission | licenciement | radiation | deces | reintegration
  details: text("details"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─────────────────────────────────────────────────────────────────────────
// COTISATIONS
// ─────────────────────────────────────────────────────────────────────────

export const cotisationsTable = pgTable("cotisations", {
  id: serial("id").primaryKey(),
  membreId: integer("membre_id").notNull(),
  annee: integer("annee").notNull(),
  mois: integer("mois").notNull(),
  montant: integer("montant").notNull(),
  datePaiement: date("date_paiement", { mode: "string" }),
  modePaiement: text("mode_paiement").default("especes"), // especes|virement|prelevement|regularisation
  note: text("note"),
  createdById: integer("created_by_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Cotisation retraite complémentaire (facultatif, Fiche RC : 2500F min, tranches de 2500F)
export const cotisationsRcTable = pgTable("cotisations_rc", {
  id: serial("id").primaryKey(),
  membreId: integer("membre_id").notNull(),
  annee: integer("annee").notNull(),
  mois: integer("mois").notNull(),
  montant: integer("montant").notNull(),
  datePaiement: date("date_paiement", { mode: "string" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─────────────────────────────────────────────────────────────────────────
// ASSISTANCES SOCIALES
// ─────────────────────────────────────────────────────────────────────────

export const assistancesTable = pgTable("assistances", {
  id: serial("id").primaryKey(),
  membreId: integer("membre_id").notNull(),
  type: text("type").notNull(),
  // en_attente | commission_affaires_sociales | commission_prets | tresorerie | bureau
  // | direction_generale | approuvee | rejetee | payee
  statut: text("statut").notNull().default("en_attente"),
  dateEvenement: date("date_evenement", { mode: "string" }),
  description: text("description"),
  beneficiaireNom: text("beneficiaire_nom"),
  beneficiairePrenom: text("beneficiaire_prenom"),
  beneficiaireRelation: text("beneficiaire_relation"),
  montant: integer("montant"),
  montantDemande: integer("montant_demande"),
  datePaiement: date("date_paiement", { mode: "string" }),
  commentaireRejet: text("commentaire_rejet"),
  referenceArticle: text("reference_article"), // article du règlement intérieur appliqué
  createdById: integer("created_by_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const assistanceValidationsTable = pgTable("assistance_validations", {
  id: serial("id").primaryKey(),
  assistanceId: integer("assistance_id").notNull(),
  etape: text("etape").notNull(),
  decision: text("decision").notNull(), // approuver | rejeter
  commentaire: text("commentaire"),
  validePar: integer("valide_par"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Documents joints à une demande (pièces justificatives non cumulatives Art. 42 R.I.)
export const assistancePiecesTable = pgTable("assistance_pieces", {
  id: serial("id").primaryKey(),
  assistanceId: integer("assistance_id").notNull(),
  type: text("type").notNull(), // certificat_deces | piece_identite | extrait_naissance | ...
  documentId: integer("document_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─────────────────────────────────────────────────────────────────────────
// PRÊTS (Module 4 — distinct des assistances, avec échéancier de remboursement)
// ─────────────────────────────────────────────────────────────────────────

export const pretsTable = pgTable("prets", {
  id: serial("id").primaryKey(),
  membreId: integer("membre_id").notNull(),
  motif: text("motif"),
  montantDemande: integer("montant_demande").notNull(),
  montantAccorde: integer("montant_accorde"),
  dureeMois: integer("duree_mois").default(20), // Art. 57 R.I. : max 20 mois
  differeMois: integer("differe_mois").default(3), // Art. 57 R.I. : différé de 3 mois après reprise
  dateDecaissement: date("date_decaissement", { mode: "string" }),
  // en_attente | commission_prets | bureau | direction_generale | accorde | rejete | solde | en_retard
  statut: text("statut").notNull().default("en_attente"),
  createdById: integer("created_by_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const pretRemboursementsTable = pgTable("pret_remboursements", {
  id: serial("id").primaryKey(),
  pretId: integer("pret_id").notNull(),
  echeance: integer("echeance").notNull(), // n° de mensualité 1..dureeMois
  dateEcheance: date("date_echeance", { mode: "string" }),
  montant: integer("montant").notNull(),
  paye: boolean("paye").default(false),
  datePaiement: date("date_paiement", { mode: "string" }),
});

// ─────────────────────────────────────────────────────────────────────────
// DÉPARTS / DÉMISSIONS / INDEMNITÉS (Titre XII Statuts, Art. 97-99 R.I.)
// ─────────────────────────────────────────────────────────────────────────

export const departsTable = pgTable("departs", {
  id: serial("id").primaryKey(),
  membreId: integer("membre_id").notNull(),
  type: text("type").notNull(), // demission_mutuelle | demission_npg | licenciement | radiation
  dateDepart: date("date_depart", { mode: "string" }).notNull(),
  motif: text("motif"),
  aBeneficieAssistanceSociale: boolean("a_beneficie_assistance_sociale").default(false),
  totalCotisations: integer("total_cotisations").default(0),
  fraction: text("fraction"), // "1/4" | "1/8" | "aucune"
  montantIndemnite: integer("montant_indemnite").default(0),
  // bloque si < 60 mois (5 ans) et a bénéficié d'une assistance sociale ou adhésion exceptionnelle
  bloqueParDelai: boolean("bloque_par_delai").default(false),
  statut: text("statut").notNull().default("en_attente"), // en_attente | valide | paye
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─────────────────────────────────────────────────────────────────────────
// PROJETS (immobiliers + divers : bons d'achat, poulet de fin d'année, etc.)
// Module 10 cahier des charges + Titre IX Statuts (cotisation exceptionnelle)
// ─────────────────────────────────────────────────────────────────────────

export const projetsTable = pgTable("projets", {
  id: serial("id").primaryKey(),
  nom: text("nom").notNull(),
  // immobilier_logement | immobilier_appartement | immobilier_terrain
  // | bon_telephone | bon_dady_shop | bon_sicomex | bon_librairie | poulet_fin_annee | autre
  type: text("type").notNull(),
  description: text("description"),
  dureeRemboursementMois: integer("duree_remboursement_mois").default(10),
  actif: boolean("actif").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const souscriptionsProjetTable = pgTable("souscriptions_projet", {
  id: serial("id").primaryKey(),
  projetId: integer("projet_id").notNull(),
  membreId: integer("membre_id").notNull(),
  quantite: integer("quantite").default(1),
  typeBienImmobilier: text("type_bien_immobilier"), // ex: logement/appartement type
  coutTotal: integer("cout_total").default(0),
  fraisDossier: integer("frais_dossier").default(0),
  apportInitial: integer("apport_initial").default(0),
  montantMensuel: integer("montant_mensuel").default(0),
  nombreMensualites: integer("nombre_mensualites").default(10),
  dateDebutPrelevement: date("date_debut_prelevement", { mode: "string" }),
  statut: text("statut").notNull().default("en_cours"), // en_cours | solde | annule
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const paiementsProjetTable = pgTable("paiements_projet", {
  id: serial("id").primaryKey(),
  souscriptionId: integer("souscription_id").notNull(),
  mois: integer("mois").notNull(),
  annee: integer("annee").notNull(),
  montant: integer("montant").notNull(),
  paye: boolean("paye").default(false),
  datePaiement: date("date_paiement", { mode: "string" }),
});

// ─────────────────────────────────────────────────────────────────────────
// ASSEMBLÉES GÉNÉRALES (Module 5)
// ─────────────────────────────────────────────────────────────────────────

export const assembleesTable = pgTable("assemblees", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // ordinaire | extraordinaire
  titre: text("titre").notNull(),
  ordreDuJour: text("ordre_du_jour"),
  dateConvocation: date("date_convocation", { mode: "string" }),
  dateTenue: date("date_tenue", { mode: "string" }),
  lieu: text("lieu"),
  // Art. 18 R.I. AG Extraordinaire = 2/3 présents ; dissolution = 3/4 (Art.101 R.I.)
  quorumRequisPct: integer("quorum_requis_pct").default(50),
  nombreMembresActifsTotal: integer("nombre_membres_actifs_total").default(0),
  nombrePresents: integer("nombre_presents").default(0),
  statut: text("statut").notNull().default("planifiee"), // planifiee | en_cours | cloturee
  procesVerbalDocumentId: integer("proces_verbal_document_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const presencesAssembleeTable = pgTable("presences_assemblee", {
  id: serial("id").primaryKey(),
  assembleeId: integer("assemblee_id").notNull(),
  membreId: integer("membre_id").notNull(),
  present: boolean("present").default(false),
  emargementAt: timestamp("emargement_at"),
});

export const resolutionsAssembleeTable = pgTable("resolutions_assemblee", {
  id: serial("id").primaryKey(),
  assembleeId: integer("assemblee_id").notNull(),
  titre: text("titre").notNull(),
  description: text("description"),
  modeVote: text("mode_vote").default("main_levee"), // main_levee | bulletin_secret
  pour: integer("pour").default(0),
  contre: integer("contre").default(0),
  abstention: integer("abstention").default(0),
  adoptee: boolean("adoptee"),
});

// ─────────────────────────────────────────────────────────────────────────
// ÉLECTIONS (Module 6)
// ─────────────────────────────────────────────────────────────────────────

export const electionsTable = pgTable("elections", {
  id: serial("id").primaryKey(),
  poste: text("poste").notNull(), // president | commissaire_comptes | ...
  assembleeId: integer("assemblee_id"),
  dateOuvertureCandidatures: date("date_ouverture_candidatures", { mode: "string" }),
  dateClotureCandidatures: date("date_cloture_candidatures", { mode: "string" }),
  dateScrutin: date("date_scrutin", { mode: "string" }),
  modeVote: text("mode_vote").default("bulletin_secret"),
  statut: text("statut").notNull().default("candidatures_ouvertes"),
  // candidatures_ouvertes | scrutin | depouille | publie
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const candidaturesTable = pgTable("candidatures", {
  id: serial("id").primaryKey(),
  electionId: integer("election_id").notNull(),
  membreId: integer("membre_id").notNull(),
  // Art. 12 R.I. : 5 ans d'ancienneté NPG + 2 ans dans la mutuelle sans discontinuité
  ancienneteNpgOk: boolean("anciennete_npg_ok").default(false),
  ancienneteMutuelleOk: boolean("anciennete_mutuelle_ok").default(false),
  incompatibiliteOk: boolean("incompatibilite_ok").default(false), // pas conseiller/délégué/cadre sup en fonction
  pieceIdentiteDocumentId: integer("piece_identite_document_id"),
  attestationTravailDocumentId: integer("attestation_travail_document_id"),
  photoDocumentId: integer("photo_document_id"),
  lettreCandidatureDocumentId: integer("lettre_candidature_document_id"),
  statut: text("statut").notNull().default("soumise"), // soumise | validee | rejetee
  nombreVoix: integer("nombre_voix").default(0),
  elu: boolean("elu").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const votesTable = pgTable("votes", {
  id: serial("id").primaryKey(),
  electionId: integer("election_id").notNull(),
  candidatureId: integer("candidature_id").notNull(),
  votantMembreId: integer("votant_membre_id"), // peut être anonymisé après dépouillement
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─────────────────────────────────────────────────────────────────────────
// BUREAU EXÉCUTIF (Module 7)
// ─────────────────────────────────────────────────────────────────────────

export const bureauMandatsTable = pgTable("bureau_mandats", {
  id: serial("id").primaryKey(),
  membreId: integer("membre_id").notNull(),
  poste: text("poste").notNull(),
  // president | vice_president | secretaire_general | secretaire_general_adjoint
  // tresorier_general | tresorier_adjoint | secretaire_organisation | secretaire_organisation_adjoint
  // responsable_affaires_sociales | responsable_prets | responsable_sports
  // representant_conseillers_1 | representant_conseillers_2
  dateDebut: date("date_debut", { mode: "string" }).notNull(),
  dateFin: date("date_fin", { mode: "string" }), // mandat de 3 ans (Art.20 Statuts / 22 R.I.)
  renouvelable: boolean("renouvelable").default(true),
  actif: boolean("actif").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const reunionsBureauTable = pgTable("reunions_bureau", {
  id: serial("id").primaryKey(),
  dateReunion: date("date_reunion", { mode: "string" }).notNull(),
  ordreDuJour: text("ordre_du_jour"),
  procesVerbal: text("proces_verbal"),
  procesVerbalDocumentId: integer("proces_verbal_document_id"),
  decaissementMontant: integer("decaissement_montant").default(0), // Art.79 R.I.
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const presencesReunionBureauTable = pgTable("presences_reunion_bureau", {
  id: serial("id").primaryKey(),
  reunionId: integer("reunion_id").notNull(),
  membreId: integer("membre_id").notNull(),
  present: boolean("present").default(false),
});

export const decisionsBureauTable = pgTable("decisions_bureau", {
  id: serial("id").primaryKey(),
  reunionId: integer("reunion_id"),
  titre: text("titre").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─────────────────────────────────────────────────────────────────────────
// COMMISSARIAT AUX COMPTES (Module 8)
// ─────────────────────────────────────────────────────────────────────────

export const commissariatControlesTable = pgTable("commissariat_controles", {
  id: serial("id").primaryKey(),
  dateControle: date("date_controle", { mode: "string" }).notNull(),
  perimetre: text("perimetre"), // ce qui a été contrôlé
  observations: text("observations"),
  rapportDocumentId: integer("rapport_document_id"),
  controleurUserId: integer("controleur_user_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─────────────────────────────────────────────────────────────────────────
// COMPTABILITÉ (Module 9)
// ─────────────────────────────────────────────────────────────────────────

export const ecrituresComptablesTable = pgTable("ecritures_comptables", {
  id: serial("id").primaryKey(),
  date: date("date", { mode: "string" }).notNull(),
  type: text("type").notNull(), // encaissement | decaissement
  categorie: text("categorie").notNull(), // cotisation|don|ristourne|assistance|pret|fonctionnement|autre
  libelle: text("libelle").notNull(),
  montant: integer("montant").notNull(),
  compte: text("compte").default("caisse"), // caisse | banque
  refType: text("ref_type"), // assistance|pret|cotisation|projet|budget_be
  refId: integer("ref_id"),
  createdById: integer("created_by_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const budgetsTable = pgTable("budgets", {
  id: serial("id").primaryKey(),
  annee: integer("annee").notNull(),
  // annuel (global, soumis à l'AG) | fonctionnement_be (5% cotisations + 15% dons, Art.80 R.I.)
  type: text("type").notNull(),
  montantPrevisionnel: integer("montant_previsionnel").default(0),
  montantConsomme: integer("montant_consomme").default(0),
  adoptePar: text("adopte_par"), // "AG du .../.../..." ou "B.E"
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─────────────────────────────────────────────────────────────────────────
// SPORTS ET LOISIRS (Module 11)
// ─────────────────────────────────────────────────────────────────────────

export const sportsActivitesTable = pgTable("sports_activites", {
  id: serial("id").primaryKey(),
  titre: text("titre").notNull(),
  type: text("type").default("tournoi"), // tournoi | sortie | voyage | autre
  dateActivite: date("date_activite", { mode: "string" }),
  budget: integer("budget").default(0),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const sportsPhotosTable = pgTable("sports_photos", {
  id: serial("id").primaryKey(),
  activiteId: integer("activite_id").notNull(),
  documentId: integer("document_id").notNull(),
});

// ─────────────────────────────────────────────────────────────────────────
// GESTION DOCUMENTAIRE (Module 13)
// ─────────────────────────────────────────────────────────────────────────

export const documentsTable = pgTable("documents", {
  id: serial("id").primaryKey(),
  nom: text("nom").notNull(),
  // statut | reglement_interieur | pv | rapport | courrier | decision | contrat | photo | autre
  categorie: text("categorie").notNull().default("autre"),
  mimeType: text("mime_type"),
  tailleOctets: integer("taille_octets"),
  cheminFichier: text("chemin_fichier").notNull(),
  signeElectroniquement: boolean("signe_electroniquement").default(false),
  uploadedById: integer("uploaded_by_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─────────────────────────────────────────────────────────────────────────
// COMMUNICATION (Module 12) — journal des envois (SMS/WhatsApp/Email)
// ─────────────────────────────────────────────────────────────────────────

export const communicationsTable = pgTable("communications", {
  id: serial("id").primaryKey(),
  canal: text("canal").notNull(), // sms | whatsapp | email
  sujet: text("sujet"),
  message: text("message").notNull(),
  cible: text("cible").default("tous"), // tous | actifs | defaillants | honneur | selection
  destinataireIds: jsonb("destinataire_ids").$type<number[]>().default([]),
  nombreDestinataires: integer("nombre_destinataires").default(0),
  statut: text("statut").default("envoye"), // envoye | partiel | echec | en_attente_config
  createdById: integer("created_by_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─────────────────────────────────────────────────────────────────────────
// ANNONCES / PARAMÈTRES / JOURNAL D'ACTIVITÉ
// ─────────────────────────────────────────────────────────────────────────

export const annoncesTable = pgTable("annonces", {
  id: serial("id").primaryKey(),
  titre: text("titre").notNull(),
  contenu: text("contenu").notNull(),
  auteurId: integer("auteur_id"),
  priorite: text("priorite").default("normale"), // normale | urgente
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const parametresTable = pgTable("parametres", {
  id: serial("id").primaryKey(),
  cle: varchar("cle", { length: 100 }).notNull().unique(),
  valeur: text("valeur").notNull(),
  description: text("description"),
});

export const activityLogsTable = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  action: text("action").notNull(),
  details: text("details"),
  entite: text("entite"),
  entiteId: integer("entite_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
