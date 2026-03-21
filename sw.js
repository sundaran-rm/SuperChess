// ══════════════════════════════════════════════
// Kingdom Chess — Service Worker  (sw.js)
// Place this file in the SAME folder as the HTML
// ══════════════════════════════════════════════
const CACHE = 'kchess-v1';

// Files to pre-cache (the app shell)
const SHELL = [
  './',
  './chess_stage3.html'   // update this name if you rename the HTML file
];

// ── Install: pre-cache shell ──
self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL).catch(() => {
      // Silently ignore cache failures (e.g. file not found during dev)
    }))
  );
});

// ── Activate: clean up old caches ──
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// ── Fetch: network-first for external, cache-first for app shell ──
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Let Firebase, Google Fonts, and CDN requests go through normally
  // Fall back to cache only if offline
  const isExternal =
    url.origin !== self.location.origin ||
    url.hostname.includes('firebase') ||
    url.hostname.includes('googleapis') ||
    url.hostname.includes('gstatic') ||
    url.hostname.includes('fonts.g');

  if (isExternal) {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    );
    return;
  }

  // App shell: try network first, fall back to cache
  e.respondWith(
    caches.open(CACHE).then(cache =>
      fetch(e.request)
        .then(res => {
          if (res.ok) cache.put(e.request, res.clone());
          return res;
        })
        .catch(() =>
          caches.match(e.request).then(cached =>
            cached || new Response(
              '<h2 style="font-family:sans-serif;text-align:center;margin-top:40vh">📶 Offline — open the app when back online</h2>',
              { status: 503, headers: { 'Content-Type': 'text/html' } }
            )
          )
        )
    )
  );
});
