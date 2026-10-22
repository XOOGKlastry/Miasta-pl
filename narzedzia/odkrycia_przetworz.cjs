/* Odkrycia: z surowych danych (narzedzia/odkrycia-surowe.json) i ręcznych poprawek (narzedzia/odkrycia-poprawki.json)
   buduje dane gry i pełną listę dla panelu admina.
   Uruchomienie: node narzedzia/odkrycia_przetworz.cjs
     odkrycia.json                         dane do gry: pozycje „w grze” i „tylko encyklopedia” (s:"e")
     narzedzia/odkrycia-wszystkie.json     wszystkie pozycje ze statusem i powodem (dla panelu, także odrzucone)
     narzedzia/odkrycia-podsumowanie.json  liczby i pokrycie powiatów oraz gmin
   Gmina i powiat z punktu w wielokącie na granicach z gminy.topojson i powiaty.topojson (z dziurami: miasta na prawach powiatu).
   Poprawki z panelu wygrywają z automatem: decyzje (gra / enc / off), zmiany pól, wpisy dodane ręcznie, progi. */
const fs=require("fs"),path=require("path"),topojson=require("../topojson-client.min.js");
const KAT=path.join(__dirname,".."),wczytaj=f=>JSON.parse(fs.readFileSync(path.join(KAT,f),"utf8"));

function warstwa(plik,obiekt,filtr){
  const t=wczytaj(plik),o=t.objects[obiekt]||Object.values(t.objects)[0];
  return topojson.feature(t,o).features.filter(f=>f.geometry&&(!filtr||filtr(f))).map(f=>{
    const polys=f.geometry.type==="Polygon"?[f.geometry.coordinates]:f.geometry.coordinates;let b=[1e9,1e9,-1e9,-1e9];
    polys.forEach(p=>p[0].forEach(([x,y])=>{b=[Math.min(b[0],x),Math.min(b[1],y),Math.max(b[2],x),Math.max(b[3],y)];}));
    return {k:String(f.properties.k),n:f.properties.n,polys,b};
  });
}
function wPierscieniu(x,y,r){let c=false;for(let i=0,j=r.length-1;i<r.length;j=i++){const [xi,yi]=r[i],[xj,yj]=r[j];if(((yi>y)!==(yj>y))&&(x<(xj-xi)*(y-yi)/(yj-yi)+xi))c=!c;}return c;}
const wSrodku=(x,y,g)=>x>=g.b[0]&&x<=g.b[2]&&y>=g.b[1]&&y<=g.b[3]&&g.polys.some(p=>wPierscieniu(x,y,p[0])&&!p.slice(1).some(h=>wPierscieniu(x,y,h)));
// siatka 0,25° jako prosty indeks przestrzenny
function indeks(w){const s=new Map();w.forEach(g=>{for(let x=Math.floor(g.b[0]*4);x<=Math.floor(g.b[2]*4);x++)for(let y=Math.floor(g.b[1]*4);y<=Math.floor(g.b[3]*4);y++){const k=x+":"+y;if(!s.has(k))s.set(k,[]);s.get(k).push(g);}});
  return (lon,lat)=>(s.get(Math.floor(lon*4)+":"+Math.floor(lat*4))||[]).find(g=>wSrodku(lon,lat,g))||null;}
// punkt w środku gminy (dla wpisów dodanych bez współrzędnych): środek prostokąta albo najbliższy punkt siatki wewnątrz
function punktW(g){
  const [x0,y0,x1,y1]=g.b,cx=(x0+x1)/2,cy=(y0+y1)/2;if(wSrodku(cx,cy,g))return [+cx.toFixed(5),+cy.toFixed(5)];
  let naj=null,d=1e9;for(let i=1;i<16;i++)for(let j=1;j<16;j++){const x=x0+(x1-x0)*i/16,y=y0+(y1-y0)*j/16;if(!wSrodku(x,y,g))continue;const dd=(x-cx)**2+(y-cy)**2;if(dd<d){d=dd;naj=[+x.toFixed(5),+y.toFixed(5)];}}
  return naj;
}

const WOJ={"02":"dolnośląskie","04":"kujawsko-pomorskie","06":"lubelskie","08":"lubuskie","10":"łódzkie","12":"małopolskie","14":"mazowieckie","16":"opolskie","18":"podkarpackie","20":"podlaskie","22":"pomorskie","24":"śląskie","26":"świętokrzyskie","28":"warmińsko-mazurskie","30":"wielkopolskie","32":"zachodniopomorskie"};
// obywatelstwa uznawane za polskie (gdy opis nie mówi wprost)
const POLSKIE=new Set(["Q36","Q207272","Q211274","Q172107","Q1649871","Q152115","Q221457"]);
// zbrodniarze: opis albo zawód; wyjątki to łowcy nazistów, ofiary, ruch oporu
const ZLY=/\bSS\b|SS-|Waffen|zbrodniar|nazist|NSDAP|gestapo|hitlerow|komendant obozu|führer|Gauleiter|Einsatzgrupp|\boprawc|ludobójc|nadzorczyni w obozie|sprawca Holokaustu/i;
const DOBRZY=/antyhitlerow|antynazist|łowc|ofiar|obrońc|ruchu oporu|ocalał|więzień|więźniark|Sprawiedliw/i;
// miejsce urodzenia będące regionem, a nie miejscowością
const REGION=/^(Kujawy|Mazowsze|Śląsk|Górny Śląsk|Dolny Śląsk|Pomorze|Pomorze Zachodnie|Wielkopolska|Małopolska|Podlasie|Warmia|Mazury|Warmia i Mazury|Kaszuby|Kurpie|Podhale|Spisz|Orawa|Żuławy|Kociewie|Lubelszczyzna|Polska|Prusy|Prusy Wschodnie|Galicja)$/i;
const OBIEKT=/\d|ulica|dom |pałac|kamienica|szpital|zespół|dwór |zamek|zamku|klasztor|folwark|majątek/i;
// rodzaje postaci (z opisu i zawodów w Wikidanych). Sportowcy, współcześni politycy i gwiazdy telewizji muszą być naprawdę
// znani (dużo odsłon w polskiej Wikipedii i dużo wersji językowych naraz), postacie historyczne i ludzie kultury, nauki,
// sztuki: wystarczy umiarkowana rozpoznawalność, bo to oni dają najciekawsze pytania „Skąd pochodzi?”.
const R_SPORT=/piłkar|siatkar|lekkoatlet|skoczek|bokser|tenisist|MMA|trener|kolarz|zapaśni|sprinter|szachist|sportow|hokeist|koszykar|pływa|żużlow|biathlon|biegacz|narciar|łyżwiar|wioślar|kajakar|sztangist|judok|szermier|gimnasty|kierowca wyścig|rajdow|olimpij|łucznik|kulomiot|młociar|tyczkar|oszczep|dyskobol|chodziar|płotkar|maratoń|snowboard|bramkar|sędzia piłk|kickbokser|strongman|zawodnik/i;
const R_POLIT=/polityk|poseł|posłank|senator|dyplomat|działacz|minister|parlamentar|samorządow|burmistrz|wojewod|ambasador|eurodeput|prezydent miasta|urzędnik|związkow/i;
const R_CELEB=/aktor|piosenkar|model|prezenter|dziennikar|youtuber|komik|muzyk studyjny|tekściarz|lektor|raper|wokalist|influenc|celebryt|osobowość telewizyjn|didżej|showman|satyryk|kabareciar|tancer|autor piosenek|producent muzyczny|producent filmowy|scenarzyst/i;
const R_CIEK=/matematyk|fizyk|chemik|astronom|wynalazc|inżynier|lekarz|biolog|botanik|zoolog|geolog|geograf|podróżnik|odkrywc|filozof|pisar|poet|powieściopisar|prozaik|dramaturg|kompozytor|malar|rzeźbiar|architekt|grafik|ilustrator|historyk|monarch|król|książę|księżn|hetman|święt|błogosław|papież|biskup|kardynał|zakonni|astronaut|kosmonaut|lotnik|pilot|oficer|generał|dowódc|żołnierz|powstaniec|bojownik|naukowiec|teolog|językoznaw|esperant|ekonomist|socjolog|psycholog|immunolog|biochemik|wirusolog|fotograf|pianist|skrzyp|śpiewa|dyrygent|reżyser|alpinist|himalaist|mecenas|przedsiębiorc|bankier|fabrykant|kartograf|reformator|rewolucjonist|noblist/i;
const R_PISARZ=/pisar|poet|noblist|prozaik|powieściopisar/i;
function rodzajPostaci(o){
  const t=(o.opis||"")+" | "+(o.zaw||[]).join(", "),ur=o.ur||1950;
  const sp=R_SPORT.test(t),po=R_POLIT.test(t),ce=R_CELEB.test(t),ci=R_CIEK.test(t);
  if(ur<1900&&(ci||po||ce))return "historia";
  if(sp)return "sport";
  if(ci&&po)return "polityk";
  if(ci&&(!ce||ur<1945||R_PISARZ.test(t)))return "kultura";
  if(po)return "polityk";
  if(ce)return "celeb";
  return "inne";
}
// progi: [odsłony, wersje językowe] potrzebne RAZEM albo same wersje językowe (ostatnia liczba)
const PROGI_POSTACI={sport:[50000,45,80],polityk:[200000,35,60],celeb:[100000,30,60],historia:[15000,0,999,3000,50],kultura:[15000,0,999,3000,50],inne:[50000,40,999]};
function znanaPostac(o,pr){
  const k=rodzajPostaci(o),p=(pr&&pr[k])||PROGI_POSTACI[k],od=o.odsl||0,sl=o.sl||0;
  if(sl>=p[2])return true;
  if(od>=p[0]&&sl>=p[1])return true;
  return p.length>3&&od>=p[3]&&sl>=p[4];
}
// premia do rozpoznawalności przy losowaniu (łatwiejsze tryby biorą górę listy): ciekawe postacie wyżej
const PREMIA_POSTACI={historia:0.5,kultura:0.4,celeb:-0.3,sport:-0.5,polityk:-0.5,inne:-0.3};
const DOMYSLNE={progi:{ludzie_odslony:20000,ludzie_wersje:40,miejsca_odslony:3000,miejsca_wersje:10,wydarzenia_odslony:3000,wydarzenia_wersje:10},
  encyklopedia_rodzaje:["oboz"],decyzje:{},zmiany:{},dodane:[]};
const POWODY={zbrodnie:"zbrodnie lub NSDAP/SS",malo_znany:"mało znany (poniżej progu)",region:"miejsce urodzenia to region",bez_nazwy:"brak polskiej nazwy",poza:"poza Polską",recznie:"wyłączone ręcznie",rodzaj:"rodzaj tylko do encyklopedii"};

function main(){
  const POW=warstwa("powiaty.topojson","powiaty"),GM=warstwa("gminy.topojson","gminy",f=>/^[0-9]{6}[123]$/.test(String(f.properties.k)));
  const powiat=indeks(POW),gmina=indeks(GM),GMK=new Map(GM.map(g=>[g.k,g])),POWK=new Map(POW.map(p=>[p.k,p]));
  const S=wczytaj("narzedzia/odkrycia-surowe.json");
  let P=DOMYSLNE;try{P=Object.assign({},DOMYSLNE,wczytaj("narzedzia/odkrycia-poprawki.json"));P.progi=Object.assign({},DOMYSLNE.progi,P.progi||{});}catch(e){}
  const pr=P.progi,encR=new Set(P.encyklopedia_rodzaje||[]);
  const przypisz=w=>{if(!w)return null;const p=powiat(w[0],w[1]);if(!p)return null;const g=gmina(w[0],w[1]);return {p:p.k,g:g?g.k:null,gn:g?g.n:null};};
  const znany=(o,kat)=>(o.odsl||0)>=pr[kat+"_odslony"]||(o.sl||0)>=pr[kat+"_wersje"];
  const wszystkie=[];
  const dodaj=(kat,o,extra)=>{
    const a=przypisz(o.wsp),poz={id:o.q,kat,n:o.n,opis:o.opis||null,wsp:o.wsp||null,...(a||{p:null,g:null,gn:null}),sl:o.sl||0,odsl:o.odsl??null,img:o.img||null,art:o.art||null,...extra};
    let auto="gra",powod=null;
    if(!a){auto="off";powod="poza";}
    else if(!poz.n||/^Q\d+$/.test(poz.n)){auto="off";powod="bez_nazwy";}
    wszystkie.push(Object.assign(poz,{auto,powod}));return poz;
  };
  for(const o of S.ludzie||[]){
    const t=(o.opis||"")+" | "+(o.zaw||[]).join(", ");
    const p=dodaj("ludzie",o,{ur:o.ur,zm:o.zm,mn:o.mn,zaw:(o.zaw||[]).slice(0,4),pl:/polsk|polak/i.test(o.opis||"")||(o.obyw||[]).some(x=>POLSKIE.has(x)),
      watpliwe:o.inne_m&&o.inne_m.length?o.inne_m.length:undefined,naz:o.nazizm||undefined,wyrok:o.wyrok||undefined,lista:o.lista||undefined});
    if(p.auto!=="gra")continue;
    // miejsce urodzenia bywa budynkiem, ulicą albo obiektem bez polskiej nazwy: wtedy podajemy gminę
    if(!p.mn||/^Q\d+$/.test(p.mn)||OBIEKT.test(p.mn)){p.mn_oryg=p.mn;p.mn=p.gn||p.mn;}
    if(o.nazizm||(ZLY.test(t)&&!DOBRZY.test(t))){p.auto="off";p.powod="zbrodnie";}
    else if(REGION.test(o.mn||"")){p.auto="off";p.powod="region";}
    else if(!o.lista&&!znanaPostac(o,P.progi_postaci)){p.auto="off";p.powod="malo_znany";}
    p.rodzaj=rodzajPostaci(o);
  }
  for(const o of S.miejsca||[]){
    const rodzaje=[...new Set((o.rodzaje||[]).map(r=>r.replace(/\d+$/,"")))];
    const p=dodaj("miejsca",o,{rok:o.rok,rodzaje});if(p.auto!=="gra")continue;
    if(!znany(o,"miejsca")){p.auto="off";p.powod="malo_znany";}
    else if(rodzaje.some(r=>encR.has(r))){p.auto="enc";p.powod="rodzaj";}
  }
  for(const o of S.wydarzenia||[]){const p=dodaj("wydarzenia",o,{rok:o.rok});if(p.auto!=="gra")continue;if(!znany(o,"wydarzenia")){p.auto="off";p.powod="malo_znany";}}
  // wpisy dodane w panelu
  for(const d of P.dodane||[]){
    const g=d.g&&GMK.get(d.g),wsp=d.wsp||(g?punktW(g):null);
    const p=dodaj(d.kat||"miejsca",{q:d.id,n:d.n,opis:d.opis,wsp,sl:0,odsl:null,img:d.img,art:d.art},{mn:d.mn,ur:d.ur,zm:d.zm,rok:d.rok,rodzaje:d.rodzaje||[],pl:d.pl!==false,dodany:true});
    if(p.auto==="off"&&p.powod==="bez_nazwy"&&p.n)p.auto="gra";
  }
  // zmiany pól i decyzje z panelu
  const ZM=P.zmiany||{},DEC=P.decyzje||{};
  for(const p of wszystkie){
    const z=ZM[p.id];
    if(z){["n","opis","mn","ciek","ur","zm","rok"].forEach(k=>{if(z[k]!==undefined&&z[k]!=="")p[k]=z[k];});
      if(z.g&&GMK.get(z.g)){const g=GMK.get(z.g);p.g=g.k;p.gn=g.n;const pw=POWK.get(g.k.slice(0,4))||POW.find(x=>wSrodku(...punktW(g),x));p.p=pw?pw.k:p.p;if(!z.wsp)p.wsp=punktW(g);if(p.auto==="off"&&p.powod==="poza"){p.auto="gra";p.powod=null;}}
      if(Array.isArray(z.wsp)){p.wsp=z.wsp;const a=przypisz(z.wsp);if(a&&!z.g)Object.assign(p,a);}
      p.zmieniony=true;}
    const d=DEC[p.id];p.s=d==="gra"||d==="enc"||d==="off"?d:p.auto;
    if(d==="off"&&!p.powod)p.powod="recznie";
  }
  // drogi: numer -> powiaty, przez które przechodzi (po środkach odcinków)
  const dr={};
  for(const o of S.drogi||[]){const p=powiat(o.wsp[0],o.wsp[1]);if(!p)continue;
    const d=dr[o.ref]||(dr[o.ref]={ref:o.ref,typ:o.ref[0]==="A"?"autostrada":"ekspresowa",powiaty:{}});d.powiaty[p.k]=(d.powiaty[p.k]||0)+1;}
  const NAZWY_DROG=Object.assign({A1:"Autostrada Bursztynowa",A2:"Autostrada Wolności"},(P.drogi||{}).nazwy||{});
  const drogi=Object.values(dr).map(d=>({ref:d.ref,typ:d.typ,nazwa:NAZWY_DROG[d.ref]||null,powiaty:Object.keys(d.powiaty).filter(k=>d.powiaty[k]>=2||Object.keys(d.powiaty).length<6).sort(),
    woj:[...new Set(Object.keys(d.powiaty).map(k=>k.slice(0,2)))].sort()})).sort((a,b)=>a.ref.localeCompare(b.ref,"pl",{numeric:true}));
  // ocena rozpoznawalności i zapis
  const ocena=o=>+(Math.log10((o.odsl||0)+10)+1.2*Math.log10(Math.max(1,o.sl||1))+(o.kat==="ludzie"?(o.lista?0.6:PREMIA_POSTACI[o.rodzaj]||0):0)).toFixed(2);
  wszystkie.forEach(o=>o.pkt=ocena(o));wszystkie.sort((a,b)=>b.pkt-a.pkt);
  const doGry=o=>{const x={q:o.id,n:o.n,opis:o.opis,wsp:o.wsp,g:o.g,gn:o.gn,p:o.p,pkt:o.pkt};
    if(o.s==="enc")x.s="e";if(o.ciek)x.ciek=o.ciek;if(o.img)x.img=o.img;if(o.art)x.art=o.art;
    if(o.kat==="ludzie"){x.mn=o.mn;x.ur=o.ur;x.zm=o.zm;x.pl=o.pl;}else{x.rok=o.rok;if(o.rodzaje&&o.rodzaje.length)x.rodzaje=o.rodzaje;}return x;};
  const gra={zbudowano:S.zbudowano,zrodla:S.zrodla};
  ["ludzie","miejsca","wydarzenia"].forEach(k=>gra[k]=wszystkie.filter(o=>o.kat===k&&o.s!=="off"&&o.p).map(doGry));
  gra.drogi=drogi;
  fs.writeFileSync(path.join(KAT,"odkrycia.json"),JSON.stringify(gra));
  const panel=wszystkie.map(o=>{const x={id:o.id,kat:o.kat,rodzaj:o.rodzaj,lista:o.lista,n:o.n,opis:o.opis,mn:o.mn,gn:o.gn,g:o.g,p:o.p,odsl:o.odsl,sl:o.sl,pkt:o.pkt,art:o.art,auto:o.auto,powod:o.powod,s:o.s};
    ["ur","zm","rok","rodzaje","pl","naz","wyrok","watpliwe","ciek","dodany","zmieniony","mn_oryg"].forEach(k=>{if(o[k]!==undefined&&o[k]!==null&&!(Array.isArray(o[k])&&!o[k].length))x[k]=o[k];});return x;});
  fs.writeFileSync(path.join(__dirname,"odkrycia-wszystkie.json"),JSON.stringify({zbudowano:S.zbudowano,powody:POWODY,progi:pr,pozycje:panel}));
  // podsumowanie: liczby, pokrycie powiatów i gmin
  const wGrze=wszystkie.filter(o=>o.s==="gra"&&o.p),ileP={},ileG={};wGrze.forEach(o=>{ileP[o.p]=(ileP[o.p]||0)+1;if(o.g)ileG[o.g]=(ileG[o.g]||0)+1;});
  const typG={1:"miejskie",2:"wiejskie",3:"miejsko-wiejskie"},gminyTyp={};GM.forEach(g=>{const t=typG[g.k.slice(-1)];gminyTyp[t]=gminyTyp[t]||{wszystkie:0,z_czyms:0};gminyTyp[t].wszystkie++;if(ileG[g.k])gminyTyp[t].z_czyms++;});
  const liczby={};["ludzie","miejsca","wydarzenia"].forEach(k=>{liczby[k]={gra:0,enc:0,off:0};wszystkie.filter(o=>o.kat===k).forEach(o=>liczby[k][o.s]++);});
  const powody={};wszystkie.filter(o=>o.s==="off").forEach(o=>powody[o.powod]=(powody[o.powod]||0)+1);
  const pod={zbudowano:S.zbudowano,progi:pr,liczby,drogi:drogi.length,powody,
    lista_brak:S.lista_brak||[],lista_poza:wszystkie.filter(o=>o.lista&&o.s==="off").map(o=>o.n+" ("+(o.powod||"")+")"),
    powiaty:{wszystkie:POW.length,z_czyms:Object.keys(ileP).length,z_trzema:Object.values(ileP).filter(v=>v>=3).length,bez:POW.filter(p=>!ileP[p.k]).map(p=>p.k+" "+p.n)},
    gminy:{wszystkie:GM.length,z_czyms:Object.keys(ileG).length,z_dwoma:Object.values(ileG).filter(v=>v>=2).length,wg_typu:gminyTyp}};
  fs.writeFileSync(path.join(__dirname,"odkrycia-podsumowanie.json"),JSON.stringify(pod,null,1));
  const {bez,...pw}=pod.powiaty;console.log(JSON.stringify({liczby,powody,powiaty:pw,gminy:pod.gminy},null,1));
}
if(require.main===module)main();
module.exports={warstwa,indeks,wSrodku,punktW};
