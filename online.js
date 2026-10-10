/* Supabase REST: OAuth PKCE oraz e-mail OTP, bez dostępu do kontaktów. */
window.Online=(()=>{
 const config=()=>window.ONLINE_CONFIG||{},read=()=>{try{return JSON.parse(localStorage.getItem('online-session')||'null');}catch{return null;}};
 const enabled=()=>/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(config().url)&&!!config().key;
 const save=s=>{localStorage.setItem('online-session',JSON.stringify({...s,expires_at:Date.now()+s.expires_in*1000}));return s;};
 async function request(path,body,token,method){
  if(!enabled())throw Error('Konta online wymagają konfiguracji Supabase.');
  const r=await fetch(config().url+path,{method:method||(body?'POST':'GET'),headers:{apikey:config().key,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});
  const data=await r.json().catch(()=>null);if(!r.ok)throw Error(data?.msg||data?.message||data?.error_description||'Nie udało się połączyć.');return data;
 }
 let refreshing;
 async function session(){
  let s=read();if(!s||!enabled())return null;
  if(s.expires_at>Date.now()+60000)return s;
  if(!refreshing)refreshing=request('/auth/v1/token?grant_type=refresh_token',{refresh_token:s.refresh_token}).then(save).catch(()=>{localStorage.removeItem('online-session');return null;}).finally(()=>refreshing=null);
  return refreshing;
 }
 async function oauth(provider){
  if(!['google','facebook'].includes(provider))throw Error('Nieobsługiwany dostawca.');
  if(!enabled())throw Error('Konta online wymagają konfiguracji Supabase.');
  const bytes=crypto.getRandomValues(new Uint8Array(48)),b64=b=>btoa(String.fromCharCode(...b)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  const verifier=b64(bytes);sessionStorage.setItem('pkce-verifier',verifier);
  const challenge=b64(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier))));
  const u=new URL(config().url+'/auth/v1/authorize');u.search=new URLSearchParams({provider,redirect_to:new URL('logowanie.html',location.href).href,code_challenge:challenge,code_challenge_method:'s256',scopes:provider==='facebook'?'email':'openid email profile'}).toString();location.assign(u.href);
 }
 async function callback(){
  const u=new URL(location.href),failure=u.searchParams.get('error_description'),code=u.searchParams.get('code');if(failure)throw Error(failure);if(!code)return;
  const verifier=sessionStorage.getItem('pkce-verifier');if(!verifier)throw Error('Sesja logowania wygasła. Zaloguj się ponownie.');
  save(await request('/auth/v1/token?grant_type=pkce',{auth_code:code,code_verifier:verifier}));sessionStorage.removeItem('pkce-verifier');u.searchParams.delete('code');history.replaceState(null,'',u);
 }
 async function providers(){const data=await request("/auth/v1/settings");return data.external||{};}
 async function email(email){return request('/auth/v1/otp',{email,create_user:true});}
 async function verify(email,token){return save(await request('/auth/v1/verify',{email,token,type:'email'}));}
 async function logout(){const s=await session();if(s)await request('/auth/v1/logout',{},s.access_token);localStorage.removeItem('online-session');}
 function points(){try{return Object.values(JSON.parse(localStorage.getItem('nauka-v1')||'{}')).reduce((a,r)=>a+Math.max(0,Number(r.ok)||0)*10,0);}catch{return 0;}}
 // statystyki do profilu w rankingu: same liczby i kody kart (wygląd kart odtwarza telefon oglądającego)
 async function statystyki(){
  await Karty.zaladuj();Karty.migracja();
  const D=Karty.dane(),mam=Karty.zdobyte().mam,KOL=Karty.KOLEJ,rz={},woj={},l=[];KOL.forEach(r=>rz[r]=0);
  for(const k of mam){const g=D.PO_K[k];if(!g)continue;rz[g.rz]++;woj[g.woj]=(woj[g.woj]||0)+1;l.push(g);}
  const naj=l.filter(g=>g.ovr!=null).sort((a,b)=>KOL.indexOf(a.rz)-KOL.indexOf(b.rz)||b.ovr-a.ovr).slice(0,3).map(g=>g.k);
  const nw=Object.keys(woj).sort((a,b)=>woj[b]-woj[a])[0];
  const czytaj=(k,d)=>{try{return JSON.parse(localStorage.getItem(k)||'null')||d;}catch(e){return d;}};
  const kd=czytaj('ciemno-ranking',{}),saga=czytaj('saga-v1',{gw:{}}),gw=Object.values(saga.gw||{}).map(Number).filter(x=>x>0);
  return {v:1,rz,naj,woj:nw?{n:nw,ile:woj[nw],z:D.g.filter(g=>g.woj===nw).length}:null,kd:{w:+kd.w||0,r:+kd.r||0,p:+kd.p||0},
   poz:gw.length,gw:gw.reduce((a,b)=>a+b,0),lan:+localStorage.getItem('lancuch-rekord')||0,ser:(czytaj('dzis-seria',{n:0}).n)||0,odz:Object.keys(Karty.odznaki()).length};
 }
 function profilLokalny(){try{return JSON.parse(localStorage.getItem('ranking-profile')||'{}');}catch(e){return {};}}
 const zapiszJa=id=>{if(typeof id==='string'&&/^[0-9a-f-]{36}$/.test(id))localStorage.setItem('ranking-ja',id);return id;};
 const ja=()=>localStorage.getItem('ranking-ja')||'';
 // nowe parametry (statystyki, wiadomości); gdy baza ma jeszcze starą wersję funkcji, zapis idzie bez nich
 // nowe funkcje mają końcówkę „2”; stare zostają w bazie jako zapas
 async function rpcZapasowo(fn,pelne,podstawowe,token){
  try{return await request('/rest/v1/rpc/'+fn+'2',pelne,token);}
  catch(e){if(/function|schema cache|not find/i.test(e.message))return request('/rest/v1/rpc/'+fn,podstawowe,token);throw e;}
 }
 async function publish(nick,visible,dm){
  const s=await session();if(!s)throw Error('Zaloguj się, aby zapisać wynik.');
  const n=nick.trim();if(n.length<3||n.length>24)throw Error('Pseudonim musi mieć od 3 do 24 znaków.');
  await Karty.zaladuj();Karty.migracja();
  let d={};try{d=JSON.parse(localStorage.getItem('ciemno-ranking')||'{}');}catch(e){}
  const baza={p_nickname:n,p_visible:visible,p_points:points(),p_cards:Karty.zdobyte().mam.size,p_duel_points:Math.max(0,Number(d.pkt)||0),p_duel_wins:Math.max(0,Number(d.w)||0)};
  return zapiszJa(await rpcZapasowo('publish_score',{...baza,p_stats:await statystyki(),p_dm_open:dm!==false},baza,s.access_token));
 }
 // ranking bez logowania: losowy identyfikator urządzenia i sekret zapisane tylko na tym telefonie
 function urzadzenie(){
  let u=null;try{u=JSON.parse(localStorage.getItem('ranking-urzadzenie')||'null');}catch(e){}
  if(!u||!u.id||!u.sekret){const b=new Uint8Array(24);crypto.getRandomValues(b);u={id:crypto.randomUUID?crypto.randomUUID():'10000000-1000-4000-8000-100000000000'.replace(/[018]/g,c=>(c^crypto.getRandomValues(new Uint8Array(1))[0]&15>>c/4).toString(16)),sekret:Array.from(b,x=>x.toString(16).padStart(2,'0')).join('')};localStorage.setItem('ranking-urzadzenie',JSON.stringify(u));}
  return u;
 }
 async function publishGuest(nick,visible,dm){
  const n=String(nick||'').trim();if(n.length<3||n.length>24)throw Error('Pseudonim musi mieć od 3 do 24 znaków.');
  await Karty.zaladuj();Karty.migracja();
  const u=urzadzenie();let d={};try{d=JSON.parse(localStorage.getItem('ciemno-ranking')||'{}');}catch(e){}
  const baza={p_device:u.id,p_token:u.sekret,p_nickname:n,p_visible:!!visible,p_points:points(),p_cards:Karty.zdobyte().mam.size,p_duel_points:Math.max(0,Number(d.pkt)||0),p_duel_wins:Math.max(0,Number(d.w)||0)};
  return zapiszJa(await rpcZapasowo('publish_guest_score',{...baza,p_stats:await statystyki(),p_dm_open:dm!==false},baza));
 }
 // zapis profilu tym sposobem, jakim gracz dołączył (konto albo telefon)
 async function odswiezProfil(){
  const p=profilLokalny();if(!p.nick)return null;
  return (await session())?publish(p.nick,p.visible!==false,p.dm):publishGuest(p.nick,p.visible!==false,p.dm);
 }
 const dolaczony=()=>!!profilLokalny().nick;
 // wiadomości i wyzwania: rozpoznanie gracza po koncie albo po sekrecie urządzenia
 async function rpcGracza(fn,body){const s=await session(),u=urzadzenie();return request('/rest/v1/rpc/'+fn,{p_device:u.id,p_token:u.sekret,...body},s&&s.access_token);}
 async function profil(id){const r=await request('/rest/v1/rpc/player_profile',{p_id:id});return r&&r[0]||null;}
 async function wyslij(do_,tresc,rodzaj,dane){return rpcGracza('send_message',{p_to:do_,p_body:String(tresc||'').slice(0,200),p_kind:rodzaj||'msg',p_payload:dane||null});}
 async function skrzynka(){const l=await rpcGracza('inbox',{});if(l&&l[0]&&l[0].me)zapiszJa(l[0].me);return l||[];}
 async function nieprzeczytane(){if(!enabled()||!dolaczony())return 0;try{return +(await rpcGracza('unread_count',{}))||0;}catch(e){return 0;}}
 async function przeczytane(inny){return rpcGracza('mark_read',{p_other:inny});}
 // walki na żywo: serwer liczy czas i obrażenia, telefon odpytuje stan
 const walka={
  ping:()=>rpcGracza('live_ping',{}),
  online:()=>request('/rest/v1/rpc/live_online',{}),
  profil:id=>request('/rest/v1/rpc/live_profile',{p_id:id}).then(r=>r&&r[0]||null),
  zapros:(do_,tryb,edycja)=>rpcGracza('live_invite',{p_to:do_,p_mode:tryb,p_edition:edycja||null}),
  odpowiedz:(id,tak)=>rpcGracza('live_respond',{p_id:id,p_accept:!!tak}),
  stan:id=>rpcGracza('live_state',{p_id:id}),
  strzal:(id,runda,pts)=>rpcGracza('live_answer',{p_id:id,p_round:runda,p_pts:Math.round(pts)}),
  opusc:id=>rpcGracza('live_leave',{p_id:id})
 };
 // wydarzenie tygodnia na planszy: wynik (suma punktów krainy tygodnia) i tabela
 const wydarzenie={
  zapisz:(tydzien,pkt)=>rpcGracza('event_publish',{p_week:tydzien,p_score:Math.round(pkt)}),
  ranking:tydzien=>request('/rest/v1/rpc/event_leaderboard',{p_week:tydzien||null})
 };
 // Podbój Polski: powiaty na mapie, próby (ziarno pytań wydaje serwer), pojedynki o twierdze, handel
 const podboj={
  mapa:()=>request('/rest/v1/rpc/conq_mapa',{}),
  ja:()=>rpcGracza('conq_ja',{}),
  start:(k,rodzaj,pojedynek)=>rpcGracza('conq_start',{p_k:k,p_rodzaj:rodzaj,p_pojedynek:pojedynek||null}),
  wynik:(id,dobre)=>rpcGracza('conq_wynik',{p_id:id,p_score:Math.round(dobre)}),
  sprzedaz:(k,cena)=>rpcGracza('conq_sprzedaz',{p_k:k,p_cena:cena==null?null:Math.round(cena)}),
  kup:(k,cena)=>rpcGracza('conq_kup',{p_k:k,p_cena:Math.round(cena)}),
  odbierz:()=>rpcGracza('conq_odbierz',{}),
  ranking:()=>request('/rest/v1/rpc/conq_ranking',{})
 };
 async function zablokuj(inny,zglos){return rpcGracza('block_player',{p_other:inny,p_report:!!zglos});}
 async function ranking(mode){try{return await request('/rest/v1/rpc/leaderboard2',{p_mode:mode});}catch(e){if(/function|schema cache|not find/i.test(e.message))return request('/rest/v1/rpc/leaderboard',{p_mode:mode});throw e;}}
 async function gate(){
  if(!enabled()||!config().requireAccount)return;
  if(['logowanie.html','ranking.html','profil.html','karty.html','encyklopedia.html','statystyki.html','admin.html'].includes(location.pathname.split('/').pop()))return;
  if(await session())return;
  sessionStorage.setItem('login-return',location.pathname+location.search+location.hash);location.replace('logowanie.html');
 }
 return {providers,enabled,session,oauth,email,verify,callback,logout,points,publish,publishGuest,ranking,gate,statystyki,odswiezProfil,dolaczony,profilLokalny,ja,profil,wyslij,skrzynka,nieprzeczytane,przeczytane,zablokuj,urzadzenie,walka,wydarzenie,podboj};
})();
