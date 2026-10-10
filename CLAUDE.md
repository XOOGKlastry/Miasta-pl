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
- `saga.js`: poziomy planszy i przepisy gier w poziomach. Dwie plansze (sezony): 1 „Odkrywca” (`saga-v1`) i 2 „Szlak Mistrzów” (`saga-s2`, bez podpowiedzi, 15 s, także małe miejscowości), druga po ukończeniu pierwszej; wybór w pasku nad planszą (`saga-sezon`). Czwarty poziom każdej krainy to osobna gra, rotująca: Łańcuch krainy (`lancuch.html?poziom=N`), Kształty gmin (`ksztalt.html?rodzaj=g&poziom=N`), Karta w ciemno sam z kartami krainy (`karta-w-ciemno.html?poziom=N`), Wyścig po mapie (silnik, „Gdzie to jest?” na czas). `Saga.adres(n,sezon)` daje adres poziomu, `Saga.zakoncz()` zapisuje wynik i nagrody, `poziom.js` (PoziomGra) to pasek celu i ekran gwiazdek w osobnych grach.
- Wydarzenie tygodnia: kraina z tygodnia ISO (`Saga.tydzien()`), 5 monet za pierwsze zaliczenie poziomu w tygodniu i dodatkowa paczka za 3 gwiazdki; punkty tygodnia = 100 za gwiazdkę + do 100 za wynik na poziom. Tabela w Supabase (`event_scores`, `event_publish`, `event_leaderboard`, migracja `20261010_wydarzenie_tygodnia.sql`), zakładka „Tydzień” w rankingu.
- `wspolne.js` (obiekt `ZP`): wspólne narzędzia, zapis nauki (`ZP.zapisz`), monety, podpowiedzi 50/50, przycisk kolekcji, mapa wektorowa `podkladWektorowy` (powiaty, województwa, drogi z `drogi.json`).
- `wyzwanie.html`: silnik pytań (wyzwanie dnia, plansza, Własna gra, walka na żywo `?tryb=walka`). Pokoje PeerJS („Kto pierwszy, ten lepszy”, „Pokój ze znajomym”) usunięte 10.10.2026: zastąpiły je walki na żywo z rankingu; dolna nawigacja „Znajomi” prowadzi do rankingu.
- `podboj.html`/`podboj.js`/`podboj.css`: Podbój Polski (mapa 380 powiatów z właścicielami, arkusz powiatu z akcjami, obrony, portfel, ranking zdobywców). Gra toczy się w silniku: `wyzwanie.html?tryb=podboj&proba=…&k=…&seed=…&rodzaj=atak|pojedynek|obrona` (`podboj-gra.js`), 8 pytań z `podboj-pytania.js` (`PodbojPytania.zestaw(D,k,rnd)`: kształt, granice, tablice, herb, z lotu ptaka, gdzie to jest, w którym powiecie, zdjęcie, rzeka; w pytaniach o powiat celem bywa też sąsiad, a atakowany powiat jest zawsze wśród opcji), 20 s na pytanie, dobra odpowiedź = pełne punkty (mapa od 700). Przeładowanie w trakcie wysyła dotychczasowy wynik.
- `karty.js`: karty gmin (model OVR, rzadkość z rekordów, ulepszenia, paczki, prezentacja nowej karty, wygląd karty). `karty.html`: album (karta dwustronna).
- `karta-w-ciemno*.{html,js,css}`: pojedynek kartami (12 kart na stole; wyzwanie dla znajomego na 24 h, gra sam, dwie osoby na jednym telefonie).
- `lancuch.html`: Łańcuch gmin (gmina na ostatnią literę, mikrofon, luźne dopasowanie). Od 10.10.2026 to minigra bez limitu dnia (moneta co 2 ogniwa, rekord `lancuch-rekord`), już nie zagadka codzienna.
- Codzienne (`codzienne.html`): Wyzwanie dnia, Miasto dnia (`szostka.html`), Gmina dnia (`cieplo.html`), Trasa dnia (`trasa.html`, logika `trasa-logika.js`: z powiatu A do B przez sąsiednie powiaty, 4–6 kroków, zielony = na najkrótszej trasie, żółty = obok, limit prób = pomiędzy + 4, paczka za wygraną przez `nagrodaDnia('trasa')`; `trasa.html?trening=…` to losowa trasa bez nagrody, w Gry → Minigry).
- „Gdzie to jest?” (`gdzie.html` i silnik): `ZP.ocenaGdzie(km)`: do 5 km „Trafione!” i pełne 1000 pkt, do 1 km „W dziesiątkę!” +200 pkt (walka na żywo bez premii, max 1000). Po odpowiedzi `ZP.etykietyMiast(map)` podpisuje stolice województw, siedziby powiatów i większe miasta z `miasta-etykiety.json` (skrypt `narzedzia/miasta_etykiety.py`), bez nachodzenia podpisów.
- Album (`karty.html`): wyszukiwarka, układ (województwa / rzadkość / wszystkie) i sortowanie (OVR, rzadkość, A–Ż, ludność, najnowsze), zapamiętane w `album-porzadek`.
- Encyklopedia: każda gmina pokazuje swoją kartę (przód i tył, także niezdobytą) i wskaźniki z danych kart; powiat pokazuje karty wszystkich swoich gmin.
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
- Wskaźniki „mniej = lepiej” mają w grach nazwę z kierunkiem (`gra` w `STATY`, `Karty.nazwaGry(k)`, `Karty.kierunek(k)`): gęstość to na karcie „Niska gęstość”, w Karcie w ciemno pod wskaźnikiem jest podpowiedź, co wygrywa.
- Stolice województw nie mają wskaźnika „Do stolicy woj.”. Miasta na prawach powiatu nie dostają premii za komplet powiatu i nie pokazują powiatu.
- Paczki z nagród trafiają do albumu, otwiera je gracz. 25 monet = paczka. Sześć rodzajów paczek: zwykła 2 karty, brązowa 3, srebrna 4, złota 5, diamentowa 6, legendarna 7 (`PACZKI`, `KART_W_PACZCE`, `DROP` w `karty.js`). Od srebrnej wzwyż gwarancja jednej karty tej rzadkości. Duplikat = 2 monety. Po kilku kartach prezentacja kończy się podsumowaniem całej paczki.

## Supabase
- Projekt `dhzjqxhoiaroauimoepq` (w panelu nazywa się „vesna_legal”; do ustalenia, czy to osobna aplikacja).
- Tabele: `player_scores` (konta), `guest_scores` (ranking bez logowania: identyfikator urządzenia + skrót sekretu). Funkcje: `publish_score`, `publish_guest_score`, `leaderboard(p_mode)` z trybami `points`, `cards`, `duels`. Migracje opisane w `supabase/migrations/`.
- Społeczność (migracja `supabase/migrations/20261008_profile_wiadomosci.sql`): `public_id` gracza (jedyny identyfikator widoczny publicznie), `stats` (jsonb z profilu: rzadkości, 3 najlepsze karty, ulubione województwo, plansza, łańcuch, seria), `dm_open`; tabele `player_messages` (msg/challenge/result, znikają po 60 dniach, bez linków), `player_blocks`, `player_reports`; nowe wersje `publish_score2`, `publish_guest_score2`, `leaderboard2` (stare zostają jako zapas); funkcje `player_profile`, `send_message`, `inbox`, `unread_count`, `mark_read`, `block_player`. Gracz rozpoznawany po koncie albo sekrecie urządzenia (`_ja`). UI: `ranking-spolecznosc.{js,css}`; wyzwanie z rankingu: `karta-w-ciemno.html?rywal=<public_id>&rn=<nick>`, odpowiedź `?w=...&od=<public_id>` odsyła wynik wiadomością.
- Walki na żywo (migracja `supabase/migrations/20261008_walki_na_zywo.sql`): `live_players` (ELO od 1000, bilans, `last_seen` = obecność), `live_matches`, `live_answers`. Serwer jest sędzią: `_live_tick` rozlicza rundę, gdy obaj odpowiedzieli albo minął czas (quiz 15 s × 12 rund, mapa 20 s × 10 rund, przerwa 4 s, ostatnie 3 rundy ×1,5), `_live_koniec` liczy ELO (K=32). Funkcje dla gry: `live_ping` (co 20 s z `naglowek.js`, zwraca zaproszenia), `live_online`, `live_profile`, `live_invite`, `live_respond`, `live_state`, `live_answer`, `live_leave`. Ranking „Pojedynki” (`leaderboard2('duels')`) to tylko walki na żywo. UI: `walka.js` w silniku `wyzwanie.html?tryb=walka&mecz=<id>`, zaproszenie z profilu w rankingu, okienko przyjęcia na każdym ekranie. Nagroda: punkty za dobre odpowiedzi (jak w innych grach) + 5/2/1 monet.
- Podbój Polski (migracja `supabase/migrations/20261010_podboj_polski.sql`): `conq_sasiedzi` (sąsiedztwo powiatów), `conq_powiaty` (owner, score 0–8, price), `conq_proby` (ziarno pytań wydaje serwer, wynik do 20 min), `conq_pojedynki` (start → czeka 24 h → obronione/zdobyte; brak obrony = walkower), `conq_portfel` (monety ze sprzedaży). Zasady: pierwszy powiat dowolny wolny, kolejne tylko graniczące; wolny od 5/8, cudzy przy wyniku wyższym od obrony, 8/8 = twierdza (tylko pojedynek 24 h albo zakup); 10 ataków dziennie (umacnianie i pojedynki też). Funkcje: `conq_mapa`, `conq_ja`, `conq_start`, `conq_wynik`, `conq_sprzedaz`, `conq_kup`, `conq_odbierz`, `conq_ranking`; powiadomienia idą do `player_messages` z `payload.podboj` (skrzynka pokazuje przycisk „Broń twierdzy”). Monety kupującego zdejmuje telefon (`karty-zetony`), sprzedający odbiera je z portfela. `Online.podboj` w `online.js`.
- Karta w ciemno „Sam”: bez wirtualnego rywala, tylko ocena wyboru (10/6/4/2 pkt, 10 pkt = moneta), bez rankingu.
- Logowanie Google włączone (aplikacja OAuth w Google jest w trybie testowym: przed udostępnieniem trzeba ją opublikować). E-mail czeka na SMTP (`emailReady:false`).

## Otwarte sprawy
- Dawid przygotuje w QGIS/OSM dane do nowych wskaźników (Żabki, Biedronki, Lidle, paczkomaty, apteki, stacje PKP, ścieżki rowerowe) jako CSV `teryt;...` (wartości bezwzględne, przeliczenie robimy w grze).
- Pomysły do zrobienia: Odkrywca (mapa Polski we mgle, kroki dziennie, znaleziska, paszport z pieczątkami), gra „zaznacz drogę” (potrzebne numery dróg `ref` z OSM), wyzwania w Karcie w ciemno przez bazę są (z rankingu), link zostaje jako zapas.
- Tła planszy: `narzedzia/plansza_tla.py` zamalowuje narysowane pola łatami ze ścieżki (10.10.2026), a `index.html` rozsuwa pola gry, żeby nie nachodziły na siebie przy 360 px. Gdyby przyszły ilustracje bez narysowanych pól, wystarczy podmienić pliki w `narzedzia/plansza-zrodla/` i uruchomić skrypt.
