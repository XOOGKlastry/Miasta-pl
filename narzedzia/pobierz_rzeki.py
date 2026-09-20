"""Buduje rzeki.json: miasto -> rzeka, na podstawie OpenStreetMap i Wikidata (P206).

Uruchamiane przez GitHub Actions, bo telefony nie zawsze dosięgają Wikidata.
"""
import json, re, sys, time, urllib.parse, urllib.request

UA = "ZnaszPolske/1.0 (https://github.com/XOOGKlastry/Miasta-pl; gra edukacyjna)"


def http(url, data=None, tries=4, timeout=120):
    for i in range(tries):
        try:
            req = urllib.request.Request(url, data=data, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.read()
        except Exception as e:
            print("  ponawiam", url[:80], e, file=sys.stderr)
            time.sleep(5 * (i + 1))
    raise RuntimeError("nie udało się: " + url[:120])


def cities():
    q = '[out:json][timeout:180];area["ISO3166-1"="PL"][admin_level=2]->.pl;(node["place"~"^(city|town)$"](area.pl););out body;'
    for host in ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"]:
        try:
            j = json.loads(http(host, ("data=" + urllib.parse.quote(q)).encode()))
            out = []
            for e in j["elements"]:
                t = e.get("tags", {})
                if not t.get("name") or not re.fullmatch(r"Q\d+", t.get("wikidata", "")):
                    continue
                out.append({"n": t["name"].strip(), "lat": round(e["lat"], 4), "lon": round(e["lon"], 4),
                            "pop": int(re.sub(r"\D", "", t.get("population", "0")) or 0), "qid": t["wikidata"]})
            if len(out) > 800:
                return out
        except Exception as e:
            print("Overpass", host, e, file=sys.stderr)
    raise RuntimeError("Overpass nie odpowiada")


def rivers(qids):
    """qid miasta -> nazwa rzeki (P206, tylko cieki: rzeka Q4022 lub jej podklasy)"""
    res = {}
    for i in range(0, len(qids), 150):
        vals = " ".join("wd:" + q for q in qids[i:i + 150])
        q = ("SELECT ?item ?rzekaLabel WHERE { VALUES ?item {" + vals + "} "
             "?item wdt:P206 ?rzeka . ?rzeka wdt:P31/wdt:P279* wd:Q4022 . "
             'SERVICE wikibase:label { bd:serviceParam wikibase:language "pl". } }')
        j = json.loads(http("https://query.wikidata.org/sparql", ("format=json&query=" + urllib.parse.quote(q)).encode()))
        for b in j["results"]["bindings"]:
            qid = b["item"]["value"].rsplit("/", 1)[1]
            name = b["rzekaLabel"]["value"]
            if re.fullmatch(r"Q\d+", name):
                continue
            res.setdefault(qid, name)
        time.sleep(1)
    return res


def main():
    cs = cities()
    print("miast z OSM:", len(cs))
    riv = rivers([c["qid"] for c in cs])
    print("miast z rzeką:", len(riv))
    best = {}
    for c in cs:
        r = riv.get(c["qid"])
        if not r:
            continue
        key = c["n"].lower()
        if key not in best or c["pop"] > best[key]["pop"]:
            best[key] = {"n": c["n"], "lat": c["lat"], "lon": c["lon"], "pop": c["pop"], "rzeka": r}
    out = sorted(best.values(), key=lambda c: -c["pop"])
    with open("rzeki.json", "w", encoding="utf-8") as fh:
        json.dump({"zbudowano": time.strftime("%Y-%m-%d"), "miasta": out}, fh, ensure_ascii=False, separators=(",", ":"))
    print("zapisano:", len(out))
    if len(out) < 200:
        raise SystemExit("za mało danych, coś poszło nie tak")


if __name__ == "__main__":
    main()
