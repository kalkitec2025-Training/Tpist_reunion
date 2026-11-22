# BACK2CAMPUS

**Bring the memories back. Reconnect the people.**
A multi-tenant reunion planning platform by **KALKITEC**, launching in Visakhapatnam.

This branch (`back2campus-frontend`) contains the complete, working **front end**. It runs in *demo mode* (sample data saved in the browser) until the API is added in the next step. The Meetho Mohan page stays on `main`, unchanged.

## Technology

| Layer | Choice | Why |
|---|---|---|
| Front end | React 19 + TypeScript + Vite | Fast builds, typed code, large ecosystem |
| Styling | Tailwind CSS v4 | Design tokens for the navy/orange brand, mobile-first utilities |
| Routing | React Router 7 | One app for landing, workspace, vendor and admin |
| PWA | vite-plugin-pwa | Installable on phones, photo caching, offline shell |
| Server | Node.js + Express (`server/index.js`) | Serves the app now; the REST API goes in `/api` next |
| Database (next) | **The existing PostgreSQL** on Render (`DATABASE_URL`) | Already provisioned and paid for |
| Files (next) | S3-compatible storage — **Contabo Object Storage** or Cloudflare R2 | Cheap storage for reunion photos and videos |
| Payments (next) | Razorpay, verified on the server + webhooks | Never trust the browser's "success" |
| Hosting | Render now; Dockerfile for a **Contabo VPS** later | Same container runs on both |

Supabase was in the original brief. Because you already have Render and a Postgres database, the plan uses them directly. Tenant isolation is enforced in the API (every query is scoped to the reunions the user belongs to). PostgreSQL Row Level Security policies keyed on the signed-in user are added as a second layer.

## Screens (all built)

| Route | Screen |
|---|---|
| `/` | Landing page |
| `/auth` | Sign in / register (email + Google) |
| `/app` | My Reunions dashboard (organise, joined, invitations, pending polls & payments) |
| `/app/new` | Create-reunion wizard (4 steps; `?from=<id>` reuses a previous reunion's members) |
| `/app/profile` | Profile |
| `/join/:token` | Join via invitation link / QR |
| `/r/:id` | Reunion workspace overview |
| `/r/:id/invite` | Invite link, real QR code, WhatsApp share, approval setting, link reset |
| `/r/:id/dates` | Date voting, suggestions, organizer finalises |
| `/r/:id/venues` | Venue marketplace: filter, search, vote, compare, suggest, finalise |
| `/r/:id/food` | Food preferences and catering packages |
| `/r/:id/budget` | Live budget calculator (total ÷ confirmed paying participants), actuals, variance |
| `/r/:id/payments` | Contributions, collection status, transactions |
| `/r/:id/tasks` | Responsibilities with statuses and volunteering |
| `/r/:id/members` | Directory, approve/reject requests, co-organizers, CSV export |
| `/r/:id/event` | Event day: schedule, directions, check-in, entry pass QR |
| `/r/:id/memories` | Photos, albums, timeline, viewer, uploads, privacy |
| `/vendor` | Vendor portal |
| `/admin` | KALKITEC platform admin |
| `/credits` | Photo credits |

## Photos

All photos are real and used under the [Unsplash License](https://unsplash.com/license) and the [Pexels License](https://www.pexels.com/license/). They load from the providers' image CDNs, and every photographer is credited on `/credits` (list in `src/lib/photos.ts`). Several are from Visakhapatnam (RK Beach, Beach Road, Yarada).

Venue and caterer cards are **DEMO placeholders**. They use photos as illustrations and show no invented prices or contact details, as the brief requires. Real listings will come from Google Places and verified vendor submissions.

## Run locally

```bash
npm install
npm run dev        # http://localhost:5173
# or the production build:
npm run build && npm start   # http://localhost:3000
```

Sign in with any email and an 8+ character password, or "Continue with Google" (demo). **Profile → Reset demo data** restores the sample reunions.

## Deploy on Render

1. Render dashboard → **New → Web Service** → this repository, branch **`back2campus-frontend`** (or **New → Blueprint**, which reads `render.yaml`).
2. Build command `npm ci --include=dev && npm run build`, start command `npm start`, health check `/healthz`.
3. Environment: `NODE_VERSION=22`. Add `DATABASE_URL` from your existing database now. The front end doesn't use it yet; the API will.

Create it as a **new** service. If you point the existing `reunion-vote` service at this branch, this app will replace the Meetho Mohan page it serves today.

## Deploy on a Contabo VPS (Docker)

```bash
docker build -t back2campus .
docker run -d --name back2campus -p 3000:3000 --restart unless-stopped -e DATABASE_URL=... back2campus
```

Put Nginx or Caddy in front for HTTPS (Caddy gets certificates automatically).

## Environment variables

See `.env.example`.

| Name | Where | Purpose |
|---|---|---|
| `VITE_API_URL` | build time | Empty = demo mode. Set to the API origin when the backend ships. |
| `PORT` | runtime | Set automatically by Render |
| `DATABASE_URL` | runtime | Existing PostgreSQL connection string (backend phase) |
| Next: `GOOGLE_CLIENT_ID`, `SESSION_SECRET`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `GOOGLE_MAPS_API_KEY` | runtime | Never exposed to the browser |

## Project structure

```
server/index.js          Express: static app, /healthz, /api placeholder, security headers
src/
  App.tsx                Routes
  components/ui.tsx      Buttons, cards, fields, badges, photo component…
  components/layouts.tsx App shell, workspace layout (sidebar + bottom nav), auth guard
  lib/types.ts           Domain types (mirror the planned database tables)
  lib/store.tsx          Demo-mode store (localStorage); swap for API calls
  lib/demo-data.ts       Sample reunions (clearly fictional)
  lib/photos.ts          Photo registry + credits
  pages/                 Landing, Auth, Dashboard, CreateReunion, Join, Profile, Vendor, Admin, Credits
  pages/workspace/       Overview, Invite, Dates, Venues, Food, Budget, Payments, Tasks, Members, EventDay, Memories
```

## Next steps

1. **API + database (Phase 1 backend):** Express routes, SQL migrations on the existing Postgres (users, reunions, memberships, invitations, date options and votes, venues and votes, budget items), session auth with Google, and an isolation test proving that changing a reunion ID in a URL never exposes another reunion's data.
2. Replace `lib/store.tsx` actions with API calls (screens stay the same).
3. Phases 2–4: Razorpay with webhooks, object storage for memories, Google Places for venues, notifications.
