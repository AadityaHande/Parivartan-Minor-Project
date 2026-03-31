// SMC Road PWA Service Worker
const CACHE_NAME = 'smc-road-v2';
const urlsToCache = [
  '/',
  '/citizen/dashboard',
  '/citizen/report',
  '/smc/dashboard',
  '/worker/dashboard',
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
      .catch(() => {
        // Fail silently if caching fails
      })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - network first, then cache (skip POST, Firebase, and API requests)
self.addEventListener('fetch', (event) => {
  // Skip POST requests - they cannot be cached
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Skip Firebase and API requests
  const url = event.request.url;
  if (url.includes('firestore.googleapis.com') || 
      url.includes('firebase') || 
      url.includes('googleapis.com') ||
      url.includes('identitytoolkit') ||
      url.includes('securetoken')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Only cache successful GET requests
        if (response.status === 200 && event.request.method === 'GET') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          }).catch(() => {
            // Ignore cache errors
          });
        }
        return response;
      })
      .catch(() => {
        // If network fails, try cache
        return caches.match(event.request).then((response) => {
          if (response) {
            return response;
          }
          // Return a basic offline response if no cache
          return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
        });
      })
  );
});
