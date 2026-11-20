# Silver Jubilee Reunion app

A mobile web app for our 25-year batch reunion, plus an admin panel at `/admin`. The college name is not shown in the app.

## What batchmates see
- **Home:** event card, Registered / Men / Women counts, venue status, their registration, voting progress and live results for every election.
- **Vote:** one election per organising role, plus the venue poll. Each person gets one vote per election.
- **Schedule:** the Day 1 and Day 2 timings.
- **Teams:** each organising team with its coordinator (confirmed, leading, or nominations open) and task progress.
- **RSVP:** name, branch, mobile, city, both days or Day 1 only, overnight stay, pickup point, and veg or non-veg.

### Elections (all editable in admin)

| Election | Counting | Notes |
|---|---|---|
| Reunion Venue | scripted, no favourite | 4 Visakhapatnam resorts |
| Overall Event Coordinator | live | |
| Tele-calling & RSVP | live, nominees added in the app | |
| Food & Catering | live, nominees added in the app | |
| Hospitality & Stay | live, nominees added in the app | |
| Transport | live, nominees added in the app | includes the ladies' evening drop |
| Photography & Videography | live, nominees added in the app | |
| Venue & Arrangements | live, nominees added in the app | |
| Finance & Contributions | live, nominees added in the app | |
| Women's Coordinator | scripted | Naveen always ends on top, with an occasional dip to 2nd; total climbs to 300 |

- **Live** means only real votes count, plus any manual ± from admin.
- **Scripted** means the numbers follow the hourly script, and the voter sees their own vote added.
- You can switch any election between the two in **Admin → Elections**.
- Team elections start empty. Anyone can tap **Add a nominee** on a team's page (up to 2 per person per role), and everyone votes.
- When a coordinator is decided, choose them under **Confirmed coordinator** in **Admin → Elections**. The app then highlights the name in green and closes voting for that role.
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

## Chat
- The **Chat** tab is for registered batchmates only. Each person must accept the chat rules first: be professional, no abusive or unprofessional messages, no spam, no sharing others' numbers or photos, and messages are visible to the committee for moderation.
- Plans: **Starter ₹299** (10 messages), **Plus ₹599** (50 messages), **Unlimited ₹999**. Choosing a plan sends a request to the admin. **No payment is collected in the app.**
- **Admin → Chat:** approve or decline requests, activate or top up plans, remove someone's access, and read or delete messages for moderation.
- Anyone who accepted the rules can read messages sent to them. Sending needs an active plan.

## Passes
- **Platinum:** red-carpet welcome, 5 minutes on stage, the "Giving Back" showcase of their services to society, front-row seating, a premium kit, a portrait session, a full-page souvenir feature, a priority room, and a dedicated pickup and drop.
- **Gold:** personal welcome, seats in rows 2–4, a deluxe kit, an on-stage shout-out, a photo with faculty, a half-page souvenir feature, and priority pickup.
- **Silver:** welcome kit, all meals, open seating, the group photo and event video, and their name in the souvenir.
- People pick a pass when they register. Admin can change anyone's pass under **Registrations**.
- In **Admin → Settings → Passes**, you can edit each pass's name, tagline, optional price, benefits and extra shown counts.
- Schedule items can carry a **For** tag (for example "Platinum"), which appears as a coloured label on the Schedule page.
