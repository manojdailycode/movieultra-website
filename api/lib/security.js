'use strict';

/**
 * Security & Utility helper for MovieUltra API routes.
 * Provides origin restriction, rate limiting, and parameter validation.
 */

// In-memory rate limiting store (resets on cold start / per serverless container)
const rateLimitMap = new Map();
const MAX_MAP_SIZE = 10000;

/**
 * Clean up stale rate limit records periodically
 */
function pruneStaleRecords(now, windowMs) {
  if (rateLimitMap.size > MAX_MAP_SIZE) {
    for (const [key, record] of rateLimitMap.entries()) {
      if (now - record.start > windowMs) {
        rateLimitMap.delete(key);
      }
    }
  }
}

/**
 * Check if the given origin or referer is authorized
 */
export function isOriginAllowed(req) {
  const origin = req.headers.origin || '';
  const referer = req.headers.referer || '';
  const checkUrl = origin || referer;

  // Local development addresses
  const allowedDefaults = [
    'http://localhost:3000',
    'http://localhost:5000',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5000'
  ];

  if (process.env.SITE_URL) {
    allowedDefaults.push(process.env.SITE_URL.replace(/\/$/, ''));
  }
  if (process.env.VERCEL_URL) {
    allowedDefaults.push(`https://${process.env.VERCEL_URL.replace(/\/$/, '')}`);
  }

  // If no origin and no referer (direct same-origin GET in some browsers)
  if (!checkUrl) {
    return true;
  }

  try {
    const parsed = new URL(checkUrl);
    const hostOrigin = `${parsed.protocol}//${parsed.host}`;

    // Same-origin request: origin/referer matches the current server host header
    const reqHost = req.headers.host;
    if (reqHost && (parsed.host === reqHost || parsed.hostname === reqHost.split(':')[0])) {
      return true;
    }

    // Explicit match
    if (allowedDefaults.includes(hostOrigin)) {
      return true;
    }

    // Allow all Vercel deployment preview / prod URLs for this project
    if (parsed.hostname.endsWith('.vercel.app')) {
      return true;
    }

    // Localhost / 127.0.0.1 on any dev port
    if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
      return true;
    }
  } catch {
    return false;
  }

  return false;
}

/**
 * Configure secure CORS headers based on verified origin.
 * Returns true if the request was an OPTIONS preflight (and handled).
 */
export function setCors(req, res) {
  const origin = req.headers.origin;

  if (origin && isOriginAllowed(req)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Requested-With'
  );
  res.setHeader('Vary', 'Origin');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return true;
  }

  return false;
}

/**
 * Apply rate limiting to an incoming request.
 * Returns true if request was rate limited and response sent.
 */
export function rateLimit(req, res, { max = 60, windowMs = 60000 } = {}) {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : '') ||
             req.socket?.remoteAddress ||
             'unknown';

  const now = Date.now();
  pruneStaleRecords(now, windowMs);

  if (!rateLimitMap.has(ip)) {
    rateLimitMap.set(ip, { count: 1, start: now });
    return false;
  }

  const record = rateLimitMap.get(ip);
  if (now - record.start > windowMs) {
    record.count = 1;
    record.start = now;
    return false;
  }

  record.count += 1;
  if (record.count > max) {
    res.setHeader('Retry-After', Math.ceil((windowMs - (now - record.start)) / 1000));
    res.status(429).json({ error: 'Too many requests. Please try again in a minute.' });
    return true;
  }

  return false;
}

/**
 * Validate path against path traversal and verify it matches permitted prefixes
 */
export function validatePath(path, allowedPrefixes = []) {
  if (!path || typeof path !== 'string') {
    return { valid: false, error: 'Missing path parameter' };
  }

  // Check path traversal & dangerous characters
  const decoded = decodeURIComponent(path);
  if (
    decoded.includes('..') ||
    decoded.includes('//') ||
    decoded.includes('\\') ||
    /^[a-zA-Z]:/.test(decoded)
  ) {
    return { valid: false, error: 'Invalid path: path traversal detected' };
  }

  if (!path.startsWith('/')) {
    return { valid: false, error: 'Path must start with /' };
  }

  if (allowedPrefixes.length > 0) {
    const isAllowed = allowedPrefixes.some(prefix => path.startsWith(prefix));
    if (!isAllowed) {
      return { valid: false, error: 'Access to the specified path is not permitted' };
    }
  }

  return { valid: true };
}
