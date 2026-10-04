const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const topojson=require('../topojson-client.min.js'),topo=JSON.parse(fs.readFileSync('gminy.topojson','utf8'));
test('Wspólna pula gmin zawiera każde miasto na prawach powiatu dokładnie raz',async()=>{
 const source=fs.readFileSync('wspolne.js','utf8'),start=source.indexOf('const TYP_GMINY='),end=source.indexOf('/* ---- losowanie powtarzalne',start);
 const ctx={topojson,WOJ_KOD:{},loadPowiaty:async()=>[],fetch:async()=>({json:async()=>topo})};vm.createContext(ctx);vm.runInContext(source.slice(start,end),ctx);const g=await ctx.loadGminy();
 const expected=Object.values(topo.objects).sort((a,b)=>b.geometries.length-a.geometries.length)[0].geometries.filter(f=>/^[0-9]{6}[123]$/.test(f.properties.k)&&f.type);assert.equal(g.length,expected.length);assert.equal(g.length,new Set(g.map(x=>x.k)).size);
 const cities=expected.filter(f=>+f.properties.k.slice(2,4)>=61);assert.equal(cities.length,66);
 for(const f of cities){const found=g.filter(x=>x.k===f.properties.k);assert.equal(found.length,1,f.properties.n);assert.equal(found[0].typ,'gmina miejska');assert.equal(found[0].city,true);assert.ok(found[0].bb.every(Number.isFinite));}
 for(const n of ['Warszawa','Kraków','Gdańsk','Sopot','Świnoujście'])assert.ok(g.some(x=>x.n===n&&x.city),n);
 assert.ok(g.some(x=>x.n==='Pruszcz Gdański'&&x.typ==='gmina wiejska'));
});
