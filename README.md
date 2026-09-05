# Gry geograficzne o Polsce

Dwie gry w jednym repozytorium, oba to statyczne pliki bez backendu.

- `index.html` — **Miasta na mapie**: wpisujesz/mówisz nazwy miast na czas, każde zapala się na ortofoto, postęp per województwo.
- `zdjecie.html` — **Skąd to zdjęcie?**: dostajesz kadr ortofotomapy bez podpisów i zgadujesz, które to miasto; punkty za trafienie i szybkość.

---

## Miasta na mapie

Gra na czas: wpisujesz nazwy polskich miast, każde trafione zapala się na mapie.
Jeden statyczny plik HTML plus manifest i service worker, bez backendu i bez build stepu.

Podkład to ortofotomapa GUGiK (WMS Geoportal), z przełącznikiem na zdjęcia Esri i ciemną mapę.
Na granicach województw liczony jest osobny postęp, a nazwy miast można też wypowiadać (Web Speech API, pl-PL).

Lista miast pobierana jest przy pierwszym uruchomieniu z Overpass API (OpenStreetMap),
a potem trzymana w `localStorage`, więc kolejne gry działają offline.
Jeśli Overpass nie odpowie, gra przechodzi na wbudowaną listę ok. 250 miast.

## Pliki

| plik | rola |
| --- | --- |
| `index.html` | gra „Miasta na mapie": logika, mapa Leaflet, dane zapasowe |
| `zdjecie.html` | gra „Skąd to zdjęcie": rundy, punktacja, autouzupełnianie |
| `woj.geojson` | granice 16 województw |
| `manifest.webmanifest`, `manifest-zdjecie.webmanifest` | instalacja obu gier na ekranie głównym |
| `manifest.webmanifest` | instalacja na ekranie głównym telefonu |
| `sw.js` | cache offline (działa tylko po HTTPS) |
| `icon-192.png`, `icon-512.png` | ikony aplikacji |

## Publikacja na GitHub Pages (z komputera)

```bash
gh repo create miasta-pl --public --source=. --push
# albo klasycznie:
git init && git add . && git commit -m "Gra: polskie miasta na czas"
git branch -M main
git remote add origin https://github.com/UZYTKOWNIK/miasta-pl.git
git push -u origin main
```

Potem w repo: **Settings → Pages → Source: Deploy from a branch → main → / (root) → Save**.
Po około minucie adres to `https://UZYTKOWNIK.github.io/miasta-pl/`.

## Publikacja z samego telefonu

1. Wejdź na `github.com` w przeglądarce, zaloguj się, **New repository**, nazwa np. `miasta-pl`, publiczne, **Create**.
2. **Add file → Upload files**, wybierz wszystkie pliki z tego katalogu, **Commit changes**.
3. **Settings → Pages → Deploy from a branch → main → / (root) → Save**.
4. Otwórz `https://UZYTKOWNIK.github.io/miasta-pl/` i dodaj do ekranu głównego.

## Dodanie do ekranu głównego

- Android (Chrome): menu ⋮ → *Zainstaluj aplikację* lub *Dodaj do ekranu głównego*.
- iOS (Safari): przycisk *Udostępnij* → *Do ekranu początkowego*.

Uruchamia się wtedy na pełnym ekranie, bez paska przeglądarki.

## Licencja danych

Nazwy i współrzędne miast: © współtwórcy OpenStreetMap, ODbL.
Ortofotomapa: GUGiK, Geoportal Krajowy. Granice województw: ppatrzyk/polska-geojson na bazie danych GUGiK.
Rozpoznawanie mowy wymaga HTTPS i zgody na mikrofon; w Chrome i Safari dźwięk jest przetwarzany po stronie dostawcy przeglądarki.
