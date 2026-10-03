# Karty, paczki i konta

Fragmenty gmin: zwykła 3, brązowa 4, srebrna 5, złota 6, diamentowa 7. Kontur daje pełną kartę od razu. Migracja zachowuje pełne karty sprzed zmiany. Punkty rankingu: 10 za poprawną odpowiedź, osobno od żetonów. Wymienianie miast: 10 miast daje żeton.

Kolor paczki losowany niezależnie od rzadkości karty: zwykła 80%, srebrna 16%, złota 3,5%, diamentowa 0,5%. Każdy typ ma osobną tabelę dropu, widoczną w albumie. Duplikat nie zwiększa liczby kart. Paczka za 3 gwiazdki raz na poziom, także dla wcześniej ukończonego poziomu po ponownym przejściu. Poddanie zadania dnia bez paczki. Nagroda multiplayer to jedna pełna karta dla zwycięzcy rozstrzygniętej rozgrywki; dwumecz jest dwiema seriami pytań z sumowanymi punktami. Remis rozstrzyga najszybsza poprawna odpowiedź na dodatkowe pytanie z limitem 10 sekund; gdy nikt nie trafi, kolejne pytanie.

## Uruchomienie kont

1. Utwórz projekt Supabase i wykonaj `supabase/schema.sql` w SQL Editor.
2. Ustaw publiczny URL projektu i publiczny klucz publishable/anon w `online-config.js`. Nie używaj service_role ani sekretów OAuth w kodzie strony.
3. W Auth ustaw Site URL na `https://xoogklastry.github.io/Miasta-pl/` i dozwolony redirect `https://xoogklastry.github.io/Miasta-pl/logowanie.html`.
4. Włącz Google i Facebook w panelu Auth. Sekrety aplikacji dostawców wpisz wyłącznie w panelu Supabase. Zakresy: Google openid/email/profile, Facebook email (podstawowy profil dostawcy). Bez kontaktów i publikowania.
5. Włącz e-mail OTP i szablon z `{{ .Token }}`, skonfiguruj SMTP.
6. Sprawdź wszystkie trzy metody na kontach testowych przed scaleniem ustawień. Po podłączeniu `requireAccount:true` wymaga konta na ekranach rozgrywki. Bez konfiguracji gra działa lokalnie.

Logowanie korzysta z PKCE i odnawiania sesji. Publiczny ranking ujawnia wyłącznie pseudonim i wynik, z publikacją na życzenie. RPC zapisuje wyłącznie profil `auth.uid()`. Remisy w rankingu mają wspólne miejsce. W tabeli nie ma e-maili.

## Ograniczenia

Postęp gry pozostaje lokalny — nie ma jeszcze synchronizacji albumu między urządzeniami. Wyniki rankingu są zgłaszane przez klienta i mogą zostać zmodyfikowane na urządzeniu: to ranking rekreacyjny. Rywalizacja odporna na oszustwa wymaga serwera rozliczającego odpowiedzi. PeerJS również ufa punktom zgłoszonym przez graczy; OAuth nie zmienia tego ograniczenia. Rozgrywka z linku (`tryb=turniej`, wynik znajomego) pozostaje asynchronicznym wyzwaniem, bez nagrody multiplayer i bez wspólnej dogrywki.

Automatyczne testy obejmują progi i migrację kart, szanse paczek, jednokrotne nagrody, zasady dogrywki oraz 48 konfiguracji rozmieszczenia dekoracji. Nie wykonano testu na żywym Supabase ani wizualnej kontroli przeglądarki w tym środowisku: brak Chromium, pobranie binariów zablokowane. Przed scaleniem sprawdź 360/390/430 px, animację paczki, logowanie i dwie sesje PeerJS.

## Pomysły na kolejne gry

- Ekspedycja tygodnia: wspólna trasa i odznaka za 5 kolejnych dni, bez utraty serii po przerwie.
- Detektyw gmin: trzy podpowiedzi (region, rzeka, zdjęcie), mniej podpowiedzi daje więcej punktów.
- Kolekcja województwa: widoczny pasek pełnych kart i odznaka za ukończony region.
- Wyprawa drużynowa: gracze razem rozwiązują zestaw pytań, z osobnymi wynikami.

Dalsze ulepszenie kart: osobna zakładka fragmentów, filtr „brakuje 1”, czytelny herb i nazwa, delikatny połysk tylko dla rzadkich kart; duplikaty można w przyszłości wymieniać na fragmenty wybranej gminy. Obecna zmiana upraszcza kształt kart i ogranicza agresywny połysk.
