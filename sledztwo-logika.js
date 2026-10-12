/* Śledztwo: PolandBall ukrył się w jednym z powiatów województwa. Wskazówki to zależności widoczne na mapie
   (sąsiedzi, odległość w granicach, inne województwa, granica Polski, miasta na prawach powiatu, kierunek, nazwa),
   razem wskazują dokładnie jeden powiat i żadnej nie da się pominąć. Czysta logika (bez DOM), do testów w node.
   Powiat: {k, n, city, wk (kod woj.), nb [kody sąsiadów], bb [lonMin, latMin, lonMax, latMax], lon, lat, granica (przy granicy Polski)} */
(function(glob){
  const WOJ={"02":"dolnośląskie","04":"kujawsko-pomorskie","06":"lubelskie","08":"lubuskie","10":"łódzkie","12":"małopolskie","14":"mazowieckie","16":"opolskie","18":"podkarpackie","20":"podlaskie","22":"pomorskie","24":"śląskie","26":"świętokrzyskie","28":"warmińsko-mazurskie","30":"wielkopolskie","32":"zachodniopomorskie"};
  const MIN_W=3,MAX_W=5,MARGINES=.012;
  const nazwa=p=>(p.city?"miasto ":"powiat ")+p.n;
  const ref=p=>'<b data-ref="'+p.k+'">'+nazwa(p)+'</b>';
  const pick=(l,rnd)=>l[Math.floor(rnd()*l.length)];
  const tasuj=(l,rnd)=>{l=l.slice();for(let i=l.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[l[i],l[j]]=[l[j],l[i]];}return l;};
  const liczba=(n,a,b,c)=>n===1?a:n%10>=2&&n%10<=4&&(n%100<10||n%100>=20)?b:c;

  // łuki topologii użyte tylko przez jeden powiat leżą na granicy Polski (lądowej albo morskiej)
  function przyGranicy(topologia,obiekt){
    const g=topologia.objects[obiekt||"powiaty"].geometries,uz=new Map(),zbierz=(a,f)=>a.forEach(x=>Array.isArray(x)?zbierz(x,f):f(x<0?~x:x));
    g.forEach(x=>zbierz(x.arcs,i=>uz.set(i,(uz.get(i)||0)+1)));
    const wynik=new Set();g.forEach(x=>{let t=false;zbierz(x.arcs,i=>{if(uz.get(i)===1)t=true;});if(t)wynik.add(x.properties.k);});
    return wynik;
  }
  // odległość w krokach przez sąsiednie powiaty (opcjonalnie tylko w obrębie zbioru)
  function odleglosci(PO,start,wolno){
    const d=new Map([[start,0]]),kol=[start];
    for(let i=0;i<kol.length;i++){const k=kol[i];for(const n of PO.get(k).nb)if(!d.has(n)&&(!wolno||wolno.has(n))){d.set(n,d.get(k)+1);kol.push(n);}}
    return d;
  }

  // wszystkie prawdziwe dla celu wskazówki (każda z testem dla dowolnego powiatu)
  function pula(pow,wk,cel){
    const PO=new Map(pow.map(p=>[p.k,p])),C=pow.filter(p=>p.wk===wk),CK=new Set(C.map(p=>p.k)),t=PO.get(cel),out=[];
    const dodaj=(g,tekst,ok,extra)=>out.push(Object.assign({g,tekst,ok,ref:[]},extra||{}));
    // liczba sąsiadów (wszystkich, także z innych województw)
    const n=t.nb.length;
    dodaj("liczba","Ma dokładnie <b>"+n+"</b> "+liczba(n,"sąsiada","sąsiadów","sąsiadów")+" (licząc też powiaty z innych województw).",p=>p.nb.length===n);
    if(n>2)dodaj("liczba","Ma co najmniej <b>"+(n-1)+"</b> sąsiadów (licząc też powiaty z innych województw).",p=>p.nb.length>=n-1);
    dodaj("liczba","Ma najwyżej <b>"+(n+1)+"</b> "+liczba(n+1,"sąsiada","sąsiadów","sąsiadów")+" (licząc też powiaty z innych województw).",p=>p.nb.length<=n+1);
    // konkretny sąsiad albo jego brak
    t.nb.forEach(x=>dodaj("sasiad","Graniczy z: "+ref(PO.get(x))+".",p=>p.nb.includes(x),{ref:[x]}));
    const wokol=new Set();C.forEach(p=>p.nb.forEach(x=>wokol.add(x)));
    wokol.forEach(x=>{if(x!==cel&&!t.nb.includes(x))dodaj("sasiad","Nie graniczy z: "+ref(PO.get(x))+".",p=>!p.nb.includes(x)&&p.k!==x,{ref:[x],neg:true});});
    // odległość w granicach od innego powiatu tego województwa (tylko gdy w województwie i w całej Polsce wychodzi tak samo)
    const dt=odleglosci(PO,cel,CK);
    C.forEach(x=>{
      const d=dt.get(x.k);if(d!==2&&d!==3)return;
      const dx=odleglosci(PO,x.k,CK),dp=odleglosci(PO,x.k);
      if(C.some(p=>dx.get(p.k)!==dp.get(p.k)))return;
      dodaj("odleglosc","Od: "+ref(x)+" są do niego dokładnie <b>"+d+" kroki</b> przez sąsiednie powiaty ("+(d===2?"jeden powiat":"dwa powiaty")+" pomiędzy).",p=>dx.get(p.k)===d,{ref:[x.k]});
    });
    // inne województwa
    const woj=p=>new Set(p.nb.map(x=>PO.get(x).wk).filter(w=>w!==wk));
    const wt=woj(t);
    if(wt.size)dodaj("woj","Graniczy z innym województwem.",p=>woj(p).size>0);else dodaj("woj","Nie graniczy z żadnym innym województwem.",p=>woj(p).size===0);
    if(wt.size>=2)dodaj("woj","Graniczy z co najmniej dwoma innymi województwami.",p=>woj(p).size>=2);
    wt.forEach(w=>dodaj("woj","Graniczy z województwem <b>"+WOJ[w]+"</b>.",p=>woj(p).has(w)));
    const wszystkieW=new Set();C.forEach(p=>woj(p).forEach(w=>wszystkieW.add(w)));
    wszystkieW.forEach(w=>{if(!wt.has(w))dodaj("woj","Nie graniczy z województwem <b>"+WOJ[w]+"</b>.",p=>!woj(p).has(w));});
    // granica Polski
    if(C.some(p=>p.granica))dodaj("granica",t.granica?"Leży przy granicy Polski (lądowej albo morskiej).":"Nie dotyka granicy Polski.",p=>!!p.granica===!!t.granica);
    // miasta na prawach powiatu
    dodaj("miasto",t.city?"Jest miastem na prawach powiatu.":"Jest powiatem ziemskim, nie miastem.",p=>p.city===t.city);
    const zMiastem=p=>p.nb.some(x=>PO.get(x).city);
    dodaj("miasto",zMiastem(t)?"Graniczy z miastem na prawach powiatu.":"Nie graniczy z żadnym miastem na prawach powiatu.",p=>zMiastem(p)===zMiastem(t));
    const otacza=p=>p.nb.some(x=>{const q=PO.get(x);return q.city&&q.nb.length===1&&q.nb[0]===p.k;});
    if(otacza(t))dodaj("miasto","Otacza ze wszystkich stron miasto na prawach powiatu.",otacza);
    // kierunek: w całości po jednej stronie linii przez miasto tego województwa
    C.filter(x=>x.city&&x.k!==cel).forEach(x=>{
      const lat=x.lat,lon=x.lon;
      const strony=[["północ",p=>p.bb[1]>lat,"lat",p=>p.bb[1]],["południe",p=>p.bb[3]<lat,"lat",p=>p.bb[3]],["wschód",p=>p.bb[0]>lon,"lon",p=>p.bb[0]],["zachód",p=>p.bb[2]<lon,"lon",p=>p.bb[2]]];
      strony.forEach(([s,ok,os,brzeg])=>{
        if(!ok(t))return;
        const linia=os==="lat"?lat:lon,marg=os==="lat"?MARGINES:MARGINES*1.6;
        if(C.some(p=>Math.abs(brzeg(p)-linia)<marg))return;   // nie ma powiatów „na styk” z linią
        dodaj("kierunek","Leży w całości na "+s+" od linii przez: "+ref(x)+".",ok,{ref:[x.k],linia:{k:x.k,os,w:linia}});
      });
    });
    // nazwa
    const lit=s=>s.charAt(0).toUpperCase(),lt=lit(t.n),inneL=[...new Set(C.map(p=>lit(p.n)))].filter(l=>l!==lt).sort();
    if(inneL.length>=2)for(let i=0;i<4;i++){
      const zest=[lt,...inneL.slice(i,i+1),...inneL.slice(i+2,i+3)].filter(Boolean).sort((a,b)=>a.localeCompare(b,"pl"));
      if(zest.length<2)continue;
      dodaj("nazwa","Nazwa zaczyna się na: <b>"+zest.join(", ")+"</b>.",p=>zest.includes(lit(p.n)));
    }
    dodaj("nazwa","Nazwa zaczyna się na literę <b>"+lt+"</b>.",p=>lit(p.n)===lt);
    if(/-/.test(t.n))dodaj("nazwa","Ma dwuczłonową nazwę (z łącznikiem).",p=>/-/.test(p.n));
    const dl=t.n.replace(/[^a-ząćęłńóśźż]/gi,"").length;
    [8,9,10,11].forEach(l=>{if(dl>l)dodaj("nazwa","Nazwa ma więcej niż <b>"+l+"</b> liter.",p=>p.n.replace(/[^a-ząćęłńóśźż]/gi,"").length>l);else dodaj("nazwa","Nazwa ma najwyżej <b>"+l+"</b> liter.",p=>p.n.replace(/[^a-ząćęłńóśźż]/gi,"").length<=l);});
    // tylko wskazówki, które coś w tym województwie wykluczają
    return out.filter(w=>w.ok(t)&&C.some(p=>!w.ok(p)));
  }

  const ZALEZNOSCI=new Set(["liczba","sasiad","odleglosc"]);
  // premia za rodzaj wskazówki: ciekawsze zależności częściej, słabe „nie graniczy” rzadziej
  const PREMIA={liczba:.16,odleglosc:.12,kierunek:.14,granica:.18,miasto:.14,woj:.1,sasiad:.02,nazwa:-.02};
  // zagadka: losowy cel, wskazówki dobierane po kolei, potem bez zbędnych; 3 do 5 wskazówek z różnych grup
  function zagadka(pow,rnd,wk){
    const wojs=Object.keys(WOJ);
    for(let proba=0;proba<400;proba++){
      const w=wk||pick(wojs,rnd),C=pow.filter(p=>p.wk===w);if(C.length<6)continue;
      const cel=pick(C,rnd).k,P=tasuj(pula(pow,w,cel),rnd),PO=new Map(pow.map(p=>[p.k,p]));
      let S=C.map(p=>p.k),wyb=[];
      while(S.length>1&&wyb.length<7){
        const grupy=wyb.map(x=>x.g),uzyte=g=>grupy.filter(x=>x===g).length;
        const neg=wyb.some(x=>x.neg);
        const mozliwe=P.filter(x=>!wyb.includes(x)&&uzyte(x.g)<(x.g==="sasiad"?2:1)&&!(x.neg&&neg)).map(x=>{
          const zost=S.filter(k=>x.ok(PO.get(k))).length;return {x,zost};
        }).filter(o=>o.zost<S.length);
        if(!mozliwe.length)break;
        // na początku wolimy wskazówki, które odcinają mniej więcej połowę; zależności od sąsiadów mają pierwszeństwo
        const ocena=o=>Math.abs(o.zost/S.length-(wyb.length<2?.5:.25))-(PREMIA[o.x.g]||0)+(o.x.neg?.12:0)+rnd()*.25;
        mozliwe.sort((a,b)=>ocena(a)-ocena(b));
        const x=mozliwe[0].x;wyb.push(x);S=S.filter(k=>x.ok(PO.get(k)));
      }
      if(S.length!==1||S[0]!==cel)continue;
      // usuń wskazówki, bez których nadal zostaje jeden powiat
      for(let i=wyb.length-1;i>=0;i--){const bez=wyb.filter((_,j)=>j!==i);if(rozwiazania(pow,w,bez).length===1)wyb=bez;}
      if(wyb.length<MIN_W||wyb.length>MAX_W)continue;
      if(!wyb.some(x=>ZALEZNOSCI.has(x.g)))continue;
      return {wk:w,woj:WOJ[w],cel,wskazowki:wyb,kandydaci:C.map(p=>p.k)};
    }
    return null;
  }
  function rozwiazania(pow,wk,wsk){return pow.filter(p=>p.wk===wk&&wsk.every(w=>w.ok(p))).map(p=>p.k);}
  // podpowiedź: powiaty, które wyklucza pierwsza wskazówka z czymś jeszcze nieskreślonym
  function podpowiedz(pow,z,skreslone){
    const zost=z.kandydaci.filter(k=>!skreslone.includes(k)&&k!==z.cel);
    for(let i=0;i<z.wskazowki.length;i++){const w=z.wskazowki[i],odp=zost.filter(k=>!w.ok(pow.find(p=>p.k===k)));if(odp.length)return {i,skresl:odp};}
    return null;
  }
  const gwiazdki=(bledy,pomoce)=>Math.max(0,3-bledy-pomoce);
  const API={WOJ,przyGranicy,odleglosci,pula,zagadka,rozwiazania,podpowiedz,gwiazdki,nazwa,MAX_BLEDOW:3};
  glob.SledztwoLogika=API;
  if(typeof module!=="undefined")module.exports=API;
})(typeof window!=="undefined"?window:globalThis);
