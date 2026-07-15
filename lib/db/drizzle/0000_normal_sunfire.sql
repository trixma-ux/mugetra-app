CREATE TABLE "activity_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"action" text NOT NULL,
	"details" text,
	"entite" text,
	"entite_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "annonces" (
	"id" serial PRIMARY KEY NOT NULL,
	"titre" text NOT NULL,
	"contenu" text NOT NULL,
	"auteur_id" integer,
	"priorite" text DEFAULT 'normale',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assemblees" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"titre" text NOT NULL,
	"ordre_du_jour" text,
	"date_convocation" date,
	"date_tenue" date,
	"lieu" text,
	"quorum_requis_pct" integer DEFAULT 50,
	"nombre_membres_actifs_total" integer DEFAULT 0,
	"nombre_presents" integer DEFAULT 0,
	"statut" text DEFAULT 'planifiee' NOT NULL,
	"proces_verbal_document_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assistance_pieces" (
	"id" serial PRIMARY KEY NOT NULL,
	"assistance_id" integer NOT NULL,
	"type" text NOT NULL,
	"document_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assistance_validations" (
	"id" serial PRIMARY KEY NOT NULL,
	"assistance_id" integer NOT NULL,
	"etape" text NOT NULL,
	"decision" text NOT NULL,
	"commentaire" text,
	"valide_par" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assistances" (
	"id" serial PRIMARY KEY NOT NULL,
	"membre_id" integer NOT NULL,
	"type" text NOT NULL,
	"statut" text DEFAULT 'en_attente' NOT NULL,
	"date_evenement" date,
	"description" text,
	"beneficiaire_nom" text,
	"beneficiaire_prenom" text,
	"beneficiaire_relation" text,
	"montant" integer,
	"montant_demande" integer,
	"date_paiement" date,
	"commentaire_rejet" text,
	"reference_article" text,
	"created_by_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "budgets" (
	"id" serial PRIMARY KEY NOT NULL,
	"annee" integer NOT NULL,
	"type" text NOT NULL,
	"montant_previsionnel" integer DEFAULT 0,
	"montant_consomme" integer DEFAULT 0,
	"adopte_par" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bureau_mandats" (
	"id" serial PRIMARY KEY NOT NULL,
	"membre_id" integer NOT NULL,
	"poste" text NOT NULL,
	"date_debut" date NOT NULL,
	"date_fin" date,
	"renouvelable" boolean DEFAULT true,
	"actif" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "candidatures" (
	"id" serial PRIMARY KEY NOT NULL,
	"election_id" integer NOT NULL,
	"membre_id" integer NOT NULL,
	"anciennete_npg_ok" boolean DEFAULT false,
	"anciennete_mutuelle_ok" boolean DEFAULT false,
	"incompatibilite_ok" boolean DEFAULT false,
	"piece_identite_document_id" integer,
	"attestation_travail_document_id" integer,
	"photo_document_id" integer,
	"lettre_candidature_document_id" integer,
	"statut" text DEFAULT 'soumise' NOT NULL,
	"nombre_voix" integer DEFAULT 0,
	"elu" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commissariat_controles" (
	"id" serial PRIMARY KEY NOT NULL,
	"date_controle" date NOT NULL,
	"perimetre" text,
	"observations" text,
	"rapport_document_id" integer,
	"controleur_user_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "communications" (
	"id" serial PRIMARY KEY NOT NULL,
	"canal" text NOT NULL,
	"sujet" text,
	"message" text NOT NULL,
	"cible" text DEFAULT 'tous',
	"destinataire_ids" jsonb DEFAULT '[]'::jsonb,
	"nombre_destinataires" integer DEFAULT 0,
	"statut" text DEFAULT 'envoye',
	"created_by_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cotisations_rc" (
	"id" serial PRIMARY KEY NOT NULL,
	"membre_id" integer NOT NULL,
	"annee" integer NOT NULL,
	"mois" integer NOT NULL,
	"montant" integer NOT NULL,
	"date_paiement" date,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cotisations" (
	"id" serial PRIMARY KEY NOT NULL,
	"membre_id" integer NOT NULL,
	"annee" integer NOT NULL,
	"mois" integer NOT NULL,
	"montant" integer NOT NULL,
	"date_paiement" date,
	"mode_paiement" text DEFAULT 'especes',
	"note" text,
	"created_by_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "decisions_bureau" (
	"id" serial PRIMARY KEY NOT NULL,
	"reunion_id" integer,
	"titre" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "departs" (
	"id" serial PRIMARY KEY NOT NULL,
	"membre_id" integer NOT NULL,
	"type" text NOT NULL,
	"date_depart" date NOT NULL,
	"motif" text,
	"a_beneficie_assistance_sociale" boolean DEFAULT false,
	"total_cotisations" integer DEFAULT 0,
	"fraction" text,
	"montant_indemnite" integer DEFAULT 0,
	"bloque_par_delai" boolean DEFAULT false,
	"statut" text DEFAULT 'en_attente' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"nom" text NOT NULL,
	"categorie" text DEFAULT 'autre' NOT NULL,
	"mime_type" text,
	"taille_octets" integer,
	"chemin_fichier" text NOT NULL,
	"signe_electroniquement" boolean DEFAULT false,
	"uploaded_by_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ecritures_comptables" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"type" text NOT NULL,
	"categorie" text NOT NULL,
	"libelle" text NOT NULL,
	"montant" integer NOT NULL,
	"compte" text DEFAULT 'caisse',
	"ref_type" text,
	"ref_id" integer,
	"created_by_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "elections" (
	"id" serial PRIMARY KEY NOT NULL,
	"poste" text NOT NULL,
	"assemblee_id" integer,
	"date_ouverture_candidatures" date,
	"date_cloture_candidatures" date,
	"date_scrutin" date,
	"mode_vote" text DEFAULT 'bulletin_secret',
	"statut" text DEFAULT 'candidatures_ouvertes' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "membres" (
	"id" serial PRIMARY KEY NOT NULL,
	"matricule" text NOT NULL,
	"nom" text NOT NULL,
	"prenom" text NOT NULL,
	"email" text,
	"telephone" text,
	"whatsapp" text,
	"date_naissance" date,
	"lieu_naissance" text,
	"date_embauche" date,
	"date_cdi" date,
	"date_adhesion" date NOT NULL,
	"type_cdi" text DEFAULT 'nouveau',
	"statut" text DEFAULT 'actif' NOT NULL,
	"type_adhesion" text DEFAULT 'ordinaire',
	"situation_familiale" text,
	"departement" text,
	"service" text,
	"poste" text,
	"fonction" text,
	"permis_conduire" boolean DEFAULT false,
	"photo_url" text,
	"cni_url" text,
	"retraite_complementaire" boolean DEFAULT false,
	"renonciation_assistances" boolean DEFAULT false,
	"date_deces" date,
	"cause_deces" text,
	"date_depart" date,
	"motif_depart" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "membres_matricule_unique" UNIQUE("matricule")
);
--> statement-breakpoint
CREATE TABLE "mouvements_effectifs" (
	"id" serial PRIMARY KEY NOT NULL,
	"membre_id" integer NOT NULL,
	"type" text NOT NULL,
	"details" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "paiements_projet" (
	"id" serial PRIMARY KEY NOT NULL,
	"souscription_id" integer NOT NULL,
	"mois" integer NOT NULL,
	"annee" integer NOT NULL,
	"montant" integer NOT NULL,
	"paye" boolean DEFAULT false,
	"date_paiement" date
);
--> statement-breakpoint
CREATE TABLE "parametres" (
	"id" serial PRIMARY KEY NOT NULL,
	"cle" varchar(100) NOT NULL,
	"valeur" text NOT NULL,
	"description" text,
	CONSTRAINT "parametres_cle_unique" UNIQUE("cle")
);
--> statement-breakpoint
CREATE TABLE "personnes_declarees" (
	"id" serial PRIMARY KEY NOT NULL,
	"membre_id" integer NOT NULL,
	"lien_parente" text NOT NULL,
	"nom" text,
	"prenom" text,
	"date_naissance" date,
	"date_modification" date,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "presences_assemblee" (
	"id" serial PRIMARY KEY NOT NULL,
	"assemblee_id" integer NOT NULL,
	"membre_id" integer NOT NULL,
	"present" boolean DEFAULT false,
	"emargement_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "presences_reunion_bureau" (
	"id" serial PRIMARY KEY NOT NULL,
	"reunion_id" integer NOT NULL,
	"membre_id" integer NOT NULL,
	"present" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "pret_remboursements" (
	"id" serial PRIMARY KEY NOT NULL,
	"pret_id" integer NOT NULL,
	"echeance" integer NOT NULL,
	"date_echeance" date,
	"montant" integer NOT NULL,
	"paye" boolean DEFAULT false,
	"date_paiement" date
);
--> statement-breakpoint
CREATE TABLE "prets" (
	"id" serial PRIMARY KEY NOT NULL,
	"membre_id" integer NOT NULL,
	"motif" text,
	"montant_demande" integer NOT NULL,
	"montant_accorde" integer,
	"duree_mois" integer DEFAULT 20,
	"differe_mois" integer DEFAULT 3,
	"date_decaissement" date,
	"statut" text DEFAULT 'en_attente' NOT NULL,
	"created_by_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projets" (
	"id" serial PRIMARY KEY NOT NULL,
	"nom" text NOT NULL,
	"type" text NOT NULL,
	"description" text,
	"duree_remboursement_mois" integer DEFAULT 10,
	"actif" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resolutions_assemblee" (
	"id" serial PRIMARY KEY NOT NULL,
	"assemblee_id" integer NOT NULL,
	"titre" text NOT NULL,
	"description" text,
	"mode_vote" text DEFAULT 'main_levee',
	"pour" integer DEFAULT 0,
	"contre" integer DEFAULT 0,
	"abstention" integer DEFAULT 0,
	"adoptee" boolean
);
--> statement-breakpoint
CREATE TABLE "reunions_bureau" (
	"id" serial PRIMARY KEY NOT NULL,
	"date_reunion" date NOT NULL,
	"ordre_du_jour" text,
	"proces_verbal" text,
	"proces_verbal_document_id" integer,
	"decaissement_montant" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "souscriptions_projet" (
	"id" serial PRIMARY KEY NOT NULL,
	"projet_id" integer NOT NULL,
	"membre_id" integer NOT NULL,
	"quantite" integer DEFAULT 1,
	"type_bien_immobilier" text,
	"cout_total" integer DEFAULT 0,
	"frais_dossier" integer DEFAULT 0,
	"apport_initial" integer DEFAULT 0,
	"montant_mensuel" integer DEFAULT 0,
	"nombre_mensualites" integer DEFAULT 10,
	"date_debut_prelevement" date,
	"statut" text DEFAULT 'en_cours' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sports_activites" (
	"id" serial PRIMARY KEY NOT NULL,
	"titre" text NOT NULL,
	"type" text DEFAULT 'tournoi',
	"date_activite" date,
	"budget" integer DEFAULT 0,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sports_photos" (
	"id" serial PRIMARY KEY NOT NULL,
	"activite_id" integer NOT NULL,
	"document_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"mot_de_passe" text NOT NULL,
	"nom" text NOT NULL,
	"prenom" text NOT NULL,
	"role" text DEFAULT 'mutualiste' NOT NULL,
	"membre_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "votes" (
	"id" serial PRIMARY KEY NOT NULL,
	"election_id" integer NOT NULL,
	"candidature_id" integer NOT NULL,
	"votant_membre_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
