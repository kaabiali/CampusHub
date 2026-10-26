# Implementation Plan: CampusHub MERN

**Visualization**: `visuals/plan-campushub-mern-1.html` (approved 2026-10-26)
**Decisions**: `visuals/plan-campushub-mern-1-decisions.json`
**Sources**: `Cahier_des_charges_CampusHub_MERN.docx`, `CampusHub_UML/00_diagramme_classes.puml` + use-case diagrams, `CampusHub_Maquette/` (10 HTML pages)

## Phase 0 — Scope Lock

**In scope**
- React SPA (Vite, JS) reproducing and upgrading the 10 mockup screens: public landing, auth, dashboard, books, rides, groups, events, messaging, admin, profile.
- Express REST API + Socket.io, MongoDB (Mongoose), Flask ML micro-service.
- Auth: signup restricted to `@campus.tn`, **mandatory email verification (Q2)**, login (JWT), forgot/reset password, profile + photo, password change.
- Books: publish (0..5 photos), edit, delete, mark sold, search/filter (category, subject, condition, max price), contact seller, report, ML price suggestion.
- Rides: publish, edit, cancel, search, reserve seats, cancel reservation, rate driver after the ride.
- Study groups: create, join, leave, manage members, schedule sessions, share/download PDFs, recommendations.
- Events: **only club leaders designated by the admin publish for their club (Q3)**; students register/unregister with capacity; reminder the day before (in-app + email).
- Messaging: 1-to-1 real-time, unread counts, read receipts; notifications (RESERVATION, MESSAGE, RAPPEL_EVENEMENT).
- Admin: users (list, block/unblock, delete), categories CRUD, clubs + leaders, reports moderation, analytics dashboard with period filter.
- ML: price regression (linear baseline → Random Forest) and TF-IDF content recommendations, each evaluated against a baseline; **analysis notebook (Q4)**.
- Swagger docs, seed data, tests (API, ML, E2E smoke), backup script, README runbook.

**Out of scope (this build)**
- React Native / Expo app — **next phase (Q1)**; API accepts `Authorization: Bearer` so it plugs in unchanged.
- Online deployment — **local only (Q5)**; config is env-driven and Atlas-compatible.
- Real email delivery (Mailpit catches all mail locally), payments, maps/routing, group chat, Streamlit app.

**Hard constraints**
- JavaScript for web + API; Python only for ML.
- API p95 < 1 s on main pages (spec §3); paginated lists (max 50).
- Windows 11 dev box, 16 GB RAM, Node 24, Docker 29. French UI and error messages.
- Security items named by the spec: bcrypt, JWT (jsonwebtoken), express-validator, helmet, rate limiting, roles.

**Stakeholders**
- Kaabi Ali — developer, owns scope decisions.
- Course jury / supervisor — validates against the spec (§7: priority features working, ML beats baseline, no obvious security hole).

## Phase 1 — Requirements Decomposition

| Requirement | Why | What breaks if wrong |
|---|---|---|
| F1 Signup only with verified `@campus.tn` | Spec §1.3 + UML "Vérifier l'e-mail" | Outsiders join; recommendations trained on noise |
| F2 Seat reservation never exceeds `placesTotales` | Core promise of carpooling | Two passengers show up for one seat |
| F3 Event registration respects `capacite` | Spec use case "Vérifier la capacité" | Overfull rooms |
| F4 Only club leaders publish for their club | Q3 | Fake "Club IEEE" events |
| F5 Messages delivered once, in order, live | Spec §2 messaging | Lost or duplicated messages after reconnect |
| F6 Reminder sent once per registration, ~24 h before | Spec §2 events | Spam or missed reminders |
| F7 Price suggestion always available | Publish flow depends on it | Publish form blocked when ML is down |
| F8 Admin moderation hides content everywhere | Spec §2 admin | Removed listing still visible in search |
| F9 Blocked users cannot act | Spec admin use case | Moderation is cosmetic |
| D1 Mongo is the single source of truth | Simplicity | Divergent copies |
| D2 Derived counters (`placesDisponibles`, `nbInscrits`, `noteMoyenne`) are recomputable | Detect/repair drift | Silent wrong numbers in the demo |
| C1 Reservations and registrations: strong consistency (transaction) | F2/F3 | Overbooking |
| C2 Notifications, unread badges, dashboard stats: eventual (seconds) | Not safety-critical | — |
| L1 List endpoints p95 < 300 ms on seed volume; < 1 s ceiling | Spec §3 | Sluggish demo |
| L2 ML call timeout 1.5 s, then fallback | F7 | Hung publish form |
| R1 Backup: `npm run db:backup` (mongodump), RPO = last manual backup | Spec §3 reliability | Lost demo data |

## Phase 2 — Research & Option Space

Prior choices are fixed by the spec where it names a technology (MongoDB, Express, React+Vite, Tailwind, Flask, scikit-learn, express-validator, helmet, Swagger, bcrypt, JWT). Open choices and alternatives considered:

- **Client data layer**: TanStack Query + Context / Redux Toolkit + RTK Query / plain fetch in effects. Plain fetch fails on cache coherence and optimistic rollback; RTK works but adds slices and boilerplate for the same cache behavior.
- **Token storage**: httpOnly cookie / localStorage bearer / server sessions. localStorage fails under XSS; sessions need a store and fit mobile poorly.
- **Overbooking guard**: transaction + conditional decrement / conditional decrement + compensation / read-then-write. Read-then-write races; compensation leaves drift if the process dies between steps.
- **Realtime**: Socket.io / SSE / polling. SSE is one-way; polling shows visible lag and wastes requests.
- **Email in dev**: Mailpit / Ethereal / console. Console can't demo a clickable link; Ethereal requires network + account.
- **Scheduler**: node-cron in-process / BullMQ (Redis) / Agenda. BullMQ adds a service for two jobs; Agenda is unmaintained.
- **Uploads**: multer to disk / GridFS / Cloudinary. GridFS complicates image serving; Cloudinary needs external secrets.
- **ML runtime**: Docker python:3.12 / native Python 3.14. Unknown — scikit-learn wheel availability for 3.14 on Windows; Docker removes the question.
- **API docs**: hand-written `openapi.yaml` + swagger-ui-express / swagger-jsdoc comments. Comments scatter the contract across route files.
- **UI kit**: shadcn/ui on Tailwind v4 / MUI / hand-rolled CSS. MUI looks generic and fights the mockup's tokens; hand-rolled dialogs/menus lose accessibility.

## Phase 3 — Decision Matrix

Scores 1–5 on correctness (Co), failure behavior (Fb), operational complexity (Op, higher = simpler), ecosystem maturity (Ec), cognitive load (Cl, higher = lighter).

| # | Decision | Chosen | Co | Fb | Op | Ec | Cl | Rejected | Dominant factor |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Database | MongoDB 8 + Mongoose 8 | 4 | 4 | 4 | 5 | 4 | Postgres, SQLite | Fixed by spec |
| 2 | Front-end | React 19 + Vite + React Router 7 | 5 | 4 | 5 | 5 | 4 | Next.js, CRA | Fixed by spec; no SSR need |
| 3 | UI system | Tailwind v4 + shadcn/ui (JS), mockup tokens as CSS variables | 5 | 4 | 4 | 5 | 4 | MUI, hand-rolled | Accessible primitives matching the mockup |
| 4 | Client state | TanStack Query + Axios + Context | 5 | 5 | 4 | 5 | 4 | RTK Query, fetch | Built-in optimistic rollback (approved) |
| 5 | Auth | JWT in httpOnly SameSite=Lax cookie, Bearer also accepted; bcrypt 12 | 4 | 4 | 5 | 5 | 4 | localStorage, sessions, refresh rotation | XSS-safe without refresh machinery |
| 6 | Hardening | express-validator + helmet + express-rate-limit | 4 | 4 | 5 | 5 | 5 | zod, Joi | Named by spec |
| 7 | Overbooking | Single-node replica set + transaction + conditional `$inc` | 5 | 5 | 3 | 5 | 4 | compensation, read-then-write | Atomic all-or-nothing (approved) |
| 8 | ML | Flask + scikit-learn in Docker (python:3.12) | 4 | 4 | 3 | 5 | 4 | Node heuristics, FastAPI, TF.js | Spec + isolates Python version risk |
| 9 | Realtime | Socket.io, room per user, ack + clientId | 4 | 4 | 4 | 5 | 4 | polling, SSE | Bi-directional with reconnect |
| 10 | Email | nodemailer → Mailpit | 5 | 4 | 5 | 5 | 5 | real SMTP, console | Demo-able links, no secrets |
| 11 | Jobs | node-cron in API process | 4 | 4 | 5 | 4 | 5 | BullMQ, Agenda | No extra infra |
| 12 | Files | multer to local disk | 4 | 3 | 5 | 5 | 5 | GridFS, Cloudinary | Zero infra |
| 13 | API docs | `openapi.yaml` + swagger-ui-express | 4 | 4 | 4 | 5 | 4 | swagger-jsdoc, Postman only | One contract file |
| 14 | Tests | Vitest + supertest + mongodb-memory-server (replset), pytest, Playwright | 5 | 4 | 4 | 5 | 4 | Jest, Cypress | Each test maps to a failure |
| 15 | Clubs (Q3) | `Club {nom, responsables[]}`; publish allowed if user ∈ responsables or admin | 5 | 4 | 4 | — | 4 | free-text club, admin approval queue | Prevents impersonation without a new role |

## Phase 4 — Confidence & Risk Accounting

| # | Confidence | Primary uncertainty | Worst case | Reversibility |
|---|---|---|---|---|
| 1 | 0.90 | none material | — | HARD |
| 2 | 0.90 | none material | — | HARD |
| 3 | 0.85 | shadcn CLI in JS mode + Tailwind v4 on Windows | manual component copy | EASY |
| 4 | 0.80 | jury expecting Redux | must justify in defense (spec allows Context) | EASY |
| 5 | 0.80 | cookie behavior through Vite proxy | auth loops in dev | EASY |
| 6 | 0.90 | — | — | EASY |
| 7 | 0.85 | replica set init after `docker compose down -v` | transactions fail → bookings error | EASY |
| 8 | **0.70** | synthetic data makes RF only marginally better than linear | metrics weak in report | EASY |
| 9 | 0.80 | proxying WS through Vite on Windows | live updates fall back to refetch | EASY |
| 10 | 0.90 | — | — | EASY |
| 11 | 0.85 | cron runs twice if two API processes start | duplicate reminders | EASY |
| 12 | 0.80 | orphan files on deletes | disk clutter | EASY |
| 13 | 0.80 | spec drift vs routes | stale docs | EASY |
| 14 | 0.85 | mongodb-memory-server binary download on first run | slow first test run | EASY |
| 15 | 0.85 | admin UX for assigning leaders | extra screen | EASY |

**Mitigations (confidence ≤ 0.70 or high-impact):**
- #8: generator encodes realistic structure (condition coefficient, age decay, subject premium, noise) so RF has non-linear signal to learn; `metrics.json` reports MAE/RMSE for mean baseline, linear, RF; UI labels the value "estimation"; fallback heuristic if ML is down. Pytest fails the build if RF does not beat the mean baseline.
- #7: `npm run db:init` idempotently runs `rs.initiate`; compose healthcheck waits for PRIMARY; API startup logs a clear error if not a replica set.
- #11: reminder idempotency does not depend on single-process: atomic `findOneAndUpdate({rappelEnvoye:false}→true)` plus unique `cleDedup`.
- #5/#9: same-origin via Vite proxy (`/api`, `/socket.io` with `ws: true`); verified at checkpoint S2/S8.

No decision is IRREVERSIBLE; the two HARD ones (#1, #2) are mandated by the spec.

## Phase 5 — System Design (End-to-End)

**Processes**: `client` (Vite :5173) → proxy → `server` (Express :4000, Socket.io, node-cron) → MongoDB (:27017, rs0) / `ml` (Flask :5001) / Mailpit (SMTP :1025, UI :8025). Uploads on disk under `server/uploads`.

**Entities (source of truth: MongoDB)**
- `utilisateurs` {nom, prenom, email unique, motDePasseHache, role ETUDIANT|ADMIN, filiere, niveau, matieres[], centresInteret[], photoUrl, emailVerifie, estBloque, estSupprime, noteMoyenne, nbAvis, jetonVersion}
- `categories` {nom unique, description}
- `clubs` {nom unique, description, responsables[userId]}
- `annonces` {vendeur, categorie, titre, auteur, matiere, etat NEUF|TRES_BON|BON|ACCEPTABLE, anneeEdition, prixNeuf, prix, prixConseille{min,max,source}, photos[{url,ordre}] ≤5, statut DISPONIBLE|VENDUE|MASQUEE, vues}
- `trajets` {conducteur, lieuDepart, lieuArrivee, dateDepart, placesTotales, placesDisponibles, prix, vehicule, statut OUVERT|COMPLET|ANNULE|TERMINE}
- `reservations` {trajet, passager, nbPlaces, statut CONFIRMEE|ANNULEE} — partial unique (trajet, passager) where CONFIRMEE
- `avis` {reservation unique, auteur, conducteur, note 1..5, commentaire}
- `groupes` {nom, matiere, description, createur, capaciteMax, membres[{utilisateur, role CREATEUR|MEMBRE, dateAdhesion}], seances[{date, duree, lieu, sujet}], documents[{nomFichier, url, taille, deposePar, dateDepot}]}
- `evenements` {organisateur, club, titre, description, lieu, dateDebut, dateFin, capacite|null, nbInscrits, estPublic, statut PUBLIE|ANNULE}
- `inscriptions` {evenement, utilisateur, rappelEnvoye} — unique (evenement, utilisateur)
- `messages` {expediteur, destinataire, cleConversation, contenu ≤2000, clientId, contexte{type, ref}, lu} — unique (expediteur, clientId)
- `notifications` {utilisateur, type, contenu, lien, cleDedup unique sparse, lue}
- `signalements` {typeContenu ANNONCE|TRAJET|EVENEMENT|MESSAGE, contenuId, motif, signalePar, statut EN_ATTENTE|TRAITE|REJETE, traitePar, dateTraitement}
- `activites` {utilisateur, jour} unique — daily active users

**Write paths**
- Reserve: transaction { `trajets.findOneAndUpdate({_id, statut:'OUVERT', placesDisponibles:{$gte:n}, conducteur:{$ne:me}}, {$inc:{placesDisponibles:-n}})`; insert reservation; if `placesDisponibles==0` set COMPLET } → notification to driver (after commit). Errors: 409 `TRAJET_COMPLET` / `DEJA_RESERVE`.
- Cancel reservation: transaction { reservation CONFIRMEE→ANNULEE; `$inc +n`; COMPLET→OUVERT }.
- Register event: transaction { `evenements.findOneAndUpdate({_id, statut:'PUBLIE', $or:[{capacite:null},{$expr:{$lt:['$nbInscrits','$capacite']}}]}, {$inc:{nbInscrits:1}})`; insert inscription }.
- Send message: socket `message:send` → validate → insert (dedupe on clientId: duplicate-key → return existing) → emit `message:new` to `user:<dest>` and ack sender → upsert notification.
- Rate driver: only passenger with CONFIRMEE reservation on TERMINE ride, within 7 days; unique per reservation; recompute driver `noteMoyenne` via aggregation.
- Moderation "supprimer": target status → MASQUEE / ANNULE / message contenu redacted; report → TRAITE.
- Block user: `estBloque=true`, `jetonVersion++` (invalidates live JWTs), socket disconnect.

**Idempotency keys**
- Reservation: (trajet, passager) partial unique. Inscription: (evenement, utilisateur). Avis: reservation. Message: (expediteur, clientId). Reminder: `cleDedup = rappel:<inscriptionId>` + atomic `rappelEnvoye`. Activity: (utilisateur, jour).

**Read paths**
- All lists paginated (`page`, `limit ≤ 50`), filtered server-side with indexes; masked/blocked/deleted content excluded at query level.
- TanStack Query cache: lists stale after 30 s, invalidated on mutations; socket events update caches directly.
- Recommendations cached per user for 10 min in memory (Node), invalidated on profile change.

**Time handling**
- Stored UTC; displayed `Africa/Tunis` via `Intl.DateTimeFormat('fr-TN', {timeZone:'Africa/Tunis'})`. Reminder window computed in UTC: `dateDebut ∈ (now, now+24h]`. Ride end = `dateDepart + 3 h` for TERMINE transition. Daily activity buckets use the Tunis calendar day.

**Auth details**
- JWT payload {sub, role, v: jetonVersion}, 7 days, cookie `campushub_token` httpOnly SameSite=Lax (Secure in production). Middleware rejects blocked/deleted/version-mismatch. Unverified users: only `/auth/moi`, `/auth/renvoyer-verification`, `/auth/deconnexion` allowed (403 `EMAIL_NON_VERIFIE`), client shows the "check your inbox" screen.
- Email tokens: 32 random bytes, stored as sha256 hash, 1 h TTL (verification 24 h), single use.

## Phase 6 — Failure & Recovery Strategy

| Subsystem | Failure | Detection | Auto | Manual steps | Replay |
|---|---|---|---|---|---|
| MongoDB | down / no primary | `/api/health` 503, log `db_disconnected` | yes (Mongoose reconnect) | `docker compose up -d mongo`; `npm run db:init` if rs missing | client refetch |
| Reservations | concurrent last seat | 409 rate; `check:invariants` | yes | `npm run check:invariants -- --fix` | transaction all-or-nothing |
| Registrations | capacity overflow | invariants script | yes | same | unique index |
| ML | down/slow/no model | log `ml_fallback`, health counter | yes (fallback) | `docker compose restart ml`; `npm run ml:train` | none needed |
| Messaging | socket drop mid-send | `disconnect`, pending bubble | yes | "Réessayer" on bubble | resend by clientId, deduped |
| Reminders | crash / double run | log `reminders_sent=n` | yes | none (next tick catches up) | atomic flag + cleDedup |
| Email | Mailpit down | log `mail_failed` | no | restart Mailpit; user clicks "Renvoyer" | new token invalidates old |
| Uploads | wrong type / too big / orphans | 413/415 | yes | `npm run uploads:gc` | user re-uploads |
| Auth | expired / blocked / brute force | 401/403/429 | yes | admin unblocks; rotate `JWT_SECRET` to kill all sessions | redirect `/connexion?retour=` |
| Seed | partial/corrupt | invariants script | no | `npm run seed -- --reset` (refuses when NODE_ENV=production) | deterministic seed (fixed RNG) |

**Data correction**: `check:invariants` recomputes `placesDisponibles`, trajet `statut`, `nbInscrits`, `noteMoyenne/nbAvis`; prints diffs; `--fix` writes corrections. Exit code 1 on drift.

## Phase 7 — Implementation Sequence

Each step ends with tests green + commit tagged `step-N` (rollback boundary: `git checkout step-(N-1)`).

| Step | Content | Depends on | Checkpoint / kill-switch |
|---|---|---|---|
| S0 | Monorepo (npm workspaces: client, server; ml separate), docker-compose (mongo rs0 + healthcheck, ml, mailpit), `.env.example`, `npm run dev` (concurrently), `/api/health` | — | **Checkpoint**: health 200, blank SPA via proxy |
| S1 | Server core: config, pino logs, error envelope, validation helpers, auth (signup/verify/login/logout/forgot/reset/me), profile + photo, rate limit, helmet; tests | S0 | tests green |
| S2 | Client shell: Tailwind v4 + shadcn, tokens from mockup, light/dark, app layout (sidebar, mobile drawer, topbar), Ctrl+K palette, landing page, auth screens, verify-email screen, profile | S1 | **Checkpoint**: signup → Mailpit link → dashboard |
| S3 | Categories (admin seed), books API + UI: list/filters/pagination, detail, publish dialog with photos, edit, sold, delete, report | S2 | tests green |
| S4 | ML service: synthetic generator, train (mean/linear/RF), metrics.json, `/price`, Node client with timeout + fallback, publish form integration | S3 | **Kill-switch**: if blocked, ship fallback only |
| S5 | Rides: search/publish/edit/cancel, reserve (transaction), cancel reservation, driver ratings, cron TERMINE | S2 | **Checkpoint**: concurrency test green |
| S6 | Groups: create/join/leave, members management, sessions, PDF upload/download | S2 | tests green |
| S7 | Clubs (admin), events: publish by leaders, register with capacity, unregister, attendee list, reminder cron + email | S2 | tests green |
| S8 | Messaging: Socket.io auth, send/ack/dedupe, conversations, unread, typing, read; notifications live + bell | S5–S7 | live test across two browsers |
| S9 | Recommendations: `/recommend` TF-IDF, precision@k vs popularity, dashboard + groups + events integration; notebook | S4, S6, S7 | **Kill-switch**: popularity fallback |
| S10 | Admin: stats (active users/day, top subjects, frequent routes, activity peaks, period filter), users, categories, clubs, moderation | S3–S8 | tests green |
| S11 | Seed (realistic French data), invariants, backup, uploads gc, Swagger, Playwright smoke, a11y/dark/responsive polish, README | all | **Checkpoint**: full demo script passes |

## Phase 8 — Testing & Validation Strategy

- **Invariant tests**: after random reserve/cancel sequences, `placesDisponibles == placesTotales − Σ CONFIRMEE nbPlaces`; `nbInscrits == count(inscriptions)`; `noteMoyenne == avg(avis.note)`. Prevents counter drift.
- **Concurrency tests**: 10 parallel reservations on a 3-seat ride → exactly 3 succeed, 7 get 409. 2 parallel registrations on last spot → 1 succeeds. Same user double-click → 1 reservation. Prevents overbooking.
- **Replay tests**: same `clientId` sent twice → one message; reminder job run twice → one notification per registration; seed run twice → same counts.
- **Permission tests**: non-owner edit → 403; unverified → 403 `EMAIL_NON_VERIFIE`; blocked → 403; non-leader publish event → 403; non-admin on `/admin/*` → 403; masked content absent from lists.
- **Auth tests**: non-campus email rejected; token reuse rejected; expired token rejected; password policy (≥8 chars, one digit).
- **ML tests (pytest)**: RF MAE < mean-baseline MAE; precision@5 > popularity baseline; `/price` responds < 200 ms.
- **E2E (Playwright)**: signup → verify via Mailpit API → publish book → second user reserves ride → messages driver → driver sees live message.
- **UI trust**: optimistic toggles roll back with a toast on 409; skeletons match final layout (no CLS); keyboard: Ctrl+K, Esc, arrow keys in conversation list.
- **Migration tests**: N/A (no prior production data); seed `--reset` is the schema reset path.

## Phase 9 — Production Readiness Checklist (local demo)

- **Correctness metrics**: `/api/health` (db, ml, smtp, `mlFallbackCount`, uptime); `npm run check:invariants` exit code.
- **Corruption alerts**: invariants script exits 1 and prints offending ids; API logs `invariant_violation` if a transaction commits a negative `placesDisponibles` (guarded by schema `min: 0`).
- **Dashboards**: in-app `/admin` (active users/day, top subjects, frequent routes, activity peaks); `ml/metrics.json` + notebook for ML quality.
- **Runbooks**: README "En cas de problème" section — one entry per row of Phase 6, with exact commands.
- **Rollback criteria**: any red test or invariant drift after a step → `git checkout step-(N-1)`; ML regression below baseline → keep previous `model.joblib`.
- **Backups**: `npm run db:backup` → timestamped `backups/` (mongodump in container).

---

## Overall Plan Scorecard
- **Overall confidence**: 8 / 10
- **Highest-risk assumption**: synthetic data lets Random Forest beat the linear and mean baselines by a margin worth reporting.
- **Most irreversible decision**: the data model shape (separate vs embedded collections), fixed at S1–S3.
- **Expected bug class if wrong**: derived counters out of sync (seats, registrations, unread counts, ratings).
- **What would most likely cause a production incident**: replica set not initialized after a volume wipe → every reservation fails; `npm run db:init` + startup check catch it.
