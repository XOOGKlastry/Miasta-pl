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
- `wyzwanie.html`: silnik pytań (wyzwanie dnia, plansza, Własna gra, walka na żywo `?tryb=walka`). Pokoje PeerJS („Kto pierwszy, ten lepszy”, „Pokój ze znajomym”) usunięte 10.10.2026: zastąpiły je walki na żywo z rankingu; dolna nawigacja „Znajomi” prowadzi do rankingu.
- `karty.js`: karty gmin (model OVR, rzadkość z rekordów, ulepszenia, paczki, prezentacja nowej karty, wygląd karty). `karty.html`: album (karta dwustronna).
- `karta-w-ciemno*.{html,js,css}`: pojedynek kartami (12 kart na stole; wyzwanie dla znajomego na 24 h, gra sam, dwie osoby na jednym telefonie).
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
- Paczki z nagród trafiają do albumu, otwiera je gracz. 25 monet = paczka. Sześć rodzajów paczek: zwykła 2 karty, brązowa 3, srebrna 4, złota 5, diamentowa 6, legendarna 7 (`PACZKI`, `KART_W_PACZCE`, `DROP` w `karty.js`). Od srebrnej wzwyż gwarancja jednej karty tej rzadkości. Duplikat = 2 monety. Po kilku kartach prezentacja kończy się podsumowaniem całej paczki.

## Supabase
- Projekt `dhzjqxhoiaroauimoepq` (w panelu nazywa się „vesna_legal”; do ustalenia, czy to osobna aplikacja).
- Tabele: `player_scores` (konta), `guest_scores` (ranking bez logowania: identyfikator urządzenia + skrót sekretu). Funkcje: `publish_score`, `publish_guest_score`, `leaderboard(p_mode)` z trybami `points`, `cards`, `duels`. Migracje opisane w `supabase/migrations/`.
- Społeczność (migracja `supabase/migrations/20261008_profile_wiadomosci.sql`): `public_id` gracza (jedyny identyfikator widoczny publicznie), `stats` (jsonb z profilu: rzadkości, 3 najlepsze karty, ulubione województwo, plansza, łańcuch, seria), `dm_open`; tabele `player_messages` (msg/challenge/result, znikają po 60 dniach, bez linków), `player_blocks`, `player_reports`; nowe wersje `publish_score2`, `publish_guest_score2`, `leaderboard2` (stare zostają jako zapas); funkcje `player_profile`, `send_message`, `inbox`, `unread_count`, `mark_read`, `block_player`. Gracz rozpoznawany po koncie albo sekrecie urządzenia (`_ja`). UI: `ranking-spolecznosc.{js,css}`; wyzwanie z rankingu: `karta-w-ciemno.html?rywal=<public_id>&rn=<nick>`, odpowiedź `?w=...&od=<public_id>` odsyła wynik wiadomością.
- Walki na żywo (migracja `supabase/migrations/20261008_walki_na_zywo.sql`): `live_players` (ELO od 1000, bilans, `last_seen` = obecność), `live_matches`, `live_answers`. Serwer jest sędzią: `_live_tick` rozlicza rundę, gdy obaj odpowiedzieli albo minął czas (quiz 15 s × 12 rund, mapa 20 s × 10 rund, przerwa 4 s, ostatnie 3 rundy ×1,5), `_live_koniec` liczy ELO (K=32). Funkcje dla gry: `live_ping` (co 20 s z `naglowek.js`, zwraca zaproszenia), `live_online`, `live_profile`, `live_invite`, `live_respond`, `live_state`, `live_answer`, `live_leave`. Ranking „Pojedynki” (`leaderboard2('duels')`) to tylko walki na żywo. UI: `walka.js` w silniku `wyzwanie.html?tryb=walka&mecz=<id>`, zaproszenie z profilu w rankingu, okienko przyjęcia na każdym ekranie. Nagroda: punkty za dobre odpowiedzi (jak w innych grach) + 5/2/1 monet.
- Karta w ciemno „Sam”: bez wirtualnego rywala, tylko ocena wyboru (10/6/4/2 pkt, 10 pkt = moneta), bez rankingu.
- Logowanie Google włączone (aplikacja OAuth w Google jest w trybie testowym: przed udostępnieniem trzeba ją opublikować). E-mail czeka na SMTP (`emailReady:false`).

## Otwarte sprawy
- Dawid przygotuje w QGIS/OSM dane do nowych wskaźników (Żabki, Biedronki, Lidle, paczkomaty, apteki, stacje PKP, ścieżki rowerowe) jako CSV `teryt;...` (wartości bezwzględne, przeliczenie robimy w grze).
- Pomysły do zrobienia: Odkrywca (mapa Polski we mgle, kroki dziennie, znaleziska, paszport z pieczątkami), gra „zaznacz drogę” (potrzebne numery dróg `ref` z OSM), wyzwania w Karcie w ciemno przez bazę są (z rankingu), link zostaje jako zapas.
- Lepsze tła planszy: wersje ilustracji bez narysowanych pól (wtedy wystarczy podmienić pliki w `narzedzia/plansza-zrodla/` i uruchomić `narzedzia/plansza_tla.py`).
