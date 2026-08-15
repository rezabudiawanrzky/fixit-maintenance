const CACHE_NAME = 'fixit-v2';
const STATIC_ASSETS = [
  '/',
  '/login.html',
  '/index.html',
  '/manifest.json',
  '/icons/icon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('Cache addAll partial failure:', err);
        return cache.add('/login.html');
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Add bypass header for localtunnel interstitial
  const headers = new Headers(event.request.headers);
  headers.set('Bypass-Tunnel-Reminder', 'true');
  const modifiedRequest = new Request(event.request, { headers });

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(modifiedRequest).catch(() => {
        return new Response(
          JSON.stringify({ error: 'Offline - data tidak tersedia' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
      })
    );
    return;
  }

  event.respondWith(
    caches.match(modifiedRequest).then((cached) => {
      if (cached) return cached;
      return fetch(modifiedRequest).then((response) => {
        if (response.ok && url.origin === self.location.origin) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    }).catch(() => {
      if (event.request.mode === 'navigate') {
        return caches.match('/login.html');
      }
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.includes('/index.html') || client.url === self.location.origin + '/') {
          return client.focus();
        }
      }
      return clients.openWindow('/');
    })
  );
});
