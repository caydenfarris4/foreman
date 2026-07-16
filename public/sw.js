// Foreman service worker.
//
// Deliberately minimal: the app is session-based and fully dynamic, so
// pages and API responses are never cached — every request goes to the
// network. The worker exists to (a) meet PWA installability criteria for
// the Play Store TWA and (b) show a branded offline page instead of the
// browser error when there's no connection.
//
// Bump VERSION when offline.html or the precached assets change.
const VERSION = "v1";
const CACHE = `foreman-${VERSION}`;
const OFFLINE_URL = "/offline.html";
const PRECACHE = [OFFLINE_URL, "/icons/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.mode !== "navigate") return; // everything else: straight to network
  event.respondWith(
    fetch(request).catch(() =>
      caches
        .match(OFFLINE_URL)
        .then((cached) => cached ?? Response.error()),
    ),
  );
});
