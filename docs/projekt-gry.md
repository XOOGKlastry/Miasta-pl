# PolskoZnawca: projekt pełnej gry

Dokument roboczy. Opisuje docelowy kształt gry (single, multi, konta) i drogę do Google Play.
Stan na wrzesień 2026: aplikacja działa jako PWA na GitHub Pages, bez serwera i bez kont.

## 1. Struktura gry

Gra dzieli się na cztery obszary, widoczne w dolnym pasku menu:

| Zakładka | Co zawiera |
|---|---|
| **Graj** (single) | wyzwanie dnia, zagadki dnia (Do sześciu razy sztuka, Ciepło-zimno), własna gra z konfiguratorem, wszystkie pojedyncze gry |
| **Ze znajomymi** (multi) | pokój na żywo (kod lub link), wyzwania przez link, później publiczne dobieranie graczy i rankingi |
| **Encyklopedia** | gminy, powiaty, województwa, odnośniki z każdej gry |
| **Profil** | nick, awatar, poziom, statystyki, odznaki, konto i logowanie, ustawienia |

Najważniejszy element: **konfigurator rozgrywki** (wspólny dla single i multi).

## 2. Konfigurator rozgrywki

Model (`KONFIG` w `wyzwanie.html`, zapisywany w `localStorage` osobno dla single i multi):

```json
{
  "preset": "Turniej",
  "gry": [{"t": "z", "ile": 2}, {"t": "g", "ile": 2}],
  "kolej": "przeplatane | po kolei | losowo",
  "czas": 0,
  "podp": true,
  "premia": true,
  "wielk": "dsm",
  "obszar": ["mazowieckie"]
}
```

- Typy gier: `z` Z lotu ptaka, `g` Gdzie to jest?, `m` Co to za miasto?, `k` Kształt powiatu, `h` Herb, `t` Tablice, `r` Rzeka, `c` Kluby, `w` Więcej czy mniej, `s` Graniczą czy nie?, `v` Województwo.
- Presety: Turniej, Szybka, Z lotu ptaka, Mapa i miasta, Symbole, Granice, Ekspert.
- Kolejność gier ustawia się strzałkami, liczbę pytań dla każdej gry przyciskami − i +.
- Konfiguracja i ziarno losowania trafiają do linku z wyzwaniem (`?tryb=turniej&seed=…&k=…`), więc znajomy dostaje identyczne pytania.

Do zrobienia później: własne zapisane presety („Moje”), presety udostępniane przez link, presety sezonowe (np. „Mundial w Polsce”), nowe typy gier dopisywane do tej samej listy.

## 3. Multi

**Teraz:** PeerJS (WebRTC). Gospodarz liczy wyniki, telefony łączą się bezpośrednio, publiczny serwer PeerJS służy tylko do nawiązania połączenia. Na żywo widać, kto już odpowiedział.

**Docelowo (Firebase):**
- pokoje w Firestore albo Realtime Database: `pokoje/{kod}` z konfiguracją, ziarnem, stanem rundy i graczami;
- odpowiedzi zapisuje każdy gracz, a punkty liczy Cloud Function, żeby nie dało się oszukiwać;
- powrót do gry po zerwaniu połączenia (stan pokoju jest w chmurze, a nie u gospodarza);
- publiczne dobieranie graczy („Zagraj z kimś”), pokoje prywatne na kod, listy znajomych i zaproszenia push.

## 4. Konta i logowanie

Metody logowania (Firebase Authentication):

1. **Gość** (Anonymous Auth): start bez rejestracji, wszystko działa od razu.
2. **Google:** na Androidzie przez Credential Manager, jedno stuknięcie.
3. **E-mail:** link logujący bez hasła, opcjonalnie e-mail i hasło.
4. **Apple:** wymagane, jeśli kiedyś powstanie wersja na iOS.

Zasady:
- konto gościa można później połączyć z Google lub e-mailem (`linkWithCredential`), bez utraty postępu;
- przy pierwszym logowaniu postęp z `localStorage` przenosi się do chmury (scalanie z wyższym wynikiem);
- nick unikalny, filtrowany pod kątem wulgaryzmów; awatar z gotowego zestawu (bez wgrywania zdjęć, mniej moderacji);
- w aplikacji musi być **usuwanie konta i danych** (wymóg Google Play) oraz link do polityki prywatności.

Warstwa w kodzie: `konto.js` z jednym interfejsem (`Konto.profil()`, `Konto.zaloguj(metoda)`, `Konto.wyloguj()`, `Konto.zapiszWynik()`). Teraz działa lokalnie; później ta sama warstwa dostanie wersję z Firebase i gry nie trzeba będzie zmieniać.

## 5. Model danych w chmurze (Firestore)

```
uzytkownicy/{uid}          nick, awatar, utworzono, xp, poziom, metody logowania
uzytkownicy/{uid}/nauka    postęp nauki (to, co dziś jest w nauka-v1)
uzytkownicy/{uid}/odznaki  zdobyte odznaki
dzienne/{data}/wyniki/{uid}   wynik wyzwania dnia i zagadek dnia
rankingi/{okres}_{gra}     tabele tygodniowe i sezonowe (liczone przez Cloud Functions)
pokoje/{kod}               gospodarz, konfiguracja, ziarno, stan, gracze
pokoje/{kod}/odpowiedzi/{runda}_{uid}
znajomi/{uid}/lista/{uid2}
```

Bezpieczeństwo: reguły Firestore (każdy pisze tylko swoje dane), wyniki rankingowe weryfikowane w Cloud Functions, App Check z Play Integrity, limity zapytań.

## 6. Droga do Google Play

1. **Własna domena** z HTTPS (np. polskoznawca.pl) zamiast adresu GitHub Pages.
2. **Opakowanie:** Trusted Web Activity przez Bubblewrap albo PWABuilder, co daje paczkę AAB bez przepisywania gry. Gdy potrzebne będą funkcje natywne (Play Games Services, własne powiadomienia, zakupy), przejście na Capacitor.
3. **Digital Asset Links:** plik `.well-known/assetlinks.json` na domenie.
4. **Manifest:** ikony maskowalne 512 px, zrzuty ekranu, krótki i pełny opis, kategoria „Edukacja” lub „Quiz”.
5. **Formularze w Play Console:** polityka prywatności (URL), sekcja „Bezpieczeństwo danych”, klasyfikacja treści (IARC), grupa docelowa, usuwanie konta.
6. **Testy zamknięte:** nowe konta deweloperów osobistych muszą przeprowadzić test zamknięty (co najmniej 12 testerów przez 14 dni) przed publikacją produkcyjną.
7. **Aktualny docelowy poziom API Androida**, podpisywanie przez Play App Signing.

### Licencje do sprawdzenia przed publikacją

- **Zdjęcia satelitarne Esri (World Imagery)**: w aplikacji publikowanej, zwłaszcza z reklamami lub płatnościami, potrzebne jest konto ArcGIS i zgodność z warunkami Esri. Alternatywy: ortofotomapa GUGiK (dane publiczne), Mapbox Satellite (płatne limity).
- **Wikimedia Commons**: każde zdjęcie i herb z podpisem autora i licencji (już jest w grze); licencje CC BY-SA wymagają uznania autorstwa także w sklepie.
- **OpenStreetMap**: atrybucja ODbL.
- **Tablice, kluby, dane GUS i PRG**: dane publiczne, ale nazwy i herby klubów to znaki towarowe; w grze używamy tylko nazw, bez logotypów.

## 7. Etapy

| Etap | Zakres |
|---|---|
| **1. Przygotowanie (teraz)** | konfigurator rozgrywki, multi na prawdziwych grach, profil lokalny, warstwa `konto.js`, ekran profilu z metodami logowania oznaczonymi „wkrótce”, manifest pod sklep |
| **2. Konta** | Firebase Auth (gość, Google, e-mail), przeniesienie postępu do chmury, usuwanie konta |
| **3. Multi w chmurze** | pokoje w Firestore, punkty w Cloud Functions, powrót po zerwaniu, rankingi dzienne i tygodniowe |
| **4. Sklep** | własna domena, TWA, polityka prywatności, test zamknięty, publikacja |
| **5. Rozwój** | odznaki, ligi, powiadomienia, nowe gry w konfiguratorze, sezony |
