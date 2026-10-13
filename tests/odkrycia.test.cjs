const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const OP=require('../odkrycia-pytania.js');
const dane=JSON.parse(fs.readFileSync('odkrycia.json','utf8'));
function rnd(s){let a=s>>>0;return ()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}

test('Odkrycia: dane gry bez pozycji tylko do encyklopedii, każda z powiatem i współrzędnymi w Polsce',()=>{
  const {ludzie,zabytki}=OP.przygotuj(dane);
  assert.ok(ludzie.length>800,'postaci: '+ludzie.length);assert.ok(zabytki.length>500,'zabytków: '+zabytki.length);
  for(const o of ludzie.concat(zabytki)){assert.ok(/^\d{4}$/.test(o.p),o.n);assert.ok(o.lat>48.9&&o.lat<55&&o.lon>14&&o.lon<24.2,o.n);}
  const enc=new Set([].concat(dane.miejsca,dane.wydarzenia).filter(o=>o.s==='e').map(o=>o.n));
  assert.ok(enc.size>0);assert.ok(!zabytki.some(o=>enc.has(o.n)),'obóz w pytaniach');
  const ch=ludzie.find(o=>o.n==='Fryderyk Chopin');assert.ok(ch);assert.equal(ch.mn,'Żelazowa Wola');assert.equal(ch.p,'1428');
});

test('Pytanie „Skąd pochodzi?”: cztery różne miejscowości z okolicy, wśród nich miejsce urodzenia',()=>{
  const {ludzie}=OP.przygotuj(dane);
  for(let i=0;i<ludzie.length;i+=7){
    const q=OP.pytanieO(rnd(i),ludzie[i],ludzie);if(!q)continue;
    assert.equal(q.opcje.length,4);assert.equal(new Set(q.opcje.map(OP.norm)).size,4);assert.ok(q.opcje.includes(ludzie[i].mn));
  }
  const ch=ludzie.find(o=>o.n==='Fryderyk Chopin'),q=OP.pytanieO(rnd(1),ch,ludzie);
  q.opcje.filter(x=>x!==ch.mn).forEach(m=>{const l=ludzie.find(o=>o.mn===m);assert.ok(OP.km(ch,l)<80,m+' za daleko od Żelazowej Woli');});
  assert.match(OP.odpowiedz(q,'powiat sochaczewski'),/Żelazowa Wola, gm\. Sochaczew, powiat sochaczewski/);
});

test('Pytanie o zabytek: powiat i trzy inne z okolicy, nazwa nie zdradza powiatu',()=>{
  const {zabytki}=OP.przygotuj(dane);
  const pow=JSON.parse(fs.readFileSync('powiaty.topojson','utf8')).objects.powiaty.geometries.map(g=>({k:g.properties.k,n:g.properties.n,short:g.properties.n,label:g.properties.n}));
  assert.equal(OP.zdradza({n:'Zamek w Malborku'},{short:'malborski'}),true);
  assert.equal(OP.zdradza({n:'Zamek Czocha'},{short:'lubański'}),false);
  const malbork=zabytki.find(o=>/Malbork/.test(o.n));if(malbork)assert.equal(OP.zdradza(malbork,pow.find(p=>p.k===malbork.p)),true);
  assert.ok(zabytki.filter(o=>!OP.zdradza(o,pow.find(p=>p.k===o.p))).length>300);
});
