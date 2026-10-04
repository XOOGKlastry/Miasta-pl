/* Chromium: pełne mecze AI/local, kontrast, responsywność, podgląd karty. */
const {chromium}=require('playwright'),fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({headless:true}),errors=[];fs.mkdirSync('ui-review-output',{recursive:true});
 const contexts=[];
 try{
 for(const width of [360,390,430]){
  const context=await browser.newContext({viewport:{width,height:844},reducedMotion:'reduce'});contexts.push(context);const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.route(/fonts.googleapis|fonts.gstatic|commons.wikimedia|tile.openstreetmap|tile.opentopomap/,r=>r.abort());
  // Widoki auth testujemy deterministycznie, bez wysyłania wiadomości ani prawdziwych danych gracza.
  await page.route('**/auth/v1/settings',r=>r.fulfill({json:{external:{google:false,facebook:false,email:true}}}));
  await page.route('**/rest/v1/rpc/leaderboard',r=>r.fulfill({json:[{place:1,nickname:'Odkrywca',value:1500},{place:2,nickname:'Podróżniczka',value:1250}]}));
  await page.goto('http://127.0.0.1:8765/logowanie.html');
  await page.waitForFunction(()=>document.getElementById('google').dataset.unavailable==='1');
  assert.ok(await page.locator('#google').isDisabled());
  assert.equal(await page.locator('h1').evaluate(e=>getComputedStyle(e).color),'rgb(37, 70, 50)');
  assert.ok(await page.locator('#mail button').isDisabled());await page.screenshot({path:`ui-review-output/login-${width}.png`,fullPage:true});
  await page.goto('http://127.0.0.1:8765/ranking.html');await page.locator('#rows tr').first().waitFor();await page.locator('#cards').click();assert.equal(await page.locator('#cards').getAttribute('aria-pressed'),'true');await page.screenshot({path:`ui-review-output/ranking-${width}.png`,fullPage:true});
  await page.goto('http://127.0.0.1:8765/karty.html');await page.locator('#drop-rows tr').first().waitFor({state:'attached'});
  await page.getByText('Szanse paczek i kart',{exact:true}).click();await page.locator('[data-drop="zloto"]').click();
  assert.equal(await page.locator('[data-drop="zloto"]').getAttribute('aria-pressed'),'true');assert.ok(!(await page.locator('#szanse').innerText()).includes('000000000000'));
  await page.screenshot({path:`ui-review-output/album-${width}.png`,fullPage:true});
  await page.evaluate(()=>{const g=Karty.dane().g.find(g=>g.ovr>=90),county=Karty.dane().g.filter(c=>c.k.slice(0,4)===g.k.slice(0,4));localStorage.setItem('karty-paczki',JSON.stringify(county.map(c=>c.k)));localStorage.setItem('nauka-v1',JSON.stringify({['kontur:'+g.k]:{ok:40}}));localStorage.setItem('ui-card',g.k);});
  await page.reload();await page.waitForFunction(()=>window.Karty?.dane());const cardId=await page.evaluate(()=>localStorage.getItem('ui-card'));await page.locator(`.kk[data-k="${cardId}"]`).first().click();await page.locator('.kk-podglad').waitFor();assert.ok(await page.locator('.kk-podglad .holograficzna').count());await page.screenshot({path:`ui-review-output/card-${width}.png`,fullPage:true});await page.locator('.kk-podglad [data-ovr]').click();await page.locator('.kk-ciek').waitFor();assert.match(await page.locator('.kk-ciek').innerText(),/kontury \+4/);await page.locator('.kk-ciek-gora button').click();await page.locator('.close-preview').click();
  await page.goto('http://127.0.0.1:8765/karta-w-ciemno.html');await page.locator('#setup').waitFor();await page.locator('[name=deck][value=equal]').check();await page.locator('#start').click();const played=new Set(),metrics=new Set();
  for(let i=0;i<5;i++){
   await page.locator('[data-choice]').first().waitFor();metrics.add(await page.locator('#metric').innerText());const ids=await page.locator('[data-choice]').evaluateAll(bs=>bs.map(b=>b.dataset.choice));assert.equal(ids.length,12-i);ids.forEach(id=>assert.ok(!played.has(id)));const chosen=ids[0];played.add(chosen);
   if(!i){await page.evaluate(()=>localStorage.setItem('jokery','1'));await page.reload();await page.locator('#setup').waitFor();await page.locator('[name=deck][value=equal]').check();await page.locator('#start').click();played.clear();metrics.clear();metrics.add(await page.locator('#metric').innerText());await page.locator('#hint').click();await page.locator('[data-choice]').first().click();assert.equal(await page.evaluate(()=>localStorage.getItem('jokery')),'0');assert.equal(await page.locator('.reveal-value').count(),1);played.add(await page.locator('[data-choice]').first().getAttribute('data-choice'));await page.screenshot({path:`ui-review-output/blind-${width}.png`,fullPage:true});}
   await page.locator('[data-choice]').first().click();await page.locator('#reveal').waitFor();assert.equal(await page.locator('#reveal tbody tr').count(),12-i);if(!i)await page.screenshot({path:`ui-review-output/reveal-${width}.png`,fullPage:true});await page.locator('#next').click();
  }
  assert.equal(metrics.size,5);assert.equal(await page.locator('#round').innerText(),'Koniec meczu');
  await page.goto('http://127.0.0.1:8765/karta-w-ciemno.html');await page.locator('#setup').waitFor();await page.locator('#mode').selectOption('local');await page.locator('[name=deck][value=equal]').check();await page.locator('#start').click();
  for(let i=0;i<5;i++){await page.locator('#ready').click();assert.match(await page.locator('#turn').innerText(),/1/);await page.locator('[data-choice]').first().click();assert.equal(await page.locator('#choices').innerHTML(),'');await page.locator('#ready').click();assert.match(await page.locator('#turn').innerText(),/2/);await page.locator('[data-choice]').first().click();await page.locator('#next').click();}
  assert.equal(await page.locator('#round').innerText(),'Koniec meczu');
  for(const url of ['logowanie.html','ranking.html','karta-w-ciemno.html']){await page.goto('http://127.0.0.1:8765/'+url);const sizes=await page.evaluate(()=>({width:document.documentElement.scrollWidth,viewport:innerWidth}));assert.ok(sizes.width<=sizes.viewport,url+' overflows at '+width);}
  await context.close();
 }
 }finally{await browser.close();fs.writeFileSync('ui-review-output/errors.json',JSON.stringify(errors));}
 assert.deepEqual(errors,[]);
})().catch(e=>{console.error(e);process.exit(1)});
