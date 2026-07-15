# MUGETRA-NPG.CI — Application de Gestion

Application de gestion pour la Mutuelle Générale des Travailleurs de la Nouvelle Parfumerie
Gandour Côte d'Ivoire (MUGETRA-NPG.CI), couvrant l'ensemble des volets prévus par le **statut**,
le **règlement intérieur** et le **cahier des charges** fournis : membres, cotisations,
assistances sociales, prêts, projets, gouvernance (AG, élections, Bureau Exécutif, commissariat
aux comptes), comptabilité, sports et loisirs, gestion documentaire et communication.

---

## ⚠️ 1. Ce qui a été reconstruit — à lire avant toute chose

L'archive `.zip` que vous avez transmise ne contenait que le dossier `artifacts/` (les 3
applications : `api-server`, `mugetra` (web) et `mugetra-mobile`). **Il manquait entièrement les
paquets partagés `lib/db`, `lib/api-zod`, `lib/api-client-react` et `lib/api-spec`**, qui sont le
socle technique reliant le frontend au backend (schéma de base de données, validation des
requêtes, client d'appels API). Sans eux, l'application ne pouvait ni compiler, ni démarrer,
même avant d'y ajouter la moindre fonctionnalité.

Ce qui a été fait :

- **`lib/db`** : schéma Drizzle ORM entièrement reconstruit à partir de l'usage réel des colonnes
  dans le code existant, puis étendu avec toutes les tables des nouveaux modules (35 tables au
  total). Validé avec `drizzle-kit generate` (migration SQL générée sans erreur).
- **`lib/api-zod`** : schémas de validation Zod reconstruits pour toutes les routes existantes et
  nouvelles.
- **`lib/api-client-react`** : le client généré par Orval (mentionné dans `replit.md` mais absent)
  a été remplacé par une implémentation manuelle des hooks React Query réellement utilisés par
  les pages existantes (web **et** mobile) : `useListMembres`, `useCreateAssistance`,
  `useGetCurrentUser`, `useLogin`, etc. Les nouvelles pages créées dans ce lot utilisent un
  helper plus simple (`src/lib/api.ts`) pour rester faciles à maintenir sans regénération.
- **Application mobile** : plusieurs fichiers de support (`hooks/useColors.ts`,
  `context/AuthContext.tsx`, `components/{LoadingView,EmptyView,StatusBadge,StatCard,
  ErrorBoundary}.tsx`) étaient également absents de l'archive et ont été reconstruits pour que
  l'app Expo compile.

**Validation effectuée dans cet environnement** (voir section 6) :
`pnpm run typecheck` (3 apps) ✅, `vite build` (web) ✅, `esbuild` (api-server) ✅,
`drizzle-kit generate` (35 tables) ✅.

Si une vraie base de données de production existait déjà avec un schéma différent de celui
reconstruit ici, **comparez `lib/db/src/schema.ts` à l'état réel de la base avant de lancer
`drizzle-kit push`**, pour éviter toute perte de données.

---

## 2. Bugs corrigés dans le code existant

- `app.ts` : le middleware `cookie-parser` n'était pas enregistré alors que `lib/auth.ts` lit
  `req.cookies.token` — l'authentification par cookie ne fonctionnait donc pas.
- `parametres.ts` : plusieurs montants par défaut ne correspondaient pas au règlement intérieur
  (ex. décès d'un ascendant à 100 000F au lieu de 400 000F ; frais de mission Bureau à 15 000F/
  25 000F au lieu de 50 000F/100 000F Abidjan/intérieur). Voir la liste complète en section 4.
- `membres.ts` et `assistances.ts` : le calcul de carence ignorait la distinction **ancien CDI /
  nouveau CDI** prévue à l'Article 8 des Statuts (3 mois nouveaux CDI, 10 mois anciens CDI pour
  les cas décès/mariage) — un seul délai de 3 mois était appliqué à tout le monde.
- `vite.config.ts` : ajout d'un proxy `/api` et `/uploads` vers l'api-server en développement
  (absent, empêchait le front web d'atteindre l'API en local sans configuration supplémentaire).

---

## 3. Nouveaux modules ajoutés (backend + interface web)

Tous les modules ci-dessous correspondent aux volets du **cahier des charges** qui n'étaient pas
implémentés. Chacun a ses routes API (`artifacts/api-server/src/routes/*.ts`) et sa page web
(`artifacts/mugetra/src/pages/*/index.tsx`), reliés dans la barre de navigation (regroupés par
section : *Cotisations & assistance*, *Gouvernance*, *Vie de la mutuelle*).

| Module (cahier des charges) | Fichiers | Points clés |
|---|---|---|
| **4. Prêts** | `routes/prets.ts`, `pages/prets` | Plafond 500 000F, 20 mois max, différé de 3 mois (Art. 57 R.I.), échéancier généré automatiquement au décaissement, suivi des retards. |
| **Départs / démissions** | `routes/departs.ts`, `pages/departs` | Indemnités calculées automatiquement : 1/4 (démission NPG.CI), 1/8 (démission mutuelle seule), blocage 5 ans si assistance déjà perçue, aucun droit si radiation (Art. 97-99 R.I.). |
| **10. Projets immobiliers & divers** | `routes/projets.ts`, `pages/projets` | Logements/appartements/terrains + bons d'achat (téléphone, Dady-Shop, Sicomex, librairie), poulet de fin d'année — souscriptions et prélèvements échelonnés. |
| **5. Assemblées Générales** | `routes/assemblees.ts`, `pages/assemblees` | Convocation, émargement, calcul de quorum (50% AG ordinaire, 2/3 AG extraordinaire — Art. 18 R.I.), résolutions avec vote. |
| **6. Élections** | `routes/elections.ts`, `pages/elections` | Contrôle automatique d'éligibilité (5 ans NPG.CI + 2 ans mutuelle sans discontinuité — Art. 12 R.I.), candidatures, vote, dépouillement. |
| **7. Bureau Exécutif** | `routes/bureau.ts`, `pages/bureau` | Mandats (3 ans), réunions mensuelles avec ordre du jour/PV, décisions. |
| **8. Commissariat aux comptes** | `routes/commissariat.ts`, `pages/commissariat` | Contrôles programmés, alerte si moins de 2 contrôles/an (Art. 33.8 R.I.), synthèse financière. |
| **9. Comptabilité** | `routes/comptabilite.ts`, `pages/comptabilite` | Journal des encaissements/décaissements, trésorerie caisse/banque, budget de fonctionnement du B.E. (5% cotisations + 15% dons — Art. 80 R.I.). |
| **11. Sports et Loisirs** | `routes/sports.ts`, `pages/sports` | Calendrier d'activités, budget. |
| **13. Gestion documentaire** | `routes/documents.ts`, `pages/documents` | Archivage par catégorie (statuts, PV, rapports, courriers, décisions, contrats), upload de fichiers. |
| **12. Communication** | `routes/communications.ts`, `pages/communications` | Envois groupés SMS/WhatsApp/Email, journalisés même sans fournisseur configuré (voir limitations). |
| **Retraite complémentaire** | `routes/retraite-complementaire.ts`, `pages/retraite-complementaire` | Cotisation min. 2 500F par tranche, rachat partiel max 50% après 60 mois. |
| **Effectifs** | `routes/effectifs.ts`, `pages/effectifs` | Mouvements d'effectifs, alertes automatiques (enfant non déclaré après 15 jours — Art. 43 R.I. ; conjoint non déclaré ; membres défaillants), annuaire avec photos. |

---

## 4. Règles de gestion (délais de carence et montants) — état après correction

Tous les montants et délais sont paramétrables dans **Paramètres**, mais voici les valeurs par
défaut désormais alignées sur le règlement intérieur :

**Délais de carence (Art. 8 Statuts, Art. 46 R.I.)**
- Nouveau CDI, cas décès/mariage : **3 mois**
- Ancien CDI, cas décès/mariage : **10 mois**
- Cas retraite : **5 ans (60 mois)**
- Adhésion exceptionnelle (Décision n°05-2025) : **6 mois**
- Remplacement de nom d'ascendant/conjoint(e) : **1 an**
- Le décès du membre actif lui-même est **exempté** de carence (Art. 7.4 Statuts).

**Montants d'assistance (Art. 47-57 R.I.)**
- Décès conjoint(e) ou descendant(e) : **500 000 F**
- Décès ascendant(e) : **400 000 F**
- Décès beau-parent biologique : **200 000 F**
- Mort-né / né-mort : **150 000 F**
- Décès membre actif — funérailles : **300 000 F** ; ayants droit après funérailles : **1 200 000 F**
- Frais de mission du Bureau (funérailles) : **50 000 F** (Abidjan) / **100 000 F** (intérieur)
- Mariage : **100 000 F**
- Retraite (2 ans cotisés sans interruption) : **1 000 000 F**
- Licenciement (12 mois cotisés min., jamais assisté décès) : **2/3 des cotisations mensuelles**
- Prêt santé : plafond **500 000 F**, 20 mois max, différé 3 mois

**Indemnités de départ (Art. 98 R.I.)**
- Démission NPG.CI (par ricochet) sans assistance perçue : **1/4** du total des cotisations
- Démission de la seule mutuelle sans assistance perçue : **1/8** du total des cotisations
- Radiation : **aucun droit**, cotisations acquises à la mutuelle
- Blocage de toute démission avant **5 ans** si une assistance/adhésion exceptionnelle a été perçue

---

## 5. Démarrage

```bash
pnpm install

# Base de données
cp artifacts/api-server/.env.example artifacts/api-server/.env   # renseigner DATABASE_URL, JWT_SECRET...
pnpm --filter @workspace/db run push          # crée les 35 tables dans PostgreSQL

# Lancer l'API (terminal 1)
pnpm --filter @workspace/api-server run dev   # http://localhost:5000

# Lancer le web (terminal 2)
PORT=5001 BASE_PATH=/ pnpm --filter @workspace/mugetra run dev
```

L'app mobile (Expo) nécessite en plus `EXPO_PUBLIC_DOMAIN` (domaine public de l'API, sans le
`https://`) dans son environnement — voir `artifacts/mugetra-mobile/app/_layout.tsx`.

### Vérifications

```bash
pnpm run typecheck   # doit passer sans erreur sur les 3 apps
pnpm run build        # typecheck + build complet
```

---

## 6. Validations effectuées dans cet environnement de développement

- `pnpm install` : ✅ résolution complète du monorepo (1054 paquets)
- `pnpm run typecheck` : ✅ **0 erreur** sur `api-server`, `mugetra` (web) et `mugetra-mobile`
- `vite build` (web) : ✅ build de production généré (`dist/public`)
- `node build.mjs` (api-server, esbuild) : ✅ bundle de production généré (`dist/index.mjs`)
- `drizzle-kit generate` (lib/db) : ✅ migration SQL générée pour les 35 tables sans erreur

Aucune base de données réelle n'était disponible dans cet environnement : le schéma n'a donc pas
pu être testé avec de vraies données. Pensez à exécuter `pnpm --filter @workspace/db run push`
puis à tester les principaux parcours (adhésion, cotisation, demande d'assistance, prêt) avant
mise en production.

---

## 7. Limitations connues

- **Communication (SMS/WhatsApp/Email)** : sans `SMS_API_KEY` / `WHATSAPP_API_TOKEN` / `SMTP_HOST`
  configurés (voir `.env.example`), les messages sont journalisés avec le statut *"en attente de
  configuration"* mais ne sont pas réellement envoyés. Il faudra brancher un fournisseur réel
  (ex. Twilio, Orange SMS API, WhatsApp Business API, un SMTP) dans `routes/communications.ts`.
- **Documents** : les fichiers sont stockés localement sur le disque du serveur
  (`artifacts/api-server/uploads`), pas sur un service de stockage cloud. Pour la production,
  prévoir un stockage persistant (S3, Google Cloud Storage...).
- **App mobile** : seuls les écrans déjà présents (tableau de bord, membres, cotisations,
  assistances, annonces, connexion) ont été corrigés pour compiler. Les nouveaux modules
  (prêts, projets, gouvernance, etc.) n'ont pas d'écran mobile dédié dans ce lot — l'API les
  expose déjà, il ne reste qu'à créer les écrans Expo correspondants sur le même modèle que
  `app/(tabs)/assistances.tsx`.
- **Signature électronique** des documents (mentionnée au cahier des charges) : le champ existe
  en base (`documents.signeElectroniquement`) mais aucun fournisseur de signature n'est branché.
