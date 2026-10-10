/* Podbój Polski: mapa 380 powiatów, właściciele z bazy (conq_mapa), akcje w arkuszu powiatu.
   Zasady pilnuje serwer (conq_start, conq_wynik, conq_kup); tu tylko podpowiadamy, co jest możliwe. */
(function(){
 const $=id=>document.getElementById(id);
 const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const KOLORY=['#E84A3C','#2E86DE','#8E5CC9','#E67E22','#16A3A3','#C2185B','#7F8C8D','#B7950B','#5D6D7E','#D35400','#3949AB','#AD1457'];
 const hash=s=>{let h=0;for(const c of String(s))h=(h*31+c.charCodeAt(0))>>>0;return h;};
 const kolor=id=>KOLORY[hash(id)%KOLORY.length];
 const awatar=(id,nick,moj)=>'<span class="awatar" style="--a:'+(moj?'#27AE60':kolor(id))+'">'+esc(String(nick||'?').trim().charAt(0).toUpperCase())+'</span>';
 const URLP=new URLSearchParams(location.search);
 const status=$('status'),svg=$('mapa'),ark=$('arkusz'),tresc=$('ark-tresc');
 let POW=[],PO=new Map(),PATH=new Map(),STAN=new Map(),JA=null,wybrany=null,PROJ=null;

 const monety=()=>+(localStorage.getItem('karty-zetony')||0)||0;
 const ustawMonety=n=>{try{localStorage.setItem('karty-zetony',String(Math.max(0,n)));}catch(e){}};
 const moje=()=>JA?POW.filter(p=>{const s=STAN.get(p.k);return s&&s.owner===JA.me;}):[];
 function graniczy(p){const m=new Set(moje().map(x=>x.k));return (p.nb||[]).some(k=>m.has(k));}
 // co gracz może zrobić z powiatem (podpowiedź; ostatnie słowo ma serwer)
 function mozliwosci(p){
  const s=STAN.get(p.k)||{},ile=moje().length,moj=JA&&s.owner===JA.me,wolny=!s.owner,obok=ile===0||graniczy(p);
  return {s,moj,wolny,obok,ile,
   zdobadz:wolny&&(ile===0||graniczy(p)),
   umocnij:moj&&s.score<8,
   przebij:!wolny&&!moj&&ile>0&&graniczy(p)&&s.score<8,
   pojedynek:!wolny&&!moj&&ile>0&&graniczy(p)&&s.score>=8,
   kup:!wolny&&!moj&&s.price!=null&&obok};
 }

 /* ---------- mapa ---------- */
 async function rysujMape(){
  POW=await ZP.loadPowiaty();PO=new Map(POW.map(p=>[p.k,p]));
  const woj=await ZP.loadWoj().catch(()=>[]);
  PROJ=ZP.projection(POW.map(p=>p.f),500,4);
  svg.setAttribute('viewBox','0 0 500 '+PROJ.H.toFixed(0));
  svg.innerHTML='<g id="gPow">'+POW.map(p=>'<path data-k="'+p.k+'" d="'+PROJ.path(p.f.geometry,0.7)+'"/>').join('')+'</g>'
   +'<g>'+woj.map(w=>'<path class="woj" d="'+PROJ.path(w.f.geometry,0.9)+'"/>').join('')+'</g><g id="gOzn"></g>';
  svg.querySelectorAll('#gPow path').forEach(el=>PATH.set(el.dataset.k,el));
  svg.addEventListener('click',e=>{const el=e.target.closest('path[data-k]');if(el)pokazPowiat(el.dataset.k);});
  ZP.zoomSvg(svg,$('mapaBox')).reset();
  $('laduje').textContent='';
 }
 // start: mapa przybliżona na Twoje powiaty z sąsiadami (albo na wskazany powiat), cała Polska jest pod przyciskiem ⤢
 function przybliz(lista){
  if(!lista.length)return;
  const wsz=new Set();lista.forEach(p=>{wsz.add(p.k);(p.nb||[]).forEach(k=>wsz.add(k));});
  let b=[1e9,1e9,-1e9,-1e9];
  wsz.forEach(k=>{const q=PO.get(k);if(!q)return;const x0=PROJ.x(q.bb[0]),x1=PROJ.x(q.bb[2]),y0=PROJ.y(q.bb[3]),y1=PROJ.y(q.bb[1]);b=[Math.min(b[0],x0),Math.min(b[1],y0),Math.max(b[2],x1),Math.max(b[3],y1)];});
  const H=PROJ.H,prop=H/500;let w=Math.max(b[2]-b[0],140)*1.15,h=Math.max(b[3]-b[1],140*prop)*1.15;
  if(h/w>prop)w=h/prop;else h=w*prop;w=Math.min(w,500);h=Math.min(h,H);
  const cx=(b[0]+b[2])/2,cy=(b[1]+b[3])/2,x=Math.max(0,Math.min(500-w,cx-w/2)),y=Math.max(0,Math.min(H-h,cy-h/2));
  svg.setAttribute('viewBox',[x,y,w,h].map(v=>v.toFixed(1)).join(' '));
 }
 function koloruj(){
  if(!PATH.size)return;
  const ozn=[];
  for(const p of POW){
   const el=PATH.get(p.k),s=STAN.get(p.k),m=mozliwosci(p);
   let f='#FFF6E0';
   if(s&&s.owner)f=JA&&s.owner===JA.me?'var(--pd-moj)':kolor(s.owner);
   else if(JA&&m.zdobadz&&m.ile>0)f='var(--pd-wolny-cel)';
   el.style.fill=f;
   el.classList.toggle('tw',!!(s&&s.score>=8));
   el.classList.toggle('cel',!!(JA&&m.ile>0&&(m.przebij||m.pojedynek||(m.zdobadz))));
   el.classList.toggle('wyb',p.k===wybrany);
   const zn=(s&&s.score>=8?'★':'')+(s&&s.price!=null?'🪙':'')+(s&&s.pojedynek?'⚔':'');
   const roz=Math.min(9,0.45*Math.min(PROJ.x(p.bb[2])-PROJ.x(p.bb[0]),PROJ.y(p.bb[1])-PROJ.y(p.bb[3])));
   if(zn)ozn.push('<text class="ozn" font-size="'+roz.toFixed(1)+'" x="'+PROJ.x(p.lon).toFixed(1)+'" y="'+PROJ.y(p.lat).toFixed(1)+'">'+zn+'</text>');
  }
  const w=PATH.get(wybrany);if(w)w.parentNode.appendChild(w);   // obrys wybranego na wierzchu
  $('gOzn').innerHTML=ozn.join('');
 }

 /* ---------- dane z serwera ---------- */
 async function odswiez(){
  if(!Online.enabled()){status.textContent='Podbój wymaga połączenia z rankingiem online.';return;}
  try{
   const [mapa,ja]=await Promise.all([Online.podboj.mapa(),Online.dolaczony()?Online.podboj.ja().catch(()=>null):null]);
   STAN=new Map((mapa||[]).map(r=>[r.k,r]));JA=ja||null;status.textContent='';
  }catch(e){status.textContent=/conq_|function|schema/i.test(e.message)?'Podbój jeszcze się uruchamia. Spróbuj za chwilę.':'Brak połączenia: '+e.message;return;}
  liczniki();komunikaty();koloruj();
  if(wybrany&&!ark.hidden)pokazPowiat(wybrany,true);
 }
 function liczniki(){
  const m=moje();
  $('ileMoich').textContent=JA?m.length:'–';
  $('ileTwierdz').textContent=JA?m.filter(p=>STAN.get(p.k).score>=8).length:'–';
  $('ileAtakow').textContent=JA?Math.max(0,JA.limit-JA.ataki)+'/'+JA.limit:'–';
 }
 const zostalo=t=>{const ms=new Date(t)-Date.now();if(ms<=0)return 'chwila';const h=Math.floor(ms/3600000),m=Math.floor(ms%3600000/60000);return h?h+' h '+m+' min':m+' min';};
 function komunikaty(){
  const box=$('komunikaty'),html=[];
  if(!Online.dolaczony())html.push('<div class="pole pd-alert zloto"><div><b>Dołącz do gry</b><small>Wpisz pseudonim w rankingu, a zaczniesz zdobywać powiaty.</small></div><a class="klocek" href="ranking.html">Dołącz</a></div>');
  else if(JA&&!moje().length)html.push('<div class="pole pd-alert zloto"><div><b>Wybierz pierwszy powiat</b><small>Stuknij dowolny wolny powiat na mapie. Potem możesz atakować tylko sąsiednie.</small></div></div>');
  if(JA){
   (JA.obrony||[]).forEach(d=>{const p=PO.get(d.k);html.push('<div class="pole pd-alert pilne"><div><b>⚔️ '+esc(d.nick)+' atakuje twierdzę</b><small>'+esc(p?p.full:d.k)+': rywal ma '+d.wynik+' z 8. Zostało '+zostalo(d.expires)+'.</small></div><button class="klocek" data-obrona="'+esc(d.id)+'" data-k="'+esc(d.k)+'" data-cel="'+d.wynik+'" data-rywal="'+esc(d.nick)+'">Broń</button></div>');});
   (JA.moje_pojedynki||[]).forEach(d=>{const p=PO.get(d.k);html.push('<div class="pole pd-alert"><div><b>⏳ Czekasz na '+esc(d.nick)+'</b><small>'+esc(p?p.full:d.k)+': Twój wynik '+d.wynik+' z 8. Jeśli nie odpowie w '+zostalo(d.expires)+', twierdza jest Twoja.</small></div></div>');});
   if(JA.portfel>0)html.push('<div class="pole pd-alert zloto"><div><b>🪙 '+JA.portfel+' monet ze sprzedaży</b><small>Ktoś kupił Twój powiat.</small></div><button class="klocek" id="odbierz">Odbierz</button></div>');
  }
  box.innerHTML=html.join('');
  box.querySelectorAll('[data-obrona]').forEach(b=>b.onclick=()=>graj(b.dataset.k,'obrona',b.dataset.obrona,b));
  if($('odbierz'))$('odbierz').onclick=async e=>{e.target.disabled=true;try{const n=+(await Online.podboj.odbierz())||0;if(n){ZP.zeton(n);ZP.komunikat('Odebrano '+n+' monet');}}catch(er){ZP.komunikat(er.message);}odswiez();};
 }
 async function ranking(){
  try{const l=await Online.podboj.ranking();const rows=$('rows');
   rows.innerHTML=(l||[]).map(r=>'<tr class="klik'+(JA&&r.public_id===JA.me?' moj':'')+'" data-id="'+esc(r.public_id)+'" data-n="'+esc(r.nickname)+'"><td>'+r.place+'</td><td><span class="pd-kropka" style="display:inline-block;width:10px;height:10px;border-radius:3px;border:2px solid var(--braz);margin-right:6px;background:'+(JA&&r.public_id===JA.me?'var(--pd-moj)':kolor(r.public_id))+'"></span>'+esc(r.nickname)+'</td><td>'+r.powiaty+(r.twierdze?' · '+r.twierdze+'★':'')+'</td></tr>').join('')
    ||'<tr><td colspan="3">Nikt jeszcze nie zdobył powiatu. Bądź pierwszy!</td></tr>';
   rows.querySelectorAll('tr[data-id]').forEach(tr=>tr.onclick=()=>{location.href='ranking.html?gracz='+encodeURIComponent(tr.dataset.id)+'&n='+encodeURIComponent(tr.dataset.n);});
  }catch(e){}
 }

 /* ---------- arkusz powiatu ---------- */
 function otworz(html){tresc.innerHTML=html;ark.hidden=false;document.body.classList.add('arkusz-otwarty');requestAnimationFrame(()=>ark.classList.add('widac'));}
 function zamknij(){ark.classList.remove('widac');document.body.classList.remove('arkusz-otwarty');wybrany=null;koloruj();setTimeout(()=>{if(!ark.classList.contains('widac'))ark.hidden=true;},250);}
 ark.addEventListener('click',e=>{if(e.target.closest('[data-zamknij]'))zamknij();});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!ark.hidden)zamknij();});
 const pasek=(n,moj)=>'<div class="pd-pasek'+(moj?' moj':'')+'" aria-label="Obrona '+n+' z 8">'+Array.from({length:8},(_,i)=>'<i class="'+(i<n?'pelne':'')+'"></i>').join('')+'</div>';

 function pokazPowiat(k,odswiezenie){
  const p=PO.get(k);if(!p)return;wybrany=k;koloruj();
  const m=mozliwosci(p),s=m.s,akcje=[];
  let opis='';
  if(m.wolny)opis='<div class="pd-wlasciciel"><div><b>Wolny powiat</b><small>Zdobędziesz go od 5 dobrych odpowiedzi na 8.</small></div></div>';
  else opis='<div class="pd-wlasciciel">'+awatar(s.owner,m.moj?'Ty':s.nick,m.moj)+'<div><b>'+(m.moj?'Twój powiat':esc(s.nick))+(s.score>=8?' · twierdza ★':'')+'</b><small>Obrona '+s.score+' z 8'+(s.price!=null?' · na sprzedaż za '+s.price+' 🪙':'')+(s.pojedynek?' · trwa pojedynek':'')+'</small>'+pasek(s.score,m.moj)+'</div></div>';
  const atakiZostalo=JA?JA.limit-JA.ataki:0;
  if(!Online.dolaczony())akcje.push('<a class="klocek" href="ranking.html">Dołącz, żeby walczyć</a>');
  else if(!JA)akcje.push('<p class="uwaga">Ładowanie Twojego stanu…</p>');
  else{
   const blokada=s.pojedynek?'O ten powiat trwa pojedynek.':atakiZostalo<=0?'Wykorzystałeś dziś 10 ataków. Wróć jutro!':'';
   if(m.zdobadz)akcje.push(przycisk('atak','🏴 Zdobądź','potrzeba 5 z 8',blokada));
   if(m.umocnij)akcje.push(przycisk('atak','🛡️ Umocnij','masz '+s.score+' z 8, zagraj lepiej',blokada));
   if(m.przebij)akcje.push(przycisk('atak','⚔️ Przebij','potrzeba '+(s.score+1)+' z 8',blokada));
   if(m.pojedynek)akcje.push(przycisk('pojedynek','⚔️ Pojedynek 24 h','obrońca ma dobę na odpowiedź',blokada));
   if(m.kup)akcje.push('<button class="klocek jasny dwulinia" data-kup="'+s.price+'"'+(s.pojedynek?' disabled':'')+'>Kup za '+s.price+' 🪙<small>masz '+monety()+' monet</small></button>');
   if(m.moj)akcje.push(s.price==null?'<div class="pd-cena"><input id="cena" type="number" inputmode="numeric" min="5" max="500" step="1" placeholder="Cena 5–500" aria-label="Cena w monetach"><button class="klocek jasny" id="wystaw">Wystaw 🪙</button></div>'
     :'<button class="klocek jasny" id="zdejmij">Zdejmij ze sprzedaży ('+s.price+' 🪙)</button>');
   if(!m.wolny&&!m.moj&&!m.obok)akcje.push('<p class="uwaga">Ten powiat nie graniczy z Twoimi. Zdobądź najpierw sąsiedni.</p>');
   if(m.wolny&&!m.zdobadz)akcje.push('<p class="uwaga">Możesz zdobywać tylko powiaty graniczące z Twoimi.</p>');
   if(blokada&&(m.zdobadz||m.umocnij||m.przebij||m.pojedynek))akcje.push('<p class="uwaga">'+blokada+'</p>');
   if(!m.wolny&&!m.moj)akcje.push('<a class="klocek jasny" href="ranking.html?gracz='+encodeURIComponent(s.owner)+'&n='+encodeURIComponent(s.nick||'')+'">Profil gracza '+esc(s.nick)+'</a>');
  }
  const html='<div class="ark-glowa"><div><h2 id="ark-tytul">'+esc(p.full)+'</h2><small>woj. '+esc(p.woj)+(JA?' · ataki dziś: '+Math.max(0,atakiZostalo)+' z '+JA.limit:'')+'</small></div></div>'
   +opis+'<div class="akcje">'+akcje.join('')+'</div><p class="uwaga" id="pdBlad" hidden></p>';
  if(odswiezenie&&!ark.hidden)tresc.innerHTML=html;else otworz(html);
  tresc.querySelectorAll('[data-rodzaj]').forEach(b=>b.onclick=()=>graj(k,b.dataset.rodzaj,null,b));
  const kup=tresc.querySelector('[data-kup]');if(kup)kup.onclick=()=>kupuj(k,+kup.dataset.kup,kup);
  if($('wystaw'))$('wystaw').onclick=()=>sprzedaj(k,+$('cena').value,$('wystaw'));
  if($('zdejmij'))$('zdejmij').onclick=()=>sprzedaj(k,null,$('zdejmij'));
 }
 function przycisk(rodzaj,tytul,pod,blokada){return '<button class="klocek dwulinia" data-rodzaj="'+rodzaj+'"'+(blokada?' disabled':'')+'>'+tytul+'<small>'+pod+'</small></button>';}
 function blad(t){const e=$('pdBlad');if(e){e.textContent=t;e.hidden=false;}else ZP.komunikat(t);}

 async function graj(k,rodzaj,pojedynek,btn){
  if(btn)btn.disabled=true;
  if(rodzaj==='pojedynek'&&!confirm('Zagrasz 8 pytań. Obrońca dostanie te same i dobę na wyrównanie Twojego wyniku. Zaczynamy?')){if(btn)btn.disabled=false;return;}
  try{
   const r=await Online.podboj.start(k,rodzaj,pojedynek);
   const s=STAN.get(k)||{},u=new URLSearchParams({tryb:'podboj',proba:r.id,k:r.k,seed:r.seed,rodzaj:r.rodzaj});
   if(r.cel!=null)u.set('cel',r.cel);const rywal=r.rywal||(btn&&btn.dataset.rywal);if(rywal)u.set('rywal',rywal);if(r.wlasny)u.set('obecny',s.score||0);
   location.href='wyzwanie.html?'+u.toString();
  }catch(e){if(btn)btn.disabled=false;blad(e.message);odswiez();}
 }
 async function kupuj(k,cena,btn){
  if(monety()<cena){blad('Masz '+monety()+' monet, a potrzeba '+cena+'. Zbieraj monety w grach.');return;}
  if(!confirm('Kupić '+(PO.get(k)||{}).full+' za '+cena+' monet?'))return;
  btn.disabled=true;
  try{await Online.podboj.kup(k,cena);ustawMonety(monety()-cena);ZP.komunikat('Powiat jest Twój!');ZP.fanfary&&ZP.fanfary();await odswiez();}
  catch(e){btn.disabled=false;blad(e.message);odswiez();}
 }
 async function sprzedaj(k,cena,btn){
  if(cena!=null&&!(cena>=5&&cena<=500)){blad('Podaj cenę od 5 do 500 monet.');return;}
  btn.disabled=true;
  try{await Online.podboj.sprzedaz(k,cena);ZP.komunikat(cena==null?'Oferta zdjęta':'Powiat wystawiony za '+cena+' monet');await odswiez();}
  catch(e){btn.disabled=false;blad(e.message);}
 }

 /* ---------- start ---------- */
 (async function(){
  try{await rysujMape();}catch(e){$('laduje').textContent='Nie udało się wczytać mapy.';return;}
  // gracz bez wpisu w rankingu: zapisujemy profil, żeby serwer go rozpoznał
  if(Online.enabled()&&Online.dolaczony())await Online.odswiezProfil().catch(()=>{});
  await odswiez();ranking();
  const k=URLP.get('k');
  przybliz(k&&PO.has(k)?[PO.get(k)]:moje());
  if(k&&PO.has(k))pokazPowiat(k);
  setInterval(()=>{if(!document.hidden)odswiez();},30000);
 })();
})();
