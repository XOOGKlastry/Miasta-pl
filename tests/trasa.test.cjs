const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const topojson=require('../topojson-client.min.js');
const T=require('../trasa-logika.js');
function powiaty(){
  const t=JSON.parse(fs.readFileSync('powiaty.topojson','utf8')),o=t.objects.powiaty,nbi=topojson.neighbors(o.geometries),f=topojson.feature(t,o).features;
  const p=f.map((x,i)=>({k:x.properties.k,n:x.properties.n,city:+x.properties.k.slice(2)>=60,nbi:nbi[i]}));
  p.forEach(x=>{x.nb=[...new Set(x.nbi.map(i=>p[i].k))].filter(k=>k!==x.k);});return p;
}
function rnd(s){let a=s>>>0;return ()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const P=powiaty();

test('Trasa dnia: start i meta to powiaty ziemskie 4 do 6 kroków od siebie, ta sama z tego samego ziarna',()=>{
  for(let s=1;s<=60;s++){
    const z=T.zagadka(P,rnd(s)),z2=T.zagadka(P,rnd(s));
    assert.ok(z,'brak zagadki dla ziarna '+s);assert.equal(z.a,z2.a);assert.equal(z.b,z2.b);
    assert.ok(z.kroki>=4&&z.kroki<=6);assert.equal(z.limit,z.pomiedzy+4);
    const a=P.find(p=>p.k===z.a),b=P.find(p=>p.k===z.b);assert.ok(!a.city&&!b.city);
    const tr=T.trasa(P,z,[]);assert.equal(tr.length,z.kroki+1);assert.equal(tr[0],z.a);assert.equal(tr.at(-1),z.b);
    for(let i=1;i<tr.length;i++)assert.ok(P.find(p=>p.k===tr[i-1]).nb.includes(tr[i]),'trasa przez niesąsiadów');
    tr.slice(1,-1).forEach(k=>assert.equal(T.ocena(z,k),'tak'));
    assert.equal(T.polaczone(P,z,tr.slice(1,-1)),true);
    assert.equal(T.polaczone(P,z,tr.slice(2,-1)),false);
  }
});

test('Ocena: sąsiad trasy to „blisko”, odległy powiat to „daleko”, podpowiedź daje brakujący powiat z trasy',()=>{
  const z=T.zagadka(P,rnd(7)),tr=T.trasa(P,z,[]);
  const bl=[...z.blisko][0];assert.equal(T.ocena(z,bl),'blisko');
  const daleko=P.find(p=>!z.naTrasie.has(p.k)&&!z.blisko.has(p.k)&&p.k!==z.a&&p.k!==z.b);assert.equal(T.ocena(z,daleko.k),'daleko');
  const pp=T.podpowiedz(P,z,[tr[1]]);assert.ok(z.naTrasie.has(pp));assert.notEqual(pp,tr[1]);
});
