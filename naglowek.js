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
      +".zp-ng[aria-current=page]{outline:3px solid #fff;outline-offset:1px}"
      +".zp-ng .zp-wiad{position:absolute;right:-8px;top:-8px;min-width:20px;height:20px;padding:0 4px;border-radius:999px;background:#E84A3C;color:#fff;border:2px solid #3A2A14;font:900 11px/16px Rubik,sans-serif;text-align:center;box-sizing:border-box}";
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
  // czerwona kropka z liczbą nieprzeczytanych wiadomości i wyzwań na pucharze
  function odznaka(n){
    const p=document.querySelector(".zp-ng.puchar");if(!p)return;
    let b=p.querySelector(".zp-wiad");
    if(!n){if(b)b.remove();p.setAttribute("aria-label","Ranking");return;}
    if(!b){b=document.createElement("span");b.className="zp-wiad";p.appendChild(b);}
    b.textContent=n>9?"9+":n;p.setAttribute("aria-label","Ranking, nowe wiadomości: "+n);
    p.href="ranking.html?wiadomosci";
  }
  // wspólne wywołanie funkcji bazy jako ten gracz (urządzenie albo konto)
  async function rpc(fn,body){
    const prof=JSON.parse(localStorage.getItem("ranking-profile")||"{}"),u=JSON.parse(localStorage.getItem("ranking-urzadzenie")||"null");
    if(!prof.nick||!u||!u.id)return undefined;
    if(!window.ONLINE_CONFIG)await new Promise(ok=>{const s=document.createElement("script");s.src="online-config.js";s.onload=s.onerror=ok;document.head.appendChild(s);});
    const cfg=window.ONLINE_CONFIG||{};if(!cfg.url||!cfg.key)return undefined;
    let tok=null;try{const s=JSON.parse(localStorage.getItem("online-session")||"null");if(s&&s.expires_at>Date.now()+60000)tok=s.access_token;}catch(e){}
    const r=await fetch(cfg.url+"/rest/v1/rpc/"+fn,{method:"POST",headers:{apikey:cfg.key,"Content-Type":"application/json",...(tok?{Authorization:"Bearer "+tok}:{})},body:JSON.stringify({p_device:u.id,p_token:u.sekret,...(body||{})})});
    const d=await r.json().catch(()=>null);if(!r.ok)throw Error(d&&d.message||"Błąd połączenia");return d;
  }
  async function sprawdzWiadomosci(){
    try{
      if(/ranking\.html/.test(location.pathname))return;
      const c=JSON.parse(sessionStorage.getItem("wiad-nieprz")||"null");
      if(c&&Date.now()-c.t<90000){odznaka(c.n);return;}
      const n=await rpc("unread_count");if(n===undefined)return;
      sessionStorage.setItem("wiad-nieprz",JSON.stringify({n:+n||0,t:Date.now()}));odznaka(+n||0);
    }catch(e){}
  }

  /* ---- walki na żywo: obecność (co 20 s) i zaproszenia na każdym ekranie ---- */
  const wWalce=()=>/wyzwanie\.html/.test(location.pathname)&&/tryb=walka/.test(location.search);
  const odrzucone=new Set();let pingT=null,okno=null;
  const escN=t=>String(t).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"})[c]);
  function stylWalki(){
    if(document.getElementById("zp-walka-styl"))return;
    const s=document.createElement("style");s.id="zp-walka-styl";
    s.textContent=".zp-zapr{position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 16px);transform:translateX(-50%);z-index:8000;width:min(92vw,400px);box-sizing:border-box;background:#FFF6E0;border:4px solid #3A2A14;border-radius:20px;box-shadow:0 6px 0 #3A2A14,0 10px 40px rgba(0,0,0,.35);padding:14px;font-family:Rubik,system-ui,sans-serif;color:#3A2A14;animation:zpZapr .35s cubic-bezier(.3,1.3,.4,1)}"
      +"@keyframes zpZapr{from{transform:translate(-50%,120%)}}"
      +".zp-zapr b.t{display:block;font:400 18px/1.15 Bungee,sans-serif;margin:0 0 4px}"
      +".zp-zapr p{margin:0 0 10px;font-weight:700;font-size:14px}"
      +".zp-zapr .r{display:grid;grid-template-columns:1fr 1fr;gap:8px}"
      +".zp-zapr button{min-height:48px;border-radius:14px;border:3px solid #3A2A14;box-shadow:0 4px 0 #3A2A14;font:800 15px Rubik,sans-serif;color:#3A2A14;background:#fff;cursor:pointer}"
      +".zp-zapr button.tak{background:#F5B82E}"
      +".zp-zapr .czas{height:8px;border-radius:999px;background:#F3E6C4;border:2px solid #3A2A14;overflow:hidden;margin:0 0 10px}"
      +".zp-zapr .czas i{display:block;height:100%;background:#E84A3C;transition:width 1s linear}"
      +"@media (prefers-reduced-motion:reduce){.zp-zapr{animation:none}}";
    document.head.appendChild(s);
  }
  function pokazZaproszenie(z){
    if(okno&&okno.dataset.id===z.id)return;
    if(okno)okno.remove();stylWalki();
    const tryb=z.mode==="mapa"?"📍 Wyścig na mapie":"⚔️ Quiz na żywo";
    okno=document.createElement("div");okno.className="zp-zapr";okno.dataset.id=z.id;okno.setAttribute("role","alertdialog");
    okno.innerHTML='<b class="t">'+escN(z.nick)+' wyzywa Cię!</b><p>'+tryb+' · walka na żywo, liczy się do rankingu.</p><div class="czas"><i style="width:'+(100*z.left/60)+'%"></i></div><div class="r"><button type="button" class="nie">Nie teraz</button><button type="button" class="tak">Walczę!</button></div>';
    document.body.appendChild(okno);
    if(navigator.vibrate)try{navigator.vibrate([60,40,60]);}catch(e){}
    let zost=z.left;const pasek=okno.querySelector(".czas i"),t=setInterval(()=>{zost--;pasek.style.width=Math.max(0,100*zost/60)+"%";if(zost<=0){clearInterval(t);if(okno&&okno.dataset.id===z.id){okno.remove();okno=null;}}},1000);
    okno.querySelector(".nie").onclick=async()=>{clearInterval(t);odrzucone.add(z.id);okno.remove();okno=null;try{await rpc("live_respond",{p_id:z.id,p_accept:false});}catch(e){}};
    okno.querySelector(".tak").onclick=async e=>{
      e.target.disabled=true;e.target.textContent="Łączę…";
      try{const st=await rpc("live_respond",{p_id:z.id,p_accept:true});
        if(st==="live"){location.href="wyzwanie.html?tryb=walka&mecz="+encodeURIComponent(z.id);return;}
        okno.querySelector("p").textContent="Zaproszenie wygasło.";setTimeout(()=>{if(okno){okno.remove();okno=null;}},2000);
      }catch(err){okno.querySelector("p").textContent=err.message;e.target.disabled=false;e.target.textContent="Walczę!";}
    };
  }
  function pokazTrwajaca(id){
    if(document.getElementById("zp-trwa")||okno)return;stylWalki();
    const d=document.createElement("div");d.className="zp-zapr";d.id="zp-trwa";
    d.innerHTML='<b class="t">Trwa Twoja walka!</b><p>Rywal na Ciebie czeka.</p><div class="r"><button type="button" class="nie">Zamknij</button><button type="button" class="tak">Wracam</button></div>';
    document.body.appendChild(d);
    d.querySelector(".nie").onclick=()=>d.remove();
    d.querySelector(".tak").onclick=()=>{location.href="wyzwanie.html?tryb=walka&mecz="+encodeURIComponent(id);};
  }
  async function pingWalki(){
    clearTimeout(pingT);
    if(wWalce())return;
    if(!document.hidden){
      try{
        const p=await rpc("live_ping");
        if(p){
          const z=(p.invites||[]).find(x=>!odrzucone.has(x.id));
          if(z)pokazZaproszenie(z);
          else if(p.active)pokazTrwajaca(p.active);
        }
      }catch(e){}
    }
    pingT=setTimeout(pingWalki,20000);
  }
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)pingWalki();});
  window.ZPNaglowek={dodaj,odznaka,pingWalki};
  const start=()=>{dodaj();setTimeout(sprawdzWiadomosci,1500);setTimeout(pingWalki,800);};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start);else start();
})();
