// End-to-end API tests on a real PostgreSQL, connected as a NON-superuser (like
// Render), so Row Level Security is enforced exactly as in production.
// Run: scripts/local-db.sh start && TEST_DATABASE_URL=... npm test
import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server/app.js';
import { createPool, migrate, withUser } from '../server/lib/db.js';

const URL_ = process.env.TEST_DATABASE_URL;
if (!URL_) throw new Error('Set TEST_DATABASE_URL (see scripts/local-db.sh)');
process.env.AUTH_RATE_LIMIT = '1000';
process.env.API_RATE_LIMIT = '100000';

let pool, server, base;

function client() {
  let cookie = '';
  return async (method, path, body, headers = {}) => {
    const res = await fetch(base + path, {
      method,
      headers: { ...(body !== undefined ? { 'content-type': 'application/json' } : {}), ...(cookie ? { cookie } : {}), ...headers },
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
    const set = res.headers.get('set-cookie');
    if (set) cookie = set.split(';')[0];
    const json = await res.json().catch(() => null);
    return { status: res.status, body: json };
  };
}

const newReunion = (name) => ({ name, category: 'School', institution: 'Test School', batch: '2005', city: 'Visakhapatnam', expected: 50, dateFrom: '2026-12-19', dateTo: '2027-01-10', budgetPerPerson: 2500 });

before(async () => {
  pool = createPool(URL_);
  await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  await migrate(pool, () => {});
  server = createApp(pool).listen(0);
  base = `http://127.0.0.1:${server.address().port}/api`;
});
after(async () => { server?.close(); await pool?.end(); });

describe('BACK2CAMPUS API', () => {
  const A = client(), B = client(), C = client();
  let r1, r2, r1Date, r2Date, cId;

  test('register, sign in, duplicate and wrong password', async () => {
    assert.equal((await A('POST', '/auth/register', { name: 'Asha Organizer', email: 'asha@example.com', password: 'password-a1' })).status, 201);
    assert.equal((await B('POST', '/auth/register', { name: 'Bala Other', email: 'bala@example.com', password: 'password-b1' })).status, 201);
    const c = await C('POST', '/auth/register', { name: 'Chitra Member', email: 'chitra@example.com', password: 'password-c1' });
    assert.equal(c.status, 201);
    cId = c.body.user.id;
    assert.equal((await client()('POST', '/auth/register', { name: 'Dup', email: 'ASHA@example.com', password: 'password-x1' })).status, 409);
    assert.equal((await client()('POST', '/auth/login', { email: 'asha@example.com', password: 'wrong-pass' })).status, 401);
    assert.equal((await client()('POST', '/auth/login', { email: 'asha@example.com', password: 'password-a1' })).status, 200);
    assert.equal((await client()('GET', '/reunions')).status, 401);
  });

  test('organizers create reunions and add dates', async () => {
    const a = await A('POST', '/reunions', newReunion("Asha's School 2005"));
    assert.equal(a.status, 201);
    r1 = a.body.reunion;
    assert.match(r1.code, /^B2C-VSKP-2005-/);
    assert.equal(r1.myRole, 'organizer');
    const b = await B('POST', '/reunions', newReunion("Bala's College 2010"));
    r2 = b.body.reunion;
    r1Date = (await A('POST', `/reunions/${r1.id}/dates`, { day: '2026-12-20', slot: 'Evening' })).body.reunion.dates[0].id;
    r2Date = (await B('POST', `/reunions/${r2.id}/dates`, { day: '2026-12-27', slot: 'Lunch' })).body.reunion.dates[0].id;
    await A('POST', `/reunions/${r1.id}/tasks`, { title: 'Venue booking', desc: 'Confirm the hall' });
    await A('PUT', `/reunions/${r1.id}/budget/venue`, { amount: 20000 });
    assert.ok(r1Date && r2Date);
  });

  test('ISOLATION: a non-member cannot read or change another reunion by changing IDs', async () => {
    const list = await B('GET', '/reunions');
    assert.deepEqual(list.body.reunions.map((r) => r.id), [r2.id]);
    const attempts = [
      ['GET', `/reunions/${r1.id}`],
      ['PUT', `/reunions/${r1.id}/dates/${r1Date}/vote`, { availability: 'yes' }],
      ['PUT', `/reunions/${r1.id}/final-date`, { dateId: r1Date }],
      ['PUT', `/reunions/${r1.id}/budget/venue`, { amount: 1 }],
      ['POST', `/reunions/${r1.id}/announcements`, { title: 'hacked' }],
      ['PATCH', `/reunions/${r1.id}/settings`, { requireApproval: false }],
      ['POST', `/reunions/${r1.id}/invite/reset`],
      ['PUT', `/reunions/${r1.id}/attendance`, { value: 'yes' }],
      ['DELETE', `/reunions/${r1.id}/members/${cId}`],
      ['GET', `/reunions/not-a-uuid`]
    ];
    for (const [m, p, b] of attempts) {
      const res = await B(m, p, b);
      assert.equal(res.status, 404, `${m} ${p} should be 404, got ${res.status}`);
    }
    // Using another reunion's date/venue ID inside one's own reunion is refused too.
    assert.equal((await B('PUT', `/reunions/${r2.id}/dates/${r1Date}/vote`, { availability: 'yes' })).status, 404);
    assert.equal((await B('PUT', `/reunions/${r2.id}/final-date`, { dateId: r1Date })).status, 404);
    // Nothing changed in r1.
    const r1Now = (await A('GET', `/reunions/${r1.id}`)).body.reunion;
    assert.equal(r1Now.budget.venue, 20000);
    assert.equal(r1Now.finalDateId, null);
    assert.equal(r1Now.dates[0].others.yes, 0);
  });

  test('ISOLATION in the database: Row Level Security hides other reunions even from raw SQL', async () => {
    const bId = (await B('GET', '/me')).body.user.id;
    const seen = await withUser(pool, bId, async (c) => ({
      reunions: (await c.query('SELECT id FROM reunions')).rows.map((r) => r.id),
      dates: (await c.query('SELECT id FROM date_options WHERE reunion_id = $1', [r1.id])).rowCount,
      tasks: (await c.query('SELECT id FROM tasks')).rowCount,
      budget: (await c.query('SELECT * FROM budget_items WHERE reunion_id = $1', [r1.id])).rowCount
    }));
    assert.deepEqual(seen.reunions, [r2.id]);
    assert.equal(seen.dates, 0);
    assert.equal(seen.tasks, 0);
    assert.equal(seen.budget, 0);
    // Writing into another tenant is rejected by the database itself.
    await assert.rejects(withUser(pool, bId, (c) => c.query(`INSERT INTO date_votes (reunion_id, date_option_id, user_id, availability) VALUES ($1, $2, $3, 'yes')`, [r1.id, r1Date, bId])), /row-level security/);
    await assert.rejects(withUser(pool, bId, (c) => c.query(`INSERT INTO announcements (reunion_id, title) VALUES ($1, 'x')`, [r1.id])), /row-level security/);
    const upd = await withUser(pool, bId, (c) => c.query('UPDATE reunions SET name = $2 WHERE id = $1', [r1.id, 'hijacked']));
    assert.equal(upd.rowCount, 0);
    // Fail closed: a query with no user context sees no tenant rows at all.
    assert.equal((await pool.query('SELECT * FROM reunions')).rowCount, 0);
    assert.equal((await pool.query('SELECT * FROM tasks')).rowCount, 0);
  });

  test('joining by invite needs approval; pending members see nothing', async () => {
    const token = r1.inviteToken;
    assert.ok(token);
    const preview = await C('GET', `/invites/${token}`);
    assert.equal(preview.status, 200);
    assert.equal(preview.body.invite.name, "Asha's School 2005");
    assert.equal(preview.body.invite.reunionId, null);
    const join = await C('POST', `/invites/${token}/join`, { note: '10th B' });
    assert.deepEqual(join.body, { reunionId: r1.id, status: 'pending' });
    assert.equal((await C('GET', `/reunions/${r1.id}`)).status, 404);
    const forA = (await A('GET', `/reunions/${r1.id}`)).body.reunion;
    assert.equal(forA.people.find((p) => p.id === cId).status, 'pending');
    assert.equal((await A('PATCH', `/reunions/${r1.id}/members/${cId}`, { status: 'active' })).status, 200);
    const forC = (await C('GET', `/reunions/${r1.id}`)).body.reunion;
    assert.equal(forC.myRole, 'participant');
    assert.equal(forC.inviteToken, '', 'participants do not receive the invite token');
    assert.equal((await client()('GET', '/invites/bad token')).status, 404);
  });

  test('roles: participants vote and volunteer but cannot run the reunion', async () => {
    assert.equal((await C('PUT', `/reunions/${r1.id}/dates/${r1Date}/vote`, { availability: 'yes' })).status, 200);
    const forA = (await A('GET', `/reunions/${r1.id}`)).body.reunion;
    assert.equal(forA.dates[0].others.yes, 1);
    assert.equal((await C('PUT', `/reunions/${r1.id}/final-date`, { dateId: r1Date })).status, 403);
    assert.equal((await C('PUT', `/reunions/${r1.id}/budget/food`, { amount: 5 })).status, 403);
    assert.equal((await C('POST', `/reunions/${r1.id}/announcements`, { title: 'x' })).status, 403);
    assert.equal((await C('DELETE', `/reunions/${r1.id}/members/${cId}`)).status, 403);
    const task = forA.tasks[0];
    assert.equal((await C('PATCH', `/reunions/${r1.id}/tasks/${task.id}`, { volunteer: true })).status, 200);
    assert.equal((await C('PATCH', `/reunions/${r1.id}/tasks/${task.id}`, { status: 'In Progress' })).status, 200);
    assert.equal((await A('PUT', `/reunions/${r1.id}/final-date`, { dateId: r1Date })).status, 200);
    assert.equal((await C('PUT', `/reunions/${r1.id}/dates/${r1Date}/vote`, { availability: 'no' })).status, 409);
  });

  test('resetting the invite link invalidates the old one', async () => {
    const old = r1.inviteToken;
    const fresh = (await A('POST', `/reunions/${r1.id}/invite/reset`)).body.reunion.inviteToken;
    assert.notEqual(fresh, old);
    assert.equal((await client()('GET', `/invites/${old}`)).status, 404);
    assert.equal((await client()('GET', `/invites/${fresh}`)).status, 200);
  });

  test('audit log records organizer actions', async () => {
    const aId = (await A('GET', '/me')).body.user.id;
    const actions = await withUser(pool, aId, async (c) => (await c.query('SELECT action FROM audit_log WHERE reunion_id = $1 ORDER BY id', [r1.id])).rows.map((r) => r.action));
    for (const a of ['reunion.create', 'member.request', 'member.approve', 'date.finalise', 'invite.reset']) assert.ok(actions.includes(a), `missing ${a}`);
  });

  test('cross-site requests and bad input are refused', async () => {
    assert.equal((await A('POST', `/reunions/${r1.id}/announcements`, { title: 'x' }, { origin: 'https://evil.example' })).status, 403);
    const bad = await A('POST', '/reunions', { ...newReunion('Bad dates'), dateTo: '2026-01-01' });
    assert.equal(bad.status, 400);
    assert.equal((await client()('GET', '/admin/stats')).status, 401);
    assert.equal((await A('GET', '/admin/stats')).status, 403);
  });

  test('sign out ends the session', async () => {
    assert.equal((await A('POST', '/auth/logout')).status, 200);
    assert.equal((await A('GET', '/reunions')).status, 401);
  });
});
