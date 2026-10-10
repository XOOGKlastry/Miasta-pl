/* Plansza przygód: 16 krain (województwa), w każdej 6 poziomów, ostatni to „stolica regionu”.
   Dwie plansze (sezony): 1 „Odkrywca” i 2 „Szlak Mistrzów” (trudniej: bez podpowiedzi, 15 s na pytanie),
   który odblokowuje się po ukończeniu całej pierwszej planszy.
   Czwarty poziom każdej krainy to osobna gra (Łańcuch, Kształty gmin, Karta w ciemno, Wyścig po mapie).
   Co tydzień jedna kraina ma podwójne nagrody i osobną tabelę wyników (wydarzenie tygodnia).
   Wspólne dla mapy (index.html), silnika pytań (wyzwanie.html?tryb=saga&poziom=N) i gier z poziomami. */
window.Saga=(function(){
  // kolejność krain: wędrówka wężykiem od Bałtyku po Tatry
  const SWIATY=[
    {woj:"zachodniopomorskie",nazwa:"Zachodniopomorskie",stolica:"Szczecin",kolor:"#6FB0C9"},
    {woj:"pomorskie",nazwa:"Pomorskie",stolica:"Gdańsk",kolor:"#5FA8B8"},
    {woj:"warmińsko-mazurskie",nazwa:"Warmińsko-mazurskie",stolica:"Olsztyn",kolor:"#6DAF8A"},
    {woj:"podlaskie",nazwa:"Podlaskie",stolica:"Białystok",kolor:"#7DB36B"},
    {woj:"mazowieckie",nazwa:"Mazowieckie",stolica:"Warszawa",kolor:"#A9B85E"},
    {woj:"kujawsko-pomorskie",nazwa:"Kujawsko-pomorskie",stolica:"Toruń",kolor:"#8DB86A"},
    {woj:"wielkopolskie",nazwa:"Wielkopolskie",stolica:"Poznań",kolor:"#9CB65C"},
    {woj:"lubuskie",nazwa:"Lubuskie",stolica:"Zielona Góra",kolor:"#78AE66"},
    {woj:"dolnośląskie",nazwa:"Dolnośląskie",stolica:"Wrocław",kolor:"#88A95E"},
    {woj:"opolskie",nazwa:"Opolskie",stolica:"Opole",kolor:"#A0AE5A"},
    {woj:"śląskie",nazwa:"Śląskie",stolica:"Katowice",kolor:"#9A9F68"},
    {woj:"łódzkie",nazwa:"Łódzkie",stolica:"Łódź",kolor:"#B3AE5E"},
    {woj:"świętokrzyskie",nazwa:"Świętokrzyskie",stolica:"Kielce",kolor:"#8FA66A"},
    {woj:"lubelskie",nazwa:"Lubelskie",stolica:"Lublin",kolor:"#B9B060"},
    {woj:"podkarpackie",nazwa:"Podkarpackie",stolica:"Rzeszów",kolor:"#82A56E"},
    {woj:"małopolskie",nazwa:"Małopolskie",stolica:"Kraków",kolor:"#9AA7B0"}
  ];
  const NA_SWIAT=6,ILE=SWIATY.length*NA_SWIAT;
  // osobne gry w poziomach: zmieniają się z krainy na krainę, żeby każda grała się inaczej
  const GRY={
    lancuch:{nazwa:"Łańcuch krainy",ikona:"🔗",opis:"gminy na ostatnią literę, start w tej krainie"},
    ksztalt:{nazwa:"Kształty gmin",ikona:"🧩",opis:"rozpoznaj gminy tej krainy po konturze"},
    ciemno:{nazwa:"Karta w ciemno",ikona:"🃏",opis:"wybierz najlepszą kartę z tej krainy"},
    mapa:{nazwa:"Wyścig po mapie",ikona:"📍",opis:"wskaż miejsca na mapie, zanim minie czas"}
  };
  const KOLEJ_GIER=["lancuch","ksztalt","ciemno","mapa"];
  // sezon 1: od najłatwiejszych do najtrudniejszych; kształt powiatu dopiero pod koniec krainy
  const PRZEPISY={
    1:[
      {nazwa:"Zwiad",gry:[["z",2],["g",2],["w",1]]},
      {nazwa:"Pamiątki",gry:[["m",2],["h",2],["t",1],["w",1]]},
      {nazwa:"Rzeki i kluby",gry:[["r",2],["c",2],["g",1]]},
      {gra:true},
      {nazwa:"Granice",gry:[["s",2],["w",1],["k",2]]},
      {nazwa:"Stolica regionu",gry:[["z",2],["g",1],["m",1],["h",1],["t",1],["s",1],["k",1]],boss:true}
    ],
    // sezon 2 „Szlak Mistrzów”: bez podpowiedzi, 15 s na pytanie, także małe miejscowości
    2:[
      {nazwa:"Mapa bez podpowiedzi",gry:[["g",3],["z",2],["v",1]]},
      {nazwa:"Symbole",gry:[["h",2],["t",2],["c",2]]},
      {nazwa:"Rzeki i granice",gry:[["r",2],["s",2],["p",2]]},
      {gra:true},
      {nazwa:"Kształty",gry:[["k",3],["s",2],["p",1]]},
      {nazwa:"Mistrz regionu",gry:[["z",1],["g",1],["m",1],["h",1],["t",1],["r",1],["s",1],["k",1],["p",1]],boss:true}
    ]
  };
  const SEZONY={1:{nazwa:"Odkrywca",klucz:"saga-v1"},2:{nazwa:"Szlak Mistrzów",klucz:"saga-s2"}};
  function graKrainy(s,sezon){return KOLEJ_GIER[(s+(sezon===2?2:0))%KOLEJ_GIER.length];}
  function poziom(n,sezon){
    sezon=sezon===2?2:1;
    const s=Math.floor(n/NA_SWIAT),i=n%NA_SWIAT,p=PRZEPISY[sezon][i];
    const baza={n,sezon,swiat:s,nrWSwiecie:i,boss:!!p.boss,woj:SWIATY[s].woj,kraina:SWIATY[s],progGwiazd:p.boss?2:1,
      czas:sezon===2?15:0,podp:sezon!==2,wielk:sezon===2?"dsm":(i<=2?"ds":"dsm")};
    if(p.gra){
      const g=graKrainy(s,sezon),G=GRY[g];
      // wyścig po mapie to zwykłe pytania „Gdzie to jest?” na czas, w silniku pytań
      if(g==="mapa")return Object.assign(baza,{nazwa:G.nazwa,gra:null,specjalna:"mapa",gry:[{t:"g",ile:6}],pytan:6,czas:sezon===2?10:15});
      return Object.assign(baza,{nazwa:G.nazwa,gra:g,specjalna:g,gry:[],pytan:0});
    }
    return Object.assign(baza,{nazwa:p.nazwa,gra:null,gry:p.gry.map(([t,ile])=>({t,ile})),pytan:p.gry.reduce((a,g)=>a+g[1],0)});
  }
  // adres poziomu: silnik pytań albo osobna gra
  function adres(n,sezon){
    const p=poziom(n,sezon),z="&poziom="+n+(p.sezon===2?"&sezon=2":"");
    if(p.gra==="lancuch")return "lancuch.html?"+z.slice(1);
    if(p.gra==="ksztalt")return "ksztalt.html?rodzaj=g"+z;
    if(p.gra==="ciemno")return "karta-w-ciemno.html?"+z.slice(1);
    return "wyzwanie.html?tryb=saga"+z;
  }
  function stan(sezon){try{return JSON.parse(localStorage.getItem(SEZONY[sezon===2?2:1].klucz)||"null")||{gw:{},wynik:{}};}catch(e){return {gw:{},wynik:{}};}}
  function zapisz(n,gwiazdki,wynik,sezon){
    const s=stan(sezon);
    if(!(s.gw[n]>=gwiazdki))s.gw[n]=gwiazdki;
    if(!(s.wynik[n]>=wynik))s.wynik[n]=wynik;
    s.ost=n;localStorage.setItem(SEZONY[sezon===2?2:1].klucz,JSON.stringify(s));return s;
  }
  function gwiazdki(proc){return proc>=80?3:proc>=55?2:proc>=30?1:0;}
  // pierwsza plansza ukończona: stolica ostatniej krainy z wymaganymi gwiazdkami
  function ukonczona(sezon){return (stan(sezon).gw[ILE-1]||0)>=poziom(ILE-1,sezon).progGwiazd;}
  function odblokowany(n,s,sezon){
    sezon=sezon===2?2:1;s=s||stan(sezon);
    if(n===0)return sezon===1||ukonczona(1);
    const p=poziom(n-1,sezon);return (s.gw[n-1]||0)>=p.progGwiazd;
  }
  function biezacy(s,sezon){s=s||stan(sezon);let n=0;while(n<ILE-1&&odblokowany(n+1,s,sezon))n++;return n;}
  function sumaGwiazd(s){s=s||stan();return Object.values(s.gw).reduce((a,b)=>a+b,0);}
  function ukonczonych(sezon){const s=stan(sezon);let k=0;for(let n=0;n<ILE;n++)if((s.gw[n]||0)>=poziom(n,sezon).progGwiazd)k++;return k;}
  // sezon na planszy: wybór gracza, a drugi tylko po odblokowaniu
  function sezon(){let z=1;try{z=+localStorage.getItem("saga-sezon")||1;}catch(e){}return z===2&&ukonczona(1)?2:1;}
  function ustawSezon(z){try{localStorage.setItem("saga-sezon",String(z===2?2:1));}catch(e){}}

  /* ---- wydarzenie tygodnia: jedna kraina, podwójne nagrody, tabela wyników ---- */
  function tydzien(d){
    d=d||new Date();
    // tydzień ISO, liczony od poniedziałku
    const t=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));const dz=t.getUTCDay()||7;t.setUTCDate(t.getUTCDate()+4-dz);
    const rok=t.getUTCFullYear(),nr=Math.ceil(((t-Date.UTC(rok,0,1))/864e5+1)/7);
    const klucz=rok+"-W"+String(nr).padStart(2,"0");
    let h=0;for(const c of klucz)h=(h*31+c.charCodeAt(0))>>>0;
    const kon=new Date(d.getFullYear(),d.getMonth(),d.getDate()+(8-(d.getDay()||7)));   // najbliższy poniedziałek 00:00
    return {klucz,kraina:h%SWIATY.length,koniec:kon};
  }
  function wydarzenieStan(klucz){try{return JSON.parse(localStorage.getItem("wydarzenie-"+klucz)||"null")||{pkt:{},bonus:{}};}catch(e){return {pkt:{},bonus:{}};}}
  function wydarzenieSuma(klucz){const w=wydarzenieStan(klucz||tydzien().klucz);return Object.values(w.pkt).reduce((a,b)=>a+b,0);}
  function wTygodniu(n){return Math.floor(n/NA_SWIAT)===tydzien().kraina;}
  // zakończenie poziomu (wspólne dla silnika pytań i osobnych gier): zapis, nagrody, wydarzenie
  function zakoncz({n,sezon,gw,wynik,proc}){
    sezon=sezon===2?2:1;
    const P=poziom(n,sezon),przed=stan(sezon),bylOdbl=n+1<ILE&&odblokowany(n+1,przed,sezon);
    const s=zapisz(n,gw,wynik,sezon),teraz=n+1<ILE&&odblokowany(n+1,s,sezon);
    const id=(sezon===2?"s2:":"")+n;
    const nagrody=[];
    const paczka=nazwa=>{const f=()=>Karty.nagrodaZa(nazwa).then(g=>{if(g&&window.ZP&&ZP.komunikat)ZP.komunikat("Paczka trafiła do albumu kart!",3200);}).catch(()=>{});
      if(window.Karty)f();else{const sc=document.createElement("script");sc.src="karty.js?v=22";sc.onload=f;document.head.appendChild(sc);}};
    if(gw===3){paczka("poziom:"+id);nagrody.push("paczka za 3 gwiazdki");}
    let wyd=null;
    if(wTygodniu(n)&&gw>0){
      const T=tydzien(),w=wydarzenieStan(T.klucz),pkt=gw*100+Math.max(0,Math.min(100,Math.round(proc||0))),stare=w.pkt[id]||0;
      if(pkt>stare)w.pkt[id]=pkt;
      // podwójne nagrody: monety za pierwsze zaliczenie w tygodniu i dodatkowa paczka za 3 gwiazdki
      if(!w.bonus[id]){w.bonus[id]=1;if(window.ZP&&ZP.zeton)ZP.zeton(5);else try{localStorage.setItem("karty-zetony",String((+localStorage.getItem("karty-zetony")||0)+5));}catch(e){}nagrody.push("+5 monet wydarzenia");}
      if(gw===3&&!w.bonus[id+":3"]){w.bonus[id+":3"]=1;paczka("wydarzenie:"+T.klucz+":"+id);nagrody.push("dodatkowa paczka wydarzenia");}
      try{localStorage.setItem("wydarzenie-"+T.klucz,JSON.stringify(w));}catch(e){}
      wyd={klucz:T.klucz,pkt,suma:wydarzenieSuma(T.klucz),poprawa:pkt>stare};
      // wynik tygodnia do rankingu (gdy gracz jest w rankingu)
      try{if(window.Online&&Online.enabled()&&Online.dolaczony()&&Online.wydarzenie)Online.wydarzenie.zapisz(T.klucz,wyd.suma).catch(()=>{});}catch(e){}
    }
    return {P,zal:gw>=P.progGwiazd,bylOdbl,teraz,nagrody,wyd,nastepny:teraz?adres(n+1,sezon):null};
  }
  // kostka: sześć ścianek, każda to kategoria gier
  const KOSTKA=[
    {id:"mapa",nazwa:"Mapa",gry:[["g",3],["z",2]]},
    {id:"zdjecia",nazwa:"Zdjęcia",gry:[["m",3],["z",2]]},
    {id:"symbole",nazwa:"Symbole",gry:[["h",2],["t",2],["c",1]]},
    {id:"granice",nazwa:"Granice",gry:[["k",2],["s",2],["v",1]]},
    {id:"liczby",nazwa:"Liczby",gry:[["w",3],["v",2]]},
    {id:"woda",nazwa:"Rzeki",gry:[["r",3],["g",2]]}
  ];
  return {SWIATY,NA_SWIAT,ILE,GRY,SEZONY,poziom,adres,stan,zapisz,gwiazdki,odblokowany,biezacy,sumaGwiazd,ukonczona,ukonczonych,sezon,ustawSezon,
    tydzien,wydarzenieStan,wydarzenieSuma,wTygodniu,zakoncz,KOSTKA};
})();
