/* Telemetria bez ciasteczek i bez identyfikatorów:
   1) błędy JavaScript z telefonów (zgrupowane na serwerze po treści, przeglądarka tylko z nazwy),
   2) liczniki ruchu (wizyty, strony, początek i koniec gier) z kohortą = dniem pierwszej wizyty,
      więc da się policzyć, ilu graczy wraca, ale nie da się rozpoznać żadnego z nich,
   3) „Zgłoś błąd w pytaniu” (okienko dla silnika i innych gier).
   Ładowany jako pierwszy skrypt na stronie, nie zależy od innych plików. */
window.Telemetria=(function(){
 const CFG=()=>window.ONLINE_CONFIG||{url:"https://dhzjqxhoiaroauimoepq.supabase.co",key:"sb_publishable_tfncaLD_9cjaDGmOZAbeaw_zyE4TX04"};
 const strona=(location.pathname.split("/").pop()||"index.html").replace(/\.html$/,"")||"index";
 const dzien=()=>{const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");};
 const czyt=k=>{try{return localStorage.getItem(k);}catch(e){return null;}};
 const pisz=(k,v)=>{try{localStorage.setItem(k,v);}catch(e){}};
 const lokalnie=(/^(localhost|127\.|0\.0\.0\.0)/.test(location.hostname)||location.protocol==="file:")&&!czyt("tm-test");
 function rpc(fn,body,keepalive){
  const c=CFG();if(!c.url||!c.key)return Promise.reject(Error("brak konfiguracji"));
  return fetch(c.url+"/rest/v1/rpc/"+fn,{method:"POST",keepalive:!!keepalive,headers:{apikey:c.key,"Content-Type":"application/json"},body:JSON.stringify(body)})
   .then(async r=>{const d=await r.json().catch(()=>null);if(!r.ok)throw Error(d&&(d.message||d.msg)||"Nie udało się wysłać.");return d;});
 }
 const przegladarka=(()=>{const u=navigator.userAgent||"";
  const b=/SamsungBrowser/.test(u)?"Samsung":/EdgA?\//.test(u)?"Edge":/Firefox|FxiOS/.test(u)?"Firefox":/OPR\//.test(u)?"Opera":/CriOS|Chrome/.test(u)?"Chrome":/Safari/.test(u)?"Safari":"inna";
  const s=/Android/.test(u)?"Android":/iPhone|iPad|iPod/.test(u)?"iOS":/Windows/.test(u)?"Windows":/Mac OS/.test(u)?"Mac":/Linux/.test(u)?"Linux":"";
  return (b+" "+s).trim();})();
 const wersja=(()=>{const d=new Date(document.lastModified);return isNaN(d)?"":d.toISOString().slice(0,16).replace("T"," ");})();

 /* ---------- 1. błędy ---------- */
 let ileBledow=0;const wyslane=new Set();
 function blad(wiad,zrodlo,stos){
  wiad=String(wiad||"").slice(0,300);
  if(!wiad||ileBledow>=5||lokalnie)return;
  if(/^Script error\.?$/i.test(wiad)||/ResizeObserver loop|Non-Error promise rejection|AbortError|The user aborted|Load failed|Failed to fetch|NetworkError/i.test(wiad))return;
  // tylko nasze pliki (nie rozszerzenia przeglądarki ani obce skrypty)
  if(zrodlo&&/^(chrome|moz|safari)-extension:|^webkit-masked-url:/.test(zrodlo))return;
  if(zrodlo&&/^https?:/.test(zrodlo)&&!zrodlo.startsWith(location.origin))return;
  const kl=wiad+"|"+zrodlo;if(wyslane.has(kl))return;wyslane.add(kl);ileBledow++;
  const plik=String(zrodlo||"").replace(location.origin,"").replace(/^\/[^/]*\//,"");
  rpc("zglos_blad_js",{p_strona:strona,p_wiadomosc:wiad,p_zrodlo:plik.slice(0,200),p_stos:String(stos||"").replace(new RegExp(location.origin.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),"g"),"").slice(0,1500),p_wersja:wersja,p_przegladarka:przegladarka},true).catch(()=>{});
 }
 window.addEventListener("error",e=>{if(!e||!e.message)return;blad(e.message,e.filename?e.filename+":"+(e.lineno||0)+":"+(e.colno||0):"",e.error&&e.error.stack);});
 window.addEventListener("unhandledrejection",e=>{const r=e&&e.reason;blad(r&&r.message?r.message:typeof r==="string"?r:"",r&&r.stack&&(String(r.stack).split("\n").find(l=>l.includes(location.origin))||""),r&&r.stack);});

 /* ---------- 2. liczniki ruchu ---------- */
 const nieSledz=navigator.doNotTrack==="1"||window.doNotTrack==="1";
 // dzień pierwszej wizyty; dla graczy sprzed telemetrii nie wiemy, więc „?” (bez kohorty)
 let od=czyt("tm-od");
 if(!od){let stary=false;try{for(let i=0;i<localStorage.length;i++){if(!/^tm-/.test(localStorage.key(i))){stary=true;break;}}}catch(e){}
  od=stary?"?":dzien();pisz("tm-od",od);}
 const kohorta=()=>od==="?"?null:od;
 let kolejka=[],zegar=null;
 function wyslijKolejke(keepalive){
  if(zegar){clearTimeout(zegar);zegar=null;}
  if(!kolejka.length)return;
  const paczka=kolejka.splice(0,30);
  rpc("licz_ruch",{p_zdarzenia:paczka},keepalive).catch(()=>{});
  if(kolejka.length)wyslijKolejke(keepalive);
 }
 // zdarzenie: np. "start:dzien", "koniec:dzien"; raz:true liczy najwyżej raz dziennie na tym telefonie
 function zdarzenie(z,opcje){
  if(nieSledz||lokalnie)return;
  z=String(z||"").toLowerCase().replace(/[^a-z0-9:_.-]/g,"").slice(0,48);if(!z)return;
  if(opcje&&opcje.raz){
   const d=dzien();let s;try{s=JSON.parse(czyt("tm-dzis")||"{}");}catch(e){s={};}
   if(s.d!==d)s={d,z:[]};if(s.z.includes(z))return;s.z.push(z);pisz("tm-dzis",JSON.stringify(s));
  }
  const e={z};const k=kohorta();if(k)e.k=k;kolejka.push(e);
  if(!zegar)zegar=setTimeout(()=>wyslijKolejke(false),2500);
 }
 document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="hidden")wyslijKolejke(true);});
 window.addEventListener("pagehide",()=>wyslijKolejke(true));
 zdarzenie("wizyta",{raz:true});
 zdarzenie("strona:"+strona,{raz:true});
 if(kohorta()===dzien())zdarzenie("nowy:"+strona,{raz:true});

 /* ---------- 3. zgłoś błąd w pytaniu ---------- */
 const POWODY=["Zła odpowiedź","Literówka w nazwie","Złe zdjęcie, herb albo mapa","Niejasne pytanie","Inne"];
 let styl=false;
 function dodajStyl(){if(styl)return;styl=true;const s=document.createElement("style");s.textContent=
  ".tm-tlo{position:fixed;inset:0;z-index:9999;background:rgba(20,12,4,.55);display:flex;align-items:flex-end;justify-content:center;padding:12px;box-sizing:border-box}"
  +".tm-okno{width:100%;max-width:440px;max-height:calc(100dvh - 24px);overflow:auto;background:#FFF6E0;color:#5C3A1E;border:3px solid #5C3A1E;border-radius:18px;box-shadow:0 6px 0 #5C3A1E;padding:16px;box-sizing:border-box;font-family:Rubik,system-ui,sans-serif}"
  +".tm-okno h3{margin:0 0 4px;font-family:Bungee,Rubik,sans-serif;font-weight:400;font-size:18px}"
  +".tm-okno p{margin:0 0 10px;font-size:13px;font-weight:700;opacity:.8;overflow-wrap:anywhere}"
  +".tm-powody{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 10px}"
  +".tm-powody button{border:2px solid #5C3A1E;border-radius:999px;background:#fff;color:#5C3A1E;font:700 13px Rubik,system-ui,sans-serif;padding:7px 11px;min-height:36px;cursor:pointer}"
  +".tm-powody button.akt{background:#F2C14E}"
  +".tm-okno textarea{width:100%;box-sizing:border-box;min-height:70px;border:2px solid #5C3A1E;border-radius:12px;padding:8px;font:500 14px Rubik,system-ui,sans-serif;color:#5C3A1E;background:#fff;resize:vertical}"
  +".tm-dol{display:flex;gap:8px;margin-top:10px}.tm-dol button{flex:1;min-height:44px;border:3px solid #5C3A1E;border-radius:14px;font:900 15px Rubik,system-ui,sans-serif;color:#5C3A1E;cursor:pointer;box-shadow:0 3px 0 #5C3A1E}"
  +".tm-dol .tm-wyslij{background:#F2C14E}.tm-dol .tm-anuluj{background:#fff}.tm-dol button:disabled{opacity:.5}"
  +".tm-info{font-size:13px;font-weight:700;margin-top:8px;min-height:1em}"
  +".tm-zglos{display:inline-flex;align-items:center;gap:4px;margin-top:6px;border:0;background:none;color:inherit;opacity:.75;font:700 12px Rubik,system-ui,sans-serif;text-decoration:underline;cursor:pointer;padding:4px 0}";
  document.head.appendChild(s);}
 // dane: {gra, typ, pytanie, poprawna, kontekst}
 function zglos(dane){
  dodajStyl();dane=dane||{};
  const tlo=document.createElement("div");tlo.className="tm-tlo";tlo.setAttribute("role","dialog");tlo.setAttribute("aria-modal","true");tlo.setAttribute("aria-label","Zgłoś błąd w pytaniu");
  tlo.innerHTML='<div class="tm-okno"><h3>⚑ Zgłoś błąd</h3><p class="tm-pyt"></p><div class="tm-powody">'+POWODY.map(p=>'<button type="button">'+p+'</button>').join("")
   +'</div><textarea maxlength="600" placeholder="Co jest nie tak? Jak powinno być? (opcjonalnie)"></textarea><div class="tm-info" aria-live="polite"></div>'
   +'<div class="tm-dol"><button type="button" class="tm-anuluj">Anuluj</button><button type="button" class="tm-wyslij" disabled>Wyślij</button></div></div>';
  tlo.querySelector(".tm-pyt").textContent=[dane.pytanie,dane.poprawna?"Odpowiedź: "+dane.poprawna:""].filter(Boolean).join(" · ");
  let powod="";const wyslij=tlo.querySelector(".tm-wyslij"),pole=tlo.querySelector("textarea"),info=tlo.querySelector(".tm-info");
  const sprawdz=()=>{wyslij.disabled=!powod||(powod==="Inne"&&pole.value.trim().length<3);};
  tlo.querySelectorAll(".tm-powody button").forEach(b=>b.onclick=()=>{powod=b.textContent;tlo.querySelectorAll(".tm-powody button").forEach(x=>x.classList.toggle("akt",x===b));sprawdz();});
  pole.oninput=sprawdz;
  const zamknij=()=>{tlo.remove();document.removeEventListener("keydown",esc);};
  const esc=e=>{if(e.key==="Escape")zamknij();};document.addEventListener("keydown",esc);
  tlo.addEventListener("click",e=>{if(e.target===tlo)zamknij();});
  tlo.querySelector(".tm-anuluj").onclick=zamknij;
  wyslij.onclick=async()=>{
   wyslij.disabled=true;info.textContent="Wysyłam…";
   let u={};try{if(window.Online&&Online.urzadzenie)u=Online.urzadzenie()||{};}catch(e){}
   try{
    await rpc("zglos_pytanie",{p_device:u.id||null,p_token:u.sekret||null,p_gra:String(dane.gra||strona),p_typ:String(dane.typ||""),p_pytanie:String(dane.pytanie||"").slice(0,400),
     p_poprawna:String(dane.poprawna||"").slice(0,400),p_powod:powod,p_uwagi:pole.value.trim().slice(0,600),p_kontekst:dane.kontekst||null,p_strona:strona});
    info.textContent="Dziękujemy! Sprawdzimy to i poprawimy.";setTimeout(zamknij,1400);
   }catch(e){info.textContent=e.message||"Nie udało się wysłać. Spróbuj później.";wyslij.disabled=false;}
  };
  document.body.appendChild(tlo);tlo.querySelector(".tm-powody button").focus();
 }
 // mały przycisk pod odpowiedzią; dane() wywoływane dopiero po stuknięciu
 function przycisk(dane){dodajStyl();const b=document.createElement("button");b.type="button";b.className="tm-zglos";b.textContent="⚑ Zgłoś błąd w pytaniu";b.onclick=e=>{e.stopPropagation();zglos(typeof dane==="function"?dane():dane);};return b;}
 return {zdarzenie,zglos,przycisk,blad,strona};
})();
