import { createPool, migrate } from './lib/db.js';
const pool = createPool();
migrate(pool).then(() => pool.end()).catch((e) => { console.error(e.message); process.exit(1); });
