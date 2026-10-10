/* Podbój Polski w silniku pytań (wyzwanie.html?tryb=podboj&proba=…&k=…&seed=…&rodzaj=…).
   Próbę zakłada mapa (podboj.html, conq_start); tu gramy 8 pytań i odsyłamy liczbę dobrych odpowiedzi (conq_wynik).
   Przeładowanie strony w trakcie nie daje drugiej szansy: wysyłamy to, co było już odpowiedziane. */
window.Podboj=(function(){
 const P=new URLSearchParams(location.search);
 const S={id:P.get('proba')||'',k:P.get('k')||'',seed:P.get('seed')||'',rodzaj:P.get('rodzaj')||'atak',cel:+P.get('cel')||0,rywal:(P.get('rywal')||'').slice(0,24),obecny:+P.get('obecny')||0};
 const KLUCZ='podboj-proba-'+S.id;
 let powiat=null,pytania=null;
 const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
 const czytaj=()=>{try{return JSON.parse(localStorage.getItem(KLUCZ)||'null');}catch(e){return null;}};
 const pisz=v=>{try{localStorage.setItem(KLUCZ,JSON.stringify(v));}catch(e){}};
 const mapaUrl=()=>'podboj.html'+(S.k?'?k='+encodeURIComponent(S.k):'');
 const ekran=html=>lobby('<div class="saga-wynik podboj-ekran">'+html+'</div>');
 const nazwa=()=>powiat?powiat.full:'powiat';

 function opisCelu(){
  if(S.rodzaj==='obrona')return 'Obrona twierdzy przed '+esc(S.rywal||'rywalem')+'. Musisz zdobyć co najmniej <b>'+S.cel+'</b> z 8, żeby ją utrzymać.';
  if(S.rodzaj==='pojedynek')return 'Pojedynek o twierdzę gracza '+esc(S.rywal||'rywala')+'. Twój wynik zobaczy obrońca i będzie miał dobę, żeby go wyrównać.';
  if(S.obecny&&!S.rywal)return 'Umacniasz swój powiat. Masz '+S.obecny+' z 8; lepszy wynik podniesie obronę.';
  if(S.rywal)return 'Powiat należy do '+esc(S.rywal)+' ('+(S.cel-1)+' z 8). Potrzebujesz co najmniej <b>'+S.cel+'</b> dobrych odpowiedzi.';
  return 'Wolny powiat. Zdobędziesz go, gdy odpowiesz dobrze na co najmniej <b>5</b> z 8 pytań.';
 }

 async function start(){
  $('tytul').textContent='Podbój Polski';document.title='Podbój Polski · PolskoZnawca';
  if(!S.id||!S.k||!S.seed){ekran('<h2>Brak próby</h2><p>Wybierz powiat na mapie Podboju.</p><a class="big" href="podboj.html">Mapa Podboju</a>');return;}
  const zap=czytaj();
  if(zap&&zap.wynik){pokazKoniec(zap.wynik,zap.res||[]);return;}
  if(zap){wyslij(zap.res||[],true);return;}   // przerwana w trakcie
  $('odznaka').textContent=S.rodzaj==='obrona'?'🛡️ Obrona twierdzy':S.rodzaj==='pojedynek'?'⚔️ Pojedynek 24 h':'🏴 Podbój';
  $('startTytul').textContent='Ładowanie powiatu…';$('startOpis').innerHTML=opisCelu()+'<br><small>8 pytań, 20 s na każde. Nie przerywaj: wyjście w trakcie liczy się jako koniec próby.</small>';
  $('typyLista').innerHTML='';$('start').classList.remove('hidden');
  $('stanDanych').textContent='Wczytywanie map, herbów i zdjęć…';
  try{await laduj();}catch(e){$('stanDanych').textContent='Nie udało się wczytać danych. Odśwież stronę.';return;}
  powiat=D.powAll.find(p=>p.k===S.k);
  pytania=PodbojPytania.zestaw(D,S.k,ZP.seeded('podboj-'+S.seed));
  if(!powiat||pytania.length<PodbojPytania.ILE){$('stanDanych').textContent='Za mało danych o tym powiecie.';return;}
  $('startTytul').textContent=powiat.full;
  const ile={};pytania.forEach(q=>ile[q.t]=(ile[q.t]||0)+1);
  $('typyLista').innerHTML=Object.keys(ile).map(t=>'<div><span>'+TYPY[t][0]+'</span>'+TYPY[t][1]+(ile[t]>1?' ×'+ile[t]:'')+'</div>').join('');
  $('stanDanych').textContent='';$('zaczynam').disabled=false;$('zaczynam').textContent='Do boju!';
 }
 // od pierwszego pytania próba jest „w toku”: przeładowanie kończy ją z dotychczasowym wynikiem
 function rozpocznij(){KONFIG={preset:'',gry:[],kolej:'',czas:20,podp:true,premia:false,wielk:'dsm',obszar:[]};pisz({res:[]});return pytania;}
 function postep(res){const z=czytaj()||{};if(!z.wynik)pisz({res:res.map(r=>({t:r.t,pts:r.pts}))});}
 const dobre=res=>res.filter(PodbojPytania.dobra).length;

 async function wyslij(res,przerwana){
  ekran('<h2>'+(przerwana?'Próba przerwana':'Liczę wynik…')+'</h2><p>'+(przerwana?'Wysyłam odpowiedzi sprzed wyjścia: ':'')+dobre(res)+' z 8 dobrych odpowiedzi.</p>');
  let w=null;
  for(let i=0;i<3&&!w;i++){try{w=await Online.podboj.wynik(S.id,dobre(res));}catch(e){if(/próby|Najpierw/.test(e.message)){w={wynik:'blad',tekst:e.message};break;}await new Promise(r=>setTimeout(r,1200));}}
  if(!w){ekran('<h2>Brak połączenia</h2><p>Wynik zapisany na telefonie: '+dobre(res)+' z 8. Spróbuj ponownie.</p><button class="big" id="pdPonow">Wyślij jeszcze raz</button><a class="ghost" href="'+mapaUrl()+'">Mapa Podboju</a>');
   $('pdPonow').onclick=()=>wyslij(res,przerwana);return;}
  pisz({res,wynik:w});
  if(w.wynik==='zdobyty'||w.wynik==='przejety'||w.wynik==='obronione')ZP.zeton(w.wynik==='obronione'?2:1);
  pokazKoniec(w,res);
 }
 function koniec(res){if(!czytaj()||!(czytaj()||{}).wynik)wyslij(res,false);else pokazKoniec(czytaj().wynik,res);}

 function pokazKoniec(w,res){
  schowaj();['segmenty','gora','pytanie','stage','start','lobby'].forEach(id=>$(id).classList.add('hidden'));
  const n=dobre(res),pw=esc(nazwa());
  const T={
   zdobyty:['🏴 Powiat zdobyty!',pw+' jest Twój ('+n+' z 8). Inni mogą go przebić lepszym wynikiem, chyba że zrobisz z niego twierdzę (8 z 8).',1],
   przejety:['⚔️ Przejęty!','Odbierasz '+pw+' graczowi '+esc(S.rywal)+' ('+n+' z 8). Dostanie o tym wiadomość.',1],
   umocniony:[n>=8?'🏰 Twierdza!':'🛡️ Umocniony',n>=8?pw+' ma teraz 8 z 8: nikt go już nie przebije zwykłym atakiem.':'Obrona powiatu wynosi teraz '+n+' z 8.',1],
   bez_zmian:['Bez zmian','Masz '+n+' z 8, a obrona powiatu jest już taka sama albo wyższa.',0],
   za_malo:['Tym razem nie','Masz '+n+' z 8, a potrzeba było '+(S.cel||5)+'. Spróbuj jutro albo zaatakuj inny powiat.',-1],
   wyzwanie:['⚔️ Wyzwanie wysłane','Twój wynik: '+n+' z 8. '+esc(S.rywal||'Obrońca')+' ma 24 godziny, żeby zdobyć co najmniej tyle samo. Jeśli nie zagra, twierdza jest Twoja.',1],
   obronione:['🏰 Twierdza obroniona!','Masz '+n+' z 8, rywal miał '+(w.rywal_wynik!=null?w.rywal_wynik:S.cel)+'. Powiat zostaje Twój.',1],
   stracony:['Twierdza stracona','Masz '+n+' z 8, rywal miał '+(w.rywal_wynik!=null?w.rywal_wynik:S.cel)+'. Powiat przechodzi do niego, ale możesz go odbić.',-1],
   czas:['Próba wygasła','Od rozpoczęcia minęło ponad 20 minut, więc wynik się nie liczy.',-1],
   juz:['Już rozliczone','Ta próba ma już wynik ('+(w.score!=null?w.score:n)+' z 8).',0],
   anulowany:['Pojedynek anulowany','Pojedynek wygasł, zanim skończyłeś grać.',-1],
   po_czasie:['Po czasie','Ten pojedynek już się rozstrzygnął.',-1],
   blad:['Nie zapisano',esc(w.tekst||'Spróbuj jeszcze raz z mapy.'),-1]
  }[w.wynik]||['Koniec','Wynik: '+n+' z 8.',0];
  const box=$('wynik');
  box.innerHTML='<div class="saga-wynik podboj-ekran"><div class="pd-licznik"><b>'+n+'</b><span>/ 8</span></div>'
   +'<h2>'+T[0]+'</h2><div class="saga-odbl'+(T[2]<0?' nie':'')+'">'+T[1]+'</div>'
   +'<div class="btnrow"><a class="big" href="'+mapaUrl()+'">Mapa Podboju</a></div><div class="rows"></div></div>';
  const rows=box.querySelector('.rows');
  res.forEach((r,i)=>{const q=(pytania||[])[i];const d=document.createElement('div');d.className='r';
   d.innerHTML='<span class="nm"><b></b><small></small></span><span class="pt"></span>';
   d.querySelector('b').textContent=!q?TYPY[r.t][1]:q.t==='k'?q.p.full:q.t==='t'?q.p.kod+': '+q.p.nazwa:q.t==='s'||q.t==='w'?(q.a.label||q.a.n)+' i '+(q.b.label||q.b.n):q.t==='p'?q.c.n+': '+q.pw.label:q.t==='r'?q.c.n+': '+q.c.rzeka:q.c.n;
   d.querySelector('small').textContent=TYPY[r.t][1];const ok=PodbojPytania.dobra(r),pt=d.querySelector('.pt');pt.textContent=ok?'✓':'✗';pt.className='pt '+(ok?'ok':'no');rows.appendChild(d);});
  box.classList.remove('hidden');
  if(T[2]>0)setTimeout(ZP.fanfary,500);
 }
 return {start,rozpocznij,postep,koniec,get powiat(){return powiat;}};
})();
