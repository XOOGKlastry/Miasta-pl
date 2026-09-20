// Działa offline, ale zawsze najpierw próbuje sieci, żeby poprawki docierały od razu.
const CACHE = "znasz-polske-v5";
const ASSETS = [
  "./", "./index.html", "./miasta.html", "./zdjecie.html", "./herb.html", "./gdzie.html", "./ksztalt.html",
  "./wiecej.html", "./sasiedzi.html", "./dzis.html", "./tablice.html",
  "./tablice-app.js", "./tablice-powiaty.js", "./tablice-poland.js",
  "./wspolne.js?v=5", "./wspolne.css?v=5", "./topojson-client.min.js?v=5", "./powiaty.topojson?v=5", "./woj.geojson?v=5",
  "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => Promise.all(ASSETS.map(u => c.add(new Request(u, { cache: "reload" })).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  const own = url.origin === location.origin;
  const img = url.hostname === "upload.wikimedia.org" || url.hostname === "commons.wikimedia.org";
  if (!own && !img) return; // mapy, Overpass, Wikidata: bez pośrednictwa
  if (own) {
    // najpierw sieć (z pominięciem pamięci przeglądarki), offline z pamięci aplikacji
    e.respondWith(
      fetch(e.request, { cache: "no-cache" }).then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
        return res;
      }).catch(() => caches.match(e.request).then(hit => hit || (e.request.mode === "navigate" ? caches.match("./index.html") : Response.error())))
    );
    return;
  }
  // obrazki herbów z Commons: z pamięci, gdy już były
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
      return res;
    }))
  );
});
