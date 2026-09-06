'use strict';

import { setCors, rateLimit } from './lib/security.js';

export default async function handler(req, res) {
  if (setCors(req, res)) return;
  if (rateLimit(req, res, { max: 60, windowMs: 60000 })) return;

  const { i, t, s, y, type, page } = req.query;

  const apiKey = process.env.OMDB_KEY;
  if (!apiKey) {
    // Fail silently with 200 so client degrades gracefully to TMDB ratings without 500 errors
    return res.status(200).json({ Response: 'False', Error: 'OMDb API key is not configured' });
  }

  const query = new URLSearchParams({ apikey: apiKey });
  if (i) query.set('i', String(i).trim());
  if (t) query.set('t', String(t).trim());
  if (s) query.set('s', String(s).trim());
  if (y) query.set('y', String(y).trim());
  if (type) query.set('type', String(type).trim());
  if (page) query.set('page', String(page).trim());

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(`https://www.omdbapi.com/?${query.toString()}`, {
      signal: controller.signal
    });
    clearTimeout(timeout);

    const data = await response.json();
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=43200');
    return res.status(200).json(data);
  } catch (err) {
    // Fail gracefully with Response: False
    return res.status(200).json({ Response: 'False', Error: err.message || 'OMDb request failed' });
  }
}
