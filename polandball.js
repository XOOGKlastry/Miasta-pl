/* PolandBall: maskotka gry. Bez zależności, działa na każdej stronie.
   PB.svg(mina)              – sama kulka: "zwykla", "radosc", "smutek", "zdziwienie", "mrugniecie"
   PB.dymek(el, tekst, opcje) – kulka z dymkiem w podanym miejscu (opcje.mina, opcje.strona "lewa"/"prawa")
   PB.reakcja(ok)            – krótka reakcja po odpowiedzi w grze (wyskakuje z lewego dolnego rogu)
   Kulka ma kanoniczny wygląd: biała góra, czerwony dół, białe oczy bez źrenic. */
window.PB=(function(){
  let nr=0;
  function oczy(mina){
    const o='stroke="#2B1D0E" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"';
    if(mina==="radosc")return '<path d="M25 37q6-8 12 0" fill="none" '+o+'/><path d="M45 37q6-8 12 0" fill="none" '+o+'/>';
    if(mina==="smutek")return '<g class="pb-oczy"><path d="M25 33q6 6 12 4v6q-6 2-12-3z" fill="#fff" '+o+'/><path d="M57 33q-6 6-12 4v6q6 2 12-3z" fill="#fff" '+o+'/></g>';
    if(mina==="zdziwienie")return '<g class="pb-oczy"><circle cx="31" cy="36" r="7.5" fill="#fff" '+o+'/><circle cx="51" cy="36" r="7.5" fill="#fff" '+o+'/></g>';
    if(mina==="mrugniecie")return '<ellipse cx="31" cy="36" rx="5.6" ry="7" fill="#fff" '+o+'/><path d="M45 37q6-6 12 0" fill="none" '+o+'/>';
    return '<g class="pb-oczy"><ellipse cx="31" cy="36" rx="5.6" ry="7" fill="#fff" '+o+'/><ellipse cx="51" cy="36" rx="5.6" ry="7" fill="#fff" '+o+'/></g>';
  }
  function svg(mina){
    const i=++nr;
    return '<svg class="pb-kula" viewBox="0 0 82 86" aria-hidden="true">'
      +'<defs><clipPath id="pbk'+i+'"><circle cx="41" cy="41" r="34"/></clipPath>'
      +'<radialGradient id="pbb'+i+'" cx=".35" cy=".3" r=".75"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#E6E3DA"/></radialGradient>'
      +'<radialGradient id="pbc'+i+'" cx=".35" cy=".1" r=".9"><stop offset="0" stop-color="#F2414F"/><stop offset="1" stop-color="#B5121F"/></radialGradient></defs>'
      +'<ellipse class="pb-cien" cx="41" cy="81" rx="24" ry="3.6" fill="#2B1D0E" opacity=".22"/>'
      +'<g class="pb-cialo"><g clip-path="url(#pbk'+i+')"><rect x="0" y="0" width="82" height="43" fill="url(#pbb'+i+')"/><rect x="0" y="43" width="82" height="40" fill="url(#pbc'+i+')"/>'
      +'<ellipse cx="29" cy="20" rx="12" ry="7" fill="#fff" opacity=".7"/></g>'
      +'<circle cx="41" cy="41" r="34" fill="none" stroke="#2B1D0E" stroke-width="3.2"/>'+oczy(mina||"zwykla")+'</g></svg>';
  }
  function styl(){
    if(document.getElementById("pb-styl"))return;
    const s=document.createElement("style");s.id="pb-styl";
    s.textContent=`
.pb{display:flex;align-items:flex-end;gap:10px}
.pb.prawa{flex-direction:row-reverse}
.pb-kula{width:64px;height:68px;flex:none;overflow:visible}
.pb-kula .pb-cialo{transform-origin:41px 78px;animation:pbOdbicie 2.2s cubic-bezier(.45,0,.55,1) infinite}
.pb-kula .pb-cien{transform-origin:41px 81px;animation:pbCien 2.2s cubic-bezier(.45,0,.55,1) infinite}
.pb-kula .pb-oczy{transform-origin:41px 36px;animation:pbMrug 4.6s infinite}
@keyframes pbOdbicie{0%,100%{transform:translateY(0) scale(1.06,.94)}12%{transform:translateY(0) scale(1,1)}50%{transform:translateY(-9px) scale(.97,1.03)}88%{transform:translateY(0) scale(1,1)}}
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
  function reakcja(ok,tekst){
    if(Date.now()-ostatnio<700)return;ostatnio=Date.now();
    styl();
    if(!el){el=document.createElement("div");el.className="pb-reakcja";document.body.appendChild(el);}
    const l=ok?DOBRZE:ZLE;
    dymek(el,tekst||l[Math.floor(Math.random()*l.length)],{mina:ok?"radosc":"smutek"});
    requestAnimationFrame(()=>el.classList.add("widac"));
    clearTimeout(t);t=setTimeout(()=>el.classList.remove("widac"),1500);
  }
  // elementy z atrybutem data-pb="tekst" dostają kulkę z dymkiem automatycznie
  function auto(){document.querySelectorAll("[data-pb]").forEach(e=>{if(!e.dataset.pbZrob){e.dataset.pbZrob=1;dymek(e,e.dataset.pb,{mina:e.dataset.pbMina,strona:e.dataset.pbStrona});}});}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",auto);else setTimeout(auto,0);
  return {svg,dymek,reakcja,styl,auto};
})();
