const express = require('express');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const HOUR = 3600 * 1000;
const newId = () => crypto.randomBytes(6).toString('hex');

// =================================================================== defaults
const role = (id, title, desc, extra = {}) => ({
  id, kind: 'role', title, desc, mode: 'live', candidates: [], openNominations: true, confirmedId: null,
  favoriteId: null, cap: 300, dipEvery: 0, rateMin: 4, rateMax: 10, startTotal: 60, afterCap: 'hold', ...extra
});
const cand = (name, note = '', by = 'admin') => ({ id: newId(), name, note, by, offset: 0 });

function defaultDb() {
  const envStart = Date.parse(process.env.STORY_START || '');
  const women = role('women', 'Women\u2019s Coordinator',
    'Point of contact for our lady batchmates: invitations, comfort through the day and a safe evening drop.', {
      mode: 'scripted', cap: 300, dipEvery: 5, rateMin: 5, rateMax: 12, startTotal: 150, afterCap: 'shuffle', openNominations: false,
      candidates: ['Naveen', 'Venkat Reddy', 'Vijay', 'Narendra', 'Chandra'].map(n => cand(n))
    });
  women.favoriteId = women.candidates[0].id;

  const venue = {
    id: 'venue', kind: 'venue', title: 'Reunion Venue', desc: 'Where should we meet? Pick a resort in Visakhapatnam.',
    mode: 'scripted', favoriteId: null, cap: 220, dipEvery: 0, rateMin: 2, rateMax: 7, startTotal: 60, afterCap: 'hold', openNominations: false, confirmedId: null,
    candidates: [
      cand('Radisson Blu Resort', 'Rushikonda Beach Road'),
      cand('Sai Priya Beach Resort', 'Rushikonda Beach'),
      cand('Shore Front Resort', 'Rushikonda'),
      cand('Sunray Village Resort', 'Visakhapatnam')
    ]
  };

  const elections = [
    role('overall', 'Overall Event Coordinator', 'Owns the full plan, runs the committee calls and keeps every team on schedule. Confirms the final venue once the venue poll closes.'),
    role('telecalling', 'Tele-calling & RSVP', 'Reaches every batchmate by phone, confirms attendance and keeps the guest list current.'),
    role('food', 'Food & Catering', 'Caterer, menus and counts for all meals: Day 1 breakfast to Day 2 breakfast.'),
    role('hospitality', 'Hospitality & Stay', 'Welcome desk, name badges, kits, and rooms for the overnight stay.'),
    role('transport', 'Transport', 'Pickups on Day 1, the ladies\u2019 evening drop, and departures on Day 2.'),
    role('media', 'Photography & Videography', 'Photographer, videographer, the big group photo and the then-and-now slideshow.'),
    role('arrangements', 'Venue & Arrangements', 'Venue booking, stage, sound and lights, banners, decor and the programme.'),
    role('finance', 'Finance & Contributions', 'Collects contributions, tracks every expense and shares the accounts with the batch.'),
    women
  ];

  const S = (day, time, title, note = '', tag = '') => ({ id: newId(), day, time, title, note, tag });
  const T = (electionId, title, status = 'todo') => ({ id: newId(), electionId, title, status });

  return {
    v: 5,
    settings: {
      eventTitle: 'Silver Jubilee Reunion',
      collegeName: 'TPIST',
      collegeFull: 'Thandra Paparaya Institute of Science & Technology',
      location: 'Komatipalli, Bobbili',
      years: '25',
      eventDate: 'Date will be announced shortly',
      expected: 400,
      venueStatus: 'Not yet confirmed',
      passes: [
        { id: 'platinum', name: 'Platinum', price: '', tagline: 'The full red-carpet experience', benefits: [
          'Red-carpet welcome with a personal announcement',
          'Five minutes on stage to share your journey and views',
          'Showcase your services to society in the Giving Back segment',
          'Reserved front-row seating all day',
          'Premium welcome kit: engraved memento, jubilee jacket, leather diary and pen',
          'Professional portrait session',
          'Full-page feature in the reunion souvenir',
          'Priority room for the overnight stay',
          'Dedicated pickup and drop'
        ] },
        { id: 'gold', name: 'Gold', price: '', tagline: 'Comfort with a few extra touches', benefits: [
          'Personal welcome at the entrance',
          'Reserved seating in rows 2 to 4',
          'Deluxe welcome kit: memento, jubilee T-shirt and diary',
          'On-stage shout-out in "25 years in 2 minutes"',
          'Photo with our faculty',
          'Half-page feature in the reunion souvenir',
          'Priority pickup'
        ] },
        { id: 'silver', name: 'Silver', price: '', tagline: 'Everything you need to enjoy both days', benefits: [
          'Welcome kit: name badge, jubilee T-shirt and memento',
          'All meals across both days',
          'Open seating',
          'Batch group photo and event video',
          'Your name in the reunion souvenir'
        ] }
      ],
      passBase: { platinum: 8, gold: 17, silver: 29 },  // shown on the app on top of real registrations
      regBaseMale: 36,     // shown on the app on top of real registrations
      regBaseFemale: 18,
      announcement: '',
      branches: ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'IT'],
      pickupPoints: ['Bobbili', 'Vizianagaram', 'Visakhapatnam Railway Station', 'Visakhapatnam Airport', 'Srikakulam'],
      votingOpen: true,
      rsvpOpen: true
    },
    auto: {
      on: true,
      intervalMin: 60,
      seed: Number(process.env.STORY_SEED) || crypto.randomInt(1, 2 ** 31),
      startAt: Number.isFinite(envStart) ? envStart : Date.now(),
      frozenSlot: 0
    },
    elections: [venue, ...elections],
    votes: {},       // electionId -> { voterId: { c: candidateId, t: time } }
    rsvps: {},       // id -> rsvp
    nominations: {}, // electionId -> { voterId: count }
    chat: { users: {}, messages: [] }, // users keyed by rsvp id
    schedule: [
      S(1, '8:00 AM', 'Red-carpet arrivals', 'Platinum guests walk the red carpet with a personal announcement and photo wall', 'Platinum'),
      S(1, '8:00 AM', 'Welcome desk & registration', 'Collect your badge and welcome kit. Gold guests get a personal welcome', 'All passes'),
      S(1, '8:30 AM', 'Welcome breakfast', '', 'All passes'),
      S(1, '10:00 AM', 'Inauguration', 'Lamp lighting and felicitation of our faculty. Platinum guests seated in the front row', 'All passes'),
      S(1, '10:45 AM', 'Voices of the Batch', 'Platinum guests share their journey and views on stage (5 minutes each)', 'Platinum'),
      S(1, '11:45 AM', 'Giving Back showcase', 'Platinum guests present the services they offer to society', 'Platinum'),
      S(1, '12:30 PM', '25 years in 2 minutes', 'Gold shout-outs on stage, then quick intros from everyone', 'Gold & Silver'),
      S(1, '1:30 PM', 'Lunch'),
      S(1, '2:30 PM', 'Games & batch awards', 'Including the Women\u2019s Coordinator crowning'),
      S(1, '4:00 PM', 'Portrait sessions', 'Professional portraits for Platinum; photos with faculty for Gold', 'Platinum & Gold'),
      S(1, '4:30 PM', 'Batch group photo', '', 'All passes'),
      S(1, '5:00 PM', 'High tea'),
      S(1, '6:00 PM', 'Cultural evening & music', 'Front rows reserved for Platinum, next rows for Gold'),
      S(1, '8:00 PM', 'Dinner'),
      S(1, '9:00 PM', 'Ladies\u2019 transport departs', 'Drops to home or station, arranged by the Transport team'),
      S(1, '9:30 PM', 'Overnight stay & campfire night', 'Priority rooms for Platinum, then Gold'),
      S(2, '6:30 AM', 'Sunrise beach walk', 'Optional'),
      S(2, '8:30 AM', 'Breakfast'),
      S(2, '10:00 AM', 'What next?', 'Batch fund, WhatsApp groups, next reunion'),
      S(2, '11:00 AM', 'Checkout & departures', 'Dedicated drops for Platinum guests')
    ],
    tasks: [
      T('overall', 'Weekly committee call', 'done'), T('overall', 'Fix the reunion date', 'doing'), T('overall', 'Confirm final venue after the poll'), T('overall', 'Agree contribution per head', 'doing'),
      T('telecalling', 'Build the full batch contact list', 'done'), T('telecalling', 'First round of calls to all batchmates', 'doing'), T('telecalling', 'Reminder calls one week before'),
      T('food', 'Shortlist caterers', 'doing'), T('food', 'Menus for all 5 meals'), T('food', 'Final veg / non-veg counts from RSVPs'),
      T('hospitality', 'Registration desk & name badges'), T('hospitality', 'Rooms for overnight stay', 'doing'), T('hospitality', 'Welcome kits & mementos'),
      T('transport', 'Pickup points & vehicles', 'doing'), T('transport', 'Ladies\u2019 evening drop plan'), T('transport', 'Day 2 departures'),
      T('media', 'Collect old photos for slideshow', 'doing'), T('media', 'Book photographer & videographer'), T('media', 'Plan the batch group photo'),
      T('arrangements', 'Visit shortlisted resorts', 'done'), T('arrangements', 'Book the venue'), T('arrangements', 'Stage, sound & lights'), T('arrangements', 'Banner & backdrop'),
      T('finance', 'Open collection account', 'done'), T('finance', 'Collect contributions', 'doing'), T('finance', 'Track and share expenses')
    ]
  };
}

// ==================================================================== storage
let db = null;
let pool = null;
if (process.env.DATABASE_URL) {
  const { Pool } = require('pg');
  const url = process.env.DATABASE_URL;
  pool = new Pool({ connectionString: url, ssl: /localhost|127\.0\.0\.1/.test(url) ? false : { rejectUnauthorized: false }, max: 3 });
}

async function loadDb() {
  let data = null;
  if (pool) {
    await pool.query('create table if not exists app_state (id int primary key, data jsonb not null, updated_at timestamptz default now())');
    const r = await pool.query('select data from app_state where id = 1');
    data = r.rows[0] ? r.rows[0].data : null;
  } else {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    try { data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } catch { data = null; }
  }
  const d = defaultDb();
  if (data && data.v === 3) {
    // v4: team elections restart empty with public nominations; keep the rest
    const keep = {};
    for (const e of data.elections || []) if (e.id === 'women' || e.id === 'venue') keep[e.id] = { openNominations: false, confirmedId: null, ...e };
    const elections = d.elections.map(e => keep[e.id] || e);
    const votes = Object.fromEntries(Object.entries(data.votes || {}).filter(([k]) => keep[k]));
    return { ...d, elections, votes, rsvps: data.rsvps || {}, schedule: data.schedule || d.schedule, tasks: data.tasks || d.tasks,
      auto: { ...d.auto, ...data.auto }, settings: { ...d.settings, ...data.settings } };
  }
  if (data && data.v === 2) {
    // upgrade: new teams, tasks and settings; keep registrations, live votes and the clock
    const keep = new Set(d.elections.filter(e => e.mode === 'live').map(e => e.id));
    const votes = Object.fromEntries(Object.entries(data.votes || {}).filter(([k]) => keep.has(k)));
    return { ...d, rsvps: data.rsvps || {}, votes, auto: { ...d.auto, ...data.auto },
      settings: { ...d.settings, ...data.settings, regBaseMale: d.settings.regBaseMale, regBaseFemale: d.settings.regBaseFemale, venueStatus: d.settings.venueStatus } };
  }
  if (data && data.v === 4) {
    // v5: passes and the pass-based schedule
    data = { ...data, v: 5, schedule: d.schedule, settings: { ...data.settings, passes: d.settings.passes, passBase: d.settings.passBase } };
  }
  if (!data || data.v !== 5) return d;
  return { ...d, ...data, chat: data.chat || d.chat, settings: { ...d.settings, ...data.settings }, auto: { ...d.auto, ...data.auto } };
}

let saveTimer = null;
let saveChain = Promise.resolve();
function saveDb() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flush, 300);
}
function flush() {
  clearTimeout(saveTimer);
  const json = JSON.stringify(db);
  if (pool) {
    saveChain = saveChain
      .then(() => pool.query('insert into app_state (id, data, updated_at) values (1, $1, now()) on conflict (id) do update set data = excluded.data, updated_at = now()', [json]))
      .catch(e => console.error('Save failed:', e.message));
  } else {
    fs.writeFileSync(DB_FILE + '.tmp', json);
    fs.renameSync(DB_FILE + '.tmp', DB_FILE);
  }
  return saveChain;
}

// ================================================================ vote engine
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hash(...nums) {
  let h = 2166136261;
  for (const n of nums) { h ^= n >>> 0; h = Math.imul(h, 16777619); }
  return h >>> 0;
}
const strHash = s => hash(...[...String(s)].map(ch => ch.charCodeAt(0)));
function distribute(n, weights) {
  const sum = weights.reduce((a, b) => a + b, 0) || 1;
  const raw = weights.map(w => (w / sum) * n);
  const out = raw.map(Math.floor);
  const rem = n - out.reduce((a, b) => a + b, 0);
  const order = raw.map((x, i) => [x - out[i], i]).sort((a, b) => b[0] - a[0]);
  for (let k = 0; k < rem; k++) out[order[k % order.length][1]]++;
  return out;
}

const simCaches = new Map();
function simulate(e, upto) {
  const A = db.auto;
  const ids = e.candidates.map(c => c.id);
  if (!ids.length) return [];
  const key = JSON.stringify([A.seed, A.startAt, A.intervalMin, e.favoriteId, e.cap, e.dipEvery, e.rateMin, e.rateMax, e.startTotal, e.afterCap, ids]);
  let cache = simCaches.get(e.id);
  if (!cache || cache.key !== key) { cache = { key, snaps: [] }; simCaches.set(e.id, cache); }
  const snaps = cache.snaps;
  const seed = hash(A.seed, strHash(e.id));
  const fav = ids.includes(e.favoriteId) ? e.favoriteId : null;
  const others = fav ? ids.filter(i => i !== fav) : ids;
  const interval = A.intervalMin * 60 * 1000;
  const r0 = rng(hash(seed, 0));
  const base = others.map(() => 0.7 + r0() * 0.6);

  if (!snaps.length) {
    const c = Object.fromEntries(ids.map(i => [i, 0]));
    const start = Math.min(e.startTotal, e.cap);
    if (fav) {
      c[fav] = others.length ? Math.round(start * Math.min(0.5, 1.3 / ids.length)) : start;
      if (others.length) distribute(start - c[fav], base).forEach((v, i) => (c[others[i]] += v));
      for (let g = 0; g < 1000 && others.length; g++) {
        const top = others.reduce((x, y) => (c[y] > c[x] ? y : x));
        if (c[fav] >= c[top] + 4 || c[top] === 0) break;
        c[top]--; c[fav]++;
      }
    } else {
      distribute(start, base).forEach((v, i) => (c[others[i]] += v));
    }
    snaps.push(c);
  }

  for (let k = snaps.length; k <= upto; k++) {
    const r = rng(hash(seed, k));
    const c = { ...snaps[k - 1] };
    const total = Object.values(c).reduce((x, y) => x + y, 0);
    const istHour = new Date(A.startAt + k * interval + 5.5 * HOUR).getUTCHours();
    const factor = istHour < 6 ? 0.25 : istHour < 9 ? 0.6 : istHour >= 23 ? 0.5 : 1;
    let n = Math.round((e.rateMin + r() * Math.max(0, e.rateMax - e.rateMin)) * factor);
    n = Math.max(0, Math.min(n, e.cap - total));

    if (!fav) {
      if (n > 0) distribute(n, base.map(b => b * (0.5 + r()))).forEach((v, i) => (c[others[i]] += v));
    } else if (n > 0 && others.length) {
      const rival = others.reduce((x, y) => (c[y] > c[x] ? y : x));
      if (e.dipEvery > 1 && k % e.dipEvery === 0) {
        const g = Math.min(n, Math.max(0, c[fav] - c[rival] + 1 + Math.floor(r() * 3)));
        c[rival] += g;
        let rem = n - g;
        const favBit = Math.min(rem, Math.floor(r() * 2));
        c[fav] += favBit; rem -= favBit;
        const rest = others.filter(o => o !== rival);
        if (rest.length) distribute(rem, rest.map(() => 0.6 + r() * 0.8)).forEach((v, i) => (c[rest[i]] += v));
        else c[rival] += rem;
      } else {
        const target = 4 + Math.floor(r() * 7);
        const w = base.map(b => b * (0.6 + r() * 0.8));
        let x = n;
        for (let t = 0; t <= n; t++) {
          const d = distribute(n - t, w);
          if (c[fav] + t - Math.max(...others.map((o, i) => c[o] + d[i])) >= target) { x = t; break; }
        }
        x = Math.min(x, Math.ceil(n * 0.7));
        if (x === 0 && n >= 4) x = 1;
        c[fav] += x;
        distribute(n - x, w).forEach((v, i) => (c[others[i]] += v));
      }
    } else if (n > 0) {
      c[fav] += n;
    } else if (e.afterCap === 'shuffle' && others.length && total >= e.cap) {
      const rival = others.reduce((x, y) => (c[y] > c[x] ? y : x));
      if (e.dipEvery > 1 && k % e.dipEvery === 0) {
        const d = Math.min(c[fav], Math.max(0, Math.floor((c[fav] - c[rival]) / 2) + 1 + Math.floor(r() * 2)));
        c[fav] -= d; c[rival] += d;
      } else {
        const target = 4 + Math.floor(r() * 7);
        const lead = c[fav] - c[rival];
        if (lead < target) {
          let d = Math.min(Math.max(2, Math.round(e.rateMax * factor)), Math.ceil((target - lead) / 2));
          while (d-- > 0) {
            const top = others.reduce((x, y) => (c[y] > c[x] ? y : x));
            if (c[top] <= 0) break;
            c[top]--; c[fav]++;
          }
        }
        if (others.length > 1 && factor >= 0.6) {
          const i = Math.floor(r() * others.length);
          const j = (i + 1 + Math.floor(r() * (others.length - 1))) % others.length;
          const m = Math.min(c[others[i]], 1 + Math.floor(r() * 3));
          c[others[i]] -= m; c[others[j]] += m;
        }
      }
    }
    snaps.push(c);
  }
  return snaps;
}

function currentSlot() {
  const A = db.auto;
  if (!A.on) return A.frozenSlot;
  return Math.max(0, Math.floor((Date.now() - A.startAt) / (A.intervalMin * 60 * 1000)));
}

function electionView(e, voterId, slot, admin = false) {
  const real = db.votes[e.id] || {};
  const myVote = voterId && real[voterId] ? real[voterId].c : null;
  const counts = {}, last = {};
  let hasHistory = false;
  if (e.mode === 'scripted') {
    const snaps = simulate(e, slot);
    const s = snaps[slot] || {}, p = slot > 0 ? snaps[slot - 1] : null;
    hasHistory = !!p;
    for (const c of e.candidates) { counts[c.id] = s[c.id] || 0; last[c.id] = p ? (s[c.id] || 0) - (p[c.id] || 0) : 0; }
    if (myVote && counts[myVote] !== undefined) counts[myVote] += 1;
  } else {
    const hourAgo = Date.now() - HOUR;
    for (const c of e.candidates) { counts[c.id] = 0; last[c.id] = 0; }
    for (const v of Object.values(real)) {
      if (counts[v.c] === undefined) continue;
      counts[v.c]++;
      if (v.t > hourAgo) { last[v.c]++; hasHistory = true; }
    }
  }
  const realCounts = {};
  if (admin) for (const v of Object.values(real)) realCounts[v.c] = (realCounts[v.c] || 0) + 1;
  const candidates = e.candidates.map((c, i) => ({
    id: c.id, name: c.name, note: c.note || '',
    votes: Math.max(0, counts[c.id] + (c.offset || 0)),
    lastHour: last[c.id], i,
    ...(admin ? { offset: c.offset || 0, real: realCounts[c.id] || 0, by: c.by || 'admin' } : {})
  })).sort((a, b) => b.votes - a.votes || a.i - b.i);
  const conf = e.confirmedId && e.candidates.find(c => c.id === e.confirmedId);
  const out = {
    id: e.id, kind: e.kind, title: e.title, desc: e.desc, mode: e.mode, live: e.mode === 'live',
    confirmed: conf ? { id: conf.id, name: conf.name } : null, openNominations: !!e.openNominations && !conf,
    candidates, total: candidates.reduce((s, c) => s + c.votes, 0), myVote, hasHistory
  };
  if (admin) Object.assign(out, { confirmedId: e.confirmedId || null, openNominationsSetting: !!e.openNominations, favoriteId: e.favoriteId, cap: e.cap, dipEvery: e.dipEvery, rateMin: e.rateMin, rateMax: e.rateMax, startTotal: e.startTotal, afterCap: e.afterCap, realVoters: Object.keys(real).length });
  return out;
}

function publicState(voterId) {
  const slot = currentSlot();
  const interval = db.auto.intervalMin * 60 * 1000;
  const myRsvp = voterId ? Object.values(db.rsvps).find(r => r.voterId === voterId) || null : null;
  const tasksBy = {};
  for (const t of db.tasks) {
    const b = (tasksBy[t.electionId] ||= { total: 0, done: 0, items: [] });
    b.total++; if (t.status === 'done') b.done++;
    b.items.push({ title: t.title, status: t.status });
  }
  const meId = myRsvp ? myRsvp.id : null;
  return {
    chatUnread: meId ? db.chat.messages.filter(m => m.to === meId && !m.read).length : 0,
    settings: db.settings,
    updatedAt: db.auto.startAt + slot * interval,
    elections: db.elections.map(e => electionView(e, voterId, slot)),
    schedule: db.schedule,
    tasks: tasksBy,
    rsvpCount: Object.keys(db.rsvps).length,
    regShown: (() => {
      const R = Object.values(db.rsvps);
      const male = (db.settings.regBaseMale || 0) + R.filter(r => r.gender === 'male').length;
      const female = (db.settings.regBaseFemale || 0) + R.filter(r => r.gender === 'female').length;
      const base = db.settings.passBase || {};
      const passes = Object.fromEntries(['platinum', 'gold', 'silver'].map(p => [p, (base[p] || 0) + R.filter(r => (r.pass || 'silver') === p).length]));
      return { male, female, total: male + female + R.filter(r => !r.gender).length, passes };
    })(),
    myRsvp: myRsvp && { name: myRsvp.name, gender: myRsvp.gender, pass: myRsvp.pass || 'silver', branch: myRsvp.branch, phone: myRsvp.phone, city: myRsvp.city, attend: myRsvp.attend, overnight: myRsvp.overnight, pickup: myRsvp.pickup, food: myRsvp.food }
  };
}

// ======================================================================= app
const app = express();
app.use(express.json({ limit: '200kb' }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

function voterIdOf(req, res) {
  let id = req.cookies.vid;
  if (!id || !/^[0-9a-f-]{36}$/.test(id)) {
    id = crypto.randomUUID();
    res.cookie('vid', id, { maxAge: 2 * 365 * 24 * HOUR, httpOnly: true, sameSite: 'lax' });
  }
  return id;
}
const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const num = (v, lo, hi) => (v !== '' && v !== null && Number.isFinite(+v) ? Math.min(hi, Math.max(lo, Math.round(+v))) : undefined);
const findElection = id => db.elections.find(e => e.id === id);

app.get('/api/state', (req, res) => res.json(publicState(voterIdOf(req, res))));

app.post('/api/vote', (req, res) => {
  const vid = voterIdOf(req, res);
  if (!db.settings.votingOpen) return res.status(403).json({ error: 'Voting is closed' });
  const e = findElection(req.body.electionId);
  if (!e) return res.status(404).json({ error: 'Election not found' });
  if (!e.candidates.some(c => c.id === req.body.candidateId)) return res.status(404).json({ error: 'Candidate not found' });
  if (e.confirmedId) return res.status(403).json({ error: 'This coordinator is already confirmed' });
  const box = (db.votes[e.id] ||= {});
  if (box[vid]) return res.status(409).json({ error: 'You have already voted in this election' });
  box[vid] = { c: req.body.candidateId, t: Date.now() };
  saveDb();
  res.json(publicState(vid));
});

app.post('/api/nominate', (req, res) => {
  const vid = voterIdOf(req, res);
  const e = findElection(req.body.electionId);
  if (!e) return res.status(404).json({ error: 'Election not found' });
  if (!db.settings.votingOpen || !e.openNominations || e.confirmedId) return res.status(403).json({ error: 'Nominations are closed for this role' });
  const name = str(req.body.name, 40).replace(/\s+/g, ' ');
  if (name.length < 2) return res.status(400).json({ error: 'Please enter a name' });
  if (e.candidates.some(c => c.name.toLowerCase() === name.toLowerCase())) return res.status(409).json({ error: `${name} is already nominated` });
  if (e.candidates.length >= 15) return res.status(409).json({ error: 'This role already has the maximum number of nominees' });
  const mine = ((db.nominations ||= {})[e.id] ||= {});
  if ((mine[vid] || 0) >= 2) return res.status(429).json({ error: 'You can add up to 2 nominees per role' });
  mine[vid] = (mine[vid] || 0) + 1;
  e.candidates.push(cand(name, str(req.body.note, 60), 'public'));
  saveDb();
  res.json(publicState(vid));
});

// ======================================================================= chat
const PLANS = [
  { id: 'p10', name: 'Starter', messages: 10, price: 299 },
  { id: 'p50', name: 'Plus', messages: 50, price: 599 },
  { id: 'unl', name: 'Unlimited', messages: null, price: 999 }
];
const lastSend = new Map();
function chatMe(req, res) {
  const vid = voterIdOf(req, res);
  const r = Object.values(db.rsvps).find(x => x.voterId === vid);
  if (!r) return { vid, rsvp: null, u: null };
  const u = (db.chat.users[r.id] ||= { consentAt: null, status: 'none', plan: null, limit: 0, used: 0, requestedAt: null });
  return { vid, rsvp: r, u };
}
function chatView(rsvp, u) {
  const me = rsvp.id;
  const peers = new Map();
  for (const m of db.chat.messages) {
    if (m.from !== me && m.to !== me) continue;
    const p = m.from === me ? m.to : m.from;
    const c = peers.get(p) || { unread: 0 };
    c.last = m.text; c.t = m.t; c.mine = m.from === me;
    if (m.to === me && !m.read) c.unread++;
    peers.set(p, c);
  }
  const plan = PLANS.find(p => p.id === u.plan) || null;
  return {
    registered: true, name: rsvp.name, consent: !!u.consentAt, status: u.status, plan, requested: PLANS.find(p => p.id === u.requested) || null,
    left: u.status === 'active' ? (plan && plan.messages === null ? null : Math.max(0, u.limit - u.used)) : 0,
    plans: PLANS,
    conversations: [...peers.entries()].filter(([p]) => db.rsvps[p]).map(([p, c]) => ({ id: p, name: db.rsvps[p].name, branch: db.rsvps[p].branch, ...c })).sort((a, b) => b.t - a.t)
  };
}
app.get('/api/chat', (req, res) => {
  const { rsvp, u } = chatMe(req, res);
  if (!rsvp) return res.json({ registered: false });
  res.json(chatView(rsvp, u));
});
app.post('/api/chat/consent', (req, res) => {
  const { rsvp, u } = chatMe(req, res);
  if (!rsvp) return res.status(403).json({ error: 'Please register first' });
  if (req.body.agree !== true) return res.status(400).json({ error: 'Please accept the chat rules' });
  u.consentAt = Date.now();
  saveDb(); res.json(chatView(rsvp, u));
});
app.post('/api/chat/request', (req, res) => {
  const { rsvp, u } = chatMe(req, res);
  if (!rsvp || !u.consentAt) return res.status(403).json({ error: 'Please accept the chat rules first' });
  if (req.body.cancel) { if (u.status === 'pending') { u.status = 'none'; u.requested = null; } saveDb(); return res.json(chatView(rsvp, u)); }
  const plan = PLANS.find(p => p.id === req.body.plan);
  if (!plan) return res.status(400).json({ error: 'Choose a plan' });
  if (u.status === 'active' && (!PLANS.find(p => p.id === u.plan) || PLANS.find(p => p.id === u.plan).messages === null)) return res.status(409).json({ error: 'You already have unlimited messages' });
  u.requested = plan.id; u.requestedAt = Date.now();
  if (u.status !== 'active') u.status = 'pending';
  saveDb(); res.json(chatView(rsvp, u));
});
app.get('/api/chat/people', (req, res) => {
  const { rsvp, u } = chatMe(req, res);
  if (!rsvp || !u.consentAt) return res.status(403).json({ error: 'Please accept the chat rules first' });
  res.json(Object.values(db.rsvps).filter(r => r.voterId && r.id !== rsvp.id).map(r => ({ id: r.id, name: r.name, branch: r.branch, city: r.city })).sort((a, b) => a.name.localeCompare(b.name)));
});
app.get('/api/chat/thread/:id', (req, res) => {
  const { rsvp, u } = chatMe(req, res);
  if (!rsvp || !u.consentAt) return res.status(403).json({ error: 'Please accept the chat rules first' });
  const peer = db.rsvps[req.params.id];
  if (!peer) return res.status(404).json({ error: 'Batchmate not found' });
  const me = rsvp.id;
  let changed = false;
  const msgs = db.chat.messages.filter(m => (m.from === me && m.to === peer.id) || (m.from === peer.id && m.to === me)).map(m => {
    if (m.to === me && !m.read) { m.read = true; changed = true; }
    return { id: m.id, mine: m.from === me, text: m.text, t: m.t };
  });
  if (changed) saveDb();
  res.json({ peer: { id: peer.id, name: peer.name, branch: peer.branch, city: peer.city }, messages: msgs, chat: chatView(rsvp, u) });
});
app.post('/api/chat/send', (req, res) => {
  const { rsvp, u } = chatMe(req, res);
  if (!rsvp || !u.consentAt) return res.status(403).json({ error: 'Please accept the chat rules first' });
  if (u.status !== 'active') return res.status(402).json({ error: 'Choose a plan to send messages' });
  const plan = PLANS.find(p => p.id === u.plan);
  if (plan && plan.messages !== null && u.used >= u.limit) return res.status(402).json({ error: 'You have used all your messages. Choose a new plan to continue.' });
  const peer = db.rsvps[req.body.to];
  if (!peer || !peer.voterId || peer.id === rsvp.id) return res.status(404).json({ error: 'Batchmate not found' });
  const text = str(req.body.text, 500);
  if (!text) return res.status(400).json({ error: 'Type a message' });
  const now = Date.now();
  if (now - (lastSend.get(rsvp.id) || 0) < 1500) return res.status(429).json({ error: 'Slow down a little' });
  lastSend.set(rsvp.id, now);
  db.chat.messages.push({ id: newId(), from: rsvp.id, to: peer.id, text, t: now, read: false });
  if (db.chat.messages.length > 20000) db.chat.messages.splice(0, db.chat.messages.length - 20000);
  u.used++;
  saveDb();
  res.json({ ok: true });
});

function cleanRsvp(b) {
  const phone = String(b.phone || '').replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '');
  const r = {
    name: str(b.name, 80), gender: b.gender === 'female' ? 'female' : b.gender === 'male' ? 'male' : '', branch: str(b.branch, 30), phone, city: str(b.city, 60),
    attend: b.attend === 'day1' ? 'day1' : 'both',
    pass: ['platinum', 'gold', 'silver'].includes(b.pass) ? b.pass : 'silver',
    overnight: !!b.overnight, pickup: str(b.pickup, 60), food: b.food === 'veg' ? 'veg' : 'nonveg'
  };
  if (r.attend === 'day1') r.overnight = false;
  if (r.name.length < 2) throw new Error('Please enter your full name');
  if (!r.gender) throw new Error('Please choose Male or Female');
  if (!/^\d{10}$/.test(r.phone)) throw new Error('Please enter a 10-digit mobile number');
  return r;
}

app.post('/api/rsvp', (req, res) => {
  const vid = voterIdOf(req, res);
  if (!db.settings.rsvpOpen) return res.status(403).json({ error: 'Registrations are closed' });
  let data;
  try { data = cleanRsvp(req.body); } catch (e) { return res.status(400).json({ error: e.message }); }
  const existing = Object.values(db.rsvps).find(r => r.voterId === vid);
  if (existing) Object.assign(existing, data, { updatedAt: Date.now() });
  else {
    const id = newId();
    db.rsvps[id] = { id, voterId: vid, ...data, source: 'self', callStatus: 'new', note: '', createdAt: Date.now(), updatedAt: Date.now() };
  }
  saveDb();
  res.json(publicState(vid));
});

// ===================================================================== admin
function requireAdmin(req, res, next) {
  const a = Buffer.from(String(req.get('x-admin-password') || ''));
  const b = Buffer.from(ADMIN_PASSWORD);
  if (a.length === b.length && crypto.timingSafeEqual(a, b)) return next();
  res.status(401).json({ error: 'Wrong admin password' });
}
const A = express.Router();
A.use(requireAdmin);

A.post('/login', (req, res) => res.json({ ok: true }));

A.get('/state', (req, res) => {
  const slot = currentSlot();
  const interval = db.auto.intervalMin * 60 * 1000;
  const elections = db.elections.map(e => {
    const v = electionView(e, null, slot, true);
    if (e.mode === 'scripted' && e.candidates.length) {
      const snaps = simulate(e, slot);
      const names = Object.fromEntries(e.candidates.map(c => [c.id, c.name]));
      v.history = [];
      for (let k = slot; k >= Math.max(0, slot - 9); k--) {
        const ranked = Object.entries(snaps[k]).sort((x, y) => y[1] - x[1]);
        v.history.push({ at: db.auto.startAt + k * interval, line: ranked.map(([id, n]) => `${names[id].split(' ')[0]} ${n}`).join(' · ') });
      }
    }
    return v;
  });
  res.json({
    settings: db.settings, auto: db.auto, storage: pool ? 'postgres' : 'file',
    updatedAt: db.auto.startAt + slot * interval,
    nextUpdateAt: db.auto.on ? db.auto.startAt + (slot + 1) * interval : null,
    elections, schedule: db.schedule, tasks: db.tasks,
    rsvps: Object.values(db.rsvps).sort((a, b) => b.createdAt - a.createdAt).map(({ voterId, ...r }) => r),
    chat: {
      plans: PLANS,
      users: Object.entries(db.chat.users).filter(([id]) => db.rsvps[id]).map(([id, u]) => ({ id, name: db.rsvps[id].name, branch: db.rsvps[id].branch, ...u }))
        .sort((a, b) => (b.requestedAt || 0) - (a.requestedAt || 0)),
      messages: db.chat.messages.slice(-300).reverse().map(m => ({ ...m, fromName: db.rsvps[m.from]?.name || '—', toName: db.rsvps[m.to]?.name || '—' }))
    }
  });
});

A.put('/settings', (req, res) => {
  const b = req.body, s = db.settings;
  for (const k of ['regBaseMale', 'regBaseFemale']) if (num(b[k], 0, 100000) !== undefined) s[k] = num(b[k], 0, 100000);
  for (const k of ['eventTitle', 'collegeName', 'collegeFull', 'location', 'years', 'eventDate', 'announcement', 'venueStatus']) {
    if (typeof b[k] === 'string') s[k] = b[k].slice(0, 300);
  }
  if (num(b.expected, 0, 100000) !== undefined) s.expected = num(b.expected, 0, 100000);
  for (const k of ['branches', 'pickupPoints']) {
    if (Array.isArray(b[k])) s[k] = b[k].map(x => str(x, 60)).filter(Boolean).slice(0, 30);
  }
  for (const k of ['votingOpen', 'rsvpOpen']) if (typeof b[k] === 'boolean') s[k] = b[k];
  if (Array.isArray(b.passes)) {
    s.passes = s.passes.map(p => {
      const n = b.passes.find(x => x && x.id === p.id);
      if (!n) return p;
      return { ...p, name: str(n.name, 30) || p.name, price: str(n.price, 30), tagline: str(n.tagline, 80),
        benefits: Array.isArray(n.benefits) ? n.benefits.map(x => str(x, 120)).filter(Boolean).slice(0, 15) : p.benefits };
    });
  }
  if (b.passBase && typeof b.passBase === 'object') {
    s.passBase = { ...s.passBase };
    for (const k of ['platinum', 'gold', 'silver']) { const v = num(b.passBase[k], 0, 100000); if (v !== undefined) s.passBase[k] = v; }
  }
  saveDb();
  res.json({ ok: true });
});

A.put('/auto', (req, res) => {
  const a = db.auto, b = req.body;
  const before = currentSlot();
  const iv = num(b.intervalMin, 1, 1440);
  if (iv !== undefined && iv !== a.intervalMin) {
    a.intervalMin = iv;
    if (a.on) a.startAt = Date.now() - before * iv * 60 * 1000;
  }
  if (typeof b.on === 'boolean' && b.on !== a.on) {
    if (!b.on) a.frozenSlot = before;
    else a.startAt = Date.now() - a.frozenSlot * a.intervalMin * 60 * 1000;
    a.on = b.on;
  }
  saveDb();
  res.json({ ok: true });
});
A.post('/auto/step', (req, res) => {
  if (db.auto.on) db.auto.startAt -= db.auto.intervalMin * 60 * 1000; else db.auto.frozenSlot += 1;
  saveDb(); res.json({ ok: true });
});
A.post('/auto/restart', (req, res) => {
  db.auto.startAt = Date.now(); db.auto.frozenSlot = 0; db.auto.seed = crypto.randomInt(1, 2 ** 31);
  saveDb(); res.json({ ok: true });
});

// elections
A.post('/elections', (req, res) => {
  const title = str(req.body.title, 80);
  if (!title) return res.status(400).json({ error: 'Title is required' });
  const e = role(newId(), title, str(req.body.desc, 300));
  db.elections.push(e);
  saveDb(); res.json(e);
});
A.put('/elections/:id', (req, res) => {
  const e = findElection(req.params.id);
  if (!e) return res.status(404).json({ error: 'Not found' });
  const b = req.body;
  if (str(b.title, 80)) e.title = str(b.title, 80);
  if (typeof b.desc === 'string') e.desc = str(b.desc, 300);
  if (b.mode === 'live' || b.mode === 'scripted') e.mode = b.mode;
  if (typeof b.openNominations === 'boolean') e.openNominations = b.openNominations;
  if (b.confirmedId === null || b.confirmedId === '') e.confirmedId = null;
  else if (e.candidates.some(c => c.id === b.confirmedId)) e.confirmedId = b.confirmedId;
  if (b.favoriteId === null || b.favoriteId === '') e.favoriteId = null;
  else if (e.candidates.some(c => c.id === b.favoriteId)) e.favoriteId = b.favoriteId;
  for (const [k, lo, hi] of [['cap', 0, 100000], ['dipEvery', 0, 1000], ['rateMin', 0, 1000], ['rateMax', 0, 1000], ['startTotal', 0, 100000]]) {
    const v = num(b[k], lo, hi); if (v !== undefined) e[k] = v;
  }
  if (e.rateMax < e.rateMin) e.rateMax = e.rateMin;
  if (b.afterCap === 'hold' || b.afterCap === 'shuffle') e.afterCap = b.afterCap;
  if (b.move === 'up' || b.move === 'down') {
    const i = db.elections.indexOf(e), j = b.move === 'up' ? i - 1 : i + 1;
    if (j >= 0 && j < db.elections.length) [db.elections[i], db.elections[j]] = [db.elections[j], db.elections[i]];
  }
  saveDb(); res.json({ ok: true });
});
A.delete('/elections/:id', (req, res) => {
  db.elections = db.elections.filter(e => e.id !== req.params.id);
  delete db.votes[req.params.id];
  db.tasks = db.tasks.filter(t => t.electionId !== req.params.id);
  saveDb(); res.json({ ok: true });
});
A.post('/elections/:id/reset-votes', (req, res) => {
  delete db.votes[req.params.id];
  const e = findElection(req.params.id);
  if (e) e.candidates.forEach(c => (c.offset = 0));
  saveDb(); res.json({ ok: true });
});
A.post('/elections/:id/candidates', (req, res) => {
  const e = findElection(req.params.id);
  if (!e) return res.status(404).json({ error: 'Not found' });
  const name = str(req.body.name, 60);
  if (!name) return res.status(400).json({ error: 'Name is required' });
  e.candidates.push(cand(name, str(req.body.note, 80)));
  saveDb(); res.json({ ok: true });
});
A.put('/elections/:id/candidates/:cid', (req, res) => {
  const e = findElection(req.params.id);
  const c = e && e.candidates.find(x => x.id === req.params.cid);
  if (!c) return res.status(404).json({ error: 'Not found' });
  if (str(req.body.name, 60)) c.name = str(req.body.name, 60);
  if (typeof req.body.note === 'string') c.note = str(req.body.note, 80);
  if (req.body.clear) c.offset = 0;
  else if (Number.isFinite(req.body.delta)) c.offset = (c.offset || 0) + Math.round(req.body.delta);
  saveDb(); res.json({ ok: true });
});
A.delete('/elections/:id/candidates/:cid', (req, res) => {
  const e = findElection(req.params.id);
  if (!e) return res.status(404).json({ error: 'Not found' });
  e.candidates = e.candidates.filter(c => c.id !== req.params.cid);
  if (e.favoriteId === req.params.cid) e.favoriteId = null;
  if (e.confirmedId === req.params.cid) e.confirmedId = null;
  const box = db.votes[e.id] || {};
  for (const [v, x] of Object.entries(box)) if (x.c === req.params.cid) delete box[v];
  saveDb(); res.json({ ok: true });
});

// RSVPs
A.post('/rsvps', (req, res) => {
  let data;
  try { data = cleanRsvp(req.body); } catch (e) { return res.status(400).json({ error: e.message }); }
  const id = newId();
  db.rsvps[id] = { id, voterId: null, ...data, source: 'call', callStatus: req.body.callStatus || 'confirmed', note: str(req.body.note, 300), createdAt: Date.now(), updatedAt: Date.now() };
  saveDb(); res.json({ ok: true });
});
A.put('/rsvps/:id', (req, res) => {
  const r = db.rsvps[req.params.id];
  if (!r) return res.status(404).json({ error: 'Not found' });
  if (['new', 'confirmed', 'not_reachable', 'declined'].includes(req.body.callStatus)) r.callStatus = req.body.callStatus;
  if (['platinum', 'gold', 'silver'].includes(req.body.pass)) r.pass = req.body.pass;
  if (typeof req.body.note === 'string') r.note = str(req.body.note, 300);
  r.updatedAt = Date.now();
  saveDb(); res.json({ ok: true });
});
A.delete('/rsvps/:id', (req, res) => {
  delete db.rsvps[req.params.id];
  saveDb(); res.json({ ok: true });
});

// chat moderation
A.post('/chat/:id', (req, res) => {
  const u = db.chat.users[req.params.id];
  if (!u) return res.status(404).json({ error: 'Not found' });
  const a = req.body.action;
  if (a === 'approve') {
    const plan = PLANS.find(p => p.id === (req.body.plan || u.requested));
    if (!plan) return res.status(400).json({ error: 'Choose a plan' });
    const sameKind = u.status === 'active' && u.plan === plan.id;
    u.plan = plan.id; u.status = 'active'; u.requested = null;
    u.limit = plan.messages === null ? 0 : (sameKind ? u.limit : u.used) + plan.messages;
  } else if (a === 'decline') { u.status = u.plan ? 'active' : 'declined'; u.requested = null; }
  else if (a === 'revoke') { u.status = 'revoked'; u.requested = null; }
  else return res.status(400).json({ error: 'Unknown action' });
  saveDb(); res.json({ ok: true });
});
A.delete('/chat/messages/:id', (req, res) => {
  db.chat.messages = db.chat.messages.filter(m => m.id !== req.params.id);
  saveDb(); res.json({ ok: true });
});

// plan
A.put('/schedule', (req, res) => {
  if (!Array.isArray(req.body.items)) return res.status(400).json({ error: 'items required' });
  db.schedule = req.body.items.slice(0, 60).map(x => ({
    id: str(x.id, 20) || newId(), day: x.day === 2 || x.day === '2' ? 2 : 1,
    time: str(x.time, 20), title: str(x.title, 80), note: str(x.note, 160), tag: str(x.tag, 30)
  })).filter(x => x.title);
  saveDb(); res.json({ ok: true });
});
A.post('/tasks', (req, res) => {
  const title = str(req.body.title, 120);
  if (!title || !findElection(req.body.electionId)) return res.status(400).json({ error: 'Title and team are required' });
  db.tasks.push({ id: newId(), electionId: req.body.electionId, title, status: 'todo' });
  saveDb(); res.json({ ok: true });
});
A.put('/tasks/:id', (req, res) => {
  const t = db.tasks.find(x => x.id === req.params.id);
  if (!t) return res.status(404).json({ error: 'Not found' });
  if (['todo', 'doing', 'done'].includes(req.body.status)) t.status = req.body.status;
  if (str(req.body.title, 120)) t.title = str(req.body.title, 120);
  saveDb(); res.json({ ok: true });
});
A.delete('/tasks/:id', (req, res) => {
  db.tasks = db.tasks.filter(t => t.id !== req.params.id);
  saveDb(); res.json({ ok: true });
});

app.use('/api/admin', A);
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/healthz', (req, res) => res.send('ok'));
app.use((err, req, res, next) => res.status(400).json({ error: err.message || 'Something went wrong' }));

async function main() {
  db = await loadDb();
  await flush();
  app.listen(PORT, () => {
    console.log(`Running on http://localhost:${PORT}  (admin: /admin)  storage: ${pool ? 'postgres' : 'file'}`);
    if (!process.env.ADMIN_PASSWORD) console.log('WARNING: default admin password "admin123" - set ADMIN_PASSWORD');
  });
}
for (const sig of ['SIGTERM', 'SIGINT']) {
  process.on(sig, async () => { try { if (db) await flush(); } finally { process.exit(0); } });
}
if (require.main === module) main().catch(e => { console.error(e); process.exit(1); });
module.exports = { simulate, init: async () => (db = await loadDb()), getDb: () => db };
