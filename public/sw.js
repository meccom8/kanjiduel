// KanjiDual Service Worker
// Auto-invalidated on each deploy because Next.js hashes all JS/CSS filenames.
const CACHE = "kanjidual-v1";

// Assets to precache on install (shell only — Next.js JS is already hashed)
const PRECACHE = ["/", "/offline.html"];

self.addEventListener("install", (e) => {
  // Take control immediately — no waiting for old tabs to close
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE).catch(() => {}))
  );
});

self.addEventListener("activate", (e) => {
  // Delete old caches from previous deploys
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const { request } = e;
  const url = new URL(request.url);

  // Skip non-GET, cross-origin, and Supabase/API calls
  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/_next/data/")
  ) {
    return;
  }

  // Network-first for HTML pages (always fresh content)
  if (request.mode === "navigate") {
    e.respondWith(
      fetch(request)
        .then((res) => {
          // Cache a fresh copy for offline fallback
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(request, clone));
          return res;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match("/offline.html"))
        )
    );
    return;
  }

  // Cache-first for static assets (Next.js hashed filenames = safe to cache forever)
  if (url.pathname.startsWith("/_next/static/")) {
    e.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            caches.open(CACHE).then((c) => c.put(request, res.clone()));
            return res;
          })
      )
    );
    return;
  }
});
