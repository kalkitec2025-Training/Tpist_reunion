// Usage: DATABASE_URL=... node server/make-admin.js you@example.com
import { createPool } from './lib/db.js';
const email = process.argv[2];
if (!email) { console.error('Usage: node server/make-admin.js <email>'); process.exit(1); }
const pool = createPool();
const { rowCount } = await pool.query('UPDATE users SET is_super_admin = true WHERE email = $1', [email]);
console.log(rowCount ? `${email} is now a platform super admin.` : `No user with email ${email}. Sign up first.`);
await pool.end();
