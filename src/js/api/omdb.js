'use strict';

const cache = {};

/**
 * Fetches OMDb data (includes real IMDb rating/votes) for a known IMDb ID.
 * Returns null on failure — callers must treat that as "no data", never fabricate a rating.
 */
export async function getOMDBById(imdbId) {
  if (!imdbId) return null;
  if (cache[imdbId] !== undefined) return cache[imdbId];

  try {
    const url = new URL('/api/omdb', window.location.origin);
    url.searchParams.set('i', imdbId);
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`OMDb proxy ${res.status}`);
    const data = await res.json();
    if (!data || data.Response === 'False') {
      cache[imdbId] = null;
      return null;
    }
    cache[imdbId] = data;
    return data;
  } catch (err) {
    console.warn('[MovieUltra] OMDb lookup failed:', err.message);
    cache[imdbId] = null;
    return null;
  }
}
