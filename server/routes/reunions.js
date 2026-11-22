import { Router } from 'express';
import crypto from 'node:crypto';
import { z } from 'zod';
import { HttpError, requireAuth } from '../lib/auth.js';
import { withSystem, withUser } from '../lib/db.js';
import { serializeReunion } from '../lib/serialize.js';
import { wrap } from './auth.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD');
const categories = ['School', 'College', 'Corporate', 'Friends', 'Family', 'Alumni'];
const photoIds = ['kidsHug', 'graduates', 'classroom', 'friendsSelfie', 'beachGroup', 'familySelfie', 'lectureHall', 'vizagBeachDay', 'villageKids', 'rkStatue', 'vizagWaves', 'beachRoad'];
const newToken = () => crypto.randomBytes(9).toString('base64url');

/** The caller's active membership, or a 404 that looks identical for "no such reunion" and "not yours". */
async function membership(c, reunionId, userId) {
  if (!UUID.test(reunionId)) throw new HttpError(404, 'Reunion not found.');
  const { rows: [m] } = await c.query('SELECT role, status FROM memberships WHERE reunion_id = $1 AND user_id = $2', [reunionId, userId]);
  if (!m || m.status !== 'active') throw new HttpError(404, 'Reunion not found.');
  return m;
}
const requireOrganizer = (m) => { if (m.role === 'participant') throw new HttpError(403, 'Only organizers can do this.'); };
const requireOwner = (m) => { if (m.role !== 'organizer') throw new HttpError(403, 'Only the main organizer can do this.'); };
const audit = (c, reunionId, actor, action, details = {}) =>
  c.query('INSERT INTO audit_log (reunion_id, actor_id, action, details) VALUES ($1, $2, $3, $4)', [reunionId, actor, action, details]);

export default function reunionRoutes(pool) {
  const r = Router();
  r.use('/reunions', requireAuth);
  r.use('/invites/:token/join', requireAuth);
  r.use('/admin', requireAuth);

  /** Runs a member-only action and responds with the refreshed reunion. */
  const act = (handler) => wrap(async (req, res) => {
    const out = await withUser(pool, req.user.id, async (c) => {
      const m = await membership(c, req.params.id, req.user.id);
      await handler(c, m, req);
      return serializeReunion(c, req.params.id, req.user.id);
    });
    res.json({ reunion: out });
  });

  // ------------------------------------------------------------ list / create / read
  r.get('/reunions', wrap(async (req, res) => {
    const list = await withUser(pool, req.user.id, async (c) => {
      const { rows } = await c.query(`SELECT reunion_id FROM memberships WHERE user_id = $1 AND status = 'active' ORDER BY joined_at DESC`, [req.user.id]);
      const out = [];
      for (const row of rows) out.push(await serializeReunion(c, row.reunion_id, req.user.id));
      return out.filter(Boolean);
    });
    const pending = await withSystem(pool, async (c) => (await c.query(
      `SELECT r.id, r.name, r.cover_photo_id FROM memberships m JOIN reunions r ON r.id = m.reunion_id WHERE m.user_id = $1 AND m.status = 'pending'`, [req.user.id])).rows);
    res.json({ reunions: list, pendingRequests: pending.map((p) => ({ id: p.id, name: p.name, coverPhotoId: p.cover_photo_id })) });
  }));

  r.post('/reunions', wrap(async (req, res) => {
    const b = z.object({
      name: z.string().trim().min(4).max(160),
      category: z.enum(categories),
      institution: z.string().trim().max(160).default(''),
      batch: z.string().trim().max(20).default(''),
      city: z.string().trim().min(2).max(80),
      description: z.string().trim().max(2000).default(''),
      expected: z.coerce.number().int().min(2).max(100000),
      dateFrom: isoDate, dateTo: isoDate,
      budgetPerPerson: z.coerce.number().int().min(0).max(10000000),
      coverPhotoId: z.enum(photoIds).default('kidsHug'),
      fromReunionId: z.string().regex(UUID).optional()
    }).refine((x) => x.dateTo >= x.dateFrom, { message: 'The end date must be after the start date.', path: ['dateTo'] }).parse(req.body);

    const id = await withUser(pool, req.user.id, async (c) => {
      const { rows: [city] } = await c.query('SELECT id, short_code FROM cities WHERE lower(name) = lower($1)', [b.city]);
      const prefix = city?.short_code ?? (b.city.replace(/[^A-Za-z]/g, '').slice(0, 4).toUpperCase() || 'CITY');
      const id = crypto.randomUUID();
      for (let attempt = 0; ; attempt++) {
        const code = `B2C-${prefix}-${(b.batch.replace(/\D/g, '') || String(new Date().getFullYear())).slice(-4)}-${crypto.randomBytes(3).toString('hex').slice(0, 4).toUpperCase()}`;
        try {
          await c.query('SAVEPOINT ins');
          await c.query(
            `INSERT INTO reunions (id, code, invite_token, name, category, institution, batch, city_id, city_name, description, expected, date_from, date_to,
                                   budget_per_person, contribution, cover_photo_id, payers, voting_deadline, previous_reunion_id, created_by)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$14,$15,$16,$17,$18,$19)`,
            [id, code, newToken(), b.name, b.category, b.institution, b.batch, city?.id ?? null, b.city, b.description, b.expected, b.dateFrom, b.dateTo,
              b.budgetPerPerson, b.coverPhotoId, Math.max(1, Math.round(b.expected * 0.6)), b.dateFrom, null, req.user.id]);
          break;
        } catch (e) {
          await c.query('ROLLBACK TO SAVEPOINT ins');
          if (e.code !== '23505' || attempt > 4) throw e;
        }
      }
      await c.query(`INSERT INTO memberships (reunion_id, user_id, role, status) VALUES ($1, $2, 'organizer', 'active')`, [id, req.user.id]);
      if (b.fromReunionId) {
        const prev = await membership(c, b.fromReunionId, req.user.id);
        requireOrganizer(prev);
        await c.query('UPDATE reunions SET previous_reunion_id = $2 WHERE id = $1', [id, b.fromReunionId]);
        await c.query(
          `INSERT INTO memberships (reunion_id, user_id, role, status)
           SELECT $1, user_id, 'participant', 'active' FROM memberships WHERE reunion_id = $2 AND status = 'active' AND user_id <> $3
           ON CONFLICT DO NOTHING`, [id, b.fromReunionId, req.user.id]);
      }
      await audit(c, id, req.user.id, 'reunion.create', { name: b.name });
      return id;
    });
    const reunion = await withUser(pool, req.user.id, (c) => serializeReunion(c, id, req.user.id));
    res.status(201).json({ reunion });
  }));

  r.get('/reunions/:id', act(async () => {}));

  // ------------------------------------------------------------ settings & invite
  r.patch('/reunions/:id/settings', act(async (c, m, req) => {
    requireOrganizer(m);
    const b = z.object({
      requireApproval: z.boolean().optional(),
      payers: z.number().int().min(0).max(100000).optional(),
      spent: z.number().int().min(0).max(1e9).optional(),
      contribution: z.number().int().min(0).max(1e7).optional(),
      votingDeadline: isoDate.optional(),
      status: z.enum(['planning', 'confirmed', 'completed']).optional()
    }).parse(req.body);
    const cols = { requireApproval: 'require_approval', payers: 'payers', spent: 'spent', contribution: 'contribution', votingDeadline: 'voting_deadline', status: 'status' };
    const sets = [], vals = [req.params.id];
    for (const [k, v] of Object.entries(b)) if (v !== undefined) { vals.push(v); sets.push(`${cols[k]} = $${vals.length}`); }
    if (sets.length) await c.query(`UPDATE reunions SET ${sets.join(', ')} WHERE id = $1`, vals);
    await audit(c, req.params.id, req.user.id, 'reunion.settings', b);
  }));

  r.post('/reunions/:id/invite/reset', act(async (c, m, req) => {
    requireOrganizer(m);
    await c.query('UPDATE reunions SET invite_token = $2 WHERE id = $1', [req.params.id, newToken()]);
    await audit(c, req.params.id, req.user.id, 'invite.reset');
  }));

  // ------------------------------------------------------------ attendance, food, announcements
  r.put('/reunions/:id/attendance', act(async (c, m, req) => {
    const { value } = z.object({ value: z.enum(['yes', 'maybe', 'no']).nullable() }).parse(req.body);
    await c.query('UPDATE memberships SET attendance = $3 WHERE reunion_id = $1 AND user_id = $2', [req.params.id, req.user.id, value]);
  }));

  r.put('/reunions/:id/food', act(async (c, m, req) => {
    const b = z.object({ pref: z.enum(['Vegetarian', 'Non-vegetarian', 'Vegan', 'Jain']).nullable().optional(), diet: z.string().trim().max(300).optional() }).parse(req.body);
    await c.query(
      `UPDATE memberships SET food_pref = CASE WHEN $3 THEN $4 ELSE food_pref END, diet = COALESCE($5, diet) WHERE reunion_id = $1 AND user_id = $2`,
      [req.params.id, req.user.id, b.pref !== undefined, b.pref ?? null, b.diet ?? null]);
  }));

  r.post('/reunions/:id/announcements', act(async (c, m, req) => {
    requireOrganizer(m);
    const b = z.object({ title: z.string().trim().min(1).max(160), body: z.string().trim().max(4000).default('') }).parse(req.body);
    await c.query('INSERT INTO announcements (reunion_id, author_id, title, body) VALUES ($1, $2, $3, $4)', [req.params.id, req.user.id, b.title, b.body]);
  }));

  // ------------------------------------------------------------ dates
  r.post('/reunions/:id/dates', act(async (c, m, req) => {
    const b = z.object({ day: isoDate, slot: z.string().trim().min(1).max(40).default('Evening') }).parse(req.body);
    const { rows: [rr] } = await c.query('SELECT final_date_id FROM reunions WHERE id = $1', [req.params.id]);
    if (rr.final_date_id) throw new HttpError(409, 'The date is already finalised.');
    await c.query('INSERT INTO date_options (reunion_id, day, slot, created_by) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING', [req.params.id, b.day, b.slot, req.user.id]);
  }));

  r.put('/reunions/:id/dates/:dateId/vote', act(async (c, m, req) => {
    const { availability } = z.object({ availability: z.enum(['yes', 'maybe', 'no']).nullable() }).parse(req.body);
    const { rows: [d] } = await c.query(
      'SELECT d.id, r.final_date_id FROM date_options d JOIN reunions r ON r.id = d.reunion_id WHERE d.id = $1 AND d.reunion_id = $2',
      [UUID.test(req.params.dateId) ? req.params.dateId : null, req.params.id]);
    if (!d) throw new HttpError(404, 'Date option not found.');
    if (d.final_date_id) throw new HttpError(409, 'Voting is closed: the date is finalised.');
    if (availability === null) await c.query('DELETE FROM date_votes WHERE date_option_id = $1 AND user_id = $2', [d.id, req.user.id]);
    else await c.query(
      `INSERT INTO date_votes (reunion_id, date_option_id, user_id, availability) VALUES ($1, $2, $3, $4)
       ON CONFLICT (date_option_id, user_id) DO UPDATE SET availability = EXCLUDED.availability`, [req.params.id, d.id, req.user.id, availability]);
  }));

  r.put('/reunions/:id/final-date', act(async (c, m, req) => {
    requireOrganizer(m);
    const { dateId } = z.object({ dateId: z.string().regex(UUID).nullable() }).parse(req.body);
    if (dateId) {
      const { rowCount } = await c.query('SELECT 1 FROM date_options WHERE id = $1 AND reunion_id = $2', [dateId, req.params.id]);
      if (!rowCount) throw new HttpError(404, 'Date option not found.');
    }
    await c.query('UPDATE reunions SET final_date_id = $2 WHERE id = $1', [req.params.id, dateId]);
    await audit(c, req.params.id, req.user.id, dateId ? 'date.finalise' : 'date.reopen', { dateId });
  }));

  // ------------------------------------------------------------ venues
  r.post('/reunions/:id/venues', act(async (c, m, req) => {
    const b = z.object({
      name: z.string().trim().min(3).max(160),
      kind: z.enum(['Resort', 'Hotel', 'Restaurant', 'Banquet hall', 'Beachside', 'Farmhouse']),
      area: z.string().trim().max(120).default(''),
      capacity: z.number().int().min(0).max(100000).default(0)
    }).parse(req.body);
    await c.query(
      `INSERT INTO venues (reunion_id, name, kind, area, capacity, tags, suggested_by) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [req.params.id, b.name, b.kind, b.area, b.capacity, ['Suggested by a member'], req.user.id]);
  }));

  r.put('/reunions/:id/venue-vote', act(async (c, m, req) => {
    const { venueId } = z.object({ venueId: z.string().regex(UUID).nullable() }).parse(req.body);
    const { rows: [rr] } = await c.query('SELECT final_venue_id FROM reunions WHERE id = $1', [req.params.id]);
    if (rr.final_venue_id) throw new HttpError(409, 'Voting is closed: the venue is finalised.');
    if (!venueId) return void (await c.query('DELETE FROM venue_votes WHERE reunion_id = $1 AND user_id = $2', [req.params.id, req.user.id]));
    const { rowCount } = await c.query('SELECT 1 FROM venues WHERE id = $1 AND reunion_id = $2', [venueId, req.params.id]);
    if (!rowCount) throw new HttpError(404, 'Venue not found.');
    await c.query(
      `INSERT INTO venue_votes (reunion_id, user_id, venue_id) VALUES ($1, $2, $3)
       ON CONFLICT (reunion_id, user_id) DO UPDATE SET venue_id = EXCLUDED.venue_id`, [req.params.id, req.user.id, venueId]);
  }));

  r.put('/reunions/:id/final-venue', act(async (c, m, req) => {
    requireOrganizer(m);
    const { venueId } = z.object({ venueId: z.string().regex(UUID).nullable() }).parse(req.body);
    if (venueId) {
      const { rowCount } = await c.query('SELECT 1 FROM venues WHERE id = $1 AND reunion_id = $2', [venueId, req.params.id]);
      if (!rowCount) throw new HttpError(404, 'Venue not found.');
    }
    await c.query('UPDATE reunions SET final_venue_id = $2 WHERE id = $1', [req.params.id, venueId]);
    await audit(c, req.params.id, req.user.id, venueId ? 'venue.finalise' : 'venue.reopen', { venueId });
  }));

  // ------------------------------------------------------------ budget
  r.put('/reunions/:id/budget/:key', act(async (c, m, req) => {
    requireOrganizer(m);
    const key = z.enum(['venue', 'food', 'transport', 'stay', 'deco', 'photo', 'fun', 'misc']).parse(req.params.key);
    const { amount } = z.object({ amount: z.number().int().min(0).max(1e9) }).parse(req.body);
    await c.query(
      `INSERT INTO budget_items (reunion_id, key, amount) VALUES ($1, $2, $3) ON CONFLICT (reunion_id, key) DO UPDATE SET amount = EXCLUDED.amount`,
      [req.params.id, key, amount]);
  }));

  // ------------------------------------------------------------ tasks
  r.post('/reunions/:id/tasks', act(async (c, m, req) => {
    requireOrganizer(m);
    const b = z.object({
      title: z.string().trim().min(3).max(160), desc: z.string().trim().max(2000).default(''),
      assigneeId: z.string().regex(UUID).nullable().default(null), due: isoDate.nullable().default(null)
    }).parse(req.body);
    if (b.assigneeId) await membership(c, req.params.id, b.assigneeId).catch(() => { throw new HttpError(400, 'The assignee is not a member of this reunion.'); });
    await c.query('INSERT INTO tasks (reunion_id, title, description, assignee_id, due, created_by) VALUES ($1, $2, $3, $4, $5, $6)',
      [req.params.id, b.title, b.desc, b.assigneeId, b.due, req.user.id]);
  }));

  r.patch('/reunions/:id/tasks/:taskId', act(async (c, m, req) => {
    const b = z.object({ status: z.enum(['Not Started', 'In Progress', 'Completed']).optional(), volunteer: z.literal(true).optional() }).parse(req.body);
    const { rows: [t] } = await c.query('SELECT * FROM tasks WHERE id = $1 AND reunion_id = $2', [UUID.test(req.params.taskId) ? req.params.taskId : null, req.params.id]);
    if (!t) throw new HttpError(404, 'Task not found.');
    if (b.volunteer) {
      if (t.assignee_id) throw new HttpError(409, 'Someone has already taken this task.');
      await c.query('UPDATE tasks SET assignee_id = $2 WHERE id = $1', [t.id, req.user.id]);
    }
    if (b.status) {
      if (m.role === 'participant' && t.assignee_id !== req.user.id) throw new HttpError(403, 'Only the assignee or an organizer can change the status.');
      await c.query('UPDATE tasks SET status = $2 WHERE id = $1', [t.id, b.status]);
    }
  }));

  // ------------------------------------------------------------ members
  r.patch('/reunions/:id/members/:userId', act(async (c, m, req) => {
    requireOrganizer(m);
    const b = z.object({ status: z.literal('active').optional(), role: z.enum(['co_organizer', 'participant']).optional() }).parse(req.body);
    const target = UUID.test(req.params.userId) ? req.params.userId : null;
    const { rows: [tm] } = await c.query('SELECT role, status FROM memberships WHERE reunion_id = $1 AND user_id = $2', [req.params.id, target]);
    if (!tm) throw new HttpError(404, 'Member not found.');
    if (b.role) {
      requireOwner(m);
      if (tm.role === 'organizer') throw new HttpError(400, "The main organizer's role can't be changed.");
      await c.query('UPDATE memberships SET role = $3 WHERE reunion_id = $1 AND user_id = $2', [req.params.id, target, b.role]);
      await audit(c, req.params.id, req.user.id, 'member.role', { userId: target, role: b.role });
    }
    if (b.status) {
      await c.query(`UPDATE memberships SET status = 'active', joined_at = now() WHERE reunion_id = $1 AND user_id = $2`, [req.params.id, target]);
      await audit(c, req.params.id, req.user.id, 'member.approve', { userId: target });
    }
  }));

  r.delete('/reunions/:id/members/:userId', act(async (c, m, req) => {
    requireOrganizer(m);
    const target = UUID.test(req.params.userId) ? req.params.userId : null;
    const { rows: [tm] } = await c.query('SELECT role, status FROM memberships WHERE reunion_id = $1 AND user_id = $2', [req.params.id, target]);
    if (!tm) throw new HttpError(404, 'Member not found.');
    if (tm.role === 'organizer') throw new HttpError(400, "The main organizer can't be removed.");
    if (tm.role === 'co_organizer' || tm.status === 'active') requireOwner(m); // co-organizers may only reject pending requests
    await c.query('DELETE FROM memberships WHERE reunion_id = $1 AND user_id = $2', [req.params.id, target]);
    await audit(c, req.params.id, req.user.id, tm.status === 'pending' ? 'member.reject' : 'member.remove', { userId: target });
  }));

  r.post('/reunions/:id/checkins/:userId', act(async (c, m, req) => {
    requireOrganizer(m);
    const target = req.params.userId === 'me' ? req.user.id : req.params.userId;
    await membership(c, req.params.id, target).catch(() => { throw new HttpError(404, 'This QR code is not for a member of this reunion.'); });
    await c.query('UPDATE memberships SET checked_in_at = COALESCE(checked_in_at, now()) WHERE reunion_id = $1 AND user_id = $2', [req.params.id, target]);
  }));

  // ------------------------------------------------------------ invitations
  async function byToken(c, token) {
    if (!/^[A-Za-z0-9_-]{6,64}$/.test(token)) return null;
    const { rows: [x] } = await c.query(
      `SELECT r.id, r.name, r.description, r.category, r.city_name, r.cover_photo_id, r.require_approval, u.name AS organizer,
              (SELECT count(*)::int FROM memberships m WHERE m.reunion_id = r.id AND m.status = 'active') AS members
         FROM reunions r JOIN users u ON u.id = r.created_by WHERE r.invite_token = $1`, [token]);
    return x ?? null;
  }

  r.get('/invites/:token', wrap(async (req, res) => {
    const x = await withSystem(pool, (c) => byToken(c, req.params.token));
    if (!x) throw new HttpError(404, "This invitation link isn't valid.");
    let myStatus = null;
    if (req.user) myStatus = (await pool.query('SELECT status FROM memberships WHERE reunion_id = $1 AND user_id = $2', [x.id, req.user.id])).rows[0]?.status ?? null;
    res.json({
      invite: {
        name: x.name, description: x.description, category: x.category, city: x.city_name, coverPhotoId: x.cover_photo_id,
        organizer: x.organizer, members: x.members, requireApproval: x.require_approval, myStatus, reunionId: myStatus === 'active' ? x.id : null
      }
    });
  }));

  r.post('/invites/:token/join', wrap(async (req, res) => {
    const { note } = z.object({ note: z.string().trim().max(200).default('') }).parse(req.body ?? {});
    const out = await withSystem(pool, async (c) => {
      const x = await byToken(c, req.params.token);
      if (!x) throw new HttpError(404, "This invitation link isn't valid.");
      const status = x.require_approval ? 'pending' : 'active';
      const { rows: [m] } = await c.query(
        `INSERT INTO memberships (reunion_id, user_id, role, status, note) VALUES ($1, $2, 'participant', $3, $4)
         ON CONFLICT (reunion_id, user_id) DO UPDATE SET note = COALESCE(NULLIF(EXCLUDED.note, ''), memberships.note)
         RETURNING status`, [x.id, req.user.id, status, note || null]);
      await audit(c, x.id, req.user.id, m.status === 'pending' ? 'member.request' : 'member.join');
      return { reunionId: x.id, status: m.status };
    });
    res.json(out);
  }));

  // ------------------------------------------------------------ platform admin
  r.get('/admin/stats', wrap(async (req, res) => {
    if (!req.user.is_super_admin) throw new HttpError(403, 'Platform administrators only.');
    const stats = await withSystem(pool, async (c) => (await c.query(`
      SELECT (SELECT count(*) FROM users)::int AS users,
             (SELECT count(*) FROM reunions)::int AS reunions,
             (SELECT count(*) FROM reunions WHERE status <> 'completed')::int AS active,
             (SELECT count(*) FROM reunions WHERE status = 'completed')::int AS completed,
             (SELECT count(*) FROM payments WHERE status = 'verified')::int AS payments,
             (SELECT coalesce(sum(amount), 0) FROM payments WHERE status = 'verified')::bigint AS collected`)).rows[0]);
    const cities = await withSystem(pool, async (c) => (await c.query(
      `SELECT ci.name, ci.is_live, count(r.id)::int AS reunions FROM cities ci LEFT JOIN reunions r ON r.city_id = ci.id GROUP BY ci.id ORDER BY reunions DESC, ci.name`)).rows);
    res.json({ stats: { ...stats, collected: Number(stats.collected) }, cities });
  }));

  return r;
}
