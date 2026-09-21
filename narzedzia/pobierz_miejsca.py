"""Buduje miejsca.json i zdjęcia w katalogu miejsca/ do gry „Co to za miasto?”.

Dla miast z OpenStreetMap (z tagiem wikidata) bierze z Wikidata zdjęcie główne (P18)
i baner Wikipodróży (P948), sprawdza je w Wikimedia Commons, pobiera autora i licencję
i zapisuje lokalnie jako WebP. Uruchamiane przez GitHub Actions.
"""
import html, io, json, os, re, sys, time, unicodedata, urllib.parse, urllib.request

UA = "ZnaszPolske/1.0 (https://github.com/XOOGKlastry/Miasta-pl; gra edukacyjna)"
OUT = "miejsca"
MIN_POP = 25000
SZER = 900


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


def miasta():
    q = ('[out:json][timeout:180];area["ISO3166-1"="PL"][admin_level=2]->.pl;'
         '(node["place"~"^(city|town)$"](area.pl););out body;')
    for host in ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"]:
        try:
            j = json.loads(http(host, ("data=" + urllib.parse.quote(q)).encode()))
            out = []
            for e in j["elements"]:
                t = e.get("tags", {})
                pop = int(re.sub(r"\D", "", t.get("population", "0")) or 0)
                if t.get("name") and re.fullmatch(r"Q\d+", t.get("wikidata", "")) and pop >= MIN_POP:
                    out.append({"n": t["name"].strip(), "lat": round(e["lat"], 4), "lon": round(e["lon"], 4),
                                "pop": pop, "qid": t["wikidata"]})
            if len(out) > 80:
                return out
        except Exception as e:
            print("Overpass", host, e, file=sys.stderr)
    raise RuntimeError("Overpass nie odpowiada")


def obrazy(qids):
    res = {}
    for i in range(0, len(qids), 100):
        vals = " ".join("wd:" + q for q in qids[i:i + 100])
        q = ("SELECT ?item ?img ?ban WHERE { VALUES ?item {" + vals + "} "
             "OPTIONAL{?item wdt:P18 ?img} OPTIONAL{?item wdt:P948 ?ban} }")
        j = json.loads(http("https://query.wikidata.org/sparql", ("format=json&query=" + urllib.parse.quote(q)).encode()))
        for b in j["results"]["bindings"]:
            qid = b["item"]["value"].rsplit("/", 1)[1]
            lst = res.setdefault(qid, [])
            for k in ("img", "ban"):
                if k in b:
                    f = urllib.parse.unquote(b[k]["value"].split("/Special:FilePath/")[1])
                    if f not in lst and not f.lower().endswith((".svg", ".tif", ".tiff")):
                        lst.append(f)
        time.sleep(1)
    return res


def czysc(t):
    t = re.sub(r"<[^>]+>", "", t or "")
    return html.unescape(t).strip()[:80]


def info(pliki):
    out = {}
    for i in range(0, len(pliki), 40):
        chunk = pliki[i:i + 40]
        url = ("https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo"
               "&iiprop=url|extmetadata&iiurlwidth=%d&redirects=1&titles=" % SZER) + urllib.parse.quote("|".join("File:" + f for f in chunk))
        j = json.loads(http(url))
        q = j.get("query", {})
        back = {}
        for n in q.get("normalized", []) + q.get("redirects", []):
            back[n["to"]] = back.get(n["from"], n["from"])
        for p in q.get("pages", {}).values():
            if "imageinfo" not in p:
                continue
            orig = back.get(p["title"], p["title"])
            orig = back.get(orig, orig)[5:]
            ii = p["imageinfo"][0]
            m = ii.get("extmetadata", {})
            out[orig] = {"url": ii.get("thumburl") or ii["url"],
                         "autor": czysc(m.get("Artist", {}).get("value")),
                         "licencja": czysc(m.get("LicenseShortName", {}).get("value"))}
        time.sleep(0.5)
    return out


def main():
    from PIL import Image
    os.makedirs(OUT, exist_ok=True)
    cs = miasta()
    print("miast:", len(cs))
    im = obrazy([c["qid"] for c in cs])
    wszystkie = sorted({f for l in im.values() for f in l})
    meta = info(wszystkie)
    print("zdjęć w Commons:", len(meta))
    wynik, nazwy = [], set()
    for c in sorted(cs, key=lambda c: -c["pop"]):
        if c["n"].lower() in nazwy:
            continue
        zdj = []
        for n, f in enumerate(im.get(c["qid"], [])[:2]):
            if f not in meta:
                continue
            path = "%s/%s-%d.webp" % (OUT, slug(c["n"]), n + 1)
            if not os.path.exists(path):
                try:
                    obraz = Image.open(io.BytesIO(http(meta[f]["url"], timeout=90))).convert("RGB")
                    obraz.thumbnail((SZER, SZER))
                    obraz.save(path, "WEBP", quality=72, method=6)
                    time.sleep(0.2)
                except Exception as e:
                    print("pomijam", c["n"], f, e, file=sys.stderr)
                    continue
            zdj.append({"img": path, "plik": f, "autor": meta[f]["autor"], "licencja": meta[f]["licencja"]})
        if zdj:
            nazwy.add(c["n"].lower())
            wynik.append({"n": c["n"], "lat": c["lat"], "lon": c["lon"], "pop": c["pop"], "zdjecia": zdj})
    uzyte = {z["img"] for w in wynik for z in w["zdjecia"]}
    for f in os.listdir(OUT):
        if OUT + "/" + f not in uzyte:
            os.remove(os.path.join(OUT, f))
    with open("miejsca.json", "w", encoding="utf-8") as fh:
        json.dump({"zbudowano": time.strftime("%Y-%m-%d"), "miasta": wynik}, fh, ensure_ascii=False, separators=(",", ":"))
    print("zapisano miast ze zdjęciami:", len(wynik), "zdjęć:", len(uzyte))
    if len(wynik) < 30:
        raise SystemExit("za mało zdjęć")


if __name__ == "__main__":
    main()
