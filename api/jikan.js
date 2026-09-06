'use strict';

import { setCors, rateLimit, validatePath } from './lib/security.js';

const ALLOWED_JIKAN_PATHS = [
  '/anime',
  '/top/',
  '/seasons',
  '/genres',
  '/characters',
  '/people'
];

export default async function handler(req, res) {
  // CORS & Preflight handling
  if (setCors(req, res)) return;

  // Rate limiting (60 requests per minute per IP)
  if (rateLimit(req, res, { max: 60, windowMs: 60000 })) return;

  const { path } = req.query;

  // Path validation & whitelisting
  const pathValidation = validatePath(path, ALLOWED_JIKAN_PATHS);
  if (!pathValidation.valid) {
    return res.status(400).json({ error: pathValidation.error });
  }

  const url = `https://api.jikan.moe/v4${path}`;

  try {
    const apiRes = await fetch(url);
    if (!apiRes.ok) {
      return res.status(apiRes.status).json({ error: `Jikan API error: ${apiRes.statusText}` });
    }
    const data = await apiRes.json();
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=43200');
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
