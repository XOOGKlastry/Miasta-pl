/* PolandBall: maskotka gry. Bez zależności, działa na każdej stronie.
   PB.svg(mina)              – sama kulka: "zwykla", "radosc", "smutek", "zdziwienie", "mrugniecie"
   PB.dymek(el, tekst, opcje) – kulka z dymkiem w podanym miejscu (opcje.mina, opcje.strona "lewa"/"prawa")
   PB.reakcja(ok)            – krótka reakcja po odpowiedzi w grze (wyskakuje z lewego dolnego rogu)
   Kulka ma kanoniczny wygląd: biała góra, czerwony dół, sympatyczne oczy ze źrenicami. */
window.PB=(function(){
  let nr=0;
  // oczy: białka z czarnymi źrenicami i błyskiem; miny zmieniają kształt
  function oczy(mina){
    const o='stroke="#2B1D0E" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"';
    const oko=(x,y,rx,ry,dx)=>'<ellipse cx="'+x+'" cy="'+y+'" rx="'+rx+'" ry="'+ry+'" fill="#fff" '+o+'/><g class="pb-zr"><ellipse cx="'+(x+(dx||1.2))+'" cy="'+(y+1.6)+'" rx="'+(rx*.48)+'" ry="'+(ry*.5)+'" fill="#1D140A"/><circle cx="'+(x+(dx||1.2)-1.2)+'" cy="'+(y-.4)+'" r="'+(rx*.2)+'" fill="#fff"/></g>';
    if(mina==="radosc")return '<path d="M27 40q5-7 10 0M45 40q5-7 10 0" fill="none" '+o+'/>';
    if(mina==="smutek")return '<g class="pb-oczy">'+oko(32,41,5.4,6.2,0)+oko(50,41,5.4,6.2,0)+'</g><path d="M26 32l10 3M56 32l-10 3" fill="none" '+o+'/>';
    if(mina==="zdziwienie")return '<g class="pb-oczy">'+oko(32,39,7,8)+oko(50,39,7,8)+'</g>';
    if(mina==="mrugniecie")return oko(32,40,5.6,7.2)+'<path d="M45 41q5-5 10 0" fill="none" '+o+'/>';
    return '<g class="pb-oczy">'+oko(32,40,5.6,7.2)+oko(50,40,5.6,7.2)+'</g>';
  }
  // Prawdziwe koło, bez rozciągania w jajko podczas animacji.
  function svg(mina){
    const i=++nr;
    return '<svg class="pb-kula" viewBox="0 0 82 88" aria-hidden="true">'
      +'<defs><clipPath id="pbk'+i+'"><circle cx="41" cy="42" r="33"/></clipPath>'
      +'<radialGradient id="pbb'+i+'" cx=".32" cy=".22" r=".9"><stop offset="0" stop-color="#fffdf6"/><stop offset="1" stop-color="#e5ddc9"/></radialGradient>'
      +'<radialGradient id="pbc'+i+'" cx=".35" cy=".1" r=".95"><stop offset="0" stop-color="#ef564b"/><stop offset="1" stop-color="#c22d30"/></radialGradient></defs>'
      +'<ellipse class="pb-cien" cx="41" cy="82" rx="24" ry="4" fill="#2B1D0E" opacity=".18"/>'
      +'<g class="pb-cialo"><g clip-path="url(#pbk'+i+')"><rect width="82" height="84" fill="url(#pbb'+i+')"/>'
      +'<rect y="42" width="82" height="42" fill="url(#pbc'+i+')"/>'
      +'<ellipse cx="27" cy="23" rx="7" ry="4" fill="#fff" opacity=".5"/></g>'
      +'<circle class="pb-obrys" cx="41" cy="42" r="33" fill="none" stroke="#3b3426" stroke-width="2.4"/>'
      +'<g transform="translate(0 -5)">'+oczy(mina||"zwykla")+'</g></g></svg>';
  }
  function styl(){
    if(document.getElementById("pb-styl"))return;
    const s=document.createElement("style");s.id="pb-styl";
    s.textContent=`
.pb{display:flex;align-items:flex-end;gap:12px}
.pb.prawa{flex-direction:row-reverse}
.pb-kula{width:62px;height:66px;flex:none;overflow:visible}
/* ruch: miękkie podskoki z lekkim kołysaniem, co kilka sekund radosny wyskok; oczy mrugają i się rozglądają */
.pb-kula .pb-cialo{transform-origin:41px 78px;animation:pbOdbicie 5.6s cubic-bezier(.45,0,.55,1) infinite}
.pb-kula .pb-cien{transform-origin:41px 83px;animation:pbCien 5.6s cubic-bezier(.45,0,.55,1) infinite}
.pb-kula .pb-oczy{transform-origin:41px 40px;animation:pbMrug 4.6s infinite}
.pb-kula .pb-zr{animation:pbRozglad 7s ease-in-out infinite}
@keyframes pbOdbicie{0%,100%{transform:translateY(0) rotate(0)}12%{transform:translateY(-5px) rotate(-3deg)}25%{transform:translateY(0) rotate(0)}37%{transform:translateY(-5px) rotate(3deg)}50%{transform:translateY(0) rotate(0)}
 62%{transform:translateY(1px) scale(1.04,.96)}70%{transform:translateY(-16px) rotate(-6deg)}78%{transform:translateY(-16px) rotate(6deg)}86%{transform:translateY(0) scale(1.05,.95)}92%{transform:translateY(-3px)}}
@keyframes pbCien{0%,25%,50%,100%{transform:scale(1);opacity:.18}12%,37%{transform:scale(.85);opacity:.13}70%,78%{transform:scale(.55);opacity:.08}}
@keyframes pbMrug{0%,46%,50%,100%{transform:scaleY(1)}48%{transform:scaleY(.1)}}
@keyframes pbRozglad{0%,20%,100%{transform:translateX(0)}28%,40%{transform:translateX(-2.2px)}50%,62%{transform:translateX(2.2px)}70%{transform:translate(0,-1px)}}
/* dymek: miękkie zaokrąglenia, delikatny gradient i cień, ogonek z czystym obrysem, tekst pisany na oczach */
.pb-dymek{position:relative;max-width:260px;background:linear-gradient(180deg,#FFFDF6,#FFF1D3);color:#3A2A14;border:2.5px solid #3A2A14;border-radius:18px;box-shadow:0 3px 0 #3A2A14,0 10px 18px rgba(58,42,20,.16);padding:9px 14px;font:800 14px/1.35 Rubik,system-ui,sans-serif;margin-bottom:24px;animation:pbDymek .45s cubic-bezier(.3,1.6,.5,1) both}
.pb-dymek::before,.pb-dymek::after{content:"";position:absolute;bottom:12px;width:0;height:0;border-style:solid}
.pb-dymek::before{left:-14px;border-width:8px 14px 8px 0;border-color:transparent #3A2A14 transparent transparent}
.pb-dymek::after{left:-9.5px;border-width:5.5px 10px 5.5px 0;border-color:transparent #FFF6E3 transparent transparent}
.pb.prawa .pb-dymek::before{left:auto;right:-14px;border-width:8px 0 8px 14px;border-color:transparent transparent transparent #3A2A14}
.pb.prawa .pb-dymek::after{left:auto;right:-9.5px;border-width:5.5px 0 5.5px 10px;border-color:transparent transparent transparent #FFF6E3}
.pb-dymek a{color:#B5121F;font-weight:900}
@keyframes pbDymek{from{transform:scale(.5) translateY(8px);opacity:0}}
.pb-reakcja{position:fixed;left:10px;bottom:calc(env(safe-area-inset-bottom,0px) + 86px);z-index:3500;pointer-events:none;transform:translateX(-140%);transition:transform .35s cubic-bezier(.3,1.4,.5,1)}
.pb-reakcja.widac{transform:none}
.pb-reakcja .pb-kula{width:54px;height:58px}
.pb-reakcja .pb-dymek{font-size:13px;margin-bottom:18px;padding:7px 11px}
@media (prefers-reduced-motion:reduce){.pb-kula *{animation:none!important}}
`;
    document.head.appendChild(s);
  }
  function dymek(el,tekst,o){
    styl();o=o||{};
    el.innerHTML='<div class="pb'+(o.strona==="prawa"?" prawa":"")+'">'+svg(o.mina)+(tekst?'<div class="pb-dymek">'+tekst+'</div>':'')+'</div>';
    const d=el.querySelector(".pb-dymek");
    if(d&&!/</.test(tekst)&&tekst.length<140&&!(window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches)){
      const pelny=tekst;d.style.minWidth=Math.min(260,pelny.length*7.2)+"px";d.textContent="";let i=0;
      const t=setInterval(()=>{i+=2;d.textContent=pelny.slice(0,i);if(i>=pelny.length)clearInterval(t);},28);
    }
    return el;
  }
  // reakcja po odpowiedzi: krótko, nie zasłania gry
  const DOBRZE=["Brawo!","Świetnie!","Tak jest!","Znasz Polskę!","Super!","Dokładnie!"],ZLE=["Ojej…","Następnym razem!","Prawie!","Nie szkodzi!"];
  let el=null,t=0,ostatnio=0;
  function reakcja(ok,tekst,ms){
    if(Date.now()-ostatnio<700)return;ostatnio=Date.now();
    styl();
    if(!el){el=document.createElement("div");el.className="pb-reakcja";document.body.appendChild(el);}
    const l=ok?DOBRZE:ZLE;
    dymek(el,tekst||l[Math.floor(Math.random()*l.length)],{mina:ok?"radosc":"smutek"});
    requestAnimationFrame(()=>el.classList.add("widac"));
    clearTimeout(t);t=setTimeout(()=>el.classList.remove("widac"),ms||1800);
  }
  // elementy z atrybutem data-pb="tekst" dostają kulkę z dymkiem automatycznie
  function auto(){document.querySelectorAll("[data-pb]").forEach(e=>{if(!e.dataset.pbZrob){e.dataset.pbZrob=1;dymek(e,e.dataset.pb,{mina:e.dataset.pbMina,strona:e.dataset.pbStrona});}});}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",auto);else setTimeout(auto,0);
  // zmiana tekstu maskotki już po narysowaniu (np. gdy strona policzy stan dnia)
  function powiedz(el,tekst,mina){if(!el)return;el.dataset.pbZrob=1;dymek(el,tekst,{mina:mina||el.dataset.pbMina,strona:el.dataset.pbStrona});}
  return {svg,dymek,reakcja,styl,auto,powiedz};
})();
