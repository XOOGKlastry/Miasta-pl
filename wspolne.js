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
  const gj=await (await fetch("woj.geojson?v=15")).json();
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

/* ---- pasek czasu i odliczanie (wspólne dla gier) ---- */
function pasek(box,fill,sekundy,koniec,czyStop){
  const t0=Date.now();
  box.classList.remove("malo","stop");
  const id=setInterval(()=>{
    if(czyStop&&czyStop()){clearInterval(id);return;}
    const left=Math.max(0,sekundy-(Date.now()-t0)/1000);
    fill.style.width=(100*left/sekundy).toFixed(1)+"%";
    box.classList.toggle("malo",left<=sekundy*0.25);
    if(left<=0){clearInterval(id);koniec&&koniec();}
  },100);
  return id;
}
function odliczanie(el,tytul,podpis,n,gotowe,kolor){
  el.classList.remove("hidden");
  el.innerHTML='<div><b></b><div class="licz"></div><small></small></div>';
  const b=el.querySelector("b");b.textContent=tytul;if(kolor)b.style.color=kolor;
  el.querySelector("small").textContent=podpis||"";
  const licz=el.querySelector(".licz");licz.textContent=n;
  const id=setInterval(()=>{
    n--;
    if(n<=0){clearInterval(id);el.classList.add("hidden");gotowe&&gotowe();}
    else{licz.textContent=n;licz.style.animation="none";void licz.offsetWidth;licz.style.animation="";}
  },800);
  return id;
}

/* ---- fokus tylko na komputerze: na telefonie klawiatura otwiera się dopiero po stuknięciu w pole ---- */
const DOTYK=window.matchMedia&&window.matchMedia("(pointer:coarse)").matches;
function fokus(el){if(el&&!DOTYK)try{el.focus({preventScroll:true});}catch(e){}}

/* ---- pole do wpisywania odpowiedzi (tryb ekspert) z podpowiedziami nad polem ---- */
function poleWpisu(el,nazwy,onOdp,opts){
  opts=opts||{};
  el.classList.add("wpis");
  el.innerHTML='<div class="acbox"><input type="text" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" enterkeyhint="go"><div class="ac"></div></div>'
    +(opts.pokaz?'<button class="pokaz"></button>':'');
  const inp=el.querySelector("input"),ac=el.querySelector(".ac"),pok=el.querySelector(".pokaz");
  if(pok){pok.innerHTML=opts.pokazEtykieta||'Pokaż<br>podpowiedzi';pok.onclick=()=>{if(!wyl){ac.style.display="none";pok.disabled=true;opts.pokaz();}};}
  inp.placeholder=opts.placeholder||"Wpisz nazwę…";
  let items=[],sel=0,wyl=false;
  const lista=()=>typeof nazwy==="function"?nazwy():nazwy;
  function pokaz(){
    if(wyl){ac.style.display="none";return;}
    const v=norm(inp.value);
    if(v.length<2||opts.bezPodpowiedzi){ac.style.display="none";items=[];return;}
    items=[...new Set(lista().filter(n=>norm(n).startsWith(v)))].sort((a,b)=>a.localeCompare(b,"pl")).slice(0,4);
    if(!items.length){ac.style.display="none";return;}
    sel=0;
    ac.innerHTML=items.map(n=>'<div></div>').join("");
    [...ac.children].forEach((d,i)=>{d.textContent=items[i];d.onclick=()=>{inp.value=items[i];ac.style.display="none";wyslij();};});
    ac.children[0].classList.add("sel");
    ac.style.display="flex";
  }
  function wyslij(){
    if(wyl)return;
    const v=inp.value.trim();
    if(!v){fokus(inp);return;}
    ac.style.display="none";
    onOdp(v);
  }
  inp.addEventListener("input",()=>{
    // poprawna odpowiedź przechodzi od razu, bez zatwierdzania
    if(opts.poprawne&&!wyl&&pasuje(inp.value,opts.poprawne())){ac.style.display="none";onOdp(inp.value.trim());return;}
    pokaz();
  });
  inp.addEventListener("keydown",e=>{
    if(e.key==="Enter"){e.preventDefault();e.stopPropagation();if(wyl)return;if(ac.style.display==="flex"&&items.length)inp.value=items[sel];wyslij();}
    if(ac.style.display==="flex"&&items.length&&(e.key==="ArrowUp"||e.key==="ArrowDown")){
      e.preventDefault();sel=(sel+(e.key==="ArrowUp"?1:items.length-1))%items.length;
      [...ac.children].forEach((d,i)=>d.classList.toggle("sel",i===sel));
    }
  });

  return {
    focus(){fokus(inp);},
    wyczysc(){inp.value="";ac.style.display="none";},
    wylacz(b){wyl=!!b;inp.disabled=!!b;if(pok)pok.disabled=!!b;if(b)ac.style.display="none";},
    input:inp
  };
}
// czy wpisana nazwa pasuje do poprawnej (bez polskich znaków, wielkości liter i słowa „powiat”)
function pasuje(wpis,poprawne){
  if(!wpis)return false;
  const v=norm(String(wpis).replace(/^(powiat|gmina|miasto|m\.)\s+/i,""));
  return [].concat(poprawne).some(p=>norm(String(p).replace(/^(powiat|gmina|miasto|m\.)\s+/i,""))===v);
}

/* ---- łapanie nazw w trakcie pisania bez wpadki na wspólnym początku ----
   klucze: tablica znormalizowanych nazw; zwraca obiekt, który sprawdza tekst:
   „od razu” gdy żadna dłuższa, jeszcze nieodgadnięta nazwa tak się nie zaczyna,
   w przeciwnym razie „czekaj” (zatwierdzenie Enterem albo po krótkiej przerwie) */
function lapacz(klucze,czyZaliczone){
  const lista=[...new Set(klucze)];
  return function(tekst){
    const k=norm(tekst);
    if(k.length<3)return {stan:"nic"};
    const dluzsze=lista.some(x=>x!==k&&x.startsWith(k)&&!czyZaliczone(x));
    if(lista.indexOf(k)<0)return {stan:"nic"};
    return {stan:dluzsze?"czekaj":"od razu",klucz:k};
  };
}

/* ---- kontur z podkładem satelitarnym Esri; obietnica spełnia się po wczytaniu zdjęcia (najwyżej 3 s) ---- */
function ksztaltZPodkladem(svg,feature,bb,W){
  W=W||400;
  const P=projection([feature],W,14);
  svg.setAttribute("viewBox","0 0 "+W+" "+P.H.toFixed(0));
  const d=P.path(feature.geometry);
  const b=bb,x0=P.x(b[0]),x1=P.x(b[2]),y0=P.y(b[3]),y1=P.y(b[1]);
  const w=Math.max(1,x1-x0),h=Math.max(1,y1-y0);
  const bbox=[b[0],b[1],b[2],b[3]].map(v=>v.toFixed(5)).join(",");
  const url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export"
    +"?bbox="+bbox+"&bboxSR=4326&imageSR=4326&size=700,"+Math.round(700*h/w)+"&format=jpg&transparent=false&f=image";
  const id="cp"+Math.random().toString(36).slice(2,7);
  svg.classList.add("laduje");
  svg.innerHTML='<defs><clipPath id="'+id+'"><path d="'+d+'"/></clipPath></defs>'
    +'<path class="cien" d="'+d+'"/>'
    +'<image href="'+url+'" x="'+x0.toFixed(1)+'" y="'+y0.toFixed(1)+'" width="'+w.toFixed(1)+'" height="'+h.toFixed(1)+'" preserveAspectRatio="none" clip-path="url(#'+id+')"/>'
    +'<path class="obrys" d="'+d+'" fill="none"/>';
  return new Promise(ok=>{
    let done=false;const fin=()=>{if(done)return;done=true;svg.classList.remove("laduje");ok();};
    const im=svg.querySelector("image");
    im.addEventListener("load",()=>setTimeout(fin,250));im.addEventListener("error",fin);
    setTimeout(fin,3000);
  });
}

/* ---- poświata po odpowiedzi, fanfary i wiwaty po świetnym wyniku ---- */
let poswiataT=null,poswiataOk=true,sesja={ok:0,wszystkie:0};
function poswiata(ok){
  poswiataOk=poswiataOk&&ok;
  clearTimeout(poswiataT);
  poswiataT=setTimeout(()=>{
    let el=document.getElementById("zp-poswiata");
    if(!el){el=document.createElement("div");el.id="zp-poswiata";document.body.appendChild(el);}
    el.className="";void el.offsetWidth;el.className=poswiataOk?"dobrze":"zle";
    if(navigator.vibrate&&!poswiataOk)try{navigator.vibrate(60);}catch(e){}
    poswiataOk=true;
  },40);
}
let AC=null;
function audio(){try{AC=AC||new (window.AudioContext||window.webkitAudioContext)();if(AC.state==="suspended")AC.resume();return AC;}catch(e){return null;}}
document.addEventListener("pointerdown",()=>audio(),{once:true});
function fanfary(){
  // konfetti
  const c=document.createElement("canvas");c.id="zp-konfetti";document.body.appendChild(c);
  const dpr=Math.min(2,window.devicePixelRatio||1);c.width=innerWidth*dpr;c.height=innerHeight*dpr;
  const g=c.getContext("2d");g.scale(dpr,dpr);
  const kol=["#F2C14E","#FFD86B","#5DCAA5","#E8F1EE","#DC1E35","#7FD8C6"];
  const cz=[...Array(140)].map(()=>({x:innerWidth/2+(Math.random()-.5)*120,y:innerHeight*.35,vx:(Math.random()-.5)*11,vy:-Math.random()*13-4,
    r:Math.random()*6+4,a:Math.random()*6,va:(Math.random()-.5)*.3,k:kol[Math.floor(Math.random()*kol.length)]}));
  const t0=performance.now();
  (function klatka(t){
    const dt=t-t0;g.clearRect(0,0,innerWidth,innerHeight);
    cz.forEach(p=>{p.vy+=.32;p.vx*=.99;p.x+=p.vx;p.y+=p.vy;p.a+=p.va;
      g.save();g.translate(p.x,p.y);g.rotate(p.a);g.globalAlpha=Math.max(0,1-dt/3200);g.fillStyle=p.k;g.fillRect(-p.r/2,-p.r/4,p.r,p.r/2);g.restore();});
    if(dt<3200)requestAnimationFrame(klatka);else c.remove();
  })(t0);
  // fanfara i wiwaty z syntezatora (bez plików dźwiękowych)
  const a=audio();if(!a)return;
  const t=a.currentTime+.05;
  [[523.25,0,.16],[659.25,.16,.16],[783.99,.32,.16],[1046.5,.5,.55],[783.99,1.08,.14],[1046.5,1.24,.7]].forEach(([f,s,d])=>{
    [1,2.01].forEach((m,i)=>{
      const o=a.createOscillator(),v=a.createGain();o.type=i?"triangle":"sawtooth";o.frequency.value=f*m;
      v.gain.setValueAtTime(0,t+s);v.gain.linearRampToValueAtTime(i?.05:.09,t+s+.02);v.gain.exponentialRampToValueAtTime(.001,t+s+d);
      o.connect(v).connect(a.destination);o.start(t+s);o.stop(t+s+d+.05);
    });
  });
  const len=2.4,buf=a.createBuffer(1,a.sampleRate*len,a.sampleRate),dd=buf.getChannelData(0);
  for(let i=0;i<dd.length;i++){const x=i/a.sampleRate;dd[i]=(Math.random()*2-1)*(.55+.45*Math.sin(x*23+Math.sin(x*7)*3))*Math.min(1,x*3)*Math.max(0,1-(x-1)/1.4);}
  const src=a.createBufferSource(),bp=a.createBiquadFilter(),v=a.createGain();
  src.buffer=buf;bp.type="bandpass";bp.frequency.value=1400;bp.Q.value=.7;v.gain.value=.22;
  src.connect(bp).connect(v).connect(a.destination);src.start(t+.4);
}
// po pokazaniu podsumowania: fanfary, gdy wynik był bardzo dobry (co najmniej 80% trafień)
function obserwujKoniec(){
  const sprawdz=()=>{
    const s=sesja;sesja={ok:0,wszystkie:0};
    if(POJ){setTimeout(koniecRundyPoj,500);return;}
    if(s.wszystkie>=3&&s.ok/s.wszystkie>=0.8)setTimeout(fanfary,250);
  };
  ["summary","done"].forEach(id=>{
    const el=document.getElementById(id);if(!el)return;
    let byl=el.classList.contains("hidden");
    new MutationObserver(()=>{const teraz=el.classList.contains("hidden");if(byl&&!teraz)sprawdz();byl=teraz;}).observe(el,{attributes:true,attributeFilter:["class"]});
  });
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",obserwujKoniec);else obserwujKoniec();

/* ---- mapa „Gdzie to jest?”: ciemny podkład Esri bez podpisów, granice województw, przybliżanie ---- */
function mapaGdzie(el){
  const PL_B=L.latLngBounds([48.9,13.9],[55.0,24.3]);
  const map=L.map(el,{zoomControl:true,attributionControl:true,minZoom:5,maxZoom:12,maxBounds:PL_B.pad(0.4),zoomSnap:0.25});
  L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",{maxZoom:16,attribution:"Esri"}).addTo(map);
  map.fitBounds(PL_B);
  loadWoj().then(w=>L.geoJSON({type:"FeatureCollection",features:w.map(x=>x.f)},{style:()=>({color:"#6FA3AA",weight:1.2,opacity:.8,fill:false}),interactive:false}).addTo(map)).catch(()=>{});
  const ov=L.layerGroup().addTo(map),PIN={radius:8,color:"#0A181B",weight:2,fillColor:"#E8F1EE",fillOpacity:1};
  let aktywna=false,cb=null;
  map.on("click",e=>{
    if(!aktywna)return;
    ov.clearLayers();L.circleMarker(e.latlng,PIN).addTo(ov);
    cb&&cb({lat:e.latlng.lat,lon:e.latlng.lng});
  });
  if(window.ResizeObserver)new ResizeObserver(()=>map.invalidateSize({pan:false})).observe(map.getContainer());
  return {map,
    start(){aktywna=true;ov.clearLayers();map.invalidateSize({pan:false});map.flyToBounds(PL_B,{duration:.4});},
    naKlik(f){cb=f;},
    pokaz(c,g){
      aktywna=false;ov.clearLayers();
      L.circle([c.lat,c.lon],{radius:50000,color:"#F2C14E",weight:1,opacity:.6,fill:false,interactive:false}).addTo(ov);
      L.polyline([[g.lat,g.lon],[c.lat,c.lon]],{color:"#F2C14E",weight:2,dashArray:"6 5",interactive:false}).addTo(ov);
      L.circleMarker([g.lat,g.lon],PIN).addTo(ov);
      L.circleMarker([c.lat,c.lon],{radius:9,color:"#0A181B",weight:2,fillColor:"#F2C14E",fillOpacity:1}).addTo(ov)
        .bindTooltip(c.name,{permanent:true,direction:"top",className:"nazwa",offset:[0,-8]});
      map.flyToBounds(L.latLngBounds([[g.lat,g.lon],[c.lat,c.lon]]).pad(0.5),{maxZoom:9,duration:.6});
    }
  };
}

/* ---- pojedynek na jednym telefonie: obaj gracze dostają te same pytania ---- */
let POJ=null;const LOS=Math.random;
function ziarno(s){Math.random=seeded("pojedynek-"+s);}
function planszaPoj(html,przyciski){
  let el=document.getElementById("zp-poj");
  if(!el){el=document.createElement("div");el.id="zp-poj";document.body.appendChild(el);}
  el.innerHTML='<div class="okno">'+html+'<div class="btnrow">'+przyciski.map((b,i)=>'<button class="'+(b.glowny?"big":"ghost")+'" data-i="'+i+'">'+b.t+'</button>').join("")+'</div></div>';
  el.classList.remove("hidden");
  el.querySelectorAll("[data-i]").forEach(x=>x.onclick=()=>{el.classList.add("hidden");przyciski[+x.dataset.i].f();});
}
function znaczek(){
  let z=document.getElementById("zp-gracz");
  if(!POJ){if(z)z.remove();return;}
  if(!z){z=document.createElement("div");z.id="zp-gracz";document.body.appendChild(z);}
  z.textContent="Gracz "+POJ.gracz;z.className="g"+POJ.gracz;
}
function odliczPoj(tytul,gotowe){
  let el=document.getElementById("zp-odl");
  if(!el){el=document.createElement("div");el.id="zp-odl";el.className="odlicz";document.body.appendChild(el);}
  odliczanie(el,tytul,"te same pytania dla obojga",3,gotowe,POJ&&POJ.gracz===2?"#7FD8C6":"#F2C14E");
}
function wynikZPodsumowania(){
  const s=document.querySelector("#summary .score,#done .score");
  if(!s)return 0;
  const m=s.textContent.replace(/\s/g,"").match(/-?\d+/);return m?+m[0]:0;
}
function koniecRundyPoj(){
  const w=wynikZPodsumowania();
  if(POJ.gracz===1){
    POJ.wyniki[0]=w;
    planszaPoj('<b class="kto2">Gracz 2</b><p>Gracz 1 zdobył <strong>'+fmt(w)+'</strong>. Teraz Twoja kolej: te same pytania, w tej samej kolejności.</p>',
      [{t:"Zaczynam",glowny:true,f:()=>{POJ.gracz=2;znaczek();ziarno(POJ.seed);odliczPoj("Gracz 2",()=>{const b=document.getElementById("againBtn");if(b)b.click();});}}]);
  }else{
    POJ.wyniki[1]=w;Math.random=LOS;
    const [a,b]=POJ.wyniki,remis=a===b,wyg=a>b?1:2;
    planszaPoj('<b>'+(remis?"Remis!":"Wygrywa gracz "+wyg+"!")+'</b><div class="tabela"><div class="'+(wyg===1&&!remis?"lider":"")+'"><span>Gracz 1</span><strong>'+fmt(a)+'</strong></div><div class="'+(wyg===2&&!remis?"lider":"")+'"><span>Gracz 2</span><strong>'+fmt(b)+'</strong></div></div>',
      [{t:"Koniec",f:()=>{POJ=null;znaczek();}},{t:"Rewanż",glowny:true,f:()=>{POJ={gracz:1,seed:(LOS()*1e9)|0,wyniki:[]};znaczek();ziarno(POJ.seed);odliczPoj("Gracz 1",()=>{const b=document.getElementById("againBtn");if(b)b.click();});}}]);
    if(!remis)setTimeout(fanfary,300);
  }
}

/* ---- obszar gry: puste = cała Polska, inaczej lista nazw województw ---- */
let OBSZAR=[];
function wObszarze(it){
  if(!OBSZAR.length)return true;
  if(!it)return false;
  if(!it.woj&&it.lat!=null&&it.lon!=null)it.woj=wojOf(it.lon,it.lat);
  return OBSZAR.indexOf(it.woj)>=0;
}

/* ---- kreator ustawień: kolejne ekrany zamiast formularza ---- */
const ILU={
  pl:'<svg viewBox="0 0 100 92" class="kr-pl"><path d="M14 22 L30 10 L52 6 L74 12 L92 22 L88 48 L94 70 L78 86 L56 82 L34 88 L14 76 L6 52 Z"/></svg>',
  woj:'<svg viewBox="0 0 100 92" class="kr-pl kr-podzial"><path d="M14 22 L30 10 L52 6 L74 12 L92 22 L88 48 L94 70 L78 86 L56 82 L34 88 L14 76 L6 52 Z"/><path class="g" d="M30 10 L36 40 L14 52 M36 40 L60 44 L74 12 M60 44 L88 48 M60 44 L56 82 M36 40 L34 88"/></svg>',
  m:'<svg viewBox="0 0 120 70" class="kr-miasto"><path class="z" d="M0 62 H120"/><path d="M18 62 V44 L30 34 L42 44 V62 Z"/><path class="d" d="M26 62 V52 H34 V62"/><path d="M58 62 V48 L68 40 L78 48 V62 Z"/><circle class="t" cx="96" cy="46" r="9"/><path class="z" d="M96 55 V62"/></svg>',
  s:'<svg viewBox="0 0 120 70" class="kr-miasto"><path class="z" d="M0 62 H120"/><path d="M8 62 V46 L18 38 L28 46 V62 Z"/><path d="M34 62 V30 H58 V62 Z"/><path class="o" d="M39 36 H44 M48 36 H53 M39 44 H44 M48 44 H53 M39 52 H44 M48 52 H53"/><path d="M66 62 V26 L72 14 L78 26 V62 Z"/><path d="M84 62 V40 H110 V62 Z"/><path class="o" d="M89 46 H94 M100 46 H105 M89 54 H94 M100 54 H105"/></svg>',
  d:'<svg viewBox="0 0 120 70" class="kr-miasto"><path class="z" d="M0 62 H120"/><path d="M6 62 V34 H24 V62 Z"/><path d="M28 62 V8 H48 V62 Z"/><path class="o" d="M33 16 H43 M33 24 H43 M33 32 H43 M33 40 H43 M33 48 H43"/><path d="M52 62 V20 L62 4 L72 20 V62 Z"/><path d="M76 62 V26 H96 V62 Z"/><path class="o" d="M81 34 H91 M81 42 H91 M81 50 H91"/><path d="M100 62 V40 H116 V62 Z"/></svg>'
};
function kreatorGry(cfg){
  const setup=document.getElementById("setup");if(!setup)return;
  const pamiec="kreator-"+cfg.klucz;
  let zap={};try{zap=JSON.parse(localStorage.getItem(pamiec)||"{}");}catch(e){}
  const w={woj:zap.woj||[],wielkosc:zap.wielkosc||"dsm",rundy:zap.rundy||5,wybor:zap.wybor||{}};
  // stary formularz zostaje ukryty, bo gra czyta z niego ustawienia
  const stare=document.createElement("div");stare.className="hidden";stare.id="stareUstawienia";
  [...setup.childNodes].forEach(n=>stare.appendChild(n));
  setup.appendChild(stare);
  const k=document.createElement("div");k.className="kreator";setup.appendChild(k);
  setup.classList.add("z-kreatorem");
  const kroki=cfg.kroki;
  let i=0,podWoj=false,WOJL=[];
  loadWoj().then(l=>{WOJL=l;if(kroki[i]==="obszar"&&podWoj)rysuj();}).catch(()=>{});
  function zapamietaj(){try{localStorage.setItem(pamiec,JSON.stringify(w));}catch(e){}}
  function kropki(){return '<div class="kr-kropki">'+kroki.map((_,j)=>'<i class="'+(j<i?"byl":j===i?"teraz":"")+'"></i>').join("")+'</div>';}
  function rysuj(kier){
    const krok=kroki[i],ost=i===kroki.length-1;
    let tyt="",pod="",tresc="",dalej=true;
    if(krok==="obszar"&&!podWoj){
      tyt="Gdzie grasz?";pod="Cała Polska albo wybrane województwa.";
      tresc='<div class="kr-karty dwie">'
        +'<button class="kr-karta'+(w.woj.length?"":" wybrana")+'" data-a="pl">'+ILU.pl+'<b>Cała Polska</b><small>wszystkie województwa</small></button>'
        +'<button class="kr-karta'+(w.woj.length?" wybrana":"")+'" data-a="woj">'+ILU.woj+'<b>Województwa</b><small>'+(w.woj.length?"wybrano "+w.woj.length:"wybierz na mapie")+'</small></button></div>';
      dalej=false;
    }else if(krok==="obszar"){
      tyt="Które województwa?";pod="Zaznacz jedno albo kilka.";
      tresc='<div class="kr-woje">'+(WOJL.length?WOJL.map(x=>{
        const P=projection([x.f],60,3);
        return '<button class="kr-woj'+(w.woj.indexOf(x.name)>=0?" wybrana":"")+'" data-w="'+x.name+'"><svg viewBox="0 0 60 '+P.H.toFixed(0)+'"><path d="'+P.path(x.f.geometry,0.8)+'"/></svg><span>'+x.name+'</span></button>';
      }).join(""):'<div class="datastate">Wczytywanie mapy…</div>')+'</div>';
      dalej=w.woj.length>0;
    }else if(krok==="wielkosc"){
      tyt="Jakie miasta?";pod="Można zaznaczyć kilka naraz.";
      tresc='<div class="kr-karty trzy">'+[["m","Małe","do 20 tys."],["s","Średnie","20 do 100 tys."],["d","Duże","ponad 100 tys."]].map(([v,t,o])=>
        '<button class="kr-karta maly'+(w.wielkosc.indexOf(v)>=0?" wybrana":"")+'" data-v="'+v+'">'+ILU[v]+'<b>'+t+'</b><small>'+o+'</small></button>').join("")+'</div>';
      dalej=w.wielkosc.length>0;
    }else if(krok==="pojedynek"){
      tyt="Kto gra?";pod="W pojedynku obie osoby dostają te same pytania, jedna po drugiej.";
      const akt=w.wybor.pojedynek||"1";
      tresc='<div class="kr-karty dwie">'
        +'<button class="kr-karta'+(akt==="1"?" wybrana":"")+'" data-p="1"><div class="kr-ikona">🧭</div><b>Sam</b><small>własny rekord</small></button>'
        +'<button class="kr-karta'+(akt==="2"?" wybrana":"")+'" data-p="2"><div class="kr-ikona">⚔️</div><b>Pojedynek</b><small>dwie osoby, jeden telefon</small></button></div>';
      dalej=false;
    }else if(krok==="rundy"){
      tyt="Ile rund?";pod="Przesuń albo przewiń kółkiem.";
      tresc='<div class="kr-rundy"><div class="kr-liczba">'+w.rundy+'</div>'
        +'<input type="range" min="5" max="'+(cfg.maxRund||25)+'" step="5" value="'+w.rundy+'">'
        +'<div class="kr-skala">'+[...Array(((cfg.maxRund||25)-5)/5+1)].map((_,j)=>'<span>'+(5+j*5)+'</span>').join("")+'</div></div>';
    }else if(typeof krok==="object"){
      tyt=krok.tytul;pod=krok.opis||"";
      const akt=w.wybor[krok.pole]!=null?w.wybor[krok.pole]:krok.domyslny;
      tresc='<div class="kr-karty '+(krok.opcje.length===2?"dwie":"trzy")+'">'+krok.opcje.map(o=>
        '<button class="kr-karta'+(String(o.v)===String(akt)?" wybrana":"")+'" data-o="'+o.v+'">'+(o.ilu||"")+'<b>'+o.t+'</b><small>'+(o.opis||"")+'</small></button>').join("")+'</div>';
      dalej=!krok.auto;
    }
    k.innerHTML=kropki()+'<div class="kr-ekran '+(kier<0?"wstecz":"")+'"><h2>'+tyt+'</h2><p>'+pod+'</p>'+tresc+'</div>'
      +'<div class="kr-dol">'+(i>0||podWoj?'<button class="ghost kr-wstecz">Wstecz</button>':'')
      +(dalej||krok==="obszar"&&podWoj?'<button class="big kr-dalej"'+(krok==="obszar"&&podWoj&&!w.woj.length?" disabled":"")+'>'+(ost?"Zagraj":"Dalej")+'</button>':'')+'</div>'
      +'<div class="datastate kr-stan"></div>';
    // obsługa
    k.querySelectorAll("[data-a]").forEach(b=>b.onclick=()=>{
      if(b.dataset.a==="pl"){w.woj=[];dalejKrok();}else{podWoj=true;rysuj(1);}
    });
    k.querySelectorAll("[data-w]").forEach(b=>b.onclick=()=>{
      const n=b.dataset.w,ix=w.woj.indexOf(n);
      if(ix>=0)w.woj.splice(ix,1);else w.woj.push(n);
      b.classList.toggle("wybrana");
      const d=k.querySelector(".kr-dalej");if(d)d.disabled=!w.woj.length;
    });
    k.querySelectorAll("[data-p]").forEach(b=>b.onclick=()=>{
      w.wybor.pojedynek=b.dataset.p;
      k.querySelectorAll("[data-p]").forEach(x=>x.classList.toggle("wybrana",x===b));
      setTimeout(dalejKrok,180);
    });
    k.querySelectorAll("[data-v]").forEach(b=>b.onclick=()=>{
      const v=b.dataset.v;
      w.wielkosc=w.wielkosc.indexOf(v)>=0?w.wielkosc.replace(v,""):w.wielkosc+v;
      b.classList.toggle("wybrana");
      const d=k.querySelector(".kr-dalej");if(d)d.disabled=!w.wielkosc.length;
    });
    k.querySelectorAll("[data-o]").forEach(b=>b.onclick=()=>{
      w.wybor[krok.pole]=b.dataset.o;
      k.querySelectorAll("[data-o]").forEach(x=>x.classList.toggle("wybrana",x===b));
      if(krok.auto!==false)setTimeout(dalejKrok,180);
    });
    const r=k.querySelector('input[type=range]');
    if(r){
      const pisz=()=>{w.rundy=+r.value;const l=k.querySelector(".kr-liczba");l.textContent=r.value;l.classList.remove("skok");void l.offsetWidth;l.classList.add("skok");};
      r.oninput=pisz;
      k.querySelector(".kr-rundy").addEventListener("wheel",e=>{e.preventDefault();r.value=Math.max(+r.min,Math.min(+r.max,+r.value+(e.deltaY<0?5:-5)));pisz();},{passive:false});
    }
    const wst=k.querySelector(".kr-wstecz");
    if(wst)wst.onclick=()=>{if(krok==="obszar"&&podWoj){podWoj=false;rysuj(-1);}else{i=Math.max(0,i-1);podWoj=false;rysuj(-1);}};
    const d=k.querySelector(".kr-dalej");if(d)d.onclick=dalejKrok;
  }
  function dalejKrok(){
    if(i<kroki.length-1){i++;podWoj=false;rysuj(1);return;}
    start();
  }
  function start(){
    zapamietaj();
    OBSZAR=w.woj.slice();
    const sc=document.getElementById("scope");
    if(sc)sc.querySelectorAll("input").forEach(x=>{x.checked=w.wielkosc.indexOf(x.value)>=0;});
    const rs=document.getElementById("rounds");
    if(rs){if(![...rs.options].some(o=>+o.value===w.rundy)){const o=document.createElement("option");o.value=o.textContent=w.rundy;rs.appendChild(o);}rs.value=String(w.rundy);}
    kroki.forEach(kr=>{if(typeof kr==="object"&&kr.pole){
      const el=document.getElementById(kr.pole),v=w.wybor[kr.pole]!=null?w.wybor[kr.pole]:kr.domyslny;
      if(el){el.value=v;el.dispatchEvent(new Event("change"));}
    }});
    // pojedynek: bez trybu nauki (inaczej drugi gracz dostałby inne pytania) i ze wspólnym ziarnem losowania
    if(kroki.indexOf("pojedynek")>=0&&w.wybor.pojedynek==="2"){
      POJ={gracz:1,seed:(LOS()*1e9)|0,wyniki:[]};
      const u=document.getElementById("ucz");if(u)u.value="0";
    }else{POJ=null;Math.random=LOS;}
    znaczek();
    const go0=()=>{
      if(POJ)ziarno(POJ.seed);
      if(cfg.start)return cfg.start(w);
      const b=document.getElementById("startBtn");
      if(b&&!b.disabled){b.click();return true;}
      return false;
    };
    const go=()=>go0();
    if(POJ){
      odliczPoj("Gracz 1",()=>{if(go()===false){const id=setInterval(()=>{if(go()!==false)clearInterval(id);},300);}});
      return;
    }
    if(go()===false){
      const stan=k.querySelector(".kr-stan");
      const id=setInterval(()=>{
        const ds=document.getElementById("datastate");if(stan)stan.textContent="Wczytywanie danych… "+(ds?ds.textContent:"");
        if(go()!==false)clearInterval(id);
      },300);
    }
  }
  // powrót do ustawień po grze: od pierwszego ekranu
  let ukryty=setup.classList.contains("hidden");
  new MutationObserver(()=>{const u=setup.classList.contains("hidden");if(ukryty&&!u){i=0;podWoj=false;rysuj();}ukryty=u;})
    .observe(setup,{attributes:true,attributeFilter:["class"]});
  rysuj();
  return w;
}
function obszarNazwa(){return OBSZAR.length?(OBSZAR.length===1?"woj. "+OBSZAR[0]:OBSZAR.length+" województw"):"cała Polska";}

/* ---- przybliżanie i przesuwanie map SVG (dwa palce, kółko myszki, przeciąganie, podwójne stuknięcie) ---- */
function zoomSvg(svg,przyciski){
  if(svg._zoom)return svg._zoom;
  const vb=()=>svg.getAttribute("viewBox").split(/[ ,]+/).map(Number);
  const ustaw=v=>svg.setAttribute("viewBox",v.map(x=>x.toFixed(2)).join(" "));
  let baza=null;
  const z={reset(){baza=vb();},domyslny(){if(baza)ustaw(baza);}};
  svg._zoom=z;svg.style.touchAction="none";
  const punkt=(cx,cy)=>{const p=svg.createSVGPoint();p.x=cx;p.y=cy;return p.matrixTransform(svg.getScreenCTM().inverse());};
  function skaluj(s,px,py){
    if(!baza)baza=vb();
    const [x,y,w,h]=vb();
    let nw=Math.min(baza[2],Math.max(baza[2]/10,w/s));const k=nw/w,nh=h*k;
    let nx=px-(px-x)*k,ny=py-(py-y)*k;
    ustaw(ogranicz([nx,ny,nw,nh]));
  }
  function ogranicz(v){
    if(!baza)return v;
    const [bx,by,bw,bh]=baza;
    v[0]=Math.max(bx-bw*.1,Math.min(bx+bw*1.1-v[2],v[0]));
    v[1]=Math.max(by-bh*.1,Math.min(by+bh*1.1-v[3],v[1]));
    return v;
  }
  svg.addEventListener("wheel",e=>{e.preventDefault();const p=punkt(e.clientX,e.clientY);skaluj(e.deltaY<0?1.25:0.8,p.x,p.y);},{passive:false});
  const pal=new Map();let start=null,ruch=false;
  svg.addEventListener("pointerdown",e=>{
    pal.set(e.pointerId,{x:e.clientX,y:e.clientY});
    start={vb:vb(),pal:new Map([...pal].map(([k,v])=>[k,{...v}]))};ruch=false;
  });
  svg.addEventListener("pointermove",e=>{
    if(!pal.has(e.pointerId)||!start)return;
    pal.set(e.pointerId,{x:e.clientX,y:e.clientY});
    const pts=[...pal.values()],p0=[...start.pal.values()];
    if(pts.length===1&&p0.length>=1){
      const dx=pts[0].x-p0[0].x,dy=pts[0].y-p0[0].y;
      if(!ruch&&Math.hypot(dx,dy)<8)return;
      ruch=true;
      const m=svg.getScreenCTM(),sx=m.a,sy=m.d;
      const v=start.vb.slice();v[0]-=dx/sx;v[1]-=dy/sy;ustaw(ogranicz(v));
    }else if(pts.length>=2&&p0.length>=2){
      ruch=true;
      const d0=Math.hypot(p0[0].x-p0[1].x,p0[0].y-p0[1].y),d1=Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y);
      ustaw(start.vb);
      const mx=(pts[0].x+pts[1].x)/2,my=(pts[0].y+pts[1].y)/2,p=punkt(mx,my);
      skaluj(d1/Math.max(1,d0),p.x,p.y);
    }
  });
  const koniec=e=>{
    pal.delete(e.pointerId);
    if(ruch){svg._przeciagnieto=Date.now();}
    start=pal.size?{vb:vb(),pal:new Map([...pal].map(([k,v])=>[k,{...v}]))}:null;
  };
  svg.addEventListener("pointerup",koniec);svg.addEventListener("pointercancel",koniec);
  // po przeciągnięciu nie traktujemy puszczenia palca jak wyboru
  svg.addEventListener("click",e=>{if(svg._przeciagnieto&&Date.now()-svg._przeciagnieto<350){e.stopPropagation();e.preventDefault();}},true);
  let ostatni=0;
  svg.addEventListener("dblclick",e=>{const p=punkt(e.clientX,e.clientY);skaluj(2,p.x,p.y);});
  if(przyciski){
    const box=document.createElement("div");box.className="zoom-przyciski";
    box.innerHTML='<button aria-label="Przybliż">+</button><button aria-label="Oddal">−</button><button aria-label="Cała mapa">⤢</button>';
    const [plus,minus,cala]=box.querySelectorAll("button");
    const srodek=()=>{const [x,y,w,h]=vb();return [x+w/2,y+h/2];};
    plus.onclick=e=>{e.stopPropagation();const c=srodek();skaluj(1.6,c[0],c[1]);};
    minus.onclick=e=>{e.stopPropagation();const c=srodek();skaluj(1/1.6,c[0],c[1]);};
    cala.onclick=e=>{e.stopPropagation();z.domyslny();};
    przyciski.appendChild(box);
  }
  return z;
}

/* ---- poprawki z panelu admina (rzeki, herby) ---- */
let POPRAWKI=null;
function poprawki(){
  if(!POPRAWKI)POPRAWKI=fetch("poprawki.json",{cache:"no-cache"}).then(r=>r.ok?r.json():{}).catch(()=>({})).then(p=>({rzeki:p.rzeki||{},herby:p.herby||{}}));
  return POPRAWKI;
}
function popRzeki(lista,p){
  return lista.filter(c=>p.rzeki[c.n]!=="").map(c=>{const r=p.rzeki[c.n];return r?Object.assign({},c,{rzeka:r,rid:null}):c;});
}
function popHerby(lista,p,nazwa){nazwa=nazwa||(c=>c.name||c.n);return lista.filter(c=>p.herby[nazwa(c)]!==false);}

/* ---- krótki komunikat na dole ekranu ---- */
function komunikat(tekst,ms){
  let el=document.getElementById("zp-komunikat");
  if(!el){el=document.createElement("div");el.id="zp-komunikat";document.body.appendChild(el);}
  el.textContent=tekst;el.className="widoczny";
  clearTimeout(el._t);el._t=setTimeout(()=>{el.className="";},ms||3800);
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
  const t=await (await fetch("powiaty.topojson?v=15")).json();
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
function zapisz(kind,id,ok,cicho){
  if(!cicho){poswiata(ok);sesja.wszystkie++;if(ok)sesja.ok++;}
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

/* ---- gminy: pełne granice PRG ---- */
const TYP_GMINY={"1":"gmina miejska","2":"gmina wiejska","3":"gmina miejsko-wiejska"};
let GMC=null;
async function loadGminy(){
  if(GMC)return GMC;
  const pw=await loadPowiaty();
  const t=await (await fetch("gminy.topojson?v=15")).json();
  const o=t.objects.gminy||Object.values(t.objects).sort((a,b)=>(b.geometries||[]).length-(a.geometries||[]).length)[0];
  const fs=topojson.feature(t,o).features;
  const powNazwa={};pw.forEach(p=>powNazwa[p.k]=p.full);
  const ile={};fs.forEach(f=>{const n=f.properties.n;ile[n]=(ile[n]||0)+1;});
  // bez miast na prawach powiatu: tam gmina i powiat to ten sam obszar i ta sama nazwa
  GMC=fs.filter(f=>f.geometry&&String(f.properties.k).slice(-1)<"4"&&+String(f.properties.k).slice(2,4)<60).map(f=>{
    const k=String(f.properties.k),n=f.properties.n,typ=k.slice(-1);
    let b=[1e9,1e9,-1e9,-1e9];
    const polys=f.geometry.type==="Polygon"?[f.geometry.coordinates]:f.geometry.coordinates;
    polys.forEach(p=>p[0].forEach(([x,y])=>{if(x<b[0])b[0]=x;if(y<b[1])b[1]=y;if(x>b[2])b[2]=x;if(y>b[3])b[3]=y;}));
    const dopisek=ile[n]>1?(typ==="1"?" (miasto)":typ==="2"?" (wiejska)":""):"";
    return {f,k,n,city:false,woj:WOJ_KOD[k.slice(0,2)],bb:b,lon:(b[0]+b[2])/2,lat:(b[1]+b[3])/2,
      short:n,label:n+dopisek,full:"gmina "+n+dopisek,typ:TYP_GMINY[typ]||"gmina",powiat:powNazwa[k.slice(0,4)]||""};
  });
  return GMC;
}

/* ---- losowanie powtarzalne (to samo dla wszystkich w danym dniu) ---- */
function seeded(str){let h=1779033703^str.length;for(let i=0;i<str.length;i++){h=Math.imul(h^str.charCodeAt(i),3432918353);h=h<<13|h>>>19;}
  let a=h>>>0;return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function dayKey(d){d=d||new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");}
window.ZP={$,poprawki,popRzeki,popHerby,zoomSvg,komunikat,mapaGdzie,fokus,kreatorGry,wObszarze,obszarNazwa,get OBSZAR(){return OBSZAR;},ksztaltZPodkladem,poswiata,fanfary,WOJ_KOD,loadPowiaty,loadGminy,pasek,odliczanie,poleWpisu,pasuje,lapacz,ZAKRESY,zakresy,zakresStan,wZakresie,zapisz,waga,opanowane,statystyki,losujNauka,wojSasiedzi,nauka,seeded,dayKey,FALLBACK,norm,shuffle,pick,fetchT,fmt,km,loadWoj,wojOf,loadCities,projection,fitViewport,registerSW,inRing};
})();
