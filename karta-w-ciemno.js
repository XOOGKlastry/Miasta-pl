(()=>{'use strict';
 const $=id=>document.getElementById(id),Z=window.CiemnoZasady,escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let data,game,peer,conn,host=false,myIndex=0,net={},roomTimer,hintMode=false;
 const status=s=>$('status').textContent=s,randomSeed=()=>crypto.getRandomValues(new Uint32Array(1))[0];
 function options(){const rk=document.querySelector('[name=rodzaj]:checked');return {rodzaj:rk&&rk.value==='ranking'&&$('mode').value==='ai'&&document.querySelector('[name=deck]:checked').value==='own'?'ranking':'trening',region:$('region').value,equal:document.querySelector('[name=deck]:checked').value==='equal',records:$('record-bonus').checked,level:$('level').value,mode:$('mode').value};}
 function ownDeck(o,seed){return Z.deck(data.g,Karty.zdobyte().mam,o.region,o.equal,Z.seeded(seed),g=>Karty.ulepszenie(g).bonus);}
 const manifest=deck=>deck.map(c=>({k:c.k,bonus:c.bonus,borrowed:c.borrowed}));
 function validateDeck(input,o,seed){if(o.equal)return ownDeck(o,seed);if(!Array.isArray(input)||input.length<Z.TALIA||input.length>data.g.length)throw Error('Nieprawidłowa talia rywala');const seen=new Set();return input.map(c=>{const g=data.PO_K[c.k];if(!g||g.ovr==null||!Karty.komplet(g)||seen.has(c.k)||!Number.isInteger(c.bonus)||c.bonus<0||c.bonus>5)throw Error('Nieprawidłowa karta rywala');seen.add(c.k);return {...g,bonus:c.borrowed?0:c.bonus,borrowed:!!c.borrowed};});}
 function start(o,seed,decks){const rng=Z.seeded(seed);o.records=o.records&&!o.equal;const wspolne=new Set();decks=[decks[0],decks[0]];game={o,seed,decks,round:0,metrics:(m=>{while(m.length&&m.length<Z.RUNDY)m.push(m[m.length%Math.max(1,m.length)]);return m.slice(0,Z.RUNDY);})(Z.shuffle(Z.WSPOLNE.filter(k=>decks[0].filter(c=>c.oc[k]!=null).length>=Z.TALIA),rng)),used:[wspolne,wspolne],totals:[0,0],turn:0,picks:[null,null],hinted:[new Set(),new Set()],over:false};if(o.mode==='wyzwanie'){game.rola=o.cudze?'odbiorca':'nadawca';game.moje=[];game.cudze=o.cudze||null;game.rundy=[];}$('setup').hidden=true;$('wyzwanie-info').hidden=true;$('match').hidden=false;status('');beginRound();}
 function beginRound(){game.picks=[null,null];game.hinted=[new Set(),new Set()];game.turn=game.o.mode==='online'?myIndex:0;net={};hintMode=false;const k=game.metrics[game.round];const lista=Z.rozdaj(game.decks[0],game.used[0],k,Z.seeded(game.seed+game.round*101),game.o.records);lista.forEach(c=>game.used[0].add(c.k));game.candidates=[lista,lista];$('round').textContent='Runda '+(game.round+1)+' / '+Z.RUNDY;$('score').textContent=game.totals.join(' : ');$('metric').textContent=Karty.STATY.find(s=>s.k===k).n;$('reveal').hidden=true;$('next').hidden=true;$('handoff').hidden=true;$('play-area').hidden=false;if(game.o.mode==='local')handoff(0);else render();}
 function handoff(player){$('play-area').hidden=true;$('choices').replaceChildren();$('handoff').hidden=false;$('handoff-text').textContent='Gracz '+(player+1)+' — wybierz kartę, nie pokazując jej rywalowi.';$('ready').onclick=()=>{game.turn=player;$('handoff').hidden=true;$('play-area').hidden=false;render();};}
 function render(){const t=game.turn,k=game.metrics[game.round];$('turn').textContent=game.o.mode==='ai'?'Twój wybór':game.o.mode==='online'?'Twój wybór · pokój ze znajomym':'Gracz '+(t+1)+' wybiera';$('hint').disabled=(+localStorage.getItem('jokery')||0)<1;$('hint-info').textContent=hintMode?'Stuknij kartę, której wskaźnik chcesz odsłonić.':'Stuknij kartę, żeby zobaczyć jej wskaźniki i ją wybrać.';$('hint').innerHTML='<span class="ik">½</span> 50/50 · odsłoń kartę <b>× '+Math.max(0,+localStorage.getItem('jokery')||0)+'</b>';
  // kafelki: od razu widać całą rękę; pełną kartę z wskaźnikami pokazuje dopiero stuknięcie
  const TYP={'gmina miejska':'miasto','gmina wiejska':'wieś','gmina miejsko-wiejska':'miasto i gmina'};
  // karty leżą na stole: widać nazwę, OVR i typ; stuknięcie odwraca kartę i pokazuje jej wskaźniki
  const obrot=[-3,2,-1.5,3,-2.5,1.5,-1,2.5,-2,1];
  $('choices').innerHTML=game.candidates[t].map((c,n)=>{const odsl=game.hinted[t].has(c.k);
    return '<button type="button" class="stol-karta r-'+c.rz+(c.borrowed?' borrowed':'')+(odsl?' revealed':'')+'" style="--obr:'+obrot[n%obrot.length]+'deg" data-podglad="'+c.k+'">'
     +(Karty.herbSrc&&Karty.herbSrc(c)?'<img class="sk-herb" alt="" loading="lazy" onerror="this.remove()" src="'+Karty.herbSrc(c)+'">':'')
     +'<span class="sk-gora"><span class="sk-ovr">'+Z.ovr(c)+'</span><span class="sk-typ">'+(+c.k.slice(2,4)>=61?'MNP':c.typ==='gmina wiejska'?'WIEŚ':c.typ==='gmina miejska'?'MIASTO':'M-W')+'</span></span>'
     +'<b class="sk-nazwa" style="font-size:'+(Math.max(...c.n.split(/[ -]/).map(x=>x.length))>11?11:Math.max(...c.n.split(/[ -]/).map(x=>x.length))>8?13:15)+'px">'+escape(c.n).replace(/-/g,'-<wbr>')+'</b>'
     +'<small class="sk-woj">woj. '+escape(c.woj)+(c.bonus?' · +'+c.bonus:'')+(c.borrowed?' · pożyczona':'')+'</small>'
     +(odsl?'<span class="sk-wart">'+Z.value(c,k,game.o.records)+'</span>':'')+'</button>';}).join('');
  $('choices').querySelectorAll('[data-podglad]').forEach(b=>b.onclick=()=>{b.classList.add('odkrywa');setTimeout(()=>{b.classList.remove('odkrywa');podgladKarty(b.dataset.podglad);},260);});
 }
 function podgladKarty(id){
  const t=game.turn,k=game.metrics[game.round],c=game.candidates[t].find(x=>x.k===id);if(!c)return;
  const odsl=game.hinted[t].has(c.k);
  const d=document.createElement('div');d.className='kwc-podglad';
  d.innerHTML='<div class="kwc-karta">'+Karty.karta(c,{tryb:'pelna',ukryj:k,rowna:true,bezSzczegolow:true})+'</div>'
   +(odsl?'<p class="kwc-odsl">'+escape(Karty.STATY.find(s=>s.k===k).n)+': '+Z.value(c,k,game.o.records)+' pkt · '+Karty.wartosc(c,k)+'</p>':'')
   +'<div class="kwc-przyciski"><button type="button" class="kwc-wroc">‹ Wróć</button>'
   +(hintMode&&!odsl?'<button type="button" class="kwc-odslon">Odsłoń za 1 podpowiedź</button>':'<button type="button" class="kwc-wybierz">Wybieram tę kartę</button>')+'</div>';
  document.body.appendChild(d);
  const el=d.querySelector('.kk');el.querySelector('.kk-ovr').textContent=Z.ovr(c);
  el.querySelectorAll('.kk-st span').forEach(row=>{const stat=Karty.STATY.find(x=>x.k===row.dataset.k);if(stat&&stat.k!==k)row.querySelector('b').textContent=Z.value(c,stat.k,game.o.records)??'—';});
  Karty.podepnijMapy(d);
  const zamknij=()=>d.remove();
  d.onclick=e=>{if(e.target===d||e.target.closest('.kwc-wroc'))zamknij();};
  const w=d.querySelector('.kwc-wybierz');if(w)w.onclick=()=>{zamknij();choose(c.k);};
  const o=d.querySelector('.kwc-odslon');if(o)o.onclick=()=>{zamknij();choose(c.k);};
 }
 function choose(id){const t=game.turn;if(game.over||game.picks[t])return;const c=game.candidates[t].find(x=>x.k===id);if(!c)return;if(hintMode){if(game.hinted[t].has(id)){status('Ta karta jest już odsłonięta.');return;}const n=+localStorage.getItem('jokery')||0;if(n<1)return;localStorage.setItem('jokery',String(n-1));localStorage.setItem('seria-globalna','0');game.hinted[t].add(id);hintMode=false;render();return;}
  game.picks[t]=c;$('choices').querySelectorAll('button').forEach(b=>b.disabled=true);
  if(game.o.mode==='online'){sendCommit(c).catch(fail);return;}
  if(game.o.mode==='local'&&t===0){handoff(1);return;}
  if(game.o.mode==='wyzwanie'){if(game.rola==='nadawca'){game.moje.push(c.k);pokazWyborNadawcy(c);return;}const cudza=game.candidates[1].find(x=>x.k===game.cudze.p[game.round]);if(!cudza){fail(Error('Wyzwanie nie pasuje do tej wersji kart'));return;}game.picks[1]=cudza;}
  if(game.o.mode==='ai')game.picks[1]=Z.ai(game.candidates[1],game.metrics[game.round],game.o.level,Math.random,game.o.records);showResult();
 }
 function rankingHTML(t){const k=game.metrics[game.round],z=[...game.candidates[t]].sort((a,b)=>Z.compare(b,a,k,game.o.records));return '<h3>'+ (game.o.mode==='ai'&&t===1?'Talia komputera':'Ranking wyborów gracza '+(t+1))+'</h3><table><thead><tr><th>Gmina</th><th>Ocena</th><th>Wartość</th></tr></thead><tbody>'+z.map(c=>'<tr class="'+(game.picks[t].k===c.k?'selected':'')+'"><td>'+escape(c.n)+(game.picks[t].k===c.k?' ✓':'')+'</td><td>'+Z.value(c,k,game.o.records)+'</td><td>'+Karty.wartosc(c,k)+'</td></tr>').join('')+'</tbody></table>';}
 function showResult(){if(net.resolved)return;net.resolved=true;const k=game.metrics[game.round],r=Z.resolve(...game.picks,...game.candidates,k,game.o.records);game.picks.forEach((c,i)=>{game.totals[i]+=r.points[i];});zapiszRunde();$('handoff').hidden=true;$('play-area').hidden=true;$('choices').replaceChildren();$('reveal').hidden=false;$('score').textContent=game.totals.join(' : ');$('turn').textContent='Karty odkryte';
  $('reveal').innerHTML='<h2>'+(r.same?'Ta sama karta: remis':r.winner==null?'Remis rundy':game.o.mode==='ai'||game.o.mode==='wyzwanie'?(r.winner===0?'Wygrywasz rundę!':'Rundę wygrywa '+(game.o.mode==='ai'?'komputer':escape(game.cudze.n))):'Rundę wygrywa gracz '+(r.winner+1))+'</h2><div class="round-result">'+game.picks.map((c,i)=>'<div>'+(game.o.mode==='wyzwanie'?(i?escape(game.cudze.n):'Ty'):'Gracz '+(i+1))+'<strong>'+escape(c.n)+'</strong><b>'+r.values[i]+' pkt</b><small>OVR '+Z.ovr(c)+' · '+Karty.wartosc(c,k)+'</small><p>'+(r.points[i]?'+1 do meczu':'bez punktu')+(r.best[i]?' · najlepsza karta w talii!':'')+'</p></div>').join('')+'</div>'+rankingHTML(game.o.mode==='online'?myIndex:0)+(game.o.mode==='local'?'<details><summary>Zobacz wybory gracza 2</summary>'+rankingHTML(1)+'</details>':'');
  $('next').hidden=false;$('next').disabled=false;$('next').textContent=game.round===Z.RUNDY-1?'Wynik meczu →':'Następna runda →';
 }
 function next(){if(game.o.mode==='online'){net.ready=true;conn.send({type:'ready',round:game.round});$('next').disabled=true;$('next').textContent='Czekam na rywala…';if(net.remoteReady)advance();}else advance();}
 function advance(){if(game.round===Z.RUNDY-1){finish();return;}game.round++;beginRound();}
 function finish(){game.over=true;if(game.o.mode==='wyzwanie'){koniecWyzwania();return;}const [a,b]=game.totals;$('round').textContent='Koniec meczu';$('metric').textContent=a===b?'Remis!':game.o.mode==='ai'?(a>b?'Wygrywasz mecz!':'Komputer wygrywa mecz'):'Wygrywa gracz '+(a>b?1:2);$('turn').textContent='Wynik końcowy '+a+' : '+b+'. ';$('next').hidden=true;nagrody(a,b);$('reveal').insertAdjacentHTML('beforeend','<a class="klocek" href="karta-w-ciemno.html">Zagraj jeszcze raz</a>');}
 // gra rankingowa: monety (5 za wygraną, 2 za remis, 1 za przegraną), punkty rankingu pojedynków i szansa na paczkę
 /* ---- wyzwanie dla znajomego: najpierw grasz Ty, znajomy ma 24 godziny na odpowiedź ---- */
 const DOBA=24*3600*1000;
 // UTF-8 ⇄ base64url bez globalnych escape/unescape (tu „escape” to funkcja HTML)
 const b64=o=>{let t='';new TextEncoder().encode(JSON.stringify(o)).forEach(x=>t+=String.fromCharCode(x));return btoa(t).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');};
 const z64=s=>JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0))));
 function mojNick(){try{const p=JSON.parse(localStorage.getItem('profil-v1')||'{}');return (p.nick||localStorage.getItem('nick')||'Znajomy').slice(0,24);}catch(e){return 'Znajomy';}}
 function pokazWyborNadawcy(c){
  $('play-area').hidden=true;$('choices').replaceChildren();$('reveal').hidden=false;$('turn').textContent='Wybór zapisany';
  $('reveal').innerHTML='<h2>Wybrałeś: '+escape(c.n)+'</h2><p class="nagroda-info">Wynik tej rundy zobaczysz, gdy znajomy odpowie na wyzwanie.</p>';
  $('next').hidden=false;$('next').disabled=false;$('next').textContent=game.round===Z.RUNDY-1?'Zakończ i wyślij wyzwanie →':'Następna runda →';
 }
 async function udostepnij(url,tekst){
  try{if(navigator.share){await navigator.share({title:'Karta w ciemno',text:tekst,url});return;}}catch(e){}
  try{await navigator.clipboard.writeText(url);status('Link skopiowany. Wyślij go znajomemu.');}catch(e){prompt('Skopiuj link:',url);}
 }
 function koniecWyzwania(){
  $('next').hidden=true;$('round').textContent='Koniec meczu';
  if(game.rola==='nadawca'){
   const dane={v:1,e:data.edycja,s:game.seed,o:{region:game.o.region,equal:!!game.o.equal},d:manifest(game.decks[0]),p:game.moje,n:mojNick(),t:Date.now()};
   const url=location.origin+location.pathname+'?w='+b64(dane);
   $('metric').textContent='Wyzwanie gotowe!';$('turn').textContent='';
   $('reveal').innerHTML='<h2>Wyślij wyzwanie znajomemu</h2><p class="nagroda-info">Znajomy zagra te same rundy z tymi samymi kartami. Ma <b>24 godziny</b> na odpowiedź. Gdy skończy, odeśle Ci link z wynikiem.</p><button class="klocek" id="wyslij">Wyślij link</button><a class="klocek" href="karta-w-ciemno.html" style="background:var(--krem)">Nowa gra</a>';
   $('wyslij').onclick=()=>udostepnij(url,mojNick()+' wyzywa Cię na pojedynek w Karcie w ciemno! Masz 24 godziny.');
   return;
  }
  const [a,b]=game.totals,n=escape(game.cudze.n);
  $('metric').textContent=a===b?'Remis!':a>b?'Wygrywasz z '+n+'!':n+' wygrywa';$('turn').textContent='Wynik końcowy '+a+' : '+b+'.';
  const wynik={v:1,n:game.cudze.n,o:mojNick(),a:b,b:a,r:game.rundy,t:Date.now()};
  const url=location.origin+location.pathname+'?wynik='+b64(wynik);
  $('reveal').insertAdjacentHTML('beforeend','<p class="nagroda-info">Odeślij wynik, żeby '+n+' zobaczył, jak poszło.</p><button class="klocek" id="odeslij">Odeślij wynik</button><a class="klocek" href="karta-w-ciemno.html" style="background:var(--krem)">Zagraj własne wyzwanie</a>');
  $('odeslij').onclick=()=>udostepnij(url,'Odpowiedziałem na Twoje wyzwanie w Karcie w ciemno: '+b+' : '+a+'.');
 }
 // zapis przebiegu rund u odbiorcy (do linku z wynikiem)
 function zapiszRunde(){if(game&&game.o.mode==='wyzwanie'&&game.rola==='odbiorca'&&game.picks[0]&&game.picks[1]){const k=game.metrics[game.round];game.rundy[game.round]={m:Karty.STATY.find(s=>s.k===k).n,a:game.picks[1].n,av:Z.value(game.picks[1],k),b:game.picks[0].n,bv:Z.value(game.picks[0],k)};}}
 function wejscieZLinku(){
  const q=new URLSearchParams(location.search),box=$('wyzwanie-info');
  if(q.get('wynik')){
   try{const w=z64(q.get('wynik'));
    box.innerHTML='<h2>'+escape(w.o)+' odpowiedział na Twoje wyzwanie</h2><p class="wynik-duzy">Ty '+w.a+' : '+w.b+' '+escape(w.o)+'</p><p>'+(w.a>w.b?'Wygrywasz!':w.a<w.b?escape(w.o)+' wygrywa.':'Remis!')+'</p><table><thead><tr><th>Wskaźnik</th><th>Ty</th><th>'+escape(w.o)+'</th></tr></thead><tbody>'+(w.r||[]).map(r=>'<tr><td>'+escape(r.m)+'</td><td class="'+(r.av>r.bv?'lepsza':'')+'">'+escape(r.a)+' · '+r.av+'</td><td class="'+(r.bv>r.av?'lepsza':'')+'">'+escape(r.b)+' · '+r.bv+'</td></tr>').join('')+'</tbody></table>';
    box.hidden=false;}catch(e){status('Nie udało się odczytać wyniku.');}
   return;
  }
  if(!q.get('w'))return;
  let w;try{w=z64(q.get('w'));}catch(e){status('Nieprawidłowy link wyzwania.');return;}
  const zostalo=w.t+DOBA-Date.now();
  if(zostalo<=0){box.innerHTML='<h2>Wyzwanie wygasło</h2><p>'+escape(w.n)+' czekał 24 godziny. Wyślij mu własne wyzwanie!</p>';box.hidden=false;return;}
  const h=Math.floor(zostalo/3600000),m=Math.floor(zostalo%3600000/60000);
  box.innerHTML='<h2>'+escape(w.n)+' wyzywa Cię na pojedynek!</h2><p>Zagrasz te same 5 rund z tymi samymi kartami. Po każdej rundzie zobaczysz, co wybrał '+escape(w.n)+'.</p><p class="licznik-czasu">Zostało '+h+' h '+m+' min</p>'+(w.e!==data.edycja?'<p class="ostrzezenie">Uwaga: dane kart zmieniły się od wysłania wyzwania, oceny mogą się trochę różnić.</p>':'')+'<button class="klocek" id="przyjmij">Przyjmij wyzwanie</button>';
  box.hidden=false;$('setup').hidden=true;
  $('przyjmij').onclick=()=>{try{const o={mode:'wyzwanie',rodzaj:'trening',region:w.o.region,equal:!!w.o.equal,records:false,level:'normal',cudze:{n:w.n,p:w.p}};start(o,w.s,[validateDeck(w.d,o,w.s)]);}catch(e){fail(e);}};
 }
 function nagrody(a,b){
  if(game.o.rodzaj!=='ranking'){$('reveal').insertAdjacentHTML('beforeend','<p class="nagroda-info">Trening: bez nagród i bez punktów rankingu.</p>');return;}
  const w=a>b?'wygrana':a<b?'przegrana':'remis',N=Z.NAGRODY[w];
  let r={pkt:0,w:0,r:0,p:0};try{r=Object.assign(r,JSON.parse(localStorage.getItem('ciemno-ranking')||'{}'));}catch(e){}
  r.pkt=Math.max(0,r.pkt+N.pkt);r[w==='wygrana'?'w':w==='remis'?'r':'p']++;
  const paczka=Math.random()<N.paczka,monety=N.monety+(paczka?25:0);
  try{localStorage.setItem('ciemno-ranking',JSON.stringify(r));localStorage.setItem('karty-zetony',String((+localStorage.getItem('karty-zetony')||0)+monety));}catch(e){}
  $('reveal').insertAdjacentHTML('beforeend','<div class="nagroda-info"><b>Gra rankingowa: '+w+'</b><span>🪙 +'+N.monety+' monet</span><span>🏆 '+(N.pkt>0?'+':'')+N.pkt+' pkt rankingu (razem '+r.pkt+')</span>'
   +(paczka?'<span class="paczka-drop">🎁 Wylosowana paczka! Otwórz ją w albumie kart.</span>':'')+'<small>Bilans: '+r.w+' wygranych · '+r.r+' remisów · '+r.p+' przegranych</small></div>');
 }
 $('hint').onclick=()=>{hintMode=!hintMode;render();};$('next').onclick=next;
 $('mode').onchange=()=>{const m=$('mode').value;document.querySelectorAll('[name=rodzaj]').forEach(x=>{x.disabled=m!=='ai';});if(m!=='ai')document.querySelector('[name=rodzaj][value=trening]').checked=true;$('level-label').hidden=m!=='ai';$('room').hidden=m!=='online';$('start').hidden=m==='online';};
 $('start-form').onsubmit=e=>{e.preventDefault();try{const o=options(),seed=randomSeed(),a=ownDeck(o,seed),b=o.equal?a.map(c=>({...c})):o.mode==='local'?ownDeck(o,seed):Z.shuffle(data.g.filter(c=>c.ovr!=null&&Karty.komplet(c)),Z.seeded(seed+1)).slice(0,Math.max(12,a.length)).map(c=>({...c,bonus:0,borrowed:false}));start(o,seed,[a,b]);}catch(e){fail(e);}};
 function fail(e){status(e.message||String(e));$('room-info').textContent=e.message||String(e);}
 function closeRoom(){clearTimeout(roomTimer);conn?.close();peer?.destroy();conn=null;peer=null;$('cancel-room').hidden=true;$('room-info').textContent='Pokój zamknięty.';}
 function timeout(){clearTimeout(roomTimer);roomTimer=setTimeout(()=>{if(!game?.over)status('Nie udało się połączyć lub rywal nie odpowiada. Możesz zakończyć mecz i utworzyć nowy pokój.');},45000);}
 function attach(c){conn=c;conn.on('open',()=>{timeout();if(!host)conn.send({type:'hello',version:1,edition:data.edycja});});conn.on('error',fail);conn.on('close',()=>{clearTimeout(roomTimer);status('Rywal opuścił pokój. Mecz został przerwany.');if(game&&!game.over){game.over=true;$('play-area').hidden=true;$('next').hidden=true;}});conn.on('data',m=>{Promise.resolve(receive(m)).catch(e=>{fail(e);conn.close();});});}
 async function hash(s){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s))),x=>x.toString(16).padStart(2,'0')).join('');}
 async function sendCommit(c){net.nonce=Array.from(crypto.getRandomValues(new Uint32Array(4))).join('-');net.choice=c.k;net.commit=await hash(game.round+':'+c.k+':'+net.nonce);conn.send({type:'commit',round:game.round,hash:net.commit});status('Wybór zapisany. Czekam na rywala…');timeout();await maybeReveal();}
 async function maybeReveal(){if(net.commit&&net.remoteCommit&&!net.sent){net.sent=true;conn.send({type:'reveal',round:game.round,k:net.choice,nonce:net.nonce});}}
 async function receive(m){if(!m||typeof m!=='object')throw Error('Nieprawidłowa wiadomość');
  if(m.type==='hello'&&host&&!game){if(m.version!==1||m.edition!==data.edycja)throw Error('Gracze mają różne wersje danych. Odświeżcie grę.');const o=options();o.mode='online';const seed=randomSeed();net.offer={o,seed,own:ownDeck(o,seed)};conn.send({type:'offer',o,seed,deck:manifest(net.offer.own),edition:data.edycja});return;}
  if(m.type==='offer'&&!host&&!game){if(m.edition!==data.edycja||!Number.isInteger(m.seed)||!m.o||m.o.mode!=='online'||!data.g.some(g=>g.woj===m.o.region)||typeof m.o.equal!=='boolean')throw Error('Nieprawidłowe ustawienia pokoju');const a=validateDeck(m.deck,m.o,m.seed),b=ownDeck(m.o,m.seed);conn.send({type:'deck',deck:manifest(b)});myIndex=1;start(m.o,m.seed,[a,b]);clearTimeout(roomTimer);return;}
  if(m.type==='deck'&&host&&!game&&net.offer){const {o,seed,own}=net.offer,b=validateDeck(m.deck,o,seed);myIndex=0;start(o,seed,[own,b]);clearTimeout(roomTimer);return;}
  if(!game||game.over||m.round!==game.round)return;
  if(m.type==='commit'){if(net.remoteCommit||!(/^[a-f0-9]{64}$/.test(m.hash)))throw Error('Nieprawidłowe zatwierdzenie wyboru');net.remoteCommit=m.hash;await maybeReveal();return;}
  if(m.type==='reveal'){if(!net.commit||!net.remoteCommit||net.remoteChoice||typeof m.nonce!=='string'||m.nonce.length>100)throw Error('Nieprawidłowe odkrycie karty');if(await hash(game.round+':'+m.k+':'+m.nonce)!==net.remoteCommit)throw Error('Rywal zmienił zatwierdzoną kartę');const c=game.candidates[1-myIndex].find(c=>c.k===m.k);if(!c)throw Error('Rywal wybrał niedostępną kartę');net.remoteChoice=m.k;game.picks[1-myIndex]=c;clearTimeout(roomTimer);status('');showResult();return;}
  if(m.type==='ready'&&net.resolved){net.remoteReady=true;if(net.ready)advance();}
 }
 $('create-room').onclick=()=>{closeRoom();host=true;myIndex=0;peer=new Peer('pz-ciemno-'+Array.from(crypto.getRandomValues(new Uint8Array(5)),x=>(x%36).toString(36)).join(''));peer.on('open',id=>{$('room-info').textContent='Kod pokoju: '+id.replace('pz-ciemno-','')+' · czekam na drugą osobę';$('cancel-room').hidden=false;});peer.on('connection',c=>{if(conn){c.close();return;}attach(c);});peer.on('error',fail);timeout();};
 $('join-room').onclick=()=>{const code=$('room-code').value.trim().toLowerCase();if(!/^[a-z0-9]{5}$/.test(code)){fail(Error('Wpisz pięcioznakowy kod pokoju.'));return;}closeRoom();host=false;peer=new Peer();peer.on('open',()=>attach(peer.connect('pz-ciemno-'+code,{reliable:true})));peer.on('error',fail);$('cancel-room').hidden=false;timeout();};$('cancel-room').onclick=closeRoom;window.addEventListener('pagehide',closeRoom);
 Karty.styl();Karty.zaladuj().then(d=>{data=d;Karty.migracja();$('region').innerHTML=[...new Set(d.g.map(g=>g.woj))].sort((a,b)=>a.localeCompare(b,'pl')).map(w=>'<option>'+escape(w)+'</option>').join('');try{const mam=Karty.zdobyte().mam,ile={};d.g.forEach(g=>{if(mam.has(g.k))ile[g.woj]=(ile[g.woj]||0)+1;});const naj=Object.keys(ile).sort((x,y)=>ile[y]-ile[x])[0];if(naj)$('region').value=naj;}catch(e){}$('setup').hidden=false;$('mode').onchange&&$('mode').onchange();wejscieZLinku();$('start').disabled=false;status('');}).catch(fail);
})();
