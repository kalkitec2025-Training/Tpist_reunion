const express = require('express');
const multer = require('multer');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const SEED_DIR = path.join(__dirname, 'seed');
const HOUR = 3600 * 1000;

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// ------------------------------------------------------------------ database
const defaults = {
  settings: {
    title: 'Who becomes our Women’s Coordinator?',
    collegeName: 'TPIST',
    eventDate: 'Reunion date will be announced shortly',
    closesAt: '',        // ISO date-time; empty = no countdown
    votingOpen: true
  },
  auto: {
    on: true,
    cap: 300,            // total votes the count climbs to and then holds
    intervalMin: 60,     // how often the numbers move
    favoriteId: null,    // always ends up on top
    dipEvery: 5,         // every Nth update the favourite briefly drops to 2nd
    rateMin: 5,          // new votes per update (daytime)
    rateMax: 12,
    startTotal: 150,     // votes already "in" at the first update
    afterCap: 'shuffle', // 'shuffle' keeps moving at the cap, 'hold' freezes
    venueCap: 220,       // venue poll total climbs to this
    seed: 1,
    startAt: Date.now(),
    frozenSlot: 0
  },
  candidates: [],
  venues: [
    { id: 'radisson', name: 'Radisson Blu Resort', area: 'Rushikonda Beach Road', offset: 0 },
    { id: 'saipriya', name: 'Sai Priya Beach Resort', area: 'Rushikonda Beach', offset: 0 },
    { id: 'shorefront', name: 'Shore Front Resort', area: 'Rushikonda', offset: 0 },
    { id: 'sunray', name: 'Sunray Village Resort', area: 'Visakhapatnam', offset: 0 }
  ],
  venueVotes: {},        // voterId -> venueId (genuine, admin-only)
  realVotes: {},         // voterId -> candidateId (genuine clicks, admin-only)
  seeded: false
};

function loadDb() {
  try {
    const d = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    return { ...defaults, ...d, settings: { ...defaults.settings, ...d.settings }, auto: { ...defaults.auto, ...d.auto } };
  } catch {
    const d = JSON.parse(JSON.stringify(defaults));
    // STORY_START / STORY_SEED env vars keep the same numbers even if the disk is wiped (Render free plan)
    const envStart = Date.parse(process.env.STORY_START || '');
    d.auto.seed = Number(process.env.STORY_SEED) || crypto.randomInt(1, 2 ** 31);
    d.auto.startAt = Number.isFinite(envStart) ? envStart : Date.now();
    return d;
  }
}
let db = loadDb();
function saveDb() {
  fs.writeFileSync(DB_FILE + '.tmp', JSON.stringify(db, null, 2));
  fs.renameSync(DB_FILE + '.tmp', DB_FILE);
}
const newId = () => crypto.randomBytes(6).toString('hex');

// First run: load the four batchmates from /seed
if (!db.seeded) {
  const people = [
    ['Naveen', 'naveen.jpg'],
    ['Venkat Reddy', 'venkat.jpg'],
    ['Vijay', 'vijay.jpg'],
    ['Narendra', 'narendra.jpg']
  ];
  for (const [name, file] of people) {
    const src = path.join(SEED_DIR, file);
    let photo = null;
    if (fs.existsSync(src)) {
      const dest = newId() + '.jpg';
      fs.copyFileSync(src, path.join(UPLOAD_DIR, dest));
      photo = '/uploads/' + dest;
    }
    db.candidates.push({ id: newId(), name, photo, offset: 0 });
  }
  db.auto.favoriteId = db.candidates[0].id;
  db.seeded = true;
}
saveDb();

// ------------------------------------------------------------ vote engine
// Deterministic: the same settings always give the same hour-by-hour story,
// so a server restart never makes numbers jump.
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
// split n votes by weights (largest remainder)
function distribute(n, weights) {
  const sum = weights.reduce((a, b) => a + b, 0) || 1;
  const raw = weights.map(w => (w / sum) * n);
  const out = raw.map(Math.floor);
  let rem = n - out.reduce((a, b) => a + b, 0);
  const order = raw.map((x, i) => [x - out[i], i]).sort((a, b) => b[0] - a[0]);
  for (let k = 0; k < rem; k++) out[order[k % order.length][1]]++;
  return out;
}

let simCache = { key: null, snaps: [] };

function simulate(upto) {
  const a = db.auto;
  const ids = db.candidates.map(c => c.id);
  if (!ids.length) return [];
  const key = JSON.stringify([a.afterCap, a.cap, a.intervalMin, a.favoriteId, a.dipEvery, a.rateMin, a.rateMax, a.startTotal, a.seed, a.startAt, ids]);
  if (simCache.key !== key) simCache = { key, snaps: [] };
  const snaps = simCache.snaps;
  const fav = ids.includes(a.favoriteId) ? a.favoriteId : ids[0];
  const others = ids.filter(i => i !== fav);
  const interval = a.intervalMin * 60 * 1000;

  if (!snaps.length) {
    const r = rng(hash(a.seed, 0));
    const c = Object.fromEntries(ids.map(i => [i, 0]));
    const start = Math.min(a.startTotal, a.cap);
    c[fav] = Math.round(start * (others.length ? 0.31 : 1));
    if (others.length) distribute(start - c[fav], others.map(() => 0.7 + r() * 0.6)).forEach((v, i) => (c[others[i]] += v));
    // make sure the favourite starts a few votes ahead
    for (let guard = 0; guard < 500 && others.length; guard++) {
      const top = others.reduce((x, y) => (c[y] > c[x] ? y : x));
      if (c[fav] >= c[top] + 4 || c[top] === 0) break;
      c[top]--; c[fav]++;
    }
    snaps.push(c);
  }

  for (let k = snaps.length; k <= upto; k++) {
    const r = rng(hash(a.seed, k));
    const c = { ...snaps[k - 1] };
    const total = Object.values(c).reduce((x, y) => x + y, 0);
    // fewer votes at night (IST)
    const istHour = new Date(a.startAt + k * interval + 5.5 * HOUR).getUTCHours();
    const factor = istHour < 6 ? 0.25 : istHour < 9 ? 0.6 : istHour >= 23 ? 0.5 : 1;
    let n = Math.round((a.rateMin + r() * Math.max(0, a.rateMax - a.rateMin)) * factor);
    n = Math.max(0, Math.min(n, a.cap - total));

    if (n > 0 && others.length) {
      const rival = others.reduce((x, y) => (c[y] > c[x] ? y : x));
      const isDip = a.dipEvery > 1 && k % a.dipEvery === 0;
      if (isDip) {
        // favourite stalls, the runner-up overtakes by 1-3
        const need = Math.max(0, c[fav] - c[rival] + 1 + Math.floor(r() * 3));
        const g = Math.min(n, need);
        c[rival] += g;
        const rest = others.filter(o => o !== rival);
        let rem = n - g;
        const favBit = Math.min(rem, Math.floor(r() * 2));
        c[fav] += favBit; rem -= favBit;
        if (rest.length) distribute(rem, rest.map(() => 0.6 + r() * 0.8)).forEach((v, i) => (c[rest[i]] += v));
        else c[rival] += rem;
      } else {
        // favourite ends the hour 4-10 ahead, without taking every vote
        const target = 4 + Math.floor(r() * 7);
        const w = others.map(() => 0.6 + r() * 0.8);
        let x = n;
        for (let t = 0; t <= n; t++) {
          const d = distribute(n - t, w);
          const mx = Math.max(...others.map((o, i) => c[o] + d[i]));
          if (c[fav] + t - mx >= target) { x = t; break; }
        }
        x = Math.min(x, Math.ceil(n * 0.7));
        if (x === 0 && n >= 4) x = 1;
        c[fav] += x;
        distribute(n - x, w).forEach((v, i) => (c[others[i]] += v));
      }
    } else if (n > 0) {
      c[fav] += n;
    } else if (a.afterCap === 'shuffle' && others.length && total >= a.cap) {
      // total is at the cap: keep it moving by shifting votes between people
      const rival = others.reduce((x, y) => (c[y] > c[x] ? y : x));
      const isDip = a.dipEvery > 1 && k % a.dipEvery === 0;
      const cap = Math.max(2, Math.round(a.rateMax * factor));
      if (isDip) {
        const gap = c[fav] - c[rival];
        const d = Math.min(c[fav], Math.max(0, Math.floor(gap / 2) + 1 + Math.floor(r() * 2)));
        c[fav] -= d; c[rival] += d;
      } else {
        const target = 4 + Math.floor(r() * 7);
        const lead = c[fav] - c[rival];
        if (lead < target) {
          let d = Math.min(cap, Math.ceil((target - lead) / 2));
          // take from the top others, one at a time
          while (d-- > 0) {
            const top = others.reduce((x, y) => (c[y] > c[x] ? y : x));
            if (c[top] <= 0) break;
            c[top]--; c[fav]++;
          }
        }
        // small natural shuffle among the others
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

// Venue poll: a gentler scripted climb with no favourite
let venueCache = { key: null, snaps: [] };
function simulateVenues(upto) {
  const a = db.auto;
  const ids = db.venues.map(v => v.id);
  if (!ids.length) return [];
  const key = JSON.stringify([a.seed, a.startAt, a.intervalMin, a.venueCap, ids]);
  if (venueCache.key !== key) venueCache = { key, snaps: [] };
  const snaps = venueCache.snaps;
  const interval = a.intervalMin * 60 * 1000;
  const r0 = rng(hash(a.seed, 777));
  const base = ids.map(() => 0.7 + r0() * 0.6);
  if (!snaps.length) {
    const start = Math.min(60, a.venueCap);
    const d = distribute(start, base);
    snaps.push(Object.fromEntries(ids.map((id, i) => [id, d[i]])));
  }
  for (let k = snaps.length; k <= upto; k++) {
    const r = rng(hash(a.seed, 1000 + k));
    const c = { ...snaps[k - 1] };
    const total = Object.values(c).reduce((x, y) => x + y, 0);
    const istHour = new Date(a.startAt + k * interval + 5.5 * HOUR).getUTCHours();
    const factor = istHour < 6 ? 0.25 : istHour < 9 ? 0.6 : 1;
    const n = Math.max(0, Math.min(a.venueCap - total, Math.round((2 + r() * 5) * factor)));
    distribute(n, base.map(b => b * (0.5 + r()))).forEach((v, i) => (c[ids[i]] += v));
    snaps.push(c);
  }
  return snaps;
}

function currentSlot() {
  const a = db.auto;
  if (!a.on) return a.frozenSlot;
  return Math.max(0, Math.floor((Date.now() - a.startAt) / (a.intervalMin * 60 * 1000)));
}

function computeState(voterId, admin = false) {
  const slot = currentSlot();
  const snaps = simulate(slot);
  const now = snaps[slot] || {};
  const prev = slot > 0 ? snaps[slot - 1] : null;
  const myVote = voterId ? db.realVotes[voterId] || null : null;
  const interval = db.auto.intervalMin * 60 * 1000;

  const candidates = db.candidates.map(c => {
    let votes = Math.max(0, (now[c.id] || 0) + (c.offset || 0));
    if (myVote === c.id) votes += 1; // the voter sees their own vote counted
    return {
      id: c.id, name: c.name, photo: c.photo, votes,
      lastHour: prev ? (now[c.id] || 0) - (prev[c.id] || 0) : 0,
      ...(admin ? { offset: c.offset || 0, scripted: now[c.id] || 0 } : {})
    };
  }).sort((x, y) => y.votes - x.votes);

  const vsnap = simulateVenues(slot)[slot] || {};
  const myVenue = voterId ? db.venueVotes[voterId] || null : null;
  const venues = db.venues.map(v => {
    let votes = Math.max(0, (vsnap[v.id] || 0) + (v.offset || 0));
    if (myVenue === v.id) votes += 1;
    return { id: v.id, name: v.name, area: v.area, votes, ...(admin ? { offset: v.offset || 0 } : {}) };
  }).sort((x, y) => y.votes - x.votes);

  return {
    settings: db.settings,
    venues,
    venueTotal: venues.reduce((s, v) => s + v.votes, 0),
    myVenue,
    total: candidates.reduce((s, c) => s + c.votes, 0),
    updatedAt: db.auto.startAt + slot * interval,
    nextUpdateAt: db.auto.on ? db.auto.startAt + (slot + 1) * interval : null,
    hasHistory: !!prev,
    myVote,
    candidates
  };
}

// ---------------------------------------------------------------- uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) => cb(null, newId() + path.extname(file.originalname).toLowerCase().slice(0, 8))
  }),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = file.fieldname === 'photo' && file.mimetype.startsWith('image/');
    cb(ok ? null : new Error('Please upload an image'), ok);
  }
});
const media = upload.fields([{ name: 'photo', maxCount: 1 }]);
const removeFile = url => url && fs.promises.unlink(path.join(UPLOAD_DIR, path.basename(url))).catch(() => {});

// -------------------------------------------------------------------- app
const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '1h' }));
app.use(express.static(path.join(__dirname, 'public')));

function voterIdOf(req, res) {
  let id = req.cookies.vid;
  if (!id) {
    id = crypto.randomUUID();
    res.cookie('vid', id, { maxAge: 365 * 24 * HOUR, httpOnly: true, sameSite: 'lax' });
  }
  return id;
}

app.get('/api/state', (req, res) => res.json(computeState(voterIdOf(req, res))));

app.post('/api/vote', (req, res) => {
  const vid = voterIdOf(req, res);
  if (!db.settings.votingOpen) return res.status(403).json({ error: 'Voting is closed' });
  if (db.realVotes[vid]) return res.status(409).json({ error: 'You have already voted from this phone' });
  if (!db.candidates.some(c => c.id === req.body.candidateId)) return res.status(404).json({ error: 'Candidate not found' });
  db.realVotes[vid] = req.body.candidateId;
  saveDb();
  res.json(computeState(vid));
});

app.post('/api/venue-vote', (req, res) => {
  const vid = voterIdOf(req, res);
  if (!db.settings.votingOpen) return res.status(403).json({ error: 'Voting is closed' });
  if (db.venueVotes[vid]) return res.status(409).json({ error: 'You have already picked a venue' });
  if (!db.venues.some(v => v.id === req.body.venueId)) return res.status(404).json({ error: 'Venue not found' });
  db.venueVotes[vid] = req.body.venueId;
  saveDb();
  res.json(computeState(vid));
});

// ---- admin
function requireAdmin(req, res, next) {
  const a = Buffer.from(String(req.get('x-admin-password') || ''));
  const b = Buffer.from(ADMIN_PASSWORD);
  if (a.length === b.length && crypto.timingSafeEqual(a, b)) return next();
  res.status(401).json({ error: 'Wrong admin password' });
}
const num = (v, lo, hi) => (Number.isFinite(+v) ? Math.min(hi, Math.max(lo, Math.round(+v))) : undefined);

app.post('/api/admin/login', requireAdmin, (req, res) => res.json({ ok: true }));

app.get('/api/admin/state', requireAdmin, (req, res) => {
  const state = computeState(null, true);
  const slot = currentSlot();
  const snaps = simulate(slot);
  const interval = db.auto.intervalMin * 60 * 1000;
  const names = Object.fromEntries(db.candidates.map(c => [c.id, c.name]));
  const history = [];
  for (let k = slot; k >= Math.max(0, slot - 11); k--) {
    const s = snaps[k];
    const ranked = Object.entries(s).sort((x, y) => y[1] - x[1]);
    history.push({ at: db.auto.startAt + k * interval, leader: names[ranked[0]?.[0]], counts: ranked.map(([id, v]) => ({ name: names[id], votes: v })) });
  }
  // when will the scripted total reach the cap?
  let capAt = null;
  const far = simulate(slot + 400);
  for (let k = slot; k < far.length; k++) {
    if (Object.values(far[k]).reduce((a, b) => a + b, 0) >= db.auto.cap) { capAt = db.auto.startAt + k * interval; break; }
  }
  const real = {};
  for (const cid of Object.values(db.realVotes)) real[cid] = (real[cid] || 0) + 1;
  const realVenue = {};
  for (const v of Object.values(db.venueVotes)) realVenue[v] = (realVenue[v] || 0) + 1;
  res.json({ ...state, auto: db.auto, history, capAt, realVotes: real, realVenueVotes: realVenue, realVoterCount: Object.keys(db.realVotes).length });
});

app.put('/api/admin/settings', requireAdmin, (req, res) => {
  for (const k of ['title', 'collegeName', 'eventDate', 'closesAt']) {
    if (typeof req.body[k] === 'string') db.settings[k] = req.body[k].slice(0, 200);
  }
  if (typeof req.body.votingOpen === 'boolean') db.settings.votingOpen = req.body.votingOpen;
  saveDb();
  res.json({ ok: true });
});

app.put('/api/admin/auto', requireAdmin, (req, res) => {
  const a = db.auto, b = req.body;
  const slotBefore = currentSlot();
  const set = (k, v) => { if (v !== undefined) a[k] = v; };
  set('cap', num(b.cap, 1, 100000));
  set('rateMin', num(b.rateMin, 0, 1000));
  set('rateMax', num(b.rateMax, 0, 1000));
  set('startTotal', num(b.startTotal, 0, 100000));
  set('dipEvery', num(b.dipEvery, 0, 1000));
  set('venueCap', num(b.venueCap, 0, 100000));
  if (a.rateMax < a.rateMin) a.rateMax = a.rateMin;
  if (b.afterCap === 'shuffle' || b.afterCap === 'hold') a.afterCap = b.afterCap;
  if (typeof b.favoriteId === 'string' && db.candidates.some(c => c.id === b.favoriteId)) a.favoriteId = b.favoriteId;
  const iv = num(b.intervalMin, 1, 1440);
  if (iv !== undefined && iv !== a.intervalMin) {
    // keep the current slot where it is when the interval changes
    a.intervalMin = iv;
    if (a.on) a.startAt = Date.now() - slotBefore * iv * 60 * 1000;
  }
  if (typeof b.on === 'boolean' && b.on !== a.on) {
    if (!b.on) a.frozenSlot = slotBefore;
    else a.startAt = Date.now() - a.frozenSlot * a.intervalMin * 60 * 1000;
    a.on = b.on;
  }
  saveDb();
  res.json({ ok: true });
});

// move the story forward one update right now
app.post('/api/admin/auto/step', requireAdmin, (req, res) => {
  if (db.auto.on) db.auto.startAt -= db.auto.intervalMin * 60 * 1000;
  else db.auto.frozenSlot += 1;
  saveDb();
  res.json({ ok: true });
});

// start a fresh story from now
app.post('/api/admin/auto/restart', requireAdmin, (req, res) => {
  db.auto.startAt = Date.now();
  db.auto.frozenSlot = 0;
  db.auto.seed = crypto.randomInt(1, 2 ** 31);
  db.candidates.forEach(c => (c.offset = 0));
  saveDb();
  res.json({ ok: true });
});

app.post('/api/admin/candidates', requireAdmin, media, (req, res) => {
  const name = String(req.body.name || '').trim().slice(0, 60);
  if (!name) return res.status(400).json({ error: 'Name is required' });
  const c = {
    id: newId(), name, offset: 0,
    photo: req.files?.photo ? '/uploads/' + req.files.photo[0].filename : null
  };
  db.candidates.push(c);
  saveDb();
  res.json(c);
});

app.put('/api/admin/candidates/:id', requireAdmin, media, (req, res) => {
  const c = db.candidates.find(x => x.id === req.params.id);
  if (!c) return res.status(404).json({ error: 'Not found' });
  if (req.body.name) c.name = String(req.body.name).trim().slice(0, 60);
  if (req.files?.photo) { removeFile(c.photo); c.photo = '/uploads/' + req.files.photo[0].filename; }
  saveDb();
  res.json(c);
});

// manual nudge on top of the script: {delta} or {clear:true}
app.post('/api/admin/candidates/:id/adjust', requireAdmin, (req, res) => {
  const c = db.candidates.find(x => x.id === req.params.id);
  if (!c) return res.status(404).json({ error: 'Not found' });
  if (req.body.clear) c.offset = 0;
  else if (Number.isFinite(req.body.delta)) c.offset = (c.offset || 0) + Math.round(req.body.delta);
  saveDb();
  res.json({ ok: true });
});

app.post('/api/admin/venues/:id/adjust', requireAdmin, (req, res) => {
  const v = db.venues.find(x => x.id === req.params.id);
  if (!v) return res.status(404).json({ error: 'Not found' });
  if (req.body.clear) v.offset = 0;
  else if (Number.isFinite(req.body.delta)) v.offset = (v.offset || 0) + Math.round(req.body.delta);
  saveDb();
  res.json({ ok: true });
});

app.delete('/api/admin/candidates/:id', requireAdmin, (req, res) => {
  const c = db.candidates.find(x => x.id === req.params.id);
  if (!c) return res.status(404).json({ error: 'Not found' });
  removeFile(c.photo);
  db.candidates = db.candidates.filter(x => x.id !== c.id);
  for (const [v, cid] of Object.entries(db.realVotes)) if (cid === c.id) delete db.realVotes[v];
  if (db.auto.favoriteId === c.id) db.auto.favoriteId = db.candidates[0]?.id || null;
  saveDb();
  res.json({ ok: true });
});

app.post('/api/admin/reset-real-votes', requireAdmin, (req, res) => {
  db.realVotes = {};
  db.venueVotes = {};
  saveDb();
  res.json({ ok: true });
});

app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.use((err, req, res, next) => res.status(400).json({ error: err.message || 'Something went wrong' }));

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Running on http://localhost:${PORT}  (admin: /admin)`);
    if (!process.env.ADMIN_PASSWORD) console.log('WARNING: default admin password "admin123" - set ADMIN_PASSWORD');
  });
}
module.exports = { simulate, getDb: () => db };
