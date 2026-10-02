"""Mapki topograficzne do kart gmin z OpenStreetMap (wyciąg Geofabrik dla Polski, przetwarzany osmium).

Na każdą gminę plik mapki/<TERYT>.json:
  bb  [minlon,minlat,maxlon,maxlat] granicy gminy
  l   lasy (wielokąty)            w  wody: jeziora, zbiorniki, szerokie rzeki (wielokąty)
  r   rzeki i kanały (linie)      d  drogi [klasa, linia]: 0 autostrada, 1 ekspresowa, 2 główna (krajowa i wojewódzka główna)
  m   miejscowości [nazwa, lon, lat, ranga 3 miasto / 2 miasteczko / 1 wieś]
Dane © współtwórcy OpenStreetMap (ODbL).
"""
import json, os, subprocess, sys, time, urllib.request
from shapely.geometry import shape, box
from shapely.strtree import STRtree
from shapely import make_valid

PBF = "/tmp/polska.osm.pbf"
URL = "https://download.geofabrik.de/europe/poland-latest.osm.pbf"
OUT = "mapki"
sys.path.insert(0, os.path.dirname(__file__))
from pobierz_mapki_topo import topo_na_geojson  # noqa: E402


def sh(cmd):
    print("$", cmd, flush=True)
    subprocess.run(cmd, shell=True, check=True)


def warstwa(nazwa, filtr, typy, tol, min_pole=0.0, prop=None):
    """filtruje wyciąg, eksportuje do GeoJSONSeq i czyta z uproszczeniem"""
    sh("osmium tags-filter %s %s -o /tmp/%s.pbf --overwrite" % (PBF, filtr, nazwa))
    sh("osmium export /tmp/%s.pbf -f geojsonseq --geometry-types=%s -o /tmp/%s.geojsonseq --overwrite" % (nazwa, typy, nazwa))
    geom, atr = [], []
    with open("/tmp/%s.geojsonseq" % nazwa, encoding="utf-8") as fh:
        for linia in fh:
            linia = linia.strip().lstrip("\x1e")
            if not linia:
                continue
            f = json.loads(linia)
            try:
                g = shape(f["geometry"])
                if g.geom_type in ("Polygon", "MultiPolygon"):
                    if g.area < min_pole:
                        continue
                    g = make_valid(g)
                g = g.simplify(tol, preserve_topology=False)
                if g.is_empty:
                    continue
            except Exception:
                continue
            geom.append(g)
            atr.append(prop(f["properties"]) if prop else None)
    os.remove("/tmp/%s.geojsonseq" % nazwa)
    print("  %s: %d obiektów" % (nazwa, len(geom)), flush=True)
    return geom, atr


def wspolrzedne(g, tol):
    """lista pierścieni / linii zaokrąglonych do 4 miejsc"""
    g = g.simplify(tol, preserve_topology=False)
    out = []
    for cz in getattr(g, "geoms", [g]):
        if cz.geom_type == "Polygon":
            r = [[round(x, 4), round(y, 4)] for x, y in cz.exterior.coords]
            if len(r) >= 4:
                out.append(r)
        elif cz.geom_type == "LineString":
            r = [[round(x, 4), round(y, 4)] for x, y in cz.coords]
            if len(r) >= 2:
                out.append(r)
        elif cz.geom_type in ("MultiPolygon", "MultiLineString", "GeometryCollection"):
            out.extend(wspolrzedne(cz, tol))
    return out


def main():
    if not os.path.exists(PBF):
        print("pobieram wyciąg OSM dla Polski…", flush=True)
        urllib.request.urlretrieve(URL, PBF)
    gminy = topo_na_geojson(json.load(open("gminy.topojson", encoding="utf-8")))
    print("gmin:", len(gminy), flush=True)
    KL = {"motorway": 0, "trunk": 1, "primary": 2}
    lasy, _ = warstwa("lasy", "wr/landuse=forest wr/natural=wood", "polygon", 0.0006, 2e-6)
    wody, _ = warstwa("wody", "wr/natural=water wr/waterway=riverbank wr/landuse=reservoir", "polygon", 0.0004, 2e-7)
    rzeki, _ = warstwa("rzeki", "w/waterway=river,canal", "linestring", 0.0005)
    drogi, kl = warstwa("drogi", "w/highway=motorway,trunk,primary", "linestring", 0.0004, prop=lambda p: KL.get(p.get("highway"), 2))
    RANGA = {"city": 3, "town": 2, "village": 1}
    msc, ma = warstwa("miejsca", "n/place=city,town,village", "point", 0,
                      prop=lambda p: (p.get("name", ""), RANGA.get(p.get("place"), 1)))
    T = {n: STRtree(g) for n, g in (("l", lasy), ("w", wody), ("r", rzeki), ("d", drogi), ("m", msc))}
    os.makedirs(OUT, exist_ok=True)
    for i, gm in enumerate(gminy):
        minx, miny, maxx, maxy = gm["geom"].bounds
        dx, dy = (maxx - minx) * .12 + .004, (maxy - miny) * .12 + .004
        ramka = box(minx - dx, miny - dy, maxx + dx, maxy + dy)
        tol = max(maxx - minx, maxy - miny) / 300
        min_pole = ((maxx - minx) * (maxy - miny)) / 3000
        wynik = {"bb": [round(minx, 4), round(miny, 4), round(maxx, 4), round(maxy, 4)], "l": [], "w": [], "r": [], "d": [], "m": []}
        for warstwa_, lista in (("l", lasy), ("w", wody)):
            for j in T[warstwa_].query(ramka):
                g = lista[j]
                if g.area < min_pole:
                    continue
                cz = g.intersection(ramka)
                if not cz.is_empty:
                    wynik[warstwa_].extend(wspolrzedne(cz, tol))
        for j in T["r"].query(ramka):
            cz = rzeki[j].intersection(ramka)
            if not cz.is_empty:
                wynik["r"].extend(wspolrzedne(cz, tol))
        for j in T["d"].query(ramka):
            cz = drogi[j].intersection(ramka)
            if not cz.is_empty:
                wynik["d"].extend([[kl[j], x] for x in wspolrzedne(cz, tol)])
        for j in T["m"].query(gm["geom"]):
            if gm["geom"].contains(msc[j]) and ma[j][0]:
                wynik["m"].append([ma[j][0], round(msc[j].x, 4), round(msc[j].y, 4), ma[j][1]])
        wynik["m"].sort(key=lambda x: -x[3])
        wynik["m"] = wynik["m"][:40]
        with open("%s/%s.json" % (OUT, gm["k"]), "w", encoding="utf-8") as fh:
            json.dump(wynik, fh, ensure_ascii=False, separators=(",", ":"))
        if i % 250 == 0:
            print("  mapki", i, flush=True)
    print("gotowe:", len(gminy))


if __name__ == "__main__":
    main()
