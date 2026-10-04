/* Przyciski w prawym górnym rogu: puchar (ranking) i kolekcja kart. Ten sam wygląd na każdym ekranie.
   Strony z wspolne.js dostają je przez ZP; pozostałe ekrany ładują ten plik. */
(function(){
  const PUCHAR='<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3A2A14" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"><path d="M7 3h10v6a5 5 0 0 1-10 0z" fill="#FFF6E0"/><path d="M7 5H4c0 3 1.2 5 3.2 5.4M17 5h3c0 3-1.2 5-3.2 5.4"/><path d="M10 14.5h4l.6 3.5H9.4z" fill="#FFF6E0"/><rect x="7" y="18" width="10" height="3" rx="1" fill="#E84A3C"/><path d="M10.2 6.5l1.8-1 1.8 1-.4 2h-2.8z" fill="#F5B82E" stroke-width="1.4"/></svg>';
  const KARTY='<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#3A2A14" stroke-width="2" stroke-linejoin="round"><rect x="3" y="4" width="11" height="16" rx="2" fill="#B9E3FF" transform="rotate(-10 8 12)"/><rect x="10" y="4" width="11" height="16" rx="2" fill="#FFF6E0" transform="rotate(8 15 12)"/></svg>';
  function styl(){
    if(document.getElementById("zp-ng-styl"))return;
    const s=document.createElement("style");s.id="zp-ng-styl";
    s.textContent=".zp-ng{position:relative;flex:none;margin-left:6px;width:42px;height:42px;border-radius:12px;display:grid;place-items:center;background:#F5B82E;border:3px solid #3A2A14;box-shadow:0 3px 0 #3A2A14;text-decoration:none}"
      +".zp-ng.puchar{background:#FFF6E0}.zp-ng:active{transform:translateY(3px);box-shadow:0 0 0 #3A2A14}"
      +".zp-ng[aria-current=page]{outline:3px solid #fff;outline-offset:1px}";
    document.head.appendChild(s);
  }
  function dodaj(){
    const h=document.querySelector("body header");if(!h||h.querySelector(".zp-ng.puchar"))return;
    styl();
    const tu=/ranking\.html/.test(location.pathname),album=/karty\.html/.test(location.pathname);
    const p=document.createElement("a");p.className="zp-ng puchar";p.href="ranking.html";p.setAttribute("aria-label","Ranking");p.title="Ranking";p.innerHTML=PUCHAR;
    if(tu)p.setAttribute("aria-current","page");
    // kolekcja: istniejący przycisk (plansza, gry) albo nowy
    let k=h.querySelector(".kolekcja,.zp-kol");
    if(!k&&!album){k=document.createElement("a");k.className="zp-ng";k.href="karty.html";k.setAttribute("aria-label","Kolekcja kart");k.title="Kolekcja kart";k.innerHTML=KARTY;h.appendChild(k);}
    if(k)h.insertBefore(p,k);else h.appendChild(p);
  }
  window.ZPNaglowek={dodaj};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",dodaj);else dodaj();
})();
