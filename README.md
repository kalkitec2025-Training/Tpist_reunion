# TPIST Silver Jubilee Reunion app

A mobile web app for the 25-year reunion of Thandra Paparaya Institute of Science & Technology (TPIST), plus an admin panel at `/admin`.

## What batchmates see
- **Home:** event card (date to be announced, venue poll leader), headcount, their registration, voting progress, live results and the weekend schedule.
- **Vote:** one election per organising role, plus the venue poll. Each person gets one vote per election.
- **Plan:** the Day 1 and Day 2 schedule, plus each organising team with its current leader and task progress.
- **RSVP:** name, branch, mobile, city, both days or Day 1 only, overnight stay, pickup point, and veg or non-veg.

### Elections (all editable in admin)

| Election | Counting | Notes |
|---|---|---|
| Reunion Venue | scripted, no favourite | 4 Visakhapatnam resorts |
| Overall Event Coordinator | live | |
| Tele-calling & RSVP | scripted sample | |
| Food & Catering | scripted sample | |
| Hospitality & Stay | scripted sample | |
| Transport | scripted sample | includes the ladies' evening drop |
| Photography & Videography | scripted sample | |
| Venue & Arrangements | scripted sample | |
| Finance & Contributions | scripted sample | |
| Women's Coordinator | scripted | Naveen always ends on top, with an occasional dip to 2nd; total climbs to 300 |

- **Live** means only real votes count, plus any manual ± from admin.
- **Scripted** means the numbers follow the hourly script, and the voter sees their own vote added.
- You can switch any election between the two in **Admin → Elections**.
- The team elections start with **sample nominees** (placeholder names) so the app looks active. Replace them with real names in **Admin → Elections**, then switch each election to **Live** when real voting starts.
- The Home page shows registrations as real sign-ups plus extra counts for men and women, set in **Admin → Settings**. Set both to 0 to show real numbers only.

## Admin panel (`/admin`)
- **Overview:** registration counts (both days, Day 1 only, overnight, veg and non-veg, pickups by point, confirmed by call), the leader of every election, and the script clock.
- **Elections:** add or rename candidates with an optional note (e.g. "ECE, Hyderabad"), use ±1 or ±10, switch between live and scripted, set the script options, and reset votes. You can also add, delete or reorder elections.
- **Registrations:** search, filter by call status (Not called, Confirmed, Not reachable, Not coming), add caller notes, add people registered over the phone, and export to CSV.
- **Plan & tasks:** edit the schedule, and add tasks for each team and tick them off.
- **Settings:** event name, college, date text, expected count, announcement banner, branches, pickup points, and whether voting and registrations are open.

## Free, permanent storage (important)
Render's free plan wipes local files on every restart. Without a database, registrations, real votes and admin edits are lost. The app uses a free Postgres database when `DATABASE_URL` is set:

1. Go to **neon.tech** and sign up free (no card needed). Create a project, choosing the region closest to India, such as Singapore.
2. Copy the **connection string**. It looks like `postgresql://user:pass@ep-xxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require`.
3. In Render, open the `reunion-vote` service, go to **Environment**, add `DATABASE_URL` with that value, and save.

The admin header then shows "storage: database (permanent)".

## Keep it awake
On the free plan the app sleeps after about 15 idle minutes, and the next visit takes 30–60 seconds to load. Add a free monitor on **cron-job.org** or **UptimeRobot** that opens `https://<your-app>.onrender.com/healthz` every 10 minutes.

## Run locally
```bash
npm install
ADMIN_PASSWORD=secret npm start          # file storage in ./data
DATABASE_URL=postgres://... npm start    # or Postgres
```
