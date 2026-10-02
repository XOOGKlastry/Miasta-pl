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
  function przelicz(){
    const g=DANE.g;g.forEach(x=>x.oc={});
    ocena(g,"ludnosc");ocena(g,"powierzchnia");ocena(g,"saldo_migracji");ocena(g,"wodociag_proc");ocena(g,"kanalizacja_proc");ocena(g,"bezrobocie_proc",true);
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

  /* animacja: nowe karty wyskakują i lecą do ikony inwentarza w prawym górnym rogu */
  const KOLORY={diament:["#E9F7FF","#4C7BD9"],zloto:["#FFE27A","#9A6B00"],srebro:["#E9EEF2","#7D8A96"],braz:["#EBC09B","#9C5A2C"],zwykla:["#FFF6E0","#C9B38A"]};
  function mini(g){
    const [t,r]=KOLORY[g.rz];
    return '<div class="kd-karta" style="background:'+t+';border-color:'+r+'"><span class="kd-ovr">'+(g.ovr||"–")+'</span><span class="kd-rz" style="color:'+r+'">'+RZ[g.rz]+'</span><b>'+g.n+'</b><small>woj. '+g.woj+'</small></div>';
  }
  function styl(){
    if(document.getElementById("kd-styl"))return;
    const s=document.createElement("style");s.id="kd-styl";
    s.textContent=".kd-warstwa{position:fixed;inset:0;z-index:4500;background:rgba(30,20,6,.6);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:20px;animation:kdPojaw .25s both;font-family:Rubik,system-ui,sans-serif}"
      +"@keyframes kdPojaw{from{opacity:0}}"
      +".kd-tytul{font-family:Bungee,sans-serif;font-size:26px;color:#FFF6E0;text-shadow:0 3px 0 #3A2A14;text-align:center}"
      +".kd-rzad{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}"
      +".kd-karta{width:96px;aspect-ratio:5/7;border:3px solid;border-radius:10px;clip-path:polygon(50% 0,100% 6%,100% 88%,50% 100%,0 88%,0 6%);display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:2px;padding:6px;color:#3A2A14;position:relative;animation:kdKarta .6s cubic-bezier(.3,1.5,.5,1) both;text-align:center}"
      +".kd-karta b{font-size:12px;line-height:1.1}.kd-karta small{font-size:9px;font-weight:700}"
      +".kd-ovr{position:absolute;left:6px;top:4px;font-family:Bungee,sans-serif;font-size:22px}.kd-rz{position:absolute;right:6px;top:8px;font-size:8px;font-weight:900;text-transform:uppercase}"
      +"@keyframes kdKarta{from{transform:rotateY(180deg) scale(.3);opacity:0}}"
      +".kd-btn{display:flex;gap:10px}.kd-btn a,.kd-btn button{min-height:46px;padding:0 16px;border:3px solid #3A2A14;border-radius:14px;box-shadow:0 4px 0 #3A2A14;background:#F5B82E;font:700 15px Rubik,sans-serif;color:#3A2A14;display:grid;place-items:center;text-decoration:none}"
      +".kd-btn button{background:#FFF6E0}"
      +".kd-plecak{position:fixed;right:14px;top:calc(env(safe-area-inset-top,0px) + 12px);z-index:4600;width:52px;height:52px;border-radius:14px;background:#F5B82E;border:3px solid #3A2A14;box-shadow:0 4px 0 #3A2A14;display:grid;place-items:center;animation:kdPojaw .3s both}"
      +".kd-plecak.bum{animation:kdBum .35s}@keyframes kdBum{50%{transform:scale(1.3)}}";
    document.head.appendChild(s);
  }
  const IKONA='<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#3A2A14" stroke-width="2" stroke-linejoin="round"><rect x="3" y="4" width="11" height="16" rx="2" fill="#B9E3FF" transform="rotate(-10 8 12)"/><rect x="10" y="4" width="11" height="16" rx="2" fill="#FFF6E0" transform="rotate(8 15 12)"/></svg>';
  function doInwentarza(karty){
    if(!karty||!karty.length)return;
    styl();
    const w=document.createElement("div");w.className="kd-warstwa";
    const pokaz=karty.slice(0,5);
    w.innerHTML='<div class="kd-tytul">'+(karty.length===1?"Nowa karta!":"Nowe karty: "+karty.length)+'</div><div class="kd-rzad">'+pokaz.map((g,i)=>mini(g).replace('class="kd-karta"','class="kd-karta" style="animation-delay:'+(i*.15)+'s"')).join("")+'</div>'
      +'<div class="kd-btn"><a href="karty.html">Zobacz kolekcję</a><button>Dalej</button></div>';
    document.body.appendChild(w);
    const pl=document.createElement("a");pl.className="kd-plecak";pl.href="karty.html";pl.innerHTML=IKONA;document.body.appendChild(pl);
    if(window.ZP&&(karty[0].rz==="diament"||karty[0].rz==="zloto"))setTimeout(ZP.fanfary,400);
    const zamknij=()=>{
      // karty odlatują do ikony kolekcji
      const cel=pl.getBoundingClientRect();
      w.querySelectorAll(".kd-karta").forEach((k,i)=>{const r=k.getBoundingClientRect();
        k.animate([{transform:"none",opacity:1},{transform:"translate("+(cel.left+26-r.left-r.width/2)+"px,"+(cel.top+26-r.top-r.height/2)+"px) scale(.15) rotate(25deg)",opacity:.6}],{duration:650,delay:i*90,easing:"cubic-bezier(.5,0,.75,0)",fill:"forwards"});});
      w.style.transition="background .5s";w.style.background="transparent";
      w.querySelectorAll(".kd-tytul,.kd-btn").forEach(e=>e.style.visibility="hidden");
      setTimeout(()=>{pl.classList.add("bum");},650+pokaz.length*90);
      setTimeout(()=>{w.remove();},900+pokaz.length*90);
      setTimeout(()=>{pl.remove();},2200+pokaz.length*90);
    };
    w.querySelector("button").onclick=zamknij;
  }
  async function sprawdzPoGrze(){try{const n=await nowe();if(n.length)setTimeout(()=>doInwentarza(n),1200);}catch(e){}}
  return {przelicz,zaladuj,zdobyte,nowe,liczbaNowych,widziane,doInwentarza,sprawdzPoGrze,RZ,KOLEJ,PROG,gminaPoNazwie,dane:()=>DANE,IKONA};
})();
