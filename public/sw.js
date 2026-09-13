const CACHE_NAME = "tasktrackerhq-v4";
const STATIC_PRECACHE = [
  "/manifest.json",
  "/tasktracker-logo.jpg",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png"
];

// Install: pre-cache essential icons & manifest
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_PRECACHE).catch(() => {});
    })
  );
  self.skipWaiting();
});

// Activate: clean up old caches immediately and take control of all open clients
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Message listener for skip waiting & client communication
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// Fetch strategy
self.addEventListener("fetch", (event) => {
  // Only handle GET requests
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // 1. NEVER cache API requests, Next.js RSC requests, or Auth endpoints
  if (
    url.pathname.startsWith("/api/") ||
    url.searchParams.has("_rsc") ||
    event.request.headers.get("RSC") === "1" ||
    event.request.headers.get("Next-Router-State-Tree")
  ) {
    return; // Pass through to network directly
  }

  // 2. Navigation / HTML pages (Network-First with fallback to cache)
  const isNav = event.request.mode === "navigate" || event.request.headers.get("accept")?.includes("text/html");
  if (isNav) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(event.request).then((cached) => {
            if (cached) return cached;
            return caches.match("/");
          });
        })
    );
    return;
  }

  // 3. Static assets: _next/static, images, icons (Stale-While-Revalidate)
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|webp|ico|woff2?|css|js)$/)
  ) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const copy = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
            }
            return networkResponse;
          })
          .catch(() => null);

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // 4. Default: Network first
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});