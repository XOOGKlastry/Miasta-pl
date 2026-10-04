"""Uzupełnij wskaźniki GUS. Python 3.11+, bez zależności. Nigdy nie wymyśla braków.
Uruchom z katalogu repo: python narzedzia/uzupelnij_karty.py --year 2025
Cache odpowiedzi umożliwia wznowienie po limicie API; docelowy zapis jest atomowy.
"""
from __future__ import annotations
import argparse, concurrent.futures, datetime, hashlib, json, logging, math, pathlib, time, urllib.request, urllib.error
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
    result={};missing=[]
    for key,g in sorted(rows.items()):
        row={};years={}
        for name in ('przyrost_naturalny',):
            if key in values[name]:row[name]=values[name][key];years[name]=args.year
        if key in values['powierzchnia_ha']:row['powierzchnia']=values['powierzchnia_ha'][key]/100;years['powierzchnia']=args.year
        # Nie dziel kwoty z innego roku przez obecną populację.
        if key in values['pit_suma'] and g.get('ludnosc',0)>0 and g.get('ludnosc_rok')==args.year:
            row['pit_na_mieszk']=values['pit_suma'][key]/g['ludnosc'];years['pit_na_mieszk']=args.year
        row['lata']=years;result[key]=row
        absent=[x for x in ['przyrost_naturalny','pit_na_mieszk','powierzchnia'] if x not in row]
        if absent:missing.append({'k':key,'pola':absent})
    artifact={'rok':'edycja 2026','pobrano':datetime.datetime.now(datetime.timezone.utc).isoformat(),'szkoly_status':'Oczekujemy na pełne dane o publicznych szkołach podstawowych. Waga szkół jest wstrzymana.','wstrzymane':['szkoly_na_1000'],'zrodla':sources,'uwagi':'Pozostałe wskaźniki pochodzą z baza.json; rok ich obserwacji nie był zapisany. Edycja oznacza datę zestawu, nie jednolity rok wszystkich danych.','gminy':result,'braki':missing}
    target=ROOT/'karty-dane.json';temp=target.with_suffix('.tmp');temp.write_text(json.dumps(artifact,ensure_ascii=False,separators=(',',':')),encoding='utf-8');temp.replace(target)
    logging.info('Zapis: %s gmin, %s z brakami',len(result),len(missing))
if __name__=='__main__':main()
