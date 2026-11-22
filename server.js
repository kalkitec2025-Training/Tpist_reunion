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
// privacy: outside live polls, people are shown as an initial plus stars
const mask = name => (String(name || '?').trim().charAt(0).toUpperCase() || '?') + '*'.repeat(10);
// registration list format: first initial + 6 stars + second initial + 5 stars, e.g. Ravi Kumar -> R******K*****
function maskFull(name, key = '') {
  const w = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!w.length) return '?************';
  const a = w[0].charAt(0).toUpperCase();
  const b = (w.length > 1 ? w[w.length - 1].charAt(0) : w[0].charAt(w[0].length - 1)).toUpperCase();
  // the second letter lands in a different place per person (3rd, 5th, 7th or 8th), always 13 characters
  const pos = [2, 4, 6, 7][strHash(key || name) % 4];
  const out = Array(13).fill('*'); out[0] = a; out[pos] = b;
  return out.join('');
}

// =================================================================== defaults
const role = (id, title, desc, extra = {}) => ({
  id, kind: 'role', title, desc, mode: 'live', status: 'upcoming', candidates: [], openNominations: true, confirmedId: null,
  favoriteId: null, cap: 300, dipEvery: 0, rateMin: 4, rateMax: 10, startTotal: 60, afterCap: 'hold', ...extra
});
const cand = (name, note = '', by = 'admin') => ({ id: newId(), name, note, by, offset: 0 });

function defaultDb() {
  const envStart = Date.parse(process.env.STORY_START || '');
  const women = role('women', 'Women\u2019s Coordinator',
    'Point of contact for our lady batchmates: invitations, comfort through the day and a safe evening drop.', {
      mode: 'scripted', status: 'live', cap: 300, dipEvery: 5, rateMin: 5, rateMax: 12, startTotal: 150, afterCap: 'shuffle', openNominations: false,
      candidates: ['Naveen', 'Venkat Reddy', 'Vijay', 'Narendra', 'Chandra'].map(n => cand(n))
    });
  women.favoriteId = women.candidates[0].id;

  const venue = {
    id: 'venue', kind: 'venue', title: 'Reunion Venue', desc: 'Where should we meet? Pick a resort in Visakhapatnam.',
    mode: 'scripted', status: 'live', favoriteId: null, cap: 220, dipEvery: 0, rateMin: 2, rateMax: 7, startTotal: 60, afterCap: 'hold', openNominations: false, confirmedId: null,
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
    v: 7,
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
      rsvpOpen: true,
      whatsapp: { show: true, active: 62, left: 1, admins: 5, locations: [{ place: 'India', count: 3 }, { place: 'USA', count: 1 }, { place: 'UK', count: 1 }] }
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
    chat: { users: {}, messages: [] }, // keyed by account id
    users: {},       // Google accounts: id -> { sub, name, email, picture, privacyAt }
    secret: crypto.randomBytes(32).toString('hex'),
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
  if (data && data.v === 5) {
    // v6: elections get a status (upcoming / live / closed); passes are assigned by admin
    data = { ...data, v: 6, elections: (data.elections || []).map(e => ({ ...e, status: e.status || ((e.id === 'women' || e.id === 'venue' || e.candidates.length) ? 'live' : 'upcoming') })) };
  }
  if (data && data.v === 6) {
    // v7: Google accounts; chat moves from registrations to accounts (old chat data is cleared)
    data = { ...data, v: 7, users: {}, secret: data.secret || d.secret, chat: { users: {}, messages: [] } };
  }
  if (!data || data.v !== 7) return d;
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
  const isLiveNow = !conf && (e.status || 'live') === 'live';
  const byId = Object.fromEntries(e.candidates.map(c => [c.id, c]));
  for (const c of candidates) {
    const v = byId[c.id] && byId[c.id].video;
    if (admin) c.videoInfo = v || null;
    else if (v && v.status === 'approved' && isLiveNow) c.video = { kind: v.kind, embed: v.embed, url: v.url };
  }
  if (!admin && !isLiveNow && e.kind !== 'venue') {
    for (const c of candidates) { c.name = mask(c.name); c.note = ''; delete c.video; }
  }
  const out = {
    id: e.id, kind: e.kind, title: e.title, desc: e.desc, mode: e.mode, live: e.mode === 'live',
    confirmed: conf ? (admin || e.kind === 'venue' ? { id: conf.id, name: conf.name } : { id: null, name: null }) : null, status: conf ? 'closed' : (e.status || 'live'),
    openNominations: !!e.openNominations && !conf && (e.status || 'live') !== 'closed',
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
  const uid = typeof voterId === 'string' && voterId.startsWith('u:') ? voterId.slice(2) : null;
  const acct = uid && db.users[uid];
  return {
    me: acct ? { name: acct.name, email: acct.email, picture: acct.picture } : null,
    chatUnread: uid ? db.chat.messages.filter(m => m.to === uid && !m.read).length : 0,
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
      const passes = Object.fromEntries(['platinum', 'gold', 'silver'].map(p => [p, (base[p] || 0) + R.filter(r => r.pass === p).length]));
      return { male, female, total: male + female + R.filter(r => !r.gender).length, passes };
    })(),
    myRsvp: myRsvp && { name: myRsvp.name, gender: myRsvp.gender, pass: myRsvp.pass || '', branch: myRsvp.branch, phone: myRsvp.phone, city: myRsvp.city, attend: myRsvp.attend, overnight: myRsvp.overnight, pickup: myRsvp.pickup, food: myRsvp.food }
  };
}

// ======================================================================= app
const app = express();
app.use(express.json({ limit: '200kb' }));
app.use(cookieParser());
app.set('trust proxy', 1);
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

// ---- Google sign-in & sessions
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const TEST_AUTH = process.env.TEST_AUTH === '1' && process.env.NODE_ENV !== 'production';
const AUTH = !!GOOGLE_CLIENT_ID || TEST_AUTH;
const sign = id => crypto.createHmac('sha256', db.secret).update(String(id)).digest('base64url');
function sessionUser(req) {
  const v = req.cookies.sid;
  if (!v || typeof v !== 'string') return null;
  const [id, sig] = v.split('.');
  if (!id || !sig) return null;
  const a = Buffer.from(sig), b = Buffer.from(sign(id));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return db.users[id] || null;
}
async function verifyGoogle(credential) {
  if (TEST_AUTH && /^test:/.test(credential)) {
    const [, sub, name, email] = credential.split(':');
    return { sub, name, email, picture: '' };
  }
  const r = await fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(credential));
  if (!r.ok) throw new Error('Google sign-in could not be verified');
  const t = await r.json();
  if (t.aud !== GOOGLE_CLIENT_ID) throw new Error('Google sign-in is for a different app');
  if (!['accounts.google.com', 'https://accounts.google.com'].includes(t.iss)) throw new Error('Unexpected sign-in issuer');
  if (Number(t.exp) * 1000 < Date.now()) throw new Error('Sign-in expired, please try again');
  if (t.email_verified !== 'true' && t.email_verified !== true) throw new Error('Please use a verified Google account');
  return { sub: t.sub, name: t.name || t.email, email: t.email, picture: t.picture || '' };
}
// move anything done on this device before sign-in onto the account
function linkDevice(vid, key) {
  if (!vid || !/^[0-9a-f-]{36}$/.test(vid)) return;
  const mine = Object.values(db.rsvps).find(r => r.voterId === key);
  const dev = Object.values(db.rsvps).find(r => r.voterId === vid);
  if (dev && !mine) dev.voterId = key;
  for (const box of Object.values(db.votes)) if (box[vid] && !box[key]) { box[key] = box[vid]; delete box[vid]; }
  for (const box of Object.values(db.nominations || {})) if (box[vid]) { box[key] = (box[key] || 0) + box[vid]; delete box[vid]; }
}
app.get('/api/config', (req, res) => res.json({ auth: AUTH, googleClientId: GOOGLE_CLIENT_ID, testAuth: TEST_AUTH }));
app.post('/api/auth/google', async (req, res) => {
  if (!AUTH) return res.status(400).json({ error: 'Sign-in is not set up' });
  if (req.body.privacy !== true) return res.status(400).json({ error: 'Please accept the privacy policy' });
  let g;
  try { g = await verifyGoogle(String(req.body.credential || '')); } catch (e) { return res.status(401).json({ error: e.message }); }
  let user = Object.values(db.users).find(u => u.sub === g.sub);
  if (!user) { const id = newId(); user = db.users[id] = { id, sub: g.sub, createdAt: Date.now() }; }
  Object.assign(user, { name: str(g.name, 80), email: str(g.email, 120), picture: str(g.picture, 300), privacyAt: user.privacyAt || Date.now(), lastSeen: Date.now() });
  linkDevice(req.cookies.vid, 'u:' + user.id);
  saveDb();
  res.cookie('sid', `${user.id}.${sign(user.id)}`, { maxAge: 180 * 24 * HOUR, httpOnly: true, sameSite: 'lax', secure: req.secure });
  res.json({ ok: true });
});
app.post('/api/auth/logout', (req, res) => { res.clearCookie('sid'); res.json({ ok: true }); });
// when sign-in is set up, the app's data needs a signed-in user
app.use('/api', (req, res, next) => {
  if (!AUTH || req.path.startsWith('/admin') || req.path.startsWith('/auth') || req.path === '/config') return next();
  if (!sessionUser(req)) return res.status(401).json({ error: 'Please sign in', signin: true });
  next();
});

function voterIdOf(req, res) {
  const su = sessionUser(req);
  if (su) return 'u:' + su.id;
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

app.get('/api/members', (req, res) => {
  const key = voterIdOf(req, res);
  const list = Object.values(db.rsvps).sort((a, b) => (b.voterId === key) - (a.voterId === key) || b.createdAt - a.createdAt)
    .map(r => ({ name: maskFull(r.name, r.id), you: r.voterId === key }));
  res.json({ total: list.length, members: list });
});

// ---- campaign videos (links to YouTube or Google Drive; approved by admin; never change vote counts)
function embedOf(url) {
  const u = String(url || '').trim();
  let m = u.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{6,20})/);
  if (m) return { kind: 'youtube', embed: `https://www.youtube-nocookie.com/embed/${m[1]}`, url: `https://youtu.be/${m[1]}` };
  m = u.match(/drive\.google\.com\/(?:file\/d\/|open\?id=)([A-Za-z0-9_-]{10,})/);
  if (m) return { kind: 'drive', embed: `https://drive.google.com/file/d/${m[1]}/preview`, url: `https://drive.google.com/file/d/${m[1]}/view` };
  return null;
}
app.post('/api/campaign', (req, res) => {
  const vid = voterIdOf(req, res);
  const e = findElection(req.body.electionId);
  if (!e || e.kind === 'venue') return res.status(404).json({ error: 'Election not found' });
  if (e.confirmedId || (e.status || 'live') !== 'live') return res.status(403).json({ error: 'Campaign videos are only for live polls' });
  const c = e.candidates.find(x => x.id === req.body.candidateId);
  if (!c) return res.status(404).json({ error: 'Choose your name from the list' });
  const v = embedOf(req.body.url);
  if (!v) return res.status(400).json({ error: 'Paste a YouTube or Google Drive video link' });
  c.video = { ...v, status: 'pending', by: vid, at: Date.now() };
  saveDb();
  res.json({ ok: true });
});

app.post('/api/vote', (req, res) => {
  const vid = voterIdOf(req, res);
  if (!db.settings.votingOpen) return res.status(403).json({ error: 'Voting is closed' });
  const e = findElection(req.body.electionId);
  if (!e) return res.status(404).json({ error: 'Election not found' });
  if (!e.candidates.some(c => c.id === req.body.candidateId)) return res.status(404).json({ error: 'Candidate not found' });
  if (e.confirmedId) return res.status(403).json({ error: 'This coordinator is already confirmed' });
  if ((e.status || 'live') !== 'live') return res.status(403).json({ error: e.status === 'upcoming' ? 'Voting has not started yet' : 'Voting has closed' });
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
  if (!db.settings.votingOpen || !e.openNominations || e.confirmedId || e.status === 'closed') return res.status(403).json({ error: 'Nominations are closed for this role' });
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
// Chat is keyed by the signed-in account (db.users id), so it needs Google sign-in.
const PLANS = [
  { id: 'p10', name: 'Starter', messages: 10, price: 299 },
  { id: 'p50', name: 'Plus', messages: 50, price: 599 },
  { id: 'unl', name: 'Unlimited', messages: null, price: 999 }
];
const lastSend = new Map();
const rsvpOfUser = uid => Object.values(db.rsvps).find(r => r.voterId === 'u:' + uid) || null;
function displayName(uid) {
  const r = rsvpOfUser(uid);
  return (r && r.name) || (db.users[uid] && db.users[uid].name) || 'Batchmate';
}
const COMMITTEE = 'committee';
const maskKey = uid => (rsvpOfUser(uid) || {}).id || uid;
function profileOf(uid, full = false) {
  if (uid === COMMITTEE) return { id: COMMITTEE, name: 'Organising Committee', branch: '', city: '', committee: true };
  const r = rsvpOfUser(uid);
  if (!full) return { id: uid, name: maskFull(displayName(uid), maskKey(uid)), branch: '', city: '' };
  return { id: uid, name: displayName(uid), branch: r ? r.branch : '', city: r ? r.city : '' };
}
const DEFAULT_BLOCKED = ['idiot', 'stupid', 'bloody', 'bastard', 'fuck', 'shit', 'sexy', 'sex', 'dating', 'date with me', 'nude', 'pervert'];
const ASK_CONTACT = /(phone|mobile|cell|contact|whats\s*app|wa)\s*(no|num|number|nbr|#)|\b(your|ur|send|share|give|ivvu|pampu|cheppu)\b[^.?!]{0,20}\b(number|num|no\.?)\b|\bnumber\s*(ivvu|pampu|cheppu|do|bhejo|send)\b|\bcall\s*me\b|\bwhats\s*app\b|\binsta(gram)?\s*(id|handle)\b|\b(email|mail)\s*(id|address)\b/i;
function chatBlockReason(text) {
  const digits = (text.match(/\d/g) || []).length;
  if (digits >= 8 || /(\+?91[\s-]?)?[6-9]\d{2}[\s-]?\d{3}[\s-]?\d{4}/.test(text)) return 'sharing phone numbers is not allowed in chat';
  if (/[\w.+-]+@[\w-]+\.[\w.]+/.test(text)) return 'sharing email addresses is not allowed in chat';
  if (ASK_CONTACT.test(text)) return 'asking for phone numbers or contact details is not allowed in chat';
  const words = (db.settings.chatBlocked && db.settings.chatBlocked.length ? db.settings.chatBlocked : DEFAULT_BLOCKED);
  const low = ' ' + text.toLowerCase().replace(/[^a-z0-9\u0C00-\u0C7F\u0900-\u097F\s]/g, ' ').replace(/\s+/g, ' ') + ' ';
  const hit = words.find(w => w && low.includes(' ' + w.toLowerCase().trim() + ' '));
  if (hit) return 'the message contains words that break the chat rules';
  if (!/[a-z\u0C00-\u0C7F\u0900-\u097F]{2,}/i.test(text) || /(.)\1{7,}/.test(text)) return 'the message looks like spam';
  return null;
}
function committeeMessage(uid, text) {
  db.chat.messages.push({ id: newId(), from: COMMITTEE, to: uid, text: str(text, 500), t: Date.now(), read: false });
}
const lastWarn = new Map();
function chatMe(req) {
  const su = sessionUser(req);
  if (!su) return { user: null, u: null };
  const u = (db.chat.users[su.id] ||= { consentAt: null, status: 'none', plan: null, limit: 0, used: 0, requestedAt: null });
  return { user: su, u };
}
function chatView(user, u) {
  const me = user.id;
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
    registered: true, name: displayName(me), consent: !!u.consentAt, status: u.status === 'revoked' ? 'revoked' : 'active', plan: null, requested: null,
    left: null, free: true,
    plans: PLANS,
    conversations: [...peers.entries()].filter(([p]) => db.users[p] || p === COMMITTEE).map(([p, c]) => ({ ...profileOf(p), ...c })).sort((a, b) => b.t - a.t),
    members: Object.values(db.chat.users).filter(x => x.consentAt && x.status !== 'revoked').length
  };
}
function needChat(req, res) {
  if (!AUTH) { res.json({ registered: false, disabled: true }); return null; }
  const me = chatMe(req);
  if (!me.user) { res.status(401).json({ error: 'Please sign in' }); return null; }
  return me;
}
app.get('/api/chat', (req, res) => {
  const me = needChat(req, res); if (!me) return;
  res.json(chatView(me.user, me.u));
});
app.post('/api/chat/consent', (req, res) => {
  const me = needChat(req, res); if (!me) return;
  if (req.body.agree !== true) return res.status(400).json({ error: 'Please accept the chat rules' });
  me.u.consentAt = Date.now();
  saveDb(); res.json(chatView(me.user, me.u));
});
app.post('/api/chat/request', (req, res) => {
  const me = needChat(req, res); if (!me) return;
  const u = me.u;
  if (!u.consentAt) return res.status(403).json({ error: 'Please accept the chat rules first' });
  if (req.body.cancel) { if (u.status === 'pending') { u.status = 'none'; u.requested = null; } saveDb(); return res.json(chatView(me.user, u)); }
  const plan = PLANS.find(p => p.id === req.body.plan);
  if (!plan) return res.status(400).json({ error: 'Choose a plan' });
  const cur = PLANS.find(p => p.id === u.plan);
  if (u.status === 'active' && cur && cur.messages === null) return res.status(409).json({ error: 'You already have unlimited messages' });
  u.requested = plan.id; u.requestedAt = Date.now();
  if (u.status !== 'active') u.status = 'pending';
  saveDb(); res.json(chatView(me.user, u));
});
app.get('/api/chat/people', (req, res) => {
  const me = needChat(req, res); if (!me) return;
  if (!me.u.consentAt) return res.status(403).json({ error: 'Please accept the chat rules first' });
  const my = me.user.id, seen = new Set(), list = [];
  const chatOk = uid => { const x = db.chat.users[uid]; return !!(uid && db.users[uid] && x && x.consentAt && x.status !== 'revoked'); };
  for (const r of Object.values(db.rsvps)) {
    const uid = r.voterId && r.voterId.startsWith('u:') ? r.voterId.slice(2) : null;
    if (uid) seen.add(uid);
    list.push({ id: uid === my ? null : (chatOk(uid) ? uid : null), name: maskFull(r.name, r.id), canChat: uid !== my && chatOk(uid), you: uid === my, t: r.createdAt });
  }
  for (const uid of Object.keys(db.chat.users)) {
    if (seen.has(uid) || !db.users[uid]) continue;
    list.push({ id: uid === my ? null : (chatOk(uid) ? uid : null), name: maskFull(displayName(uid), uid), canChat: uid !== my && chatOk(uid), you: uid === my, t: db.users[uid].createdAt });
  }
  list.sort((a, b) => (b.you - a.you) || (b.canChat - a.canChat) || (b.t - a.t));
  res.json(list.map(({ t, ...x }) => x));
});
app.get('/api/chat/thread/:id', (req, res) => {
  const me = needChat(req, res); if (!me) return;
  if (!me.u.consentAt) return res.status(403).json({ error: 'Please accept the chat rules first' });
  if (!db.users[req.params.id] && req.params.id !== COMMITTEE) return res.status(404).json({ error: 'Batchmate not found' });
  const my = me.user.id, peer = req.params.id;
  let changed = false;
  const msgs = db.chat.messages.filter(m => (m.from === my && m.to === peer) || (m.from === peer && m.to === my)).map(m => {
    if (m.to === my && !m.read) { m.read = true; changed = true; }
    return { id: m.id, mine: m.from === my, text: m.text, t: m.t };
  });
  if (changed) saveDb();
  res.json({ peer: profileOf(peer), messages: msgs, chat: chatView(me.user, me.u) });
});
app.post('/api/chat/send', (req, res) => {
  const me = needChat(req, res); if (!me) return;
  const u = me.u;
  if (!u.consentAt) return res.status(403).json({ error: 'Please accept the chat rules first' });
  if (u.status === 'revoked') return res.status(403).json({ error: 'Your chat access has been removed by the organising committee' });
  const to = req.body.to, peerChat = db.chat.users[to];
  if (!db.users[to] || to === me.user.id || !peerChat || !peerChat.consentAt) return res.status(404).json({ error: 'Batchmate not found' });
  const text = str(req.body.text, 500);
  if (!text) return res.status(400).json({ error: 'Type a message' });
  const reason = chatBlockReason(text);
  if (reason) {
    (db.chat.flags ||= []).push({ id: newId(), uid: me.user.id, to, text, reason, t: Date.now() });
    if (db.chat.flags.length > 500) db.chat.flags.splice(0, db.chat.flags.length - 500);
    if (Date.now() - (lastWarn.get(me.user.id) || 0) > 10 * 60 * 1000) {
      lastWarn.set(me.user.id, Date.now());
      committeeMessage(me.user.id, `Your message was not delivered because ${reason}. Please keep chat respectful and professional, and do not ask for or share phone numbers. Repeated attempts can lead to chat access being removed.`);
    }
    saveDb();
    return res.status(422).json({ error: `Not sent: ${reason}.` });
  }
  const now = Date.now();
  if (now - (lastSend.get(me.user.id) || 0) < 1500) return res.status(429).json({ error: 'Slow down a little' });
  lastSend.set(me.user.id, now);
  db.chat.messages.push({ id: newId(), from: me.user.id, to, text, t: now, read: false });
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
    pass: ['platinum', 'gold', 'silver'].includes(b.pass) ? b.pass : '',
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
  delete data.pass;
  const existing = Object.values(db.rsvps).find(r => r.voterId === vid);
  if (existing) Object.assign(existing, data, { updatedAt: Date.now() });
  else {
    const id = newId();
    db.rsvps[id] = { id, voterId: vid, ...data, pass: '', source: 'self', callStatus: 'new', note: '', createdAt: Date.now(), updatedAt: Date.now() };
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
    rsvps: Object.values(db.rsvps).sort((a, b) => b.createdAt - a.createdAt).map(({ voterId, ...r }) => ({ ...r, email: voterId && voterId.startsWith('u:') && db.users[voterId.slice(2)] ? db.users[voterId.slice(2)].email : '' })),
    accounts: Object.keys(db.users).length,
    accountList: Object.values(db.users).map(u => {
      const r = Object.values(db.rsvps).find(x => x.voterId === 'u:' + u.id);
      return { name: u.name || '', email: u.email || '', picture: u.picture || '', createdAt: u.createdAt, lastSeen: u.lastSeen || u.createdAt, registered: !!r, rsvpName: r ? r.name : '', chat: !!(db.chat.users[u.id] && db.chat.users[u.id].consentAt) };
    }).sort((a, b) => b.createdAt - a.createdAt),
    chat: {
      plans: PLANS,
      users: Object.entries(db.chat.users).filter(([id]) => db.users[id]).map(([id, u]) => ({ ...profileOf(id, true), email: db.users[id].email, ...u, id, flags: (db.chat.flags || []).filter(f => f.uid === id).length }))
        .sort((a, b) => (b.requestedAt || 0) - (a.requestedAt || 0)),
      messages: db.chat.messages.slice(-300).reverse().map(m => ({ ...m, fromName: m.from === COMMITTEE ? 'Organising Committee' : db.users[m.from] ? displayName(m.from) : '—', toName: db.users[m.to] ? displayName(m.to) : '—' })),
      flags: (db.chat.flags || []).slice(-200).reverse().map(f => ({ ...f, name: db.users[f.uid] ? displayName(f.uid) : '—', toName: db.users[f.to] ? displayName(f.to) : '—' })),
      blocked: db.settings.chatBlocked && db.settings.chatBlocked.length ? db.settings.chatBlocked : DEFAULT_BLOCKED
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
  if (b.whatsapp && typeof b.whatsapp === 'object') {
    const w = b.whatsapp, cur = s.whatsapp || {};
    s.whatsapp = {
      show: typeof w.show === 'boolean' ? w.show : cur.show !== false,
      active: num(w.active, 0, 100000) ?? cur.active ?? 0,
      left: num(w.left, 0, 100000) ?? cur.left ?? 0,
      admins: num(w.admins, 0, 1000) ?? cur.admins ?? 0,
      locations: Array.isArray(w.locations) ? w.locations.map(x => ({ place: str(x && x.place, 30), count: num(x && x.count, 0, 1000) || 0 })).filter(x => x.place).slice(0, 12) : (cur.locations || [])
    };
  }
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
  if (['upcoming', 'live', 'closed'].includes(b.status)) e.status = b.status;
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
A.post('/elections/:id/candidates/:cid/video', (req, res) => {
  const e = findElection(req.params.id);
  const c = e && e.candidates.find(x => x.id === req.params.cid);
  if (!c) return res.status(404).json({ error: 'Not found' });
  const a = req.body.action;
  if (a === 'approve' && c.video) c.video.status = 'approved';
  else if (a === 'remove') delete c.video;
  else if (a === 'set') { const v = embedOf(req.body.url); if (!v) return res.status(400).json({ error: 'Paste a YouTube or Google Drive video link' }); c.video = { ...v, status: 'approved', by: 'admin', at: Date.now() }; }
  else return res.status(400).json({ error: 'Unknown action' });
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
// test data: clearly marked, no phone numbers, removable in one go
const TEST_MEN = ['Ravi Kumar', 'Srinivas Rao', 'Prasad', 'Venkatesh', 'Ramesh Babu', 'Suresh', 'Kiran Kumar', 'Mahesh', 'Naresh', 'Sekhar', 'Rajesh', 'Satish', 'Harish', 'Sandeep', 'Mohan Rao', 'Anil Kumar', 'Vamsi', 'Chaitanya', 'Phani Kumar', 'Murali', 'Gopi', 'Raghu', 'Sai Krishna', 'Bhaskar', 'Durga Prasad', 'Pavan', 'Krishna Mohan', 'Nagaraju', 'Siva', 'Ramana', 'Jagadeesh', 'Hari Babu', 'Lokesh', 'Manohar', 'Vijay Kumar', 'Sudheer'];
const TEST_WOMEN = ['Lakshmi', 'Madhavi', 'Swathi', 'Anitha', 'Padma', 'Sirisha', 'Kavitha', 'Sravani', 'Deepthi', 'Bhavani', 'Sunitha', 'Radhika', 'Haritha', 'Jyothi', 'Prasanna', 'Sailaja', 'Vani', 'Aruna'];
A.post('/rsvps/test', (req, res) => {
  const n = num(req.body.count, 1, 300) || 54;
  const branches = db.settings.branches.length ? db.settings.branches : ['CSE'];
  const cities = ['Hyderabad', 'Visakhapatnam', 'Vizianagaram', 'Bengaluru', 'Chennai', 'Pune', 'Bobbili', 'Srikakulam', 'Vijayawada'];
  const pick = (arr, i) => arr[i % arr.length];
  const r = rng(hash(Date.now() & 0xffffffff, 7));
  const passes = ['platinum', 'gold', 'silver'];
  let men = 0, women = 0;
  for (let i = 0; i < n; i++) {
    const female = i % 3 === 2;
    const name = female ? pick(TEST_WOMEN, women++) : pick(TEST_MEN, men++);
    const id = newId();
    const roll = r();
    db.rsvps[id] = {
      id, voterId: null, source: 'test', callStatus: r() < 0.6 ? 'confirmed' : 'new', note: 'Test registration',
      name, gender: female ? 'female' : 'male', branch: pick(branches, Math.floor(r() * 100)), phone: '', city: pick(cities, Math.floor(r() * 100)),
      attend: r() < 0.8 ? 'both' : 'day1', overnight: false, pickup: r() < 0.5 ? pick(db.settings.pickupPoints, Math.floor(r() * 100)) : '',
      food: r() < 0.3 ? 'veg' : 'nonveg', pass: roll < 0.15 ? passes[0] : roll < 0.45 ? passes[1] : passes[2],
      createdAt: Date.now() - Math.floor(r() * 5 * 24 * HOUR), updatedAt: Date.now()
    };
    if (db.rsvps[id].attend === 'both' && !female) db.rsvps[id].overnight = r() < 0.7;
  }
  if (req.body.replaceExtra !== false) {
    db.settings.regBaseMale = 0; db.settings.regBaseFemale = 0;
    db.settings.passBase = { platinum: 0, gold: 0, silver: 0 };
  }
  saveDb(); res.json({ ok: true, added: n });
});
A.delete('/rsvps/test', (req, res) => {
  let removed = 0;
  for (const [id, r] of Object.entries(db.rsvps)) if (r.source === 'test') { delete db.rsvps[id]; removed++; }
  saveDb(); res.json({ ok: true, removed });
});
A.put('/rsvps/:id', (req, res) => {
  const r = db.rsvps[req.params.id];
  if (!r) return res.status(404).json({ error: 'Not found' });
  if (['new', 'confirmed', 'not_reachable', 'declined'].includes(req.body.callStatus)) r.callStatus = req.body.callStatus;
  if (['platinum', 'gold', 'silver', ''].includes(req.body.pass)) r.pass = req.body.pass;
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
  else if (a === 'restore') { u.status = 'active'; }
  else return res.status(400).json({ error: 'Unknown action' });
  saveDb(); res.json({ ok: true });
});
A.post('/chat/:id/message', (req, res) => {
  if (!db.users[req.params.id]) return res.status(404).json({ error: 'Not found' });
  const text = str(req.body.text, 500);
  if (!text) return res.status(400).json({ error: 'Type a message' });
  committeeMessage(req.params.id, text);
  saveDb(); res.json({ ok: true });
});
A.put('/chat/blocked', (req, res) => {
  if (!Array.isArray(req.body.words)) return res.status(400).json({ error: 'words required' });
  db.settings.chatBlocked = req.body.words.map(w => str(w, 40).toLowerCase()).filter(Boolean).slice(0, 300);
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
