# Karty: edycja rekordzistek

## Ocena i dane

OVR i punkty statystyk są liczone oddzielnie dla wsi oraz miast/MNP/gmin miejsko-wiejskich. Równe wartości dostają średni percentyl. Krzywa percentyli: 0→40, 5%→50, 20%→58, 50%→65, 80%→75, 95%→85, 98%→90, 100%→94. Średnia ważona statystyk ustala pozycję karty we własnej grupie; tę pozycję przeliczamy tą samą krzywą na OVR. Dzięki drugiemu etapowi obie grupy mają zakres 40–94 mimo uśredniania wielu cech.

Miasta: PIT/os. 2, bezrobocie 2, migracje 1,5, przyrost 1, kanalizacja 1. Wsie: lesistość 2, przyrost 1,5, migracje 1,5, kanalizacja 1, wodociągi 1, bezrobocie 1, szkoły publiczne 1. Niższe bezrobocie daje wyższe punkty; niższa gęstość też, choć nie wpływa na OVR. Pozostałe wskaźniki: więcej daje więcej punktów.

**Decyzja użytkownika:** szkoły mają obejmować dokładnie szkoły publiczne. BDL według gestora nie daje pełnego rozróżnienia publiczne/niepubliczne. Nie podstawiamy szkół ogółem ani samego sektora samorządowego. Pole pozostaje bez wartości, a waga jest jawnie wstrzymana. Przy braku innej wymaganej cechy karta nie ma OVR i nie bierze udziału w nowej grze.

PIT to kwota udziału gminy w podatku PIT / ludność z tego samego roku, nie pensja ani wszystkie dochody budżetu. `karty-dane.json` zawiera źródła, identyfikatory cech, rok obserwacji, datę pobrania i listę braków. Import: `python narzedzia/uzupelnij_karty.py --year 2025`. Cache w katalogu obok repo pozwala wznowić import. TERYT pozostaje tekstem; nie zmieniamy geometrii ani CRS.

Przyrost i PIT oraz powierzchnia zostały pobrane dla 2025. Ludność bazowa ma znany rok 2025. Inne stare wskaźniki z `baza.json` nie miały zapisanych lat obserwacji. Z tego powodu tytuł rekordu oznacza **edycję zestawu 2026**, a nie „rekord w 2025”. Strzałki formy pozostają niedostępne do pozyskania porównywalnego szeregu lat. Braki nigdy nie są traktowane jako zero.

## Rzadkość i postęp

Minima i maksima każdego dostępnego wskaźnika liczymy dla Polski i województwa, bez podziału miasto/wieś. Współrekordzistki dostają te same tytuły; stała cecha nie tworzy rekordu. Hierarchia: 2 krajowe → legenda, 1 krajowy → diament, 2 wojewódzkie → złoto, 1 wojewódzki → srebro, brak → zwykła. Liczby wynikają z danych, nie z wymuszonych kwot kart. Bez szkół dostępnych jest 10 z 11 cech.

Aktualny wynik: 2069 zwykłych, 151 srebrnych, 26 złotych, 219 diamentowych i 14 legendarnych. Duża liczba diamentowych wynika ze współrekordów. Pełne OVR: 2473/2479. Miasta: 1020, w tym 24 z OVR 90+; wsie: 1453, w tym 34 z OVR 90+.

Migracja v3→v4 zachowuje także nieogłoszone karty zdobyte według poprzedniego progu. Progi nowych fragmentów: 3/4/5/6/7 (zwykła/srebrna/złota/diamentowa/legendarna). Kontur wciąż daje pełną kartę. Właściciel kompletu powiatu dostaje +1, każde 10 trafień konturu +1 do maks. +4. Premia zwiększa wskaźniki i OVR, limit 99. Łączne +5 daje holografię, obsługę palca i opcjonalny czujnik przechylenia. Respektujemy ograniczenie ruchu.

Odznaczenia zdobytych rekordzistek zachowujemy w `karty-rekordy-v1`. Komplet rekordzistek województwa daje raz na edycję odznakę i 25 żetonów (paczkę); `karty-zestawy-v1` jest trwałym rejestrem tych nagród. Zmiana rzadkości nie usuwa posiadania karty.

## Karta w ciemno

5 różnych wskaźników; w każdej rundzie najwyżej 12 najlepszych niewykorzystanych kart, losowa kolejność. Zagrana karta odpada. Punkt za rundę i za optymalny wybór. Porównanie: ocena cechy, potem OVR. Pełny remis daje po 0 punktów za zwycięstwo; bonus za najlepszy wybór nadal się liczy.

AI: łatwy losuje z górnej połowy, średni wybiera najlepszą z prawdopodobieństwem 75%, trudny 95%; poza tym losuje z pierwszych czterech. Tryb lokalny ma zasłonę przy przekazywaniu telefonu. Tryb PeerJS używa zatwierdzenia SHA-256 przed odkryciem wyborów; sprawdza talię, rundę, dostępność karty i sumę zatwierdzenia. Kolekcja i bonusy klienta nie są weryfikowane serwerowo — to tryb rekreacyjny. Odłączenie przerywa mecz bez przyznania zwycięstwa.

Równa talia: obie strony dostają te same 12 losowych gmin z województwa, bez premii. Własna talia: kolekcja, a poniżej 12 uzupełnienie szarymi pożyczonymi kartami z regionu. Pożyczone karty nie zapisują się do albumu. 50/50 zużywa jedną istniejącą podpowiedź i odsłania jedną kartę. Opcjonalny pojedynek rekordzistek dodaje +5 w rekordowej cesze (z limitem 99).

## Konto i ranking

Oba widoki używają `konto-ui.css`, wspólnej nawigacji przyciskowej, czytelnych kolorów, dużych pól i jawnych stanów. Podłączony projekt Supabase: `dhzjqxhoiaroauimoepq`. W publicznym kodzie jest wyłącznie klucz publishable.

Wdrożono `player_scores`, polityki odczytu widocznych/własnych wyników, zapis wyłącznie własnego wyniku i funkcje SECURITY INVOKER. `leaderboard` został sprawdzony jako anon. Konto nie synchronizuje jeszcze kolekcji między urządzeniami. Ranking jest rekreacyjny i przyjmuje wyniki klienta; nie należy go używać do nagród o wartości pieniężnej.

**Pozostała konfiguracja w panelu:** aktywacja Google/Facebook z danymi aplikacji dostawców, poprawne Site URL i Redirect URL `https://xoogklastry.github.io/Miasta-pl/logowanie.html`, szablony logowania/rejestracji z `{{ .Token }}` i produkcyjny SMTP. Dopiero po testowym dostarczeniu kodu i zalogowaniu należy ustawić `emailReady:true`. Nie publikujemy sekretów OAuth. Aktualnie przyciski nie udają działających metod.

## Weryfikacja i cofnięcie

`node --test tests/*.test.cjs` — reguły, migracja, nagrody i regresje. `node tests/ui-review.cjs` — rzeczywisty Chromium, 360/390/430 px, oba widoki konta, album, karta +5, pełne mecze AI i lokalne. `node tests/peer-review.cjs` — dwa konteksty Chromium i pokój PeerJS (wymaga sygnalizacji i WebRTC).

Cofnięcie zmian: revert commitu aplikacji. Nie usuwać lokalnych kluczy kolekcji ani tabeli wyników przy cofnięciu interfejsu. Migracja zachowuje poprzednie karty; nie nadpisujemy `nauka-v1`.

Gry gminne: wspólna pula granic obejmuje także wszystkie 66 miast na prawach powiatu, dokładnie raz na TERYT. Test korzysta z rzeczywistych granic PRG.
