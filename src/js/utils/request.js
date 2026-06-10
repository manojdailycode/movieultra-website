'use strict';

class JikanQueue {
  constructor() {
    this.queue = [];
    this.running = false;
    this.lastRequestTime = 0;
    this.delay = 334; // 3 requests per second -> ~333ms gap
  }

  enqueue(url, options = {}) {
    return new Promise((resolve, reject) => {
      this.queue.push({ url, options, resolve, reject });
      this.process();
    });
  }

  async process() {
    if (this.running) return;
    if (this.queue.length === 0) return;

    this.running = true;

    while (this.queue.length > 0) {
      const now = Date.now();
      const timeSinceLast = now - this.lastRequestTime;
      const waitTime = this.delay - timeSinceLast;

      if (waitTime > 0) {
        await new Promise(r => setTimeout(r, waitTime));
      }

      const item = this.queue.shift();
      if (!item) continue;
      
      const { url, options, resolve, reject } = item;
      this.lastRequestTime = Date.now();

      try {
        const res = await fetch(url, options);
        resolve(res);
      } catch (err) {
        reject(err);
      }
    }

    this.running = false;
  }
}

export const jikanQueue = new JikanQueue();

const apiCache = {};

export async function fetchTMDB(path, params = {}) {
  const cacheKey = `tmdb:${path}:${JSON.stringify(params)}`;
  if (apiCache[cacheKey]) return apiCache[cacheKey];

  const proxyUrl = new URL('/api/tmdb', window.location.origin);
  proxyUrl.searchParams.set('path', path);
  Object.entries(params).forEach(([k, v]) => proxyUrl.searchParams.set(k, v));

  try {
    const res = await fetch(proxyUrl.toString());
    if (res.status === 404) {
      throw new Error('Proxy returned 404');
    }
    if (!res.ok) {
      throw new Error(`Proxy returned status ${res.status}`);
    }
    const data = await res.json();
    apiCache[cacheKey] = data;
    return data;
  } catch (proxyError) {
    console.warn('[MovieUltra] TMDB Proxy failed, falling back to direct API:', proxyError.message);
    
    const directUrl = new URL(`https://api.themoviedb.org/3${path}`);
    directUrl.searchParams.set('api_key', 'cf73f47a609d2e71e31813358f64cb2f');
    Object.entries(params).forEach(([k, v]) => directUrl.searchParams.set(k, v));

    const res = await fetch(directUrl.toString());
    if (!res.ok) {
      throw new Error(`TMDB Direct API ${res.status}: ${res.statusText}`);
    }
    const data = await res.json();
    apiCache[cacheKey] = data;
    return data;
  }
}

export async function fetchJikan(path) {
  const cacheKey = `jikan:${path}`;
  if (apiCache[cacheKey]) return apiCache[cacheKey];

  const proxyUrl = new URL('/api/jikan', window.location.origin);
  proxyUrl.searchParams.set('path', path);

  try {
    const res = await jikanQueue.enqueue(proxyUrl.toString());
    if (res.status === 404) {
      throw new Error('Proxy returned 404');
    }
    if (!res.ok) {
      throw new Error(`Proxy returned status ${res.status}`);
    }
    const data = await res.json();
    apiCache[cacheKey] = data;
    return data;
  } catch (proxyError) {
    console.warn('[MovieUltra] Jikan Proxy failed, falling back to direct API:', proxyError.message);
    
    const directUrl = `https://api.jikan.moe/v4${path}`;
    const res = await jikanQueue.enqueue(directUrl);
    if (!res.ok) {
      throw new Error(`Jikan Direct API ${res.status}: ${res.statusText}`);
    }
    const data = await res.json();
    apiCache[cacheKey] = data;
    return data;
  }
}

export function clearRequestCache() {
  Object.keys(apiCache).forEach(k => delete apiCache[k]);
}
