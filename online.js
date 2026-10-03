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
  const u=new URL(location.href),code=u.searchParams.get('code');if(!code)return;
  const verifier=sessionStorage.getItem('pkce-verifier');if(!verifier)throw Error('Sesja logowania wygasła. Zaloguj się ponownie.');
  save(await request('/auth/v1/token?grant_type=pkce',{auth_code:code,code_verifier:verifier}));sessionStorage.removeItem('pkce-verifier');u.searchParams.delete('code');history.replaceState(null,'',u);
 }
 async function email(email){return request('/auth/v1/otp',{email,create_user:true});}
 async function verify(email,token){return save(await request('/auth/v1/verify',{email,token,type:'email'}));}
 async function logout(){const s=await session();if(s)await request('/auth/v1/logout',{},s.access_token);localStorage.removeItem('online-session');}
 function points(){try{return Object.values(JSON.parse(localStorage.getItem('nauka-v1')||'{}')).reduce((a,r)=>a+Math.max(0,Number(r.ok)||0)*10,0);}catch{return 0;}}
 async function publish(nick,visible){
  const s=await session();if(!s)throw Error('Zaloguj się, aby zapisać wynik.');
  const n=nick.trim();if(n.length<3||n.length>24)throw Error('Pseudonim musi mieć od 3 do 24 znaków.');
  await Karty.zaladuj();Karty.migracja();
  return request('/rest/v1/rpc/publish_score',{p_nickname:n,p_visible:visible,p_points:points(),p_cards:Karty.zdobyte().mam.size},s.access_token);
 }
 async function ranking(mode){return request('/rest/v1/rpc/leaderboard',{p_mode:mode});}
 async function gate(){
  if(!enabled()||!config().requireAccount)return;
  if(['logowanie.html','ranking.html','profil.html','karty.html','encyklopedia.html','statystyki.html','admin.html'].includes(location.pathname.split('/').pop()))return;
  if(await session())return;
  sessionStorage.setItem('login-return',location.pathname+location.search+location.hash);location.replace('logowanie.html');
 }
 return {enabled,session,oauth,email,verify,callback,logout,points,publish,ranking,gate};
})();
