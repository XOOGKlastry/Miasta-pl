const CACHE = "znasz-polske-v4";
const ASSETS = [
  "./", "./index.html", "./miasta.html", "./zdjecie.html", "./herb.html", "./gdzie.html", "./ksztalt.html", "./wiecej.html", "./sasiedzi.html", "./dzis.html", "./wspolne.js", "./wspolne.css", "./powiaty.geojson",
  "./tablice.html", "./tablice-app.js", "./tablice-powiaty.js", "./tablice-poland.js",
  "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./woj.geojson"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;
  if (/overpass|wikidata\.org/.test(url.hostname)) return;
  // strony HTML: najpierw sieć, żeby poprawki docierały od razu; offline z cache
  if (e.request.mode === "navigate") {
    e.respondWith(
      fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return res;
      }).catch(() => caches.match(e.request).then(hit => hit || caches.match("./index.html")))
    );
    return;
  }
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      const cacheable = res.ok && (url.origin === location.origin || url.hostname === "upload.wikimedia.org");
      if (cacheable) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
      }
      return res;
    }))
  );
});
