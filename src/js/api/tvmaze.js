'use strict';

const tvmazeCache = new Map();

/**
 * Fetches television schedule and next episode info from TVMaze.
 * Completely free — no API key required.
 * Fails silently and returns null if show is not found or network drops.
 *
 * @param {string} title - Show title (e.g. "Breaking Bad", "Stranger Things")
 * @param {string|null} imdbId - Optional IMDb ID (e.g. "tt0903747")
 * @returns {Promise<Object|null>} - Show schedule data or null
 */
export async function getTVMazeSchedule(title, imdbId = null) {
  const cacheKey = imdbId ? `imdb:${imdbId}` : `q:${(title || '').toLowerCase().trim()}`;
  if (tvmazeCache.has(cacheKey)) {
    return tvmazeCache.get(cacheKey);
  }

  try {
    const url = new URL('/api/tvmaze', window.location.origin);
    if (imdbId && /^tt\d+$/.test(String(imdbId).trim())) {
      url.searchParams.set('imdb', String(imdbId).trim());
    } else if (title && title.trim().length > 0) {
      url.searchParams.set('q', title.trim());
    } else {
      tvmazeCache.set(cacheKey, null);
      return null;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(url.toString(), { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) {
      tvmazeCache.set(cacheKey, null);
      return null;
    }

    const data = await res.json();
    if (data && data.found && data.show) {
      tvmazeCache.set(cacheKey, data.show);
      return data.show;
    }

    tvmazeCache.set(cacheKey, null);
    return null;
  } catch {
    // Fail silently: callers treat null as "no schedule data available"
    tvmazeCache.set(cacheKey, null);
    return null;
  }
}
