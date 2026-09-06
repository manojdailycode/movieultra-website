'use strict';

import crypto from 'crypto';
import { setCors, rateLimit, isOriginAllowed } from './lib/security.js';

const SECRET = process.env.STREAM_SECRET || 'movieultra_fallback_secret_key_32chars_len';
const TOKEN_EXPIRY_SECONDS = 300; // 5 minutes

// Server-side streaming source definitions (never exposed in client JS)
const SOURCES = {
  movie: {
    quantum: (id) => `https://vidlink.pro/movie/${id}?player=jw`,
    nova:    (id) => `https://vidfast.pro/movie/${id}?autoPlay=true`,
    astro:   (id) => `https://hexa.su/watch/movie/${id}?autoPlay=true`,
    movio:   (id) => `https://vidsrc.cc/v2/embed/movie/${id}?autoPlay=true`,
    turbo:   (id) => `https://vidsrc.icu/embed/movie/${id}?autoPlay=true`,
  },
  tv: {
    quantum: (id, s = 1, e = 1) => `https://vidlink.pro/tv/${id}/${s}/${e}?player=jw`,
    nova:    (id, s = 1, e = 1) => `https://vidfast.pro/tv/${id}/${s}/${e}?autoPlay=true`,
    astro:   (id, s = 1, e = 1) => `https://hexa.su/watch/tv/${id}/${s}/${e}?autoPlay=true`,
    movio:   (id, s = 1, e = 1) => `https://vidsrc.cc/v2/embed/tv/${id}/${s}/${e}?autoPlay=true`,
    turbo:   (id, s = 1, e = 1) => `https://vidsrc.icu/embed/tv/${id}/${s}/${e}?autoPlay=true`,
  },
  anime: {
    'anime-vidnest': (id, ep = 1, lang = 'sub') => {
      const cleanId = String(id).replace(/^(ani|mal):/, '');
      return `https://vidnest.fun/anime/${cleanId}/${ep}/${lang}`;
    },
    vidnest: (id, ep = 1, lang = 'sub') => {
      const cleanId = String(id).replace(/^(ani|mal):/, '');
      return `https://vidnest.fun/anime/${cleanId}/${ep}/${lang}`;
    },
    'anime-vidhawk': (id, ep = 1, lang = 'sub') => {
      const isAni = String(id).startsWith('ani:');
      const cleanId = String(id).replace(/^(ani|mal):/, '');
      return isAni
        ? `https://vidhawk.buzz/embed/ani/${cleanId}/${ep}/${lang}?server=kari`
        : `https://vidhawk.buzz/embed/mal/${cleanId}/${ep}/${lang}?server=kari`;
    },
    vidhawk: (id, ep = 1, lang = 'sub') => {
      const isAni = String(id).startsWith('ani:');
      const cleanId = String(id).replace(/^(ani|mal):/, '');
      return isAni
        ? `https://vidhawk.buzz/embed/ani/${cleanId}/${ep}/${lang}?server=kari`
        : `https://vidhawk.buzz/embed/mal/${cleanId}/${ep}/${lang}?server=kari`;
    }
  }
};

/**
 * Generate HMAC-SHA256 signed token
 */
function generateToken(payload) {
  const data = JSON.stringify({
    ...payload,
    exp: Date.now() + TOKEN_EXPIRY_SECONDS * 1000
  });
  const encoded = Buffer.from(data).toString('base64url');
  const sig = crypto.createHmac('sha256', SECRET).update(encoded).digest('hex');
  return `${encoded}.${sig}`;
}

/**
 * Verify token and return payload, or null if invalid or expired
 */
function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [encoded, sig] = parts;
  const expectedSig = crypto.createHmac('sha256', SECRET).update(encoded).digest('hex');

  // Constant-time comparison
  const sigBuffer = Buffer.from(sig);
  const expectedBuffer = Buffer.from(expectedSig);
  if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
    if (typeof payload.exp !== 'number' || Date.now() > payload.exp) {
      return null; // Expired
    }
    return payload;
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  if (setCors(req, res)) return;
  if (rateLimit(req, res, { max: 120, windowMs: 60000 })) return;

  const { action, type, id, source, season, episode, lang, token } = req.query;

  // ── ACTION: Issue short-lived token ──────────────────────────────
  if (action === 'token') {
    // Restrict token generation to authorized origins
    if (!isOriginAllowed(req)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (!type || !id || !source) {
      return res.status(400).json({ error: 'Missing required parameters: type, id, source' });
    }

    const group = SOURCES[type];
    if (!group || !group[source]) {
      return res.status(404).json({ error: `Unknown source: ${source} for type: ${type}` });
    }

    const streamToken = generateToken({
      type,
      id,
      source,
      season: season || null,
      episode: episode || null,
      lang: lang || 'sub'
    });

    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    return res.status(200).json({ token: streamToken });
  }

  // ── ACTION: Render embed player HTML ─────────────────────────────
  if (action === 'embed') {
    if (!token) {
      return res.status(401).send('<h3>Unauthorized: Missing stream token.</h3>');
    }

    const payload = verifyToken(token);
    if (!payload) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(401).send(`<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Stream Expired</title>
<style>body{background:#0a0a0a;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;}</style>
</head>
<body><div style="text-align:center;"><h3>Stream link expired</h3><p>Please refresh the player to reconnect.</p></div></body>
</html>`);
    }

    const { type: t, id: itemId, source: src, season: s, episode: e, lang: l } = payload;
    const group = SOURCES[t];
    if (!group || !group[src]) {
      return res.status(404).send('<h3>Stream source not found.</h3>');
    }

    let actualUrl;
    if (t === 'anime') {
      actualUrl = group[src](itemId, e || 1, l || 'sub');
    } else if (t === 'tv') {
      actualUrl = group[src](itemId, s || 1, e || 1);
    } else {
      actualUrl = group[src](itemId);
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'no-referrer');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MovieUltra Player</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; background: #000; overflow: hidden; }
    iframe { width: 100%; height: 100%; border: 0; display: block; }
  </style>
</head>
<body>
  <iframe
    src="${actualUrl}"
    allowfullscreen
    allow="autoplay; fullscreen; encrypted-media; picture-in-picture; accelerometer; gyroscope"
    referrerpolicy="no-referrer">
  </iframe>
</body>
</html>`;

    if (typeof res.send === 'function') {
      return res.status(200).send(html);
    } else {
      res.statusCode = 200;
      return res.end(html);
    }
  }

  return res.status(400).json({ error: 'Invalid action parameter' });
}
