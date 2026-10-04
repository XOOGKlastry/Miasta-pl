"""Uzupełnij wskaźniki GUS. Python 3.11+, bez zależności. Nigdy nie wymyśla braków.
Uruchom z katalogu repo: python narzedzia/uzupelnij_karty.py --year 2025
Cache odpowiedzi umożliwia wznowienie po limicie API; docelowy zapis jest atomowy.
"""
from __future__ import annotations
import argparse, concurrent.futures, datetime, hashlib, json, logging, math, pathlib, time, urllib.parse, urllib.request, urllib.error
BASE='https://bdl.stat.gov.pl/api/v1'
VARS={'przyrost_naturalny':450551,'pit_suma':76046,'powierzchnia_ha':1}
ROOT=pathlib.Path(__file__).resolve().parents[1]
CACHE=ROOT.parent/'gus-cache'

def request(path: str) -> dict:
    """Pobierz i zachowaj odpowiedź; respektuj limit, maksymalnie 20 prób."""
    CACHE.mkdir(exist_ok=True)
    target=CACHE/(hashlib.sha256(path.encode()).hexdigest()+'.json')
    if target.exists():return json.loads(target.read_text(encoding='utf-8'))
    for attempt in range(20):
        try:
            req=urllib.request.Request(BASE+path,headers={'User-Agent':'PolskoZnawca/1.0 contact github.com/XOOGKlastry/Miasta-pl','Accept':'application/json'})
            with urllib.request.urlopen(req,timeout=45) as response:data=json.load(response)
            temp=target.with_suffix('.tmp');temp.write_text(json.dumps(data,ensure_ascii=False),encoding='utf-8');temp.replace(target)
            return data
        except urllib.error.HTTPError as exc:
            if exc.code not in (429,500,502,503,504):raise
            logging.warning('HTTP %s, próba %s; zachowano cache',exc.code,attempt+1);time.sleep(min(60,10*(attempt+1)))
        except (TimeoutError,urllib.error.URLError) as exc:
            logging.warning('Połączenie: %s',exc);time.sleep(5)
    raise RuntimeError('Przerwano pobieranie. Uruchom ponownie, aby wznowić z cache.')

def code(uid: str) -> str:
    """Znormalizuj 12-cyfrowy kod jednostki BDL do 7-cyfrowego TERYT."""
    if len(uid)!=12 or not uid.isdigit():raise ValueError('Nieprawidłowy identyfikator BDL')
    return uid[2:4]+uid[7:12]

def download(variable: int, year: int) -> dict[str,float]:
    """Pobierz wszystkie strony jednej cechy, bez zamiany braków na zero."""
    stem=f'/data/by-variable/{variable}?unit-level=6&year={year}&page-size=100&format=json&page='
    first=request(stem+'0');pages=math.ceil(first['totalRecords']/100);out={}
    def consume(data: dict) -> None:
        for unit in data.get('results',[]):
            key=code(unit['id'])
            if key[-1] not in '123':continue
            values=[v for v in unit.get('values',[]) if int(v['year'])==year and isinstance(v.get('val'),(int,float)) and math.isfinite(v['val'])]
            if values:out[key]=values[-1]['val']
    consume(first)
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        for i,data in enumerate(pool.map(lambda p:request(stem+str(p)),range(1,pages)),1):
            consume(data)
            if i%10==0:logging.info('Cecha %s: strona %s/%s',variable,i+1,pages)
    if len(out)<2000:raise ValueError(f'Za małe pokrycie cechy {variable}: {len(out)}')
    logging.info('Cecha %s: %s gmin',variable,len(out));return out

def znajdz_szkoly(year: int):
    """Liczba szkół podstawowych (publiczne i niepubliczne razem) w gminie. Zwraca (id, opis) albo (None, None)."""
    zle=('uczni','absolw','oddział','oddzial','specjal','komputer','nauczyc','dorosł','dorosl','pomieszcz','sal','internet','kobiet','mężczy')
    for fraza in ('szkoły podstawowe','szkoły podstawowe dla dzieci i młodzieży'):
        try:j=request('/variables/search?name='+urllib.parse.quote(fraza)+'&page-size=100&format=json')
        except Exception as exc:logging.warning('Szukanie %s: %s',fraza,exc);continue
        for v in j.get('results',[]):
            opis=' '.join(str(v.get(k,'')) for k in ('n1','n2','n3','n4','n5')).lower()
            logging.info('kandydat szkoły %s %s poziom %s',v.get('id'),opis[:120],v.get('level'))
        for v in j.get('results',[]):
            opis=' '.join(str(v.get(k,'')) for k in ('n1','n2','n3','n4','n5')).lower()
            if 'szkoł' in opis and 'podstaw' in opis and not any(z in opis for z in zle) and int(v.get('level',0))>=6:
                try:meta=request(f"/variables/{v['id']}?format=json")
                except Exception:continue
                if year in meta.get('years',[]):
                    logging.info('WYBRANO szkoły %s: %s',v['id'],opis[:160]);return v['id'],meta
    return None,None

# Nowe wskaźniki kart. Zmienną GUS wybieramy po nazwie (w logu zostają kandydaci, żeby dało się sprawdzić wybór),
# zawsze z najnowszego dostępnego roku nie późniejszego niż --year.
NOWE=[
  # pole, frazy do wyszukania, wszystkie muszą wystąpić w opisie, żadne nie może, jak przeliczyć wartość
  ('mieszkanie_m2_os',['przeciętna powierzchnia użytkowa mieszkania na 1 osobę','powierzchnia użytkowa mieszkania na 1 osobę'],['na 1 osob'],['nowo','oddan','wiejsk','miast'],None),
  ('obciazenie_demograficzne',['ludność w wieku nieprodukcyjnym na 100 osób w wieku produkcyjnym','wieku nieprodukcyjnym na 100'],['nieprodukcyjn','100'],['kobiet','mężczyzn','miast','wieś','wsi'],None),
  ('drogi_na_100km2',['drogi gminne o nawierzchni twardej na 100 km2','drogi gminne o nawierzchni twardej'],['gminne','twardej','100 km'],['ulepszon','nieulepsz','gruntow'],None),
  ('firmy_na_1000',['podmioty wpisane do rejestru REGON na 10 tys. ludności','rejestru regon na 10 tys'],['10 tys','regon'],['nowo','wyrejestr','osoby fizyczne','sektor'],lambda v:round(v/10,2)),
  ('zadluzenie_na_mieszk',['zobowiązania ogółem na 1 mieszkańca','zadłużenie na 1 mieszkańca','zobowiązania ogółem'],['zobowiąz'],['wymagaln','kraj','zagranic'],None),
]

def znajdz_zmienna(frazy,musi,nie,year):
    widziane=set()
    for fraza in frazy:
        try:j=request('/variables/search?name='+urllib.parse.quote(fraza)+'&page-size=100&format=json')
        except Exception as exc:logging.warning('Szukanie %s: %s',fraza,exc);continue
        for v in j.get('results',[]):
            if v['id'] in widziane:continue
            widziane.add(v['id'])
            opis=' '.join(str(v.get(k,'')) for k in ('n1','n2','n3','n4','n5','measureUnitName')).lower()
            logging.info('kandydat %s | %s | poziom %s',v['id'],opis[:150],v.get('level'))
            if all(m.lower() in opis for m in musi) and not any(n.lower() in opis for n in nie) and int(v.get('level',0))>=6:
                try:meta=request(f"/variables/{v['id']}?format=json")
                except Exception:continue
                lata=[y for y in meta.get('years',[]) if y<=year]
                if lata:
                    logging.info('WYBRANO %s rok %s: %s',v['id'],max(lata),opis[:160]);return v['id'],max(lata),meta
    return None,None,None

def main() -> None:
    """Pobierz jawnie wybrany rok i dołącz tylko pasujące kody gmin."""
    parser=argparse.ArgumentParser();parser.add_argument('--year',type=int,default=2025);args=parser.parse_args()
    logging.basicConfig(level=logging.INFO,format='%(asctime)s %(message)s')
    base=json.loads((ROOT/'baza.json').read_text(encoding='utf-8'));rows={g['k']:g for g in base['gminy']}
    values={};sources={}
    for name,var in VARS.items():
        meta=request(f'/variables/{var}?format=json')
        if args.year not in meta['years']:raise ValueError(f'Brak roku {args.year}: {name}')
        values[name]=download(var,args.year);sources[name]={'id':var,'rok':args.year,'url':BASE+f'/variables/{var}','opis':meta}
    # szkoły podstawowe ogółem (publiczne i niepubliczne); gdy GUS ich nie poda, wskaźnik zostaje wstrzymany
    # zmienna 838: szkoły podstawowe dla dzieci i młodzieży (bez specjalnych), ogółem, wszystkie organy prowadzące;
    # bierzemy najnowszy dostępny rok, bo dane oświatowe GUS publikuje z opóźnieniem
    sz_id,szkoly,sz_rok=838,{},None
    try:
        sz_meta=request(f'/variables/{sz_id}?format=json')
        lata=[y for y in sz_meta.get('years',[]) if y<=args.year]
        if lata:
            sz_rok=max(lata);szkoly=download(sz_id,sz_rok);sources['szkoly']={'id':sz_id,'rok':sz_rok,'url':BASE+f'/variables/{sz_id}','opis':sz_meta}
    except Exception as exc:logging.warning('Szkoły: %s',exc);szkoly={}
    nowe={}
    for pole,frazy,musi,nie,przelicz in NOWE:
        try:
            zid,rok,meta=znajdz_zmienna(frazy,musi,nie,args.year)
            if not zid:logging.warning('Nie znaleziono zmiennej dla %s',pole);continue
            dane=download(zid,rok)
            nowe[pole]=({k:(przelicz(v) if przelicz else v) for k,v in dane.items()},rok)
            sources[pole]={'id':zid,'rok':rok,'url':BASE+f'/variables/{zid}','opis':meta}
        except Exception as exc:logging.warning('%s: %s',pole,exc)
    result={};missing=[]
    for key,g in sorted(rows.items()):
        row={};years={}
        for name in ('przyrost_naturalny',):
            if key in values[name]:row[name]=values[name][key];years[name]=args.year
        if key in values['powierzchnia_ha']:row['powierzchnia']=values['powierzchnia_ha'][key]/100;years['powierzchnia']=args.year
        # Nie dziel kwoty z innego roku przez obecną populację.
        if key in values['pit_suma'] and g.get('ludnosc',0)>0 and g.get('ludnosc_rok')==args.year:
            row['pit_na_mieszk']=values['pit_suma'][key]/g['ludnosc'];years['pit_na_mieszk']=args.year
        if key in szkoly and g.get('ludnosc',0)>0:
            row['szkoly_na_1000']=round(szkoly[key]/g['ludnosc']*1000,3);years['szkoly_na_1000']=sz_rok
        for pole,(dane,rok) in nowe.items():
            if key in dane:row[pole]=round(dane[key],3);years[pole]=rok
        row['lata']=years;result[key]=row
        absent=[x for x in ['przyrost_naturalny','pit_na_mieszk','powierzchnia'] if x not in row]
        if absent:missing.append({'k':key,'pola':absent})
    status=('Szkoły podstawowe ogółem (publiczne i niepubliczne) na 1000 mieszkańców, GUS BDL, zmienna '+str(sz_id)+', rok '+str(sz_rok)+'.') if szkoly else 'Brak danych GUS o szkołach podstawowych. Waga szkół jest wstrzymana.'
    artifact={'rok':'edycja 2026','pobrano':datetime.datetime.now(datetime.timezone.utc).isoformat(),'szkoly_status':status,'wstrzymane':[] if szkoly else ['szkoly_na_1000'],'zrodla':sources,'uwagi':'Pozostałe wskaźniki pochodzą z baza.json; rok ich obserwacji nie był zapisany. Edycja oznacza datę zestawu, nie jednolity rok wszystkich danych.','gminy':result,'braki':missing}
    target=ROOT/'karty-dane.json';temp=target.with_suffix('.tmp');temp.write_text(json.dumps(artifact,ensure_ascii=False,separators=(',',':')),encoding='utf-8');temp.replace(target)
    logging.info('Zapis: %s gmin, %s z brakami',len(result),len(missing))
if __name__=='__main__':main()
