# CampusHub

Plateforme étudiante : livres d’occasion, covoiturage, groupes d’étude, événements de clubs et messagerie en direct.
Stack MERN (MongoDB, Express 5, React 19, Node 24) avec un microservice Python (Flask) pour l’estimation de prix et les recommandations.

Plan d’implémentation : [`docs/PLAN.md`](docs/PLAN.md) · visualisation : `visuals/plan-campushub-mern-1.html`.

## Prérequis

- Node **24.22+** (24.15 plante sous Windows avec `0xC0000409` au lancement de Vite/Vitest)
- Docker Desktop (MongoDB, service ML, Mailpit)
- Microsoft Edge (utilisé par Playwright, aucun navigateur à télécharger)

## Démarrage

```sh
npm install
cp server/.env.example server/.env   # puis changez JWT_SECRET
npm run dev                          # Docker + API + Vite
npm run seed                         # données de démonstration (additif, idempotent)
```

| Service | URL |
|---|---|
| Application | http://localhost:5173 |
| API | http://localhost:4000/api |
| Documentation API (Swagger) | http://localhost:4000/api/docs |
| Mailpit (e-mails de vérification) | http://localhost:8025 |
| Service ML | http://localhost:5001/health |

Au premier lancement, si l’API refuse de démarrer avec « MongoDB is not running as a replica set », lancez `npm run db:init`.

## Comptes de démonstration

Tous les comptes créés par `npm run seed` utilisent le mot de passe **`campus2026`**.

| Rôle | Compte |
|---|---|
| Administrateur | `admin@campus.tn` |
| Étudiante | `ines.ayari@campus.tn` |
| Responsable du Club Entrepreneuriat | `nour.hammami@campus.tn` |
| Responsable du Club Open Source | `skander.mejri@campus.tn` |

Le seed n’écrase jamais un compte existant : un compte créé avant lui garde son propre mot de passe.
`npm run seed -- --reset --yes` vide toute la base, y compris les vrais comptes (refusé en production).

Seules les adresses `@campus.tn` peuvent s’inscrire. Le lien de vérification arrive dans Mailpit.

## Scripts

| Commande | Rôle |
|---|---|
| `npm run dev` | Services Docker + API (watch) + client Vite |
| `npm run services` | Services Docker seuls |
| `npm run seed` | Données de démonstration |
| `npm test` | Tests API (Vitest + MongoDB en mémoire, replica set) |
| `npm run test:e2e` | Parcours Playwright + audit d’accessibilité (axe) en thème clair et sombre ; nécessite le seed |
| `npm run ml:test` | Tests pytest du service ML (dans le conteneur) |
| `npm run ml:train` | Réentraîne les modèles et redémarre le service ML |
| `npm run check:invariants` | Vérifie les compteurs dérivés (places, inscrits, membres) ; `-- --fix` les corrige |
| `npm run coords:backfill` | Ajoute les coordonnées de carte aux trajets de démonstration qui n’en ont pas |
| `npm run uploads:gc` | Liste les fichiers téléversés orphelins ; `-- --delete` les supprime |
| `npm run db:backup` | Sauvegarde `mongodump` dans `backups/` |
| `npm run db:restore -- backups/<fichier>` | Restaure une sauvegarde (demande confirmation, remplace les données) |

## Architecture

```
client/   React 19 · React Router · TanStack Query · Tailwind v4 + shadcn/ui · Recharts · socket.io-client
server/   Express 5 · Mongoose 9 · JWT en cookie httpOnly · Socket.io · node-cron · OpenAPI (openapi.yaml)
ml/       Flask · scikit-learn · notebook d’analyse (ml/notebooks/analyse.ipynb)
e2e/      Playwright
```

- **Concurrence** : réservations de trajets en transaction avec `$inc` conditionnel ; inscriptions aux événements et adhésions aux groupes par mise à jour conditionnelle atomique ; messages dédoublonnés par `clientId`.
- **Temps réel** : messages, accusés de lecture et notifications via Socket.io ; une session révoquée (`jetonVersion`) coupe aussi le socket. Les groupes d'étude ont leur propre discussion et peuvent ouvrir une visioconférence réservée aux membres.
- **Rappels** : un job toutes les 15 min clôt les trajets passés et envoie les rappels d’événements (envoi unique garanti par `cleDedup`).
- **Heure** : toutes les dates sont affichées et saisies à l’heure de Tunis (UTC+1).
- **Carte** : covoiturage sur Leaflet/OpenStreetMap ; recherche d’adresses via un proxy Nominatim côté API (cache 7 jours, 1 requête/seconde), coordonnées facultatives stockées avec le trajet.

## Modèles ML

Entraînés d’abord sur des données synthétiques, puis complétés par les annonces réelles à chaque `npm run ml:train`.

| Modèle | Métrique | Référence |
|---|---|---|
| Prix (Random Forest, fourchette = percentiles 25–75 des arbres) | MAE 1,77 DT | Régression linéaire 2,29 · moyenne 7,65 |
| Recommandations (TF-IDF) | precision@5 0,891 | Popularité 0,139 |

Si le service ML ne répond pas en 1,5 s, l’API bascule sur une estimation heuristique : l’application reste utilisable.

## En cas de problème

| Symptôme | Cause probable | Action |
|---|---|---|
| L’API s’arrête : « MongoDB is not running as a replica set » | Replica set non initialisé | `npm run db:init`, puis relancer `npm run dev` |
| Aucun e-mail de vérification | Mailpit arrêté | `npm run services`, puis vérifier http://localhost:8025 |
| « Prix conseillé » approximatif, logs `ml_fallback` | Service ML arrêté ou lent | `docker compose ps ml`, `docker compose logs ml`, `docker compose restart ml` |
| Places ou nombre d’inscrits incohérents | Compteur dérivé désynchronisé | `npm run check:invariants`, puis `-- --fix` |
| Messages non reçus en direct | Socket déconnecté (proxy Vite, session révoquée) | Recharger la page ; les messages non envoyés sont renvoyés automatiquement |
| Rappels d’événements non envoyés | Planificateur arrêté avec l’API | Relancer l’API : le job rattrape au passage suivant les rappels non envoyés des événements encore à venir |
| « Trop de tentatives » à la connexion | Limiteur de débit (IP + e-mail) | Attendre 15 min ou redémarrer l’API en développement |
| Disque rempli par `server/uploads` | Fichiers orphelins | `npm run uploads:gc -- --delete` |
| Données corrompues | — | `npm run db:restore -- backups/<dernière sauvegarde>` |
| Vite ou Vitest plante avec `0xC0000409` | Bug de Node 24.15 sous Windows | Mettre à jour Node (`winget upgrade OpenJS.NodeJS.LTS`) |

## Hors périmètre

L’application mobile (React Native) est prévue pour une phase suivante ; l’interface web est responsive.
