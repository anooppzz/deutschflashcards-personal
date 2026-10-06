// Service worker: lets the installed app open without internet.
// The whole app is one HTML file (vite-plugin-singlefile), so the cache only
// holds that page, the manifest and the icons.
// - The page: network first, so every deploy arrives as soon as you're
//   online; offline, the last copy from the cache. "no-cache" asks the
//   server every time instead of reusing the browser's copy (GitHub Pages
//   lets browsers keep a page for 10 minutes, which hid fresh deploys).
// - Manifest and icons: cache first.
// Other origins (the translation API) are left alone.
const CACHE = "deutsch-flashcards-v2";
const PAGE = "./index.html";
const SHELL = [PAGE, "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req.url, { cache: "no-cache" })
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(PAGE, copy));
          }
          return res;
        })
        .catch(() => caches.match(PAGE))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
      }
      return res;
    }))
  );
});
