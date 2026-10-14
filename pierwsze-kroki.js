/* Pierwsze kroki nowego gracza: od razu pytanie, krótki samouczek w grze i menu odkrywane stopniowo.
   Nowy gracz = telefon bez śladów gry sprzed liczników (tm-od z telemetria.js nie jest „?”) i bez gwiazdek na planszy.
   Starzy gracze widzą wszystko jak dotąd. */
window.PK=(function(){
 const czyt=k=>{try{return localStorage.getItem(k);}catch(e){return null;}};
 const pisz=(k,v)=>{try{localStorage.setItem(k,v);}catch(e){}};
 const strona=(location.pathname.split("/").pop()||"index.html");
 // ile poziomów pierwszej planszy ma choć jedną gwiazdkę
 function poziomy(){try{const s=JSON.parse(czyt("saga-v1")||"null");return s&&s.gw?Object.values(s.gw).filter(g=>g>0).length:0;}catch(e){return 0;}}
 // gracz sprzed samouczka albo ktoś, kto już coś odkrył: bez ograniczeń
 const stary=()=>czyt("tm-od")==="?"||czyt("pk-wszystko")==="1";
 // menu odkrywane stopniowo: ile poziomów planszy trzeba, żeby pokazać zakładkę
 const PROGI={codzienne:1,gry:2,znajomi:3};
 const NAZWY={codzienne:"Codzienne",gry:"Gry",znajomi:"Znajomi"};
 function odkryte(n){if(stary())return true;const p=PROGI[n];return p==null||poziomy()>=p;}
 function styl(){
  if(document.getElementById("pk-styl"))return;const s=document.createElement("style");s.id="pk-styl";
  s.textContent="nav.dol a.pk-zamk{opacity:.45;position:relative}nav.dol a.pk-zamk::after{content:'🔒';position:absolute;top:0;right:calc(50% - 22px);font-size:11px}"
   +"nav.dol a.pk-nowe{position:relative}nav.dol a.pk-nowe::after{content:'NOWE';position:absolute;top:-6px;right:calc(50% - 30px);background:#E84A3C;color:#fff;border:2px solid #3A2A14;border-radius:999px;font:900 8px/1 Rubik,sans-serif;padding:3px 5px}"
   +".pk-dymek{position:fixed;left:50%;transform:translateX(-50%);z-index:7000;width:min(92vw,420px);box-sizing:border-box;background:#FFF6E0;color:#3A2A14;border:4px solid #3A2A14;border-radius:18px;box-shadow:0 5px 0 #3A2A14;padding:12px 14px;font:700 15px/1.35 Rubik,system-ui,sans-serif;display:flex;gap:10px;align-items:center;animation:pkW .35s cubic-bezier(.3,1.3,.4,1)}"
   +".pk-dymek b{font-family:Bungee,Rubik,sans-serif;font-weight:400}.pk-dymek .pk-x{margin-left:auto;flex:none;border:3px solid #3A2A14;border-radius:12px;background:#F5B82E;font:900 14px Rubik,sans-serif;min-height:40px;padding:0 12px;color:#3A2A14;cursor:pointer}"
   +"@keyframes pkW{from{opacity:0;transform:translate(-50%,12px)}}@media (prefers-reduced-motion:reduce){.pk-dymek{animation:none}}";
  document.head.appendChild(s);
 }
 // krótka wskazówka (jedna naraz); gora=true pod nagłówkiem, inaczej nad dolną krawędzią
 let dymek=null;
 function wskazowka(html,opcje){
  opcje=opcje||{};styl();if(dymek)dymek.remove();
  dymek=document.createElement("div");dymek.className="pk-dymek";dymek.setAttribute("role","status");
  dymek.style[opcje.gora?"top":"bottom"]=opcje.gora?"calc(env(safe-area-inset-top,0px) + 74px)":"calc(env(safe-area-inset-bottom,0px) + 90px)";
  dymek.innerHTML='<span style="font-size:26px" aria-hidden="true">'+(opcje.ikona||"💡")+'</span><span>'+html+'</span>'+(opcje.przycisk?'<button type="button" class="pk-x">'+opcje.przycisk+'</button>':'');
  const d=dymek,zamknij=()=>{d.remove();if(dymek===d)dymek=null;};
  if(opcje.przycisk)d.querySelector(".pk-x").onclick=()=>{zamknij();if(opcje.po)opcje.po();};
  document.body.appendChild(d);if(opcje.czas)setTimeout(zamknij,opcje.czas);
  return zamknij;
 }
 // dolna nawigacja: zamknięte zakładki przygaszone, świeżo odkryta z „NOWE”
 function menu(){
  const nav=document.querySelector("nav.dol");if(!nav)return;styl();
  let widziane={};try{widziane=JSON.parse(czyt("pk-menu")||"{}");}catch(e){}
  nav.querySelectorAll("a[data-n]").forEach(a=>{
   const n=a.dataset.n;if(PROGI[n]==null)return;
   if(!odkryte(n)){
    a.classList.add("pk-zamk");a.setAttribute("aria-disabled","true");
    a.addEventListener("click",e=>{e.preventDefault();const brak=PROGI[n]-poziomy();
     wskazowka("<b>"+NAZWY[n]+"</b> odblokujesz po "+brak+" "+(brak===1?"poziomie":"poziomach")+" na planszy. Graj dalej!",{ikona:"🔒",czas:3500});});
   }else if(!stary()&&!widziane[n]){
    a.classList.add("pk-nowe");
    a.addEventListener("click",()=>{widziane[n]=1;pisz("pk-menu",JSON.stringify(widziane));});
   }
  });
 }
 // plansza: nowy gracz bez gwiazdek trafia od razu do pierwszego pytania (raz; potem plansza jak zwykle)
 function plansza(adresPierwszego){
  if(stary()||poziomy()>0||czyt("pk-start"))return false;
  pisz("pk-start","1");
  if(window.Telemetria)Telemetria.zdarzenie("samouczek:start",{raz:true});
  location.replace(adresPierwszego+(adresPierwszego.includes("?")?"&":"?")+"pierwszy=1");
  return true;
 }
 // silnik: pierwsza gra bez ekranu startowego i trzy krótkie wskazówki
 const pierwszaGra=()=>/[?&]pierwszy=1/.test(location.search);
 function wGrze(krok){
  if(!pierwszaGra())return;
  if(krok==="pytanie")wskazowka("Wybierz odpowiedź. <b>Szybciej</b> = więcej punktów.",{ikona:"👆",gora:true,czas:5000});
  else if(krok==="odpowiedz")wskazowka("Tak to działa! Każde pytanie uczy czegoś o Polsce. Stuknij „Dalej”.",{ikona:"🎉",gora:true,czas:4500});
  else if(krok==="koniec"){
   if(window.Telemetria)Telemetria.zdarzenie("samouczek:koniec",{raz:true});
   wskazowka("Gwiazdki otwierają kolejne poziomy i nowe zakładki w menu. Wracaj codziennie po Wyzwanie dnia!",{ikona:"⭐",przycisk:"OK"});
  }
 }
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",menu);else menu();
 return {odkryte,poziomy,stary,wskazowka,plansza,pierwszaGra,wGrze,PROGI};
})();
