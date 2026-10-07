"""Drogi główne do map „Gdzie to jest?”: autostrady, ekspresowe i krajowe (trunk) oraz główne (primary) z OpenStreetMap.

Źródło: mapki/<TERYT>.json (wcześniej pobrane z Overpass, drogi przycięte do każdej gminy). Odcinki z sąsiednich gmin
się nakładają, więc sklejamy je w jedną sieć (unary_union + linemerge) i upraszczamy do skali mapy kraju.
Wynik drogi.json: {"z": [[[lon,lat],...],...] autostrady i ekspresowe, "g": [...] drogi główne}.
Dane © współtwórcy OpenStreetMap (ODbL).
"""
import glob, json, pathlib
from shapely.geometry import LineString, MultiLineString
from shapely.ops import unary_union, linemerge

ROOT = pathlib.Path(__file__).resolve().parents[1]


def main():
    klasy = {"z": [], "g": []}
    for f in glob.glob(str(ROOT / "mapki" / "*.json")):
        for kl, pts in json.load(open(f, encoding="utf-8")).get("d", []):
            if len(pts) < 2:
                continue
            if kl in (0, 1):
                klasy["z"].append(LineString(pts))
            elif kl == 2:
                klasy["g"].append(LineString(pts))
    wynik = {}
    for k, linie in klasy.items():
        siec = linemerge(unary_union(linie)).simplify(0.0012, preserve_topology=False)
        czesci = list(siec.geoms) if hasattr(siec, "geoms") else [siec]
        wynik[k] = [[[round(x, 3), round(y, 3)] for x, y in c.coords] for c in czesci if c.length > 0.004]
        print(k, "odcinków:", len(wynik[k]), "punktów:", sum(len(c) for c in wynik[k]))
    (ROOT / "drogi.json").write_text(json.dumps(wynik, separators=(",", ":")), encoding="utf-8")


if __name__ == "__main__":
    main()
