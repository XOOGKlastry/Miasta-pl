"""Odkrycia: surowe dane o znanych ludziach, zabytkach, miejscach i wydarzeniach z Wikidanych
oraz o autostradach i drogach ekspresowych z OpenStreetMap.

Wynik: narzedzia/odkrycia-surowe.json (bez przypisania do gmin; gminę i powiat dopisuje
narzedzia/odkrycia_przetworz.cjs po współrzędnych, na granicach z gminy.topojson i powiaty.topojson).

Kategorie:
  ludzie     osoby urodzone w miejscowościach dzisiejszej Polski, z artykułem w polskiej Wikipedii
             i co najmniej MIN_SL_LUDZIE wersjami językowymi (miara rozpoznawalności)
  miejsca    UNESCO, Pomniki Historii, zamki, pałace, katedry i bazyliki, muzea, parki narodowe,
             szczyty, jeziora, latarnie morskie i inne (z progiem rozpoznawalności dla każdej klasy)
  wydarzenia bitwy i oblężenia ze współrzędnymi na terenie Polski
  drogi      odcinki autostrad i dróg ekspresowych (numer, środek odcinka) z OSM
Uruchamiane przez GitHub Actions (.github/workflows/odkrycia.yml).
"""
import json, sys, time, urllib.error, urllib.parse, urllib.request

UA = "PolskoZnawca/1.0 (https://github.com/XOOGKlastry/Miasta-pl; gra edukacyjna)"
WYNIK = "narzedzia/odkrycia-surowe.json"
MIN_SL_LUDZIE = 11
BBOX = (14.0, 48.9, 24.2, 55.0)   # prostokąt wokół Polski (lon, lat); dokładnie przycina skrypt w node


def http(url, data=None, tries=3, timeout=180, accept="application/sparql-results+json"):
    for i in range(tries):
        try:
            req = urllib.request.Request(url, data=data, headers={"User-Agent": UA, "Accept": accept})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.read().decode("utf-8")
        except Exception as e:
            print("  błąd", e, "próba", i + 1, flush=True)
            time.sleep(10 * (i + 1))
    raise RuntimeError("nie udało się: " + url[:120])


def sparql(q):
    j = json.loads(http("https://query.wikidata.org/sparql", ("format=json&query=" + urllib.parse.quote(q)).encode()))
    time.sleep(2)
    return [{k: v["value"] for k, v in b.items()} for b in j["results"]["bindings"]]


def qid(u):
    return u.rsplit("/", 1)[-1] if u else None


def wsp(s):
    # "Point(21.0 52.2)" -> [lon, lat]
    if not s or not s.startswith("Point("):
        return None
    lon, lat = s[6:-1].split()
    return [round(float(lon), 5), round(float(lat), 5)]


def plik(u):
    return urllib.parse.unquote(u.rsplit("/", 1)[-1]) if u else None


def rok(s):
    try:
        return int(s[:5]) if s.startswith("-") else int(s[:4])
    except Exception:
        return None


# ---------- ludzie ----------
def ludzie():
    wynik = {}
    # przedziały rozpoznawalności, żeby pojedyncze zapytanie nie przekroczyło limitu czasu
    przedzialy = [(MIN_SL_LUDZIE, 13), (13, 15), (15, 17), (17, 20), (20, 25), (25, 30), (30, 50), (50, 100), (100, 100000)]
    while przedzialy:
        od, do = przedzialy.pop(0)
        q = """SELECT ?p ?pLabel ?opis ?ur ?zm ?m ?mLabel ?wsp ?img ?sl ?art WHERE {
          ?p wdt:P31 wd:Q5; wdt:P19 ?m; wikibase:sitelinks ?sl.
          FILTER(?sl >= %d && ?sl < %d)
          ?m wdt:P17 wd:Q36; wdt:P625 ?wsp.
          ?art schema:about ?p; schema:isPartOf <https://pl.wikipedia.org/>.
          OPTIONAL { ?p wdt:P569 ?ur } OPTIONAL { ?p wdt:P570 ?zm } OPTIONAL { ?p wdt:P18 ?img }
          OPTIONAL { ?p schema:description ?opis FILTER(lang(?opis) = "pl") }
          SERVICE wikibase:label { bd:serviceParam wikibase:language "pl,en". }
        }""" % (od, do)
        print("ludzie: wersje językowe", od, "do", do, flush=True)
        try:
            wiersze = sparql(q)
        except Exception as e:
            # zbyt duże zapytanie: dzielimy przedział na pół
            if do - od > 1:
                pol = (od + min(do, od + 200)) // 2
                przedzialy[:0] = [(od, pol), (pol, do)]
                print("  dzielę przedział", od, do, flush=True)
                continue
            print("  pominięte:", e, flush=True)
            continue
        for b in wiersze:
            k = qid(b["p"])
            w = wynik.get(k)
            if w:   # kilka miejsc urodzenia albo kilka dat: zostaje pierwsze, reszta do listy wątpliwych
                if qid(b["m"]) != w["m"] and qid(b["m"]) not in w.get("inne_m", []):
                    w.setdefault("inne_m", []).append(qid(b["m"]))
                continue
            wynik[k] = {"q": k, "n": b.get("pLabel"), "opis": b.get("opis"), "ur": rok(b.get("ur", "")), "zm": rok(b.get("zm", "")),
                        "m": qid(b["m"]), "mn": b.get("mLabel"), "wsp": wsp(b.get("wsp")), "img": plik(b.get("img")),
                        "sl": int(b["sl"]), "art": urllib.parse.unquote(b["art"].rsplit("/", 1)[-1])}
        print("  razem", len(wynik), flush=True)
    # zawody i obywatelstwo partiami
    ks = list(wynik)
    for i in range(0, len(ks), 300):
        vals = " ".join("wd:" + k for k in ks[i:i + 300])
        # zawody, obywatelstwo i znaczniki wykluczenia: NSDAP (P102), SS i Waffen-SS (P463, P241), wyrok (P1399)
        q = """SELECT ?p (GROUP_CONCAT(DISTINCT ?zl; separator="|") AS ?zaw) (GROUP_CONCAT(DISTINCT ?ob; separator="|") AS ?obyw)
          (SAMPLE(?nsdap) AS ?ns) (SAMPLE(?ss) AS ?s) (SAMPLE(?wyr) AS ?w) WHERE {
          VALUES ?p { %s }
          OPTIONAL { ?p wdt:P106 ?z. ?z rdfs:label ?zl FILTER(lang(?zl) = "pl") }
          OPTIONAL { ?p wdt:P27 ?o. BIND(STRAFTER(STR(?o), "entity/") AS ?ob) }
          OPTIONAL { ?p wdt:P102 wd:Q7320. BIND(1 AS ?nsdap) }
          OPTIONAL { VALUES ?ssq { wd:Q153687 wd:Q153695 wd:Q154067 } { ?p wdt:P463 ?ssq } UNION { ?p wdt:P241 ?ssq } BIND(1 AS ?ss) }
          OPTIONAL { ?p wdt:P1399 ?wyrok. BIND(STRAFTER(STR(?wyrok), "entity/") AS ?wyr) }
        } GROUP BY ?p""" % vals
        for b in sparql(q):
            w = wynik[qid(b["p"])]
            w["zaw"] = [x for x in (b.get("zaw") or "").split("|") if x][:6]
            w["obyw"] = [x for x in (b.get("obyw") or "").split("|") if x][:4]
            if b.get("ns") or b.get("s"):
                w["nazizm"] = True
            if b.get("w"):
                w["wyrok"] = b["w"]
        print("  zawody", min(i + 300, len(ks)), "/", len(ks), flush=True)
    return list(wynik.values())


# ---------- miejsca ----------
# (rodzaj, warunek SPARQL na ?x, minimalna liczba wersji językowych)
KLASY = [
    ("unesco", "?x wdt:P1435 wd:Q9259.", 0),
    ("pomnik_historii", "?x wdt:P1435 ?d. ?d rdfs:label \"pomnik historii\"@pl.", 0),
    ("zamek", "?x wdt:P31/wdt:P279* wd:Q23413.", 4),
    ("palac", "?x wdt:P31/wdt:P279* wd:Q16560.", 6),
    ("katedra", "?x wdt:P31/wdt:P279* wd:Q2977.", 4),
    ("bazylika", "?x wdt:P31/wdt:P279* wd:Q163687.", 6),
    ("klasztor", "?x wdt:P31/wdt:P279* wd:Q44613.", 8),
    ("muzeum", "?x wdt:P31/wdt:P279* wd:Q33506.", 12),
    ("park_narodowy", "?x wdt:P31/wdt:P279* wd:Q46169.", 0),
    ("jaskinia", "?x wdt:P31/wdt:P279* wd:Q35509.", 6),
    ("wodospad", "?x wdt:P31/wdt:P279* wd:Q34038.", 5),
    ("wyspa", "?x wdt:P31/wdt:P279* wd:Q23442.", 10),
    ("pustynia", "?x wdt:P31/wdt:P279* wd:Q8514.", 3),
    ("szczyt", "?x wdt:P31/wdt:P279* wd:Q8502.", 12),
    ("jezioro", "?x wdt:P31/wdt:P279* wd:Q23397.", 15),
    ("latarnia", "?x wdt:P31/wdt:P279* wd:Q39715.", 4),
    ("most", "?x wdt:P31/wdt:P279* wd:Q12280.", 10),
    ("pomnik", "?x wdt:P31/wdt:P279* wd:Q4989906.", 12),
    ("skansen", "?x wdt:P31/wdt:P279* wd:Q588140.", 5),
    ("kopalnia", "?x wdt:P31/wdt:P279* wd:Q820477.", 8),
    ("ratusz", "?x wdt:P31/wdt:P279* wd:Q25550691.", 8),
    ("wieza", "?x wdt:P31/wdt:P279* wd:Q12518.", 12),
    ("stadion", "?x wdt:P31/wdt:P279* wd:Q483110.", 15),
    ("oboz", "?x wdt:P31/wdt:P279* wd:Q152081.", 10),
    # bliżej gmin: obiekty, które są w wielu gminach wiejskich
    ("sanktuarium", "?x wdt:P31 ?d. ?d rdfs:label \"sanktuarium\"@pl.", 2),
    ("dwor", "?x wdt:P31/wdt:P279* wd:Q879050.", 3),
    ("kosciol_drewniany", "?x wdt:P31 ?d. ?d rdfs:label \"kościół drewniany\"@pl.", 2),
    ("cerkiew", "?x wdt:P31/wdt:P279* wd:Q2031836.", 3),
    ("ruiny_zamku", "?x wdt:P31/wdt:P279* wd:Q17715832.", 2),
    ("rezerwat", "?x wdt:P31 wd:Q179049; wdt:P17 wd:Q36. FILTER EXISTS { ?a schema:about ?x; schema:isPartOf <https://pl.wikipedia.org/> }", 2),
    ("park_krajobrazowy", "?x wdt:P31 ?d. ?d rdfs:label \"park krajobrazowy\"@pl.", 1),
    ("uzdrowisko", "?x wdt:P31 ?d. ?d rdfs:label \"uzdrowisko\"@pl.", 1),
    ("pomnik_przyrody", "?x wdt:P31/wdt:P279* wd:Q23790.", 2),
    ("palac2", "?x wdt:P31/wdt:P279* wd:Q16560.", 3),
    ("zamek2", "?x wdt:P31/wdt:P279* wd:Q23413.", 2),
    ("muzeum2", "?x wdt:P31/wdt:P279* wd:Q33506.", 5),
    ("jezioro2", "?x wdt:P31/wdt:P279* wd:Q23397.", 8),
    ("szczyt2", "?x wdt:P31/wdt:P279* wd:Q8502.", 6),
    ("zabytek_techniki", "?x wdt:P31/wdt:P279* wd:Q15243209.", 3),
]


def miejsca():
    wynik = {}
    for rodzaj, war, prog in KLASY:
        q = """SELECT ?x ?xLabel ?opis ?wsp ?img ?sl ?art ?inc WHERE {
          %s
          ?x wdt:P17 wd:Q36; wdt:P625 ?wsp; wikibase:sitelinks ?sl.
          FILTER(?sl >= %d)
          OPTIONAL { ?art schema:about ?x; schema:isPartOf <https://pl.wikipedia.org/>. }
          OPTIONAL { ?x wdt:P18 ?img } OPTIONAL { ?x wdt:P571 ?inc }
          OPTIONAL { ?x schema:description ?opis FILTER(lang(?opis) = "pl") }
          SERVICE wikibase:label { bd:serviceParam wikibase:language "pl,en". }
        }""" % (war, prog)
        print("miejsca:", rodzaj, flush=True)
        try:
            wiersze = sparql(q)
        except Exception as e:
            print("  pominięte:", e, flush=True)
            continue
        n = 0
        for b in wiersze:
            k = qid(b["x"])
            w = wynik.get(k)
            if w:
                if rodzaj not in w["rodzaje"]:
                    w["rodzaje"].append(rodzaj)
                continue
            n += 1
            wynik[k] = {"q": k, "n": b.get("xLabel"), "opis": b.get("opis"), "wsp": wsp(b.get("wsp")), "img": plik(b.get("img")),
                        "sl": int(b["sl"]), "art": urllib.parse.unquote(b["art"].rsplit("/", 1)[-1]) if b.get("art") else None,
                        "rok": rok(b.get("inc", "")), "rodzaje": [rodzaj]}
        print("  nowych", n, "razem", len(wynik), flush=True)
    return list(wynik.values())


# ---------- wydarzenia ----------
def wydarzenia():
    q = """SELECT ?x ?xLabel ?opis ?wsp ?data ?pocz ?sl ?art ?img WHERE {
      VALUES ?klasa { wd:Q178561 wd:Q188055 wd:Q1261499 wd:Q645883 wd:Q831663 }
      ?x wdt:P31 ?klasa; wdt:P625 ?wsp; wikibase:sitelinks ?sl.
      FILTER(?sl >= 6)
      ?art schema:about ?x; schema:isPartOf <https://pl.wikipedia.org/>.
      BIND(geof:longitude(?wsp) AS ?lon) BIND(geof:latitude(?wsp) AS ?lat)
      FILTER(?lon > %f && ?lon < %f && ?lat > %f && ?lat < %f)
      OPTIONAL { ?x wdt:P585 ?data } OPTIONAL { ?x wdt:P580 ?pocz } OPTIONAL { ?x wdt:P18 ?img }
      OPTIONAL { ?x schema:description ?opis FILTER(lang(?opis) = "pl") }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "pl,en". }
    }""" % (BBOX[0], BBOX[2], BBOX[1], BBOX[3])
    print("wydarzenia: bitwy i oblężenia", flush=True)
    wynik = {}
    for b in sparql(q):
        k = qid(b["x"])
        if k in wynik:
            continue
        wynik[k] = {"q": k, "n": b.get("xLabel"), "opis": b.get("opis"), "wsp": wsp(b.get("wsp")), "sl": int(b["sl"]),
                    "rok": rok(b.get("data") or b.get("pocz") or ""), "img": plik(b.get("img")),
                    "art": urllib.parse.unquote(b["art"].rsplit("/", 1)[-1])}
    print("  razem", len(wynik), flush=True)
    return list(wynik.values())


# ---------- drogi (OSM) ----------
def drogi():
    q = """[out:json][timeout:900];
    area["ISO3166-1"="PL"][admin_level=2]->.pl;
    way["highway"~"^(motorway|trunk)$"]["ref"~"^[AS] ?[0-9]"](area.pl);
    out tags center;"""
    print("drogi: autostrady i ekspresowe z OSM", flush=True)
    for serwer in ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"]:
        try:
            j = json.loads(http(serwer, ("data=" + urllib.parse.quote(q)).encode(), tries=3, timeout=1000, accept="application/json"))
            break
        except Exception as e:
            print("  serwer", serwer, "nie odpowiada:", e, flush=True)
            j = None
    if not j:
        return []
    out = []
    for e in j.get("elements", []):
        c, t = e.get("center"), e.get("tags", {})
        if not c:
            continue
        for ref in t.get("ref", "").replace(" ", "").split(";"):
            if ref[:1] in "AS":
                out.append({"ref": ref, "wsp": [round(c["lon"], 4), round(c["lat"], 4)], "nazwa": t.get("name"), "typ": t.get("highway")})
    print("  odcinków", len(out), flush=True)
    return out


# ---------- popularność w Polsce: odsłony artykułu w polskiej Wikipedii z ostatnich 12 pełnych miesięcy ----------
def odslony(lista):
    """Suma odsłon z 12 pełnych miesięcy; dwa wątki, po odmowie (429) dłuższa przerwa, błąd = brak danych."""
    from concurrent.futures import ThreadPoolExecutor
    teraz = time.gmtime()
    do = "%04d%02d01" % (teraz.tm_year, teraz.tm_mon)
    od = "%04d%02d01" % (teraz.tm_year - 1, teraz.tm_mon)
    bledy = [0]

    def jeden(o):
        if not o.get("art"):
            return
        url = ("https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/pl.wikipedia/all-access/user/"
               + urllib.parse.quote(o["art"].replace(" ", "_"), safe="") + "/monthly/" + od + "/" + do)
        for proba in range(5):
            time.sleep(0.4)   # najwyżej ok. 5 zapytań na sekundę przy dwóch wątkach
            try:
                req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
                with urllib.request.urlopen(req, timeout=20) as r:
                    j = json.loads(r.read().decode("utf-8"))
                o["odsl"] = sum(x["views"] for x in j.get("items", []))
                return
            except urllib.error.HTTPError as e:
                if e.code == 404:   # artykuł bez odsłon w tym okresie
                    o["odsl"] = 0
                    return
                time.sleep(5 * (proba + 1) if e.code == 429 else 1)
            except Exception:
                time.sleep(1 + proba)
        bledy[0] += 1

    start = time.time()
    with ThreadPoolExecutor(max_workers=2) as ex:
        for n, _ in enumerate(ex.map(jeden, lista), 1):
            if n % 500 == 0:
                print("  odsłony", n, "/", len(lista), "błędów", bledy[0], round(time.time() - start), "s", flush=True)
    print("  odsłony gotowe, błędów", bledy[0], flush=True)


def main():
    dane = {"zbudowano": time.strftime("%Y-%m-%d"), "zrodla": {"wikidane": "https://www.wikidata.org (CC0)", "osm": "© OpenStreetMap (ODbL)"}}
    try:   # poprzedni wynik: kategoria, której nie uda się pobrać, zostaje ze starego pliku
        with open(WYNIK, encoding="utf-8") as fp:
            stare = json.load(fp)
    except Exception:
        stare = {}
    for nazwa, f in [("ludzie", ludzie), ("miejsca", miejsca), ("wydarzenia", wydarzenia), ("drogi", drogi)]:
        try:
            dane[nazwa] = f()
            if not dane[nazwa] and stare.get(nazwa):
                print("  pusto, zostają stare dane:", nazwa, len(stare[nazwa]), flush=True)
                dane[nazwa] = stare[nazwa]
                continue
            if nazwa != "drogi":
                print("odsłony:", nazwa, flush=True)
                odslony(dane[nazwa])
        except Exception as e:
            print("BŁĄD", nazwa, e, flush=True)
            dane[nazwa] = stare.get(nazwa, [])
        # zapis po każdej kategorii, żeby przerwanie nie zabierało wszystkiego
        with open(WYNIK, "w", encoding="utf-8") as fp:
            json.dump(dane, fp, ensure_ascii=False, separators=(",", ":"))
    print("gotowe:", {k: len(v) for k, v in dane.items() if isinstance(v, list)}, flush=True)


if __name__ == "__main__":
    sys.exit(main())
