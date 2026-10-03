/* Jedna pozycja na gminę TERYT. Powiatów nie dokładamy do puli gmin. */
(function(root){
  const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ł/g,'l').toLowerCase();
  function lista(baza,miasta){
    const lokalne=new Map((miasta||[]).map(m=>[norm(m.n),m]));
    const powiaty=new Map((baza.powiaty||[]).map(p=>[p.k,p.n]));
    const unikalne=new Map();
    for(const g of baza.gminy||[]){
      if(!/^\d{6}[123]$/.test(g.k)||unikalne.has(g.k))continue;
      const lokalny=g.typ==='gmina wiejska'?null:lokalne.get(norm(g.n));
      const file=lokalny?.img||g.herb;
      const lat=g.lat??lokalny?.lat,lon=g.lon??lokalny?.lon;
      if(!file||!Number.isFinite(lat)||!Number.isFinite(lon))continue;
      unikalne.set(g.k,{k:g.k,n:g.n,name:g.n,typ:g.typ,lat,lon,pop:g.ludnosc||lokalny?.pop||0,file,powiat:powiaty.get(g.k.slice(0,4))||g.k.slice(0,4)});
    }
    const out=[...unikalne.values()],ile=new Map();
    out.forEach(g=>ile.set(norm(g.n),(ile.get(norm(g.n))||0)+1));
    out.forEach(g=>{if(ile.get(norm(g.n))>1)g.name=g.n+' ('+({'gmina miejska':'miejska','gmina wiejska':'wiejska','gmina miejsko-wiejska':'miejsko-wiejska'}[g.typ]||'gmina')+', '+g.powiat+')';});
    return out;
  }
  root.HerbyGmin={lista};
  if(typeof module!=='undefined')module.exports=root.HerbyGmin;
})(typeof window==='undefined'?globalThis:window);
