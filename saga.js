/* Plansza przygód: 16 krain (województwa), w każdej 6 poziomów, ostatni to „stolica regionu”.
   Wspólne dla mapy (index.html) i silnika pytań (wyzwanie.html?tryb=saga&poziom=N). */
window.Saga=(function(){
  // kolejność krain: wędrówka wężykiem od Bałtyku po Tatry
  const SWIATY=[
    {woj:"zachodniopomorskie",nazwa:"Pomorze Zachodnie",stolica:"Szczecin",kolor:"#6FB0C9"},
    {woj:"pomorskie",nazwa:"Kaszuby i Trójmiasto",stolica:"Gdańsk",kolor:"#5FA8B8"},
    {woj:"warmińsko-mazurskie",nazwa:"Mazury",stolica:"Olsztyn",kolor:"#6DAF8A"},
    {woj:"podlaskie",nazwa:"Podlasie",stolica:"Białystok",kolor:"#7DB36B"},
    {woj:"mazowieckie",nazwa:"Mazowsze",stolica:"Warszawa",kolor:"#A9B85E"},
    {woj:"kujawsko-pomorskie",nazwa:"Kujawy",stolica:"Toruń",kolor:"#8DB86A"},
    {woj:"wielkopolskie",nazwa:"Wielkopolska",stolica:"Poznań",kolor:"#9CB65C"},
    {woj:"lubuskie",nazwa:"Ziemia Lubuska",stolica:"Zielona Góra",kolor:"#78AE66"},
    {woj:"dolnośląskie",nazwa:"Dolny Śląsk",stolica:"Wrocław",kolor:"#88A95E"},
    {woj:"opolskie",nazwa:"Opolszczyzna",stolica:"Opole",kolor:"#A0AE5A"},
    {woj:"śląskie",nazwa:"Górny Śląsk",stolica:"Katowice",kolor:"#9A9F68"},
    {woj:"łódzkie",nazwa:"Ziemia Łódzka",stolica:"Łódź",kolor:"#B3AE5E"},
    {woj:"świętokrzyskie",nazwa:"Góry Świętokrzyskie",stolica:"Kielce",kolor:"#8FA66A"},
    {woj:"lubelskie",nazwa:"Lubelszczyzna",stolica:"Lublin",kolor:"#B9B060"},
    {woj:"podkarpackie",nazwa:"Podkarpacie",stolica:"Rzeszów",kolor:"#82A56E"},
    {woj:"małopolskie",nazwa:"Małopolska i Tatry",stolica:"Kraków",kolor:"#9AA7B0"}
  ];
  const NA_SWIAT=6;
  const PRZEPISY=[
    {nazwa:"Zwiad",gry:[["z",2],["g",2],["v",1]]},
    {nazwa:"Pamiątki",gry:[["m",2],["h",2],["t",1]]},
    {nazwa:"Granice",gry:[["k",2],["s",2],["w",1]]},
    {nazwa:"Rzeki i kluby",gry:[["r",2],["c",2],["g",1]]},
    {nazwa:"Wszystkiego po trochu",gry:[["z",1],["m",1],["h",1],["t",1],["k",1],["s",1]]},
    {nazwa:"Stolica regionu",gry:[["z",2],["g",1],["m",1],["h",1],["k",1],["t",1],["s",1]],boss:true}
  ];
  const ILE=SWIATY.length*NA_SWIAT;
  function poziom(n){
    const s=Math.floor(n/NA_SWIAT),i=n%NA_SWIAT,p=PRZEPISY[i];
    return {n,swiat:s,nrWSwiecie:i,boss:!!p.boss,nazwa:p.nazwa,woj:SWIATY[s].woj,kraina:SWIATY[s],
      gry:p.gry.map(([t,ile])=>({t,ile})),pytan:p.gry.reduce((a,g)=>a+g[1],0),progGwiazd:p.boss?2:1};
  }
  const KLUCZ="saga-v1";
  function stan(){try{return JSON.parse(localStorage.getItem(KLUCZ)||"null")||{gw:{},wynik:{}};}catch(e){return {gw:{},wynik:{}};}}
  function zapisz(n,gwiazdki,wynik){
    const s=stan();
    if(!(s.gw[n]>=gwiazdki))s.gw[n]=gwiazdki;
    if(!(s.wynik[n]>=wynik))s.wynik[n]=wynik;
    s.ost=n;localStorage.setItem(KLUCZ,JSON.stringify(s));return s;
  }
  function gwiazdki(proc){return proc>=85?3:proc>=65?2:proc>=40?1:0;}
  function odblokowany(n,s){
    s=s||stan();if(n===0)return true;
    const p=poziom(n-1);return (s.gw[n-1]||0)>=p.progGwiazd;
  }
  function biezacy(s){s=s||stan();let n=0;while(n<ILE-1&&odblokowany(n+1,s))n++;return n;}
  function sumaGwiazd(s){s=s||stan();return Object.values(s.gw).reduce((a,b)=>a+b,0);}
  // kostka: sześć ścianek, każda to kategoria gier
  const KOSTKA=[
    {id:"mapa",nazwa:"Mapa",gry:[["g",3],["z",2]]},
    {id:"zdjecia",nazwa:"Zdjęcia",gry:[["m",3],["z",2]]},
    {id:"symbole",nazwa:"Symbole",gry:[["h",2],["t",2],["c",1]]},
    {id:"granice",nazwa:"Granice",gry:[["k",2],["s",2],["v",1]]},
    {id:"liczby",nazwa:"Liczby",gry:[["w",3],["v",2]]},
    {id:"woda",nazwa:"Rzeki",gry:[["r",3],["g",2]]}
  ];
  return {SWIATY,NA_SWIAT,ILE,poziom,stan,zapisz,gwiazdki,odblokowany,biezacy,sumaGwiazd,KOSTKA};
})();
