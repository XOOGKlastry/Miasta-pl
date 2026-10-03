window.MeczZasady={
 remis(gracze){if(gracze.length<2)return false;const max=Math.max(...gracze.map(g=>g.pts));return gracze.filter(g=>g.pts===max).length>1;},
 szybki(odpowiedzi,uprawnieni){const a=Object.entries(odpowiedzi).filter(([id,o])=>uprawnieni.includes(id)&&o.pts>=500).sort((a,b)=>a[1].ms-b[1].ms);return a[0]&&(!a[1]||a[0][1].ms<a[1][1].ms)?a[0][0]:null;},
 zwyciezca(gracze){if(this.remis(gracze))return null;return gracze.slice().sort((a,b)=>b.pts-a.pts)[0]||null;}
};
