const express = require('express');
const path = require('path');
const fs = require('fs');

const PORT = process.env.PORT || 3000;
const CH = {
  handle: process.env.YT_HANDLE || 'MeethoMohan',
  id: process.env.YT_CHANNEL_ID || '',
  key: process.env.YOUTUBE_API_KEY || ''
};
const CACHE_MS = 30 * 60 * 1000;

// ---------------------------------------------------------------- YouTube data
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36';
async function getText(url) {
  const r = await fetch(url, { headers: { 'user-agent': UA, 'accept-language': 'en-US,en;q=0.9' } });
  if (!r.ok) throw new Error(`${r.status} from ${new URL(url).hostname}`);
  return r.text();
}
async function getJson(url) {
  const r = await fetch(url);
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((j.error && j.error.message) || `${r.status} from YouTube API`);
  return j;
}
const decode = s => String(s || '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
function toNum(s) {
  const m = String(s || '').replace(/,/g, '').match(/([\d.]+)\s*([KMB])?/i);
  if (!m) return null;
  return Math.round(parseFloat(m[1]) * ({ K: 1e3, M: 1e6, B: 1e9 }[(m[2] || '').toUpperCase()] || 1));
}

// With a YouTube Data API key: every video and exact totals.
async function viaApi() {
  const base = 'https://www.googleapis.com/youtube/v3';
  const who = CH.id ? `id=${encodeURIComponent(CH.id)}` : `forHandle=${encodeURIComponent('@' + CH.handle)}`;
  const ch = await getJson(`${base}/channels?part=statistics,contentDetails&${who}&key=${CH.key}`);
  const c = ch.items && ch.items[0];
  if (!c) throw new Error('Channel not found');
  const uploads = c.contentDetails.relatedPlaylists.uploads;
  const ids = [];
  let page = '';
  for (let i = 0; i < 6; i++) {
    const pl = await getJson(`${base}/playlistItems?part=contentDetails&maxResults=50&playlistId=${uploads}&key=${CH.key}${page ? '&pageToken=' + page : ''}`);
    for (const it of pl.items || []) ids.push(it.contentDetails.videoId);
    if (!pl.nextPageToken) break;
    page = pl.nextPageToken;
  }
  const videos = [];
  for (let i = 0; i < ids.length; i += 50) {
    const vs = await getJson(`${base}/videos?part=snippet,statistics&id=${ids.slice(i, i + 50).join(',')}&key=${CH.key}`);
    for (const v of vs.items || []) {
      videos.push({ id: v.id, title: v.snippet.title, published: v.snippet.publishedAt, views: +(v.statistics.viewCount || 0), likes: +(v.statistics.likeCount || 0) });
    }
  }
  videos.sort((a, b) => new Date(b.published) - new Date(a.published));
  const st = c.statistics;
  return {
    channelId: c.id,
    subscribers: st.hiddenSubscriberCount ? null : +st.subscriberCount,
    videoCount: +st.videoCount,
    views: +st.viewCount,
    likes: videos.reduce((n, v) => n + v.likes, 0),
    videos, complete: true
  };
}

// Without a key: the channel page for counts, and the public feed for the latest 15 videos.
async function viaFeed() {
  let id = CH.id, subscribers = null, videoCount = null;
  try {
    const html = await getText(`https://www.youtube.com/@${encodeURIComponent(CH.handle)}`);
    id = id || (html.match(/"externalId":"(UC[\w-]{22})"/) || html.match(/itemprop="identifier" content="(UC[\w-]{22})"/) || html.match(/"channelId":"(UC[\w-]{22})"/) || [])[1];
    const s = html.match(/"(?:simpleText|content|label)":"([\d.,]+\s?[KMB]?) subscribers?"/i);
    const v = html.match(/"(?:simpleText|content|label)":"([\d,]+) videos?"/i);
    subscribers = s ? toNum(s[1]) : null;
    videoCount = v ? toNum(v[1]) : null;
  } catch (e) {
    if (!id) throw e;
  }
  if (!id) throw new Error('Could not find the channel');
  const xml = await getText(`https://www.youtube.com/feeds/videos.xml?channel_id=${id}`);
  const videos = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(m => {
    const e = m[1], g = re => (e.match(re) || [])[1];
    return {
      id: g(/<yt:videoId>([\w-]{11})<\/yt:videoId>/),
      title: decode(g(/<title>([\s\S]*?)<\/title>/)),
      published: g(/<published>([^<]+)<\/published>/),
      views: +(g(/<media:statistics views="(\d+)"/) || 0),
      likes: +(g(/<media:starRating count="(\d+)"/) || 0)
    };
  }).filter(v => v.id);
  return {
    channelId: id, subscribers,
    videoCount: videoCount != null ? videoCount : videos.length,
    views: videos.reduce((n, v) => n + v.views, 0),
    likes: videos.reduce((n, v) => n + v.likes, 0),
    videos, complete: false
  };
}

let cache = { at: 0, data: null };
let inflight = null;
async function channelData() {
  if (cache.data && Date.now() - cache.at < CACHE_MS) return cache.data;
  if (!inflight) {
    inflight = (CH.key ? viaApi().catch(() => viaFeed()) : viaFeed())
      .then(d => { cache = { at: Date.now(), data: { ...d, updatedAt: Date.now() } }; return cache.data; })
      .finally(() => { inflight = null; });
  }
  try { return await inflight; } catch (e) { if (cache.data) return cache.data; throw e; }
}

// ------------------------------------------------- one-time cleanup of old data
// The old reunion app kept everything (registrations, votes, chats, Google
// sign-in accounts) in one table. Remove it, and any local copy.
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

// ----------------------------------------------------------------------- app
const app = express();
app.use(express.static(path.join(__dirname, 'public'), { maxAge: '1h', index: 'index.html' }));
app.get('/healthz', (req, res) => res.send('ok'));
app.get('/api/channel', async (req, res) => {
  try { res.set('Cache-Control', 'public, max-age=300').json(await channelData()); }
  catch (e) { res.status(503).json({ error: 'Could not load the channel right now' }); }
});
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

if (require.main === module) {
  deleteOldReunionData().finally(() => {
    app.listen(PORT, () => console.log(`Running on http://localhost:${PORT}`));
    channelData().catch(e => console.error('Channel load failed:', e.message));
  });
}
module.exports = { viaFeed, viaApi, app };
