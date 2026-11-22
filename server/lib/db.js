import pg from 'pg';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS = path.join(__dirname, '..', 'migrations');

// DATE columns come back as 'YYYY-MM-DD' strings, not JS Dates shifted by time zone.
pg.types.setTypeParser(1082, (v) => v);

export function createPool(url = process.env.DATABASE_URL) {
  if (!url) throw new Error('DATABASE_URL is not set');
  const local = /@(localhost|127\.0\.0\.1)(:|\/)/.test(url);
  return new pg.Pool({
    connectionString: url,
    ssl: local ? false : { rejectUnauthorized: false },
    max: Number(process.env.DB_POOL_MAX || 10),
    idleTimeoutMillis: 30000
  });
}

/** Applies server/migrations/*.sql in order, once each, inside a transaction. */
export async function migrate(pool, log = console.log) {
  const client = await pool.connect();
  try {
    await client.query('SELECT pg_advisory_lock(727274)');
    await client.query(`CREATE TABLE IF NOT EXISTS b2c_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`);
    const done = new Set((await client.query('SELECT name FROM b2c_migrations')).rows.map((r) => r.name));
    const files = fs.readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql')).sort();
    for (const f of files) {
      if (done.has(f)) continue;
      await client.query('BEGIN');
      try {
        await client.query(fs.readFileSync(path.join(MIGRATIONS, f), 'utf8'));
        await client.query('INSERT INTO b2c_migrations (name) VALUES ($1)', [f]);
        await client.query('COMMIT');
        log(`migration applied: ${f}`);
      } catch (e) {
        await client.query('ROLLBACK');
        throw new Error(`migration ${f} failed: ${e.message}`);
      }
    }
  } finally {
    await client.query('SELECT pg_advisory_unlock(727274)').catch(() => {});
    client.release();
  }
}

async function tx(pool, settings, fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const [k, v] of Object.entries(settings)) await client.query('SELECT set_config($1, $2, true)', [k, v]);
    const out = await fn(client);
    await client.query('COMMIT');
    return out;
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

/** Runs fn in a transaction where Row Level Security sees `userId` as the current user. */
export const withUser = (pool, userId, fn) => tx(pool, { 'app.user_id': userId }, fn);

/** System context (bypasses tenant policies). Only for auth, invite previews and super-admin stats. */
export const withSystem = (pool, fn) => tx(pool, { 'app.bypass': 'on' }, fn);
