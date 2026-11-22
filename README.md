# Meetho Mohan

A single mobile page for the Meetho Mohan YouTube channel: photo, name, a short line, live **Subscribers / Videos / Likes**, **Subscribe on YouTube** and **Open the channel**. No sign-in, no data stored.

## Live channel data
The server reads the channel from YouTube and refreshes every 30 minutes.
- **Without setup:** subscriber and video counts come from the channel page, and likes are added up from the latest 15 videos in YouTube's public feed (shown as "Recent likes").
- **For exact totals** (optional, free): create a YouTube Data API key in Google Cloud Console (APIs & Services → enable "YouTube Data API v3" → Credentials → API key). Then add it in Render under **Environment** as `YOUTUBE_API_KEY`.
- To point the page at another channel, set `YT_HANDLE` (without the @) or `YT_CHANNEL_ID`.

## The old reunion app
The full reunion app (elections, registrations, chat, admin, Google sign-in) is kept on the **`reunion-app-backup`** branch of this repository.

When this version first starts, it deletes the old reunion data from the database (the `app_state` table): registrations, votes, chats and Google sign-in accounts. After that, the database is no longer used.

Optional clean-up:
- In Render, under **Environment**, remove `ADMIN_PASSWORD`, `GOOGLE_CLIENT_ID`, `STORY_START` and `STORY_SEED` (and `DATABASE_URL` once the old data is gone).
- In Google Cloud Console, delete the OAuth client (or the whole "Reunion" project).
- In Neon, delete the project if you no longer need it.

## Run locally
```bash
npm install
npm start   # http://localhost:3000
```
