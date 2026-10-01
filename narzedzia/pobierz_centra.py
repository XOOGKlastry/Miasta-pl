"""Środki miast do gier z lotu ptaka: najlepiej urząd miasta albo gminy, a gdy go brak, punkt
miejscowości z OpenStreetMap (zwykle rynek albo centrum). Wynik: centra.json.

Format: {"Nazwa": [[lat, lon, "urzad" | "centrum"], ...]} (lista, bo zdarzają się miasta o tej samej nazwie).
"""
import json, math, re, sys, time, unicodedata, urllib.parse, urllib.request

UA = "PolskoZnawca/1.0 (https://github.com/XOOGKlastry/Miasta-pl; gra edukacyjna)"
SERWERY = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter",
           "https://maps.mail.ru/osm/tools/overpass/api/interpreter"]
Q = """[out:json][timeout:300];
area["ISO3166-1"="PL"][admin_level=2]->.pl;
node["place"~"^(city|town)$"](area.pl)->.m;
nwr["amenity"="townhall"](area.pl)->.u;
.m out;
.u out center tags;"""


def overpass():
    for i in range(6):
        url = SERWERY[i % len(SERWERY)]
        try:
            req = urllib.request.Request(url, data=("data=" + urllib.parse.quote(Q)).encode(), headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=360) as r:
                return json.loads(r.read())["elements"]
        except Exception as e:
            print("  ponawiam", url, e, file=sys.stderr)
            time.sleep(20 * (i + 1))
    raise RuntimeError("Overpass nie odpowiada")


def norm(s):
    s = unicodedata.normalize("NFKD", (s or "").replace("ł", "l").replace("Ł", "L"))
    return re.sub(r"[^a-z0-9 ]", " ", "".join(c for c in s if not unicodedata.combining(c)).lower())


def km(a, b):
    return math.hypot((a[0] - b[0]) * 111.2, (a[1] - b[1]) * 111.2 * math.cos(math.radians(a[0])))


def main():
    el = overpass()
    miasta = [e for e in el if e.get("tags", {}).get("place") in ("city", "town") and e.get("tags", {}).get("name")]
    urzedy = []
    for e in el:
        t = e.get("tags", {})
        if t.get("amenity") != "townhall":
            continue
        lat = e.get("lat") or (e.get("center") or {}).get("lat")
        lon = e.get("lon") or (e.get("center") or {}).get("lon")
        if lat is None:
            continue
        urzedy.append((lat, lon, norm(t.get("name", "")), t.get("townhall:type", "")))
    print("miast:", len(miasta), "urzędów:", len(urzedy))
    wynik, z_urzedem = {}, 0
    for m in miasta:
        n, p = m["tags"]["name"], (m["lat"], m["lon"])
        nn = norm(n)
        best, best_ocena = None, -1
        for u in urzedy:
            d = km(p, u)
            if d > 2.5:
                continue
            ocena = 3 - d
            nazwa = u[2]
            if re.search(r"urzad (miasta|miejski|gminy|miasta i gminy)|ratusz|magistrat", nazwa):
                ocena += 3
            if nn.split()[0] in nazwa:
                ocena += 2
            if u[3] in ("city", "town", "municipality"):
                ocena += 2
            if re.search(r"starostwo|powiat|wojewod|marszal|soltys|osiedl|dzielnic", nazwa):
                ocena -= 4   # starostwo i urzędy dzielnic to nie środek miasta
            if ocena > best_ocena:
                best, best_ocena = u, ocena
        if best and best_ocena >= 2:
            wynik.setdefault(n, []).append([round(best[0], 5), round(best[1], 5), "urzad"])
            z_urzedem += 1
        else:
            wynik.setdefault(n, []).append([round(p[0], 5), round(p[1], 5), "centrum"])
    with open("centra.json", "w", encoding="utf-8") as fh:
        json.dump(wynik, fh, ensure_ascii=False, separators=(",", ":"))
    print("zapisano miast:", len(wynik), "z urzędem:", z_urzedem)


if __name__ == "__main__":
    main()
