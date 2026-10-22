/* Odkrycia w pytaniach: postacie, zabytki i bitwy z odkrycia.json (gmina i powiat już przypisane).
   Trzy rodzaje pytań, wspólne dla silnika (wyzwanie.html), Podboju (podboj-pytania.js), planszy i walk:
     o  „Skąd pochodzi?”: postać, cztery miejscowości z okolicy do wyboru (odpowiedź: miejscowość urodzenia)
     a  zabytek albo bitwa, cztery powiaty do wyboru (atakowany albo sąsiedni)
     y  zabytek albo bitwa do wskazania na mapie (jak „Gdzie to jest?”)
   Czysta logika bez DOM; działa też w node (testy). */
(function(glob){
  const norm=s=>String(s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/ł/g,"l").replace(/[^a-z0-9]+/g," ").trim();
  function km(a,b){const R=6371,r=Math.PI/180,dLat=(b.lat-a.lat)*r,dLon=(b.lon-a.lon)*r;
    const h=Math.sin(dLat/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin(dLon/2)**2;return 2*R*Math.asin(Math.sqrt(h));}
  function losuj(rnd,a){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}

  // dane gry z odkrycia.json: tylko pozycje „w grze” (bez „tylko encyklopedia”), ze współrzędnymi
  function przygotuj(dane){
    const z=o=>o&&o.s!=="e"&&Array.isArray(o.wsp)&&o.p&&o.n;
    const wsp=o=>({lon:o.wsp[0],lat:o.wsp[1]});
    const ludzie=((dane&&dane.ludzie)||[]).filter(z).map(o=>Object.assign({n:o.n,opis:o.opis||"",mn:o.mn||o.gn,gn:o.gn||"",g:o.g,p:o.p,pkt:o.pkt||0,ur:o.ur,ciek:o.ciek||""},wsp(o))).filter(o=>o.mn);
    const zabytki=[].concat(((dane&&dane.miejsca)||[]).filter(z).map(o=>Object.assign({typ:"m",rodzaje:o.rodzaje||[]},o)),((dane&&dane.wydarzenia)||[]).filter(z).map(o=>Object.assign({typ:"w"},o)))
      .map(o=>Object.assign({n:o.n,opis:o.opis||"",gn:o.gn||"",g:o.g,p:o.p,pkt:o.pkt||0,rok:o.rok,typ:o.typ,rodzaje:o.rodzaje||[],ciek:o.ciek||""},wsp(o)));
    return {ludzie,zabytki};
  }
  // najbardziej znane najpierw: łatwiejsze tryby biorą górę listy, trudne całość
  function wybierz(pula,czescZnanych){
    const s=pula.slice().sort((a,b)=>b.pkt-a.pkt);if(!czescZnanych||czescZnanych>=1)return s;
    return s.slice(0,Math.max(30,Math.ceil(s.length*czescZnanych)));
  }
  // nazwa zabytku zdradza powiat (np. „Zamek w Malborku” i powiat malborski)
  function zdradza(c,pw){if(!pw)return true;const r=norm(pw.short||pw.n).slice(0,5);return r.length>=4&&norm(c.n).includes(r);}
  // rdzeń nazwy (pierwsze słowo, 3 litery): Brodnica i powiat brodnicki, Nowy Targ i nowotarski
  const rdzen=s=>(norm(s).split(/[ -]/)[0]||"").slice(0,3);
  // „W którym powiecie leży X?”, gdy powiat ziemski nosi nazwę od X: odpowiedź jest w pytaniu
  const zdradzaPowiat=(nazwa,pw)=>!!pw&&!pw.city&&rdzen(nazwa).length===3&&rdzen(nazwa)===rdzen(pw.short||pw.n);
  // nazwa obiektu albo postaci zawiera nazwę miejscowości lub gminy, o którą pytamy (np. „Stare Miasto w Krakowie”)
  function zdradzaMiejsce(nazwa,miejsca){
    const t=" "+norm(nazwa)+" ";
    return (miejsca||[]).filter(Boolean).some(m=>{const n=norm(m).split(" ")[0];if(n.length<3)return false;
      const st=n.length<=4?n:n.slice(0,Math.max(4,n.length-2));return new RegExp(" "+st).test(t);});
  }

  // „Skąd pochodzi?”: trzy inne miejscowości urodzenia z okolicy (najbliższe, losowo z siedmiu)
  function pytanieO(rnd,c,wszyscy){
    if(zdradzaMiejsce(c.n,[c.mn]))return null;
    const zle=new Set([norm(c.mn)]),blisko=wszyscy.filter(x=>!zle.has(norm(x.mn))).sort((a,b)=>km(c,a)-km(c,b)),o=[];
    for(const x of blisko){const k=norm(x.mn);if(zle.has(k))continue;zle.add(k);o.push(x.mn);if(o.length===7)break;}
    if(o.length<3)return null;
    return {t:"o",c,opcje:losuj(rnd,losuj(rnd,o).slice(0,3).concat([c.mn]))};
  }
  // zabytek albo bitwa: powiat i trzy powiaty z okolicy (sąsiedzi, a gdy ich mało, sąsiedzi sąsiadów)
  function pytanieA(rnd,c,powAll,okolica){
    const po=new Map(powAll.map(p=>[p.k,p])),pw=po.get(c.p);if(!pw)return null;
    if(zdradza(c,pw)||(zdradzaMiejsce(c.n,[c.gn])&&rdzen(c.gn)===rdzen(pw.short||pw.n)))return null;
    let kand=(okolica||[]).filter(x=>x&&x.k!==pw.k);
    if(kand.length<3){const jest=new Set([pw.k]);kand=[];
      const dodaj=l=>l.forEach(k=>{const x=po.get(k);if(x&&!jest.has(k)){jest.add(k);kand.push(x);}});
      dodaj(pw.nb||[]);if(kand.length<3)kand.slice().forEach(x=>dodaj(x.nb||[]));}
    const etyk=new Set([pw.label]),inne=[];
    for(const x of losuj(rnd,kand)){if(etyk.has(x.label))continue;etyk.add(x.label);inne.push(x.label);if(inne.length===3)break;}
    if(inne.length<3)return null;
    return {t:"a",c,pw,opcje:losuj(rnd,inne.concat([pw.label]))};
  }
  const pytanieY=c=>zdradzaMiejsce(c.n,[c.gn,c.mn])?null:{t:"y",c};
  // tekst po odpowiedzi: gdzie dokładnie i ciekawostka
  function odpowiedz(q,powiatNazwa){
    const c=q.c;let pw=powiatNazwa||"";
    // miasto na prawach powiatu: nie powtarzamy nazwy („Jastrzębie-Zdrój, miasto Jastrzębie-Zdrój”)
    if(pw&&[c.mn,c.gn].some(x=>x&&norm(pw).endsWith(norm(x))))pw="";
    if(q.t==="o")return c.n+": "+c.mn+(c.gn&&norm(c.gn)!==norm(c.mn)?", gm. "+c.gn:"")+(pw?", "+pw:"");
    return c.n+(c.rok&&c.typ==="w"?" ("+c.rok+")":"")+(c.gn?" · gm. "+c.gn:"")+(pw?", "+pw:"");
  }
  const ciekawostka=c=>c.ciek||(c.opis?c.opis.charAt(0).toUpperCase()+c.opis.slice(1)+".":"");
  const API={przygotuj,wybierz,zdradza,zdradzaPowiat,zdradzaMiejsce,rdzen,pytanieO,pytanieA,pytanieY,odpowiedz,ciekawostka,km,norm};
  glob.OdkryciaPytania=API;
  if(typeof module!=="undefined")module.exports=API;
})(typeof window!=="undefined"?window:globalThis);
