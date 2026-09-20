# Znasz Polskę? Gry geograficzne

Jedenaście gier, wyzwanie dnia i ekran statystyk w jednej aplikacji (PWA), same statyczne pliki, bez backendu i bez build stepu.

| plik | gra |
| --- | --- |
| `index.html` | menu z listą gier i rekordami |
| `miasta.html` | **Miasta na czas**: wpisujesz lub mówisz nazwy miast, każde zapala się na ortofoto |
| `zdjecie.html` | **Skąd to zdjęcie?**: kadr ortofotomapy, zgadujesz miasto |
| `tablice.html` (+ `tablice-*.js`) | **Tablice rejestracyjne**: quiz wyróżników powiatów (przeniesiony z repo `tablicerejestracyjne`) |
| `herb.html` | **Jaki to herb?**: herb miasta i cztery odpowiedzi, błędne to miasta z okolicy |
| `gdzie.html` | **Gdzie to jest?**: wskazujesz miasto na pustej mapie, punkty za odległość |
| `ksztalt.html` | **Kształt powiatu**: sam kontur powiatu, cztery odpowiedzi |
| `dzis.html` | **Wyzwanie dnia**: 5 pytań (mapa i kształty), ten sam zestaw dla wszystkich, wynik do udostępnienia |
| `sasiedzi.html` | **Graniczą czy nie?**: dwie nazwy powiatów, odpowiedź tak/nie, mapa po odpowiedzi |
| `zoom.html` | **Zoom out**: kadr ortofotomapy oddala się co 4 s, punkty maleją |
| `powiaty.html` | **Wymień powiaty**: wpisujesz powiaty województwa, zapalają się na mapie |
| `rzeki.html` | **Nad jaką rzeką?**: miasto i cztery rzeki do wyboru (dane z `rzeki.json`) |
| `statystyki.html` | **Statystyki**: rekordy, mapa opanowanych powiatów, najczęstsze pomyłki |
| `wiecej.html` | **Więcej czy mniej?**: które miasto ma więcej mieszkańców, do pierwszej pomyłki |

Pozostałe pliki: `wspolne.js` i `wspolne.css` (wspólny kod nowych gier), `powiaty.topojson` (granice powiatów z PRG, uproszczenie tylko do 30 m, czyli poniżej piksela; źródło: ppatrzyk/polska-geojson), `topojson-client.min.js`, `herby.json` i `herby/` (lista herbów i miniatury budowane przez `narzedzia/pobierz_herby.py` w GitHub Actions), `woj.geojson` (granice województw), `manifest.webmanifest` (jedna instalacja dla wszystkich gier), `sw.js` (praca offline), ikony.

## Tryb nauki

Wyniki pojedynczych pytań zapisują się w `localStorage` pod kluczem `nauka-v1` (`powiat:1407`, `miasto:Zamość`, `herb:…`, `rzeka:…`, `wojewodztwo:…`).
Gry losują pytania z wagą zależną od historii, więc to, co sprawia kłopot, wraca częściej. Podgląd i kasowanie postępu: `statystyki.html`.

## Dane

- Miasta: OpenStreetMap przez Overpass API, zapisywane w `localStorage` po pierwszym pobraniu.
- Herby: plik z właściwości P94 w Wikidata dla miast z tagiem `wikidata` w OSM, obrazki z Wikimedia Commons.
- Ortofotomapa: GUGiK (WMS Geoportal), zapasowo zdjęcia Esri.
- Tablice: `tablice-powiaty.js`.

## Publikacja

GitHub Pages: Settings → Pages → Deploy from a branch → `main` → `/ (root)`.
Instalacja na telefonie: Chrome, menu ⋮ → Zainstaluj aplikację; Safari, Udostępnij → Do ekranu początkowego.
