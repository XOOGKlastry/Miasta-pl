// Działa offline, ale zawsze najpierw próbuje sieci, żeby poprawki docierały od razu.
const CACHE = "polskoznawca-v70-czyste-tla";
const ASSETS = ["./karty-dane.json","./karty-v4.css","./login-ui.css?v=2","./konto-ui.css?v=1","./konto-nav.css","./karta-w-ciemno.html","./karta-w-ciemno.js?v=14","./karta-w-ciemno-zasady.js?v=5","./karta-w-ciemno.css","./online-config.js", "./online.js?v=4", "./walka.js?v=2", "./ranking-spolecznosc.js?v=2", "./ranking-spolecznosc.css?v=2", "./logowanie.html", "./ranking.html",
  "./", "./index.html", "./miasta.html", "./zdjecie.html", "./herb.html", "./herby-gmin.js?v=1", "./gdzie.html", "./ksztalt.html",
  "./wiecej.html", "./sasiedzi.html", "./dzis.html", "./wyzwanie.html", "./szostka.html", "./cieplo.html", "./profil.html", "./saga.js", "./memory.html", "./strzal.html", "./karty.html", "./drogi.json?v=1", "./lancuch.html", "./grafiki/plansza/plansza.json?v=2", "./karty-geo.json", "./polandball.js?v=4", "./krainy.js?v=5", "./krainy-grafiki.json", "./malowana-plansza.css?v=1", "./grafiki/krainy/natura.webp", "./grafiki/krainy/wies.webp", "./grafiki/krainy/zabytki.webp", "./grafiki/krainy/przygoda.webp", "./grafiki/krainy/laka.webp", "./grafiki/krainy/morze.webp", "./ciekawostki.json", "./karty.js?v=22", "./instaluj.js", "./efekty.js?v=17", "./plansza.css", "./gry.html", "./plansza-formularze.css?v=1", "./naglowek.js?v=3", "./codzienne.html", "./konto.js", "./pojedynek.html", "./kluby.html", "./encyklopedia.html", "./powiaty.html", "./rzeki.html", "./statystyki.html", "./slepa.html", "./miasto.html", "./turniej.html", "./tablice.html",
  "./tablice-app.js", "./tablice-powiaty.js", "./tablice-poland.js",
  "./wspolne.js?v=24", "./wspolne.css?v=23", "./topojson-client.min.js?v=17", "./powiaty.topojson?v=16", "./woj.geojson?v=16",
  "./manifest.webmanifest", "./icon.svg"
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
  if (!own && !img) return;
  if (own) {
    e.respondWith(
      fetch(e.request, { cache: "no-cache" }).then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
        return res;
      }).catch(() => caches.match(e.request).then(hit => hit || (e.request.mode === "navigate" ? caches.match("./index.html") : Response.error())))
    );
    return;
  }
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
      return res;
    }))
  );
});
