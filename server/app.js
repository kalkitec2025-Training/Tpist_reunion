// Express application: API + built front end. Exported separately from the
// listener so tests can run it against a test database.
import express from 'express';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ZodError } from 'zod';
import { HttpError, loadUser, sameOrigin } from './lib/auth.js';
import authRoutes from './routes/auth.js';
import reunionRoutes from './routes/reunions.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(__dirname, '..', 'dist');

export function createApp(pool) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1); // Render / Nginx terminate TLS in front of us
  app.use(helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        'img-src': ["'self'", 'data:', 'blob:', 'https://images.unsplash.com', 'https://images.pexels.com', 'https://*.googleusercontent.com'],
        'script-src': ["'self'", 'https://accounts.google.com'],
        'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://accounts.google.com'],
        'font-src': ["'self'", 'https://fonts.gstatic.com'],
        'frame-src': ['https://accounts.google.com'],
        'connect-src': ["'self'", 'https://accounts.google.com', 'https://images.unsplash.com', 'https://images.pexels.com']
      }
    },
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' }
  }));
  app.use(compression());

  app.get('/healthz', (req, res) => res.send('ok'));

  const api = express.Router();
  api.use(express.json({ limit: '100kb' }));
  api.use(cookieParser());
  api.use(rateLimit({ windowMs: 60 * 1000, limit: Number(process.env.API_RATE_LIMIT || 300), standardHeaders: 'draft-8', legacyHeaders: false }));
  api.use(sameOrigin);
  api.use(loadUser(pool));
  api.get('/health', async (req, res) => {
    const db = await pool.query('SELECT 1').then(() => true, () => false);
    res.status(db ? 200 : 503).json({ ok: db, database: db });
  });
  api.get('/config', (req, res) => res.json({ googleClientId: process.env.GOOGLE_CLIENT_ID || null }));
  api.use(authRoutes(pool));
  api.use(reunionRoutes(pool));
  api.use((req, res) => res.status(404).json({ error: 'Not found.' }));
  // eslint-disable-next-line no-unused-vars
  api.use((err, req, res, next) => {
    if (err instanceof ZodError) return res.status(400).json({ error: err.issues[0]?.message ?? 'Invalid input.', issues: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })) });
    if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON.' });
    if (err.code === '23505') return res.status(409).json({ error: 'That already exists.' });
    if (err.code === '42501') return res.status(404).json({ error: 'Not found.' }); // RLS refused the row
    console.error(err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  });
  app.use('/api', api);

  app.use('/assets', express.static(path.join(dist, 'assets'), { immutable: true, maxAge: '1y' }));
  app.use(express.static(dist, { maxAge: 0, index: false }));
  app.get('*', (req, res) => {
    res.set('Cache-Control', 'no-cache');
    res.sendFile(path.join(dist, 'index.html'), (err) => err && res.status(404).send('Front end not built. Run npm run build.'));
  });
  return app;
}
