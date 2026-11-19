# Déploiement de l'API MUGETRA sur Render (gratuit) + Neon

- Service : `mugetra-api` (Blueprint `render.yaml`, runtime Node, plan **free**).
- Santé : `GET /api/healthz`.
- Frontend : GitHub Pages (`deploy-web.yml`) avec la variable de dépôt `VITE_API_URL`
  = URL publique du service (ex. `https://mugetra-api.onrender.com`).

## Variables d'environnement

| Variable | Valeur |
|---|---|
| `NODE_ENV` | `production` |
| `JWT_SECRET` | générée par Render (obligatoire : le serveur refuse de démarrer sans elle en production) |
| `DATABASE_URL` | chaîne de connexion Neon de la base `mugetra` (`sslmode=require`) |
| `CORS_ORIGIN` | `https://trixma-ux.github.io` (liste séparée par des virgules) |
| `PORT` | fourni par Render |

## Schéma de base de données

Le schéma est géré par Drizzle (`lib/db`). Il est poussé automatiquement à chaque build Render
(`pnpm --filter @workspace/db run push`, sans `--force`). Pour le faire à la main :

```bash
DATABASE_URL="<url Neon>" pnpm --filter @workspace/db run push
```

Aucun compte n'est créé automatiquement : le premier administrateur doit être inséré
dans la table `users` (mot de passe haché avec bcrypt).

## ⚠️ Fichiers envoyés (uploads/) éphémères

Le plan gratuit de Render n'a **pas de disque persistant**. Les documents envoyés
(`uploads/documents/…`, servis sous `/uploads`) sont stockés sur le disque local de
l'instance et **disparaissent à chaque redéploiement, redémarrage ou mise en veille
prolongée**. Les métadonnées restent en base, mais les liens vers les fichiers casseront.

Solutions : disque Render (plan payant) ou stockage objet (S3, Cloudflare R2,
Supabase Storage…) à brancher à la place de `multer.diskStorage`.

## Mise en veille

L'instance gratuite s'endort après 15 min sans trafic. La première requête suivante
prend ~30 à 60 s (le frontend affiche alors « serveur injoignable » s'il expire).
