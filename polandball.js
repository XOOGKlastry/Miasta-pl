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
    const oko=(x,y,rx,ry,dx)=>'<ellipse cx="'+x+'" cy="'+y+'" rx="'+rx+'" ry="'+ry+'" fill="#fff" '+o+'/><ellipse cx="'+(x+(dx||1.2))+'" cy="'+(y+1.6)+'" rx="'+(rx*.48)+'" ry="'+(ry*.5)+'" fill="#1D140A"/><circle cx="'+(x+(dx||1.2)-1.2)+'" cy="'+(y-.4)+'" r="'+(rx*.2)+'" fill="#fff"/>';
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
.pb{display:flex;align-items:flex-end;gap:10px}
.pb.prawa{flex-direction:row-reverse}
.pb-kula{width:62px;height:66px;flex:none;overflow:visible}
.pb-kula .pb-cialo{transform-origin:41px 80px;animation:pbOdbicie 2.8s cubic-bezier(.45,0,.55,1) infinite}
.pb-kula .pb-cien{transform-origin:41px 83px;animation:pbCien 2.8s cubic-bezier(.45,0,.55,1) infinite}
.pb-kula .pb-oczy{transform-origin:41px 40px;animation:pbMrug 4.6s infinite}
@keyframes pbOdbicie{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
@keyframes pbCien{0%,100%{transform:scale(1)}50%{transform:scale(.75);opacity:.12}}
@keyframes pbMrug{0%,46%,50%,100%{transform:scaleY(1)}48%{transform:scaleY(.1)}}
.pb-dymek{position:relative;background:#FFF6E0;color:#3A2A14;border:3px solid #3A2A14;border-radius:16px;box-shadow:0 4px 0 #3A2A14;padding:9px 13px;font:800 14px/1.3 Rubik,system-ui,sans-serif;margin-bottom:22px;animation:pbDymek .45s cubic-bezier(.3,1.6,.5,1) both}
.pb-dymek::before{content:"";position:absolute;left:-12px;bottom:10px;width:16px;height:16px;background:#FFF6E0;border-left:3px solid #3A2A14;border-bottom:3px solid #3A2A14;transform:skewY(-30deg) rotate(10deg)}
.pb.prawa .pb-dymek::before{left:auto;right:-12px;border-left:none;border-right:3px solid #3A2A14;transform:skewY(30deg) rotate(-10deg)}
@keyframes pbDymek{from{transform:scale(.4) translateY(10px);opacity:0}}
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
  return {svg,dymek,reakcja,styl,auto};
})();
