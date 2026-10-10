/* Poziom planszy w osobnej grze (Łańcuch, Kształty gmin, Karta w ciemno): pasek z celem na górze
   i wspólny ekran wyniku z gwiazdkami. Gra wywołuje PoziomGra.koniec({gw|proc, wynik, opis}). */
window.PoziomGra=(()=>{
  const q=new URLSearchParams(location.search);
  const n=q.has("poziom")?parseInt(q.get("poziom"),10):NaN,sezon=q.get("sezon")==="2"?2:1;
  const aktywny=!!window.Saga&&Number.isInteger(n)&&n>=0&&n<Saga.ILE;
  const P=aktywny?Saga.poziom(n,sezon):null;
  const esc=t=>String(t).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[c]);
  function styl(){
    if(document.getElementById("poziom-styl"))return;
    const s=document.createElement("style");s.id="poziom-styl";
    s.textContent=".pg-pasek{display:flex;align-items:center;gap:10px;padding:10px 12px;background:#FFF6E0;border:3px solid #3A2A14;border-radius:16px;box-shadow:0 4px 0 #3A2A14;color:#3A2A14;font-family:Rubik,system-ui,sans-serif;margin:0 0 10px}"
      +".pg-pasek .ik{font-size:24px;flex:none}.pg-pasek div{flex:1;min-width:0}.pg-pasek b{display:block;font:400 15px/1.2 Bungee,sans-serif}.pg-pasek small{display:block;font-weight:700;font-size:12px;color:#5A4A2F}"
      +".pg-pasek.s2{background:#EFE6FF}.pg-pasek .wyd{display:inline-block;margin-top:3px;font-size:11px;font-weight:900;color:#fff;background:#E84A3C;border:2px solid #3A2A14;border-radius:8px;padding:1px 6px}"
      +".pg-wynik{position:fixed;inset:0;z-index:7000;display:grid;place-items:center;padding:16px;background:rgba(40,28,10,.6);animation:pgWej .25s both}"
      +"@keyframes pgWej{from{opacity:0}}"
      +".pg-wynik .pole{width:min(100%,400px);box-sizing:border-box;background:#FFF6E0;border:4px solid #3A2A14;border-radius:22px;box-shadow:0 6px 0 #3A2A14;padding:18px 16px;text-align:center;color:#3A2A14;font-family:Rubik,system-ui,sans-serif;display:flex;flex-direction:column;gap:10px}"
      +".pg-wynik .gw{font-size:48px;letter-spacing:6px;line-height:1}.pg-wynik .gw span{color:#D8CDAE;display:inline-block}.pg-wynik .gw span.z{color:#F5B82E;-webkit-text-stroke:2px #3A2A14;animation:pgGw .5s cubic-bezier(.3,1.6,.5,1) both}"
      +"@keyframes pgGw{from{transform:scale(0) rotate(-40deg)}}"
      +".pg-wynik h2{margin:0;font:400 22px Bungee,sans-serif}.pg-wynik p{margin:0;font-weight:700;color:#5A4A2F}"
      +".pg-wynik .odbl{background:#D6F0C9;border:2px solid #3A2A14;border-radius:12px;padding:6px 10px;font-weight:900}.pg-wynik .odbl.nie{background:#FBD9D2}"
      +".pg-wynik .wyd{background:#FFE3DD;border:2px solid #E84A3C;border-radius:12px;padding:6px 10px;font-weight:900;font-size:13px}"
      +".pg-wynik a{min-height:48px;display:grid;place-items:center;border-radius:14px;border:3px solid #3A2A14;box-shadow:0 4px 0 #3A2A14;background:#fff;color:#3A2A14;font:800 15px Rubik,sans-serif;text-decoration:none}"
      +".pg-wynik a.glowny{background:#F5B82E}"
      +"@media (prefers-reduced-motion:reduce){.pg-wynik,.pg-wynik .gw span.z{animation:none}}";
    document.head.appendChild(s);
  }
  // pasek z celem poziomu na początku ekranu gry
  function pasek(cel,gdzie){
    if(!aktywny)return;
    styl();
    const d=document.createElement("div");d.className="pg-pasek"+(sezon===2?" s2":"");
    const G=Saga.GRY[P.specjalna]||{ikona:"⭐"};
    d.innerHTML='<span class="ik">'+G.ikona+'</span><div><b>'+esc(P.nazwa)+'</b><small>'+(sezon===2?"Szlak Mistrzów · ":"")+esc(P.kraina.nazwa)+', poziom '+(P.nrWSwiecie+1)+' · '+esc(cel)+'</small>'
      +(Saga.wTygodniu(n)?'<span class="wyd">🔥 wydarzenie tygodnia: podwójne nagrody</span>':'')+'</div>';
    (gdzie||document.querySelector("main")||document.body).prepend(d);
  }
  function koniec({gw,proc,wynik,opis}){
    if(!aktywny)return null;
    if(gw==null)gw=Saga.gwiazdki(proc||0);
    if(proc==null)proc=[0,40,65,90][gw];
    const r=Saga.zakoncz({n,sezon,gw,wynik:wynik||0,proc});
    styl();
    const w=document.createElement("div");w.className="pg-wynik";
    w.innerHTML='<div class="pole"><div class="gw">'+[1,2,3].map(i=>'<span class="'+(i<=gw?"z":"")+'" style="animation-delay:'+(.2+i*.3)+'s">★</span>').join("")+'</div>'
      +'<h2>'+(gw===3?"Perfekcyjnie!":gw===2?"Świetnie!":gw===1?"Zaliczone!":"Tym razem nie")+'</h2>'
      +'<p>'+esc(opis||"")+'</p>'
      +(r.zal&&!r.bylOdbl&&r.teraz?'<div class="odbl">'+(P.boss?"Nowa kraina odblokowana!":"Odblokowany poziom "+(n+2))+'</div>':'')
      +(!r.zal?'<div class="odbl nie">'+(P.boss?"Stolica regionu wymaga 2 gwiazdek.":"Potrzebujesz choć jednej gwiazdki.")+'</div>':'')
      +(r.wyd?'<div class="wyd">🔥 Wydarzenie tygodnia: '+r.wyd.suma+' pkt'+(r.nagrody.length?' · '+esc(r.nagrody.join(", ")):'')+'</div>':r.nagrody.length?'<p>🎁 '+esc(r.nagrody.join(", "))+'</p>':'')
      +(r.nastepny?'<a class="glowny" href="'+r.nastepny+'">Następny poziom</a>':'')
      +'<a href="'+Saga.adres(n,sezon)+'" onclick="location.reload();return false">Jeszcze raz</a>'
      +'<a href="./#poziom='+(r.teraz?n+1:n)+'">Wróć na planszę</a></div>';
    document.body.appendChild(w);
    if(gw>=2&&window.ZP&&ZP.fanfary)setTimeout(ZP.fanfary,900);
    if(r.zal&&!r.bylOdbl&&r.teraz){try{sessionStorage.setItem("saga-nowy",n+1);}catch(e){}}
    return r;
  }
  return {aktywny,n,sezon,P,pasek,koniec};
})();
