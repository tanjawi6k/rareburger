// public/sw.js
// Service Worker manuel — compatible Astro 6 (pas de dépendance externe)
const CACHE      = 'cmdola-pos-v1';
const CACHE_IMGS = 'cmdola-images-v1';

// Assets statiques à précacher (générés au build par Astro dans /_astro/)
const PRECACHE = [
  '/',
  '/pos',
  '/manifest.json',
  '/favicon.ico',
];

// ── Install : précache ────────────────────────
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

// ── Activate : nettoyage anciens caches ───────
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE && k !== CACHE_IMGS).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch : stratégies par type ───────────────
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Ne pas intercepter les requêtes cross-origin non-API
  if (url.origin !== self.location.origin && !url.pathname.startsWith('/api/')) return;

  // Images : CacheFirst (longue durée)
  if (url.pathname.includes('/images/') || /\.(png|jpe?g|webp|gif|svg)$/i.test(url.pathname)) {
    e.respondWith(
      caches.open(CACHE_IMGS).then(async cache => {
        const cached = await cache.match(e.request);
        if (cached) return cached;
        const resp = await fetch(e.request).catch(() => null);
        if (resp?.ok) cache.put(e.request, resp.clone());
        return resp ?? new Response('', { status: 503 });
      })
    );
    return;
  }

  // API menu + config : StaleWhileRevalidate (offline ok, fond mis à jour)
  if (url.pathname.startsWith('/api/menu') || url.pathname.startsWith('/api/config')) {
    e.respondWith(
      caches.open(CACHE).then(async cache => {
        const cached = await cache.match(e.request);
        const fetchProm = fetch(e.request)
          .then(resp => { if (resp.ok) cache.put(e.request, resp.clone()); return resp; })
          .catch(() => null);
        return cached ?? fetchProm ?? new Response(JSON.stringify({ error: 'offline' }), {
          status: 503, headers: { 'Content-Type': 'application/json' },
        });
      })
    );
    return;
  }

  // API commandes (POST/PUT/DELETE) : NetworkOnly — pas de cache
  if (url.pathname.startsWith('/api/')) return;

  // Assets statiques JS/CSS : CacheFirst
  if (/\.(js|css|woff2?)$/i.test(url.pathname)) {
    e.respondWith(
      caches.open(CACHE).then(async cache => {
        const cached = await cache.match(e.request);
        if (cached) return cached;
        const resp = await fetch(e.request).catch(() => null);
        if (resp?.ok) cache.put(e.request, resp.clone());
        return resp ?? new Response('', { status: 503 });
      })
    );
    return;
  }

  // Navigation /pos : NetworkFirst avec fallback cache
  if (url.pathname === '/pos' || url.pathname === '/pos/') {
    e.respondWith(
      fetch(e.request).catch(() => caches.match('/pos'))
    );
    return;
  }
});