<<<<<<< HEAD
const CACHE_NAME = 'movieultra-cache-v2.0.0';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/public/logo.svg',
  '/public/icons/icon-192.svg',
  '/public/icons/icon-512.svg',
  '/src/css/main.css',
  '/src/css/tokens.css',
  '/src/css/reset.css',
  '/src/css/layout.css',
  '/src/css/components.css',
  '/src/css/views.css',
  '/src/css/anime.css',
  '/src/css/animations.css',
  '/src/js/app.js',
  '/src/js/store/events.js',
  '/src/js/store/library.js',
  '/src/js/store/watchlist.js',
  '/src/js/store/history.js',
  '/src/js/store/user.js',
  '/src/js/api/tmdb.js',
  '/src/js/api/jikan.js',
  '/src/js/components/card.js',
  '/src/js/components/modal.js',
  '/src/js/components/toast.js',
  '/src/js/components/sidebar.js',
  '/src/js/components/trailer.js',
  '/src/js/components/skeleton.js',
  '/src/js/views/home.js',
  '/src/js/views/trending.js',
  '/src/js/views/movies.js',
  '/src/js/views/series.js',
  '/src/js/views/anime.js',
  '/src/js/views/watchlist.js',
  '/src/js/views/history.js',
  '/src/js/views/analytics.js',
  '/src/js/views/profile.js',
  '/src/js/views/settings.js',
  '/src/js/views/feedback.js',
  '/src/js/utils/storage.js',
  '/src/js/utils/escape.js',
  '/src/js/utils/date.js',
  '/src/js/utils/debounce.js',
  '/src/js/utils/request.js'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || e.request.url.includes('/api/')) {
    return;
  }
  
  e.respondWith(
    caches.match(e.request).then(cachedResponse => {
      if (cachedResponse) {
        // Fetch network copy in background to keep cache fresh
        fetch(e.request).then(networkResponse => {
          if (networkResponse.status === 200) {
            caches.open(CACHE_NAME).then(cache => cache.put(e.request, networkResponse));
          }
        }).catch(() => {});
        return cachedResponse;
      }
      
      return fetch(e.request).then(networkResponse => {
        if (networkResponse.status === 200) {
          const cacheCopy = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, cacheCopy));
        }
        return networkResponse;
      });
    })
  );
});

self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') {
    self.skipWaiting();
=======
const CACHE_NAME = 'movieultra-v1-7-0';

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/src/styles.css',
  '/src/script.js',
  '/src/logo.svg',
  'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;600;800&display=swap',
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(PRECACHE_URLS);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((key) => key !== CACHE_NAME)
        .map((key) => caches.delete(key))
    );
    await self.clients.claim();
  })());
});

function isApiRequest(url) {
  return url.pathname.startsWith('/api/tmdb') || url.hostname.includes('api.jikan.moe');
}

function offlineFallback() {
  return new Response('Offline: content is unavailable right now.', {
    status: 503,
    statusText: 'Service Unavailable',
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;

  if (isApiRequest(url)) {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(request);
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, fresh.clone());
        return fresh;
      } catch {
        const cached = await caches.match(request);
        return cached || offlineFallback();
      }
    })());
    return;
  }

  if (sameOrigin) {
    event.respondWith((async () => {
      const cached = await caches.match(request);
      if (cached) return cached;

      try {
        const fresh = await fetch(request);
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, fresh.clone());
        return fresh;
      } catch {
        return offlineFallback();
      }
    })());
>>>>>>> origin/main
  }
});
