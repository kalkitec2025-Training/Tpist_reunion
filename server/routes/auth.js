import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { HttpError, checkPassword, createSession, destroySession, hashPassword, publicUser, requireAuth, verifyGoogleCredential } from '../lib/auth.js';

const email = z.string().trim().toLowerCase().email().max(200);
const name = z.string().trim().min(2).max(120);
const phone = z.string().trim().max(20).regex(/^[+\d\s()-]*$/, 'Invalid phone number').optional().default('');
const city = z.string().trim().max(80).optional().default('');

export const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export default function authRoutes(pool) {
  const r = Router();
  const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: Number(process.env.AUTH_RATE_LIMIT || 30), standardHeaders: 'draft-8', legacyHeaders: false, message: { error: 'Too many attempts. Try again in a few minutes.' } });

  r.post('/auth/register', limiter, wrap(async (req, res) => {
    const body = z.object({ name, email, password: z.string().min(8).max(200), phone, city }).parse(req.body);
    const hash = await hashPassword(body.password);
    const { rows } = await pool.query(
      `INSERT INTO users (email, name, phone, city, password_hash) VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email) DO NOTHING RETURNING *`, [body.email, body.name, body.phone, body.city, hash]);
    if (!rows[0]) throw new HttpError(409, 'An account with this email already exists. Sign in instead.');
    await createSession(pool, res, rows[0].id, req.get('user-agent'));
    res.status(201).json({ user: publicUser(rows[0]) });
  }));

  r.post('/auth/login', limiter, wrap(async (req, res) => {
    const body = z.object({ email, password: z.string().min(1).max(200) }).parse(req.body);
    const { rows: [u] } = await pool.query('SELECT * FROM users WHERE email = $1', [body.email]);
    if (!u || !(await checkPassword(body.password, u.password_hash))) throw new HttpError(401, 'Email or password is incorrect.');
    await createSession(pool, res, u.id, req.get('user-agent'));
    res.json({ user: publicUser(u) });
  }));

  r.post('/auth/google', limiter, wrap(async (req, res) => {
    const { credential } = z.object({ credential: z.string().min(20).max(5000) }).parse(req.body);
    const g = await verifyGoogleCredential(credential);
    const { rows: [u] } = await pool.query(
      `INSERT INTO users (email, name, google_sub, avatar_url) VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE SET google_sub = COALESCE(users.google_sub, EXCLUDED.google_sub), avatar_url = COALESCE(users.avatar_url, EXCLUDED.avatar_url)
       RETURNING *`, [g.email.toLowerCase(), g.name.slice(0, 120), g.sub, g.picture]);
    if (u.google_sub !== g.sub) throw new HttpError(409, 'This email is linked to a different Google account.');
    await createSession(pool, res, u.id, req.get('user-agent'));
    res.json({ user: publicUser(u) });
  }));

  r.post('/auth/logout', wrap(async (req, res) => {
    await destroySession(pool, req, res);
    res.json({ ok: true });
  }));

  r.get('/me', (req, res) => res.json({ user: req.user ? publicUser(req.user) : null }));

  r.patch('/me', requireAuth, wrap(async (req, res) => {
    const body = z.object({
      name: name.optional(),
      phone: z.string().trim().max(20).regex(/^[+\d\s()-]*$/, 'Invalid phone number').optional(),
      city: z.string().trim().max(80).optional()
    }).parse(req.body);
    const { rows: [u] } = await pool.query(
      `UPDATE users SET name = COALESCE($2, name), phone = COALESCE($3, phone), city = COALESCE($4, city) WHERE id = $1 RETURNING *`,
      [req.user.id, body.name ?? null, body.phone ?? null, body.city ?? null]);
    res.json({ user: publicUser(u) });
  }));

  return r;
}
