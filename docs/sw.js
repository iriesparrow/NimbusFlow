/* Well-Being OS service worker
   - Caches the app shell so it loads offline / fast
   - Handles notification clicks (focus the app)
   Bump CACHE when you change files so phones pull the new version. */
const CACHE = 'wellbeing-os-v7';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).catch(() => {}));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  // Network-first for navigations so updates show up; cache fallback offline.
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(() => caches.match('./index.html')));
    return;
  }
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
});

// Let the page ask the SW to show a notification (works while app is open/backgrounded).
self.addEventListener('message', (e) => {
  const d = e.data || {};
  if (d.type === 'notify' && self.registration.showNotification) {
    self.registration.showNotification(d.title || 'Well-Being OS', {
      body: d.body || '',
      tag: d.tag || 'wellbeing',
      icon: './icons/icon-192.png',
      badge: './icons/icon-192.png',
      data: { url: './index.html' }
    });
  }
});

// Background push from the server (fires even when the app is fully closed).
self.addEventListener('push', (e) => {
  let d = { title: '🧬 Well-Being OS', body: '' };
  try { if (e.data) d = e.data.json(); } catch (_) { if (e.data) d.body = e.data.text(); }
  e.waitUntil(self.registration.showNotification(d.title || '🧬 Well-Being OS', {
    body: d.body || '',
    icon: './icons/icon-192.png',
    badge: './icons/icon-192.png',
    tag: d.tag || 'wb-push',
    data: { url: './index.html' }
  }));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((cl) => {
      for (const c of cl) { if ('focus' in c) return c.focus(); }
      if (self.clients.openWindow) return self.clients.openWindow('./index.html');
    })
  );
});
