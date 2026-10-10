/* Trasa dnia: z powiatu A do powiatu B przez sąsiednie powiaty. Czysta logika (bez DOM), do testów w node.
   Graf: powiaty z listą sąsiadów (nb, kody TERYT). Najkrótsza trasa liczona w krokach między sąsiadami. */
(function(glob){
  const MIN_KROKI=4,MAX_KROKI=6,ZAPAS=4;   // 3 do 5 powiatów pomiędzy, limit prób = pomiędzy + 4
  function odleglosci(graf,start){
    const d=new Map([[start,0]]),kol=[start];
    for(let i=0;i<kol.length;i++){const k=kol[i];for(const n of graf.get(k)||[])if(!d.has(n)){d.set(n,d.get(k)+1);kol.push(n);}}
    return d;
  }
  const graf=pow=>new Map(pow.map(p=>[p.k,p.nb||[]]));
  // zagadka z ziarna: start i meta tylko spośród powiatów ziemskich, 4 do 6 kroków od siebie
  function zagadka(pow,rnd){
    const g=graf(pow),ziem=pow.filter(p=>!p.city&&(p.nb||[]).length);
    for(let i=0;i<200;i++){
      const a=ziem[Math.floor(rnd()*ziem.length)],da=odleglosci(g,a.k);
      const kand=ziem.filter(p=>{const x=da.get(p.k);return x>=MIN_KROKI&&x<=MAX_KROKI;});
      if(!kand.length)continue;
      const b=kand[Math.floor(rnd()*kand.length)];
      return opis(pow,a.k,b.k);
    }
    return null;
  }
  function opis(pow,a,b){
    const g=graf(pow),da=odleglosci(g,a),db=odleglosci(g,b),D=da.get(b);
    const naTrasie=new Set(pow.filter(p=>da.has(p.k)&&db.has(p.k)&&da.get(p.k)+db.get(p.k)===D).map(p=>p.k));
    naTrasie.delete(a);naTrasie.delete(b);
    // „blisko”: sąsiad któregoś powiatu z najkrótszej trasy (albo startu czy mety)
    const blisko=new Set();[a,b,...naTrasie].forEach(k=>(g.get(k)||[]).forEach(n=>{if(!naTrasie.has(n)&&n!==a&&n!==b)blisko.add(n);}));
    return {a,b,kroki:D,pomiedzy:D-1,limit:D-1+ZAPAS,naTrasie,blisko};
  }
  const ocena=(z,k)=>z.naTrasie.has(k)?"tak":z.blisko.has(k)?"blisko":"daleko";
  // wygrana: wpisane powiaty łączą start z metą
  function polaczone(pow,z,wpisane){
    const g=graf(pow),zbior=new Set([z.a,z.b,...wpisane]),d=new Set([z.a]),kol=[z.a];
    for(let i=0;i<kol.length;i++)for(const n of g.get(kol[i])||[])if(zbior.has(n)&&!d.has(n)){d.add(n);kol.push(n);}
    return d.has(z.b);
  }
  // jedna najkrótsza trasa do pokazania na końcu: z możliwie wieloma powiatami, które gracz wpisał
  function trasa(pow,z,wpisane){
    const g=graf(pow),db=odleglosci(g,z.b),moje=new Set(wpisane||[]),out=[z.a];let k=z.a;
    while(k!==z.b){const nast=(g.get(k)||[]).filter(n=>db.get(n)===db.get(k)-1).sort((x,y)=>moje.has(y)-moje.has(x)||x.localeCompare(y));k=nast[0];if(!k)break;out.push(k);}
    return out;
  }
  // następna podpowiedź: powiat z trasy, którego gracz jeszcze nie wpisał
  function podpowiedz(pow,z,wpisane){return trasa(pow,z,wpisane).slice(1,-1).find(k=>wpisane.indexOf(k)<0)||null;}
  const API={zagadka,opis,ocena,polaczone,trasa,podpowiedz,odleglosci,MIN_KROKI,MAX_KROKI,ZAPAS};
  glob.TrasaLogika=API;
  if(typeof module!=="undefined")module.exports=API;
})(typeof window!=="undefined"?window:globalThis);
