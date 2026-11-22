# BACK2CAMPUS

**Bring the memories back. Reconnect the people.**
A multi-tenant reunion planning platform by **KALKITEC**, launching in Visakhapatnam.

This branch (`back2campus-frontend`) holds the front end and the Phase 1 backend: accounts, reunions, invitations, voting, budget, food, tasks, members and announcements, stored in PostgreSQL with tenant isolation enforced by the database. The Meetho Mohan page stays on `main`, unchanged.

## How it runs

- **With `DATABASE_URL`:** the server runs migrations on start, then serves the API (`/api`) and the app. Everything is real and shared between users.
- **Without `DATABASE_URL`:** the server serves the app only, and the app switches to **demo mode** with sample data kept in the browser.

## Technology

| Layer | Choice |
|---|---|
| Front end | React 19 + TypeScript + Vite, Tailwind CSS v4, React Router 7, installable PWA |
| API | Node.js 22 + Express, Zod validation, Helmet security headers, rate limiting |
| Database | PostgreSQL (your existing Render/Neon database), plain SQL migrations |
| Auth | Email + password (bcrypt) and Google sign-in (ID token verified on the server); sessions in an httpOnly cookie, stored hashed |
| Tenant isolation | API membership checks **and** PostgreSQL Row Level Security (forced) |
| Next phases | Razorpay (server-verified + webhooks), S3-compatible storage (Contabo Object Storage / R2), Google Places |
| Hosting | Render now; Dockerfile for a Contabo VPS |

## Tenant isolation

Every reunion is a tenant. Its data rows carry `reunion_id`, and isolation is enforced twice:

1. **API:** each `/api/reunions/:id/...` request first checks that the signed-in user is an *active* member. If not, the answer is `404 Reunion not found`, the same answer as for a reunion that doesn't exist, so IDs can't be probed. Organizer-only actions answer `403` to participants.
2. **Database:** Row Level Security is enabled and **forced** on `reunions`, `date_options`, `date_votes`, `venues`, `venue_votes`, `budget_items`, `tasks`, `announcements`, `payments` and `audit_log`. The API runs each request in a transaction with `app.user_id` set, and the policies only expose rows of reunions where that user is an active member. A query run without a user context sees **nothing** (fail closed).
   - `memberships` itself is filtered by the API only, because a policy on it would have to read it again.
   - Invite previews, joining and super-admin stats use an explicit system context.

`test/api.test.js` proves both layers. A second user changes reunion, date and member IDs in URLs (read, vote, finalise, budget, settings, invite reset, remove member) and always gets 404. The same tests run raw SQL as that user and as no user and see nothing.

Run it:

```bash
scripts/local-db.sh start                # local PostgreSQL 16 with a non-superuser owner, like Render
TEST_DATABASE_URL=postgres://b2c:b2c@localhost:54329/b2c_test npm test
```

The tests also cover registration and login errors, the join-with-approval flow, participant vs organizer permissions, invite link reset, the audit log, cross-site request blocking and logout.

## Database schema (`server/migrations/001_init.sql`)

| Table | What it holds |
|---|---|
| `countries`, `states`, `cities` | Location model. Visakhapatnam is live; Vijayawada and Hyderabad are seeded as planned. |
| `users`, `sessions` | Accounts and hashed session tokens |
| `reunions` | One row per tenant workspace: code, invite token, details, final date/venue, payers, spent, contribution |
| `memberships` | User ↔ reunion: role (`organizer` / `co_organizer` / `participant`), `active`/`pending`, attendance, food preference, check-in |
| `date_options`, `date_votes` | Date poll |
| `venues`, `venue_votes` | Venue suggestions and votes (one vote per member) |
| `budget_items` | Estimates per category |
| `tasks`, `announcements` | Responsibilities and announcements |
| `payments` | Ready for Razorpay (Phase 3) |
| `audit_log` | Organizer actions: create, settings, approve/reject/remove, role changes, finalise, invite reset |

Migrations run automatically when the server starts (`npm start`), or manually with `npm run migrate`. They are tracked in `b2c_migrations`, and the table names don't clash with the old Meetho Mohan app.

## API

All endpoints are under `/api`, take and return JSON, and are authenticated by the session cookie.

| Method & path | Who | What |
|---|---|---|
| `GET /health`, `GET /config` | anyone | Database status; Google client ID |
| `POST /auth/register`, `/auth/login`, `/auth/google`, `/auth/logout` | anyone | Accounts and sessions (rate-limited) |
| `GET /me`, `PATCH /me` | signed in | Profile |
| `GET /reunions`, `POST /reunions` | signed in | My reunions (+ pending requests); create (optionally reusing a previous reunion's members) |
| `GET /reunions/:id` | member | Full workspace |
| `PATCH /reunions/:id/settings`, `POST …/invite/reset` | organizers | Approval setting, payers, spent, contribution; new invite link |
| `PUT …/attendance`, `PUT …/food` | member | My attendance, food preference, diet |
| `POST …/announcements` | organizers | Post an announcement |
| `POST …/dates`, `PUT …/dates/:dateId/vote`, `PUT …/final-date` | member / organizers | Suggest dates, vote, finalise |
| `POST …/venues`, `PUT …/venue-vote`, `PUT …/final-venue` | member / organizers | Suggest venues, vote, finalise |
| `PUT …/budget/:key` | organizers | Budget estimates |
| `POST …/tasks`, `PATCH …/tasks/:taskId` | organizers / assignee | Create; volunteer; change status |
| `PATCH …/members/:userId`, `DELETE …/members/:userId` | organizers | Approve, reject, co-organizer role (main organizer only), remove |
| `POST …/checkins/:userId` | organizers | Event-day check-in |
| `GET /invites/:token`, `POST /invites/:token/join` | anyone / signed in | Invitation preview; join or request to join |
| `GET /admin/stats` | super admin | Platform numbers |

## Deploy on Render

1. Render → **New → Web Service** → this repository, branch **`back2campus-frontend`**. You can also use **New → Blueprint**, which reads `render.yaml`.
2. Build command `npm ci --include=dev && npm run build`, start command `npm start`, health check `/healthz`.
3. Environment variables:
   - `NODE_VERSION=22`
   - `NODE_ENV=production`
   - `DATABASE_URL`: copy it from your existing database. On Render that's the **Internal Database URL**, if the database is in the same region.
   - `GOOGLE_CLIENT_ID`: optional, see below.
4. Deploy. The first start creates the tables. Check `https://<your-service>.onrender.com/api/health` → `{"ok":true,"database":true}`.
5. Make yourself platform admin: sign up in the app, then open the service's **Shell** in Render and run `node server/make-admin.js you@example.com`.

Create it as a **new** service. If you point the existing `reunion-vote` service at this branch, it will replace the Meetho Mohan page. Sharing the database with that service is fine: its only database action is dropping its own old `app_state` table.

### Google sign-in (optional)

1. Google Cloud Console → **APIs & Services → Credentials → Create credentials → OAuth client ID**, type **Web application**.
2. Under **Authorised JavaScript origins**, add your Render URL (and `http://localhost:3000` for local testing).
3. Put the client ID in `GOOGLE_CLIENT_ID` on Render. No client secret is needed: the server verifies Google's signed ID token.

## Deploy on a Contabo VPS (Docker)

```bash
docker build -t back2campus .
docker run -d --name back2campus -p 3000:3000 --restart unless-stopped \
  -e NODE_ENV=production -e DATABASE_URL=postgres://... -e GOOGLE_CLIENT_ID=... back2campus
```

Put Caddy or Nginx in front for HTTPS. The session cookie is `Secure` in production, so the site must be served over HTTPS.

## Run locally

```bash
npm install
scripts/local-db.sh start               # or use any Postgres
DATABASE_URL=postgres://b2c:b2c@localhost:54329/b2c npm run build && DATABASE_URL=postgres://b2c:b2c@localhost:54329/b2c npm start
# http://localhost:3000
npm run dev                             # front-end only dev server (demo mode), http://localhost:5173
```

## Photos

Real photos are used under the [Unsplash License](https://unsplash.com/license) and the [Pexels License](https://www.pexels.com/license/), loaded from their CDNs and credited on `/credits`. Venue and caterer cards in demo mode are **DEMO placeholders**: no invented prices or contact details.

## Project structure

```
server/
  index.js               Start: migrate, then serve
  app.js                 Express app: security headers, rate limits, API, static front end
  lib/db.js              Pool, migrations, withUser() / withSystem() transactions
  lib/auth.js            Sessions, passwords, Google token check, same-origin guard
  lib/serialize.js       Builds the workspace object for one user (RLS-scoped)
  routes/auth.js         Sign-up, sign-in, Google, profile
  routes/reunions.js     Reunions, invites, voting, budget, tasks, members, admin
  migrations/*.sql       Schema + Row Level Security
  make-admin.js          Grant platform admin
test/api.test.js         Isolation and permission tests (real PostgreSQL)
scripts/local-db.sh      Throwaway local PostgreSQL
src/                     React app (pages, components, store with API + demo modes)
```

## Still to come

- **Phase 2:** vendor directory with real submissions and admin verification, travel providers, Google Places venue search, comments on tasks, notifications.
- **Phase 3:** Razorpay orders, checkout, server-side signature verification and webhooks, receipts, reminders; camera QR check-in.
- **Phase 4:** uploads to object storage with size limits, albums, member tagging, privacy enforcement on the server.
- **Phase 5:** subscriptions, vendor promotions, commissions, city expansion, analytics.
