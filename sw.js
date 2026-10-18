/* Lego-Statik – Service Worker: App läuft nach dem ersten Öffnen auch offline. */
const VERSION = "fdff94b91966";
const CACHE = "lego-statik-" + VERSION;
const SCHRIFTEN = "lego-statik-schriften";
const DATEIEN = [
  "./", "index.html", "manifest.webmanifest",
  "icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-512.png", "icons/apple-touch-icon.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(DATEIEN)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k.startsWith("lego-statik-") && k !== CACHE && k !== SCHRIFTEN).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // App-Dateien: zuerst aus dem Speicher, sonst aus dem Netz
  if (url.origin === self.location.origin) {
    if (req.mode === "navigate") {
      e.respondWith(caches.match("index.html").then((r) => r || fetch(req)));
      return;
    }
    e.respondWith(caches.match(req, { ignoreSearch: true }).then((r) => r || fetch(req)));
    return;
  }

  // Schriften: aus dem Speicher liefern und im Hintergrund auffrischen
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    e.respondWith(caches.open(SCHRIFTEN).then(async (c) => {
      const alt = await c.match(req);
      const neu = fetch(req).then((res) => { if (res.ok || res.type === "opaque") c.put(req, res.clone()); return res; }).catch(() => alt);
      return alt || neu;
    }));
  }
});
