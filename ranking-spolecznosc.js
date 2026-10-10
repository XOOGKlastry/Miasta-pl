/* Ranking: tabele, profil gracza, wiadomości i wyzwania na pojedynek prosto z rankingu. */
(()=>{'use strict';
 const $=id=>document.getElementById(id);
 const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const liczba=n=>Number(n||0).toLocaleString('pl-PL');
 const status=$('status'),rows=$('rows');
 let mode='points',sequence=0,watek=null,odswiezanie=null;

 /* ---------- tabela rankingu ---------- */
 async function load(){
  const id=++sequence;
  $('value').textContent=mode==='points'?'Punkty':mode==='cards'?'Karty':mode==='week'?'Pkt tygodnia':'Ranking walk';
  for(const x of ['points','cards','duels','week'])$(x).setAttribute('aria-pressed',String(x===mode));
  rows.replaceChildren();
  if(!Online.enabled()){status.textContent='Ranking online jest niedostępny. Twój postęp pozostaje na urządzeniu.';return;}
  status.textContent='Wczytywanie…';
  try{
   const T=mode==='week'&&window.Saga?Saga.tydzien():null;
   const data=mode==='week'?await Online.wydarzenie.ranking(T&&T.klucz):await Online.ranking(mode);if(id!==sequence)return;
   status.textContent=mode==='week'&&T?'🔥 Kraina tygodnia: '+Saga.SWIATY[T.kraina].nazwa+(data.length?'':'. Nikt jeszcze nie grał, zagraj jej poziomy na planszy!'):data.length?'':mode==='duels'?'Nikt jeszcze nie walczył na żywo. Wyzwij kogoś z rankingu punktów!':'Bądź pierwszym odkrywcą w rankingu.';
   const ja=Online.ja();
   for(const r of data){
    const tr=document.createElement('tr'),ty=r.public_id&&r.public_id===ja;
    [r.place<=3?['🥇','🥈','🥉'][r.place-1]:r.place,r.nickname,liczba(r.value)].forEach((val,i)=>{const td=document.createElement('td');td.textContent=val;if(i===1&&ty){const b=document.createElement('span');b.className='ty';b.textContent='Ty';td.append(' ',b);}tr.append(td);});
    if(r.place<=3)tr.classList.add('podium');
    if(ty)tr.classList.add('moj');
    if(r.public_id){tr.dataset.id=r.public_id;tr.classList.add('klik');tr.tabIndex=0;tr.setAttribute('role','button');tr.setAttribute('aria-label','Profil gracza '+r.nickname);
     const otworz=()=>pokazProfil(r.public_id,r.nickname);tr.onclick=otworz;tr.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();otworz();}};}
    rows.append(tr);
   }
   kropkiOnline();
  }catch(e){if(id===sequence)status.textContent=/fetch|network|sieć/i.test(e.message)?'Brak połączenia z rankingiem. Sprawdź internet i spróbuj ponownie.':e.message;}
 }
 // zielona kropka przy graczach, którzy są teraz w grze (można ich wyzwać na żywo)
 async function kropkiOnline(){
  try{const l=await Online.walka.online(),on=new Set((l||[]).map(x=>x.public_id||x));
   rows.querySelectorAll('tr').forEach(tr=>{const id=tr.dataset.id;const td=tr.children[1];if(!td||!id)return;const b=td.querySelector('.online');if(on.has(id)&&!b)td.insertAdjacentHTML('afterbegin','<i class="online" title="W grze teraz"></i>');if(!on.has(id)&&b)b.remove();});
  }catch(e){}
 }
 setInterval(()=>{if(!document.hidden)kropkiOnline();},30000);
 for(const x of ['points','cards','duels','week'])$(x).onclick=()=>{mode=x;load();};

 $('publish').onsubmit=async e=>{
  e.preventDefault();const b=e.target.querySelector('button');b.disabled=true;
  try{
   const nick=$('nick').value,visible=$('visible').checked,dm=$('dm').checked;
   localStorage.setItem('ranking-profile',JSON.stringify({nick,visible,dm}));
   const s=await Online.session();if(s)await Online.publish(nick,visible,dm);else await Online.publishGuest(nick,visible,dm);
   await load();status.textContent=visible?'Profil zapisany w rankingu.':'Wynik zapisany prywatnie.';
   $('skrzynka').hidden=false;
  }catch(e){status.textContent=e.message;}finally{b.disabled=false;}
 };

 /* ---------- arkusz (profil, skrzynka, rozmowa) ---------- */
 const ark=$('arkusz'),tresc=$('ark-tresc');
 function otworzArkusz(html){tresc.innerHTML=html;ark.hidden=false;document.body.classList.add('arkusz-otwarty');requestAnimationFrame(()=>ark.classList.add('widac'));}
 function zamknij(){clearInterval(odswiezanie);odswiezanie=null;watek=null;ark.classList.remove('widac');document.body.classList.remove('arkusz-otwarty');setTimeout(()=>{if(!ark.classList.contains('widac'))ark.hidden=true;},250);licznikNieprzeczytanych();}
 ark.addEventListener('click',e=>{if(e.target.closest('[data-zamknij]'))zamknij();});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!ark.hidden)zamknij();});

 const KOLORY=['#E84A3C','#2E86DE','#27AE60','#8E5CC9','#F08A2C','#16A085','#C0392B','#D35400'];
 function awatar(id,nick){let h=0;for(const c of String(id))h=(h*31+c.charCodeAt(0))>>>0;return '<span class="awatar" style="--a:'+KOLORY[h%KOLORY.length]+'">'+esc(String(nick||'?').trim().charAt(0).toUpperCase())+'</span>';}
 const RZ_KOL={legenda:'#F0B52C',diament:'#7FC8F8',zloto:'#E1B33E',srebro:'#AEB9C3',zwykla:'#CDB98E'};

 async function pokazProfil(id,nick){
  otworzArkusz('<div class="ark-glowa">'+awatar(id,nick)+'<div><h2 id="ark-tytul">'+esc(nick)+'</h2><small>wczytywanie profilu…</small></div></div>');
  let p,lp=null;
  try{[p,lp]=await Promise.all([Online.profil(id),Online.walka.profil(id).catch(()=>null)]);}catch(e){tresc.querySelector('small').textContent=/function|player_profile/i.test(e.message)?'Profile graczy jeszcze się uruchamiają. Spróbuj za chwilę.':e.message;return;}
  if(!p){tresc.querySelector('small').textContent='Ten gracz ukrył swój profil.';return;}
  const st=p.stats||{},D=Karty.dane(),RZ=Karty.RZ,KOL=Karty.KOLEJ,ja=id===Online.ja();
  const mojeKarty=Karty.zdobyte().mam.size,mojePkt=Online.points();
  const rz=st.rz||{},sumaRz=KOL.reduce((a,r)=>a+(+rz[r]||0),0)||1;
  const pasek=KOL.filter(r=>rz[r]>0).map(r=>'<i style="width:'+(100*rz[r]/sumaRz).toFixed(2)+'%;background:'+RZ_KOL[r]+'"></i>').join('');
  const chipy=KOL.filter(r=>rz[r]>0).map(r=>'<span class="chip"><i style="background:'+RZ_KOL[r]+'"></i>'+rz[r]+' '+esc(RZ[r].toLowerCase())+'</span>').join('');
  const naj=(st.naj||[]).map(k=>D&&D.PO_K[k]).filter(Boolean);
  const kd=st.kd||{},gier=(kd.w||0)+(kd.r||0)+(kd.p||0);
  const miejsce=(n,t)=>'<div class="miejsce"><b>'+(n<=3?['🥇','🥈','🥉'][n-1]:'#'+n)+'</b><span>'+t+'</span></div>';
  const porownaj=(jego,moje)=>ja?'':'<small class="vs '+(moje>jego?'lepiej':moje<jego?'gorzej':'')+'">Ty: '+liczba(moje)+'</small>';
  let h='<div class="ark-glowa">'+awatar(id,p.nickname)+'<div><h2 id="ark-tytul">'+esc(p.nickname)+(ja?' <span class="ty">Ty</span>':'')+'</h2><small>'+(lp&&lp.online?'<i class="online"></i> w grze teraz':'aktywny '+kiedy(p.updated_at))+'</small></div></div>'
   +'<div class="miejsca">'+miejsce(p.place_points,'punkty')+miejsce(p.place_cards,'kolekcja')+miejsce(p.place_duels,'pojedynki')+'</div>'
   +'<div class="staty">'
   +'<div><b>'+liczba(p.cards)+'</b><span>kart z '+liczba(D?D.g.length:2479)+'</span>'+porownaj(p.cards,mojeKarty)+'</div>'
   +'<div><b>'+liczba(p.points)+'</b><span>punktów</span>'+porownaj(p.points,mojePkt)+'</div>'
   +'<div><b>'+(lp&&lp.games?liczba(lp.rating):'–')+'</b><span>ranking walk</span></div>'
   +'<div><b>'+(lp&&lp.games?lp.wins+' / '+lp.games:'0')+'</b><span>wygrane walki na żywo</span></div>'
   +'</div>';
  if(chipy)h+='<div class="rz-pasek" aria-hidden="true">'+pasek+'</div><div class="chipy">'+chipy+'</div>';
  if(naj.length)h+='<h3>Najlepsze karty</h3><div class="naj-karty">'+naj.map(g=>Karty.karta(g,{tryb:'mini'})).join('')+'</div>';
  const dod=[];
  if(st.woj)dod.push(['Ulubione województwo',esc(st.woj.n)+' · '+st.woj.ile+'/'+st.woj.z+' kart']);
  if(st.poz)dod.push(['Plansza przygód',st.poz+' poziomów · '+st.gw+' ★']);
  if(st.lan)dod.push(['Rekord Łańcucha dnia',st.lan+' pkt']);
  if(st.ser)dod.push(['Seria codziennych',st.ser+' '+(st.ser===1?'dzień':'dni')]);
  if(st.odz)dod.push(['Odznaki rekordzistek',st.odz]);
  if(dod.length)h+='<dl class="dodatki">'+dod.map(([a,b])=>'<div><dt>'+a+'</dt><dd>'+b+'</dd></div>').join('')+'</dl>';
  if(!st.v)h+='<p class="uwaga">Gracz nie odświeżył jeszcze profilu w nowej wersji gry, więc część statystyk jest ukryta.</p>';
  if(!ja)h+='<div class="akcje">'
   +(lp&&lp.online?'<div class="walcz"><button type="button" class="klocek" data-walka="quiz">⚔️ Quiz na żywo</button><button type="button" class="klocek" data-walka="mapa">📍 Wyścig na mapie</button></div><p class="uwaga" id="walka-info">'+esc(p.nickname)+' jest teraz w grze. Walka na żywo liczy się do rankingu.</p>'
     :'<p class="uwaga">Walka na żywo, gdy '+esc(p.nickname)+' będzie w grze (zielona kropka). Teraz możesz wysłać wyzwanie na 24 h.</p>')
   +'<a class="klocek'+(lp&&lp.online?' jasny':'')+'" href="karta-w-ciemno.html?rywal='+encodeURIComponent(id)+'&rn='+encodeURIComponent(p.nickname)+'">🃏 Karta w ciemno · 24 h</a>'
   +(p.dm_open?'<button type="button" class="klocek jasny" id="napisz">✉️ Napisz</button>':'<p class="uwaga">Ten gracz nie przyjmuje wiadomości, ale wyzwanie możesz wysłać.</p>')+'</div>'
   +'<p class="male-linki"><button type="button" id="zablokuj">Zablokuj</button> · <button type="button" id="zglos">Zgłoś</button></p>';
  else h+='<p class="uwaga">Tak widzą Cię inni gracze. Statystyki odświeżają się, gdy wchodzisz do rankingu.</p>';
  tresc.innerHTML=h;
  tresc.querySelectorAll('.naj-karty .kk').forEach(el=>{try{Karty.holo(el);}catch(e){}});
  try{Karty.podepnijMapy(tresc);}catch(e){}
  if($('napisz'))$('napisz').onclick=()=>pokazWatek(id,p.nickname);
  tresc.querySelectorAll('[data-walka]').forEach(b=>b.onclick=async()=>{
   if(!Online.dolaczony()){$('walka-info').textContent='Najpierw zapisz swój pseudonim w rankingu (formularz pod tabelą).';return;}
   tresc.querySelectorAll('[data-walka]').forEach(x=>x.disabled=true);$('walka-info').textContent='Wysyłam zaproszenie…';
   try{const m=await Online.walka.zapros(id,b.dataset.walka,'w1');location.href='wyzwanie.html?tryb=walka&mecz='+encodeURIComponent(m);}
   catch(e){$('walka-info').textContent=e.message;tresc.querySelectorAll('[data-walka]').forEach(x=>x.disabled=false);}
  });
  if($('zablokuj'))$('zablokuj').onclick=()=>blokuj(id,p.nickname,false);
  if($('zglos'))$('zglos').onclick=()=>blokuj(id,p.nickname,true);
 }
 async function blokuj(id,nick,zglos){
  if(!Online.dolaczony()){alert('Najpierw zapisz swój pseudonim w rankingu.');return;}
  if(!confirm(zglos?'Zgłosić '+nick+' i zablokować? Nie będzie mógł do Ciebie pisać.':'Zablokować '+nick+'? Nie będzie mógł do Ciebie pisać ani wysyłać wyzwań.'))return;
  try{await Online.zablokuj(id,zglos);zamknij();status.textContent=nick+(zglos?' zgłoszony i zablokowany.':' zablokowany.');}catch(e){alert(e.message);}
 }
 function kiedy(t){
  if(!t)return 'dawno';const m=Math.round((Date.now()-new Date(t))/60000);
  if(m<2)return 'przed chwilą';if(m<60)return m+' min temu';const h=Math.round(m/60);if(h<24)return h+' h temu';const d=Math.round(h/24);return d===1?'wczoraj':d+' dni temu';
 }

 /* ---------- skrzynka i rozmowy ---------- */
 function niedolaczony(){return '<div class="dolacz-info"><p>Żeby pisać i wysyłać wyzwania, zapisz najpierw swój pseudonim w rankingu (formularz pod tabelą).</p><button type="button" class="klocek" id="do-formularza">Przejdź do formularza</button></div>';}
 function podepnijDolacz(){const b=$('do-formularza');if(b)b.onclick=()=>{zamknij();$('nick').focus();$('publish').scrollIntoView({behavior:'smooth',block:'center'});};}
 async function pokazSkrzynke(){
  otworzArkusz('<div class="ark-glowa"><h2 id="ark-tytul">Wiadomości</h2></div><p class="uwaga">Wczytywanie…</p>');
  if(!Online.dolaczony()){tresc.innerHTML='<div class="ark-glowa"><h2 id="ark-tytul">Wiadomości</h2></div>'+niedolaczony();podepnijDolacz();return;}
  let l;try{l=await Online.skrzynka();}catch(e){tresc.querySelector('.uwaga').textContent=e.message;return;}
  const rozm={};
  for(const m of l){const r=rozm[m.other_id]||(rozm[m.other_id]={id:m.other_id,nick:m.other_nick,ost:m,nowe:0,wyzw:0});if(!m.mine&&!m.read_at){r.nowe++;if(m.kind==='challenge')r.wyzw++;}}
  const lista=Object.values(rozm).sort((a,b)=>new Date(b.ost.created_at)-new Date(a.ost.created_at));
  tresc.innerHTML='<div class="ark-glowa"><h2 id="ark-tytul">Wiadomości</h2></div>'
   +(lista.length?'<ul class="rozmowy">'+lista.map(r=>'<li><button type="button" data-id="'+esc(r.id)+'" data-nick="'+esc(r.nick)+'">'+awatar(r.id,r.nick)+'<span class="r-tekst"><b>'+esc(r.nick)+'</b><small>'+(r.ost.mine?'Ty: ':'')+(r.ost.kind==='challenge'?'⚔️ '+esc(r.ost.body):r.ost.kind==='result'?'🏁 '+esc(r.ost.body):esc(r.ost.body))+'</small></span><span class="r-czas">'+kiedy(r.ost.created_at)+(r.nowe?'<em>'+r.nowe+'</em>':'')+'</span></button></li>').join('')+'</ul>'
    :'<p class="uwaga">Na razie pusto. Stuknij gracza w rankingu, żeby do niego napisać albo wyzwać go na pojedynek.</p>');
  tresc.querySelectorAll('.rozmowy button').forEach(b=>b.onclick=()=>pokazWatek(b.dataset.id,b.dataset.nick));
 }
 const SZYBKIE=['Cześć! 👋','Dobra gra!','Gratulacje! 🏆','Rewanż? ⚔️','Ile masz legendarnych?','Dzięki!'];
 async function pokazWatek(id,nick){
  watek=id;
  otworzArkusz('<div class="ark-glowa"><button type="button" class="wstecz" aria-label="Wróć do wiadomości">‹</button>'+awatar(id,nick)+'<div><h2 id="ark-tytul">'+esc(nick)+'</h2><small><button type="button" class="link" id="w-profil">profil</button> · <a class="link" href="karta-w-ciemno.html?rywal='+encodeURIComponent(id)+'&rn='+encodeURIComponent(nick)+'">wyzwij</a></small></div></div>'
   +'<div class="watek" id="watek"><p class="uwaga">Wczytywanie…</p></div>'
   +(Online.dolaczony()?'<div class="szybkie">'+SZYBKIE.map(t=>'<button type="button">'+esc(t)+'</button>').join('')+'</div><form class="pisz" id="pisz"><input id="pisz-tekst" maxlength="200" placeholder="Napisz wiadomość…" autocomplete="off" aria-label="Treść wiadomości"><button class="klocek" aria-label="Wyślij">➤</button></form>':niedolaczony()));
  podepnijDolacz();
  tresc.querySelector('.wstecz').onclick=pokazSkrzynke;
  $('w-profil').onclick=()=>pokazProfil(id,nick);
  const wyslij=async t=>{
   t=String(t||'').trim();if(!t)return;
   try{await Online.wyslij(id,t);$('pisz-tekst').value='';await rysujWatek(id);}
   catch(e){pokazBlad(e.message);}
  };
  if($('pisz')){$('pisz').onsubmit=e=>{e.preventDefault();wyslij($('pisz-tekst').value);};
   tresc.querySelectorAll('.szybkie button').forEach(b=>b.onclick=()=>wyslij(b.textContent));}
  await rysujWatek(id);
  clearInterval(odswiezanie);odswiezanie=setInterval(()=>{if(watek===id&&!document.hidden)rysujWatek(id);},15000);
 }
 function pokazBlad(t){const w=$('watek');if(!w)return;const p=document.createElement('p');p.className='blad';p.textContent=t;w.append(p);w.scrollTop=w.scrollHeight;setTimeout(()=>p.remove(),5000);}
 async function rysujWatek(id){
  const w=$('watek');if(!w)return;
  if(!Online.dolaczony()){w.innerHTML='';return;}
  let l;try{l=(await Online.skrzynka()).filter(m=>m.other_id===id).reverse();}catch(e){w.innerHTML='<p class="uwaga">'+esc(e.message)+'</p>';return;}
  if(watek!==id)return;
  w.innerHTML=l.length?l.map(dymek).join(''):'<p class="uwaga">Zacznij rozmowę albo wyślij wyzwanie.</p>';
  w.scrollTop=w.scrollHeight;
  if(l.some(m=>!m.mine&&!m.read_at))Online.przeczytane(id).then(licznikNieprzeczytanych).catch(()=>{});
 }
 function dymek(m){
  const kl='dymek '+(m.mine?'moj':'jego')+(m.kind!=='msg'?' specjalny':'');
  const czas='<time>'+kiedy(m.created_at)+'</time>';
  const d=m.payload||{};
  if(m.kind==='challenge'){
   const zostalo=(+d.t||0)+86400000-Date.now(),wazne=zostalo>0&&typeof d.w==='string';
   const ile=wazne?Math.floor(zostalo/3600000)+' h '+Math.floor(zostalo%3600000/60000)+' min':'';
   return '<div class="'+kl+'"><b>⚔️ Wyzwanie: Karta w ciemno</b><span>'+esc(m.body)+'</span>'
    +(m.mine?'<small>'+(wazne?'Czeka na odpowiedź, zostało '+ile:'Wyzwanie wygasło')+'</small>'
     :wazne?'<a class="klocek" href="karta-w-ciemno.html?w='+encodeURIComponent(d.w)+'&od='+encodeURIComponent(m.other_id)+'&on='+encodeURIComponent(m.other_nick)+'">Przyjmij wyzwanie</a><small>Zostało '+ile+'</small>':'<small>Wyzwanie wygasło</small>')+czas+'</div>';
  }
  if(m.kind==='result'){
   return '<div class="'+kl+'"><b>🏁 Wynik pojedynku</b><span>'+esc(m.body)+'</span>'+(typeof d.wynik==='string'&&!m.mine?'<a class="klocek jasny" href="karta-w-ciemno.html?wynik='+encodeURIComponent(d.wynik)+'">Zobacz przebieg</a>':'')+czas+'</div>';
  }
  return '<div class="'+kl+'"><span>'+esc(m.body)+'</span>'+czas+'</div>';
 }
 $('skrzynka').onclick=pokazSkrzynke;

 async function licznikNieprzeczytanych(){
  const n=await Online.nieprzeczytane(),b=$('nieprz');
  b.hidden=!n;b.textContent=n>9?'9+':n;
  try{sessionStorage.setItem('wiad-nieprz',JSON.stringify({n,t:Date.now()}));}catch(e){}
  if(window.ZPNaglowek&&ZPNaglowek.odznaka)ZPNaglowek.odznaka(n);
 }

 /* ---------- start ---------- */
 (async()=>{
  $('local-points').textContent=liczba(Online.points());
  try{await Karty.zaladuj();Karty.migracja();Karty.styl();$('local-cards').textContent=liczba(Karty.zdobyte().mam.size);}catch(e){status.textContent=e.message;}
  const s=await Online.session();$('sign-in').hidden=!!s;$('publish-tytul').textContent=s?'Twój profil':'Twój pseudonim';
  try{const pr=JSON.parse(localStorage.getItem('profil-v1')||'{}');if(pr.nick&&!$('nick').value)$('nick').value=pr.nick;}catch(e){}
  const p=Online.profilLokalny();if(p.nick)$('nick').value=p.nick;$('visible').checked=p.visible!==false;$('dm').checked=p.dm!==false;
  $('skrzynka').hidden=!Online.enabled();
  // gracz już w rankingu: po cichu odśwież wynik i statystyki profilu
  if(Online.enabled()&&Online.dolaczony()){try{await Online.odswiezProfil();}catch(e){}}
  await load();
  licznikNieprzeczytanych();
  // wejście z linku: ranking.html?gracz=<id>&n=<pseudonim> albo ?wiadomosci
  const q=new URLSearchParams(location.search);
  if(q.has('tydzien')){mode='week';load();}
  if(q.has('wiadomosci'))pokazSkrzynke();
  else if(q.get('gracz'))pokazProfil(q.get('gracz'),q.get('n')||'Gracz');
 })();
})();
