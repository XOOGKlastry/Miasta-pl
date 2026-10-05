/* Reguły edycji kart. Ranking percentylowy z remisami, osobno dla miast i wsi. */
window.KartyModel=(()=>{
 // t: 'r' więcej = lepiej, 'o' mniej = lepiej. miasto/wies: waga w OVR (miasta i gminy miejsko-wiejskie / gminy wiejskie).
 const STATY=[
  {k:'ludnosc',n:'Ludność',t:'r',miasto:0,wies:0},
  {k:'powierzchnia',n:'Powierzchnia',t:'r',miasto:0,wies:0},
  {k:'gestosc',n:'Gęstość zaludnienia',t:'o',miasto:0,wies:0},
  {k:'saldo_migracji',n:'Migracja',t:'r',miasto:1.5,wies:1.5},
  {k:'przyrost_naturalny',n:'Przyrost naturalny',t:'r',miasto:0,wies:1.5},
  {k:'pit_na_mieszk',n:'Zarobki · PIT/os.',t:'r',miasto:2,wies:0},
  {k:'bezrobocie_proc',n:'Bezrobocie',t:'o',miasto:2,wies:1},
  {k:'firmy_na_1000',n:'Firmy na 1000 os.',t:'r',miasto:1.5,wies:0},
  {k:'zadluzenie_na_mieszk',n:'Zadłużenie gminy',t:'o',miasto:1,wies:0},
  {k:'mieszkanie_m2_os',n:'Mieszkanie na osobę',t:'r',miasto:1,wies:0},
  {k:'obciazenie_demograficzne',n:'Obciążenie demograficzne',t:'o',miasto:1,wies:1},
  {k:'lesistosc_proc',n:'Lesistość',t:'r',miasto:0,wies:2},
  {k:'drogi_na_100km2',n:'Drogi twarde',t:'r',miasto:0,wies:1},
  {k:'szkoly_na_1000',n:'Szkoły podstawowe',t:'r',miasto:0,wies:1},
  {k:'odleglosc_stolica',n:'Do stolicy woj.',t:'o',miasto:0,wies:1},
  {k:'wodociag_proc',n:'Wodociągi',t:'r',miasto:0,wies:0,bezRekordu:true},
  {k:'kanalizacja_proc',n:'Kanalizacja',t:'r',miasto:0,wies:0,bezRekordu:true}
 ];
 // przód karty: 10 wskaźników, inne dla miast i dla wsi; reszta w panelu „Pozostałe dane”
 const TWARZ={
  miasto:['ludnosc','gestosc','pit_na_mieszk','bezrobocie_proc','firmy_na_1000','saldo_migracji','zadluzenie_na_mieszk','mieszkanie_m2_os','obciazenie_demograficzne','przyrost_naturalny'],
  wies:['ludnosc','gestosc','lesistosc_proc','przyrost_naturalny','saldo_migracji','bezrobocie_proc','obciazenie_demograficzne','drogi_na_100km2','szkoly_na_1000','odleglosc_stolica']};

 const grupa=g=>g.typ==='gmina wiejska'?'wies':'miasto';
 const valid=v=>typeof v==='number'&&Number.isFinite(v);
 const curve=p=>{const a=[[0,40],[.05,50],[.2,58],[.5,65],[.8,75],[.95,85],[.98,90],[1,94]];p=Math.max(0,Math.min(1,p));for(let i=1;i<a.length;i++)if(p<=a[i][0])return Math.round(a[i-1][1]+(a[i][1]-a[i-1][1])*(p-a[i-1][0])/(a[i][0]-a[i-1][0]));return 94;};
 // O(n log n). Remisy mają średnią pozycję, niezależną od kolejności wejścia.
 function rank(list,value,assign,reverse=false){
  const z=list.filter(g=>valid(value(g))).sort((a,b)=>(value(a)-value(b))*(reverse?-1:1));
  for(let i=0;i<z.length;){let j=i+1;while(j<z.length&&value(z[j])===value(z[i]))j++;const p=z.length===1?.5:(i+j-1)/2/(z.length-1);for(let k=i;k<j;k++)assign(z[k],curve(p),p);i=j;}
 }
 function calculate(g,edition,paused=[]){
  g.forEach(x=>{x.oc={};x.rekordy=[];x.grupa=grupa(x);if(valid(x.ludnosc)&&x.powierzchnia>0)x.gestosc=x.ludnosc/x.powierzchnia;});
  for(const group of ['miasto','wies']){
   const z=g.filter(x=>x.grupa===group);
   STATY.forEach(s=>rank(z,x=>x[s.k],(x,v)=>x.oc[s.k]=v,s.t==='o'));
   const brak=STATY.filter(s=>s[group]&&z.filter(x=>valid(x[s.k])).length<z.length*.8).map(s=>s.k);
   z.forEach(x=>{let sum=0,w=0,available=0;STATY.forEach(s=>{const weight=paused.includes(s.k)||brak.includes(s.k)?0:s[group];if(!weight)return;w+=weight;if(x.oc[s.k]!=null)available+=weight;sum+=weight*(x.oc[s.k]??65);});x.srednia=sum/w;x.pokrycie=available/w;});
   rank(z.filter(x=>x.pokrycie>=.75),x=>x.srednia,(x,v,p)=>{x.ovr=v;x.percentyl=p;});
   z.filter(x=>x.pokrycie<.75).forEach(x=>{x.ovr=null;x.percentyl=null;});
   for(const woj of new Set(z.map(x=>x.woj))){const l=z.filter(x=>x.woj===woj&&x.ovr!=null).sort((a,b)=>b.srednia-a.srednia);l.forEach((x,i)=>x.pozycjaWoj=i&&x.srednia===l[i-1].srednia?l[i-1].pozycjaWoj:i+1);}
  }
  // Rzadkość z rekordzistek: pierwsza piątka w Polsce albo w województwie, w obie strony.
 // Wodociągi i kanalizacja się nasycają (wiele gmin ma 100%), więc nie tworzą rekordów.
 // Grupa remisowa, która wychodzi poza piątkę, odpada (rekord ma coś znaczyć).
 const OPIS={ludnosc:['najwięcej mieszkańców','najmniej mieszkańców'],powierzchnia:['największa powierzchnia','najmniejsza powierzchnia'],gestosc:['najgęściej zaludniona','najrzadziej zaludniona'],
  saldo_migracji:['największy napływ mieszkańców','największy odpływ mieszkańców'],przyrost_naturalny:['najwyższy przyrost naturalny','najniższy przyrost naturalny'],
  pit_na_mieszk:['najwyższe zarobki (PIT/os.)','najniższe zarobki (PIT/os.)'],bezrobocie_proc:['najwyższe bezrobocie','najniższe bezrobocie'],
  lesistosc_proc:['najbardziej zalesiona','najmniej zalesiona'],szkoly_na_1000:['najwięcej szkół na 1000 os.','najmniej szkół na 1000 os.'],
  firmy_na_1000:['najwięcej firm na 1000 os.','najmniej firm na 1000 os.'],zadluzenie_na_mieszk:['najbardziej zadłużona','najmniej zadłużona'],
  mieszkanie_m2_os:['najwięcej metrów mieszkania na osobę','najciaśniej w mieszkaniach'],obciazenie_demograficzne:['najstarsza demograficznie','najmłodsza demograficznie'],
  drogi_na_100km2:['najgęstsza sieć dróg','najrzadsza sieć dróg'],odleglosc_stolica:['najdalej od stolicy województwa','najbliżej stolicy województwa']};
 const TOP=3;   // podium: legendarna 1. w Polsce, diamentowa 2.–3. w Polsce, złota 1. w województwie, srebrna 2.–3. w województwie
 const scopes=[['pl',g],...Array.from(new Set(g.map(x=>x.woj)),w=>[w,g.filter(x=>x.woj===w)])];
 for(const [scope,z] of scopes)for(const s of STATY){
  if(s.bezRekordu||paused.includes(s.k))continue;
  const a=z.filter(x=>valid(x[s.k]));if(a.length<TOP+1)continue;
  for(const [dir,znak] of [['max',-1],['min',1]]){
   const l=a.slice().sort((p,q)=>(p[s.k]-q[s.k])*znak);
   for(let i=0;i<l.length&&i<TOP;){let j=i+1;while(j<l.length&&l[j][s.k]===l[i][s.k])j++;if(j>TOP)break;
    for(let t=i;t<j;t++)l[t].rekordy.push({k:s.k,dir,scope,miejsce:i+1,rok:edition,wartosc:l[t][s.k],
     opis:(i+1)+'. miejsce '+(scope==='pl'?'w Polsce':'w woj. '+scope.replace(/ie$/,'im'))+': '+(OPIS[s.k]?OPIS[s.k][dir==='max'?0:1]:s.n)});
    i=j;}
  }
 }
 // legendarna: 1. miejsce w Polsce · diamentowa: pierwsza piątka Polski · złota: 1. miejsce w województwie · srebrna: pierwsza piątka województwa
 g.forEach(x=>{const r=x.rekordy,pl=r.filter(q=>q.scope==='pl'),w=r.filter(q=>q.scope!=='pl');
  x.rekordy.sort((p,q)=>(p.scope==='pl'?0:1)-(q.scope==='pl'?0:1)||p.miejsce-q.miejsce);
  x.rz=pl.some(q=>q.miejsce===1)?'legenda':pl.length?'diament':w.some(q=>q.miejsce===1)?'zloto':w.length?'srebro':'zwykla';});
  return g;
 }
 function upgrade(g,all,owned,learning){const mnpK=+g.k.slice(2,4)>=61,county=mnpK?[]:all.filter(x=>x.k.slice(0,4)===g.k.slice(0,4)),count=county.filter(x=>owned.has(x.k)).length;
  const hits=Math.max(0,Number(learning['kontur:'+g.k]?.ok)||0),contour=Math.min(4,Math.floor(hits/10)),powiat=county.length>0&&count===county.length?1:0;
  return {bonus:owned.has(g.k)?contour+powiat:0,powiat,contour,hits,count,total:county.length};
 }
 const score=(g,k,bonus=0,records=false)=>g.oc[k]==null?null:Math.min(99,g.oc[k]+bonus+(records&&g.rekordy.some(r=>r.k===k)?5:0));
 return {STATY,TWARZ,grupa,curve,rank,calculate,upgrade,score};
})();

/* Karty gmin: wspólna logika dla albumu (karty.html), gier (animacja „do inwentarza”) i menu (przycisk Kolekcja).
   Karta jest zdobyta, gdy:
   - trafisz gminę po konturze (Do sześciu razy sztuka, Kształt gminy), nawet z podpowiedziami, albo
   - zbierzesz 3/4/5/6/7 fragmentów zależnie od rzadkości. */
window.Karty=(function(){
  const RZ={legenda:"Legendarna",diament:"Diamentowa",zloto:"Złota",srebro:"Srebrna",zwykla:"Zwykła"},KOLEJ=["legenda","diament","zloto","srebro","zwykla"];
  const RODZAJE=["miasto","herb","miejsce","rzeka","klub","gmina"];
  const PROG=3, PROGI={zwykla:3,srebro:4,zloto:5,diament:6,legenda:7};
  const prog=g=>PROGI[g.rz]||3;
  let DANE=null;
  const Model=window.KartyModel;
  const norm=s=>String(s||"").toLowerCase().replace(/ł/g,"l").normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]/g,"");
  const WOJ_KOD={"02":"dolnośląskie","04":"kujawsko-pomorskie","06":"lubelskie","08":"lubuskie","10":"łódzkie","12":"małopolskie","14":"mazowieckie","16":"opolskie","18":"podkarpackie","20":"podlaskie","22":"pomorskie","24":"śląskie","26":"świętokrzyskie","28":"warmińsko-mazurskie","30":"wielkopolskie","32":"zachodniopomorskie"};

  let CIEK={};
  async function zaladuj(){
    if(DANE)return DANE;
    fetch("ciekawostki.json").then(r=>r.ok?r.json():{}).then(c=>{CIEK=c||{};}).catch(()=>{});
    const b=await fetch("baza.json").then(r=>r.json());
    const extra=await fetch("karty-dane.json").then(r=>{if(!r.ok)throw Error("Nie udało się wczytać danych kart");return r.json();});
    // odległość od najbliższej stolicy województwa (narzedzia/odleglosci_stolic.py); brak pliku nie psuje kart
    const geo=await fetch("karty-geo.json").then(r=>r.ok?r.json():{gminy:{}}).catch(()=>({gminy:{}}));
    const g=b.gminy.filter(x=>/[123]$/.test(x.k));
    // rzadkość: im mniej mieszkańców, tym rzadsza; 3 najmniejsze miasta i 3 najmniejsze gminy są diamentowe
    const z=g.filter(x=>x.ludnosc).sort((a,c)=>a.ludnosc-c.ludnosc),n=z.length;
    const diam=new Set(z.filter(x=>x.typ==="gmina miejska").slice(0,3).concat(z.filter(x=>x.typ!=="gmina miejska").slice(0,3)).map(x=>x.k));
    z.forEach((x,i)=>{x.rz=diam.has(x.k)?"diament":i<n*.03?"zloto":i<n*.15?"srebro":i<n*.45?"braz":"zwykla";});
    g.forEach(x=>{if(!x.rz)x.rz="zwykla";x.woj=WOJ_KOD[x.k.slice(0,2)];});
    g.forEach(x=>{x._staryProg={zwykla:3,braz:4,srebro:5,zloto:6,diament:7}[x.rz];const fresh=extra.gminy?.[x.k];if(fresh)Object.assign(x,fresh);const gg=geo.gminy?.[x.k];if(gg)Object.assign(x,gg);if(x.odleglosc_stolica!=null&&x.odleglosc_stolica<1){x.stolicaWoj=true;delete x.odleglosc_stolica;}});
    g.sort((a,c)=>(a.ludnosc||1e9)-(c.ludnosc||1e9)).forEach((x,i)=>x.nr=i+1);
    const pow={};(b.powiaty||[]).forEach(p=>pow[p.k]=p.n);
    g.forEach(x=>{const kp=x.k.slice(0,4);x.powiat=+kp.slice(2)>=61?"miasto na prawach powiatu":"powiat "+(pow[kp]||"");});
    const PO_K={},PO_N={};g.forEach(x=>{PO_K[x.k]=x;(PO_N[norm(x.n)]=PO_N[norm(x.n)]||[]).push(x);});
    DANE={g,PO_K,PO_N,edycja:extra.rok||"edycja 2026",meta:extra};przelicz();return DANE;
  }
  const STATY=Model.STATY;
  function przelicz(){Model.calculate(DANE.g,DANE.edycja,DANE.meta.wstrzymane||[]);}
  function ulepszenie(g){let n={};try{n=JSON.parse(localStorage.getItem("nauka-v1")||"{}");}catch{}return Model.upgrade(g,DANE.g,zdobyte().mam,n);}
  function komplet(g){return g.ovr!=null;}
  function wynik(g,k,o={}){return Model.score(g,k,o.rowna?0:ulepszenie(g).bonus,!!o.rekordy);}
  function ocenaOVR(g,rowna=false){return g.ovr==null?null:Math.min(99,g.ovr+(rowna?0:ulepszenie(g).bonus));}
  function gminaPoNazwie(n){
    const l=DANE.PO_N[norm(n)];if(!l)return null;
    return l.find(x=>x.typ==="gmina miejska")||l.find(x=>x.typ==="gmina miejsko-wiejska")||l[0];
  }
  /* zdobyte karty:
     1. Kształt gminy: trafiona gmina to od razu karta,
     2. gry gminne (herby, Gdzie ta gmina, Ciepło-zimno, Kształt gminy): 3–7 trafień tej samej gminy to karta,
     3. wszystkie inne gry dają żetony; 25 żetonów to paczka z jedną losową nową kartą. */
  const PACZKA=25;
  const SZANSE=[["legenda",.001],["diament",.009],["zloto",.04],["srebro",.15],["zwykla",.80]];
  function paczki(){try{return JSON.parse(localStorage.getItem("karty-paczki")||"[]");}catch(e){return [];}}
  function odznaki(){try{return JSON.parse(localStorage.getItem("karty-zestawy-v1")||"{}");}catch{return {};}}
  function zetony(){return (+localStorage.getItem("karty-zetony")||0)+Object.keys(odznaki()).length*25;}
  function zdobyte(stare=false){
    let n={};try{n=JSON.parse(localStorage.getItem("nauka-v1")||"{}");}catch(e){}
    const pkt={},od=new Set(paczki().concat(Object.values(dzienne()).map(r=>r.k).filter(Boolean)));
    Object.entries(n).forEach(([klucz,r])=>{
      if(!(r.ok>0))return;
      const i=klucz.indexOf(":"),rodz=klucz.slice(0,i),id=klucz.slice(i+1);
      let g=null;
      if(rodz==="kontur"){g=DANE.PO_K[id]||gminaPoNazwie(id);if(g)od.add(g.k);return;}
      if(rodz==="gmina")g=DANE.PO_K[id];
      else if(rodz==="herb")g=gminaPoNazwie(id);
      if(g)pkt[g.k]=(pkt[g.k]||0)+r.ok;
    });
    Object.values(JSON.parse(localStorage.getItem("karty-nagrody-v1")||"{}")).forEach(r=>{if(r&&r.k)od.add(r.k);});
    const postep={};
    Object.entries(pkt).forEach(([k,v])=>{const limit=stare?(localStorage.getItem("karty-zasady")==="3"?DANE.PO_K[k]._staryProg:3):prog(DANE.PO_K[k]);if(v>=limit)od.add(k);postep[k]={size:Math.min(v,limit)};});
    return {mam:od,postep};
  }
  // jednorazowo przy zmianie zasad: karty zdobyte po staremu zostają w kolekcji
  function migracja(){
    if(localStorage.getItem("karty-zasady")==="4"){archiwizuj();return;}
    try{
      const stare=JSON.parse(localStorage.getItem("karty-ogloszone")||"[]");
      localStorage.setItem("karty-paczki",JSON.stringify([...new Set(paczki().concat(stare,[...zdobyte(true).mam]))]));
    }catch(e){}
    localStorage.setItem("karty-zasady","4");archiwizuj();
  }
  // paczki czekają na otwarcie; gracz otwiera je sam, po jednej
  function czekajace(){try{return JSON.parse(localStorage.getItem("karty-paczki-czekaja")||"[]");}catch(e){return [];}}
  function dodajCzekajaca(id,kolor){const l=czekajace();l.push({id,kolor,od:Date.now()});localStorage.setItem("karty-paczki-czekaja",JSON.stringify(l));}
  function liczbaPaczek(){return Math.floor(zetony()/PACZKA)+czekajace().length;}
  const PACZKI=[["zwykla",.80],["srebro",.16],["zloto",.035],["diament",.005]];
  const DROP={zwykla:[["legenda",.001],["diament",.009],["zloto",.04],["srebro",.15],["zwykla",.80]],srebro:[["legenda",.005],["diament",.025],["zloto",.17],["srebro",.55],["zwykla",.25]],zloto:[["legenda",.02],["diament",.08],["zloto",.60],["srebro",.30]],diament:[["legenda",.10],["diament",.50],["zloto",.30],["srebro",.10]]};
  function archiwizuj(){
    const owned=zdobyte().mam,records=JSON.parse(localStorage.getItem("karty-rekordy-v1")||"{}"),badges=odznaki();
    for(const k of owned){const g=DANE.PO_K[k];if(g?.rekordy.length&&!records[k+":"+DANE.edycja])records[k+":"+DANE.edycja]={rz:g.rz,rekordy:g.rekordy};}
    for(const woj of new Set(DANE.g.map(g=>g.woj))){const set=DANE.g.filter(g=>g.woj===woj&&g.rekordy.length);if(set.length&&set.every(g=>owned.has(g.k)))badges[DANE.edycja+":"+woj]={woj,rok:DANE.edycja};}
    localStorage.setItem("karty-rekordy-v1",JSON.stringify(records));localStorage.setItem("karty-zestawy-v1",JSON.stringify(badges));
  }
  function losuj(tabela,r=Math.random()){for(const [k,p]of tabela){if(r<p)return k;r-=p;}return tabela.at(-1)[0];}
  function losowaKarta(kolor){
    const rz=losuj(DROP[kolor]),mam=zdobyte().mam;
    let pula=DANE.g.filter(g=>g.rz===rz&&!mam.has(g.k));
    if(!pula.length)pula=DANE.g.filter(g=>g.rz===rz);
    if(!pula.length)pula=DANE.g;
    return pula[Math.floor(Math.random()*pula.length)];
  }
  async function otworzPaczke(){
    await zaladuj();migracja();
    const otworz=()=>{
      // najpierw paczki z nagród (dziennych, za poziomy i mecze), potem paczki za monety
      const cz=czekajace();
      if(cz.length){
        const p=cz.shift(),g=losowaKarta(p.kolor);if(!g)return null;
        localStorage.setItem("karty-paczki-czekaja",JSON.stringify(cz));
        localStorage.setItem("karty-paczki",JSON.stringify([...new Set(paczki().concat(g.k))]));
        localStorage.setItem("karty-ogloszone",JSON.stringify([...new Set((ogloszone()||[]).concat(g.k))]));
        return {...g,_paczka:true,_kolorPaczki:p.kolor,_joker:false};
      }
      const z=zetony();if(z<PACZKA)return null;
      const kolor=losuj(PACZKI),g=losowaKarta(kolor);if(!g)return null;
      localStorage.setItem("karty-paczki",JSON.stringify([...new Set(paczki().concat(g.k))]));
      localStorage.setItem("karty-zetony",String((+localStorage.getItem("karty-zetony")||0)-PACZKA));
      localStorage.setItem("karty-ogloszone",JSON.stringify([...new Set((ogloszone()||[]).concat(g.k))]));
      return {...g,_paczka:true,_kolorPaczki:kolor,_joker:false};
    };
    return navigator.locks?navigator.locks.request("polskoznawca-paczka",otworz):otworz();
  }
  // Jedno rozliczenie na typ zadania i dzień, niezależnie od przeładowania strony.
  // Rekord jest jednocześnie dowodem przyznania i własnością karty: jeden zapis.
  function dzienne(){try{return JSON.parse(localStorage.getItem("karty-dzienne-v1")||"{}");}catch(e){return {};}}
  async function nagrodaDnia(typ,dzien,{ukonczone=false,poddane=false}={}){
    if(!ukonczone||poddane||!["wyzwanie","miasto","gmina"].includes(typ)||!/^\d{4}-\d{2}-\d{2}$/.test(dzien))return null;
    await zaladuj();migracja();
    const przyznaj=()=>{
      const klucz=typ+":"+dzien,zapis=dzienne();if(zapis[klucz])return null;
      const kolor=losuj(PACZKI);
      zapis[klucz]={kolor,przyznano:Date.now(),czeka:true};
      localStorage.setItem("karty-dzienne-v1",JSON.stringify(zapis));
      dodajCzekajaca(klucz,kolor);
      return {paczka:true,kolor};
    };
    // Dwie otwarte karty przeglądarki nie mogą naliczyć tej samej nagrody.
    if(typeof navigator!=="undefined"&&navigator.locks)return navigator.locks.request("polskoznawca-dzienna-nagroda",przyznaj);
    return przyznaj();
  }
  async function nagrodaZa(id){
    await zaladuj();migracja();
    const przyznaj=()=>{
      const zapis=JSON.parse(localStorage.getItem("karty-nagrody-v1")||"{}");
      if(zapis[id])return null;
      const kolor=losuj(PACZKI);
      // nagroda raz na zadanie; paczka czeka w albumie, aż gracz ją otworzy
      zapis[id]={kolor,czeka:true};localStorage.setItem("karty-nagrody-v1",JSON.stringify(zapis));
      dodajCzekajaca(id,kolor);
      return {paczka:true,kolor};
    };
    return navigator.locks?navigator.locks.request("polskoznawca-nagroda",przyznaj):przyznaj();
  }
  function widziane(){try{return JSON.parse(localStorage.getItem("karty-widziane")||"[]");}catch(e){return [];}}
  function ogloszone(){try{return JSON.parse(localStorage.getItem("karty-ogloszone")||"null");}catch(e){return null;}}
  async function nowe(){
    await zaladuj();migracja();const zPaczek=[];const {mam}=zdobyte();
    let og=ogloszone();
    if(og===null){og=[...mam];localStorage.setItem("karty-ogloszone",JSON.stringify(og));return [];}   // pierwszy raz: bez zalewu kart
    const n=[...mam].filter(k=>og.indexOf(k)<0);
    if(n.length)localStorage.setItem("karty-ogloszone",JSON.stringify(og.concat(n)));
    return n.map(k=>{const g=DANE.PO_K[k];g._paczka=zPaczek.indexOf(k)>=0;return g;}).sort((a,b)=>KOLEJ.indexOf(a.rz)-KOLEJ.indexOf(b.rz));
  }
  async function liczbaNowych(){await zaladuj();migracja();const {mam}=zdobyte(),w=widziane();return [...mam].filter(k=>w.indexOf(k)<0).length;}

  /* ================== WYGLĄD KARTY (wspólny dla albumu i prezentacji) ================== */
  const IK={
   ludnosc:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><circle cx="9" cy="8" r="3.5"/><path d="M2 21c0-4 3-6.5 7-6.5s7 2.5 7 6.5"/><circle cx="17.5" cy="9" r="2.6"/><path d="M17 14.6c3 .2 5 2.3 5 6.4"/></svg>',
   powierzchnia:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><rect x="3" y="3" width="18" height="18" rx="1"/><path d="M3 9h3M3 15h3M9 3v3M15 3v3"/></svg>',
   gestosc:'<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="6" cy="6" r="2"/><circle cx="12" cy="6" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="6" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="18" cy="12" r="2"/><circle cx="6" cy="18" r="2"/><circle cx="12" cy="18" r="2"/><circle cx="18" cy="18" r="2"/></svg>',
   saldo_migracji:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M4 8h14l-4-4M20 16H6l4 4"/></svg>',
   dochod_na_mieszk:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><circle cx="12" cy="12" r="9"/><path d="M9 8h6l-6 8h6"/></svg>',
   bezrobocie_proc:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V4h6v3M3 13h18"/></svg>',
   wodociag_proc:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z"/></svg>',
   kanalizacja_proc:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><circle cx="12" cy="12" r="9"/><path d="M7 9h10M6 12h12M7 15h10"/></svg>',
   lesistosc_proc:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"><path d="M12 2l6 9h-3l4 6H5l4-6H6z"/><path d="M12 17v5"/></svg>',
   firmy_na_1000:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"><path d="M3 21V9l6 4V9l6 4V5h6v16z"/></svg>',
   zadluzenie_na_mieszk:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M8 12h8"/></svg>',
   mieszkanie_m2_os:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"><path d="M3 11l9-7 9 7v10H3z"/><path d="M9 21v-6h6v6"/></svg>',
   obciazenie_demograficzne:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 3v18M4 7h16M4 7l-2 6h4zM20 7l-2 6h4z"/></svg>',
   drogi_na_100km2:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M8 3L4 21M16 3l4 18M12 5v3M12 11v3M12 17v3"/></svg>',
   odleglosc_stolica:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="18" r="2.5"/><path d="M18 3l1.5 3 3.5.5-2.5 2.4.6 3.4L18 10.6l-3.1 1.7.6-3.4L13 6.5l3.5-.5z"/><path d="M8 16c3-2 4-4 8-5" stroke-dasharray="2 2.5"/></svg>'};
  const TYP={"gmina miejska":"MIASTO","gmina wiejska":"WIEŚ","gmina miejsko-wiejska":"M-W"};
  const WS={"dolnośląskie":"DLŚ","kujawsko-pomorskie":"K-P","lubelskie":"LUB","lubuskie":"LBU","łódzkie":"ŁDZ","małopolskie":"MAŁ","mazowieckie":"MAZ","opolskie":"OPO","podkarpackie":"PKR","podlaskie":"PDL","pomorskie":"POM","śląskie":"ŚLĄ","świętokrzyskie":"ŚWK","warmińsko-mazurskie":"W-M","wielkopolskie":"WLK","zachodniopomorskie":"ZPM"};
  const mnp=g=>+g.k.slice(2,4)>=61;
  const liczba=(v,d)=>Number(v).toLocaleString("pl-PL",{maximumFractionDigits:d==null?1:d});
  function wartosc(g,k){
    const v=g[k];if(v==null)return "brak danych";
    if(k==="ludnosc")return liczba(v,0)+" mieszk.";
    if(k==="powierzchnia")return liczba(v,1)+" km²";
    if(k==="gestosc")return liczba(v,0)+" os./km²";
    if(k==="saldo_migracji"||k==="przyrost_naturalny")return (v>0?"+":"")+liczba(v)+"‰";
    if(k==="pit_na_mieszk")return liczba(v,0)+" zł/os.";
    if(k==="szkoly_na_1000")return liczba(v,2)+" / 1000 os.";
    if(k==="firmy_na_1000")return liczba(v,0)+" / 1000 os.";
    if(k==="zadluzenie_na_mieszk")return liczba(v,0)+" zł/os.";
    if(k==="mieszkanie_m2_os")return liczba(v,1)+" m²/os.";
    if(k==="obciazenie_demograficzne")return liczba(v,1)+" na 100";
    if(k==="drogi_na_100km2")return liczba(v,0)+" km/100 km²";
    if(k==="odleglosc_stolica")return liczba(v,0)+" km";
    return liczba(v)+"%";
  }
  let HERBY={};
  function herbSrc(g){
    if(HERBY[g.n]&&g.typ!=="gmina wiejska")return HERBY[g.n];
    return g.herb?"https://commons.wikimedia.org/wiki/Special:FilePath/"+encodeURIComponent(g.herb)+"?width=80":"";
  }
  const esc=t=>String(t).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[c]);
  // tryb: "mini" (album), "pelna" (podgląd i prezentacja)
  function karta(g,o){
    o=o||{};const ot=o.otwarta!==false,pelna=o.tryb==="pelna",u=o.rowna?{bonus:0,count:0,total:0,hits:0}:ulepszenie(g),oc=Object.fromEntries(Object.entries(g.oc||{}).map(([k,v])=>[k,Math.min(99,v+u.bonus)])),h=ot?herbSrc(g):"";
    const st=pelna?'<span class="kk-linia"></span><div class="kk-st">'+Model.TWARZ[g.grupa||'miasto'].filter(k=>!(DANE&&DANE.meta&&(DANE.meta.wstrzymane||[]).includes(k))).map(k=>STATY.find(x=>x.k===k)).filter(Boolean).map(s=>'<span data-k="'+s.k+'">'+(IK[s.k]||IK.ludnosc)+'<em>'+s.n+'</em><b>'+(ot&&o.ukryj!==s.k&&oc[s.k]!=null?oc[s.k]:"?")+'</b><i>'+(ot&&o.ukryj!==s.k?wartosc(g,s.k):"")+'</i></span>').join("")+'</div>':'';
    return '<div class="kk kk-'+(pelna?"pelna":"mini")+' r-'+g.rz+(u.bonus===5?' holograficzna':'')+(ot?"":" zablokowana")+'" data-k="'+g.k+'">'+(o.nowa?'<span class="kk-nowa">NOWA</span>':'')+'<span class="kk-ramka"></span>'
      +'<div class="kk-lewa"><button type="button" class="kk-ovr" data-ovr="'+g.k+'" aria-label="Dlaczego takie OVR?">'+(ot&&g.ovr!=null?Math.min(99,g.ovr+u.bonus):"?")+'</button>'+(ot&&u.bonus?'<small class="kk-premia">+'+u.bonus+'</small>':'')+'<span class="kk-typ">'+(mnp(g)?"MNP":TYP[g.typ]||"GM")+'</span>'+(h?'<img class="kk-herb" alt="" loading="lazy" src="'+h+'">':'')+'<span class="kk-kres"></span><span class="kk-wojs">'+(WS[g.woj]||"")+'</span></div>'
      +'<div class="kk-mapka" data-m="'+g.k+'"></div>'
      +(ot&&CIEK[g.k]?'<button type="button" class="kk-pb" data-c="'+g.k+'" aria-label="Ciekawostki">'+KULA+'</button>':'')
      +'<div class="kk-nazwa">'+(ot?esc(g.n):"???")+'</div>'
      +'<div class="kk-jedn">'+(ot?(mnp(g)?"miasto na prawach powiatu<br>woj. "+g.woj:g.typ+(pelna?"<br>"+esc(g.powiat)+" · woj. "+g.woj:"")):(o.postep?"postęp "+o.postep+"/"+prog(g)+" fragmentów":"woj. "+g.woj))+'</div>'
      +st+(pelna&&ot&&!o.ukryj&&!o.bezSzczegolow?szczegoly(g,u,o):'')+'<div class="kk-rz">'+RZ[g.rz].toUpperCase()+' · #'+g.nr+'</div></div>';
  }
  // rekord dobry (zielony), zły (czerwony) albo neutralny (złoty)
  function znakRekordu(r){
    if(r.k==='ludnosc'||r.k==='powierzchnia'||r.k==='gestosc')return 'neutral';
    const s=STATY.find(x=>x.k===r.k),lepiejMniej=s&&s.t==='o';
    return (r.dir==='max')!==lepiejMniej?'plus':'minus';
  }
  // rekordy: zielone dobre, czerwone złe, złote neutralne; krajowe z flagą i większe
  // kompakt: krótszy opis („1. w Polsce · najwięcej mieszkańców”), żeby wszystkie zmieściły się pod kartą
  function rekordyHTML(g,limit,kompakt){
    if(!g.rekordy||!g.rekordy.length)return '';
    const l=limit?g.rekordy.slice(0,limit):g.rekordy;
    return '<ul class="kk-rekordy'+(kompakt?' kompakt'+(l.length>=5?' dwie':''):'')+'">'+l.map(r=>{const z=znakRekordu(r),kraj=r.scope==='pl';
      const tekst=kompakt?(r.miejsce+'. '+(kraj?'w Polsce':'w woj.')+' · '+String(r.opis).split(': ').slice(1).join(': ')):r.opis;
      return '<li class="'+z+(kraj?' kraj':'')+'"><i>'+(kraj?'🇵🇱':'')+(z==='plus'?'▲':z==='minus'?'▼':'●')+'</i><span>'+esc(tekst)+'</span></li>';}).join('')
      +(limit&&g.rekordy.length>limit?'<li class="wiecej">+ '+(g.rekordy.length-limit)+' w albumie</li>':'')+'</ul>';
  }
  // odwrót karty: postęp ulepszeń, pozostałe wskaźniki i pozostałe rekordy
  function tyl(g){
    const u=ulepszenie(g),m=+g.k.slice(2,4)>=61,wstrz=(DANE.meta&&DANE.meta.wstrzymane)||[];
    const przod=new Set(Model.TWARZ[g.grupa||'miasto']);
    const reszta=STATY.filter(s=>!przod.has(s.k)&&!wstrz.includes(s.k)&&!(s.k==='odleglosc_stolica'&&g.stolicaWoj));
    const pasek=(n,v,mx)=>'<label><span>'+n+'</span><i><b style="width:'+Math.round(100*Math.min(v,mx)/Math.max(1,mx))+'%"></b></i><em>'+Math.min(v,mx)+'/'+mx+'</em></label>';
    const pol=(g.pozycjaWoj?'#'+g.pozycjaWoj+' w woj. '+esc(g.woj.replace(/ie$/,'im')):'')
      +(g.stolicaWoj?(g.pozycjaWoj?' · ':'')+'stolica województwa':g.odleglosc_stolica!=null?(g.pozycjaWoj?' · ':'')+(g.odleglosc_stolica<1?'stolica województwa':liczba(g.odleglosc_stolica,0)+' km do: '+esc(g.najblizsza_stolica)):'');
    return '<div class="kk kk-pelna kk-odwrot r-'+g.rz+'"><span class="kk-ramka"></span>'
      +'<div class="kk-o-gora"><span class="kk-o-ovr">'+(ocenaOVR(g)??'?')+'</span><span class="kk-o-nazwa">'+esc(g.n)+'</span></div>'
      +'<div class="kk-o-blok"><b>Ulepszenia</b>'+(m?'':pasek('Powiat',u.count,u.total))+pasek('Kontury',u.hits,40)
      +'<p>Premia <strong>+'+u.bonus+'</strong>'+(u.bonus===5?' · hologram':' · przy +5 hologram')+'</p></div>'
      +'<div class="kk-o-blok"><b>Pozostałe dane</b><div class="kk-o-st">'+reszta.map(s=>'<span>'+(IK[s.k]||IK.ludnosc)+'<em>'+s.n+'</em><strong>'+(g.oc&&g.oc[s.k]!=null?g.oc[s.k]:'–')+'</strong><i>'+wartosc(g,s.k)+'</i></span>').join('')+'</div></div>'
      +(herbSrc(g)?'<div class="kk-o-herb"><img alt="Herb: '+esc(g.n)+'" onerror="this.parentNode.remove()" src="'+herbSrc(g)+'"></div>':'')
      +(pol?'<p class="kk-o-pol">'+pol+'</p>':'')
      +'<div class="kk-rz">'+RZ[g.rz].toUpperCase()+' · #'+g.nr+'</div></div>';
  }

  function panel(g){
    const u=ulepszenie(g),r=rekordyHTML(g),m=+g.k.slice(2,4)>=61;
    return '<div class="kk-panel">'
      +(g.pozycjaWoj?'<p class="kk-poz">#'+g.pozycjaWoj+' w woj. '+esc(g.woj.replace(/ie$/,'im'))+' · '+(g.grupa==='wies'?'wśród wsi':'wśród miast i M-W')+'</p>':'')
      +(g.odleglosc_stolica!=null?'<p class="kk-poz">'+(g.odleglosc_stolica<1?'Stolica województwa':'Do stolicy województwa: '+liczba(g.odleglosc_stolica,0)+' km ('+esc(g.najblizsza_stolica)+(g.inne_woj?', sąsiednie województwo':'')+')')+'</p>':'')
      +(r?'<b class="kk-pn">Rekordy</b>'+r:'<p class="kk-brak">Bez rekordów w pierwszej piątce.</p>')
      +'<b class="kk-pn">Pozostałe dane</b><div class="kk-reszta">'+STATY.filter(s=>!Model.TWARZ[g.grupa||'miasto'].includes(s.k)).map(s=>'<span>'+(IK[s.k]||'')+'<em>'+s.n+'</em><i>'+wartosc(g,s.k)+'</i><b>'+(g.oc[s.k]??'–')+'</b></span>').join('')+'</div>'
      +'<div class="kk-postep">'+(m?'':'<label><span>Powiat</span><progress value="'+u.count+'" max="'+Math.max(1,u.total)+'"></progress><em>'+u.count+'/'+u.total+'</em></label>')
      +'<label><span>Kontury</span><progress value="'+Math.min(40,u.hits)+'" max="40"></progress><em>'+Math.min(40,u.hits)+'/40</em></label></div>'
      +(u.bonus?'<p class="kk-bonus">Premia karty: +'+u.bonus+(u.bonus===5?' · karta holograficzna':'')+'</p>':'')
      +'</div>';
  }
  function szczegoly(g,u,o){
    const records=rekordyHTML(g);
    const history=JSON.parse(localStorage.getItem('karty-rekordy-v1')||'{}');
    const years=Object.entries(history).filter(([k])=>k.startsWith(g.k+':')&&!k.endsWith(':'+DANE.edycja)).map(([k])=>k.split(':')[1]);
    return '<div class="kk-details">'+(g.pozycjaWoj?'<p>#'+g.pozycjaWoj+' w woj. '+esc(g.woj)+' · '+(g.grupa==='wies'?'wsie':'miasta i M-W')+'</p>':'<p>OVR czeka na komplet danych GUS.</p>')
     +(o.rowna?'': '<label>Powiat '+u.count+'/'+u.total+' <progress value="'+u.count+'" max="'+Math.max(1,u.total)+'"></progress></label><label>Kontury '+Math.min(40,u.hits)+'/40 <progress value="'+Math.min(40,u.hits)+'" max="40"></progress></label>')
     +(records||'')
     +(years.length?'<p>Zachowane odznaczenia: '+years.map(esc).join(', ')+'</p>':'')
     +'<small>Forma: brak porównywalnych danych wieloletnich. PIT/os. to dochód gminy z PIT na mieszkańca, nie pensja. Szkoły publiczne: oczekiwanie na pełne źródło, waga wstrzymana. Zestaw GUS '+esc(DANE.edycja)+'.</small>'
     +(u.bonus===5?'<button type="button" data-tilt>✦ Włącz połysk przy przechylaniu</button>':'')+'</div>';
  }
  function dlaczego(g){
    const u=ulepszenie(g),d=document.createElement('div');d.className='kk-ciek';d.setAttribute('role','dialog');d.setAttribute('aria-modal','true');d.setAttribute('aria-label','Wyjaśnienie OVR');
    d.innerHTML='<div class="kk-ciek-pole"><div class="kk-ciek-gora"><div><b>Dlaczego '+(ocenaOVR(g)??'?')+'?</b><small>'+esc(g.n)+'</small></div><button aria-label="Zamknij">×</button></div><p>Porównanie: '+(g.grupa==='wies'?'gminy wiejskie':'miasta, MNP i gminy miejsko-wiejskie')+'.</p><ul>'+STATY.filter(s=>s[g.grupa]&&!DANE.meta.wstrzymane?.includes(s.k)).map(s=>'<li>'+s.n+': '+(g.oc[s.k]??'brak danych')+' × '+s[g.grupa]+'</li>').join('')+'</ul><p>Średnia ważona: '+(g.srednia==null?'brak danych':g.srednia.toFixed(2))+'. Pozycja tej średniej w grupie przechodzi przez krzywą 40–94 → OVR '+(g.ovr??'?')+'.</p><p>Powiat +'+u.powiat+', kontury +'+u.contour+'. Premia do OVR i każdego wskaźnika: +'+u.bonus+' (limit 99).</p><p>'+esc(DANE.meta.szkoly_status||'')+'</p><p>Brak danych nie oznacza zera. Niepełne karty nie mają OVR i nie uczestniczą w Karcie w ciemno.</p></div>';
    const before=document.activeElement,close=()=>{d.remove();before?.focus();};d.onclick=e=>{if(e.target===d||e.target.closest('.kk-ciek-gora button'))close();};d.onkeydown=e=>{if(e.key==='Escape')close();};document.body.appendChild(d);d.querySelector('button').focus();
  }
  document.addEventListener('click',async e=>{
    const b=e.target.closest?.('[data-ovr]');if(b){if(b.closest('[data-blind]'))return;e.stopPropagation();if(!b.closest('.zablokowana'))dlaczego(DANE.PO_K[b.dataset.ovr]);return;}
    const tilt=e.target.closest?.('[data-tilt]');if(tilt){e.stopPropagation();if(matchMedia('(prefers-reduced-motion: reduce)').matches){tilt.textContent='Ograniczenie ruchu — połysk statyczny';return;}try{if(typeof DeviceOrientationEvent==='undefined')throw Error('Brak czujnika przechylenia');if(DeviceOrientationEvent.requestPermission&&await DeviceOrientationEvent.requestPermission()!=='granted')throw Error('Brak zgody na czujnik');const card=tilt.closest('.kk');const fn=v=>{if(!card.isConnected){window.removeEventListener('deviceorientation',fn);return;}card.style.setProperty('--x',Math.max(0,Math.min(100,50+(v.gamma||0)))+'%');card.style.setProperty('--kat',90+(v.beta||0));};window.addEventListener('deviceorientation',fn);tilt.textContent='✦ Połysk włączony';tilt.disabled=true;}catch(err){tilt.textContent=err.message+' — przesuń palcem po karcie';}}
  },true);
  const KULA='<svg viewBox="0 0 40 40" aria-hidden="true"><defs><clipPath id="kkKl"><circle cx="20" cy="20" r="17"/></clipPath></defs><g clip-path="url(#kkKl)"><rect width="40" height="20" fill="#F4F4F2"/><rect y="20" width="40" height="20" fill="#DC1E35"/></g><circle cx="20" cy="20" r="17" fill="none" stroke="#3A2A14" stroke-width="2.4"/><ellipse cx="14" cy="17" rx="3.4" ry="4.2" fill="#fff" stroke="#3A2A14" stroke-width="1.6"/><ellipse cx="26" cy="17" rx="3.4" ry="4.2" fill="#fff" stroke="#3A2A14" stroke-width="1.6"/></svg>';
  function linki(g){
    return '<div class="kk-linki"><a href="encyklopedia.html#g'+g.k+'">🗺️ Na mapie</a>'+(g.wiki?'<a href="'+g.wiki+'" target="_blank" rel="noopener">📖 Wikipedia</a>':'')+'</div>';
  }
  function ciekawostki(k){
    const g=DANE.PO_K[k],l=CIEK[k];if(!g||!l)return;
    const d=document.createElement("div");d.className="kk-ciek";
    d.innerHTML='<div class="kk-ciek-pole"><div class="kk-ciek-gora"><span class="kk-ciek-kula">'+KULA+'</span><div><b>CIEKAWOSTKI</b><small>'+esc(g.n)+'</small></div><button type="button" aria-label="Zamknij">✕</button></div><ol>'
      +l.map(x=>'<li><p>'+esc(x.t)+'</p>'+(x.link?'<a href="'+esc(x.link)+'" target="_blank" rel="noopener">'+esc(x.etykieta||"Zobacz")+' ›</a>':'')+'</li>').join("")+'</ol></div>';
    d.onclick=e=>{if(e.target===d||e.target.closest(".kk-ciek-gora button"))d.remove();};
    document.body.appendChild(d);
  }
  document.addEventListener("click",e=>{const b=e.target.closest&&e.target.closest(".kk-pb");if(b){e.stopPropagation();e.preventDefault();ciekawostki(b.dataset.c);}},true);
  function styl(){
    if(document.getElementById("kk-styl"))return;
    if(!document.querySelector('link[href*="Barlow+Condensed"]')){const l=document.createElement("link");l.rel="stylesheet";l.href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=Bungee&display=swap";document.head.appendChild(l);}
    const extra=document.createElement("link");extra.rel="stylesheet";extra.href="karty-v4.css";document.head.appendChild(extra);
    const s=document.createElement("style");s.id="kk-styl";
    s.textContent=`
@media(prefers-reduced-motion:reduce){.pk *,.pk,.kk{animation:none!important;transition:none!important}}

.kk{--x:50%;--y:50%;position:relative;aspect-ratio:5/8;container-type:inline-size;border-radius:6cqw;overflow:hidden;background:var(--tlo);color:#14233A;filter:drop-shadow(0 6px 10px rgba(30,60,40,.16));cursor:pointer;transition:transform .15s;font-family:Rubik,system-ui,sans-serif}
.kk.kk-mini{aspect-ratio:5/7}
.kk .kk-ramka{position:absolute;inset:3cqw;border-radius:4cqw;border:.8cqw solid var(--ramka);pointer-events:none;z-index:3}
.kk .kk-lewa{position:absolute;left:7cqw;top:9cqw;width:22cqw;display:flex;flex-direction:column;align-items:center;gap:.6cqw;z-index:2}
.kk .kk-ovr{font-family:"Barlow Condensed",Bungee,sans-serif;font-weight:800;font-size:19cqw;line-height:.85}
.kk .kk-typ{font-family:"Barlow Condensed",sans-serif;font-weight:700;font-size:5.4cqw;letter-spacing:.1cqw;white-space:nowrap}
.kk .kk-herb{width:13cqw;height:15cqw;object-fit:contain}
.kk .kk-kres{width:10cqw;height:.7cqw;background:var(--ramka)}
.kk .kk-wojs{font-size:4cqw;font-weight:900;letter-spacing:.3cqw}
.kk .kk-mapka{position:absolute;right:6cqw;top:8cqw;width:60cqw;height:52cqw;border-radius:4cqw;overflow:hidden;border:.8cqw solid #14233A;background:#DDE5D6;z-index:1}
.kk.kk-mini .kk-mapka{height:56cqw}
.kk-mapka img{position:absolute;width:256px;height:256px;max-width:none;user-select:none;pointer-events:none}
.kk-mapka svg{position:absolute;inset:0;width:100%;height:100%}
.kk-mapka .atr{position:absolute;right:1px;bottom:0;font:600 7px/1.2 Rubik,sans-serif;color:#333;background:rgba(255,255,255,.75);padding:0 3px;border-radius:3px 0 0 0;z-index:2}
.kk .kk-nazwa{position:absolute;left:4cqw;right:4cqw;top:63cqw;text-align:center;font-family:"Barlow Condensed",sans-serif;font-weight:800;font-size:10cqw;line-height:1;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.kk.kk-mini .kk-nazwa{top:68cqw;font-size:11cqw}
.kk .kk-jedn{position:absolute;left:6cqw;right:6cqw;top:74.5cqw;text-align:center;font-size:3.8cqw;font-weight:700;line-height:1.25;opacity:.85}
.kk.kk-mini .kk-jedn{top:81cqw;font-size:5cqw}
.kk .kk-linia{position:absolute;left:14cqw;right:14cqw;top:85cqw;height:.6cqw;background:var(--ramka);opacity:.7}
.kk .kk-st{position:absolute;left:5cqw;right:5cqw;top:87cqw;background:rgba(255,255,255,.38);border-radius:3cqw;padding:1.6cqw 2.4cqw;display:grid;grid-template-columns:1fr 1fr;column-gap:4cqw;row-gap:1.8cqw}
.kk .kk-st span{display:grid;grid-template-columns:4.6cqw minmax(0,1fr) auto;grid-template-rows:auto auto;column-gap:1.6cqw;align-items:center}
.kk .kk-st svg{grid-row:1/3;width:4.6cqw;height:4.6cqw}
.kk .kk-st em{font-style:normal;font-family:"Barlow Condensed",sans-serif;font-weight:700;font-size:3.6cqw;text-transform:uppercase;white-space:nowrap;line-height:1.05}
.kk .kk-st b{grid-row:1/3;grid-column:3;font-family:"Barlow Condensed",sans-serif;font-weight:800;font-size:6.8cqw;line-height:1;text-align:right;min-width:7cqw}
.kk .kk-st i{font-style:normal;font-weight:700;font-size:2.8cqw;opacity:.75;white-space:nowrap}
.kk .kk-rz{position:absolute;left:0;right:0;top:143cqw;text-align:center;font-size:3.6cqw;font-weight:900;letter-spacing:.6cqw;color:var(--ramka)}
.kk.kk-mini .kk-rz{top:113cqw;font-size:4.6cqw}
.kk::after{content:"";position:absolute;inset:0;pointer-events:none;z-index:4;mix-blend-mode:var(--mieszanie,soft-light);opacity:var(--blask,.6);background:var(--holo)}
.kk.r-zwykla{--tlo:linear-gradient(160deg,#FBF6E8,#E2D6B8);--ramka:#9C8A62;--holo:none;--blask:0}
.kk.r-braz{--tlo:linear-gradient(155deg,#F6D2AE 0%,#D99A62 28%,#F0BC8C 46%,#B8723E 70%,#E1A472 100%);--ramka:#6E3A14;--holo:radial-gradient(circle at var(--x) var(--y),rgba(255,226,196,.85),transparent 45%),linear-gradient(115deg,transparent 35%,rgba(255,236,214,.55) 48%,transparent 60%);--blask:.55}
.kk.r-srebro{--tlo:linear-gradient(155deg,#FFFFFF 0%,#C9CED4 24%,#F1F3F5 44%,#A3ABB3 68%,#E2E6EA 86%,#B7BEC5 100%);--ramka:#5E6872;--holo:radial-gradient(circle at var(--x) var(--y),rgba(255,255,255,1),transparent 40%),linear-gradient(115deg,transparent 32%,rgba(255,255,255,.75) 47%,transparent 58%);--blask:.7}
.kk.r-zloto{--tlo:linear-gradient(155deg,#FFF4B8 0%,#EDBE3A 26%,#FFE48A 46%,#C8901B 70%,#F6D368 88%,#B98212 100%);--ramka:#6E4A00;--holo:radial-gradient(circle at var(--x) var(--y),rgba(255,251,214,1),transparent 40%),linear-gradient(115deg,transparent 34%,rgba(255,248,200,.7) 48%,transparent 60%);--blask:.75}
.kk.r-diament{--tlo:radial-gradient(circle at 30% 18%,rgba(255,255,255,.9),transparent 38%),linear-gradient(155deg,#F4FCFF 0%,#BFE7FF 30%,#E9F7FF 50%,#9ED3FF 72%,#E3D9FF 100%);--ramka:#2F6FD0;--mieszanie:screen;--blask:.55;--holo:radial-gradient(circle at var(--x) var(--y),rgba(255,255,255,.9),transparent 30%),linear-gradient(calc(var(--kat,115) * 1deg),transparent 30%,rgba(170,225,255,.6) 45%,rgba(230,210,255,.5) 55%,transparent 70%);filter:drop-shadow(0 0 7px rgba(110,190,255,.75)) drop-shadow(0 6px 10px rgba(30,60,40,.18))}
.kk.r-diament.kk-pelna{animation:kkDiament 3.2s ease-in-out infinite}
@keyframes kkDiament{50%{filter:drop-shadow(0 0 14px rgba(140,205,255,.95)) drop-shadow(0 6px 10px rgba(30,60,40,.18))}}
.kk.r-legenda{--tlo:radial-gradient(circle at 50% 0%,rgba(255,255,255,.55),transparent 45%),linear-gradient(155deg,#FFF0A8 0%,#E0A417 24%,#FFDF73 44%,#B57A08 66%,#F2C94C 84%,#9E6A05 100%);--ramka:#5A3A00;--mieszanie:soft-light;--blask:.8;--holo:radial-gradient(circle at var(--x) var(--y),rgba(255,250,210,1),transparent 38%),repeating-linear-gradient(115deg,transparent 0 14px,rgba(255,245,190,.38) 14px 18px);filter:drop-shadow(0 0 10px rgba(255,196,40,.85)) drop-shadow(0 6px 10px rgba(60,40,0,.25))}
.kk.r-legenda .kk-ramka{border-width:1cqw;box-shadow:inset 0 0 0 1cqw rgba(255,240,170,.85),inset 0 0 0 1.7cqw #6E4A00}
.kk.r-legenda .kk-ramka::before,.kk.r-legenda .kk-ramka::after{content:"";position:absolute;width:11cqw;height:11cqw;background:radial-gradient(circle,#FFF3B0 0 18%,#B57A08 19% 30%,transparent 31%),conic-gradient(from 45deg,#FFE48A,#9E6A05,#FFE48A,#9E6A05,#FFE48A);-webkit-mask:radial-gradient(circle,#000 62%,transparent 64%);mask:radial-gradient(circle,#000 62%,transparent 64%)}
.kk.r-legenda .kk-ramka::before{left:-4cqw;top:-4cqw}.kk.r-legenda .kk-ramka::after{right:-4cqw;bottom:-4cqw}
.kk.r-legenda::after{background:var(--holo),radial-gradient(circle,rgba(255,255,230,.95) 0 1.2%,transparent 1.6%) 0 0/22% 18%,radial-gradient(circle,rgba(255,240,180,.8) 0 .9%,transparent 1.3%) 9% 7%/17% 23%;animation:kkIskry 9s linear infinite}
@keyframes kkIskry{to{background-position:0 0,40% -60%,-30% 70%}}
.kk.r-legenda.kk-pelna{animation:kkLegenda 2.6s ease-in-out infinite}
@keyframes kkLegenda{50%{filter:drop-shadow(0 0 18px rgba(255,205,60,1)) drop-shadow(0 6px 10px rgba(60,40,0,.25))}}
@media (prefers-reduced-motion:reduce){.kk.r-legenda,.kk.r-diament,.kk.r-legenda::after{animation:none!important}}
.kk.zablokowana{--tlo:#2A2F3A!important;color:#8B93A6}.kk.zablokowana::after{display:none}.kk.zablokowana .kk-mapka{filter:grayscale(1) brightness(.35);border-color:#454C5C}.kk.zablokowana .kk-ramka{border-color:#454C5C}
.kk .kk-pb{position:absolute;right:4cqw;top:56cqw;z-index:6;width:14cqw;height:14cqw;padding:0;border:none;background:none;cursor:pointer;animation:kkPbSkok 2.4s ease-in-out infinite;filter:drop-shadow(0 0 1.5cqw rgba(255,215,90,.9))}
.kk .kk-pb svg{width:100%;height:100%;display:block}
.kk .kk-pb::after{content:"";position:absolute;inset:-10%;border-radius:50%;background:conic-gradient(from 0deg,transparent,rgba(255,255,255,.85),transparent 30%);animation:kkPbBlysk 2s linear infinite;mix-blend-mode:overlay;pointer-events:none}
@keyframes kkPbSkok{0%,100%{transform:translateY(0) rotate(-4deg)}50%{transform:translateY(-1.5cqw) rotate(4deg);filter:drop-shadow(0 0 2.5cqw rgba(255,235,140,1))}}
@keyframes kkPbBlysk{to{transform:rotate(360deg)}}
.kk.kk-mini .kk-pb{top:60cqw;width:16cqw;height:16cqw}
.kk-linki{display:flex;gap:10px;justify-content:center}
.kk-linki a{min-height:44px;padding:0 16px;border-radius:12px;border:3px solid #3A2A14;box-shadow:0 4px 0 #3A2A14;background:#FFF6E0;color:#3A2A14;font:800 14px Rubik,sans-serif;display:flex;align-items:center;gap:6px;text-decoration:none}
.kk-ciek{position:fixed;inset:0;z-index:7000;background:rgba(40,28,10,.7);display:grid;place-items:center;padding:16px;animation:pkWej .25s both}
.kk-ciek-pole{width:100%;max-width:420px;max-height:90vh;overflow:auto;background:#FFF6E0;color:#3A2A14;border:4px solid #3A2A14;border-radius:20px;box-shadow:0 7px 0 #3A2A14;padding:16px;font-family:Rubik,system-ui,sans-serif;animation:kkCiek .45s cubic-bezier(.3,1.5,.5,1) both}
@keyframes kkCiek{from{transform:scale(.7) rotate(-3deg);opacity:0}}
.kk-ciek-gora{display:flex;align-items:center;gap:12px;padding-bottom:12px;border-bottom:3px dashed rgba(58,42,20,.35)}
.kk-ciek-gora b{display:block;font-family:Bungee,sans-serif;font-weight:400;font-size:22px;letter-spacing:.5px}
.kk-ciek-gora small{display:block;font-weight:800;font-size:13px;color:#7A6440}
.kk-ciek-gora div{flex:1}
.kk-ciek-gora button{width:40px;height:40px;border-radius:12px;border:3px solid #3A2A14;background:#fff;font-weight:900;font-size:16px;cursor:pointer}
.kk-ciek-kula{width:52px;height:52px;flex:none;animation:kkPbSkok 2.4s ease-in-out infinite}.kk-ciek-kula svg{width:100%;height:100%}
.kk-ciek ol{margin:12px 0 0;padding-left:22px;display:flex;flex-direction:column;gap:12px}
.kk-ciek li{font-weight:700;line-height:1.4}.kk-ciek li::marker{font-family:Bungee,sans-serif;color:#E84A3C}
.kk-ciek li p{margin:0}
.kk-ciek li a{display:inline-flex;margin-top:6px;min-height:38px;align-items:center;padding:0 14px;border-radius:10px;border:3px solid #3A2A14;box-shadow:0 3px 0 #3A2A14;background:#F5B82E;color:#3A2A14;text-decoration:none;font-weight:900}
.kk-rekordy{list-style:none;margin:4px 0 0;padding:0;display:flex;flex-direction:column;gap:5px}
.kk-rekordy li{display:flex;align-items:flex-start;gap:7px;padding:5px 9px;border-radius:10px;border:2px solid;font:800 12.5px/1.3 Rubik,sans-serif}
.kk-rekordy li i{font-style:normal;font-size:11px;margin-top:2px}
.kk-rekordy li.plus{background:#E1F5DA;border-color:#2E8B3D;color:#1E5E28}
.kk-rekordy li.minus{background:#FDE2DE;border-color:#C7372B;color:#8A1F17}
.kk-rekordy li.neutral{background:#FFF1C2;border-color:#B8860B;color:#6E5100}
.kk-rekordy li.kraj{font-size:13px;border-width:2.5px;box-shadow:0 2px 0 rgba(58,42,20,.25)}
.kk-rekordy li:not(.kraj){font-size:11.5px;padding:4px 8px}
.kk-rekordy li.wiecej{border:none;background:none;color:#FFF6E0;font-size:11.5px;justify-content:center;padding:0}
.kk-tyl{width:100%;height:100%;box-sizing:border-box;border-radius:5% / 3%;background:repeating-linear-gradient(135deg,rgba(255,255,255,.18) 0 8px,transparent 8px 18px),#FFF6E0;border:4px solid #3A2A14;box-shadow:0 6px 0 #3A2A14;padding:12px;display:flex;flex-direction:column;gap:8px;overflow:hidden;color:#3A2A14;font-family:Rubik,sans-serif}
.kk-tyl.r-legenda,.kk-tyl.r-diament{background:repeating-linear-gradient(135deg,rgba(255,255,255,.35) 0 8px,transparent 8px 18px),linear-gradient(160deg,#F2FBFF,#D6E9FF 50%,#EAD9FF)}
.kk-tyl.r-zloto{background:repeating-linear-gradient(135deg,rgba(255,255,255,.3) 0 8px,transparent 8px 18px),linear-gradient(160deg,#FFF3C2,#F2CF5C)}
.kk-tyl-zrodla{margin-top:auto;font-size:9.5px;font-weight:700;opacity:.7;text-align:center}
.kk-tyl-tytul{font-family:"Barlow Condensed",Bungee,sans-serif;font-weight:800;font-size:22px;text-transform:uppercase;text-align:center}
.kk-tyl-sekcja{background:rgba(255,255,255,.6);border:2px solid rgba(58,42,20,.35);border-radius:12px;padding:7px 9px;display:flex;flex-direction:column;gap:4px}
.kk-tyl-sekcja b{font-family:Bungee,sans-serif;font-weight:400;font-size:12.5px}
.kk-tyl-sekcja p{margin:0;font-size:12px;font-weight:700}
.kk-tyl-sekcja label{display:grid;grid-template-columns:58px 1fr 40px;align-items:center;gap:6px;font-size:11.5px;font-weight:800}
.kk-tyl-sekcja progress{width:100%;height:9px;accent-color:#27AE60}
.kk-tyl-sekcja em{font-style:normal;text-align:right}
.kk-tyl-st{display:grid;grid-template-columns:1fr 1fr;gap:4px 8px}
.kk-tyl-st span{display:grid;grid-template-columns:1fr auto;grid-template-rows:auto auto;column-gap:4px;font-size:11px}
.kk-tyl-st em{font-style:normal;font-weight:800;text-transform:uppercase;font-size:10px;letter-spacing:.2px}
.kk-tyl-st i{font-style:normal;grid-row:2;opacity:.75;font-size:10.5px}
.kk-tyl-st strong{grid-row:1/3;grid-column:2;font-family:"Barlow Condensed",sans-serif;font-size:18px;align-self:center}
.kk-tyl .kk-rekordy li{font-size:10.5px;padding:3px 7px}
.kk.kk-odwrot::before{display:none!important}
.kk.kk-odwrot{height:100%;aspect-ratio:auto!important;display:flex;flex-direction:column;justify-content:space-between;gap:2cqw;padding:7cqw 6cqw 0;box-sizing:border-box}
.kk-odwrot .kk-o-gora{display:flex;align-items:center;justify-content:center;gap:3cqw;margin-top:1cqw}
.kk-odwrot .kk-o-ovr{font-family:"Barlow Condensed",Bungee,sans-serif;font-weight:800;font-size:10cqw;line-height:1}
.kk-odwrot .kk-o-nazwa{font-family:"Barlow Condensed",sans-serif;font-weight:800;font-size:8.5cqw;text-transform:uppercase;line-height:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:70%}
.kk-odwrot .kk-o-blok{background:rgba(255,255,255,.38);border-radius:3cqw;padding:2cqw 3cqw;display:flex;flex-direction:column;gap:1.2cqw}
.kk-odwrot .kk-o-blok>b{font-family:"Barlow Condensed",sans-serif;font-weight:800;font-size:4.4cqw;text-transform:uppercase;letter-spacing:.3cqw;opacity:.8}
.kk-odwrot label{display:grid;grid-template-columns:17cqw 1fr 11cqw;align-items:center;gap:2cqw;font-family:"Barlow Condensed",sans-serif;font-weight:700;font-size:4.2cqw;text-transform:uppercase}
.kk-odwrot label i{height:2.4cqw;border-radius:2cqw;background:rgba(58,42,20,.18);overflow:hidden}
.kk-odwrot label i b{display:block;height:100%;background:#27AE60;border-radius:2cqw}
.kk-odwrot label em{font-style:normal;text-align:right}
.kk-odwrot .kk-o-blok p{margin:0;font-size:3.6cqw!important;font-weight:700;color:inherit!important;text-shadow:none!important}
.kk-odwrot .kk-o-st{display:grid;grid-template-columns:1fr 1fr;column-gap:4cqw;row-gap:1.8cqw}
.kk-odwrot .kk-o-st span{display:grid;grid-template-columns:4.4cqw minmax(0,1fr) auto;grid-template-rows:auto auto;column-gap:1.4cqw;align-items:center}
.kk-odwrot .kk-o-st svg{grid-row:1/3;width:4.4cqw;height:4.4cqw}
.kk-odwrot .kk-o-st em{font-style:normal;font-family:"Barlow Condensed",sans-serif;font-weight:700;font-size:3.5cqw;text-transform:uppercase;line-height:1.05}
.kk-odwrot .kk-o-st strong{grid-row:1/3;grid-column:3;font-family:"Barlow Condensed",sans-serif;font-weight:800;font-size:6.4cqw;line-height:1}
.kk-odwrot .kk-o-st i{font-style:normal;font-weight:700;font-size:2.8cqw;opacity:.75;white-space:nowrap}
.kk-odwrot .kk-o-pol{margin:0;text-align:center;font-size:3.6cqw!important;font-weight:800;color:inherit!important;text-shadow:none!important}
.kk-odwrot .kk-rz{position:static;margin-top:0;padding-bottom:7cqw}
.kk-odwrot .kk-o-herb{flex:1;min-height:0;display:grid;place-items:center}
.kk-odwrot .kk-o-herb img{max-width:46cqw;max-height:100%;object-fit:contain;filter:drop-shadow(0 1.2cqw 1.2cqw rgba(0,0,0,.3))}
.kk-odwrot .kk-o-ovr-lista{display:grid;gap:1.2cqw}
.kk-odwrot .kk-o-ovr-lista span{display:grid;grid-template-columns:30cqw 1fr 8cqw;align-items:center;gap:2cqw}
.kk-odwrot .kk-o-ovr-lista em{font-style:normal;font-family:"Barlow Condensed",sans-serif;font-weight:700;font-size:3.5cqw;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.kk-odwrot .kk-o-ovr-lista i{height:2.2cqw;border-radius:2cqw;background:rgba(58,42,20,.16);overflow:hidden}
.kk-odwrot .kk-o-ovr-lista i b{display:block;height:100%;background:var(--ramka)}
.kk-odwrot .kk-o-ovr-lista strong{font-family:"Barlow Condensed",sans-serif;font-weight:800;font-size:4.6cqw;text-align:right}
.kk-rekordy.kompakt{display:grid;grid-template-columns:1fr;gap:3px}
.kk-rekordy.kompakt.dwie{grid-template-columns:1fr 1fr}
.kk-rekordy.kompakt.dwie li{font-size:10.5px!important}
.kk-rekordy.kompakt li{font-size:11px!important;padding:3px 8px!important;line-height:1.25}
.kk-rekordy.kompakt li.kraj{font-size:12px!important;padding:4px 8px!important}
.kk-panel{width:min(92vw,380px);background:#FFF6E0;color:#3A2A14;border:3px solid #3A2A14;border-radius:16px;box-shadow:0 4px 0 #3A2A14;padding:10px 12px;display:flex;flex-direction:column;gap:6px;font-family:Rubik,sans-serif}
.kk-panel p{margin:0;font-weight:700;font-size:12.5px;color:#7A6440}
.kk-panel .kk-pn{font-family:Bungee,sans-serif;font-weight:400;font-size:14px}
.kk-postep{display:grid;gap:4px}
.kk-reszta{display:grid;gap:3px}
.kk-reszta span{display:grid;grid-template-columns:16px minmax(0,1fr) auto 28px;gap:6px;align-items:center;font:700 12px Rubik,sans-serif;padding:3px 0;border-bottom:1px dashed rgba(58,42,20,.25)}
.kk-reszta span:last-child{border-bottom:none}
.kk-reszta svg{width:16px;height:16px}
.kk-reszta em{font-style:normal}
.kk-reszta i{font-style:normal;color:#7A6440}
.kk-reszta b{text-align:right;font-family:Bungee,sans-serif;font-weight:400}
.kk-postep label{display:grid;grid-template-columns:64px 1fr 46px;align-items:center;gap:8px;font-weight:800;font-size:12px}
.kk-postep progress{width:100%;height:10px;accent-color:#27AE60}
.kk-postep em{font-style:normal;text-align:right}
.kk .kk-nowa{position:absolute;left:50%;top:1.5cqw;transform:translateX(-50%);background:#E84A3C;color:#fff;font-size:4.5cqw;font-weight:900;padding:.5cqw 3cqw;border-radius:0 0 2cqw 2cqw;z-index:5}
/* prezentacja nowej karty, jak po otwarciu paczki */
.pk{position:fixed;inset:0;z-index:6000;overflow:hidden;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;font-family:Rubik,system-ui,sans-serif;color:#FFF6E0;animation:pkWej .35s both;
  background:radial-gradient(ellipse at 50% 38%,rgba(255,246,224,.16),transparent 60%),repeating-linear-gradient(45deg,rgba(255,255,255,.025) 0 3px,transparent 3px 9px),radial-gradient(ellipse at 50% 45%,#4E7A43,#2C4A26 75%)}
@keyframes pkWej{from{opacity:0}}
.pk.r-zwykla{--pk1:#4A3A1E;--pk2:#FFF6E0}.pk.r-braz{--pk1:#5A3216;--pk2:#E7A06B}.pk.r-srebro{--pk1:#3E4248;--pk2:#E6EEF6}.pk.r-zloto{--pk1:#6A4A00;--pk2:#F5B82E}.pk.r-diament{--pk1:#24406A;--pk2:#9FD8FF}
.pk-kula{position:absolute;left:50%;top:64%;width:86px;height:86px;margin-left:-43px;z-index:2;transition:transform .6s cubic-bezier(.5,-0.4,.5,1.4),opacity .5s}
.pk-kula svg{width:100%;height:100%;display:block;overflow:visible;animation:pkSkok .62s cubic-bezier(.3,0,.7,1) infinite alternate;transform-origin:50% 100%}
.pk-kula::after{content:"";position:absolute;left:12%;right:12%;bottom:-10px;height:12px;border-radius:50%;background:rgba(0,0,0,.28);animation:pkCien .62s cubic-bezier(.3,0,.7,1) infinite alternate}
@keyframes pkSkok{0%{transform:translateY(0) scale(1.12,.86)}18%{transform:translateY(-6px) scale(.95,1.06)}100%{transform:translateY(-70px) scale(1,1)}}
@keyframes pkCien{0%{transform:scale(1);opacity:.9}100%{transform:scale(.55);opacity:.4}}
.pk.faza4 .pk-kula{transform:translate(38vw,-30vh) scale(.45) rotate(360deg);opacity:0}
.pk-iskry{position:absolute;inset:0;pointer-events:none}
.pk-iskry i{position:absolute;bottom:-10px;width:5px;height:5px;border-radius:50%;background:var(--pk2);opacity:.55;animation:pkIskra linear infinite}
@keyframes pkIskra{to{transform:translateY(-110vh);opacity:0}}
.pk-krok{position:absolute;top:32%;left:50%;transform:translate(-50%,-50%);display:flex;flex-direction:column;align-items:center;gap:10px;text-align:center;opacity:0}
.pk-krok.widac{animation:pkKrok 1.1s cubic-bezier(.2,1.2,.3,1) both}
@keyframes pkKrok{0%{opacity:0;transform:translate(-50%,-30%) scale(1.6)}25%{opacity:1;transform:translate(-50%,-50%) scale(1)}80%{opacity:1}100%{opacity:0;transform:translate(-50%,-60%) scale(.9)}}
.pk-krok small{font-size:13px;letter-spacing:4px;color:#FFE7A3;font-weight:900;text-shadow:0 2px 0 #3A2A14}
.pk-krok b{font-family:Bungee,"Barlow Condensed",sans-serif;font-weight:400;font-size:clamp(30px,10vw,52px);line-height:1;color:#FFF6E0;text-shadow:0 4px 0 #3A2A14}
.pk-krok svg{width:110px;height:110px}.pk-krok svg path{fill:#F5B82E;stroke:#3A2A14;stroke-width:3;vector-effect:non-scaling-stroke;stroke-linejoin:round}
.pk-krok .pk-ovr{font-family:"Barlow Condensed",sans-serif;font-weight:800;font-size:clamp(96px,32vw,160px);line-height:.9;color:var(--pk2);-webkit-text-stroke:3px #3A2A14;text-shadow:0 6px 0 #3A2A14}
.pk-rekordy{margin-top:8px}.pk-rekordy .kk-rekordy li{font-size:12px}
.pk-karta{width:min(74vw,300px,calc((100vh - 270px) / 1.6));position:relative;z-index:2;opacity:0}
.pk.faza4 .pk-karta{animation:pkKarta .9s cubic-bezier(.2,1.3,.3,1) both}
@keyframes pkKarta{0%{opacity:0;transform:translateY(60px) rotateY(540deg) scale(.4)}100%{opacity:1;transform:none}}
.pk-blysk{position:absolute;inset:0;background:#FFF6E0;opacity:0;pointer-events:none;z-index:3}
.pk.faza4 .pk-blysk{animation:pkBlysk .7s both}
@keyframes pkBlysk{0%{opacity:.9}100%{opacity:0}}
.pk-dol{position:relative;z-index:2;display:flex;gap:10px;opacity:0;transition:opacity .4s}
.pk.faza5 .pk-dol{opacity:1}
.pk-dol button,.pk-dol a{min-height:50px;padding:0 18px;border-radius:14px;border:4px solid #3A2A14;box-shadow:0 5px 0 #3A2A14;background:#FFF6E0;color:#3A2A14;font:800 15px Rubik,sans-serif;display:grid;place-items:center;text-decoration:none}
.pk-dol .glowny{background:#F5B82E}
.pk-pomin{position:absolute;right:14px;top:calc(env(safe-area-inset-top,0px) + 12px);z-index:5;background:#FFF6E0;border:3px solid #3A2A14;color:#3A2A14;border-radius:10px;padding:5px 12px;font:900 12px Rubik,sans-serif;box-shadow:0 3px 0 #3A2A14}
.pk-licznik{position:absolute;left:14px;top:calc(env(safe-area-inset-top,0px) + 14px);z-index:5;font:900 12px Rubik,sans-serif;letter-spacing:2px;color:#3A2A14;background:#F5B82E;border:3px solid #3A2A14;border-radius:10px;padding:4px 10px}
.kd-plecak{position:fixed;right:14px;top:calc(env(safe-area-inset-top,0px) + 12px);z-index:6100;width:52px;height:52px;border-radius:14px;background:#F5B82E;border:3px solid #3A2A14;box-shadow:0 4px 0 #3A2A14;display:grid;place-items:center}
.kd-plecak.bum{animation:kdBum .35s}@keyframes kdBum{50%{transform:scale(1.3)}}
@media (prefers-reduced-motion:reduce){.pk *,.pk,.pk-kula svg{animation:none!important}.pk-karta,.pk-dol{opacity:1!important}}
`;
    document.head.appendChild(s);
  }
  const IKONA='<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#3A2A14" stroke-width="2" stroke-linejoin="round"><rect x="3" y="4" width="11" height="16" rx="2" fill="#B9E3FF" transform="rotate(-10 8 12)"/><rect x="10" y="4" width="11" height="16" rx="2" fill="#FFF6E0" transform="rotate(8 15 12)"/></svg>';

  /* ================== MAPA: zwykły podkład topograficzny (OpenTopoMap) z konturem gminy ================== */
  let GEO=null,GEO_P=null,WOJ=null;
  function ladujSkrypt(src){return new Promise((ok,zle)=>{if(src.indexOf("topojson")>=0&&window.topojson)return ok();const s=document.createElement("script");s.src=src;s.onload=ok;s.onerror=zle;document.head.appendChild(s);});}
  function geometrie(){
    if(GEO_P)return GEO_P;
    GEO_P=Promise.all([ladujSkrypt("topojson-client.min.js?v=17"),fetch("gminy.topojson?v=17").then(r=>r.json()),fetch("herby.json").then(r=>r.json()).catch(()=>({miasta:[]}))]).then(([_,t,h])=>{
      GEO={};
      const obj=Object.values(t.objects).sort((a,c)=>c.geometries.length-a.geometries.length)[0];
      topojson.feature(t,obj).features.forEach(f=>{if(!f.geometry)return;const ps=f.geometry.type==="Polygon"?[f.geometry.coordinates]:f.geometry.coordinates;let b=[1e9,1e9,-1e9,-1e9];
        ps.forEach(p=>p[0].forEach(([x,y])=>{b[0]=Math.min(b[0],x);b[1]=Math.min(b[1],y);b[2]=Math.max(b[2],x);b[3]=Math.max(b[3],y);}));f._bb=b;GEO[String(f.properties.k)]=f;
        // Geometria służy tylko do mapki; nie nadpisuje danych GUS ani rekordów.
      });
      (h.miasta||[]).forEach(c=>HERBY[c.n]=c.img);
      if(DANE)przelicz();
      return GEO;
    });
    return GEO_P;
  }
  const lon2x=(lo,z)=>(lo+180)/360*256*Math.pow(2,z);
  const lat2y=(la,z)=>{const s=Math.sin(la*Math.PI/180);return (.5-Math.log((1+s)/(1-s))/(4*Math.PI))*256*Math.pow(2,z);};
  function mapa(el){
    if(el.dataset.zrob)return;const f=GEO&&GEO[el.dataset.m];if(!f)return;
    const W=el.clientWidth,H=el.clientHeight;if(!W||!H)return;el.dataset.zrob=1;
    const b=f._bb;let z=15;
    while(z>5&&((lon2x(b[2],z)-lon2x(b[0],z))*1.25>W||(lat2y(b[1],z)-lat2y(b[3],z))*1.25>H))z--;
    const cx=(lon2x(b[0],z)+lon2x(b[2],z))/2,cy=(lat2y(b[1],z)+lat2y(b[3],z))/2,x0=cx-W/2,y0=cy-H/2;
    let h="";
    for(let tx=Math.floor(x0/256);tx<=Math.floor((x0+W)/256);tx++)for(let ty=Math.floor(y0/256);ty<=Math.floor((y0+H)/256);ty++){
      const s="abc"[(tx+ty)%3];
      h+='<img alt="" src="https://'+s+'.tile.opentopomap.org/'+z+'/'+tx+'/'+ty+'.png" data-osm="https://tile.openstreetmap.org/'+z+'/'+tx+'/'+ty+'.png" style="left:'+(tx*256-x0).toFixed(1)+'px;top:'+(ty*256-y0).toFixed(1)+'px">';
    }
    const ps=f.geometry.type==="Polygon"?[f.geometry.coordinates]:f.geometry.coordinates;
    const d=ps.map(p=>p.map(r=>"M"+r.map(([lo,la])=>(lon2x(lo,z)-x0).toFixed(1)+" "+(lat2y(la,z)-y0).toFixed(1)).join("L")+"Z").join("")).join("");
    // poza gminą lekko przyciemnione, granica gminy wyraźnie
    h+='<svg viewBox="0 0 '+W+' '+H+'"><path d="M0 0H'+W+'V'+H+'H0Z'+d+'" fill="rgba(20,24,34,.38)" fill-rule="evenodd"/><path d="'+d+'" fill="none" stroke="#fff" stroke-width="4" opacity=".8"/><path d="'+d+'" fill="none" stroke="#7B2FBF" stroke-width="2" stroke-dasharray="6 3"/></svg>'
      +'<span class="atr">© OSM, OpenTopoMap</span>';
    el.innerHTML=h;
    el.querySelectorAll("img").forEach(i=>i.onerror=()=>{if(i.dataset.osm&&i.src!==i.dataset.osm)i.src=i.dataset.osm;else i.style.display="none";});
  }
  const widok=window.IntersectionObserver?new IntersectionObserver(w=>w.forEach(e=>{if(e.isIntersecting){mapa(e.target);widok.unobserve(e.target);}}),{rootMargin:"300px"}):null;
  function podepnijMapy(root){geometrie().then(()=>root.querySelectorAll(".kk-mapka").forEach(el=>{if(widok&&!el.closest(".pk,.kk-podglad"))widok.observe(el);else mapa(el);}));}
  function holo(el){
    const ruch=(x,y)=>{el.style.setProperty("--x",x+"%");el.style.setProperty("--y",y+"%");el.style.setProperty("--kat",90+x);el.style.transform="perspective(700px) rotateY("+((x-50)/7)+"deg) rotateX("+((50-y)/7)+"deg)";};
    if(matchMedia("(prefers-reduced-motion: reduce)").matches)return;
    el.addEventListener("pointermove",e=>{const r=el.getBoundingClientRect();ruch(100*(e.clientX-r.left)/r.width,100*(e.clientY-r.top)/r.height);});
    el.addEventListener("pointerleave",()=>{el.style.transform="";});
  }

  /* ================== PREZENTACJA NOWEJ KARTY (jak otwieranie paczki w grach piłkarskich) ================== */
  async function prezentacja(karty,naKoniec){
    if(!karty||!karty.length)return;
    styl();
    await zaladuj();
    try{await geometrie();}catch(e){}
    let i=0;
    const w=document.createElement("div");
    const pl=document.createElement("a");pl.className="kd-plecak";pl.href="karty.html";pl.innerHTML=IKONA;pl.style.display="none";
    document.body.appendChild(pl);
    const zakoncz=()=>{
      // karta odlatuje do kolekcji w prawym górnym rogu
      const k=w.querySelector(".pk-karta");pl.style.display="";
      if(k){const r=k.getBoundingClientRect(),c=pl.getBoundingClientRect();
        k.animate([{transform:"none",opacity:1},{transform:"translate("+(c.left+26-r.left-r.width/2)+"px,"+(c.top+26-r.top-r.height/2)+"px) scale(.1) rotate(20deg)",opacity:.5}],{duration:650,easing:"cubic-bezier(.5,0,.75,0)",fill:"forwards"});}
      w.animate([{opacity:1},{opacity:0}],{duration:600,delay:300,fill:"forwards"});
      setTimeout(()=>{pl.classList.add("bum");},650);
      setTimeout(()=>{w.remove();},950);setTimeout(()=>{pl.remove();naKoniec&&naKoniec();},2000);
    };
    const pokaz=()=>{
      const g=karty[i],pelne=g.rz==="legenda"||g.rz==="diament"||g.rz==="zloto";
      w.className="pk r-"+g.rz;
      const wo=WOJ&&WOJ[g.woj]?WOJ[g.woj]:"";
      let iskry="";for(let n=0;n<(pelne?40:18);n++)iskry+='<i style="left:'+(Math.random()*100).toFixed(1)+'%;animation-duration:'+(3+Math.random()*4).toFixed(1)+'s;animation-delay:'+(-Math.random()*6).toFixed(1)+'s"></i>';
      w.innerHTML='<div class="pk-iskry">'+iskry+'</div><div class="pk-kula"><svg viewBox="0 0 100 100" aria-hidden="true"><defs><clipPath id="pkK"><circle cx="50" cy="50" r="44"/></clipPath></defs><g clip-path="url(#pkK)" transform="rotate(-8 50 50)"><rect width="100" height="50" fill="#F4F4F2"/><rect y="50" width="100" height="50" fill="#DC1E35"/><ellipse cx="36" cy="27" rx="14" ry="6" fill="#fff" opacity=".7"/></g><circle cx="50" cy="50" r="44" fill="none" stroke="#3A2A14" stroke-width="4"/><ellipse cx="38" cy="40" rx="8" ry="10" fill="#fff" stroke="#3A2A14" stroke-width="3"/><ellipse cx="64" cy="40" rx="8" ry="10" fill="#fff" stroke="#3A2A14" stroke-width="3"/></svg></div><div class="pk-blysk"></div>'
        +'<span class="pk-licznik">'+(g._paczka?"KARTA Z PACZKI":"NOWA KARTA")+(karty.length>1?" "+(i+1)+" / "+karty.length:"")+(g._joker?" · +1 PODPOWIEDŹ 50/50":"")+'</span>'+'<button class="pk-pomin">Pomiń ›</button>'
        +'<div class="pk-krok k1"><small>WOJEWÓDZTWO</small>'+wo+'<b>'+esc(g.woj)+'</b></div>'
        +'<div class="pk-krok k2"><small>'+(mnp(g)?"MIASTO NA PRAWACH POWIATU":esc(g.typ.toUpperCase()))+'</small><b>'+(mnp(g)?"MNP":TYP[g.typ]||"GM")+'</b><small style="letter-spacing:2px">'+esc(g.powiat)+'</small></div>'
        +'<div class="pk-krok k3"><small>'+RZ[g.rz].toUpperCase()+' KARTA</small><span class="pk-ovr">'+(g.ovr||"?")+'</span></div>'
        +'<div class="pk-karta">'+karta(g,{tryb:"pelna",bezSzczegolow:true})+'<div class="pk-rekordy">'+rekordyHTML(g,2)+'</div></div>'
        +'<div class="pk-dol">'+(i+1<karty.length?'<button class="glowny" data-a="dalej">Następna karta</button>':'<button class="glowny" data-a="koniec">Do kolekcji</button>')+'<a href="karty.html">Zobacz album</a></div>';
      if(!w.isConnected)document.body.appendChild(w);
      const kroki=[[".k1",150],[".k2",1100],[".k3",2050]],t=[];
      w.classList.remove("faza2","faza4","faza5");
      setTimeout(()=>w.classList.add("faza2"),80);
      kroki.forEach(([s,ms])=>t.push(setTimeout(()=>{w.querySelectorAll(".pk-krok").forEach(x=>x.classList.remove("widac"));w.querySelector(s).classList.add("widac");if(navigator.vibrate)try{navigator.vibrate(s===".k3"?[30,40,60]:15);}catch(e){}},ms)));
      const odslon=()=>{t.forEach(clearTimeout);w.querySelectorAll(".pk-krok").forEach(x=>x.classList.remove("widac"));w.classList.add("faza4");
        const el=w.querySelector(".pk-karta .kk");holo(el);podepnijMapy(w);
        setTimeout(()=>w.classList.add("faza5"),700);
        if(pelne&&window.ZP&&ZP.fanfary)setTimeout(ZP.fanfary,250);};
      t.push(setTimeout(odslon,matchMedia("(prefers-reduced-motion: reduce)").matches?0:3100));
      w.querySelector(".pk-pomin").onclick=e=>{e.stopPropagation();if(!w.classList.contains("faza4"))odslon();else zakoncz();};
      w.querySelectorAll(".pk-dol [data-a]").forEach(b=>b.onclick=e=>{e.stopPropagation();if(b.dataset.a==="dalej"){i++;pokaz();}else zakoncz();});
    };
    // kontury województw do pierwszego kroku prezentacji
    if(!WOJ){try{const gj=await fetch("woj.geojson?v=17").then(r=>r.json());WOJ={};
      gj.features.forEach(f=>{const ps=f.geometry.type==="Polygon"?[f.geometry.coordinates]:f.geometry.coordinates;let b=[1e9,1e9,-1e9,-1e9];ps.forEach(p=>p[0].forEach(([x,y])=>{b[0]=Math.min(b[0],x);b[1]=Math.min(b[1],y);b[2]=Math.max(b[2],x);b[3]=Math.max(b[3],y);}));
        const k=Math.cos((b[1]+b[3])/2*Math.PI/180),s=Math.min(100/((b[2]-b[0])*k),100/(b[3]-b[1]));
        WOJ[f.properties.nazwa]='<svg viewBox="0 0 100 100"><path d="'+ps.map(p=>"M"+p[0].filter((_,i)=>i%2===0).map(([x,y])=>((x-b[0])*k*s+(100-(b[2]-b[0])*k*s)/2).toFixed(1)+" "+((b[3]-y)*s+(100-(b[3]-b[1])*s)/2).toFixed(1)).join("L")+"Z").join("")+'"/></svg>';});}catch(e){WOJ={};}}
    pokaz();
  }
  function doInwentarza(karty){prezentacja(karty);}

  async function sprawdzPoGrze(){
    try{
      const n=await nowe(),p=liczbaPaczek();
      const info=()=>{if(p>0&&window.ZP&&ZP.komunikat)ZP.komunikat(p===1?"Masz paczkę do otwarcia w albumie kart":"Masz "+p+" paczki do otwarcia w albumie kart",4000);};
      if(n.length)setTimeout(()=>prezentacja(n,info),1200);else setTimeout(info,1200);
    }catch(e){}
  }
  return {herbSrc,tyl,panel,rekordyHTML,komplet,ulepszenie,wynik,ocenaOVR,odznaki,archiwizuj,prog,PROGI,PACZKI,DROP,losuj,nagrodaZa,nagrodaDnia,linki,ciekawostki,liczbaPaczek,otworzPaczke,PACZKA,SZANSE,zetony,migracja,STATY,przelicz,zaladuj,zdobyte,nowe,liczbaNowych,widziane,doInwentarza,prezentacja,sprawdzPoGrze,karta,styl,podepnijMapy,geometrie,holo,wartosc,RZ,KOLEJ,PROG,gminaPoNazwie,dane:()=>DANE,IKONA,WS};
})();
