const CACHE_NAME = 'movieultra-cache-v2.1.2';
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
  '/src/css/details.css',
  '/src/css/views.css',
  '/src/css/anime.css',
  '/src/css/animations.css',
  '/src/css/watch.css',
  '/src/js/app.js',
  '/src/js/store/events.js',
  '/src/js/store/library.js',
  '/src/js/store/watchlist.js',
  '/src/js/store/history.js',
  '/src/js/store/progress.js',
  '/src/js/store/ratings.js',
  '/src/js/store/recentSearches.js',
  '/src/js/store/user.js',
  '/src/js/services/sourceManager.js',
  '/src/js/api/tmdb.js',
  '/src/js/api/jikan.js',
  '/src/js/api/omdb.js',
  '/src/js/api/tvmaze.js',
  '/src/js/components/card.js',
  '/src/js/components/modal.js',
  '/src/js/components/toast.js',
  '/src/js/components/sidebar.js',
  '/src/js/components/trailer.js',
  '/src/js/components/skeleton.js',
  '/src/js/views/home.js',
  '/src/js/views/watch.js',
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
  // Only intercept same-origin GET requests; bypass /api/ routes and all external CDN URLs (gstatic, cdnjs, fonts, etc.)
  if (
    e.request.method !== 'GET' ||
    !e.request.url.startsWith(self.location.origin) ||
    e.request.url.includes('/api/')
  ) {
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
  }
});
