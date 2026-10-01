/* Instalacja aplikacji z przeglądarki: na Androidzie i komputerze systemowe okno instalacji,
   na iPhonie krótka instrukcja (Safari nie pozwala wywołać instalacji z kodu). */
window.Instaluj=(function(){
  let odlozone=null;const sluchacze=[];
  window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();odlozone=e;sluchacze.forEach(f=>f());});
  window.addEventListener("appinstalled",()=>{odlozone=null;try{localStorage.setItem("zainstalowana","1");}catch(x){}sluchacze.forEach(f=>f());});
  const ios=/iphone|ipad|ipod/i.test(navigator.userAgent)&&!window.MSStream;
  function zainstalowana(){return (window.matchMedia&&matchMedia("(display-mode: standalone)").matches)||navigator.standalone===true;}
  function mozna(){return !zainstalowana()&&(!!odlozone||ios);}
  function okno(html){
    const o=document.createElement("div");
    o.style.cssText="position:fixed;inset:0;z-index:5000;background:rgba(40,28,10,.6);display:flex;align-items:flex-end;justify-content:center;padding:12px";
    o.innerHTML='<div style="width:100%;max-width:520px;background:#FFF6E0;color:#3A2A14;border:4px solid #3A2A14;border-radius:18px;box-shadow:0 6px 0 #3A2A14;padding:18px;font-family:Rubik,system-ui,sans-serif">'+html
      +'<button style="margin-top:12px;width:100%;min-height:50px;border:4px solid #3A2A14;border-radius:14px;background:#F5B82E;font:700 16px Rubik,sans-serif;box-shadow:0 5px 0 #3A2A14">Rozumiem</button></div>';
    o.onclick=e=>{if(e.target===o||e.target.tagName==="BUTTON")o.remove();};
    document.body.appendChild(o);
  }
  async function zainstaluj(){
    if(odlozone){odlozone.prompt();const w=await odlozone.userChoice.catch(()=>null);odlozone=null;sluchacze.forEach(f=>f());return w&&w.outcome==="accepted";}
    if(ios){okno('<b style="font-size:20px">Zainstaluj na iPhonie</b><ol style="margin:10px 0 0;padding-left:20px;line-height:1.6;font-size:15px"><li>Otwórz grę w <b>Safari</b>.</li><li>Stuknij <b>Udostępnij</b> (kwadrat ze strzałką w górę) na dole ekranu.</li><li>Wybierz <b>„Do ekranu początkowego”</b> i stuknij <b>„Dodaj”</b>.</li></ol>');return false;}
    okno('<b style="font-size:20px">Zainstaluj aplikację</b><p style="margin:8px 0 0;line-height:1.5;font-size:15px">W menu przeglądarki (⋮ albo ikona instalacji na pasku adresu) wybierz <b>„Zainstaluj aplikację”</b> albo <b>„Dodaj do ekranu głównego”</b>.</p>');
    return false;
  }
  function naZmiane(f){sluchacze.push(f);}
  return {mozna,zainstaluj,zainstalowana,naZmiane,ios};
})();
