"""Lista miast do podpisów na mapie po odpowiedzi w „Gdzie to jest?”.

Wejście: herby.json (wszystkie miasta z liczbą mieszkańców) i tablice-powiaty.js (siedziby powiatów).
Wyjście: miasta-etykiety.json, lista [nazwa, lat, lon, ludność, ranga]:
ranga 3 = stolica województwa, 2 = siedziba powiatu albo miasto na prawach powiatu, 1 = pozostałe miasta.
"""
import json, re, pathlib

KAT = pathlib.Path(__file__).resolve().parent.parent
STOLICE = {"Warszawa", "Kraków", "Łódź", "Wrocław", "Poznań", "Gdańsk", "Szczecin", "Bydgoszcz", "Toruń", "Lublin",
           "Białystok", "Katowice", "Kielce", "Olsztyn", "Opole", "Rzeszów", "Zielona Góra", "Gorzów Wielkopolski"}

herby = json.loads((KAT / "herby.json").read_text(encoding="utf-8"))["miasta"]
tab = (KAT / "tablice-powiaty.js").read_text(encoding="utf-8")
siedziby = set(re.findall(r'"siedziba":\s*"([^"]+)"', tab))
siedziby |= {n for n, t in re.findall(r'"nazwa":\s*"([^"]+)",\s*"typ":\s*"(miasto)"', tab)}
siedziby = {s.split(" - ")[0] for s in siedziby}

wynik = []
for c in herby:
    n = c["n"]
    ranga = 3 if n in STOLICE else 2 if n in siedziby else 1
    wynik.append([n, round(c["lat"], 4), round(c["lon"], 4), int(c.get("pop") or 0), ranga])
wynik.sort(key=lambda x: (-x[4], -x[3]))
(KAT / "miasta-etykiety.json").write_text(json.dumps(wynik, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
print(len(wynik), "miast;", sum(1 for x in wynik if x[4] == 3), "stolic;", sum(1 for x in wynik if x[4] == 2), "siedzib")
