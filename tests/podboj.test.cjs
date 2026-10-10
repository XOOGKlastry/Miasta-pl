const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const topojson=require('../topojson-client.min.js');
const PP=require('../podboj-pytania.js');

// dane jak w grze: powiaty z topojson (z sąsiadami), herby, miejsca, rzeki, tablice
function dane(){
  const WOJ_KOD=JSON.parse(fs.readFileSync('wspolne.js','utf8').match(/const WOJ_KOD=(\{[^}]+\})/)[1]);
  const t=JSON.parse(fs.readFileSync('powiaty.topojson','utf8')),o=t.objects.powiaty,nbi=topojson.neighbors(o.geometries),fs_=topojson.feature(t,o).features;
  const pow=fs_.map((f,i)=>{const k=f.properties.k,n=f.properties.n,city=+k.slice(2)>=60;let b=[1e9,1e9,-1e9,-1e9];
    (f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates).forEach(p=>p[0].forEach(([x,y])=>{if(x<b[0])b[0]=x;if(y<b[1])b[1]=y;if(x>b[2])b[2]=x;if(y>b[3])b[3]=y;}));
    return {f,k,n,city,woj:WOJ_KOD[k.slice(0,2)],bb:b,lon:(b[0]+b[2])/2,lat:(b[1]+b[3])/2,label:city?'m. '+n:n,full:(city?'miasto ':'powiat ')+n,short:n,nbi:nbi[i]};});
  pow.forEach(p=>{p.nb=[...new Set(p.nbi.map(i=>pow[i].k))].filter(k=>k!==p.k);});
  const ile={};pow.forEach(p=>{ile[p.label]=(ile[p.label]||0)+1;});pow.forEach(p=>{if(ile[p.label]>1)p.label+=' ('+p.woj+')';});
  const ctx={window:{}};vm.createContext(ctx);vm.runInContext(fs.readFileSync('tablice-powiaty.js','utf8'),ctx);
  const j=f=>JSON.parse(fs.readFileSync(f,'utf8')).miasta;
  return {powAll:pow,herby:j('herby.json'),miejsca:j('miejsca.json').filter(c=>c.zdjecia&&c.zdjecia.length),rzeki:j('rzeki.json'),tab:ctx.window.POWIATY};
}
function rnd(s){let a=s>>>0;return ()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const D=dane();

test('Każdy powiat dostaje 8 pytań, te same z tego samego ziarna',()=>{
  const rodzaje={};
  for(const p of D.powAll){
    const a=PP.zestaw(D,p.k,rnd(7)),b=PP.zestaw(D,p.k,rnd(7));
    assert.equal(a.length,8,p.full);
    assert.deepEqual(a.map(q=>q.t),b.map(q=>q.t));
    assert.ok(a.some(q=>q.t==='s'),p.full+': brak granic');
    a.forEach(q=>{rodzaje[q.t]=(rodzaje[q.t]||0)+1;if(q.opcje){assert.equal(new Set(q.opcje).size,q.opcje.length,p.full+' '+q.t);assert.ok(q.opcje.length>=4,p.full+' '+q.t);}});
    for(let i=1;i<a.length;i++)assert.ok(!(a[i].t==='s'&&a[i-1].t==='s'),p.full+': granice dwa razy z rzędu');
  }
  ['k','t','h','z','g','p'].forEach(t=>assert.ok(rodzaje[t]>300,'rzadko: '+t+' '+rodzaje[t]));
});

test('Poprawna odpowiedź jest wśród opcji i należy do okolicy, nie zawsze to atakowany powiat',()=>{
  let celP=0,ile=0;
  for(const p of D.powAll.slice(0,120))for(let s=1;s<=3;s++){
    for(const q of PP.zestaw(D,p.k,rnd(s))){
      if(q.t==='k'){ile++;if(q.p===p)celP++;assert.ok(q.opcje.includes(q.p.label));assert.ok(q.opcje.includes(p.label));}
      if(q.t==='p'){assert.ok(q.opcje.includes(q.pw.label));assert.ok(PP.wPowiecie(q.c,q.pw));}
      if(q.t==='t')assert.ok(q.opcje.includes(q.p.nazwa));
      if(q.t==='h'||q.t==='z'||q.t==='g')assert.ok(PP.wPowiecie(q.c,p)||PP.okolica(D.powAll,p).some(x=>PP.wPowiecie(q.c,x)),p.full+': miasto spoza okolicy');
      if(q.t==='s')assert.equal(q.sas,p.nb.includes(q.b.k));
    }
  }
  assert.ok(celP>ile*0.1&&celP<ile*0.45,'atakowany powiat jako odpowiedź: '+celP+'/'+ile);
});

test('Dobra odpowiedź: mapa od 700 pkt, reszta od 500',()=>{
  assert.equal(PP.dobra({t:'g',pts:650}),false);assert.equal(PP.dobra({t:'g',pts:720}),true);
  assert.equal(PP.dobra({t:'h',pts:1000}),true);assert.equal(PP.dobra({t:'s',pts:0}),false);
});
