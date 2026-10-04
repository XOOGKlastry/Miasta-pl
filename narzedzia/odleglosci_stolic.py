"""Odległość gminy od najbliższej stolicy województwa (karty-geo.json).

- Punkt gminy: siedziba urzędu (centra.json), a gdy go brak, punkt wewnątrz granicy gminy z PRG.
- Stolice: 18 miast. Kujawsko-pomorskie ma dwie (Bydgoszcz i Toruń), lubuskie też (Gorzów Wielkopolski i Zielona Góra).
- Liczy się najbliższa stolica dowolnego województwa, bo często bliżej jest do stolicy sąsiedniego
  (np. Sosnowiec do Katowic, ale Jaworzno… też do Katowic, a nie do Krakowa). Zapisujemy też, która to stolica
  i czy leży w innym województwie, oraz odległość do własnej stolicy (najbliższej z dwóch, jeśli są dwie).
Odległość w linii prostej (km, na elipsoidzie uproszczonej do kuli). Uruchom: python narzedzia/odleglosci_stolic.py
"""
import json, math, pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from pobierz_mapki_topo import topo_na_geojson

ROOT = pathlib.Path(__file__).resolve().parents[1]
STOLICE = {  # nazwa: województwo (kod TERYT)
    "Białystok": "20", "Bydgoszcz": "04", "Toruń": "04", "Gdańsk": "22", "Gorzów Wielkopolski": "08", "Zielona Góra": "08",
    "Katowice": "24", "Kielce": "26", "Kraków": "12", "Lublin": "06", "Łódź": "10", "Olsztyn": "28", "Opole": "16",
    "Poznań": "30", "Rzeszów": "18", "Szczecin": "32", "Warszawa": "14", "Wrocław": "02"}


def km(a, b):
    la1, lo1, la2, lo2 = map(math.radians, (a[0], a[1], b[0], b[1]))
    h = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return 2 * 6371.0 * math.asin(math.sqrt(h))


def main():
    centra = json.loads((ROOT / "centra.json").read_text(encoding="utf-8"))
    baza = json.loads((ROOT / "baza.json").read_text(encoding="utf-8"))
    gminy = {g["k"]: g for g in topo_na_geojson(json.loads((ROOT / "gminy.topojson").read_text(encoding="utf-8")))}
    # stolica: urząd miasta; przy powtórzonej nazwie (Olsztyn) wybieramy punkt w swoim województwie
    stol = {}
    for n, woj in STOLICE.items():
        kand = centra.get(n) or []
        k = next((g["k"] for g in baza["gminy"] if g["n"] == n and g["k"][:2] == woj and g["typ"] == "gmina miejska"), None)
        geom = gminy.get(k, {}).get("geom") if k else None
        punkt = None
        for c in kand:
            if geom is None:
                punkt = (c[0], c[1]); break
            from shapely.geometry import Point
            if geom.buffer(0.02).contains(Point(c[1], c[0])):
                punkt = (c[0], c[1]); break
        if punkt is None and geom is not None:
            p = geom.representative_point(); punkt = (p.y, p.x)
        stol[n] = (punkt, woj)
    wynik = {}
    for g in baza["gminy"]:
        k = g["k"]
        if k[-1] not in "123" or k not in gminy:
            continue
        geom = gminy[k]["geom"]
        # punkt gminy: urząd z centra.json, jeśli leży w gminie; inaczej punkt wewnątrz granicy
        punkt = None
        from shapely.geometry import Point
        for c in centra.get(g["n"], []):
            if geom.buffer(0.005).contains(Point(c[1], c[0])):
                punkt = (c[0], c[1]); break
        if punkt is None:
            p = geom.representative_point(); punkt = (p.y, p.x)
        odl = sorted((km(punkt, p), n, w) for n, (p, w) in stol.items())
        d, n, w = odl[0]
        wlasne = [x for x in odl if x[2] == k[:2]]
        wynik[k] = {"odleglosc_stolica": round(d, 1), "najblizsza_stolica": n, "inne_woj": w != k[:2],
                    "odleglosc_wlasna_stolica": round(wlasne[0][0], 1) if wlasne else None}
    meta = {"opis": "Odległość w linii prostej od urzędu gminy do urzędu najbliższej stolicy województwa (18 stolic).", "gminy": wynik}
    (ROOT / "karty-geo.json").write_text(json.dumps(meta, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    inne = sum(1 for v in wynik.values() if v["inne_woj"])
    print("gmin:", len(wynik), "bliżej do stolicy innego województwa:", inne)
    for nazwa in ("Sosnowiec", "Jaworzno", "Toruń", "Bydgoszcz", "Inowrocław", "Gorzów Wielkopolski", "Słubice", "Ustka", "Ustrzyki Dolne"):
        for g in baza["gminy"]:
            if g["n"] == nazwa and g["k"] in wynik:
                print(nazwa, g["typ"], wynik[g["k"]])


if __name__ == "__main__":
    main()
