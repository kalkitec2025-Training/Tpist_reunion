import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { createRemoteJWKSet, jwtVerify } from 'jose';

export const COOKIE = 'b2c_session';
const SESSION_DAYS = 30;
const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export const hashPassword = (pw) => bcrypt.hash(pw, 11);
export const checkPassword = (pw, hash) => (hash ? bcrypt.compare(pw, hash) : Promise.resolve(false));

export async function createSession(pool, res, userId, userAgent = '') {
  const token = crypto.randomBytes(32).toString('base64url');
  const expires = new Date(Date.now() + SESSION_DAYS * 86400000);
  await pool.query('INSERT INTO sessions (token_hash, user_id, expires_at, user_agent) VALUES ($1, $2, $3, $4)', [sha256(token), userId, expires, userAgent.slice(0, 200)]);
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    expires,
    path: '/'
  });
}

export async function destroySession(pool, req, res) {
  const token = req.cookies?.[COOKIE];
  if (token) await pool.query('DELETE FROM sessions WHERE token_hash = $1', [sha256(token)]);
  res.clearCookie(COOKIE, { path: '/' });
}

/** Attaches req.user when the session cookie is valid. Never throws for anonymous requests. */
export function loadUser(pool) {
  return async (req, res, next) => {
    const token = req.cookies?.[COOKIE];
    if (!token) return next();
    try {
      const { rows } = await pool.query(
        `SELECT u.id, u.email, u.name, u.phone, u.city, u.avatar_url, u.is_super_admin
           FROM sessions s JOIN users u ON u.id = s.user_id
          WHERE s.token_hash = $1 AND s.expires_at > now()`, [sha256(token)]);
      if (rows[0]) req.user = rows[0];
      next();
    } catch (e) { next(e); }
  };
}

export function requireAuth(req, res, next) {
  if (!req.user) return next(new HttpError(401, 'Please sign in.'));
  next();
}

export const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, phone: u.phone ?? '', city: u.city ?? '', isSuperAdmin: Boolean(u.is_super_admin) });

/**
 * Cross-site request protection for cookie auth: state-changing requests must
 * be JSON and come from our own origin (or have no Origin header, e.g. curl/tests).
 */
export function sameOrigin(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const origin = req.get('origin');
  const allowed = (process.env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
  if (origin) {
    const host = req.get('x-forwarded-host') || req.get('host');
    const ok = allowed.includes(origin) || new URL(origin).host === host;
    if (!ok) return next(new HttpError(403, 'Cross-site request blocked.'));
  }
  const hasBody = (req.headers['content-length'] && req.headers['content-length'] !== '0') || req.headers['transfer-encoding'];
  if (hasBody && !req.is('application/json')) {
    return next(new HttpError(415, 'Send JSON.'));
  }
  next();
}

let jwks;
export async function verifyGoogleCredential(credential) {
  const audience = process.env.GOOGLE_CLIENT_ID;
  if (!audience) throw new HttpError(501, 'Google sign-in is not configured.');
  jwks ??= createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));
  try {
    const { payload } = await jwtVerify(credential, jwks, { issuer: ['https://accounts.google.com', 'accounts.google.com'], audience });
    if (!payload.email || payload.email_verified !== true) throw new Error('email not verified');
    return { sub: String(payload.sub), email: String(payload.email), name: String(payload.name || payload.email), picture: payload.picture ? String(payload.picture) : null };
  } catch {
    throw new HttpError(401, 'Google sign-in could not be verified.');
  }
}
