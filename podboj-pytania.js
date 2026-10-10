/* Podbój Polski: zestaw 8 pytań o atakowany powiat i jego okolice.
   Z tego samego ziarna i tych samych danych wychodzą te same pytania (pojedynek: obaj gracze grają ten sam zestaw).
   Odpowiedzią nigdy nie jest „po prostu atakowany powiat”: w pytaniach z wyborem powiatu celem bywa też sąsiad,
   a atakowany powiat jest zawsze wśród opcji, więc jego nazwa niczego nie zdradza. */
(function(glob){
  const ILE=8;
  function km(a,b){const R=6371,r=Math.PI/180,dLat=(b.lat-a.lat)*r,dLon=(b.lon-a.lon)*r;
    const h=Math.sin(dLat/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin(dLon/2)**2;return 2*R*Math.asin(Math.sqrt(h));}
  function losuj(rnd,a){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
  function czteryNaj(rnd,c,pool,klucz){
    const near=pool.filter(o=>klucz(o)!==klucz(c)).sort((x,y)=>km(c,x)-km(c,y));
    const o=[],s=new Set([klucz(c)]);
    for(const x of near){if(s.has(klucz(x)))continue;s.add(klucz(x));o.push(klucz(x));if(o.length===7)break;}
    return losuj(rnd,losuj(rnd,o).slice(0,3).concat([klucz(c)]));
  }
  function wPoly(lon,lat,g){
    const polys=g.type==="Polygon"?[g.coordinates]:g.coordinates;
    return polys.some(p=>{let w=false;const r=p[0];for(let i=0,j=r.length-1;i<r.length;j=i++){const [xi,yi]=r[i],[xj,yj]=r[j];if(((yi>lat)!==(yj>lat))&&(lon<(xj-xi)*(lat-yi)/(yj-yi)+xi))w=!w;}return w;});
  }
  const wPowiecie=(c,p)=>c.lon>=p.bb[0]&&c.lon<=p.bb[2]&&c.lat>=p.bb[1]&&c.lat<=p.bb[3]&&wPoly(c.lon,c.lat,p.f.geometry);
  // wpis tablic rejestracyjnych dla powiatu (Warszawa ma kody dzielnic: bierzemy jedną)
  function tablica(tab,p,rnd){
    const t=p.city?tab.filter(x=>x.typ==="miasto"&&x.woj===p.woj&&(x.nazwa===p.n||x.nazwa.indexOf(p.n+" - ")===0))
      :tab.filter(x=>x.typ==="ziemski"&&x.woj===p.woj&&x.nazwa==="powiat "+p.n);
    return t.length?t[Math.floor(rnd()*t.length)]:null;
  }
  // okolica: atakowany powiat, sąsiedzi, a gdy ich mało (miasto na prawach powiatu), sąsiedzi sąsiadów
  function okolica(pow,P){
    const po=new Map(pow.map(p=>[p.k,p])),R=[P],jest=new Set([P.k]);
    const dodaj=l=>l.map(k=>po.get(k)).filter(Boolean).sort((a,b)=>km(P,a)-km(P,b)).forEach(x=>{if(!jest.has(x.k)){jest.add(x.k);R.push(x);}});
    dodaj(P.nb||[]);
    if(R.length<6)R.slice(1).forEach(x=>dodaj(x.nb||[]));
    return R.slice(0,9);
  }
  // cel pytania o powiat: atakowany albo któryś sąsiad; opcje zawsze z atakowanym
  function celIOpcje(rnd,P,R,klucz,filtr){
    const z=R.filter(filtr||(()=>true));if(z.length<4)return null;
    const cel=rnd()<0.25&&z.indexOf(P)>=0?P:z[1+Math.floor(rnd()*(z.length-1))]||P;
    const inne=losuj(rnd,z.filter(x=>x!==cel&&x!==P)).slice(0,cel===P?3:2);
    if(cel!==P&&z.indexOf(P)>=0)inne.push(P);
    const opcje=inne.concat([cel]);if(opcje.length<4)return null;
    return {cel,opcje:losuj(rnd,opcje.map(klucz))};
  }

  function zestaw(D,k,rnd){
    const pow=D.powAll,P=pow.find(p=>p.k===k);if(!P)return [];
    const R=okolica(pow,P),lad=R.filter(p=>!p.city);
    const herby=losuj(rnd,D.herby.filter(c=>wPowiecie(c,P)));
    const miejsca=losuj(rnd,(D.miejsca||[]).filter(c=>wPowiecie(c,P))),rzeki=losuj(rnd,(D.rzeki||[]).filter(c=>wPowiecie(c,P)));
    // miasta okolicy (do „w którym powiecie”): w atakowanym powiecie albo u sąsiadów
    const wOkolicy=losuj(rnd,D.herby.map(c=>({c,p:lad.find(p=>wPowiecie(c,p))})).filter(x=>x.p));
    // miasta do herbu, zdjęcia z lotu ptaka i mapy: najpierw z atakowanego powiatu; gdy jest ich mniej niż 3
    // (miasto na prawach powiatu), dochodzą najbliższe miasta okolicy, żeby nie pytać czterech razy o to samo
    const zOkolicy=herby.length<3?D.herby.filter(c=>herby.indexOf(c)<0&&R.some(p=>p!==P&&wPowiecie(c,p))).sort((a,b)=>km(P,a)-km(P,b)).slice(0,3-herby.length):[];
    const pula=herby.concat(losuj(rnd,zOkolicy));
    let ih=0;const miasto=()=>pula.length?pula[(ih++)%pula.length]:null;
    const twor={
      k(){const r=celIOpcje(rnd,P,R,x=>x.label);return r&&{t:"k",p:r.cel,opcje:r.opcje};},
      s(){const sas=rnd()<0.5,nb=R.filter(x=>x!==P&&(P.nb||[]).indexOf(x.k)>=0),
          nie=pow.filter(x=>x!==P&&(P.nb||[]).indexOf(x.k)<0&&km(P,x)<70);
        const l=sas?nb:nie.length?nie:pow.filter(x=>x!==P&&(P.nb||[]).indexOf(x.k)<0);if(!l.length)return null;
        const b=l[Math.floor(rnd()*l.length)];return {t:"s",a:P,b,sas:(P.nb||[]).indexOf(b.k)>=0};},
      t(){const z=R.map(p=>({p,t:tablica(D.tab,p,rnd)})).filter(x=>x.t);if(z.length<4||!z.some(x=>x.p===P))return null;
        const r=celIOpcje(rnd,z.find(x=>x.p===P),z,x=>x.t.nazwa);return r&&{t:"t",p:r.cel.t,opcje:r.opcje};},
      h(){const c=miasto();return c&&{t:"h",c,opcje:czteryNaj(rnd,c,D.herby,x=>x.n)};},
      z(){const c=miasto();return c&&{t:"z",c,opcje:czteryNaj(rnd,c,D.herby,x=>x.n),dx:(rnd()-.5)*0.0025,dy:(rnd()-.5)*0.0016};},
      g(){const c=miasto();return c&&{t:"g",c};},
      p(){if(lad.length<4)return null;const w=wOkolicy.find(x=>x.p===P&&rnd()<0.3)||wOkolicy.shift();if(!w)return null;
        const r=celIOpcje(rnd,P.city?lad[0]:P,lad,x=>x.label);if(!r)return null;
        // cel losowany przez celIOpcje zastępujemy powiatem, w którym naprawdę leży wylosowane miasto
        const o=new Set(r.opcje);if(!o.has(w.p.label)){const zast=r.opcje.find(x=>x!==P.label)||r.opcje[0];o.delete(zast);o.add(w.p.label);}
        return {t:"p",c:w.c,pw:w.p,opcje:losuj(rnd,[...o])};},
      m(){const c=miejsca.shift();return c&&{t:"m",c,foto:c.zdjecia[Math.floor(rnd()*c.zdjecia.length)],opcje:czteryNaj(rnd,c,D.miejsca,x=>x.n)};},
      r(){const c=rzeki.shift();return c&&{t:"r",c,opcje:czteryNaj(rnd,c,D.rzeki,x=>x.rzeka)};},
      w(){if(herby.length<2)return null;const a=herby[Math.floor(rnd()*herby.length)],b=herby.find(x=>x!==a&&x.pop&&a.pop&&Math.abs(x.pop-a.pop)/Math.min(x.pop,a.pop)>0.1);return b&&{t:"w",a,b};}
    };
    // kolejność ważności; brakujące rodzaje zastępują kolejne z listy, na końcu zawsze są granice
    const plan=["k","s","t","h","z","g","p","m","r","s","w","h","z","g","s","s","s","s"];
    const qs=[];
    for(const t of plan){if(qs.length>=ILE)break;try{const q=twor[t]();if(q)qs.push(q);}catch(e){}}
    // granice wypadają w środku, nie dwa razy z rzędu
    const s=qs.filter(q=>q.t==="s"),reszta=losuj(rnd,qs.filter(q=>q.t!=="s"));
    s.forEach((q,i)=>reszta.splice(Math.min(reszta.length,1+i*3),0,q));
    return reszta;
  }
  // dobra odpowiedź: w „Gdzie to jest?” co najmniej 700 pkt (około 50 km), w pozostałych pełne punkty
  const dobra=r=>r.t==="g"?r.pts>=700:r.pts>=500;
  const API={ILE,zestaw,dobra,okolica,tablica,wPowiecie};
  glob.PodbojPytania=API;
  if(typeof module!=="undefined")module.exports=API;
})(typeof window!=="undefined"?window:globalThis);
