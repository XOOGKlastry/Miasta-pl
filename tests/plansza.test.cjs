/* Bez zależności: node --test tests/plansza.test.cjs */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
function renderer(){const ctx={window:{}};vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(root,'krainy.js'),'utf8'),ctx);return ctx.window.Krainy;}
const manifest=JSON.parse(fs.readFileSync(path.join(root,'krainy-grafiki.json'),'utf8'));
test('Każdy motyw ma istniejący atlas oraz wycinek wewnątrz obrazu',()=>{
 const k=renderer();const names=[...Object.keys(k.MOTYWY),...Object.keys(k.ANIMOWANE),'jezioro'];
 for(const id of names){const g=manifest[id];assert.ok(g,id);assert.ok(fs.existsSync(path.join(root,g.src)),g.src);const [x,y,w,h]=g.rect;assert.ok(x>=0&&y>=0&&w>0&&h>0&&x+w<=g.atlas[0]&&y+h<=g.atlas[1],id);}
});
test('16 krain na 3 szerokościach: stabilne motywy i poprawne liczby',()=>{
 const k=renderer();k.ustawGrafiki(manifest);
 for(const W of [360,390,430])for(const [i,woj]of Object.keys(k.REGIONY).entries()){
   const pts=Array.from({length:8},(_,n)=>({x:W/2+Math.sin((i*6+n)*.95)*Math.min(120,W*.3),y:640-n*96}));
   const args=[woj,W,686,pts,{top:602,bottom:686},i*97+13,i+1];
   const a=k.kraina(...args),b=k.kraina(...args);
   assert.equal(a.deko,b.deko);assert.ok(a.ile>0,woj);assert.doesNotMatch(a.teren+a.deko+a.anim,/NaN|undefined/);assert.match(a.deko,/kr-sprite/);
 }
});
test('Brak atlasów przywraca wektorowy motyw',()=>{const k=renderer();assert.match(k.motyw('latarnia'),/<path/);k.ustawGrafiki(manifest);assert.match(k.motyw('latarnia'),/natura.webp/);k.ustawGrafiki({});assert.doesNotMatch(k.motyw('latarnia'),/<image/);});
test('Polandball jest kołem, a jego identyfikatory są unikalne',()=>{
 const ctx={window:{},document:{readyState:'loading',addEventListener(){}}};vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(root,'polandball.js'),'utf8'),ctx);
 const a=ctx.window.PB.svg(),b=ctx.window.PB.svg('radosc');
 assert.match(a,/<circle class="pb-obrys" cx="41" cy="42" r="33"/);assert.notEqual(a.match(/id="pbk(\d+)"/)[1],b.match(/id="pbk(\d+)"/)[1]);
 const source=fs.readFileSync(path.join(root,'polandball.js'),'utf8');assert.doesNotMatch(source.match(/@keyframes pbOdbicie[^\n]+/)[0],/scale/);
});
