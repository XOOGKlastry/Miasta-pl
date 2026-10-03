# Malowana plansza i nagrody

Plansza używa 64 ilustracji rastrowych wygenerowanych z AI: cztery przezroczyste atlasy WebP i tekstury łąki oraz morza. Prostokąty kadrowania są w `krainy-grafiki.json`; `krainy.js` zachowuje wektorowy fallback. Dekoracje mają osobne animacje CSS, a tryb ograniczenia ruchu je wyłącza. Polandball ma kołowy obrys i maskę.

## Zasady

- Jedna gra z herbami gmin wszystkich trzech typów. Identyfikator TERYT rozróżnia gminy o tej samej nazwie. Powiaty nie są dodawane drugi raz. Do pytań trafiają rekordy mające dostępny herb i współrzędne (2039 w obecnej bazie).
- Każde 10 różnych poprawnie wymienionych miast w rundzie daje natychmiast 1 żeton.
- Każde z trzech zadań dnia daje jedną losową kartę gminy w paczce, bez pobrania żetonów. Wyzwanie wymaga ukończenia zestawu; miasto zakończenia próby (trafienie lub wykorzystanie sześciu prób); gmina odgadnięcia celu. Trening i poddanie nie dają dziennej paczki.
- `karty-dzienne-v1` zapisuje nagrodę raz na typ zadania i dzień. Ponowne otwarcie wyniku nie nalicza jej ponownie. Zapis poddania Gminy dnia uniemożliwia wpisanie ujawnionego rozwiązania po odświeżeniu.

## Weryfikacja

`node --test tests/*.test.cjs`

Dodatkowo sprawdzono w Chromium: 16 krain przy szerokościach 360, 390 i 430 px, otwieranie poziomu, kołowy kształt pionka, zasłonięcie zablokowanej krainy, brak błędów JavaScript oraz nagrodę za Gminę dnia, brak nagrody za poddanie/trening i brak duplikatu po odświeżeniu.
