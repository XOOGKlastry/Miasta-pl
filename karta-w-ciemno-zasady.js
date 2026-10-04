/* Czysta logika meczu: żadnych zapisów do kolekcji ani nagród za karty pożyczone. */
window.CiemnoZasady=(()=>{
 const shuffle=(a,r=Math.random)=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
 const seeded=seed=>()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
 function value(c,k,records=false){return c.oc[k]==null?null:Math.min(99,c.oc[k]+c.bonus+(records&&c.rekordy.some(r=>r.k===k)?5:0));}
 const ovr=c=>Math.min(99,c.ovr+c.bonus);
 const compare=(a,b,k,records)=>(value(a,k,records)-value(b,k,records))||(ovr(a)-ovr(b));
 function candidates(deck,used,k,rng,records=false){return shuffle(deck.filter(c=>!used.has(c.k)&&value(c,k,records)!=null).sort((a,b)=>compare(b,a,k,records)).slice(0,12),rng);}
 function ai(cards,k,level,rng,records){const z=[...cards].sort((a,b)=>compare(b,a,k,records));if(level==='easy')return z[Math.floor(rng()*Math.ceil(z.length/2))];if(rng()<(level==='hard'?.95:.75))return z[0];return z[Math.floor(rng()*Math.min(4,z.length))];}
 function resolve(a,b,ca,cb,k,records=false){if(!ca.some(c=>c.k===a.k)||!cb.some(c=>c.k===b.k))throw Error('Karta spoza dostępnej dwunastki');const diff=compare(a,b,k,records),best=(c,z)=>z.every(x=>compare(c,x,k,records)>=0);return {winner:diff>0?0:diff<0?1:null,best:[best(a,ca),best(b,cb)],points:[(diff>0?1:0)+(best(a,ca)?1:0),(diff<0?1:0)+(best(b,cb)?1:0)],values:[value(a,k,records),value(b,k,records)]};}
 function deck(all,owned,region,rowna,rng,bonus){const eligible=all.filter(c=>c.ovr!=null&&Object.keys(c.oc).length>=10),regional=eligible.filter(c=>c.woj===region);if(regional.length<12)throw Error('Za mało pełnych danych w tym województwie');if(rowna)return shuffle(regional,rng).slice(0,12).map(c=>({...c,bonus:0,borrowed:false}));let out=eligible.filter(c=>owned.has(c.k)).map(c=>({...c,bonus:bonus(c),borrowed:false}));if(out.length<12)out.push(...shuffle(regional.filter(c=>!owned.has(c.k)),rng).slice(0,12-out.length).map(c=>({...c,bonus:0,borrowed:true})));return out;}
 return {shuffle,seeded,value,ovr,compare,candidates,ai,resolve,deck};
})();
