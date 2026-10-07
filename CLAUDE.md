# PolskoZnawca: kontekst dla Claude Code

Gra edukacyjna o geografii Polski (PWA). Działa na GitHub Pages: https://xoogklastry.github.io/Miasta-pl/
Właściciel: Dawid (specjalista GIS). Rozmawiamy po polsku. W odpowiedziach nie używaj długiej pauzy („—”).

## Zasady pracy
- Statyczne HTML/JS/CSS bez kroku budowania. Gałąź `main` publikuje się sama na GitHub Pages.
- Gra jest robiona pod telefon: nic nie może przewijać się w bok (sprawdzaj szerokości 360, 390 i 430 px).
- Styl „planszy”: zielone sukno, kremowe pola, brązowe obrysy, żółte przyciski, nagłówki Bungee, tekst Rubik (`plansza.css`, `plansza-formularze.css`).
- Po zmianie pliku JS/CSS podbij jego wersję w adresach (`?v=`) i stałą `CACHE` w `sw.js`, inaczej telefony trzymają starą wersję.
- Testy: `node --test tests/*.test.cjs` (muszą przechodzić przed wypchnięciem).
- Kod i komentarze po polsku, nazwy zmiennych też.

## Najważniejsze pliki
- `index.html`: plansza przygód (16 krain × 6 poziomów). Tła z `grafiki/plansza/` (malowane ilustracje, przygotowane skryptem `narzedzia/plansza_tla.py` z oryginałów w `narzedzia/plansza-zrodla/`), pola z prawdziwym postępem nakładane na narysowane.
- `saga.js`: poziomy planszy i przepisy gier w poziomach.
- `wspolne.js` (obiekt `ZP`): wspólne narzędzia, zapis nauki (`ZP.zapisz`), monety, podpowiedzi 50/50, przycisk kolekcji, mapa wektorowa `podkladWektorowy` (powiaty, województwa, drogi z `drogi.json`).
- `wyzwanie.html`: silnik pytań (wyzwanie dnia, plansza, Własna gra, pojedynki).
- `karty.js`: karty gmin (model OVR, rzadkość z rekordów, ulepszenia, paczki, prezentacja nowej karty, wygląd karty). `karty.html`: album (karta dwustronna).
- `karta-w-ciemno*.{html,js,css}`: pojedynek kartami (12 kart na stole, trening/ranking, wyzwanie dla znajomego linkiem z 24 h).
- `lancuch.html`: Łańcuch dnia (gmina na ostatnią literę, mikrofon, luźne dopasowanie).
- `polandball.js`: maskotka. `krainy.js`: stary rysowany krajobraz (zapas, gdy brak malowanych teł).
- `admin.html`: panel admina (zdjęcia, rzeki, herby, kluby, ciekawostki); zapis przez GitHub API tokenem wpisanym w panelu.
- `online.js`, `online-config.js`, `ranking.html`, `logowanie.html`: konta i ranking w Supabase.

## Dane
- `baza.json` (encyklopedia: województwa, powiaty, gminy z GUS), `karty-dane.json` (wskaźniki kart z GUS BDL), `karty-geo.json` (odległość do najbliższej stolicy województwa), `centra.json` (urzędy miast), `drogi.json` (OSM), `ciekawostki.json` (easter eggi na kartach, klucz TERYT).
- Automaty GitHub Actions w `.github/workflows/` odświeżają dane (np. `karty-dane.yml` uruchamia `narzedzia/uzupelnij_karty.py`). Limit anonimowy GUS BDL: 100 zapytań na 15 minut.
- Zadłużenia gmin nie ma w GUS (to sprawozdania Rb-Z Ministerstwa Finansów), wskaźnik jest wstrzymany.

## Karty: ustalone zasady
- OVR osobno dla miast i M-W (zarobki PIT ×2, bezrobocie ×2 mniej=lepiej, firmy ×1,5, migracja ×1,5, mieszkanie na osobę ×1, obciążenie demograficzne ×1 mniej=lepiej) i dla wsi (lesistość ×2, przyrost ×1,5, migracja ×1,5, bezrobocie ×1, obciążenie ×1, drogi ×1, szkoły ×1, odległość od stolicy ×1 mniej=lepiej). Wodociągi i kanalizacja tylko informacyjnie.
- Rzadkość z podium: legendarna = 1. miejsce w Polsce, diamentowa = 2.–3. w Polsce, złota = 1. w województwie, srebrna = 2.–3. w województwie, reszta zwykła. Rekordy w obie strony, zielone dobre, czerwone złe, złote neutralne.
- Stolice województw nie mają wskaźnika „Do stolicy woj.”. Miasta na prawach powiatu nie dostają premii za komplet powiatu i nie pokazują powiatu.
- Paczki z nagród trafiają do albumu, otwiera je gracz. 25 monet = paczka.

## Supabase
- Projekt `dhzjqxhoiaroauimoepq` (w panelu nazywa się „vesna_legal”; do ustalenia, czy to osobna aplikacja).
- Tabele: `player_scores` (konta), `guest_scores` (ranking bez logowania: identyfikator urządzenia + skrót sekretu). Funkcje: `publish_score`, `publish_guest_score`, `leaderboard(p_mode)` z trybami `points`, `cards`, `duels`. Migracje opisane w `supabase/migrations/`.
- Logowanie Google włączone (aplikacja OAuth w Google jest w trybie testowym: przed udostępnieniem trzeba ją opublikować). E-mail czeka na SMTP (`emailReady:false`).

## Otwarte sprawy
- Dawid przygotuje w QGIS/OSM dane do nowych wskaźników (Żabki, Biedronki, Lidle, paczkomaty, apteki, stacje PKP, ścieżki rowerowe) jako CSV `teryt;...` (wartości bezwzględne, przeliczenie robimy w grze).
- Pomysły do zrobienia: Odkrywca (mapa Polski we mgle, kroki dziennie, znaleziska, paszport z pieczątkami), gra „zaznacz drogę” (potrzebne numery dróg `ref` z OSM), wyzwania w Karcie w ciemno przez bazę zamiast linków.
- Lepsze tła planszy: wersje ilustracji bez narysowanych pól (wtedy wystarczy podmienić pliki w `narzedzia/plansza-zrodla/` i uruchomić `narzedzia/plansza_tla.py`).
