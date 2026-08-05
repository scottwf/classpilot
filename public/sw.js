// Minimal PWA service worker for ClassPilot.
//
// This app is server-rendered against live SQLite data behind auth, so full
// offline data access isn't attempted here (that would need a rearchitecture
// to a client-side data layer). Scope is intentionally narrow:
//  - Installable app shell (icons + manifest, handled outside this file).
//  - Immutable Next.js build assets and icons served cache-first, so repeat
//    visits load instantly and work briefly offline for already-visited UI.
//  - Page navigations are always network-first (planner data must be fresh),
//    falling back to a friendly /offline page when there's no connection.
//
// Bump CACHE_VERSION when PRECACHE_URLS changes so old caches get cleaned up.
const CACHE_VERSION = "classpilot-v1";
const OFFLINE_URL = "/offline";
const PRECACHE_URLS = [
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(PRECACHE_URLS)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key)),
        ),
      ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  // Page navigations: network-first so plan data is always current when
  // online; fall back to the cached offline page when the network fails.
  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  // Hashed/immutable Next.js build assets and icons: cache-first, populating
  // the cache on first fetch.
  const url = new URL(request.url);
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icon-") ||
    url.pathname === "/apple-touch-icon.png"
  ) {
    event.respondWith(
      caches.open(CACHE_VERSION).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) {
          return cached;
        }
        const response = await fetch(request);
        if (response.ok) {
          cache.put(request, response.clone());
        }
        return response;
      }),
    );
  }
});
