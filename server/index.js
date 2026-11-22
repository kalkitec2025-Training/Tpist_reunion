// BACK2CAMPUS server entry point: runs database migrations, then serves the API
// and the built front end. Without DATABASE_URL it serves the front end only
// (the app then runs in demo mode).
import { createApp } from './app.js';
import { createPool, migrate } from './lib/db.js';

const PORT = process.env.PORT || 3000;

async function main() {
  let pool = null;
  if (process.env.DATABASE_URL) {
    pool = createPool();
    await migrate(pool);
    setInterval(() => pool.query('DELETE FROM sessions WHERE expires_at < now()').catch(() => {}), 6 * 3600 * 1000).unref();
  } else {
    console.warn('DATABASE_URL is not set: serving the front end only; /api returns 503.');
  }
  const app = createApp(pool ?? {
    query: () => Promise.reject(new Error('no database')),
    connect: () => Promise.reject(new Error('no database'))
  });
  app.listen(PORT, () => console.log(`BACK2CAMPUS running on http://localhost:${PORT}`));
}

main().catch((e) => { console.error(e); process.exit(1); });
