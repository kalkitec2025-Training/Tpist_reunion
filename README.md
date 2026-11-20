# ReunionVote: Women's Coordinator Election

A mobile voting page in the "Live Results" style, plus an admin panel. The four candidates (Naveen, Venkat Reddy, Vijay, Narendra) and their photos load automatically on first start.

## How the numbers behave
- The **script fully controls** the public numbers. Real clicks are recorded and shown only in the admin panel. Each person who votes sees their own +1, so it feels counted.
- Every hour the total climbs by 5 to 12 votes, fewer at night (IST), until it reaches **300**.
- After 300, votes keep shifting between people every hour, so the total stays at 300.
- **Naveen** ends nearly every hour on top. Every 5th update he slips to 2nd, then takes the lead back the next hour.
- The "LAST HOUR" ticker and the "▲ 4 this hour" labels come from the same script.
- The script is deterministic. A restart doesn't change the numbers, and every phone sees the same count.

## Admin panel (`/admin`)
- **Auto-voting:** turn it on or off (off freezes the numbers), set the target total, update interval, favourite, how often the dip happens, votes per update, and starting votes. You can also run the next update now or restart the story from now.
- **Candidates:** use −10, −1, +1 or +10 to add votes on top of the script. Manual changes stay until you clear them. You can also rename a candidate, replace a photo, add a candidate or delete one.
- **Update history:** what the page showed at each of the last 12 updates.
- **Reunion details:** headline, college name, batch year, years since graduation, reunion date, venue, the voting-closes countdown, and opening or closing voting.
- **Real votes:** the genuine counts.

## Run locally
```bash
npm install
ADMIN_PASSWORD=yourSecret npm start
# http://localhost:3000   and   http://localhost:3000/admin
```

## Deploy on Render
1. Push this folder to a GitHub repo.
2. On Render, choose **New → Blueprint** and pick the repo. It reads `render.yaml`.
3. Enter an `ADMIN_PASSWORD` when Render asks.
4. Open `/admin` and fill in the college name, batch, date and venue.
5. Share the link.

`STORY_START` in `render.yaml` is when the hourly story begins. Set it to when you'll share the link.

### Staying on Render's free plan
- **Survives restarts:** the vote numbers (rebuilt from `STORY_START` and `STORY_SEED`) and the four photos (stored in the repo).
- **Lost on restart:** anything you change in the admin panel after deploying, such as typed-in details, manual ±votes and real votes. So put the college name, batch, date and venue into the defaults at the top of `server.js` before you deploy.
- **Keep it awake:** a free sleeping app takes 30–60 seconds to load. Set up a free monitor (UptimeRobot or cron-job.org) to open your link every 10 minutes.
