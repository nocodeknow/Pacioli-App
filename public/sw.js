const CACHE_NAME = 'pacioli-cache-v1';
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/icon-192.png',
  '/icon-512.png'
];

// Install Event: Pre-cache the shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-caching offline shell');
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event: Implement stale-while-revalidate and navigation fallback
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Bypass non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Bypass API requests and local dev HMR / hot-reload endpoints
  if (
    url.pathname.startsWith('/api') || 
    url.pathname.includes('/@vite') || 
    url.pathname.includes('/@id') || 
    url.pathname === '/ws' ||
    url.hostname === 'localhost' && url.port === '8788' && url.pathname.startsWith('/cdn-cgi')
  ) {
    return;
  }

  // Handle SPA navigation requests
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          // If network fetch fails (offline), return the cached index.html shell
          return caches.match('/index.html');
        })
    );
    return;
  }

  // Use Stale-While-Revalidate for other static assets
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Create the network fetch promise
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Ignore network errors in background fetches
        });

      // Return cached response immediately if available, otherwise wait for network
      return cachedResponse || fetchPromise;
    })
  );
});
