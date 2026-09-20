# Znasz Polskę? Gry geograficzne

Cztery gry w jednej aplikacji (PWA), same statyczne pliki, bez backendu i bez build stepu.

| plik | gra |
| --- | --- |
| `index.html` | menu z listą gier i rekordami |
| `miasta.html` | **Miasta na czas**: wpisujesz lub mówisz nazwy miast, każde zapala się na ortofoto |
| `zdjecie.html` | **Skąd to zdjęcie?**: kadr ortofotomapy, zgadujesz miasto |
| `tablice.html` (+ `tablice-*.js`) | **Tablice rejestracyjne**: quiz wyróżników powiatów (przeniesiony z repo `tablicerejestracyjne`) |
| `herb.html` | **Jaki to herb?**: herb miasta i cztery odpowiedzi, błędne to miasta z okolicy |

Pozostałe pliki: `woj.geojson` (granice województw), `manifest.webmanifest` (jedna instalacja dla wszystkich gier), `sw.js` (praca offline), ikony.

## Dane

- Miasta: OpenStreetMap przez Overpass API, zapisywane w `localStorage` po pierwszym pobraniu.
- Herby: plik z właściwości P94 w Wikidata dla miast z tagiem `wikidata` w OSM, obrazki z Wikimedia Commons.
- Ortofotomapa: GUGiK (WMS Geoportal), zapasowo zdjęcia Esri.
- Tablice: `tablice-powiaty.js`.

## Publikacja

GitHub Pages: Settings → Pages → Deploy from a branch → `main` → `/ (root)`.
Instalacja na telefonie: Chrome, menu ⋮ → Zainstaluj aplikację; Safari, Udostępnij → Do ekranu początkowego.
