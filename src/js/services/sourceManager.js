'use strict';

/**
 * SourceManager — Secure Streaming Source Abstraction.
 *
 * Provider URLs and streaming host endpoints are kept strictly on the server (api/stream.js).
 * The client only manages source identifiers, display names, and requests short-lived
 * signed tokens to load player embeds securely.
 */

const AUTHORIZED_SOURCES = [
  { id: 'quantum', name: 'Quantum', mediaTypes: ['movie', 'tv'], priority: 1, tag: '⚡ High Speed' },
  { id: 'nova',    name: 'Nova',    mediaTypes: ['movie', 'tv'], priority: 2, tag: '🎬 HD Stream' },
  { id: 'astro',   name: 'Astro',   mediaTypes: ['movie', 'tv'], priority: 3, tag: '🌐 Stable' },
  { id: 'movio',   name: 'Movio',   mediaTypes: ['movie', 'tv'], priority: 4, tag: '🍿 Multi-Res' },
  { id: 'turbo',   name: 'Turbo',   mediaTypes: ['movie', 'tv'], priority: 5, tag: '🚀 Fast CDN' }
];

const ANIME_SOURCES = [
  { id: 'vidnest', name: 'VidNest', tag: '🎬 Direct · Clean HD', mediaTypes: ['anime'], priority: 1 },
  { id: 'vidhawk', name: 'VidHawk', tag: '⚡ Ultra Fast · HD', mediaTypes: ['anime'], priority: 2 }
];

const SESSION_FAILURES = {}; // Track failed sources per session

export const SourceManager = {
  /**
   * Build an embeddable YouTube URL for official trailers.
   */
  getTrailerEmbedUrl(youtubeKey, autoplay = false, searchQuery = null) {
    if (youtubeKey) {
      const params = new URLSearchParams({
        rel: '0',
        modestbranding: '1',
        ...(autoplay ? { autoplay: '1' } : {})
      });
      return `https://www.youtube.com/embed/${youtubeKey}?${params}`;
    }
    if (searchQuery) {
      const params = new URLSearchParams({
        listType: 'search',
        list: searchQuery,
        rel: '0',
        modestbranding: '1',
        ...(autoplay ? { autoplay: '1' } : {})
      });
      return `https://www.youtube.com/embed?${params}`;
    }
    return null;
  },

  /**
   * Get all configured playback sources for a given content item.
   * Returns metadata only (no provider URLs).
   */
  getPlaybackSources(type) {
    if (type === 'anime') {
      return ANIME_SOURCES.map(s => ({ ...s }));
    }

    return AUTHORIZED_SOURCES
      .filter(s => s.mediaTypes?.includes(type))
      .sort((a, b) => a.priority - b.priority)
      .map(s => ({ ...s }));
  },

  /**
   * Fetch a short-lived HMAC signed stream token from the backend server.
   */
  async getStreamToken(type, id, sourceId, season = null, episode = null, lang = 'sub') {
    const params = new URLSearchParams({
      action: 'token',
      type,
      id: String(id),
      source: sourceId,
      lang
    });
    if (season) params.set('season', String(season));
    if (episode) params.set('episode', String(episode));

    const res = await fetch(`/api/stream?${params.toString()}`);
    if (!res.ok) {
      let errDetail = 'Failed to obtain stream token';
      try {
        const errJson = await res.json();
        if (errJson.error) errDetail = errJson.error;
      } catch { /* ignore */ }
      throw new Error(errDetail);
    }

    const { token } = await res.json();
    return token;
  },

  /**
   * Build internal embed proxy URL using a signed token.
   */
  buildEmbedUrl(token) {
    return `/api/stream?action=embed&token=${encodeURIComponent(token)}`;
  },

  /**
   * Complete secure stream resolution: Fetches token and returns internal embed URL.
   */
  async resolveEmbedUrl(type, id, sourceId, season = null, episode = null, lang = 'sub') {
    const token = await this.getStreamToken(type, id, sourceId, season, episode, lang);
    return this.buildEmbedUrl(token);
  },

  /**
   * Get the next available source, skipping failed ones.
   */
  getNextAvailableSource(type, id, currentSourceId = null, season = null, episode = null) {
    const sources = this.getPlaybackSources(type);
    const sessionKey = `${type}-${id}-${season}-${episode}`;
    const failedSet = SESSION_FAILURES[sessionKey] || new Set();

    return sources.find(s => !failedSet.has(s.id) && s.id !== currentSourceId) || null;
  },

  /**
   * Mark a source as failed for this playback session.
   */
  markSourceFailed(type, id, sourceId, season = null, episode = null) {
    const sessionKey = `${type}-${id}-${season}-${episode}`;
    if (!SESSION_FAILURES[sessionKey]) {
      SESSION_FAILURES[sessionKey] = new Set();
    }
    SESSION_FAILURES[sessionKey].add(sourceId);
  },

  /**
   * Clear session failures for a specific content.
   */
  clearSessionFailures(type, id, season = null, episode = null) {
    const sessionKey = `${type}-${id}-${season}-${episode}`;
    delete SESSION_FAILURES[sessionKey];
  },

  hasLegitimateSource(type) {
    return this.getPlaybackSources(type).length > 0;
  },

  /**
   * Persistent preference for last used source per content.
   */
  rememberSource(type, id, sourceId) {
    try {
      const prefs = JSON.parse(localStorage.getItem('mu_source_prefs') || '{}');
      prefs[`${type}-${id}`] = sourceId;
      localStorage.setItem('mu_source_prefs', JSON.stringify(prefs));
    } catch { /* ignore */ }
  },

  /**
   * Get the preferred source for a given content.
   */
  getPreferredSource(type, id) {
    try {
      const prefs = JSON.parse(localStorage.getItem('mu_source_prefs') || '{}');
      return prefs[`${type}-${id}`] || null;
    } catch { return null; }
  },

  /**
   * Get the source to use, preferring user's last choice.
   */
  getSourceForPlayback(type, id) {
    const sources = this.getPlaybackSources(type);
    if (!sources.length) return null;

    const preferred = this.getPreferredSource(type, id);
    if (preferred) {
      const found = sources.find(s => s.id === preferred);
      if (found) return found;
    }

    return sources[0];
  }
};
