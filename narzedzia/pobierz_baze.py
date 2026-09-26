"""Buduje baza.json dla encyklopedii: województwa, powiaty i gminy z kodami TERYT,
liczbą ludności, powierzchnią, herbem i odnośnikiem do polskiej Wikipedii (dane z Wikidata).

Nazwy i kody bierzemy z granic PRG, które już są w repozytorium (powiaty.topojson, gminy.topojson),
więc encyklopedia zawsze zgadza się z mapami w grach. Uruchamiane przez GitHub Actions.
"""
import json, re, sys, time, unicodedata, urllib.parse, urllib.request

UA = "PolskoZnawca/1.0 (https://github.com/XOOGKlastry/Miasta-pl; encyklopedia do gry edukacyjnej)"
WOJ = {"02": "dolnośląskie", "04": "kujawsko-pomorskie", "06": "lubelskie", "08": "lubuskie", "10": "łódzkie",
       "12": "małopolskie", "14": "mazowieckie", "16": "opolskie", "18": "podkarpackie", "20": "podlaskie",
       "22": "pomorskie", "24": "śląskie", "26": "świętokrzyskie", "28": "warmińsko-mazurskie",
       "30": "wielkopolskie", "32": "zachodniopomorskie"}
TYP = {"1": "gmina miejska", "2": "gmina wiejska", "3": "gmina miejsko-wiejska"}


def http(url, data=None, tries=4, timeout=180):
    for i in range(tries):
        try:
            req = urllib.request.Request(url, data=data, headers={"User-Agent": UA, "Accept": "application/sparql-results+json"})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.read()
        except Exception as e:
            print("  ponawiam", url[:70], e, file=sys.stderr)
            time.sleep(8 * (i + 1))
    raise RuntimeError("nie udało się: " + url[:100])


def sparql(q):
    j = json.loads(http("https://query.wikidata.org/sparql", ("format=json&query=" + urllib.parse.quote(q)).encode()))
    return j["results"]["bindings"]


def norm(s):
    s = unicodedata.normalize("NFKD", s.replace("ł", "l").replace("Ł", "L"))
    return re.sub(r"[^a-z0-9]", "", "".join(c for c in s if not unicodedata.combining(c)).lower())


def v(b, k, typ=str):
    if k not in b:
        return None
    x = b[k]["value"]
    if typ is float:
        try:
            return round(float(x), 2)
        except ValueError:
            return None
    if typ is int:
        try:
            return int(float(x))
        except ValueError:
            return None
    return x


def plik(url):
    return urllib.parse.unquote(url.split("/Special:FilePath/")[1]) if url and "/Special:FilePath/" in url else None


def jednostki(topo, nazwa_obiektu=None):
    t = json.load(open(topo, encoding="utf-8"))
    obj = t["objects"].get(nazwa_obiektu) if nazwa_obiektu else None
    if not obj:
        obj = max(t["objects"].values(), key=lambda o: len(o.get("geometries", [])))
    return [g["properties"] for g in obj["geometries"] if g.get("properties")]


POLA = ("OPTIONAL{?item wdt:P1082 ?pop} OPTIONAL{?item wdt:P2046 ?pow} OPTIONAL{?item wdt:P94 ?herb} "
        "OPTIONAL{?item wdt:P625 ?wsp} OPTIONAL{?art schema:about ?item; schema:isPartOf <https://pl.wikipedia.org/>} ")


def dane(b):
    wsp = v(b, "wsp")
    m = re.match(r"Point\(([-\d.]+) ([-\d.]+)\)", wsp or "")
    return {"qid": b["item"]["value"].rsplit("/", 1)[1], "ludnosc": v(b, "pop", int), "powierzchnia": v(b, "pow", float),
            "herb": plik(v(b, "herb")), "wiki": v(b, "art"),
            "lon": round(float(m.group(1)), 4) if m else None, "lat": round(float(m.group(2)), 4) if m else None}


def main():
    pw = jednostki("powiaty.topojson", "powiaty")
    gm = [g for g in jednostki("gminy.topojson") if str(g.get("k", ""))[-1:] in "123"]
    print("powiatów", len(pw), "gmin", len(gm))

    # gminy po kodzie TERYT (P1653)
    wd_gm = {}
    for b in sparql("SELECT ?item ?kod ?pop ?pow ?herb ?wsp ?art WHERE { ?item wdt:P1653 ?kod . " + POLA + "}"):
        kod = re.sub(r"\D", "", b["kod"]["value"])
        if len(kod) == 7 and kod not in wd_gm:
            wd_gm[kod] = dane(b)
    print("Wikidata: jednostek z kodem TERYT", len(wd_gm))

    # powiaty i miasta na prawach powiatu, dopasowane po nazwie i województwie
    wd_pw = {}
    for b in sparql("SELECT ?item ?itemLabel ?wojLabel ?pop ?pow ?herb ?wsp ?art WHERE { "
                    "VALUES ?t {wd:Q247073 wd:Q925381} ?item wdt:P31 ?t; wdt:P131 ?woj . ?woj wdt:P31 wd:Q150093 . " + POLA +
                    'SERVICE wikibase:label { bd:serviceParam wikibase:language "pl". } }'):
        klucz = norm(b["itemLabel"]["value"].replace("powiat ", "")) + "|" + norm(b["wojLabel"]["value"].replace("województwo ", ""))
        wd_pw.setdefault(klucz, dane(b))
    wd_woj = {}
    for b in sparql("SELECT ?item ?itemLabel ?pop ?pow ?herb ?wsp ?art WHERE { ?item wdt:P31 wd:Q150093 . " + POLA +
                    'SERVICE wikibase:label { bd:serviceParam wikibase:language "pl". } }'):
        wd_woj.setdefault(norm(b["itemLabel"]["value"].replace("województwo ", "")), dane(b))

    woj = []
    for k, n in sorted(WOJ.items(), key=lambda x: x[1]):
        d = wd_woj.get(norm(n), {})
        woj.append({"k": k, "n": n, **d})
    pow_ = []
    for p in pw:
        k, n = p["k"], p["n"]
        miasto = int(k[2:4]) >= 60
        d = wd_pw.get(norm(n) + "|" + norm(WOJ[k[:2]]), {})
        pow_.append({"k": k, "n": n, "typ": "miasto na prawach powiatu" if miasto else "powiat", **d})
    gm_ = []
    for g in gm:
        k, n = str(g["k"]), g["n"]
        d = wd_gm.get(k, {})
        gm_.append({"k": k, "n": n, "typ": TYP.get(k[-1], "gmina"), **d})
    baza = {"zbudowano": time.strftime("%Y-%m-%d"), "wojewodztwa": woj, "powiaty": pow_, "gminy": gm_}
    with open("baza.json", "w", encoding="utf-8") as fh:
        json.dump(baza, fh, ensure_ascii=False, separators=(",", ":"))
    ok = lambda l: sum(1 for x in l if x.get("wiki"))
    print("zapisano: województw", len(woj), "(wiki", ok(woj), ") powiatów", len(pow_), "(wiki", ok(pow_),
          ") gmin", len(gm_), "(wiki", ok(gm_), ")")


if __name__ == "__main__":
    main()
