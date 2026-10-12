/* Odkrycia: przypisanie surowych danych (narzedzia/odkrycia-surowe.json) do gmin i powiatów po współrzędnych.
   Uruchomienie: node narzedzia/odkrycia_przetworz.cjs  →  odkrycia.json (dane do gry) i narzedzia/odkrycia-podsumowanie.json
   Punkt w wielokącie na granicach z gminy.topojson i powiaty.topojson (z dziurami: miasta na prawach powiatu w środku powiatów). */
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

const POW=warstwa("powiaty.topojson","powiaty"),GM=warstwa("gminy.topojson","gminy",f=>/^[0-9]{6}[123]$/.test(String(f.properties.k)));
const powiat=indeks(POW),gmina=indeks(GM);
const WOJ={"02":"dolnośląskie","04":"kujawsko-pomorskie","06":"lubelskie","08":"lubuskie","10":"łódzkie","12":"małopolskie","14":"mazowieckie","16":"opolskie","18":"podkarpackie","20":"podlaskie","22":"pomorskie","24":"śląskie","26":"świętokrzyskie","28":"warmińsko-mazurskie","30":"wielkopolskie","32":"zachodniopomorskie"};
// obywatelstwa uznawane za polskie: Polska, II RP, PRL, Królestwo Polskie, Rzeczpospolita Obojga Narodów, Księstwo Warszawskie, Królestwo Kongresowe
const POLSKIE=new Set(["Q36","Q207272","Q170366","Q1649871","Q172107","Q154195","Q152525","Q1179225","Q2569593","Q29993"]);

function przypisz(o){
  if(!o.wsp)return null;const [lon,lat]=o.wsp,p=powiat(lon,lat);if(!p)return null;const g=gmina(lon,lat);
  return {p:p.k,g:g?g.k:null,gn:g?g.n:null};
}
function main(){
  const S=wczytaj("narzedzia/odkrycia-surowe.json"),poza={ludzie:0,miejsca:0,wydarzenia:0,drogi:0};
  const ludzie=[],miejsca=[],wydarzenia=[];
  for(const o of S.ludzie||[]){const a=przypisz(o);if(!a){poza.ludzie++;continue;}
    ludzie.push({q:o.q,n:o.n,opis:o.opis||null,ur:o.ur,zm:o.zm,mn:o.mn,m:o.m,wsp:o.wsp,...a,sl:o.sl,img:o.img||null,art:o.art,zaw:o.zaw||[],
      pl:(o.obyw||[]).some(x=>POLSKIE.has(x)),watpliwe:o.inne_m&&o.inne_m.length?o.inne_m:undefined});}
  for(const o of S.miejsca||[]){const a=przypisz(o);if(!a){poza.miejsca++;continue;}
    miejsca.push({q:o.q,n:o.n,opis:o.opis||null,wsp:o.wsp,...a,sl:o.sl,img:o.img||null,art:o.art||null,rok:o.rok,rodzaje:o.rodzaje});}
  for(const o of S.wydarzenia||[]){const a=przypisz(o);if(!a){poza.wydarzenia++;continue;}
    wydarzenia.push({q:o.q,n:o.n,opis:o.opis||null,wsp:o.wsp,...a,sl:o.sl,rok:o.rok,img:o.img||null,art:o.art});}
  // drogi: numer -> powiaty, przez które przechodzi (po środkach odcinków)
  const dr={};
  for(const o of S.drogi||[]){const p=powiat(o.wsp[0],o.wsp[1]);if(!p){poza.drogi++;continue;}
    const d=dr[o.ref]||(dr[o.ref]={ref:o.ref,typ:o.ref[0]==="A"?"autostrada":"ekspresowa",powiaty:{},nazwy:{}});
    d.powiaty[p.k]=(d.powiaty[p.k]||0)+1;if(o.nazwa)d.nazwy[o.nazwa]=(d.nazwy[o.nazwa]||0)+1;}
  const drogi=Object.values(dr).map(d=>({ref:d.ref,typ:d.typ,powiaty:Object.keys(d.powiaty).filter(k=>d.powiaty[k]>=2||Object.keys(d.powiaty).length<6).sort(),
    woj:[...new Set(Object.keys(d.powiaty).map(k=>k.slice(0,2)))].sort(),nazwa:Object.entries(d.nazwy).sort((a,b)=>b[1]-a[1]).map(x=>x[0]).find(n=>/autostrada|droga|obwodnica/i.test(n))||null}))
    .sort((a,b)=>a.ref.localeCompare(b.ref,"pl",{numeric:true}));
  ludzie.sort((a,b)=>b.sl-a.sl);miejsca.sort((a,b)=>b.sl-a.sl);wydarzenia.sort((a,b)=>b.sl-a.sl);
  const wynik={zbudowano:S.zbudowano,zrodla:S.zrodla,ludzie,miejsca,wydarzenia,drogi};
  fs.writeFileSync(path.join(KAT,"odkrycia.json"),JSON.stringify(wynik));
  // podsumowanie: pokrycie powiatów i województw
  const naPow={};POW.forEach(p=>naPow[p.k]={n:p.n,ludzie:0,miejsca:0,wydarzenia:0,drogi:0});
  ludzie.forEach(o=>naPow[o.p].ludzie++);miejsca.forEach(o=>naPow[o.p].miejsca++);wydarzenia.forEach(o=>naPow[o.p].wydarzenia++);drogi.forEach(d=>d.powiaty.forEach(k=>naPow[k]&&naPow[k].drogi++));
  const rodzaje={};miejsca.forEach(o=>o.rodzaje.forEach(r=>rodzaje[r]=(rodzaje[r]||0)+1));
  const pod={zbudowano:S.zbudowano,liczby:{ludzie:ludzie.length,ludzie_polacy:ludzie.filter(o=>o.pl).length,miejsca:miejsca.length,wydarzenia:wydarzenia.length,drogi:drogi.length},poza,rodzaje,
    powiaty_bez_niczego:Object.entries(naPow).filter(([,v])=>!v.ludzie&&!v.miejsca&&!v.wydarzenia).map(([k,v])=>k+" "+v.n),
    powiaty_bez_ludzi:Object.values(naPow).filter(v=>!v.ludzie).length,powiaty_bez_miejsc:Object.values(naPow).filter(v=>!v.miejsca).length,naPow,
    woj:Object.fromEntries(Object.entries(WOJ).map(([k,n])=>[n,{ludzie:ludzie.filter(o=>o.p.startsWith(k)).length,miejsca:miejsca.filter(o=>o.p.startsWith(k)).length,wydarzenia:wydarzenia.filter(o=>o.p.startsWith(k)).length}]))};
  fs.writeFileSync(path.join(__dirname,"odkrycia-podsumowanie.json"),JSON.stringify(pod,null,1));
  console.log(JSON.stringify({liczby:pod.liczby,poza,rodzaje,bez_niczego:pod.powiaty_bez_niczego.length,bez_ludzi:pod.powiaty_bez_ludzi,bez_miejsc:pod.powiaty_bez_miejsc},null,1));
}
if(require.main===module)main();
module.exports={warstwa,indeks,wSrodku};
