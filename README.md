# PolskoZnawca — Cudze chwalicie, a Polskę znacie?

Trzynaście gier, wyzwanie dnia i ekran statystyk w jednej aplikacji (PWA), same statyczne pliki, bez backendu i bez build stepu.

| plik | gra |
| --- | --- |
| `index.html` | menu z kafelkami gier i rekordami |
| `miasta.html` | **Miasta na czas**: wpisujesz lub mówisz nazwy miast, każde zapala się na mapie |
| `zdjecie.html` | **Skąd to zdjęcie?**: kadr Esri World Imagery, zgadujesz miasto |
| `tablice.html` (+ `tablice-*.js`) | **Tablice rejestracyjne**: quiz wyróżników powiatów |
| `herb.html` | **Jaki to herb?**: herb miasta i cztery odpowiedzi |
| `gdzie.html` | **Gdzie to jest?**: wskazujesz miasto na pustej mapie |
| `ksztalt.html` | **Kształt powiatu**: sam kontur powiatu |
| `dzis.html` | **Wyzwanie dnia**: 5 pytań, ten sam zestaw dla wszystkich |
| `sasiedzi.html` | **Graniczą czy nie?** |
| `zoom.html` | **Zoom out** |
| `powiaty.html` | **Wymień powiaty** |
| `rzeki.html` | **Nad jaką rzeką?** |
| `slepa.html` | **Ślepa mapa** |
| `turniej.html` | **Turniej** |
| `statystyki.html` | **Statystyki** |
| `wiecej.html` | **Więcej czy mniej?** |

W **Miastach na czas** nie ma wyboru małe/średnie/duże — gra idzie przez wszystkie miasta. Zdjęcia lotnicze startują od Esri.


## Zmiany: tryby odpowiadania, gminy, PolandBall

- Gry, w których czeka się na odpowiedź, mają wybór „cztery do wyboru” albo „wpisywanie nazwy (ekspert)”: herby, rzeki, zdjęcia, Zoom out, kształty, turniej. Wspólne pole wpisywania: `ZP.poleWpisu`, porównanie nazw: `ZP.pasuje`.
- Kształt: zawsze zdjęcie satelitarne przycięte do granic; do wyboru powiaty albo gminy (`gminy.topojson` z PRG, budowany przez `narzedzia/gminy.sh` w GitHub Actions).
- Miasta na czas: ekran startowy tylko z czasem i województwem, potem „Mówię” albo „Piszę”; w trakcie gry sam pasek czasu i mapa, która dopasowuje się do klawiatury.
- Ikona aplikacji: PolandBall (`icon.svg`, `icon-192.png`, `icon-512.png`).


## Zmiany: Z lotu ptaka, Co to za miasto?, gminy na mapie

- „Skąd to zdjęcie?” nazywa się teraz **Z lotu ptaka** i ma tryb zoom out (dawna osobna gra; `zoom.html` przekierowuje).
- Wpisywanie jest domyślne; przycisk „Pokaż” odsłania cztery odpowiedzi kosztem punktów. Domyślnie 5 rund.
- **Gdzie to jest?** ma mapę Leaflet z podkładem CARTO bez podpisów i przybliżanie.
- **Gdzie ten powiat?** i **Gdzie ta gmina?** (`slepa.html`, `slepa.html?tryb=g`).
- **Nad jaką rzeką?** rysuje przebieg rzeki po odpowiedzi (`rzeki-geo.json`, budowany razem z `rzeki.json`).
- **Co to za miasto?** (`miasto.html`): zdjęcia z Wikidata (P18, P948) i Wikimedia Commons, z autorem i licencją; dane budowane przez `narzedzia/pobierz_miejsca.py`.
- Wpisywanie nazw w „Miastach na czas” i „Wymień powiaty” nie przechwytuje krótszej nazwy, gdy dłuższa zaczyna się tak samo (Opole i Opole Lubelskie).
