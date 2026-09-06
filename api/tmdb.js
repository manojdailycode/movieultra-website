'use strict';

import https from 'https';
import dns from 'dns';
import { setCors, rateLimit, validatePath } from './lib/security.js';

const resolver = new dns.promises.Resolver();
try {
  resolver.setServers(['1.1.1.1', '8.8.8.8', '1.0.0.1', '8.8.4.4']);
} catch { /* ignore */ }

const ALLOWED_TMDB_PATHS = [
  '/movie/',
  '/tv/',
  '/person/',
  '/search/',
  '/trending/',
  '/genre/',
  '/discover/',
  '/collection/',
  '/find/',
  '/configuration'
];

async function fetchWithDnsFallback(urlStr) {
  const url = new URL(urlStr);

  // 1. Primary: Native fetch with timeout
  try {
    const apiRes = await fetch(urlStr, { signal: AbortSignal.timeout(3500) });
    if (apiRes.ok) return await apiRes.json();
  } catch {
    // Fall through to public DNS fallback if ISP DNS blocks/poisons the endpoint
  }

  // 2. Fallback: Resolve via public DNS and connect using SNI
  try {
    const ips = await resolver.resolve4(url.hostname);
    if (!ips || !ips.length) throw new Error('DNS resolution failed');

    return await new Promise((resolve, reject) => {
      const req = https.request({
        hostname: ips[0],
        port: 443,
        path: url.pathname + url.search,
        method: 'GET',
        headers: {
          'Host': url.hostname,
          'User-Agent': 'MovieUltra/2.0'
        },
        servername: url.hostname,
        timeout: 5000
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(data));
            } catch {
              reject(new Error('Invalid JSON received from TMDB'));
            }
          } else {
            reject(new Error(`TMDB error: ${res.statusCode} ${res.statusMessage}`));
          }
        });
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('TMDB connection timeout'));
      });
      req.on('error', reject);
      req.end();
    });
  } catch (err) {
    throw new Error(err.message || 'TMDB request failed');
  }
}

export default async function handler(req, res) {
  // CORS & Preflight handling
  if (setCors(req, res)) return;

  // Rate limiting (60 requests per minute per IP)
  if (rateLimit(req, res, { max: 60, windowMs: 60000 })) return;

  const { path, ...queryParams } = req.query;

  // Path validation & whitelisting
  const pathValidation = validatePath(path, ALLOWED_TMDB_PATHS);
  if (!pathValidation.valid) {
    return res.status(400).json({ error: pathValidation.error });
  }

  const apiKey = process.env.TMDB_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'TMDB API key is not configured on server' });
  }

  const url = new URL(`https://api.themoviedb.org/3${path}`);
  url.searchParams.set('api_key', apiKey);
  Object.entries(queryParams).forEach(([k, v]) => {
    if (k !== 'path') url.searchParams.set(k, v);
  });

  try {
    const data = await fetchWithDnsFallback(url.toString());
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=43200');
    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
