// BACK2CAMPUS web server: serves the built front end (dist/) and is the place
// where the API (/api/*) will live in the next phase.
import express from 'express';
import compression from 'compression';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(__dirname, '..', 'dist');
const PORT = process.env.PORT || 3000;

const app = express();
app.disable('x-powered-by');
app.use(compression());
app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Frame-Options': 'SAMEORIGIN'
  });
  next();
});

app.get('/healthz', (req, res) => res.send('ok'));

// Placeholder so the front end can detect whether a real API is deployed.
app.get('/api/health', (req, res) => res.json({ ok: true, api: 'not-yet-implemented', database: Boolean(process.env.DATABASE_URL) }));
app.use('/api', (req, res) => res.status(501).json({ error: 'API not implemented yet (Phase 1 backend).' }));

// Hashed assets can be cached for a year; index.html and the service worker must not be.
app.use('/assets', express.static(path.join(dist, 'assets'), { immutable: true, maxAge: '1y' }));
app.use(express.static(dist, { maxAge: 0, index: false }));
app.get('*', (req, res) => {
  res.set('Cache-Control', 'no-cache');
  res.sendFile(path.join(dist, 'index.html'));
});

app.listen(PORT, () => console.log(`BACK2CAMPUS running on http://localhost:${PORT}`));
