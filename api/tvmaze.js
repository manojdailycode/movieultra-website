'use strict';

import { setCors, rateLimit } from './lib/security.js';

export default async function handler(req, res) {
  if (setCors(req, res)) return;
  if (rateLimit(req, res, { max: 60, windowMs: 60000 })) return;

  const { imdb, q } = req.query;

  let url;
  if (imdb && typeof imdb === 'string' && /^tt\d+$/.test(imdb.trim())) {
    url = `https://api.tvmaze.com/lookup/shows?imdb=${encodeURIComponent(imdb.trim())}`;
  } else if (q && typeof q === 'string' && q.trim().length > 0) {
    url = `https://api.tvmaze.com/singlesearch/shows?q=${encodeURIComponent(q.trim())}&embed=nextepisode`;
  } else {
    return res.status(200).json({ found: false, error: 'Missing parameter: provide either "imdb" or "q"' });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(url, {
      redirect: 'follow',
      headers: { 'User-Agent': 'MovieUltra/2.2' },
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (response.status === 404) {
      return res.status(200).json({ found: false });
    }

    if (!response.ok) {
      return res.status(200).json({ found: false, status: response.status });
    }

    const data = await response.json();
    res.setHeader('Cache-Control', 's-maxage=43200, stale-while-revalidate=21600');
    return res.status(200).json({ found: true, show: data });
  } catch (err) {
    // Fail gracefully with HTTP 200 so the client degrades silently without console errors
    return res.status(200).json({ found: false, error: err.message });
  }
}
