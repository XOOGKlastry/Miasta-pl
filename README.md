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


## Kreator ustawień, poświata, fanfary

- Każda gra zaczyna się od kreatora (`ZP.kreatorGry` w `wspolne.js`): obszar (cała Polska albo wybrane województwa z obrysami), wielkość miast (makiety małych, średnich i dużych miast), opcje danej gry i liczba rund na suwaku (domyślnie 5). Wybory zapamiętują się osobno dla każdej gry. Stary formularz zostaje ukryty i kreator wypełnia go przed startem.
- Wybrany obszar: `ZP.OBSZAR`, filtr `ZP.wObszarze(obiekt)`.
- Wpisywanie odpowiedzi: po lewej pole, po prawej „Pokaż podpowiedzi”; poprawna nazwa przechodzi sama, bez zatwierdzania.
- Po każdej odpowiedzi zielona albo czerwona poświata (`ZP.zapisz` wywołuje `ZP.poswiata`); po wyniku co najmniej 80% fanfary, wiwaty i konfetti (`ZP.fanfary`, dźwięk syntezowany w przeglądarce).
- Kontury (kształt, turniej): odpowiedzi odblokowują się po wczytaniu zdjęcia Esri, najwyżej po 3 s (`ZP.ksztaltZPodkladem`).


## Zdjęcia do „Co to za miasto?”: wybór przez człowieka

- `narzedzia/zdjecia-wybor.json`: `wybrane` (miasto → pliki z Commons, tylko te trafiają do gry) i `odrzucone` (nigdy).
- `kandydaci.json` (budowany przez automat): do 14 kandydatów na miasto od 5 tys. mieszkańców, z rozdzielczością, autorem, licencją i oznaczeniem zdjęć wyróżnionych w Commons.
- `przeglad.html` (link w Statystykach): przegląd kandydatów, ✓ do gry, ✗ odrzuć, dodawanie własnych plików z Commons, zapis pliku `zdjecia-wybor.json`.
- Po wgraniu nowego `zdjecia-wybor.json` automat sam pobiera zatwierdzone zdjęcia do katalogu `miejsca/`.


## Panel admina, encyklopedia, nowe wyzwanie dnia i turniej

- `admin.html`: zdjęcia do „Co to za miasto?” (kandydaci z `kandydaci.json`), poprawki rzek i herbów. Zapis prosto do repo kluczem GitHub podanym w zakładce „Połączenie” (klucz zostaje tylko w przeglądarce). Pliki: `narzedzia/zdjecia-wybor.json` (uruchamia szybki automat pobierający zdjęcia) i `poprawki.json` (gry czytają go od razu).
- `encyklopedia.html`: 16 województw, 380 powiatów i ~2477 gmin alfabetycznie, z ludnością, powierzchnią, gęstością, herbem, mapką, jednostkami podrzędnymi i odnośnikiem do Wikipedii. Dane: `baza.json` budowany przez `narzedzia/pobierz_baze.py` (Wikidata, kody TERYT z PRG).
- `wyzwanie.html`: wyzwanie dnia (6 pytań, ten sam zestaw dla wszystkich, jedna próba) i `wyzwanie.html?tryb=turniej` (12 pytań, sześć konkurencji, kreator obszaru i wielkości miast). Wynik do udostępnienia jako obrazek 1080×1350 i tekst z kratkami. Stare `dzis.html` i `turniej.html` przekierowują tutaj.


## Poprawki: tablice, encyklopedia, kluby

- `tablice-powiaty.js`: przebudowane ze wzorcowej listy kodów (394 jednostki, jeden wpis na powiat albo miasto, dzielnice Warszawy osobno), nazwy powiatów według PRG, pole `siedziba` (miasto starostwa, też przyjmowane jako odpowiedź) i `alt` (dodatkowe kody, np. KK dla Krakowa).
- `baza.json`: ludność i powierzchnia z GUS (Bank Danych Lokalnych), herby i linki z Wikidata, hasła województw poprawione.
- Po każdej odpowiedzi w grach jest odnośnik do encyklopedii (`ZP.dopiszEncykl`), otwierany w okienku nad grą (`ZP.encyklopedia`).
- `kluby.json` i `kluby.html` („Jaki to klub?”): Ekstraklasa, 1. i 2. liga sezonu 2026/27 oraz znane kluby niższych lig; edycja w panelu admina (zakładka „Kluby”).
