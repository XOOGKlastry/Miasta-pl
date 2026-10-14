/* Podbój Polski: mapa 380 powiatów, właściciele z bazy (conq_mapa), akcje w arkuszu powiatu.
   Zasady i monety pilnuje serwer (conq_start, conq_wynik, conq_kup_atak, conq_tarcza, conq_odsiecz); tu tylko podpowiadamy, co jest możliwe.
   Monety są tylko w Podboju: dochód z powiatów, zadania dnia, skarb tygodnia. */
(function(){
 const $=id=>document.getElementById(id);
 const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const KOLORY=['#E84A3C','#2E86DE','#8E5CC9','#E67E22','#16A3A3','#C2185B','#7F8C8D','#B7950B','#5D6D7E','#D35400','#3949AB','#AD1457'];
 const hash=s=>{let h=0;for(const c of String(s))h=(h*31+c.charCodeAt(0))>>>0;return h;};
 const kolor=id=>KOLORY[hash(id)%KOLORY.length];
 const awatar=(id,nick,moj)=>'<span class="awatar" style="--a:'+(moj?'#27AE60':kolor(id))+'">'+esc(String(nick||'?').trim().charAt(0).toUpperCase())+'</span>';
 const URLP=new URLSearchParams(location.search);
 const status=$('status'),svg=$('mapa'),ark=$('arkusz'),tresc=$('ark-tresc');
 let POW=[],PO=new Map(),PATH=new Map(),STAN=new Map(),JA=null,TYG=null,wybrany=null,PROJ=null;

 const monety=()=>JA?+JA.monety||0:0;
 const oblezone=()=>new Map(((TYG&&TYG.oblezenia)||[]).map(o=>[o.k,o]));
 // stolice graczy (k -> owner) i wojewodowie (kod województwa -> {owner,nick})
 const stolice=()=>new Map(((TYG&&TYG.stolice)||[]).map(o=>[o.k,o.owner]));
 const wojewodowie=()=>new Map(((TYG&&TYG.wojewodowie)||[]).map(o=>[o.woj,o]));
 // bezpieczne stolice (wszyscy sąsiedzi należą do właściciela) i tarcze (k -> do kiedy)
 const bezpieczne=()=>new Set(((TYG&&TYG.stolice)||[]).filter(o=>o.bezpieczna).map(o=>o.k));
 const tarcze=()=>new Map(((TYG&&TYG.tarcze)||[]).filter(o=>new Date(o.do)>Date.now()).map(o=>[o.k,o.do]));
 const godzina=t=>new Date(t).toLocaleString('pl-PL',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
 const KOSZT_TARCZY=()=>JA&&JA.koszt_tarczy||30;
 // skarby tygodnia (kilka: stolice województw i jeden losowy), powiaty przy granicy Polski, gracze z ochroną nowego startu
 const skarby=()=>new Map((TYG&&TYG.skarby&&TYG.skarby.length?TYG.skarby:(TYG&&TYG.skarb?[{k:TYG.skarb,zdobywcy:TYG.zdobywcy||[]}]:[])).map(o=>[o.k,o]));
 const mojeSkarby=()=>new Set(((JA&&JA.skarby_moje)||[]).map(o=>o.k));
 const granica=()=>new Set((TYG&&TYG.granica)||[]);
 const ochrony=()=>new Map(((TYG&&TYG.ochrony)||[]).filter(o=>new Date(o.do)>Date.now()).map(o=>[o.owner,o.do]));
 const mamOchrone=()=>!!(JA&&JA.ochrona_do&&new Date(JA.ochrona_do)>Date.now());
 // sąsiedzi stolicy, którzy jeszcze nie są Twoi
 const brakDookola=k=>{const p=PO.get(k);return p?(p.nb||[]).filter(n=>n!==k&&PO.has(n)&&!(STAN.get(n)&&JA&&STAN.get(n).owner===JA.me)):[];};
 const WOJ_NAZWA=k=>ZP.WOJ_KOD[k]||k;
 let WOJ_SRODEK={};
 // ile dobrych odpowiedzi trzeba na cudzy powiat: obrona + 1, stolica jeszcze +1 (najwyżej 8)
 const celAtaku=(k,s)=>Math.min(8,s.score+1+(stolice().get(k)===s.owner?1:0));
 const moje=()=>JA?POW.filter(p=>{const s=STAN.get(p.k);return s&&s.owner===JA.me;}):[];
 function graniczy(p){const m=new Set(moje().map(x=>x.k));return (p.nb||[]).some(k=>m.has(k));}
 // co gracz może zrobić z powiatem (podpowiedź; ostatnie słowo ma serwer)
 function mozliwosci(p){
  const s=STAN.get(p.k)||{},ile=moje().length,moj=JA&&s.owner===JA.me,wolny=!s.owner,obok=ile===0||graniczy(p);
  // nowy start (bez powiatów): wolny albo zwykły cudzy powiat, ale nie twierdza i nie stolica
  const stolicaRywala=!wolny&&stolice().get(p.k)===s.owner;
  return {s,moj,wolny,obok,ile,stolicaRywala,
   zdobadz:wolny&&(ile===0||graniczy(p)),
   umocnij:moj&&s.score<8,
   przebij:!wolny&&!moj&&s.score<8&&(ile>0?graniczy(p):!stolicaRywala),
   pojedynek:!wolny&&!moj&&ile>0&&graniczy(p)&&s.score>=8,
   chroniony:!wolny&&!moj&&ochrony().has(s.owner),
   oslona:!wolny&&!moj&&tarcze().has(p.k),
   tarcza:moj&&!s.pojedynek&&!tarcze().has(p.k)};
 }

 /* ---------- mapa ---------- */
 async function rysujMape(){
  POW=await ZP.loadPowiaty();PO=new Map(POW.map(p=>[p.k,p]));
  const woj=await ZP.loadWoj().catch(()=>[]);
  PROJ=ZP.projection(POW.map(p=>p.f),500,4);
  // środek województwa (do korony wojewody): średnia środków jego powiatów
  const sr={};POW.forEach(p=>{const k=p.k.slice(0,2);(sr[k]=sr[k]||[0,0,0]);sr[k][0]+=p.lon;sr[k][1]+=p.lat;sr[k][2]++;});
  WOJ_SRODEK=Object.fromEntries(Object.entries(sr).map(([k,v])=>[k,[PROJ.x(v[0]/v[2]),PROJ.y(v[1]/v[2])]]));
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
  const ozn=[],obl=oblezone(),stol=stolice(),sk=skarby(),och=ochrony();
  for(const p of POW){
   const el=PATH.get(p.k),s=STAN.get(p.k),m=mozliwosci(p);
   let f='#FFF6E0';
   if(s&&s.owner)f=JA&&s.owner===JA.me?'var(--pd-moj)':kolor(s.owner);
   else if(JA&&m.zdobadz&&m.ile>0)f='var(--pd-wolny-cel)';
   el.style.fill=f;
   el.classList.toggle('tw',!!(s&&s.score>=8));
   el.classList.toggle('cel',!!(JA&&m.ile>0&&!m.oslona&&!m.chroniony&&(m.przebij||m.pojedynek||(m.zdobadz))));
   el.classList.toggle('wyb',p.k===wybrany);
   const zn=(sk.has(p.k)?'💰':'')+(s&&stol.get(p.k)===s.owner?'🏛':'')+(s&&s.score>=8?'★':'')+(s&&tarcze().has(p.k)?'🛡':'')+(s&&s.owner&&s.owner!==(JA&&JA.me)&&och.has(s.owner)?'🐣':'')+(s&&s.pojedynek?'⚔':'')+(obl.has(p.k)?'🔥':'');
   const roz=Math.min(9,0.45*Math.min(PROJ.x(p.bb[2])-PROJ.x(p.bb[0]),PROJ.y(p.bb[1])-PROJ.y(p.bb[3])));
   if(zn)ozn.push('<text class="ozn" font-size="'+roz.toFixed(1)+'" x="'+PROJ.x(p.lon).toFixed(1)+'" y="'+PROJ.y(p.lat).toFixed(1)+'">'+zn+'</text>');
  }
  wojewodowie().forEach((o,woj)=>{const c=WOJ_SRODEK[woj];if(c)ozn.push('<text class="ozn korona" font-size="16" x="'+c[0].toFixed(1)+'" y="'+c[1].toFixed(1)+'">👑</text>');});
  const w=PATH.get(wybrany);if(w)w.parentNode.appendChild(w);   // obrys wybranego na wierzchu
  $('gOzn').innerHTML=ozn.join('');
 }

 /* ---------- dane z serwera ---------- */
 async function odswiez(){
  if(!Online.enabled()){status.textContent='Podbój wymaga połączenia z rankingiem online.';return;}
  try{
   const [mapa,ja,tyg]=await Promise.all([Online.podboj.mapa(),Online.dolaczony()?Online.podboj.ja().catch(()=>null):null,Online.podboj.tydzien().catch(()=>null)]);
   STAN=new Map((mapa||[]).map(r=>[r.k,r]));JA=ja||null;TYG=tyg||null;status.textContent='';
   if(JA&&(JA.dochod>0||JA.zadania_monety>0))ZP.komunikat('🪙 '+[JA.dochod>0?'Dochód z powiatów: +'+JA.dochod:'',JA.zadania_monety>0?'zadania dnia: +'+JA.zadania_monety:''].filter(Boolean).join(', ')+' monet',4200);
  }catch(e){status.textContent=/conq_|function|schema/i.test(e.message)?'Podbój jeszcze się uruchamia. Spróbuj za chwilę.':'Brak połączenia: '+e.message;return;}
  liczniki();skarbiec();skarbTygodnia();zadania();komunikaty();koloruj();
  if(wybrany&&!ark.hidden)pokazPowiat(wybrany,true);
 }
 function liczniki(){
  const m=moje();
  $('ileMoich').textContent=JA?m.length:'–';
  $('ileTwierdz').textContent=JA?m.filter(p=>STAN.get(p.k).score>=8).length:'–';
  $('ileAtakow').textContent=JA?Math.max(0,JA.limit-JA.ataki)+'/'+JA.limit:'–';
 }
 // skarbiec: monety, dochód dzienny i zakup dodatkowego ataku
 function skarbiec(){
  const box=$('skarbiec');box.hidden=!JA;if(!JA)return;
  $('monety').textContent=JA.monety;
  $('dochodInfo').textContent='monet · dochód +'+(JA.dochod_dzienny||0)+' dziennie'+(JA.przygraniczne?' · 🛂 '+JA.przygraniczne+' przy granicy':'');
  $('kosztAtaku').textContent=JA.koszt_ataku+' 🪙';
  $('kupAtak').disabled=JA.monety<JA.koszt_ataku;
 }
 $('kupAtak').onclick=async e=>{const b=e.currentTarget;if(!JA)return;
  if(!confirm('Kupić dodatkowy atak na dziś za '+JA.koszt_ataku+' monet?'))return;
  b.disabled=true;try{const r=await Online.podboj.kupAtak();ZP.komunikat('Masz dodatkowy atak! Dziś: '+r.limit+' ataków.');await odswiez();}catch(er){ZP.komunikat(er.message);b.disabled=false;}};
 // nagroda za skarb zależy od miejsca: 1. 100 monet i legendarna paczka, 2.–3. 50 i złota, dalsi 25 i srebrna
 const NAGRODA_SKARBU=n=>n<=1?'100 🪙 i legendarna paczka':n<=3?'50 🪙 i złota paczka':'25 🪙 i srebrna paczka';
 function skarbTygodnia(){
  const box=$('skarbTyg'),sk=[...skarby().values()].filter(o=>PO.has(o.k));if(!sk.length){box.hidden=true;return;}
  const moje=mojeSkarby();
  const koniec=(()=>{const d=new Date(),dz=(d.getDay()+6)%7,n=new Date(d);n.setDate(d.getDate()+7-dz);n.setHours(0,0,0,0);const h=Math.max(0,Math.round((n-d)/36e5));return h>=24?Math.floor(h/24)+' d '+(h%24)+' h':h+' h';})();
  box.innerHTML='<h2>💰 Skarby tygodnia<small>'+moje.size+' / '+sk.length+' · jeszcze '+koniec+'</small></h2>'
   +'<p class="pd-skarb-zasady">Każdy skarb osobno: pierwszy zdobywca 100 🪙 i legendarna paczka, 2. i 3. po 50 🪙 i złotej, kolejni 25 🪙 i srebrna.</p>'
   +sk.map(o=>{const p=PO.get(o.k),zd=o.zdobywcy||[],mj=moje.has(o.k);
    return '<div class="pd-skarb-rzad'+(mj?' zdobyty':'')+'"><span class="ik" aria-hidden="true">'+(mj?'✅':o.stolica_woj?'🏙️':'🧭')+'</span><div><b>'+esc(p.full)+'</b><small>'
     +(mj?'Zdobyty!':zd.length?'Zdobywców: '+zd.length+' ('+esc(zd[0].nick)+' pierwszy). Teraz: '+NAGRODA_SKARBU(zd.length+1)+'.':'Nikt jeszcze nie dotarł: '+NAGRODA_SKARBU(1)+'.')
     +'</small></div><button class="klocek jasny" type="button" data-skarb="'+esc(o.k)+'">Pokaż</button></div>';}).join('');
  box.hidden=false;
  box.querySelectorAll('[data-skarb]').forEach(b=>b.onclick=()=>{const p=PO.get(b.dataset.skarb);przybliz([p]);pokazPowiat(p.k);});
 }
 function zadania(){
  const box=$('zadania');if(!JA||!JA.zadania){box.hidden=true;return;}
  const z=JA.zadania,ile=z.filter(x=>x.zrobione).length;
  box.innerHTML='<h2>📜 Zadania dnia<small>'+ile+' / '+z.length+(JA.komplet?' · komplet ✓':'')+'</small></h2><ul>'
   +z.map(x=>'<li class="'+(x.zrobione?'ok':'')+'"><i>'+(x.zrobione?'✓':'')+'</i><span>'+esc(x.opis)+'</span><em>+10 🪙</em></li>').join('')
   +'</ul><small style="font-weight:700;color:var(--braz-2);font-size:12px">Za komplet trzech jeszcze +15 monet. Nagroda wpada sama po grze.</small>';
  box.hidden=false;
 }
 const zostalo=t=>{const ms=new Date(t)-Date.now();if(ms<=0)return 'chwila';const h=Math.floor(ms/3600000),m=Math.floor(ms%3600000/60000);return h?h+' h '+m+' min':m+' min';};
 function komunikaty(){
  const box=$('komunikaty'),html=[];
  if(!Online.dolaczony())html.push('<div class="pole pd-alert zloto"><div><b>Dołącz do gry</b><small>Wpisz pseudonim w rankingu, a zaczniesz zdobywać powiaty.</small></div><a class="klocek" href="ranking.html">Dołącz</a></div>');
  else if(JA&&!moje().length)html.push(JA['grał']
   ?'<div class="pole pd-alert zloto"><div><b>🌱 Nowy start</b><small>Straciłeś wszystkie powiaty, ale gra toczy się dalej. Zacznij od dowolnego wolnego powiatu albo zwykłego cudzego (nie twierdzy i nie stolicy). Dostaniesz 48 h ochrony'+(JA.odbudowa?' i 40 monet na odbudowę':'')+'.</small></div></div>'
   :'<div class="pole pd-alert zloto"><div><b>Wybierz pierwszy powiat</b><small>Stuknij dowolny wolny powiat albo zwykły cudzy (nie twierdzę i nie stolicę). Przez 48 h nikt Cię nie zaatakuje, a potem możesz atakować tylko sąsiednie.</small></div></div>');
  if(mamOchrone()&&moje().length)html.push('<div class="pole pd-alert zloto"><div><b>🐣 Ochrona do '+godzina(JA.ochrona_do)+'</b><small>Nikt nie może zaatakować Twoich powiatów. Ochrona kończy się wcześniej, jeśli sam zaatakujesz innego gracza, więc najpierw zajmij wolne powiaty dookoła.</small></div></div>');
  if(JA){
   if(JA.powiaty>=10&&!JA.stolica)html.push('<div class="pole pd-alert zloto"><div><b>🏛️ Masz '+JA.powiaty+' powiatów: wybierz stolicę!</b><small>Stuknij swój powiat i „Ustaw stolicę”. Stolica daje podwójny dochód i +1 do obrony (gdy wszystko dookoła jest Twoje: potrójny dochód i +1 atak dziennie), ale jej utrata to łup 20% Twoich monet dla zdobywcy.</small></div></div>');
   if(JA.stolica&&JA.stolica_bezpieczna)html.push('<div class="pole pd-alert zloto"><div><b>🏛️ Bezpieczna stolica</b><small>Wszystkie powiaty dookoła stolicy są Twoje: potrójny dochód ze stolicy i +1 atak każdego dnia.</small></div></div>');
   if(JA.wojewoda&&JA.wojewoda.length)html.push('<div class="pole pd-alert zloto"><div><b>👑 Jesteś wojewodą: '+JA.wojewoda.map(WOJ_NAZWA).map(esc).join(', ')+'</b><small>Masz wszystkie powiaty tego województwa: podwójny dochód z każdego z nich. Pilnuj granic!</small></div></div>');
   (JA.obrony||[]).forEach(d=>{const p=PO.get(d.k);html.push('<div class="pole pd-alert pilne"><div><b>⚔️ '+esc(d.nick)+' atakuje twierdzę</b><small>'+esc(p?p.full:d.k)+': rywal ma '+d.wynik+' z 8. Zostało '+zostalo(d.expires)+'.</small></div><button class="klocek" data-obrona="'+esc(d.id)+'" data-k="'+esc(d.k)+'" data-cel="'+d.wynik+'" data-rywal="'+esc(d.nick)+'">Broń</button></div>');});
   (JA.moje_pojedynki||[]).forEach(d=>{const p=PO.get(d.k);html.push('<div class="pole pd-alert"><div><b>⏳ Czekasz na '+esc(d.nick)+'</b><small>'+esc(p?p.full:d.k)+': Twój wynik '+d.wynik+' z 8. Jeśli nie odpowie w '+zostalo(d.expires)+', twierdza jest Twoja.</small></div></div>');});
   // oblężenia: grupujemy odcięte powiaty po rywalu i czasie końca
   const grupy=(l,nick)=>{const g={};(l||[]).forEach(o=>{const kl=o.nick+'|'+o.koniec;(g[kl]=g[kl]||{nick:o.nick,koniec:o.koniec,odsiecz:o.odsiecz,k:[]}).k.push(o.k);});return Object.values(g);};
   grupy(JA.oblezony).forEach(o=>{const n=o.k.map(k=>PO.get(k)?PO.get(k).short:k);html.push('<div class="pole pd-alert pilne"><div><b>🔥 Oblężenie: '+esc(o.nick)+' odciął Twoje powiaty</b><small>'+esc(n.join(', '))+'. Połącz je z resztą w '+zostalo(o.koniec)+', inaczej przejdą do rywala.'+(o.odsiecz?' Odsiecz: '+o.odsiecz+'/2.':'')+'</small></div>'
    +(o.odsiecz<2?'<button class="klocek" data-odsiecz="'+esc(o.k[0])+'">Odsiecz<br><small>25 🪙</small></button>':'')+'</div>');});
   grupy(JA.oblegam).forEach(o=>{const n=o.k.map(k=>PO.get(k)?PO.get(k).short:k);html.push('<div class="pole pd-alert zloto"><div><b>🔥 Oblegasz powiaty gracza '+esc(o.nick)+'</b><small>'+esc(n.join(', '))+'. Jeśli wytrzymasz '+zostalo(o.koniec)+', przejdą do Ciebie.</small></div></div>');});
  }
  box.innerHTML=html.join('');
  box.querySelectorAll('[data-obrona]').forEach(b=>b.onclick=()=>graj(b.dataset.k,'obrona',b.dataset.obrona,b));
  box.querySelectorAll('[data-odsiecz]').forEach(b=>b.onclick=async()=>{
   if(!confirm('Wezwać odsiecz za 25 monet? Oblężenie wydłuży się o 24 godziny.'))return;
   b.disabled=true;try{await Online.podboj.odsiecz(b.dataset.odsiecz);ZP.komunikat('Odsiecz w drodze: +24 h!');await odswiez();}catch(er){ZP.komunikat(er.message);b.disabled=false;}});
 }
 async function ranking(){
  try{const l=await Online.podboj.ranking();const rows=$('rows');
   rows.innerHTML=(l||[]).map(r=>'<tr class="klik'+(JA&&r.public_id===JA.me?' moj':'')+'" data-id="'+esc(r.public_id)+'" data-n="'+esc(r.nickname)+'"><td>'+r.place+'</td><td><span class="pd-kropka" style="display:inline-block;width:10px;height:10px;border-radius:3px;border:2px solid var(--braz);margin-right:6px;background:'+(JA&&r.public_id===JA.me?'var(--pd-moj)':kolor(r.public_id))+'"></span>'+esc(r.nickname)+(()=>{const n=[...wojewodowie().values()].filter(o=>o.owner===r.public_id).length;return n?' <span title="wojewoda">'+'👑'.repeat(Math.min(n,3))+'</span>':'';})()+'</td><td>'+r.powiaty+(r.twierdze?' · '+r.twierdze+'★':'')+'</td></tr>').join('')
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
  else opis='<div class="pd-wlasciciel">'+awatar(s.owner,m.moj?'Ty':s.nick,m.moj)+'<div><b>'+(m.moj?'Twój powiat':esc(s.nick))+(s.score>=8?' · twierdza ★':'')+(stolice().get(k)===s.owner?' · 🏛️ stolica':'')+'</b><small>'+(wojewodowie().get(k.slice(0,2))&&wojewodowie().get(k.slice(0,2)).owner===s.owner?'👑 wojewoda '+esc(WOJ_NAZWA(k.slice(0,2)))+' · ':'')+'Obrona '+s.score+' z 8'+(s.pojedynek?' · trwa pojedynek':'')+(oblezone().has(k)?' · 🔥 oblężony':'')+(tarcze().has(k)?' · 🛡️ tarcza do '+godzina(tarcze().get(k)):'')+(m.chroniony?' · 🐣 nowy gracz, ochrona do '+godzina(ochrony().get(s.owner)):'')+'</small>'+pasek(s.score,m.moj)+'</div></div>';
  const atakiZostalo=JA?JA.limit-JA.ataki:0;
  if(!Online.dolaczony())akcje.push('<a class="klocek" href="ranking.html">Dołącz, żeby walczyć</a>');
  else if(!JA)akcje.push('<p class="uwaga">Ładowanie Twojego stanu…</p>');
  else{
   const blokada=s.pojedynek?'O ten powiat trwa pojedynek.':m.chroniony?esc(s.nick)+' dopiero zaczyna i ma ochronę do '+godzina(ochrony().get(s.owner))+'. Zaatakuj kogoś innego.':m.oslona?'Ten powiat chroni tarcza do '+godzina(tarcze().get(k))+'. Zaatakuj inny albo wróć później.':atakiZostalo<=0?'Wykorzystałeś dzisiejsze ataki. Kup kolejny za '+JA.koszt_ataku+' monet albo wróć jutro.':'';
   if(m.zdobadz)akcje.push(przycisk('atak','🏴 Zdobądź','potrzeba 5 z 8',blokada));
   if(m.umocnij)akcje.push(przycisk('atak','🛡️ Umocnij','masz '+s.score+' z 8, zagraj lepiej',blokada));
   if(m.przebij)akcje.push(przycisk('atak',m.ile?'⚔️ Przebij':'🌱 Zacznij tutaj','potrzeba '+celAtaku(k,s)+' z 8'+(stolice().get(k)===s.owner?' · stolica: łup 20% monet':'')+(mamOchrone()?' · stracisz ochronę':''),blokada));
   if(m.pojedynek)akcje.push(przycisk('pojedynek','⚔️ Pojedynek 24 h','obrońca ma dobę na odpowiedź'+(mamOchrone()?' · stracisz ochronę':''),blokada));
   if(m.tarcza)akcje.push('<button class="klocek jasny dwulinia" id="tarcza"'+(monety()<KOSZT_TARCZY()||(JA.tarcze||0)>=2?' disabled':'')+'>🛡️ Tarcza 24 h<small>'+((JA.tarcze||0)>=2?'masz już 2 tarcze':KOSZT_TARCZY()+' 🪙 · masz '+monety()+' · nikt nie zaatakuje przez dobę')+'</small></button>');
   if(atakiZostalo<=0&&(m.zdobadz||m.umocnij||m.przebij||m.pojedynek))akcje.push('<button class="klocek jasny dwulinia" id="kupAtak2"'+(monety()<JA.koszt_ataku?' disabled':'')+'>➕ Dodatkowy atak<small>'+JA.koszt_ataku+' 🪙 · masz '+monety()+'</small></button>');
   if(m.moj&&JA.powiaty>=10&&JA.stolica!==k)akcje.push('<button class="klocek jasny dwulinia" id="stolica"'+(JA.stolica&&monety()<JA.koszt_stolicy?' disabled':'')+'>🏛️ '+(JA.stolica?'Przenieś tu stolicę':'Ustaw stolicę')+'<small>'+(JA.stolica?JA.koszt_stolicy+' 🪙 · masz '+monety():'za darmo · podwójny dochód i +1 obrony')+'</small></button>');
   if(m.moj&&JA.stolica===k){const br=brakDookola(k);
    akcje.unshift('<p class="uwaga">🏛️ To Twoja stolica: +1 do obrony i '+(br.length?'podwójny dochód. Zajmij wszystkie powiaty dookoła (brakuje: '+esc(br.map(n=>PO.get(n).short).join(', '))+'), a będzie bezpieczna: potrójny dochód i +1 atak dziennie.':'<b>bezpieczna</b>: wszystko dookoła jest Twoje, więc potrójny dochód i +1 atak dziennie.')+' Jeśli ją stracisz, zdobywca zabierze 20% Twoich monet.</p>');}
   if(!m.moj&&!m.wolny&&stolice().get(k)===s.owner)akcje.unshift('<p class="uwaga">🏛️ Stolica gracza '+esc(s.nick)+': potrzeba o 1 dobrą odpowiedź więcej, a zdobycie da łup 20% jego monet.</p>');
   if(granica().has(k))akcje.push('<p class="uwaga">🛂 Powiat przy granicy Polski: +2 monety dziennie dla właściciela.</p>');
   if(skarby().has(k)){const zd=skarby().get(k).zdobywcy||[];akcje.unshift('<p class="uwaga">💰 Tu jest skarb tygodnia! '+(mojeSkarby().has(k)?'Już go zdobyłeś.':'Zdobądź ten powiat, a dostaniesz '+NAGRODA_SKARBU(zd.length+1)+'.')+'</p>');}
   if(!m.moj&&!m.wolny&&!m.ile&&(m.stolicaRywala||s.score>=8))akcje.push('<p class="uwaga">Na nowy start wybierz wolny powiat albo zwykły cudzy: twierdzy ani stolicy nie da się zająć na początek.</p>');
   if(!m.wolny&&!m.moj&&!m.obok&&m.ile)akcje.push('<p class="uwaga">Ten powiat nie graniczy z Twoimi. Zdobądź najpierw sąsiedni.</p>');
   if(m.wolny&&!m.zdobadz)akcje.push('<p class="uwaga">Możesz zdobywać tylko powiaty graniczące z Twoimi.</p>');
   if(blokada&&(m.zdobadz||m.umocnij||m.przebij||m.pojedynek))akcje.push('<p class="uwaga">'+blokada+'</p>');
   if(!m.wolny&&!m.moj)akcje.push('<a class="klocek jasny" href="ranking.html?gracz='+encodeURIComponent(s.owner)+'&n='+encodeURIComponent(s.nick||'')+'">Profil gracza '+esc(s.nick)+'</a>');
  }
  const html='<div class="ark-glowa"><div><h2 id="ark-tytul">'+esc(p.full)+'</h2><small>woj. '+esc(p.woj)+(JA?' · ataki dziś: '+Math.max(0,atakiZostalo)+' z '+JA.limit:'')+'</small></div></div>'
   +opis+'<div class="akcje">'+akcje.join('')+'</div><p class="uwaga" id="pdBlad" hidden></p>';
  if(odswiezenie&&!ark.hidden)tresc.innerHTML=html;else otworz(html);
  tresc.querySelectorAll('[data-rodzaj]').forEach(b=>b.onclick=()=>graj(k,b.dataset.rodzaj,null,b));
  if($('tarcza'))$('tarcza').onclick=async e=>{const b=e.currentTarget;
   if(!confirm('Postawić tarczę na '+p.full+' za '+KOSZT_TARCZY()+' monet? Przez 24 h nikt go nie zaatakuje (oblężenia tarcza nie zatrzymuje).'))return;
   b.disabled=true;try{const r=await Online.podboj.tarcza(k);ZP.komunikat('🛡️ Tarcza stoi do '+godzina(r.do));await odswiez();}catch(er){blad(er.message);b.disabled=false;}};
  if($('stolica'))$('stolica').onclick=async e=>{const b=e.currentTarget;
   if(JA.stolica&&!confirm('Przenieść stolicę tutaj za '+JA.koszt_stolicy+' monet?'))return;
   b.disabled=true;try{await Online.podboj.stolica(k);ZP.komunikat('🏛️ '+p.full+' to teraz Twoja stolica!');await odswiez();}catch(er){blad(er.message);b.disabled=false;}};
  if($('kupAtak2'))$('kupAtak2').onclick=async e=>{const b=e.currentTarget;b.disabled=true;try{await Online.podboj.kupAtak();await odswiez();}catch(er){blad(er.message);b.disabled=false;}};
 }
 function przycisk(rodzaj,tytul,pod,blokada){return '<button class="klocek dwulinia" data-rodzaj="'+rodzaj+'"'+(blokada?' disabled':'')+'>'+tytul+'<small>'+pod+'</small></button>';}
 function blad(t){const e=$('pdBlad');if(e){e.textContent=t;e.hidden=false;}else ZP.komunikat(t);}

 async function graj(k,rodzaj,pojedynek,btn){
  if(btn)btn.disabled=true;
  const sc=STAN.get(k);
  if(rodzaj!=='obrona'&&mamOchrone()&&sc&&sc.owner&&sc.owner!==JA.me&&!confirm('Atak na innego gracza kończy Twoją ochronę nowego gracza. Atakujesz?')){if(btn)btn.disabled=false;return;}
  if(rodzaj==='pojedynek'&&!confirm('Zagrasz 8 pytań. Obrońca dostanie te same i dobę na wyrównanie Twojego wyniku. Zaczynamy?')){if(btn)btn.disabled=false;return;}
  try{
   const r=await Online.podboj.start(k,rodzaj,pojedynek);
   const s=STAN.get(k)||{},u=new URLSearchParams({tryb:'podboj',proba:r.id,k:r.k,seed:r.seed,rodzaj:r.rodzaj});
   if(r.cel!=null)u.set('cel',r.cel);const rywal=r.rywal||(btn&&btn.dataset.rywal);if(rywal)u.set('rywal',rywal);if(r.wlasny)u.set('obecny',s.score||0);
   location.href='wyzwanie.html?'+u.toString();
  }catch(e){if(btn)btn.disabled=false;blad(e.message);odswiez();}
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
