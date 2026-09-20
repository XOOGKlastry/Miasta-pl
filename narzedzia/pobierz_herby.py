"""Buduje herby.json i miniatury herbów w katalogu herby/ (uruchamiane przez GitHub Actions).

1. Miasta z OpenStreetMap (Overpass): nazwa, położenie, liczba mieszkańców, tag wikidata.
2. Herb z Wikidata (P94); gdy go brak, standardowa nazwa pliku na Commons „POL <miasto> COA.svg”.
3. Istnienie pliku i adres miniatury sprawdzane w API Wikimedia Commons.
4. Miniatury zapisywane lokalnie jako WebP, więc gra nie zależy od zewnętrznych serwisów.
"""
import io, json, os, re, sys, time, unicodedata, urllib.parse, urllib.request

UA = "ZnaszPolske/1.0 (https://github.com/XOOGKlastry/Miasta-pl; gra edukacyjna)"
OUT_DIR = "herby"
WIDTH = 240


def http(url, data=None, tries=4, timeout=120):
    for i in range(tries):
        try:
            req = urllib.request.Request(url, data=data, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.read()
        except Exception as e:
            print("  ponawiam", url[:90], e, file=sys.stderr)
            time.sleep(5 * (i + 1))
    raise RuntimeError("nie udało się: " + url[:120])


def slug(s):
    s = unicodedata.normalize("NFKD", s.replace("ł", "l").replace("Ł", "L"))
    s = "".join(c for c in s if not unicodedata.combining(c)).lower()
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")


def cities():
    q = '[out:json][timeout:180];area["ISO3166-1"="PL"][admin_level=2]->.pl;(node["place"~"^(city|town)$"](area.pl););out body;'
    for host in ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"]:
        try:
            j = json.loads(http(host, ("data=" + urllib.parse.quote(q)).encode()))
            out = []
            for e in j["elements"]:
                t = e.get("tags", {})
                if not t.get("name"):
                    continue
                pop = int(re.sub(r"\D", "", t.get("population", "0")) or 0)
                qid = t.get("wikidata") if re.fullmatch(r"Q\d+", t.get("wikidata", "")) else None
                out.append({"n": t["name"].strip(), "lat": round(e["lat"], 4), "lon": round(e["lon"], 4), "pop": pop, "qid": qid})
            if len(out) > 800:
                return out
        except Exception as e:
            print("Overpass", host, e, file=sys.stderr)
    raise RuntimeError("Overpass nie odpowiada")


def wikidata_coa(qids):
    res = {}
    for i in range(0, len(qids), 200):
        vals = " ".join("wd:" + q for q in qids[i:i + 200])
        q = "SELECT ?item ?coa WHERE { VALUES ?item {" + vals + "} ?item wdt:P94 ?coa . }"
        j = json.loads(http("https://query.wikidata.org/sparql", ("format=json&query=" + urllib.parse.quote(q)).encode()))
        for b in j["results"]["bindings"]:
            qid = b["item"]["value"].rsplit("/", 1)[1]
            f = urllib.parse.unquote(b["coa"]["value"].split("/Special:FilePath/")[1])
            res.setdefault(qid, f)
        time.sleep(1)
    return res


def commons_thumbs(files):
    """nazwa pliku -> adres miniatury (tylko pliki, które istnieją)"""
    res = {}
    files = list(dict.fromkeys(files))
    for i in range(0, len(files), 50):
        chunk = files[i:i + 50]
        url = ("https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url"
               "&iiurlwidth=%d&redirects=1&titles=" % WIDTH) + urllib.parse.quote("|".join("File:" + f for f in chunk))
        j = json.loads(http(url))
        q = j.get("query", {})
        back = {}
        for n in q.get("normalized", []) + q.get("redirects", []):
            back[n["to"]] = back.get(n["from"], n["from"])
        for p in q.get("pages", {}).values():
            if "imageinfo" not in p:
                continue
            orig = back.get(p["title"], p["title"])
            orig = back.get(orig, orig)
            ii = p["imageinfo"][0]
            res[orig[5:]] = ii.get("thumburl") or ii["url"]
        time.sleep(0.5)
    return res


def main():
    from PIL import Image
    os.makedirs(OUT_DIR, exist_ok=True)
    cs = cities()
    print("miast z OSM:", len(cs))
    wd = wikidata_coa([c["qid"] for c in cs if c["qid"]])
    print("herbów z Wikidata:", len(wd))
    for c in cs:
        c["file"] = wd.get(c["qid"]) or "POL " + c["n"] + " COA.svg"
        c["src"] = "wd" if c["qid"] in wd else "konwencja"
    thumbs = commons_thumbs([c["file"] for c in cs])
    print("plików istniejących na Commons:", len(thumbs))

    # jedna pozycja na nazwę: największe miasto
    best = {}
    for c in cs:
        if c["file"] not in thumbs:
            continue
        k = slug(c["n"])
        if k not in best or c["pop"] > best[k]["pop"]:
            best[k] = c

    out = []
    for k, c in sorted(best.items()):
        path = "%s/%s.webp" % (OUT_DIR, k)
        if not os.path.exists(path):
            try:
                raw = http(thumbs[c["file"]], timeout=60)
                im = Image.open(io.BytesIO(raw)).convert("RGBA")
                im.thumbnail((WIDTH, WIDTH * 1.4))
                im.save(path, "WEBP", quality=82, method=6)
                time.sleep(0.15)
            except Exception as e:
                print("pomijam", c["n"], e, file=sys.stderr)
                continue
        out.append({"n": c["n"], "lat": c["lat"], "lon": c["lon"], "pop": c["pop"], "img": path, "plik": c["file"]})

    keep = {o["img"] for o in out}
    for f in os.listdir(OUT_DIR):
        if OUT_DIR + "/" + f not in keep:
            os.remove(os.path.join(OUT_DIR, f))
    out.sort(key=lambda o: -o["pop"])
    with open("herby.json", "w", encoding="utf-8") as fh:
        json.dump({"zbudowano": time.strftime("%Y-%m-%d"), "miasta": out}, fh, ensure_ascii=False, separators=(",", ":"))
    print("zapisano herbów:", len(out))
    if len(out) < 300:
        raise SystemExit("za mało herbów, coś poszło nie tak")


if __name__ == "__main__":
    main()
