"""Buduje rzeki.json: miasto -> rzeka, nad którą leży.

Źródła:
  1. OpenStreetMap (Overpass): miasta oraz odcinki rzek z geometrią. Dla każdego miasta
     szukamy najbliższej nazwanej rzeki w promieniu kilku kilometrów, z premią dla rzek
     dłuższych (żeby Wisła wygrywała z bezimiennym dopływem tuż obok).
  2. Wikidata (P206) jako uzupełnienie tam, gdzie jest wpisana.

Uruchamiane przez GitHub Actions.
"""
import json, math, re, sys, time, urllib.parse, urllib.request
from collections import defaultdict

UA = "ZnaszPolske/1.0 (https://github.com/XOOGKlastry/Miasta-pl; gra edukacyjna)"
MAX_KM = 4.0          # dalej niż tyle nie uznajemy, że miasto leży nad rzeką
KOMORKA = 0.05        # siatka indeksu przestrzennego w stopniach


def http(url, data=None, tries=4, timeout=600):
    for i in range(tries):
        try:
            req = urllib.request.Request(url, data=data, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.read()
        except Exception as e:
            print("  ponawiam", url[:80], e, file=sys.stderr)
            time.sleep(5 * (i + 1))
    raise RuntimeError("nie udało się: " + url[:120])


def overpass(q, timeout=600):
    last = None
    for host in ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"]:
        try:
            return json.loads(http(host, ("data=" + urllib.parse.quote(q)).encode(), tries=2, timeout=timeout))
        except Exception as e:
            last = e
            print("Overpass", host, e, file=sys.stderr)
    raise RuntimeError("Overpass nie odpowiada: %s" % last)


def cities():
    q = ('[out:json][timeout:240];area["ISO3166-1"="PL"][admin_level=2]->.pl;'
         '(node["place"~"^(city|town)$"](area.pl););out body;')
    out = []
    for e in overpass(q)["elements"]:
        t = e.get("tags", {})
        if not t.get("name"):
            continue
        out.append({"n": t["name"].strip(), "lat": round(e["lat"], 4), "lon": round(e["lon"], 4),
                    "pop": int(re.sub(r"\D", "", t.get("population", "0")) or 0),
                    "qid": t["wikidata"] if re.fullmatch(r"Q\d+", t.get("wikidata", "")) else None})
    print("miast z OSM:", len(out))
    return out


def rivers_osm():
    """odcinki nazwanych rzek w Polsce, z geometrią"""
    q = ('[out:json][timeout:900];area["ISO3166-1"="PL"][admin_level=2]->.pl;'
         'way["waterway"="river"]["name"](area.pl);out geom;')
    els = overpass(q, timeout=900)["elements"]
    print("odcinków rzek:", len(els))
    return els


def km(lat1, lon1, lat2, lon2):
    k = math.cos(math.radians((lat1 + lat2) / 2))
    return math.hypot(lat1 - lat2, (lon1 - lon2) * k) * 111.19


def odleglosc_do_odcinka(lat, lon, a, b):
    """przybliżona odległość punktu od odcinka, w km"""
    k = math.cos(math.radians(lat))
    px, py = lon * k, lat
    ax, ay = a[1] * k, a[0]
    bx, by = b[1] * k, b[0]
    dx, dy = bx - ax, by - ay
    if dx == 0 and dy == 0:
        t = 0.0
    else:
        t = max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
    return math.hypot(px - (ax + t * dx), py - (ay + t * dy)) * 111.19


def glowna(nazwa, dlugosc):
    """„Odra Zachodnia” -> „Odra”: jeśli człon nazwy jest samodzielną, dużą rzeką"""
    czesci = nazwa.split()
    if len(czesci) < 2:
        return nazwa
    for kandydat in (czesci[0], czesci[-1]):
        if dlugosc.get(kandydat, 0) >= 150:
            return kandydat
    return nazwa


def rdp(pts, tol):
    """upraszczanie linii (Douglas-Peucker), tolerancja w stopniach"""
    if len(pts) < 3:
        return pts
    keep = [False] * len(pts)
    keep[0] = keep[-1] = True
    stos = [(0, len(pts) - 1)]
    while stos:
        i, j = stos.pop()
        a, b = pts[i], pts[j]
        dmax, idx = 0.0, -1
        dx, dy = b[0] - a[0], b[1] - a[1]
        dd = dx * dx + dy * dy
        for k in range(i + 1, j):
            p = pts[k]
            if dd == 0:
                d = math.hypot(p[0] - a[0], p[1] - a[1])
            else:
                t = max(0, min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / dd))
                d = math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy)
            if d > dmax:
                dmax, idx = d, k
        if dmax > tol and idx > 0:
            keep[idx] = True
            stos += [(i, idx), (idx, j)]
    return [p for p, k in zip(pts, keep) if k]


def main():
    cs = cities()
    els = rivers_osm()

    dlugosc = defaultdict(float)         # nazwa rzeki -> długość w km
    siatka = defaultdict(list)           # komórka -> [(nazwa, punkt A, punkt B, nr odcinka)]
    drogi = {}                           # nr odcinka -> (nazwa, punkty)
    po_nazwie = defaultdict(list)
    for wi, e in enumerate(els):
        name = (e.get("tags", {}).get("name") or "").strip()
        geo = e.get("geometry") or []
        if not name or len(geo) < 2:
            continue
        pts = [(p["lat"], p["lon"]) for p in geo]
        drogi[wi] = (name, pts)
        po_nazwie[name].append(wi)
        for a, b in zip(pts, pts[1:]):
            dlugosc[name] += km(a[0], a[1], b[0], b[1])
            for key in {(int(p[0] / KOMORKA), int(p[1] / KOMORKA)) for p in (a, b)}:
                siatka[key].append((name, a, b, wi))

    # spójne fragmenty rzek o tej samej nazwie (odcinki stykające się końcami)
    rodzic = {}
    def znajdz(x):
        while rodzic.get(x, x) != x:
            rodzic[x] = rodzic.get(rodzic[x], rodzic[x])
            x = rodzic[x]
        return x
    # łączymy odcinki tej samej rzeki, których końce leżą bliżej niż ok. 2,5 km
    # (przerwy przy zaporach, jeziorach i rozwidleniach koryta)
    TOL = 0.025
    # ramiona dużych rzek („Odra Zachodnia”, „Martwa Wisła”) łączymy z rzeką główną,
    # żeby przebieg sięgał aż do ujścia
    grupy = defaultdict(list)
    for name, lista in po_nazwie.items():
        grupy[glowna(name, dlugosc)].extend(lista)
    for name, lista in grupy.items():
        kratki = defaultdict(list)
        for wi in lista:
            pts = drogi[wi][1]
            for p in (pts[0], pts[-1]):
                ki, kj = int(p[0] / TOL), int(p[1] / TOL)
                for di in (-1, 0, 1):
                    for dj in (-1, 0, 1):
                        for (q, wj) in kratki.get((ki + di, kj + dj), ()):
                            if abs(q[0] - p[0]) < TOL and abs(q[1] - p[1]) < TOL * 1.6:
                                a, b = znajdz(wi), znajdz(wj)
                                if a != b:
                                    rodzic[a] = b
                kratki[(ki, kj)].append((p, wi))
    skladowe = defaultdict(list)
    for wi in drogi:
        skladowe[znajdz(wi)].append(wi)
    print("nazwanych rzek:", len(dlugosc), "komórek siatki:", len(siatka))

    wyniki = {}
    for c in cs:
        ci, cj = int(c["lat"] / KOMORKA), int(c["lon"] / KOMORKA)
        naj, najw = {}, {}
        for i in range(ci - 1, ci + 2):
            for j in range(cj - 1, cj + 2):
                for name, a, b, wi in siatka.get((i, j), ()):
                    d = odleglosc_do_odcinka(c["lat"], c["lon"], a, b)
                    if d < naj.get(name, 1e9):
                        naj[name] = d
                        najw[name] = wi
        kand = [(n, d) for n, d in naj.items() if d <= MAX_KM]
        if not kand:
            continue
        # o wyborze decyduje odległość podzielona przez pierwiastek długości rzeki:
        # mała struga tuż obok przegrywa z dużą rzeką kilkaset metrów dalej
        best = min(kand, key=lambda x: (x[1] + 0.05) / max(1.0, dlugosc[x[0]]) ** 0.5)
        nazwa = glowna(best[0], dlugosc)
        wi = najw[best[0]]
        if nazwa != best[0]:
            # „Odra Zachodnia” -> przebieg Odry: najbliższy odcinek rzeki głównej
            wi = min(po_nazwie[nazwa], key=lambda w: min(
                odleglosc_do_odcinka(c["lat"], c["lon"], a, b) for a, b in zip(drogi[w][1], drogi[w][1][1:])))
        wyniki[c["n"].lower()] = (c, nazwa, round(best[1], 2), znajdz(wi))
    print("miast nad rzeką (OSM):", len(wyniki))

    out, widziane, geo = [], {}, {}
    for key, (c, rzeka, d, skl) in wyniki.items():
        if key in widziane and widziane[key]["pop"] >= c["pop"]:
            continue
        rid = str(skl)
        if rid not in geo:
            linie = []
            for w in skladowe[skl]:
                pts = rdp([(p[1], p[0]) for p in drogi[w][1]], 0.006)
                linie.append([[round(x, 3), round(y, 3)] for x, y in pts])
            geo[rid] = linie
        rec = {"n": c["n"], "lat": c["lat"], "lon": c["lon"], "pop": c["pop"], "rzeka": rzeka, "km": d, "rid": rid}
        widziane[key] = rec
    out = sorted(widziane.values(), key=lambda r: -r["pop"])
    with open("rzeki.json", "w", encoding="utf-8") as fh:
        json.dump({"zbudowano": time.strftime("%Y-%m-%d"), "miasta": out}, fh, ensure_ascii=False, separators=(",", ":"))
    uzyte = {r["rid"] for r in out}
    with open("rzeki-geo.json", "w", encoding="utf-8") as fh:
        json.dump({k: v for k, v in geo.items() if k in uzyte}, fh, separators=(",", ":"))
    print("zapisano:", len(out), "przebiegów rzek:", len(uzyte))
    for r in out[:15]:
        print("  ", r["n"], "->", r["rzeka"], "(%.1f km)" % r["km"])
    if len(out) < 200:
        raise SystemExit("za mało danych, coś poszło nie tak")


if __name__ == "__main__":
    main()
