"""Herby (logo) klubów piłkarskich do gry „Jaki to klub?”.

Szuka w Wikidata klubów z Polski, które mają logo (P154) w Wikimedia Commons, dopasowuje je
do kluby.json po mieście i nazwie, pobiera miniatury do katalogu kluby/ i dopisuje do kluby.json
pola: herb (ścieżka), herbPlik, herbAutor, herbLicencja. Bierzemy tylko pliki z Commons (wolne licencje
albo znaki zbyt proste na ochronę autorską); logo zespołów to jednak często znaki towarowe,
więc przed publikacją w sklepie trzeba to przejrzeć (panel admina pozwala usunąć herb).
"""
import io, json, os, re, sys, time, unicodedata, urllib.parse, urllib.request

UA = "PolskoZnawca/1.0 (https://github.com/XOOGKlastry/Miasta-pl; gra edukacyjna)"
OUT = "kluby"


def http(url, data=None, tries=4, timeout=120):
    for i in range(tries):
        try:
            req = urllib.request.Request(url, data=data, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.read()
        except Exception as e:
            print("  ponawiam", url[:80], e, file=sys.stderr)
            time.sleep(6 * (i + 1))
    raise RuntimeError("nie udało się: " + url[:100])


def norm(s):
    s = unicodedata.normalize("NFKD", (s or "").replace("ł", "l").replace("Ł", "L"))
    return re.sub(r"[^a-z0-9 ]", " ", "".join(c for c in s if not unicodedata.combining(c)).lower()).strip()


def slug(s):
    return re.sub(r"\s+", "-", norm(s))


def main():
    d = json.load(open("kluby.json", encoding="utf-8"))
    q = """SELECT DISTINCT ?k ?kLabel ?alt ?mLabel ?logo WHERE {
      ?k wdt:P31/wdt:P279* wd:Q476028 ; wdt:P17 wd:Q36 ; wdt:P154 ?logo .
      OPTIONAL { ?k wdt:P159|wdt:P131 ?m . }
      OPTIONAL { ?k skos:altLabel ?alt . FILTER(LANG(?alt) = "pl") }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "pl,en". } }"""
    j = json.loads(http("https://query.wikidata.org/sparql", ("format=json&query=" + urllib.parse.quote(q)).encode()))
    kand = {}
    for b in j["results"]["bindings"]:
        qid = b["k"]["value"].rsplit("/", 1)[1]
        k = kand.setdefault(qid, {"nazwy": set(), "miasta": set(), "logo": None})
        k["nazwy"].add(norm(b["kLabel"]["value"]))
        if "alt" in b:
            k["nazwy"].add(norm(b["alt"]["value"]))
        if "mLabel" in b:
            k["miasta"].add(norm(b["mLabel"]["value"]))
        k["logo"] = urllib.parse.unquote(b["logo"]["value"].split("/Special:FilePath/")[1])
    print("klubów z logo w Wikidata:", len(kand))

    def ocena(klub, k):
        pel, kr, mi = norm(klub["pelna"]), norm(klub["klub"]), norm(klub["miasto"])
        wynik = 0
        if pel in k["nazwy"]:
            wynik += 10
        if any(kr and kr in n for n in k["nazwy"]):
            wynik += 3
        if mi in k["miasta"] or any(mi and mi in n for n in k["nazwy"]):
            wynik += 4
        if any(a in n for n in k["nazwy"] for a in [norm(x) for x in klub.get("aliasy", [])] if a):
            wynik += 2
        return wynik

    os.makedirs(OUT, exist_ok=True)
    from PIL import Image
    pliki = {}
    for klub in d["kluby"]:
        if klub.get("herbRecznie"):
            continue   # ustawione w panelu admina, nie ruszamy
        best = max(kand.values(), key=lambda k: ocena(klub, k), default=None)
        if not best or ocena(klub, best) < 7:
            print("brak logo:", klub["pelna"])
            klub.pop("herb", None)
            continue
        pliki[klub["pelna"]] = best["logo"]
    # licencje i autorzy z Commons
    meta = {}
    nazwy = sorted(set(pliki.values()))
    for i in range(0, len(nazwy), 40):
        url = ("https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=extmetadata|url&iiurlwidth=256&titles="
               + urllib.parse.quote("|".join("File:" + n for n in nazwy[i:i + 40])))
        for p in json.loads(http(url))["query"]["pages"].values():
            ii = (p.get("imageinfo") or [{}])[0]
            em = ii.get("extmetadata", {})
            meta[p["title"][5:]] = {"url": ii.get("thumburl") or ii.get("url"),
                                    "autor": re.sub("<[^>]+>", "", em.get("Artist", {}).get("value", ""))[:80].strip(),
                                    "lic": em.get("LicenseShortName", {}).get("value", "")}
    for klub in d["kluby"]:
        plik = pliki.get(klub["pelna"])
        if not plik:
            continue
        m = meta.get(plik.replace("_", " ")) or meta.get(plik)
        if not m or not m["url"]:
            print("brak pliku w Commons:", plik)
            continue
        sciezka = "%s/%s.webp" % (OUT, slug(klub["pelna"]))
        try:
            obraz = Image.open(io.BytesIO(http(m["url"]))).convert("RGBA")
            obraz.thumbnail((256, 256))
            obraz.save(sciezka, "WEBP", quality=88, method=6)
        except Exception as e:
            print("pomijam", plik, e, file=sys.stderr)
            continue
        klub.update({"herb": sciezka, "herbPlik": plik, "herbAutor": m["autor"], "herbLicencja": m["lic"]})
        time.sleep(0.2)
    with open("kluby.json", "w", encoding="utf-8") as fh:
        json.dump(d, fh, ensure_ascii=False, indent=1)
    print("z herbem:", sum(1 for k in d["kluby"] if k.get("herb")), "z", len(d["kluby"]))


if __name__ == "__main__":
    main()
