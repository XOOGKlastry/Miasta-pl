const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const topojson=require('../topojson-client.min.js');
const L=require('../sledztwo-logika.js');
function powiaty(){
  const t=JSON.parse(fs.readFileSync('powiaty.topojson','utf8')),o=t.objects.powiaty,nbi=topojson.neighbors(o.geometries),f=topojson.feature(t,o).features,gr=L.przyGranicy(t);
  const p=f.map((x,i)=>{let b=[1e9,1e9,-1e9,-1e9];const polys=x.geometry.type==='Polygon'?[x.geometry.coordinates]:x.geometry.coordinates;
    polys.forEach(q=>q[0].forEach(([a,c])=>{b=[Math.min(b[0],a),Math.min(b[1],c),Math.max(b[2],a),Math.max(b[3],c)];}));
    const k=x.properties.k;return {k,n:x.properties.n,city:+k.slice(2)>=60,wk:k.slice(0,2),bb:b,lon:(b[0]+b[2])/2,lat:(b[1]+b[3])/2,granica:gr.has(k),nbi:nbi[i]};});
  p.forEach(x=>{x.nb=[...new Set(x.nbi.map(i=>p[i].k))].filter(k=>k!==x.k);});return p;
}
function rnd(s){let a=s>>>0;return ()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const P=powiaty();

test('Śledztwo: granica Polski wyznaczona z topologii (powiaty przygraniczne i nadmorskie)',()=>{
  const g=new Set(P.filter(p=>p.granica).map(p=>p.k));
  assert.ok(g.size>50&&g.size<90,'przy granicy: '+g.size);
  ['zgorzelecki','bieszczadzki','sejneński','pucki','tatrzański','włodawski'].forEach(n=>{const p=P.find(x=>x.n===n);assert.ok(p&&g.has(p.k),n);});
  ['kielecki','łódzki wschodni','płocki'].forEach(n=>{const p=P.find(x=>x.n===n);assert.ok(p&&!g.has(p.k),n);});
  assert.ok(!g.has('1465'),'Warszawa nie leży przy granicy');assert.ok(!g.has('1061'),'Łódź nie leży przy granicy');
});

test('Śledztwo: zagadka ma jedno rozwiązanie, 3 do 5 wskazówek i każda jest potrzebna; to samo ziarno daje to samo',()=>{
  const woj=new Set();let t0=Date.now();
  for(let s=1;s<=120;s++){
    const z=L.zagadka(P,rnd(s)),z2=L.zagadka(P,rnd(s));
    assert.ok(z,'brak zagadki dla ziarna '+s);woj.add(z.wk);
    assert.equal(z.cel,z2.cel);assert.deepEqual(z.wskazowki.map(w=>w.tekst),z2.wskazowki.map(w=>w.tekst));
    assert.ok(z.wskazowki.length>=3&&z.wskazowki.length<=5,'liczba wskazówek '+z.wskazowki.length);
    assert.deepEqual(L.rozwiazania(P,z.wk,z.wskazowki),[z.cel]);
    z.wskazowki.forEach((w,i)=>{const bez=z.wskazowki.filter((_,j)=>j!==i);assert.ok(L.rozwiazania(P,z.wk,bez).length>1,'zbędna wskazówka: '+w.tekst);});
    assert.ok(z.wskazowki.some(w=>['liczba','sasiad','odleglosc'].includes(w.g)));
    z.wskazowki.forEach(w=>assert.ok(!/—/.test(w.tekst)));
  }
  assert.ok(woj.size>=14,'za mało województw: '+woj.size);
  assert.ok((Date.now()-t0)/240<150,'za wolno: '+(Date.now()-t0)/240+' ms na zagadkę');
});

test('Śledztwo: podpowiedź skreśla tylko powiaty wykluczone przez wskazówki i prowadzi do rozwiązania',()=>{
  for(let s=1;s<=30;s++){
    const z=L.zagadka(P,rnd(s*7));let skr=[];
    for(let i=0;i<60;i++){const p=L.podpowiedz(P,z,skr);if(!p)break;assert.ok(!p.skresl.includes(z.cel));skr=skr.concat(p.skresl);}
    assert.deepEqual(z.kandydaci.filter(k=>!skr.includes(k)),[z.cel]);
  }
  assert.equal(L.gwiazdki(0,0),3);assert.equal(L.gwiazdki(1,1),1);assert.equal(L.gwiazdki(3,1),0);
});
