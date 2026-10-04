/* Karta w ciemno: wspólna talia 10 kart. Obaj gracze wybierają z tej samej talii kartę, która ich zdaniem
   ma najlepszy zakryty wskaźnik. Ta sama karta = remis; inaczej wygrywa wyższa ocena wskaźnika (przy równej: OVR).
   Obie wybrane karty odpadają z talii. 5 rund. Czysta logika: żadnych zapisów do kolekcji. */
window.CiemnoZasady=(()=>{
 const TALIA=10,RUNDY=5,PULA=50,BEZ=['wodociag_proc','kanalizacja_proc','szkoly_na_1000'];
 const shuffle=(a,r=Math.random)=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
 const seeded=seed=>()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
 function value(c,k,records=false){return c.oc[k]==null?null:Math.min(99,c.oc[k]+c.bonus+(records&&c.rekordy.some(r=>r.k===k)?5:0));}
 const ovr=c=>Math.min(99,c.ovr+c.bonus);
 const compare=(a,b,k,records)=>(value(a,k,records)-value(b,k,records))||(ovr(a)-ovr(b));
 // karty do wyboru w rundzie: cała pozostała talia, w losowej kolejności (ta sama dla obu graczy)
 function candidates(deck,used,k,rng,records=false){return shuffle(deck.filter(c=>!used.has(c.k)&&value(c,k,records)!=null),rng);}
 function ai(cards,k,level,rng,records){const z=[...cards].sort((a,b)=>compare(b,a,k,records));if(level==='easy')return z[Math.floor(rng()*Math.ceil(z.length/2))];if(rng()<(level==='hard'?.9:.6))return z[0];return z[Math.floor(rng()*Math.min(3,z.length))];}
 function resolve(a,b,ca,cb,k,records=false){
  if(!ca.some(c=>c.k===a.k)||!cb.some(c=>c.k===b.k))throw Error('Karta spoza talii');
  const same=a.k===b.k,diff=same?0:compare(a,b,k,records),best=(c,z)=>z.every(x=>compare(c,x,k,records)>=0);
  return {same,winner:same||!diff?null:diff>0?0:1,best:[best(a,ca),best(b,cb)],points:[!same&&diff>0?1:0,!same&&diff<0?1:0],values:[value(a,k,records),value(b,k,records)]};
 }
 // pula meczu: cała kolekcja; gdy kart jest mniej niż 50, szare karty pożyczone z regionu ją uzupełniają,
 // żeby każda z 5 rund mogła mieć 10 innych kart
 function deck(all,owned,region,rowna,rng,bonus){
  const eligible=all.filter(c=>c.ovr!=null&&Object.keys(c.oc).length>=10),regional=eligible.filter(c=>c.woj===region);
  if(regional.length<TALIA)throw Error('Za mało pełnych danych w tym województwie');
  if(rowna)return shuffle(regional,rng).slice(0,PULA).map(c=>({...c,bonus:0,borrowed:false}));
  let out=shuffle(eligible.filter(c=>owned.has(c.k)),rng).map(c=>({...c,bonus:bonus(c),borrowed:false}));
  if(out.length<PULA){const reszta=shuffle(regional.filter(c=>!owned.has(c.k)),rng);if(reszta.length<PULA-out.length)reszta.push(...shuffle(eligible.filter(c=>!owned.has(c.k)&&c.woj!==region),rng));out.push(...reszta.slice(0,PULA-out.length).map(c=>({...c,bonus:0,borrowed:true})));}
  return out;
 }
 // karty rundy: 10 kart z puli, najpierw te, których jeszcze nie było w tym meczu
 function rozdaj(pool,pokazane,k,rng,records=false){
  const z=pool.filter(c=>value(c,k,records)!=null),nowe=shuffle(z.filter(c=>!pokazane.has(c.k)),rng),stare=shuffle(z.filter(c=>pokazane.has(c.k)),rng);
  return nowe.concat(stare).slice(0,TALIA);
 }
 // nagrody w grze rankingowej: monety, punkty rankingu pojedynków i szansa na paczkę
 const NAGRODY={wygrana:{monety:5,pkt:20,paczka:.15},remis:{monety:2,pkt:5,paczka:.06},przegrana:{monety:1,pkt:-10,paczka:.03}};
 return {PULA,BEZ,rozdaj,TALIA,RUNDY,shuffle,seeded,value,ovr,compare,candidates,ai,resolve,deck,NAGRODY};
})();
