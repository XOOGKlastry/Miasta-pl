"""Zdjęcia do gry „Co to za miasto?”: kandydaci do przeglądu i wybrane zdjęcia do gry.

Dwa pliki wynikowe:
  kandydaci.json  wszystkie sensowne zdjęcia z Commons dla miast od 5 tys. mieszkańców,
                  do przejrzenia w przeglad.html (nic nie jest pobierane, tylko miniatury z Commons)
  miejsca.json    tylko zdjęcia zatwierdzone w narzedzia/zdjecia-wybor.json,
                  pobrane lokalnie do katalogu miejsca/

Pliki odrzucone w narzedzia/zdjecia-wybor.json nigdy nie trafiają ani do gry, ani do kandydatów.

Dla miast z OpenStreetMap (z tagiem wikidata) bierze z Wikidata zdjęcie główne (P18)
i baner Wikipodróży (P948), sprawdza je w Wikimedia Commons, pobiera autora i licencję
i zapisuje lokalnie jako WebP. Uruchamiane przez GitHub Actions.
"""
import html, io, json, os, re, sys, time, unicodedata, urllib.parse, urllib.request

UA = "ZnaszPolske/1.0 (https://github.com/XOOGKlastry/Miasta-pl; gra edukacyjna)"
OUT = "miejsca"
MIN_POP = 5000
MIN_KANDYDACI = 14   # najwyżej tylu kandydatów na miasto
WYBOR = "narzedzia/zdjecia-wybor.json"   # {"wybrane": {miasto: [pliki]}, "odrzucone": [pliki]}
SZER = 1600          # szerokość zapisanego zdjęcia
MINI = 640           # szerokość miniatury w przeglądzie
MIN_ORYG = 1800      # oryginał musi mieć co najmniej tyle pikseli szerokości
# nazwy plików, które zwykle pokazują charakterystyczne miejsca miasta
DOBRE = ["rynek", "ratusz", "stare miasto", "starego miasta", "old town", "market square", "market", "town hall",
         "zamek", "castle", "katedr", "cathedral", "bazylik", "basilica", "panoram", "plac ", "square", "brama",
         "gate", "fara", "kolegiat", "collegiate", "pałac", "palace", "deptak", "promenad", "starówk", "wieża", "tower"]
# a tych nie chcemy: kolaże, mapy, herby, wydarzenia, przypadkowe ulice
ZLE = ["montage", "montaż", "montaz", "collage", "kolaż", "kolaz", "coa", "herb", "flag", "flaga", "map", "mapa",
       "location", "lokalizac", "powiat", "gmina", "logo", "plakat", "rozdawanie", "wybory", "protest", "koncert",
       "festiwal", "mecz", "stadion", "szkoła", "szkola", "school", "street view", "city view", "ulica ", "street",
       "tablica", "sign", "znak", "bus", "tram", "tramwaj", "pociąg", "train", "samochód", "car ", "portrait", "portret"]


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
        q = ("SELECT ?item ?img ?ban ?lot WHERE { VALUES ?item {" + vals + "} "
             "OPTIONAL{?item wdt:P18 ?img} OPTIONAL{?item wdt:P948 ?ban} OPTIONAL{?item wdt:P8592 ?lot} }")
        j = json.loads(http("https://query.wikidata.org/sparql", ("format=json&query=" + urllib.parse.quote(q)).encode()))
        for b in j["results"]["bindings"]:
            qid = b["item"]["value"].rsplit("/", 1)[1]
            lst = res.setdefault(qid, [])
            for k in ("img", "ban", "lot"):
                if k in b:
                    f = urllib.parse.unquote(b[k]["value"].split("/Special:FilePath/")[1])
                    if f not in lst and not f.lower().endswith((".svg", ".tif", ".tiff")):
                        lst.append(f)
        time.sleep(1)
    return res


def szukaj_commons(miasto):
    """zdjęcia rynku, ratusza i starego miasta z Wikimedia Commons"""
    wyn = []
    for fraza in ("rynek " + miasto, "ratusz " + miasto, miasto + " old town", miasto + " panorama",
                  miasto + " market square", "stare miasto " + miasto):
        url = ("https://commons.wikimedia.org/w/api.php?action=query&format=json&list=search&srnamespace=6"
               "&srlimit=8&srsearch=" + urllib.parse.quote(fraza + " filetype:bitmap"))
        try:
            j = json.loads(http(url, tries=2, timeout=60))
        except Exception:
            continue
        for r in j.get("query", {}).get("search", []):
            t = r["title"][5:]
            if miasto.lower().split()[0][:5] in t.lower() and t not in wyn:
                wyn.append(t)
        time.sleep(0.3)
    return wyn


def ocena(plik, zrodlo, szer):
    n = plik.lower()
    if any(z in n for z in ZLE) or szer < MIN_ORYG or n.endswith((".svg", ".tif", ".tiff", ".gif")):
        return -1
    pkt = {"szukaj": 2, "img": 1, "ban": 1, "lot": 1}.get(zrodlo, 0)
    pkt += 3 * sum(1 for d in DOBRE if d in n)
    return pkt


def czysc(t):
    t = re.sub(r"<[^>]+>", "", t or "")
    return html.unescape(t).strip()[:80]


def info(pliki):
    out = {}
    for i in range(0, len(pliki), 40):
        chunk = pliki[i:i + 40]
        url = ("https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo"
               "&prop=imageinfo|categories&clshow=!hidden&cllimit=max"
               "&iiprop=url|size|extmetadata&iiurlwidth=%d&redirects=1&titles=" % SZER) + urllib.parse.quote("|".join("File:" + f for f in chunk))
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
            kat = " ".join(c["title"] for c in p.get("categories", [])).lower()
            jakosc = ("featured" in kat) * 3 + ("quality images" in kat) * 2 + ("valued images" in kat) * 2
            mini = (ii.get("thumburl") or ii["url"]).replace("/%dpx-" % SZER, "/%dpx-" % MINI)
            out[orig] = {"url": ii.get("thumburl") or ii["url"], "mini": mini, "szer": ii.get("width", 0), "wys": ii.get("height", 0),
                         "jakosc": jakosc, "strona": ii.get("descriptionurl", ""),
                         "autor": czysc(m.get("Artist", {}).get("value")),
                         "licencja": czysc(m.get("LicenseShortName", {}).get("value"))}
        time.sleep(0.5)
    return out


def main():
    import hashlib
    from PIL import Image
    os.makedirs(OUT, exist_ok=True)
    wybor = json.load(open(WYBOR, encoding="utf-8")) if os.path.exists(WYBOR) else {}
    wybrane = wybor.get("wybrane", {})
    odrzucone = set(wybor.get("odrzucone", []))
    if "--tylko-gra" in sys.argv:
        # szybki tryb po zmianie wyboru w panelu admina: miasta z kandydaci.json, metadane tylko wybranych plików
        k = json.load(open("kandydaci.json", encoding="utf-8"))["miasta"]
        cs = [{"n": c["n"], "lat": c["lat"], "lon": c["lon"], "pop": c["pop"], "qid": None} for c in k]
        meta = info(sorted({f for l in wybrane.values() for f in l}))
        gra(cs, wybrane, odrzucone, meta)
        return
    cs = miasta()
    print("miast:", len(cs))
    im = obrazy([c["qid"] for c in cs])
    zrodla = {}
    for q, lst in im.items():
        for f in lst:
            zrodla[(q, f)] = "wikidata"
    for c in cs:
        for f in szukaj_commons(c["n"]):
            lst = im.setdefault(c["qid"], [])
            if f not in lst:
                lst.append(f)
                zrodla[(c["qid"], f)] = "szukaj"
    wszystkie = sorted({f for l in im.values() for f in l} | {f for l in wybrane.values() for f in l})
    meta = info(wszystkie)
    print("zdjęć w Commons:", len(meta))

    # 1) kandydaci do przeglądu
    kand, nazwy = [], set()
    for c in sorted(cs, key=lambda c: -c["pop"]):
        if c["n"].lower() in nazwy:
            continue
        nazwy.add(c["n"].lower())
        lista = []
        for f in im.get(c["qid"], []):
            m = meta.get(f)
            if not m or f in odrzucone:
                continue
            if ocena(f, zrodla.get((c["qid"], f), "wikidata"), m["szer"]) < 0 or m["wys"] > m["szer"] * 1.4 or m["szer"] > m["wys"] * 3.2:
                continue   # za małe, pionowe paski albo bardzo wąskie panoramy
            lista.append({"plik": f, "mini": m["mini"], "szer": m["szer"], "wys": m["wys"], "autor": m["autor"],
                          "licencja": m["licencja"], "strona": m["strona"], "jakosc": m["jakosc"],
                          "zrodlo": zrodla.get((c["qid"], f), "wikidata")})
        lista.sort(key=lambda k: -(k["jakosc"] * 3 + ocena(k["plik"], k["zrodlo"], k["szer"])))
        kand.append({"n": c["n"], "pop": c["pop"], "lat": c["lat"], "lon": c["lon"], "kandydaci": lista[:MIN_KANDYDACI]})
    with open("kandydaci.json", "w", encoding="utf-8") as fh:
        json.dump({"zbudowano": time.strftime("%Y-%m-%d"), "miasta": kand}, fh, ensure_ascii=False, separators=(",", ":"))
    print("kandydaci: miast", len(kand), "zdjęć", sum(len(k["kandydaci"]) for k in kand))

    gra(cs, wybrane, odrzucone, meta)


def gra(cs, wybrane, odrzucone, meta):
    """gra: tylko zdjęcia zatwierdzone przez człowieka"""
    import hashlib
    from PIL import Image
    po_nazwie = {c["n"]: c for c in cs}
    wynik = []
    for nazwa, pliki in wybrane.items():
        c = po_nazwie.get(nazwa)
        if not c:
            print("nie znam miasta", nazwa, file=sys.stderr)
            continue
        zdj = []
        for f in pliki:
            m = meta.get(f)
            if not m or f in odrzucone:
                print("brak pliku w Commons", nazwa, f, file=sys.stderr)
                continue
            path = "%s/%s-%s.webp" % (OUT, slug(nazwa), hashlib.md5(f.encode()).hexdigest()[:6])
            if not os.path.exists(path):
                try:
                    obraz = Image.open(io.BytesIO(http(m["url"], timeout=90))).convert("RGB")
                    obraz.thumbnail((SZER, SZER))
                    obraz.save(path, "WEBP", quality=80, method=6)
                    time.sleep(0.2)
                except Exception as e:
                    print("pomijam", nazwa, f, e, file=sys.stderr)
                    continue
            zdj.append({"img": path, "plik": f, "autor": m["autor"], "licencja": m["licencja"]})
        if zdj:
            wynik.append({"n": nazwa, "lat": c["lat"], "lon": c["lon"], "pop": c["pop"], "zdjecia": zdj})
    wynik.sort(key=lambda w: -w["pop"])
    uzyte = {z["img"] for w in wynik for z in w["zdjecia"]}
    for f in os.listdir(OUT):
        if OUT + "/" + f not in uzyte:
            os.remove(os.path.join(OUT, f))
    with open("miejsca.json", "w", encoding="utf-8") as fh:
        json.dump({"zbudowano": time.strftime("%Y-%m-%d"), "miasta": wynik}, fh, ensure_ascii=False, separators=(",", ":"))
    print("gra: miast ze zdjęciami", len(wynik), "zdjęć", len(uzyte))


if __name__ == "__main__":
    main()
