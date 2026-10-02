"""Mapki topograficzne do kart gmin: drogi i miejscowości z OpenStreetMap przycięte do każdej gminy.

Wynik: mapki/<TERYT>.json  {"bb":[minlon,minlat,maxlon,maxlat],"d":[[klasa,[[lon,lat],...]],...],"m":[[nazwa,lon,lat,ranga],...]}
klasa drogi: 0 autostrada/ekspresowa, 1 krajowa (trunk), 2 główna (primary), 3 wojewódzka/powiatowa (secondary)
ranga miejscowości: 3 miasto, 2 miasteczko, 1 wieś, 0 przysiółek; większa liczba = ważniejsza.
Dane © współtwórcy OpenStreetMap (ODbL).
"""
import json, math, os, sys, time, urllib.parse, urllib.request
from shapely.geometry import shape, box, LineString, Point, mapping
from shapely.strtree import STRtree

UA = "PolskoZnawca/1.0 (https://github.com/XOOGKlastry/Miasta-pl; gra edukacyjna)"
SERWERY = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter",
           "https://maps.mail.ru/osm/tools/overpass/api/interpreter"]
WOJ = ["02", "04", "06", "08", "10", "12", "14", "16", "18", "20", "22", "24", "26", "28", "30", "32"]
OUT = "mapki"


def overpass(q, minimum=10):
    for i in range(8):
        url = SERWERY[i % len(SERWERY)]
        try:
            req = urllib.request.Request(url, data=("data=" + urllib.parse.quote(q)).encode(), headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=600) as r:
                el = json.loads(r.read())["elements"]
            if len(el) >= minimum:
                return el
            print("  za mało danych", len(el), file=sys.stderr)
        except Exception as e:
            print("  ponawiam", url, e, file=sys.stderr)
        time.sleep(30 * (i + 1))
    return []


def topo_na_geojson(t):
    """dekoder TopoJSON (z kwantyzacją) do listy cech GeoJSON"""
    obj = sorted(t["objects"].values(), key=lambda o: -len(o["geometries"]))[0]
    tr = t.get("transform")
    arcs = []
    for a in t["arcs"]:
        x = y = 0
        pts = []
        for p in a:
            if tr:
                x += p[0]; y += p[1]
                pts.append([x * tr["scale"][0] + tr["translate"][0], y * tr["scale"][1] + tr["translate"][1]])
            else:
                pts.append(p)
        arcs.append(pts)

    def luk(i):
        return arcs[i] if i >= 0 else arcs[~i][::-1]

    def pierscien(ids):
        pts = []
        for i in ids:
            a = luk(i)
            pts.extend(a if not pts else a[1:])
        return pts
    out = []
    for g in obj["geometries"]:
        if g["type"] == "Polygon":
            geom = {"type": "Polygon", "coordinates": [pierscien(r) for r in g["arcs"]]}
        elif g["type"] == "MultiPolygon":
            geom = {"type": "MultiPolygon", "coordinates": [[pierscien(r) for r in p] for p in g["arcs"]]}
        else:
            continue
        out.append({"k": str(g["properties"]["k"]), "n": g["properties"].get("n", ""), "geom": shape(geom).buffer(0)})
    return out


def main():
    gminy = topo_na_geojson(json.load(open("gminy.topojson", encoding="utf-8")))
    print("gmin:", len(gminy))
    # miejscowości (cała Polska jednym zapytaniem)
    pl = 'area(id:3600049715)->.pl;'
    el = overpass('[out:json][timeout:600];' + pl + 'node["place"~"^(city|town|village|hamlet)$"]["name"](area.pl);out;', 5000)
    RANGA = {"city": 3, "town": 2, "village": 1, "hamlet": 0}
    miejsca = [(e["tags"]["name"], e["lon"], e["lat"], RANGA[e["tags"]["place"]]) for e in el]
    print("miejscowości:", len(miejsca))
    # drogi województwami, żeby zapytania nie były za duże
    KL = {"motorway": 0, "trunk": 1, "primary": 2, "secondary": 3}
    drogi = []
    for w in WOJ:
        q = ('[out:json][timeout:600];area["teryt:terc"="%s"]["admin_level"="4"]->.w;'
             'way["highway"~"^(motorway|trunk|primary|secondary)$"](area.w);out geom;' % w)
        el = overpass(q, 50)
        for e in el:
            if "geometry" in e and len(e["geometry"]) >= 2:
                drogi.append((KL[e["tags"]["highway"]], LineString([(p["lon"], p["lat"]) for p in e["geometry"]])))
        print("  woj", w, "dróg razem:", len(drogi))
        time.sleep(5)
    drz = STRtree([d[1] for d in drogi])
    mpt = [Point(m[1], m[2]) for m in miejsca]
    mdrz = STRtree(mpt)
    os.makedirs(OUT, exist_ok=True)
    for i, g in enumerate(gminy):
        minx, miny, maxx, maxy = g["geom"].bounds
        dx, dy = (maxx - minx) * .12 + .005, (maxy - miny) * .12 + .005
        ramka = box(minx - dx, miny - dy, maxx + dx, maxy + dy)
        tol = max(maxx - minx, maxy - miny) / 400
        d = []
        for j in drz.query(ramka):
            kl, linia = drogi[j]
            cz = linia.intersection(ramka)
            if cz.is_empty:
                continue
            for seg in getattr(cz, "geoms", [cz]):
                if seg.geom_type != "LineString":
                    continue
                s = seg.simplify(tol)
                d.append([kl, [[round(x, 4), round(y, 4)] for x, y in s.coords]])
        m = []
        for j in mdrz.query(g["geom"]):
            if g["geom"].contains(mpt[j]):
                n, lo, la, r = miejsca[j]
                m.append([n, round(lo, 4), round(la, 4), r])
        m.sort(key=lambda x: -x[3])
        with open("%s/%s.json" % (OUT, g["k"]), "w", encoding="utf-8") as fh:
            json.dump({"bb": [round(minx, 4), round(miny, 4), round(maxx, 4), round(maxy, 4)], "d": d, "m": m[:60]},
                      fh, ensure_ascii=False, separators=(",", ":"))
        if i % 300 == 0:
            print("  mapki", i)
    print("gotowe:", len(gminy))


if __name__ == "__main__":
    main()
