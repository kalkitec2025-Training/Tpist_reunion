# Meetho Mohan

A single mobile page for the Meetho Mohan YouTube channel: photo, name, a short line, **Subscribe on YouTube** and **Watch the latest videos**. Nothing else: no sign-in, no data stored.

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
