/* Warstwa konta gracza. Teraz działa lokalnie (profil w tej przeglądarce);
   później ta sama warstwa dostanie wersję z Firebase Authentication i Firestore,
   więc gry nie trzeba będzie zmieniać. Opis: docs/projekt-gry.md */
window.Konto=(function(){
  const KLUCZ="profil-v1";
  const AWATARY=["🦊","🐻","🦉","🐺","🦌","🐗","🦅","🐿️","🦫","🐸","🦔","🐝"];
  const METODY=[
    {id:"gosc",nazwa:"Gość",opis:"bez rejestracji, postęp tylko na tym urządzeniu",dostepna:true},
    {id:"google",nazwa:"Google",opis:"jedno stuknięcie na Androidzie",dostepna:!!window.Online?.enabled()},
    {id:"email",nazwa:"E-mail",opis:"link logujący bez hasła",dostepna:!!window.Online?.enabled()},
    {id:"facebook",nazwa:"Facebook",opis:"tylko podstawowy profil i e-mail",dostepna:!!window.Online?.enabled()}
  ];
  function czytaj(){try{return JSON.parse(localStorage.getItem(KLUCZ)||"null");}catch(e){return null;}}
  function profil(){
    let p=czytaj();
    if(!p){p={nick:localStorage.getItem("nick")||"",awatar:AWATARY[Math.floor(Math.random()*AWATARY.length)],utworzono:new Date().toISOString(),metoda:"gosc",id:"lokalny-"+Math.random().toString(36).slice(2,10)};zapisz(p);}
    return p;
  }
  function zapisz(p){try{localStorage.setItem(KLUCZ,JSON.stringify(p));if(p.nick)localStorage.setItem("nick",p.nick);}catch(e){}}
  function ustaw(zmiany){const p=Object.assign(profil(),zmiany);zapisz(p);return p;}
  // poziom z liczby trafnych odpowiedzi we wszystkich grach (tryb nauki)
  function poziom(){
    let ok=0;try{const n=JSON.parse(localStorage.getItem("nauka-v1")||"{}");Object.values(n).forEach(r=>ok+=r.ok||0);}catch(e){}
    const poz=Math.floor(Math.sqrt(ok/8))+1,od=8*(poz-1)*(poz-1),do_=8*poz*poz;
    return {poziom:poz,xp:ok,postep:(ok-od)/(do_-od),doNastepnego:do_-ok};
  }
  function zaloguj(metoda){if(metoda==="gosc")return Promise.resolve();location.href="logowanie.html";return Promise.resolve();}
  function wyloguj(){return window.Online?Online.logout():Promise.resolve();}
  function usunDane(){try{localStorage.clear();}catch(e){}if(window.caches)caches.keys().then(k=>k.forEach(x=>caches.delete(x)));}
  return {profil,ustaw,poziom,zaloguj,wyloguj,usunDane,METODY,AWATARY};
})();
