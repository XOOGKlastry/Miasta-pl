/* Dwa odrębne konteksty, prawdziwy PeerJS/WebRTC. Wymaga sieci sygnalizacji. */
const {chromium}=require('playwright'),fs=require('fs'),assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({headless:true}),errors=[];fs.mkdirSync('ui-review-output',{recursive:true});try{
 const contexts=await Promise.all([browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}),browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'})]);
 const pages=await Promise.all(contexts.map(async c=>{const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));await p.route(/fonts.googleapis|fonts.gstatic|commons.wikimedia|tile.openstreetmap|tile.opentopomap/,r=>r.abort());await p.goto('http://127.0.0.1:8765/karta-w-ciemno.html');await p.locator('#setup').waitFor();await p.locator('#mode').selectOption('online');return p;}));
 const [a,b]=pages;await a.locator('[name=deck][value=equal]').check();await a.locator('#create-room').click();await a.waitForFunction(()=>document.getElementById('room-info').textContent.startsWith('Kod pokoju:'),{},{timeout:45000});const code=(await a.locator('#room-info').innerText()).match(/Kod pokoju: ([a-z0-9]{5})/)[1];await b.locator('#room-code').fill(code);await b.locator('#join-room').click();
 for(let i=0;i<5;i++){
  for(const p of pages)await p.locator('[data-choice]').first().waitFor({timeout:45000});
  assert.equal(await a.locator('#metric').innerText(),await b.locator('#metric').innerText());
  await a.locator('[data-choice]').first().click();assert.ok(!(await a.locator('#reveal').isVisible()));await b.locator('[data-choice]').last().click();for(const p of pages)await p.locator('#reveal').waitFor();assert.equal(await a.locator('#score').innerText(),await b.locator('#score').innerText());
  if(i===0)for(let n=0;n<2;n++)await pages[n].screenshot({path:`ui-review-output/peer-${n}.png`,fullPage:true});
  await a.locator('#next').click();await b.locator('#next').click();
 }
 for(const p of pages)await p.waitForFunction(()=>document.getElementById('round').textContent==='Koniec meczu');assert.equal(await a.locator('#score').innerText(),await b.locator('#score').innerText());assert.deepEqual(errors,[]);fs.writeFileSync('ui-review-output/peer-result.json',JSON.stringify({ok:true,score:await a.locator('#score').innerText()}));
 }catch(e){fs.writeFileSync('ui-review-output/peer-result.json',JSON.stringify({ok:false,error:e.message,errors}));throw e;}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
