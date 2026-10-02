/* Karty gmin: wspólna logika dla albumu (karty.html), gier (animacja „do inwentarza”) i menu (przycisk Kolekcja).
   Karta jest zdobyta, gdy:
   - trafisz gminę po konturze (Do sześciu razy sztuka, Kształt gminy), nawet z podpowiedziami, albo
   - odpowiesz o niej poprawnie w co najmniej 3 różnych rodzajach gier (mapa, z lotu ptaka, herb, zdjęcie, rzeka, kluby, gminy). */
window.Karty=(function(){
  const RZ={diament:"Diamentowa",zloto:"Złota",srebro:"Srebrna",braz:"Brązowa",zwykla:"Zwykła"},KOLEJ=["diament","zloto","srebro","braz","zwykla"];
  const RODZAJE=["miasto","herb","miejsce","rzeka","klub","gmina","powiat"];
  const PROG=3;
  let DANE=null;
  const norm=s=>String(s||"").toLowerCase().replace(/ł/g,"l").normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]/g,"");
  const WOJ_KOD={"02":"dolnośląskie","04":"kujawsko-pomorskie","06":"lubelskie","08":"lubuskie","10":"łódzkie","12":"małopolskie","14":"mazowieckie","16":"opolskie","18":"podkarpackie","20":"podlaskie","22":"pomorskie","24":"śląskie","26":"świętokrzyskie","28":"warmińsko-mazurskie","30":"wielkopolskie","32":"zachodniopomorskie"};

  /* wskaźnik 1-99 jak w grach piłkarskich: miejsce w rankingu wszystkich gmin */
  function ocena(lista,pole,odwrotnie){
    const z=lista.filter(g=>g[pole]!=null).sort((a,b)=>odwrotnie?b[pole]-a[pole]:a[pole]-b[pole]),n=z.length;
    z.forEach((g,i)=>{g.oc=g.oc||{};g.oc[pole]=Math.max(1,Math.min(99,Math.round(1+98*i/Math.max(1,n-1))));});
  }
  async function zaladuj(){
    if(DANE)return DANE;
    const b=await fetch("baza.json").then(r=>r.json());
    const g=b.gminy.filter(x=>/[123]$/.test(x.k));
    // rzadkość: im mniej mieszkańców, tym rzadsza; 3 najmniejsze miasta i 3 najmniejsze gminy są diamentowe
    const z=g.filter(x=>x.ludnosc).sort((a,c)=>a.ludnosc-c.ludnosc),n=z.length;
    const diam=new Set(z.filter(x=>x.typ==="gmina miejska").slice(0,3).concat(z.filter(x=>x.typ!=="gmina miejska").slice(0,3)).map(x=>x.k));
    z.forEach((x,i)=>{x.rz=diam.has(x.k)?"diament":i<n*.03?"zloto":i<n*.15?"srebro":i<n*.45?"braz":"zwykla";});
    g.forEach(x=>{if(!x.rz)x.rz="zwykla";x.woj=WOJ_KOD[x.k.slice(0,2)];});
    g.sort((a,c)=>(a.ludnosc||1e9)-(c.ludnosc||1e9)).forEach((x,i)=>x.nr=i+1);
    const pow={};(b.powiaty||[]).forEach(p=>pow[p.k]=p.n);
    g.forEach(x=>{const kp=x.k.slice(0,4);x.powiat=+kp.slice(2)>=61?"miasto na prawach powiatu":"powiat "+(pow[kp]||"");});
    const PO_K={},PO_N={};g.forEach(x=>{PO_K[x.k]=x;(PO_N[norm(x.n)]=PO_N[norm(x.n)]||[]).push(x);});
    DANE={g,PO_K,PO_N};przelicz();return DANE;
  }
  // wskaźniki 1-99; bezrobocie odwrotnie (mniej bezrobotnych, wyższa ocena)
  // wskaźniki karty: miejsce w rankingu gmin (1-99) albo wprost procent (100% = 100 punktów)
  const STATY=[
    {k:"ludnosc",n:"Ludność",t:"r"},{k:"powierzchnia",n:"Powierzchnia",t:"r"},{k:"gestosc",n:"Gęstość",t:"r"},
    {k:"saldo_migracji",n:"Migracja",t:"r"},{k:"dochod_na_mieszk",n:"Dochód",t:"r"},{k:"bezrobocie_proc",n:"Bezrobocie",t:"o"},
    {k:"wodociag_proc",n:"Wodociągi",t:"p"},{k:"kanalizacja_proc",n:"Kanalizacja",t:"p"},{k:"lesistosc_proc",n:"Lesistość",t:"p"}];
  function przelicz(){
    const g=DANE.g;
    g.forEach(x=>{x.oc={};if(x.ludnosc&&x.powierzchnia)x.gestosc=Math.round(x.ludnosc/x.powierzchnia*10)/10;});
    STATY.forEach(s=>{
      if(s.t==="p")g.forEach(x=>{if(x[s.k]!=null)x.oc[s.k]=Math.max(0,Math.min(100,Math.round(x[s.k])));});
      else ocena(g,s.k,s.t==="o");
    });
    g.forEach(x=>{const w=Object.values(x.oc);x.ovr=w.length?Math.round(w.reduce((a,c)=>a+c,0)/w.length):0;});
  }
  function gminaPoNazwie(n){
    const l=DANE.PO_N[norm(n)];if(!l)return null;
    return l.find(x=>x.typ==="gmina miejska")||l.find(x=>x.typ==="gmina miejsko-wiejska")||l[0];
  }
  /* zdobyte karty według zasad */
  function zdobyte(){
    let n={};try{n=JSON.parse(localStorage.getItem("nauka-v1")||"{}");}catch(e){}
    const rodzaje={},od=new Set();
    Object.entries(n).forEach(([klucz,r])=>{
      if(!(r.ok>0))return;
      const i=klucz.indexOf(":"),rodz=klucz.slice(0,i),id=klucz.slice(i+1);
      let g=null;
      if(rodz==="kontur"){g=DANE.PO_K[id]||gminaPoNazwie(id);if(g)od.add(g.k);return;}
      if(RODZAJE.indexOf(rodz)<0)return;
      if(rodz==="gmina")g=DANE.PO_K[id];
      else if(rodz==="powiat"){if(+id.slice(2,4)>=60)g=DANE.g.find(x=>x.k.startsWith(id));}
      else g=gminaPoNazwie(id);
      if(g)(rodzaje[g.k]=rodzaje[g.k]||new Set()).add(rodz);
    });
    Object.entries(rodzaje).forEach(([k,s])=>{if(s.size>=PROG)od.add(k);});
    return {mam:od,postep:rodzaje};
  }
  function widziane(){try{return JSON.parse(localStorage.getItem("karty-widziane")||"[]");}catch(e){return [];}}
  function ogloszone(){try{return JSON.parse(localStorage.getItem("karty-ogloszone")||"null");}catch(e){return null;}}
  async function nowe(){
    await zaladuj();const {mam}=zdobyte();
    let og=ogloszone();
    if(og===null){og=[...mam];localStorage.setItem("karty-ogloszone",JSON.stringify(og));return [];}   // pierwszy raz: bez zalewu kart
    const n=[...mam].filter(k=>og.indexOf(k)<0);
    if(n.length)localStorage.setItem("karty-ogloszone",JSON.stringify(og.concat(n)));
    return n.map(k=>DANE.PO_K[k]).sort((a,b)=>KOLEJ.indexOf(a.rz)-KOLEJ.indexOf(b.rz));
  }
  async function liczbaNowych(){await zaladuj();const {mam}=zdobyte(),w=widziane();return [...mam].filter(k=>w.indexOf(k)<0).length;}

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
   lesistosc_proc:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"><path d="M12 2l6 9h-3l4 6H5l4-6H6z"/><path d="M12 17v5"/></svg>'};
  const TYP={"gmina miejska":"MIA","gmina wiejska":"WIE","gmina miejsko-wiejska":"M-W"};
  const WS={"dolnośląskie":"DLŚ","kujawsko-pomorskie":"K-P","lubelskie":"LUB","lubuskie":"LBU","łódzkie":"ŁDZ","małopolskie":"MAŁ","mazowieckie":"MAZ","opolskie":"OPO","podkarpackie":"PKR","podlaskie":"PDL","pomorskie":"POM","śląskie":"ŚLĄ","świętokrzyskie":"ŚWK","warmińsko-mazurskie":"W-M","wielkopolskie":"WLK","zachodniopomorskie":"ZPM"};
  const mnp=g=>+g.k.slice(2,4)>=61;
  const liczba=(v,d)=>Number(v).toLocaleString("pl-PL",{maximumFractionDigits:d==null?1:d});
  function wartosc(g,k){
    const v=g[k];if(v==null)return "brak danych";
    if(k==="ludnosc")return liczba(v,0)+" mieszk.";
    if(k==="powierzchnia")return liczba(v,1)+" km²";
    if(k==="gestosc")return liczba(v,0)+" os./km²";
    if(k==="saldo_migracji")return (v>0?"+":"")+liczba(v)+"‰";
    if(k==="dochod_na_mieszk")return liczba(v,0)+" zł/os.";
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
    o=o||{};const ot=o.otwarta!==false,pelna=o.tryb==="pelna",oc=g.oc||{},h=ot?herbSrc(g):"";
    const st=pelna?'<span class="kk-linia"></span><div class="kk-st">'+STATY.map(s=>'<span>'+IK[s.k]+'<em>'+s.n+'</em><b>'+(ot&&oc[s.k]!=null?oc[s.k]:"?")+'</b><i>'+(ot?wartosc(g,s.k):"")+'</i></span>').join("")+'</div>':'';
    return '<div class="kk kk-'+(pelna?"pelna":"mini")+' r-'+g.rz+(ot?"":" zablokowana")+'" data-k="'+g.k+'">'+(o.nowa?'<span class="kk-nowa">NOWA</span>':'')+'<span class="kk-ramka"></span>'
      +'<div class="kk-lewa"><span class="kk-ovr">'+(ot&&g.ovr?g.ovr:"?")+'</span><span class="kk-typ">'+(mnp(g)?"MNP":TYP[g.typ]||"GM")+'</span>'+(h?'<img class="kk-herb" alt="" loading="lazy" src="'+h+'">':'')+'<span class="kk-kres"></span><span class="kk-wojs">'+(WS[g.woj]||"")+'</span></div>'
      +'<div class="kk-mapka" data-m="'+g.k+'"></div>'
      +'<div class="kk-nazwa">'+(ot?esc(g.n):"???")+'</div>'
      +'<div class="kk-jedn">'+(ot?(mnp(g)?"miasto na prawach powiatu<br>woj. "+g.woj:g.typ+(pelna?"<br>"+esc(g.powiat)+" · woj. "+g.woj:"")):(o.postep?"zebrane "+o.postep+"/"+PROG+" gier":"woj. "+g.woj))+'</div>'
      +st+'<div class="kk-rz">'+RZ[g.rz].toUpperCase()+' · #'+g.nr+'</div></div>';
  }
  function styl(){
    if(document.getElementById("kk-styl"))return;
    if(!document.querySelector('link[href*="Barlow+Condensed"]')){const l=document.createElement("link");l.rel="stylesheet";l.href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=Bungee&display=swap";document.head.appendChild(l);}
    const s=document.createElement("style");s.id="kk-styl";
    s.textContent=`
.kk{--x:50%;--y:50%;position:relative;aspect-ratio:5/8;container-type:inline-size;clip-path:polygon(50% 0,100% 4%,100% 90%,50% 100%,0 90%,0 4%);background:var(--tlo);color:#14233A;filter:drop-shadow(0 6px 10px rgba(0,0,0,.45));cursor:pointer;transition:transform .15s;font-family:Rubik,system-ui,sans-serif}
.kk.kk-mini{aspect-ratio:5/7}
.kk .kk-ramka{position:absolute;inset:3cqw;clip-path:inherit;border:.8cqw solid var(--ramka);pointer-events:none;z-index:3}
.kk .kk-lewa{position:absolute;left:7cqw;top:9cqw;width:22cqw;display:flex;flex-direction:column;align-items:center;gap:.6cqw;z-index:2}
.kk .kk-ovr{font-family:"Barlow Condensed",Bungee,sans-serif;font-weight:800;font-size:19cqw;line-height:.85}
.kk .kk-typ{font-family:"Barlow Condensed",sans-serif;font-weight:700;font-size:6cqw;letter-spacing:.3cqw}
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
.kk .kk-st{position:absolute;left:6cqw;right:6cqw;top:88cqw;display:grid;grid-template-columns:1fr 1fr;column-gap:4cqw;row-gap:1.8cqw}
.kk .kk-st span{display:grid;grid-template-columns:4.6cqw minmax(0,1fr) auto;grid-template-rows:auto auto;column-gap:1.6cqw;align-items:center}
.kk .kk-st svg{grid-row:1/3;width:4.6cqw;height:4.6cqw}
.kk .kk-st em{font-style:normal;font-family:"Barlow Condensed",sans-serif;font-weight:700;font-size:3.6cqw;text-transform:uppercase;white-space:nowrap;line-height:1.05}
.kk .kk-st b{grid-row:1/3;grid-column:3;font-family:"Barlow Condensed",sans-serif;font-weight:800;font-size:6.8cqw;line-height:1;text-align:right;min-width:7cqw}
.kk .kk-st i{font-style:normal;font-weight:700;font-size:2.8cqw;opacity:.75;white-space:nowrap}
.kk .kk-rz{position:absolute;left:0;right:0;top:143cqw;text-align:center;font-size:3.6cqw;font-weight:900;letter-spacing:.6cqw;color:var(--ramka)}
.kk.kk-mini .kk-rz{top:113cqw;font-size:4.6cqw}
.kk::after{content:"";position:absolute;inset:0;pointer-events:none;z-index:4;mix-blend-mode:var(--mieszanie,soft-light);opacity:var(--blask,.6);background:var(--holo)}
.kk.r-zwykla{--tlo:linear-gradient(160deg,#FBF6E8,#E2D6B8);--ramka:#9C8A62;--holo:none;--blask:0}
.kk.r-braz{--tlo:linear-gradient(160deg,#F4DCC4,#C98B5C);--ramka:#7E4620;--holo:radial-gradient(circle at var(--x) var(--y),rgba(255,230,200,.8),transparent 45%)}
.kk.r-srebro{--tlo:linear-gradient(160deg,#F7F9FB,#AEB9C4);--ramka:#5F6C78;--holo:radial-gradient(circle at var(--x) var(--y),rgba(255,255,255,.95),transparent 42%),linear-gradient(115deg,transparent 30%,rgba(255,255,255,.6) 48%,transparent 60%)}
.kk.r-zloto{--tlo:linear-gradient(160deg,#FFF3C2,#E0A812);--ramka:#7A5400;--holo:radial-gradient(circle at var(--x) var(--y),rgba(255,250,210,1),transparent 40%),repeating-linear-gradient(115deg,transparent 0 12px,rgba(255,255,255,.35) 12px 16px);--blask:.75}
.kk.r-diament{--tlo:linear-gradient(160deg,#F2FBFF 0%,#BFE6FF 38%,#E6D6FF 70%,#BFE6FF 100%);--ramka:#3D6FD1;--mieszanie:color-dodge;--blask:.5;--holo:radial-gradient(circle at var(--x) var(--y),rgba(255,255,255,.95),transparent 30%),linear-gradient(calc(var(--kat,115) * 1deg),#ff6b6b33,#ffd93d55,#6bff9a44,#6bd5ff55,#c06bff44,#ff6b6b33)}
.kk.zablokowana{--tlo:#2A2F3A!important;color:#8B93A6}.kk.zablokowana::after{display:none}.kk.zablokowana .kk-mapka{filter:grayscale(1) brightness(.35);border-color:#454C5C}.kk.zablokowana .kk-ramka{border-color:#454C5C}
.kk .kk-nowa{position:absolute;left:50%;top:1.5cqw;transform:translateX(-50%);background:#E84A3C;color:#fff;font-size:4.5cqw;font-weight:900;padding:.5cqw 3cqw;border-radius:0 0 2cqw 2cqw;z-index:5}
/* prezentacja nowej karty, jak po otwarciu paczki */
.pk{position:fixed;inset:0;z-index:6000;overflow:hidden;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;background:radial-gradient(ellipse at 50% 40%,var(--pk1),#05070D 70%);font-family:Rubik,system-ui,sans-serif;color:#fff;animation:pkWej .35s both}
@keyframes pkWej{from{opacity:0}}
.pk.r-zwykla{--pk1:#3B3324;--pk2:#E2D6B8}.pk.r-braz{--pk1:#4A2A14;--pk2:#E7A06B}.pk.r-srebro{--pk1:#2E3640;--pk2:#E6EEF6}.pk.r-zloto{--pk1:#4A3500;--pk2:#FFD15C}.pk.r-diament{--pk1:#1A2A66;--pk2:#9FD8FF}
.pk-promienie{position:absolute;left:50%;top:42%;width:240vmax;height:240vmax;transform:translate(-50%,-50%);background:repeating-conic-gradient(from 0deg,color-mix(in srgb,var(--pk2) 22%,transparent) 0 6deg,transparent 6deg 18deg);animation:pkObrot 18s linear infinite;opacity:0;transition:opacity .8s;mask:radial-gradient(circle,#000 0,transparent 55%);-webkit-mask:radial-gradient(circle,#000 0,transparent 55%)}
.pk.faza2 .pk-promienie{opacity:1}
@keyframes pkObrot{to{transform:translate(-50%,-50%) rotate(360deg)}}
.pk-iskry{position:absolute;inset:0;pointer-events:none}
.pk-iskry i{position:absolute;bottom:-10px;width:4px;height:4px;border-radius:50%;background:var(--pk2);box-shadow:0 0 8px var(--pk2);animation:pkIskra linear infinite}
@keyframes pkIskra{to{transform:translateY(-110vh);opacity:0}}
.pk-krok{position:absolute;top:38%;left:50%;transform:translate(-50%,-50%);display:flex;flex-direction:column;align-items:center;gap:10px;text-align:center;opacity:0}
.pk-krok.widac{animation:pkKrok 1.1s cubic-bezier(.2,1.2,.3,1) both}
@keyframes pkKrok{0%{opacity:0;transform:translate(-50%,-30%) scale(1.6)}25%{opacity:1;transform:translate(-50%,-50%) scale(1)}80%{opacity:1}100%{opacity:0;transform:translate(-50%,-60%) scale(.9)}}
.pk-krok small{font-size:13px;letter-spacing:4px;color:var(--pk2);font-weight:800}
.pk-krok b{font-family:Bungee,"Barlow Condensed",sans-serif;font-weight:400;font-size:clamp(30px,10vw,52px);line-height:1;text-shadow:0 0 20px var(--pk2)}
.pk-krok svg{width:110px;height:110px}.pk-krok svg path{fill:color-mix(in srgb,var(--pk2) 40%,transparent);stroke:var(--pk2);stroke-width:2;vector-effect:non-scaling-stroke}
.pk-krok .pk-ovr{font-family:"Barlow Condensed",sans-serif;font-weight:800;font-size:clamp(96px,32vw,160px);line-height:.9;color:#fff;text-shadow:0 0 30px var(--pk2),0 0 60px var(--pk2)}
.pk-karta{width:min(80vw,340px);position:relative;z-index:2;opacity:0}
.pk.faza4 .pk-karta{animation:pkKarta .9s cubic-bezier(.2,1.3,.3,1) both}
@keyframes pkKarta{0%{opacity:0;transform:translateY(60px) rotateY(540deg) scale(.4)}100%{opacity:1;transform:none}}
.pk-blysk{position:absolute;inset:0;background:#fff;opacity:0;pointer-events:none;z-index:3}
.pk.faza4 .pk-blysk{animation:pkBlysk .7s both}
@keyframes pkBlysk{0%{opacity:.9}100%{opacity:0}}
.pk-dol{position:relative;z-index:2;display:flex;gap:10px;opacity:0;transition:opacity .4s}
.pk.faza5 .pk-dol{opacity:1}
.pk-dol button,.pk-dol a{min-height:48px;padding:0 18px;border-radius:14px;border:2px solid var(--pk2);background:rgba(255,255,255,.08);color:#fff;font:800 15px Rubik,sans-serif;display:grid;place-items:center;text-decoration:none;backdrop-filter:blur(4px)}
.pk-dol .glowny{background:var(--pk2);color:#14233A}
.pk-pomin{position:absolute;right:14px;top:calc(env(safe-area-inset-top,0px) + 12px);z-index:5;background:none;border:1px solid rgba(255,255,255,.4);color:#fff;border-radius:999px;padding:6px 12px;font:700 12px Rubik,sans-serif}
.pk-licznik{position:absolute;left:14px;top:calc(env(safe-area-inset-top,0px) + 16px);z-index:5;font:800 12px Rubik,sans-serif;letter-spacing:2px;color:var(--pk2)}
.kd-plecak{position:fixed;right:14px;top:calc(env(safe-area-inset-top,0px) + 12px);z-index:6100;width:52px;height:52px;border-radius:14px;background:#F5B82E;border:3px solid #3A2A14;box-shadow:0 4px 0 #3A2A14;display:grid;place-items:center}
.kd-plecak.bum{animation:kdBum .35s}@keyframes kdBum{50%{transform:scale(1.3)}}
@media (prefers-reduced-motion:reduce){.pk *,.pk{animation:none!important}.pk-karta,.pk-dol{opacity:1!important}}
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
        // powierzchnia zawsze z urzędowych granic PRG
        const g=DANE&&DANE.PO_K[String(f.properties.k)];
        if(g){let a=0;ps.forEach(p=>p.forEach((r,ri)=>{let s=0;for(let i=0,j=r.length-1;i<r.length;j=i++)s+=(r[j][0]-r[i][0])*(r[j][1]+r[i][1]);a+=(ri?-1:1)*Math.abs(s)/2;}));
          g.powierzchnia=Math.round(a*111.32*111.32*Math.cos((b[1]+b[3])/2*Math.PI/180)*10)/10;}});
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
    el.querySelectorAll("img").forEach(i=>i.onerror=()=>{if(i.dataset.osm&&i.src!==i.dataset.osm)i.src=i.dataset.osm;});
  }
  const widok=window.IntersectionObserver?new IntersectionObserver(w=>w.forEach(e=>{if(e.isIntersecting){mapa(e.target);widok.unobserve(e.target);}}),{rootMargin:"300px"}):null;
  function podepnijMapy(root){geometrie().then(()=>root.querySelectorAll(".kk-mapka").forEach(el=>{if(widok&&!el.closest(".pk,.kk-podglad"))widok.observe(el);else mapa(el);}));}
  function holo(el){
    const ruch=(x,y)=>{el.style.setProperty("--x",x+"%");el.style.setProperty("--y",y+"%");el.style.setProperty("--kat",90+x);el.style.transform="perspective(700px) rotateY("+((x-50)/7)+"deg) rotateX("+((50-y)/7)+"deg)";};
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
      const g=karty[i],pelne=g.rz==="diament"||g.rz==="zloto";
      w.className="pk r-"+g.rz;
      const wo=WOJ&&WOJ[g.woj]?WOJ[g.woj]:"";
      let iskry="";for(let n=0;n<(pelne?40:18);n++)iskry+='<i style="left:'+(Math.random()*100).toFixed(1)+'%;animation-duration:'+(3+Math.random()*4).toFixed(1)+'s;animation-delay:'+(-Math.random()*6).toFixed(1)+'s"></i>';
      w.innerHTML='<div class="pk-promienie"></div><div class="pk-iskry">'+iskry+'</div><div class="pk-blysk"></div>'
        +(karty.length>1?'<span class="pk-licznik">NOWA KARTA '+(i+1)+' / '+karty.length+'</span>':'<span class="pk-licznik">NOWA KARTA</span>')+'<button class="pk-pomin">Pomiń ›</button>'
        +'<div class="pk-krok k1"><small>WOJEWÓDZTWO</small>'+wo+'<b>'+esc(g.woj)+'</b></div>'
        +'<div class="pk-krok k2"><small>'+(mnp(g)?"MIASTO NA PRAWACH POWIATU":esc(g.typ.toUpperCase()))+'</small><b>'+(mnp(g)?"MNP":TYP[g.typ]||"GM")+'</b><small style="letter-spacing:2px">'+esc(g.powiat)+'</small></div>'
        +'<div class="pk-krok k3"><small>'+RZ[g.rz].toUpperCase()+' KARTA</small><span class="pk-ovr">'+(g.ovr||"?")+'</span></div>'
        +'<div class="pk-karta">'+karta(g,{tryb:"pelna"})+'</div>'
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
      t.push(setTimeout(odslon,3100));
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

  async function sprawdzPoGrze(){try{const n=await nowe();if(n.length)setTimeout(()=>doInwentarza(n),1200);}catch(e){}}
  return {STATY,przelicz,zaladuj,zdobyte,nowe,liczbaNowych,widziane,doInwentarza,prezentacja,sprawdzPoGrze,karta,styl,podepnijMapy,geometrie,holo,wartosc,RZ,KOLEJ,PROG,gminaPoNazwie,dane:()=>DANE,IKONA,WS};
})();
