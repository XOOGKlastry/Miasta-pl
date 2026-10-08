/* Walka na żywo w silniku pytań (wyzwanie.html?tryb=walka&mecz=ID).
   Stan meczu trzyma serwer (Supabase): kiedy zaczyna się runda, ile kto miał czasu i ile zadał obrażeń.
   Telefon tylko odpytuje stan co ~0,6 s i pokazuje pytania zbudowane z tego samego ziarna u obu graczy.
   Korzysta z funkcji silnika z wyzwanie.html: laduj, pytaniaZKonfig, nastepne, czasMinal, lobby, st, Q, KONFIG. */
window.Walka=(()=>{
 'use strict';
 const ID=new URLSearchParams(location.search).get('mecz');
 const NAGRODA={wygrana:5,remis:2,przegrana:1};   // monety za walkę, poza punktami za każdą dobrą odpowiedź
 const TRYBY={quiz:{nazwa:'Quiz na żywo',ikona:'⚔️'},mapa:{nazwa:'Wyścig na mapie',ikona:'📍'}};
 const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let S=null,off=0,offOk=false,runda=-1,wyslana=-1,przerobione=0,dane=false,pytania=false,stop=false,petla=null,koniecPokazany=false,ostatnioOdp=-1;
 const teraz=()=>Date.now()+off,czasMs=t=>new Date(t).getTime();
 const ja=()=>S?S.slot:0,on=()=>S?1-S.slot:1;
 const nick=k=>S?(k===0?S.nick_a:S.nick_b):'';
 const hp=k=>S?(k===0?S.hp_a:S.hp_b):100;

 function styl(){
  if(document.getElementById('walka-styl'))return;
  const s=document.createElement('style');s.id='walka-styl';
  s.textContent=`
.walka-hp{flex:none;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:8px;padding:8px 10px;background:#FFF6E0;border:3px solid #3A2A14;border-radius:16px;box-shadow:0 4px 0 #3A2A14;color:#3A2A14;font-family:Rubik,system-ui,sans-serif}
.walka-hp .gr{min-width:0}
.walka-hp .gr.on{text-align:right}
.walka-hp .gr b{display:block;font-size:14px;font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.walka-hp .gr small{font-size:11px;font-weight:700;color:#5A4A2F}
.walka-hp .bar{position:relative;height:16px;margin-top:4px;border-radius:999px;background:#F3E6C4;border:2px solid #3A2A14;overflow:hidden}
.walka-hp .bar i{position:absolute;top:0;bottom:0;left:0;background:linear-gradient(180deg,#5FD08F,#27AE60);transition:width .6s cubic-bezier(.3,1.2,.4,1),background .4s}
.walka-hp .gr.on .bar i{left:auto;right:0}
.walka-hp .bar i.nisko{background:linear-gradient(180deg,#FFD36B,#F5B82E)}.walka-hp .bar i.krytycznie{background:linear-gradient(180deg,#F27A6E,#E84A3C)}
.walka-hp .bar span{position:absolute;inset:0;display:grid;place-items:center;font-size:10px;font-weight:900;color:#3A2A14}
.walka-hp .vs{font-family:Bungee,sans-serif;color:#E84A3C;font-size:18px;text-align:center}
.walka-hp .poddaj{display:block;margin:2px auto 0;background:none;border:none;color:#5A4A2F;font:700 11px Rubik,sans-serif;text-decoration:underline;cursor:pointer;padding:4px}
.walka-hp .gr.trafiony{animation:wTraf .45s}
@keyframes wTraf{20%{transform:translateX(-5px)}40%{transform:translateX(5px)}60%{transform:translateX(-3px)}80%{transform:translateX(2px)}}
.walka-obr{position:fixed;z-index:950;font-family:Bungee,sans-serif;font-size:26px;color:#E84A3C;-webkit-text-stroke:1.5px #3A2A14;pointer-events:none;animation:wObr 1.2s ease-out forwards}
@keyframes wObr{from{transform:translateY(0) scale(.6);opacity:0}20%{transform:translateY(-10px) scale(1.15);opacity:1}to{transform:translateY(-50px) scale(1);opacity:0}}
.walka-wynik-rundy{margin-top:6px;font-size:14px;font-weight:700;color:#3A2A14}
.walka-wynik-rundy b{color:#E84A3C}
.walka-wynik-rundy small{font-weight:700;color:#5A4A2F}
.walka-odliczanie{font-family:Bungee,sans-serif;font-size:96px;text-align:center;color:#F5B82E;-webkit-text-stroke:3px #3A2A14;line-height:1;animation:wOdl .9s infinite}
@keyframes wOdl{from{transform:scale(1.3);opacity:.4}to{transform:scale(1);opacity:1}}
.walka-ekran{text-align:center;display:flex;flex-direction:column;gap:14px;background:#FFF6E0;border:4px solid #3A2A14;border-radius:22px;box-shadow:0 6px 0 #3A2A14;padding:18px 14px;color:#3A2A14;font-family:Rubik,system-ui,sans-serif}
.walka-ekran h2{margin:0;font:400 20px/1.2 Bungee,sans-serif;color:#3A2A14}
.walka-ekran p{margin:0;font-weight:700;color:#5A4A2F}
.walka-ekran .duzy{font-family:Bungee,sans-serif;font-size:clamp(30px,10vw,46px);color:#F5B82E;-webkit-text-stroke:2px #3A2A14;line-height:1.1}
.walka-ekran .rywale{display:flex;align-items:center;justify-content:center;gap:12px;font-weight:900;flex-wrap:wrap}
.walka-ekran .rywale span{font-family:Bungee,sans-serif;color:#E84A3C;font-size:20px}
.walka-ekran .elo{font-size:15px}.walka-ekran .elo b{color:#1E8A4C}.walka-ekran .elo b.minus{color:#C0392B}
.walka-ekran .klocki{display:grid;gap:10px}
.walka-ekran a.big,.walka-ekran button.big{text-decoration:none;display:grid;place-items:center}
#stage .mp-dymek{background:#3A2A14!important;color:#FFF6E0!important;border-color:#F5B82E!important;font-weight:700}
#zp-joker{display:none!important}
#wpis{display:none!important}
@media (prefers-reduced-motion:reduce){.walka-hp .gr.trafiony,.walka-obr,.walka-odliczanie{animation:none}}`;
  document.head.appendChild(s);
 }

 function paski(){
  let el=document.getElementById('walkaHp');
  if(!el){el=document.createElement('div');el.className='walka-hp hidden';el.id='walkaHp';const seg=document.getElementById('segmenty');seg.parentNode.insertBefore(el,seg);}
  const r=k=>S?(k===0?S.rating_a:S.rating_b):1000;
  const gr=(k,kl)=>{const h=Math.max(0,hp(k));return '<div class="gr '+kl+'" data-k="'+k+'"><b>'+esc(nick(k))+(k===ja()?' (Ty)':'')+'</b><small>'+r(k)+' pkt rankingu</small><div class="bar"><i class="'+(h<=25?'krytycznie':h<=50?'nisko':'')+'" style="width:'+h+'%"></i><span>'+h+' ❤</span></div></div>';};
  el.innerHTML=gr(ja(),'ja')+'<div><div class="vs">VS</div><button type="button" class="poddaj" id="walkaPoddaj">poddaj</button></div>'+gr(on(),'on');
  document.getElementById('walkaPoddaj').onclick=poddaj;
 }
 function cios(k,ile){
  if(!ile)return;
  const g=document.querySelector('#walkaHp .gr[data-k="'+k+'"]');if(!g)return;
  g.classList.remove('trafiony');void g.offsetWidth;g.classList.add('trafiony');
  const r=g.querySelector('.bar').getBoundingClientRect(),d=document.createElement('div');
  d.className='walka-obr';d.textContent='−'+ile;d.style.left=(r.left+r.width/2-20)+'px';d.style.top=(r.top-6)+'px';
  document.body.appendChild(d);setTimeout(()=>d.remove(),1300);
  if(k===ja()&&navigator.vibrate)try{navigator.vibrate([40,30,60]);}catch(e){}
 }

 function ekran(html){lobby('<div class="walka-ekran">'+html+'</div>');const p=document.getElementById('walkaHp');if(p)p.classList.add('hidden');}
 const wrocKlocki='<div class="klocki"><a class="big" href="ranking.html">Ranking</a><a class="ghost big" href="gry.html">Inne gry</a></div>';

 async function poddaj(){
  if(!S||S.status!=='live'||!confirm('Poddać walkę? Przegrana liczy się do rankingu.'))return;
  try{await Online.walka.opusc(ID);}catch(e){}
  odpytaj();
 }
 async function anuluj(){try{await Online.walka.opusc(ID);}catch(e){}location.href='ranking.html';}

 // pytania z ziarna meczu: obaj gracze dostają dokładnie te same
 function zbudujPytania(){
  if(pytania||!dane||!S)return;
  const quiz=S.mode!=='mapa',typy=quiz?['h','t','v','w','r','s','p','c','z','k']:['g'];
  KONFIG={preset:'',gry:typy.map(t=>({t,ile:quiz?3:S.max+4})),kolej:'losowo',czas:S.czas,podp:true,premia:false,wielk:'ds',obszar:[]};
  Q=pytaniaZKonfig(KONFIG,ZP.seeded('walka-'+S.seed));
  st={i:-1,res:[]};
  document.getElementById('segmenty').innerHTML=Array.from({length:S.max},()=>'<i></i>').join('');
  pytania=true;
 }

 function startRundy(r){
  if(!pytania)return;
  runda=r;wyslana=-1;
  ['segmenty','gora','pytanie','stage'].forEach(id=>document.getElementById(id).classList.remove('hidden'));
  document.getElementById('lobby').classList.add('hidden');
  document.getElementById('walkaHp').classList.remove('hidden');
  const zostalo=czasMs(S.round_start)+S.czas*1000-teraz();
  KONFIG.czas=Math.max(3,Math.round(zostalo/1000));
  st.i=r-1;nastepne();
  document.getElementById('runda').textContent='runda '+(r+1)+' / '+S.max;
 }

 // silnik zgłasza odpowiedź (także „czas minął” jako 0 pkt)
 function odpowiedz(i,pts){
  if(i!==runda||wyslana===i)return;wyslana=i;
  const s=document.getElementById('mpStan');if(s)s.textContent='Czekam na '+nick(on())+'…';
  Online.walka.strzal(ID,i,pts).then(przyjmij).catch(e=>{const s=document.getElementById('mpStan');if(s)s.textContent='Problem z połączeniem: '+e.message;});
 }

 function wynikRundy(w){
  const mojeObr=ja()===0?w.da:w.db,jegoObr=ja()===0?w.db:w.da,mojePkt=ja()===0?w.pa:w.pb,jegoPkt=ja()===0?w.pb:w.pa,mojeMs=ja()===0?w.ma:w.mb,jegoMs=ja()===0?w.mb:w.ma;
  cios(on(),jegoObr);cios(ja(),mojeObr);
  if(w.r===runda&&!st.odp){wyslana=runda;czasMinal(true);}
  const sek=ms=>(ms/1000).toFixed(1).replace('.',',')+' s';
  const opis=S.mode==='mapa'
   ?'Ty <b>'+mojePkt+'</b> pkt · '+esc(nick(on()))+' <b>'+jegoPkt+'</b> pkt'
   :'Ty '+(mojePkt>=500?'✔ '+sek(mojeMs):'✘')+' · '+esc(nick(on()))+' '+(jegoPkt>=500?'✔ '+sek(jegoMs):'✘');
  const kto=jegoObr?'Zadajesz <b>'+jegoObr+'</b> obrażeń!':mojeObr?esc(nick(on()))+' trafia Cię za <b>'+mojeObr+'</b>':'Remis w tej rundzie';
  const s=document.getElementById('mpStan');
  if(s&&w.r===runda)s.innerHTML='<div class="walka-wynik-rundy">'+kto+'<br><small>'+opis+'</small></div>';
  const seg=document.getElementById('segmenty').children[w.r];if(seg)seg.className=jegoObr?'g':mojeObr?'r':'y';
 }

 function przyjmij(s){
  if(!s||stop)return;
  const poprz=S;S=s;
  if(!poprz||poprz.status!==s.status)paski();
  zbudujPytania();
  if(s.status==='invited'){
   const zostalo=Math.max(0,Math.round((czasMs(s.created_at)+60000-teraz())/1000));
   if(ja()===0){ekran('<h2>'+TRYBY[s.mode].ikona+' '+TRYBY[s.mode].nazwa+'</h2><p>Zaproszenie wysłane do <b>'+esc(s.nick_b)+'</b>.</p><div class="walka-odliczanie" style="font-size:64px">'+zostalo+'</div><p class="datastate">Czekam na odpowiedź… Gdy przyjmie, walka zacznie się od razu.</p><button class="ghost big" id="walkaAnuluj">Anuluj</button>');
    document.getElementById('walkaAnuluj').onclick=anuluj;}
   else ekran('<h2>Łączę z walką…</h2>');
   return;
  }
  if(['declined','expired','cancelled'].includes(s.status)){
   stop=true;
   const t={declined:esc(nick(on()))+' odrzucił zaproszenie.',expired:esc(nick(on()))+' nie odpowiedział w ciągu minuty.',cancelled:'Walka została anulowana.'}[s.status];
   ekran('<h2>Nie tym razem</h2><p>'+t+'</p><p class="datastate">Możesz wysłać mu wyzwanie na 24 godziny albo napisać wiadomość w rankingu.</p>'+wrocKlocki);
   return;
  }
  // wyniki nowych rund: obrażenia i podsumowanie
  const rr=s.rounds||[];
  for(;przerobione<rr.length;przerobione++)wynikRundy(rr[przerobione]);
  paskiBezAnimacji();
  if(s.status==='done'){stop=true;setTimeout(koniec,runda>=0?2600:0);return;}
  // druga strona już odpowiedziała
  if(s.answered&&s.answered.includes(on())&&ostatnioOdp!==s.round&&s.round===runda&&!st.odp){
   ostatnioOdp=s.round;
   const d=document.createElement('div');d.className='mp-dymek';d.textContent='⚡ '+nick(on())+' już odpowiedział';
   document.getElementById('stage').appendChild(d);setTimeout(()=>d.remove(),1900);
   if(navigator.vibrate)try{navigator.vibrate(25);}catch(e){}
  }
  const start=czasMs(s.round_start);
  if(s.round!==runda&&teraz()>=start)startRundy(s.round);
  else if(s.round!==runda&&runda<0){
   const n=Math.max(1,Math.ceil((start-teraz())/1000));
   ekran('<h2>'+TRYBY[s.mode].ikona+' '+TRYBY[s.mode].nazwa+'</h2><div class="rywale"><b>'+esc(nick(ja()))+'</b><span>VS</span><b>'+esc(nick(on()))+'</b></div><div class="walka-odliczanie">'+(pytania?n:'…')+'</div><p class="datastate">'+(pytania?(S.mode==='mapa'?'Klikaj na mapie jak najbliżej. Bliższy strzał zabiera życie rywalowi.':'Odpowiadaj szybciej i lepiej niż rywal. Dobra odpowiedź zabiera mu życie.'):'Wczytuję pytania…')+'</p>');
  }
 }
 function paskiBezAnimacji(){
  [0,1].forEach(k=>{const g=document.querySelector('#walkaHp .gr[data-k="'+k+'"]');if(!g)return;const h=Math.max(0,hp(k)),i=g.querySelector('.bar i');
   i.style.width=h+'%';i.className=h<=25?'krytycznie':h<=50?'nisko':'';g.querySelector('.bar span').textContent=h+' ❤';});
 }

 function koniec(){
  if(koniecPokazany)return;koniecPokazany=true;
  const w=S.winner,moj=ja(),wynik=w==null?'remis':w===moj?'wygrana':'przegrana';
  const delta=moj===0?S.delta_a:S.delta_b,rating=(moj===0?S.rating_a:S.rating_b);
  // monety raz za mecz
  let zapis={};try{zapis=JSON.parse(localStorage.getItem('walka-nagrody')||'{}');}catch(e){}
  if(!zapis[ID]){zapis[ID]=wynik;try{localStorage.setItem('walka-nagrody',JSON.stringify(zapis));}catch(e){}ZP.zeton(NAGRODA[wynik]);}
  const poddal=S.forfeit!=null?(S.forfeit===moj?'Poddałeś walkę.':esc(nick(on()))+' poddał walkę.'):'';
  ekran('<div class="duzy">'+(wynik==='wygrana'?'Wygrywasz!':wynik==='remis'?'Remis!':'Przegrywasz')+'</div>'
   +'<div class="rywale"><b>'+esc(nick(moj))+' '+Math.max(0,hp(moj))+' ❤</b><span>:</span><b>'+Math.max(0,hp(on()))+' ❤ '+esc(nick(on()))+'</b></div>'
   +(poddal?'<p>'+poddal+'</p>':'')
   +'<p class="elo">Ranking pojedynków: <b class="'+(delta<0?'minus':'')+'">'+(delta>0?'+':'')+(delta||0)+'</b> → '+rating+' pkt</p>'
   +'<p class="datastate">🪙 +'+NAGRODA[wynik]+' monet za walkę, do tego punkty za każdą dobrą odpowiedź.</p>'
   +'<div id="walkaRewanzInfo"></div>'
   +'<div class="klocki"><button class="big" id="walkaRewanz">Rewanż</button><a class="ghost big" href="ranking.html?gracz='+encodeURIComponent(moj===0?S.b:S.a)+'&n='+encodeURIComponent(nick(on()))+'">Profil i wiadomości</a><a class="ghost big" href="ranking.html">Ranking</a></div>');
  if(wynik==='wygrana')setTimeout(ZP.fanfary,300);
  document.getElementById('walkaRewanz').onclick=async e=>{
   const b=e.target;b.disabled=true;b.textContent='Wysyłam…';
   try{const id=await Online.walka.zapros(moj===0?S.b:S.a,S.mode,'w1');location.href='wyzwanie.html?tryb=walka&mecz='+encodeURIComponent(id);}
   catch(err){b.disabled=false;b.textContent='Rewanż';document.getElementById('walkaRewanzInfo').innerHTML='<p class="datastate">'+esc(err.message)+'</p>';}
  };
  // rywal może od razu zaproponować rewanż: sprawdzamy zaproszenia na tym ekranie
  const sprawdz=async()=>{
   if(!document.getElementById('walkaRewanzInfo'))return;
   try{const p=await Online.walka.ping(),z=(p&&p.invites||[])[0];
    if(z){document.getElementById('walkaRewanzInfo').innerHTML='<p><b>'+esc(z.nick)+'</b> chce rewanżu!</p><button class="big" id="walkaPrzyjmij">Przyjmij rewanż</button>';
     document.getElementById('walkaPrzyjmij').onclick=async()=>{try{await Online.walka.odpowiedz(z.id,true);location.href='wyzwanie.html?tryb=walka&mecz='+encodeURIComponent(z.id);}catch(e){alert(e.message);}};return;}
   }catch(e){}
   setTimeout(sprawdz,4000);
  };
  setTimeout(sprawdz,3000);
 }

 async function odpytaj(){
  clearTimeout(petla);if(stop)return;
  const t0=Date.now();
  try{
   const s=await Online.walka.stan(ID),t1=Date.now();
   // przesunięcie zegara: najlepszy pomiar z najkrótszym czasem odpowiedzi
   const rtt=t1-t0,o=czasMs(s.now)-(t0+rtt/2);
   if(!offOk||rtt<odpytaj.rtt){off=o;odpytaj.rtt=rtt;offOk=true;}
   try{przyjmij(s);}catch(e){console.error('Walka:',e);}
  }catch(e){
   if(/takiej walki|pseudonim/i.test(e.message)){stop=true;ekran('<h2>Nie można dołączyć</h2><p>'+esc(e.message)+'</p>'+wrocKlocki);return;}
  }
  if(!stop)petla=setTimeout(odpytaj,document.hidden?2000:(S&&S.status==='invited'?1000:600));
 }
 odpytaj.rtt=1e9;

 async function start(){
  styl();
  document.getElementById('tytul').textContent='⚔️';document.title='Walka na żywo · PolskoZnawca';
  if(!ID){ekran('<h2>Brak walki</h2><p>Wyzwij kogoś z rankingu.</p>'+wrocKlocki);return;}
  if(!window.Online||!Online.enabled()){ekran('<h2>Brak połączenia</h2><p>Walki na żywo wymagają internetu.</p>'+wrocKlocki);return;}
  if(!Online.dolaczony()){ekran('<h2>Najpierw ranking</h2><p>Zapisz swój pseudonim w rankingu, żeby walczyć.</p>'+wrocKlocki);return;}
  ekran('<h2>Łączę z walką…</h2>');
  laduj().then(()=>{dane=true;zbudujPytania();}).catch(()=>ekran('<h2>Nie wczytano pytań</h2><p>Sprawdź internet i odśwież.</p>'));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)odpytaj();});
  odpytaj();
 }
 return {start,odpowiedz};
})();
