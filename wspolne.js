/* Wspólne funkcje dla gier „Znasz Polskę?”: dane miast, województwa, rzutowanie map, wysokość ekranu. */
(function(){
const $=id=>document.getElementById(id);
const norm=s=>s.toLowerCase()
  .replace(/ą/g,"a").replace(/ć/g,"c").replace(/ę/g,"e").replace(/ł/g,"l")
  .replace(/ń/g,"n").replace(/ó/g,"o").replace(/ś/g,"s").replace(/[żź]/g,"z")
  .normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]/g,"");
const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const pick=a=>a[Math.floor(Math.random()*a.length)];
function fetchT(url,opt,ms){
  const ac=new AbortController(),t=setTimeout(()=>ac.abort(),ms);
  return fetch(url,Object.assign({},opt,{signal:ac.signal})).finally(()=>clearTimeout(t));
}
const fmt=n=>Math.round(n).toLocaleString("pl-PL");
function km(a,b){ // odległość po kuli
  const R=6371,r=Math.PI/180,dLat=(b.lat-a.lat)*r,dLon=(b.lon-a.lon)*r;
  const h=Math.sin(dLat/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin(dLon/2)**2;
  return 2*R*Math.asin(Math.sqrt(h));
}

/* ---- województwa ---- */
let WOJ=null;
function inRing(x,y,ring){let c=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const xi=ring[i][0],yi=ring[i][1],xj=ring[j][0],yj=ring[j][1];if(((yi>y)!==(yj>y))&&(x<(xj-xi)*(y-yi)/(yj-yi)+xi))c=!c;}return c;}
function bboxOf(ring){let a=[1e9,1e9,-1e9,-1e9];ring.forEach(([x,y])=>{if(x<a[0])a[0]=x;if(y<a[1])a[1]=y;if(x>a[2])a[2]=x;if(y>a[3])a[3]=y;});return a;}
async function loadWoj(){
  if(WOJ)return WOJ;
  const gj=await (await fetch("woj.geojson?v=8")).json();
  WOJ=gj.features.map(f=>{const g=f.geometry,rings=g.type==="Polygon"?[g.coordinates[0]]:g.coordinates.map(p=>p[0]);return {name:f.properties.nazwa,rings,bb:rings.map(bboxOf),f};});
  return WOJ;
}
function wojOf(lon,lat){
  if(!WOJ)return null;
  for(const w of WOJ)for(let i=0;i<w.rings.length;i++){const b=w.bb[i];if(lon<b[0]||lon>b[2]||lat<b[1]||lat>b[3])continue;if(inRing(lon,lat,w.rings[i]))return w.name;}
  return null;
}

/* ---- miasta: ta sama pamięć co w grze „Miasta na czas” ---- */
const CACHE_KEY="pl-miasta-osm-v2";
const FALLBACK=[["Warszawa",52.23,21.01,1790658],["Kraków",50.06,19.94,804237],["Łódź",51.77,19.46,658444],["Wrocław",51.11,17.03,672929],["Poznań",52.41,16.93,546859],["Gdańsk",54.35,18.65,486492],["Szczecin",53.43,14.55,396168],["Bydgoszcz",53.12,18.00,339053],["Lublin",51.25,22.57,331243],["Białystok",53.13,23.16,294143],["Katowice",50.26,19.02,286960],["Gdynia",54.52,18.53,239866],["Częstochowa",50.81,19.12,214342],["Radom",51.40,21.15,201601],["Rzeszów",50.04,22.00,196374],["Toruń",53.01,18.60,196935],["Sosnowiec",50.28,19.13,190533],["Kielce",50.87,20.63,190411],["Gliwice",50.29,18.67,174071],["Olsztyn",53.78,20.49,169793],["Zabrze",50.32,18.79,169422],["Bielsko-Biała",49.82,19.05,169756],["Bytom",50.35,18.92,158056],["Zielona Góra",51.94,15.51,140403],["Rybnik",50.10,18.55,136318],["Ruda Śląska",50.26,18.86,131902],["Opole",50.67,17.93,127653],["Tychy",50.13,18.99,126162],["Gorzów Wielkopolski",52.73,15.24,119020],["Dąbrowa Górnicza",50.32,19.20,116508],["Elbląg",54.16,19.40,117390],["Płock",52.55,19.71,116962],["Wałbrzych",50.77,16.28,110479],["Włocławek",52.65,19.07,106928],["Tarnów",50.01,20.99,105922],["Chorzów",50.30,18.95,105320],["Koszalin",54.19,16.18,105580],["Kalisz",51.76,18.09,97905],["Legnica",51.21,16.16,96854],["Grudziądz",53.48,18.75,92552],["Jaworzno",50.20,19.27,89545],["Słupsk",54.46,17.03,89026],["Jastrzębie-Zdrój",49.95,18.60,84652],["Nowy Sącz",49.62,20.70,82831],["Jelenia Góra",50.90,15.73,77366],["Siedlce",52.17,22.29,77354],["Mysłowice",50.21,19.13,73015],["Konin",52.22,18.25,71427],["Piła",53.15,16.74,71846],["Piotrków Trybunalski",51.40,19.70,71252],["Inowrocław",52.80,18.26,70000],["Lubin",51.40,16.20,69000],["Ostrów Wielkopolski",51.65,17.81,71000],["Suwałki",54.10,22.93,69000],["Stargard",53.34,15.05,67000],["Gniezno",52.53,17.60,67000],["Ostrowiec Świętokrzyski",50.93,21.39,66000],["Siemianowice Śląskie",50.33,19.03,65000],["Głogów",51.66,16.08,64000],["Pabianice",51.66,19.35,63000],["Leszno",51.84,16.58,62000],["Zamość",50.72,23.25,62000],["Łomża",53.18,22.06,61000],["Żory",50.05,18.70,60000],["Pruszków",52.17,20.81,62000],["Ełk",53.83,22.36,61000],["Tomaszów Mazowiecki",51.53,20.01,60000],["Chełm",51.13,23.47,59000],["Mielec",50.29,21.42,58000],["Kędzierzyn-Koźle",50.35,18.23,58000],["Przemyśl",49.78,22.77,58000],["Stalowa Wola",50.58,22.05,57000],["Tczew",54.09,18.78,58000],["Biała Podlaska",52.03,23.12,56000],["Bełchatów",51.37,19.37,54000],["Świdnica",50.84,16.49,54000],["Będzin",50.33,19.13,54000],["Zgierz",51.86,19.41,54000],["Piekary Śląskie",50.38,18.95,53000],["Racibórz",50.09,18.22,53000],["Legionowo",52.40,20.93,52000],["Ostrołęka",53.09,21.57,51000],["Świnoujście",53.91,14.25,40000],["Starachowice",51.05,21.07,48000],["Wejherowo",54.60,18.24,49000],["Zawiercie",50.49,19.42,48000],["Puławy",51.42,21.97,46000],["Skierniewice",51.96,20.15,47000],["Starogard Gdański",53.97,18.53,47000],["Tarnobrzeg",50.57,21.68,46000],["Krosno",49.69,21.77,45000],["Nysa",50.47,17.33,43000],["Kutno",52.23,19.36,42000],["Sieradz",51.60,18.73,41000],["Ciechanów",52.88,20.62,43000],["Szczecinek",53.71,16.70,40000],["Świętochłowice",50.29,18.92,48000],["Nowa Sól",51.80,15.72,38000],["Żyrardów",52.05,20.44,40000],["Zduńska Wola",51.60,18.94,41000],["Malbork",54.04,19.03,38000],["Kołobrzeg",54.18,15.58,46000],["Piaseczno",52.08,21.02,48000],["Otwock",52.11,21.26,44000],["Oświęcim",50.03,19.22,37000],["Chrzanów",50.14,19.40,36000],["Olkusz",50.28,19.57,35000],["Wodzisław Śląski",50.00,18.47,47000],["Kwidzyn",53.73,18.93,37000],["Knurów",50.22,18.66,38000],["Sanok",49.56,22.21,37000],["Wołomin",52.35,21.24,37000],["Grodzisk Mazowiecki",52.11,20.62,32000],["Mińsk Mazowiecki",52.18,21.57,40000],["Sochaczew",52.23,20.24,37000],["Bolesławiec",51.26,15.57,38000],["Dębica",50.05,21.41,45000],["Jarosław",50.02,22.68,37000],["Jasło",49.75,21.47,34000],["Łuków",51.93,22.38,29000],["Lubartów",51.46,22.61,21000],["Kraśnik",50.92,22.22,33000],["Świdnik",51.22,22.70,39000],["Puck",54.72,18.41,11000],["Rumia",54.57,18.40,50000],["Sopot",54.44,18.56,35000],["Reda",54.61,18.35,26000],["Pruszcz Gdański",54.26,18.64,32000],["Chojnice",53.70,17.56,39000],["Lębork",54.54,17.75,34000],["Bytów",54.17,17.49,17000],["Iława",53.60,19.57,32000],["Ostróda",53.70,19.97,32000],["Giżycko",54.04,21.77,29000],["Kętrzyn",54.07,21.38,27000],["Bartoszyce",54.25,20.81,23000],["Mrągowo",53.87,21.30,21000],["Szczytno",53.56,21.00,23000],["Działdowo",53.24,20.18,21000],["Braniewo",54.38,19.83,17000],["Augustów",53.84,23.00,30000],["Bielsk Podlaski",52.77,23.19,25000],["Hajnówka",52.74,23.58,21000],["Zambrów",52.98,22.24,22000],["Grajewo",53.65,22.45,21000],["Sokółka",53.41,23.50,18000],["Włodawa",51.55,23.55,13000],["Krasnystaw",50.98,23.17,18000],["Hrubieszów",50.81,23.89,17000],["Tomaszów Lubelski",50.45,23.42,19000],["Biłgoraj",50.54,22.72,26000],["Nowy Targ",49.48,20.03,33000],["Zakopane",49.30,19.95,27000],["Wadowice",49.88,19.49,18000],["Andrychów",49.85,19.34,20000],["Żywiec",49.69,19.19,31000],["Cieszyn",49.75,18.63,34000],["Pszczyna",49.98,18.95,25000],["Mikołów",50.17,18.90,40000],["Lubliniec",50.67,18.68,23000],["Tarnowskie Góry",50.44,18.86,60000],["Kluczbork",50.97,18.22,23000],["Brzeg",50.86,17.47,35000],["Strzelce Opolskie",50.51,18.30,18000],["Prudnik",50.32,17.58,21000],["Głubczyce",50.20,17.83,12000],["Namysłów",51.08,17.72,16000],["Oleśnica",51.21,17.38,37000],["Oława",50.94,17.29,32000],["Dzierżoniów",50.73,16.65,33000],["Kłodzko",50.44,16.65,26000],["Ząbkowice Śląskie",50.59,16.81,15000],["Jawor",51.05,16.19,22000],["Złotoryja",51.13,15.92,15000],["Lubań",51.12,15.29,20000],["Zgorzelec",51.15,15.01,30000],["Kamienna Góra",50.79,16.03,18000],["Świebodzice",50.86,16.32,22000],["Wałcz",53.27,16.47,24000],["Chodzież",52.99,16.92,18000],["Wągrowiec",52.81,17.20,24000],["Śrem",52.09,17.02,29000],["Środa Wielkopolska",52.23,17.28,23000],["Września",52.33,17.57,30000],["Jarocin",51.97,17.50,25000],["Krotoszyn",51.70,17.44,28000],["Rawicz",51.61,16.86,20000],["Kościan",52.09,16.65,23000],["Nowy Tomyśl",52.32,16.13,14000],["Grodzisk Wielkopolski",52.22,16.37,14000],["Swarzędz",52.41,17.08,31000],["Luboń",52.34,16.88,32000],["Oborniki",52.65,16.81,18000],["Szamotuły",52.61,16.58,18000],["Turek",52.02,18.50,26000],["Koło",52.20,18.64,21000],["Kępno",51.28,17.99,14000],["Wolsztyn",52.11,16.12,13000],["Międzyrzecz",52.44,15.58,18000],["Świebodzin",52.25,15.53,21000],["Sulechów",52.08,15.62,17000],["Żary",51.64,15.14,36000],["Żagań",51.62,15.32,25000],["Gubin",51.95,14.74,16000],["Krosno Odrzańskie",52.05,15.09,11000],["Kostrzyn nad Odrą",52.59,14.65,17000],["Słubice",52.35,14.57,16000],["Choszczno",53.17,15.42,15000],["Myślibórz",52.92,14.87,11000],["Gryfino",53.25,14.49,21000],["Police",53.55,14.57,32000],["Goleniów",53.56,14.83,22000],["Nowogard",53.67,15.12,16000],["Kamień Pomorski",53.97,14.77,8000],["Gryfice",53.92,15.20,16000],["Białogard",54.01,15.99,23000],["Świdwin",53.78,15.78,15000],["Darłowo",54.42,16.41,13000],["Sławno",54.36,16.68,12000],["Ustka",54.58,16.86,15000],["Człuchów",53.67,17.36,13000],["Kościerzyna",54.12,18.00,23000],["Kartuzy",54.33,18.20,15000],["Chełmno",53.35,18.42,18000],["Świecie",53.41,18.45,24000],["Brodnica",53.26,19.40,27000],["Rypin",53.07,19.41,16000],["Lipno",52.85,19.18,14000],["Ciechocinek",52.88,18.79,10000],["Sierpc",52.86,19.67,18000],["Mława",53.11,20.38,30000],["Płońsk",52.62,20.38,22000],["Pułtusk",52.70,21.08,19000],["Wyszków",52.59,21.46,26000],["Nowy Dwór Mazowiecki",52.44,20.72,28000],["Ostrów Mazowiecka",52.80,21.89,22000],["Sokołów Podlaski",52.41,22.25,18000],["Garwolin",51.90,21.61,17000],["Dęblin",51.56,21.85,15000],["Kozienice",51.58,21.55,17000],["Grójec",51.86,20.87,16000],["Marki",52.32,21.11,37000],["Ząbki",52.29,21.11,38000],["Konstancin-Jeziorna",52.09,21.12,17000],["Rawa Mazowiecka",51.77,20.25,17000],["Łowicz",52.11,19.94,27000],["Radomsko",51.07,19.44,44000],["Opoczno",51.38,20.29,21000],["Końskie",51.19,20.41,19000],["Skarżysko-Kamienna",51.11,20.88,44000],["Sandomierz",50.68,21.75,23000],["Busko-Zdrój",50.47,20.72,16000],["Jędrzejów",50.64,20.30,15000],["Bochnia",49.97,20.43,30000],["Brzesko",49.97,20.61,17000],["Wieliczka",49.98,20.06,23000],["Skawina",49.98,19.83,24000],["Myślenice",49.83,19.94,18000],["Limanowa",49.71,20.42,15000],["Gorlice",49.66,21.16,26000],["Krynica-Zdrój",49.42,20.96,11000],["Łańcut",50.07,22.23,17000]];
async function loadCities(status){
  status=status||(()=>{});
  await loadWoj().catch(()=>{});
  try{
    const o=JSON.parse(localStorage.getItem(CACHE_KEY)||"null");
    if(o&&o.cities&&o.cities.length>400){
      o.cities.forEach(c=>{if(!c.woj)c.woj=wojOf(c.lon,c.lat);});
      status(o.cities.length+" miast (OSM, pobrane "+new Date(o.ts).toLocaleDateString("pl-PL")+")");
      return o.cities;
    }
  }catch(e){}
  status("Pobieram listę miast z OpenStreetMap…");
  const q='[out:json][timeout:90];area["ISO3166-1"="PL"][admin_level=2]->.pl;(node["place"~"^(city|town)$"](area.pl););out body;';
  for(const h of ["https://overpass-api.de/api/interpreter","https://overpass.kumi.systems/api/interpreter"]){
    try{
      const res=await fetchT(h,{method:"POST",body:"data="+encodeURIComponent(q)},45000);
      if(!res.ok)throw 0;
      const j=await res.json(),seen=new Set();
      const all=j.elements.filter(e=>e.tags&&e.tags.name).map(e=>({
        name:e.tags.name.trim(),lat:e.lat,lon:e.lon,
        pop:parseInt((e.tags.population||"0").replace(/\D/g,""),10)||0
      })).filter(c=>{const k=norm(c.name)+"|"+c.lat.toFixed(2);if(seen.has(k))return false;seen.add(k);return true;});
      if(all.length<400)throw 0;
      all.forEach(c=>{c.woj=wojOf(c.lon,c.lat);});
      try{localStorage.setItem(CACHE_KEY,JSON.stringify({ts:Date.now(),cities:all}));}catch(e){}
      status(all.length+" miast (OSM, pobrane dziś)");
      return all;
    }catch(e){}
  }
  status("Brak połączenia z OSM: wbudowana lista "+FALLBACK.length+" miast");
  return FALLBACK.map(([name,lat,lon,pop])=>({name,lat,lon,pop,woj:wojOf(lon,lat)}));
}

/* ---- rzutowanie lon/lat na SVG ---- */
function projection(features,W,pad){
  pad=pad||0;
  let b=[1e9,1e9,-1e9,-1e9];
  const each=(g,fn)=>{const polys=g.type==="Polygon"?[g.coordinates]:g.coordinates;polys.forEach(p=>p.forEach(r=>r.forEach(fn)));};
  features.forEach(f=>each(f.geometry,([x,y])=>{if(x<b[0])b[0]=x;if(y<b[1])b[1]=y;if(x>b[2])b[2]=x;if(y>b[3])b[3]=y;}));
  const k=Math.cos((b[1]+b[3])/2*Math.PI/180);
  const w=(b[2]-b[0])*k,h=b[3]-b[1],s=(W-2*pad)/w,H=h*s+2*pad;
  const P={W,H,
    x:lon=>pad+(lon-b[0])*k*s, y:lat=>pad+(b[3]-lat)*s,
    lon:x=>(x-pad)/(k*s)+b[0], lat:y=>b[3]-(y-pad)/s,
    // pełne granice, ale bez punktów bliższych niż ~pół piksela (niewidoczne, a spowalniają telefon)
    path(g,tol){tol=tol==null?0.6:tol;const polys=g.type==="Polygon"?[g.coordinates]:g.coordinates;let d="";
      polys.forEach(p=>p.forEach(r=>{let out=[],lx=1e9,ly=1e9;
        for(let i=0;i<r.length;i++){const x=P.x(r[i][0]),y=P.y(r[i][1]);if(i===r.length-1||Math.abs(x-lx)+Math.abs(y-ly)>=tol){out.push(x.toFixed(1)+" "+y.toFixed(1));lx=x;ly=y;}}
        if(out.length>2)d+="M"+out.join("L")+"Z";}));return d;}
  };
  return P;
}

/* ---- telefon: wysokość widocznego ekranu (klawiatura) ---- */
function fitViewport(){
  const vv=window.visualViewport;
  const fit=()=>{document.documentElement.style.setProperty("--app-h",(vv?vv.height:innerHeight)+"px");if(vv&&vv.offsetTop)scrollTo(0,0);};
  (vv||window).addEventListener("resize",fit);fit();
}
function registerSW(){if("serviceWorker" in navigator&&location.protocol==="https:")navigator.serviceWorker.register("sw.js",{updateViaCache:"none"}).then(r=>r.update()).catch(()=>{});}

/* ---- powiaty: pełne granice PRG (TopoJSON), sąsiedztwo ze wspólnych odcinków granic ---- */
const WOJ_KOD={"02":"dolnośląskie","04":"kujawsko-pomorskie","06":"lubelskie","08":"lubuskie","10":"łódzkie","12":"małopolskie","14":"mazowieckie","16":"opolskie","18":"podkarpackie","20":"podlaskie","22":"pomorskie","24":"śląskie","26":"świętokrzyskie","28":"warmińsko-mazurskie","30":"wielkopolskie","32":"zachodniopomorskie"};
let POWC=null;
async function loadPowiaty(){
  if(POWC)return POWC;
  const t=await (await fetch("powiaty.topojson?v=8")).json();
  const o=t.objects.powiaty,nbi=topojson.neighbors(o.geometries),fs=topojson.feature(t,o).features;
  POWC=fs.map((f,i)=>{
    const k=f.properties.k,n=f.properties.n,city=+k.slice(2)>=60;
    let b=[1e9,1e9,-1e9,-1e9];
    const polys=f.geometry.type==="Polygon"?[f.geometry.coordinates]:f.geometry.coordinates;
    polys.forEach(p=>p[0].forEach(([x,y])=>{if(x<b[0])b[0]=x;if(y<b[1])b[1]=y;if(x>b[2])b[2]=x;if(y>b[3])b[3]=y;}));
    return {f,k,n,city,woj:WOJ_KOD[k.slice(0,2)],bb:b,lon:(b[0]+b[2])/2,lat:(b[1]+b[3])/2,
      label:city?"m. "+n:n,full:(city?"miasto ":"powiat ")+n,short:n,nbi:nbi[i]};
  });
  POWC.forEach(p=>{p.nb=p.nbi.map(i=>POWC[i].k);});
  return POWC;
}

/* ---- zakresy wielkości miast: raz wszystkie, raz tylko małe ---- */
const ZAKRESY=[
  ["d","duże","ponad 100 tys."],
  ["s","średnie","20 do 100 tys."],
  ["m","małe","poniżej 20 tys."]
];
// pole wyboru wielkości: można zaznaczyć kilka naraz, domyślnie wszystkie
function zakresy(el,domyslny){
  const zapis=localStorage.getItem("zakres-"+(el.dataset.klucz||"pl"));
  const stan=domyslny||zapis||"dsm";
  el.classList.add("chk");
  el.innerHTML=ZAKRESY.map(([v,t,p])=>
    '<label><input type="checkbox" value="'+v+'"'+(stan.indexOf(v)>=0?" checked":"")+'><b>'+t+'</b><small>'+p+'</small></label>').join("");
  el.addEventListener("change",()=>{
    if(!zakresStan(el,true))el.querySelectorAll("input").forEach(i=>i.checked=true);
    try{localStorage.setItem("zakres-"+(el.dataset.klucz||"pl"),zakresStan(el));}catch(e){}
  });
}
function zakresStan(el,surowe){
  const v=[...el.querySelectorAll("input")].filter(i=>i.checked).map(i=>i.value).join("");
  return surowe?v:(v||"dsm");
}
function wZakresie(c,stan){
  stan=stan||"dsm";
  const p=c.pop||0;
  if(p>=100000)return stan.indexOf("d")>=0;
  if(p>=20000)return stan.indexOf("s")>=0;
  return stan.indexOf("m")>=0;
}

/* ---- tryb nauki: to, co sprawia kłopot, wraca częściej ---- */
const NAUKA="nauka-v1";
let NAU=null;
function nauka(){
  if(!NAU){try{NAU=JSON.parse(localStorage.getItem(NAUKA)||"{}");}catch(e){NAU={};}}
  return NAU;
}
function zapisz(kind,id,ok){
  const s=nauka(),k=kind+":"+id,r=s[k]||{ok:0,no:0};
  if(ok)r.ok++;else r.no++;
  r.t=Date.now();s[k]=r;
  try{localStorage.setItem(NAUKA,JSON.stringify(s));}catch(e){}
}
function waga(kind,id){
  const r=nauka()[kind+":"+id];
  if(!r)return 1.6;                       // nieznane: trochę częściej niż opanowane
  const w=1+1.8*r.no-0.55*r.ok;
  return Math.max(0.35,Math.min(6,w));
}
function opanowane(kind,id){
  const r=nauka()[kind+":"+id];
  return r?(r.ok-r.no>=2?"dobrze":r.no>r.ok?"slabo":"srednio"):"nowe";
}
function statystyki(kind){
  const s=nauka(),out={nowe:0,slabo:0,srednio:0,dobrze:0,ok:0,no:0};
  Object.keys(s).forEach(k=>{
    if(kind&&k.indexOf(kind+":")!==0)return;
    const r=s[k];out.ok+=r.ok;out.no+=r.no;
    out[r.ok-r.no>=2?"dobrze":r.no>r.ok?"slabo":"srednio"]++;
  });
  return out;
}
// losowanie ważone bez powtórzeń: częściej to, co idzie słabo
function losujNauka(items,kind,idOf,n,uczSie){
  const left=items.slice(),out=[];
  while(out.length<n&&left.length){
    let ws=left.map(it=>uczSie===false?1:waga(kind,idOf(it))),sum=ws.reduce((a,b)=>a+b,0),r=Math.random()*sum,i=0;
    while(r>ws[i]&&i<left.length-1){r-=ws[i];i++;}
    out.push(left.splice(i,1)[0]);
  }
  return out;
}

/* ---- sąsiedztwo województw (z sąsiedztwa powiatów) ---- */
async function wojSasiedzi(){
  const pw=await loadPowiaty(),by={};pw.forEach(p=>by[p.k]=p);
  const m={};
  pw.forEach(p=>{
    const a=p.k.slice(0,2);m[a]=m[a]||new Set();
    p.nb.forEach(k=>{const b=k.slice(0,2);if(b!==a)m[a].add(b);});
  });
  const out={};Object.keys(m).forEach(k=>out[k]=[...m[k]]);
  return out;
}

/* ---- losowanie powtarzalne (to samo dla wszystkich w danym dniu) ---- */
function seeded(str){let h=1779033703^str.length;for(let i=0;i<str.length;i++){h=Math.imul(h^str.charCodeAt(i),3432918353);h=h<<13|h>>>19;}
  let a=h>>>0;return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function dayKey(d){d=d||new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");}
window.ZP={$,WOJ_KOD,loadPowiaty,ZAKRESY,zakresy,zakresStan,wZakresie,zapisz,waga,opanowane,statystyki,losujNauka,wojSasiedzi,nauka,seeded,dayKey,FALLBACK,norm,shuffle,pick,fetchT,fmt,km,loadWoj,wojOf,loadCities,projection,fitViewport,registerSW,inRing};
})();
