const CACHE_NAME = "awakening-player-v5-v002";
const scopeUrl = new URL(self.registration.scope);
const scopedUrl = (path) => new URL(path, scopeUrl).toString();
const APP_SHELL = [
  scopedUrl("./"),
  scopedUrl("manifest.webmanifest"),
  scopedUrl("icon-192.png"),
  scopedUrl("icon-512.png"),
  scopedUrl("apple-touch-icon.png"),
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)),
        ),
      ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  const apiPath = new URL("api/", scopeUrl).pathname;
  if (url.origin !== self.location.origin || url.pathname.startsWith(apiPath)) return;

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(scopeUrl, copy));
          }
          return response;
        })
        .catch(() => caches.match(scopeUrl)),
    );
    return;
  }

  const fetchAndCache = () =>
    fetch(event.request).then((response) => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
      }
      return response;
    });
  const networkFirst = ["script", "style", "worker"].includes(
    event.request.destination,
  );
  event.respondWith(
    networkFirst
      ? fetchAndCache().catch(() => caches.match(event.request))
      : caches
          .match(event.request)
          .then((cached) => cached || fetchAndCache()),
  );
});
