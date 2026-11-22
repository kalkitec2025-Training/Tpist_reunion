const express = require('express');
const path = require('path');
const fs = require('fs');

const PORT = process.env.PORT || 3000;

// One-time cleanup: the old reunion app kept everything (registrations, votes,
// chats, Google sign-in accounts) in one table. Remove it, and any local copy.
async function deleteOldReunionData() {
  fs.rmSync(path.join(__dirname, 'data'), { recursive: true, force: true });
  if (!process.env.DATABASE_URL) return;
  const { Pool } = require('pg');
  const url = process.env.DATABASE_URL;
  const pool = new Pool({ connectionString: url, ssl: /localhost|127\.0\.0\.1/.test(url) ? false : { rejectUnauthorized: false }, max: 1 });
  try {
    await pool.query('DROP TABLE IF EXISTS app_state');
    console.log('Old reunion data deleted (if any was left).');
  } catch (e) {
    console.error('Could not delete old reunion data:', e.message);
  } finally {
    await pool.end().catch(() => {});
  }
}

const app = express();
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1h', index: 'index.html' }));
app.get('/healthz', (req, res) => res.send('ok'));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

deleteOldReunionData().finally(() => {
  app.listen(PORT, () => console.log(`Running on http://localhost:${PORT}`));
});
