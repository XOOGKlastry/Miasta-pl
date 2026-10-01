/* Efekty wizualne PolskoZnawcy, inspirowane Canvas UI (canvasui.dev), ale napisane od zera
   w czystym JS: WebGL (płomień) i Canvas 2D (chmury, rozbicie, cząsteczki, fale).
   Bez zależności, działają na każdej przeglądarce; gdy ktoś ma włączone „ogranicz animacje”, efekty się nie odpalają. */
window.Efekty=(function(){
  const SPOKOJ=window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const DPR=Math.min(2,window.devicePixelRatio||1);
  function warstwa(rodzic,fixed){
    const c=document.createElement("canvas");
    c.style.cssText=(fixed?"position:fixed;inset:0;":"position:absolute;inset:0;")+"width:100%;height:100%;pointer-events:none;z-index:950";
    (rodzic||document.body).appendChild(c);
    const r=c.getBoundingClientRect();c.width=Math.max(1,r.width*DPR);c.height=Math.max(1,r.height*DPR);
    return c;
  }

  /* ---------- PŁOMIEŃ (WebGL, szum fraktalny): „Gorąco!”, perfekcyjny poziom ---------- */
  const FS="precision mediump float;uniform float t;uniform vec2 r;uniform float moc;uniform vec3 k1;uniform vec3 k2;"
   +"float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}"
   +"float n(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1.,0.)),u.x),mix(h(i+vec2(0.,1.)),h(i+vec2(1.,1.)),u.x),u.y);}"
   +"float fb(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*n(p);p*=2.03;a*=.5;}return v;}"
   +"void main(){vec2 uv=gl_FragCoord.xy/r;vec2 q=vec2(uv.x*4.,uv.y*2.6-t*1.7);float s=fb(q+fb(q*1.7+t*.4));"
   +"float f=(1.-uv.y*1.25)*1.55-s*1.05;f=clamp(f*moc,0.,1.);"
   +"vec3 c=mix(k1,k2,smoothstep(.15,.55,f));c=mix(c,vec3(1.,.96,.78),smoothstep(.62,.95,f));"
   +"gl_FragColor=vec4(c,smoothstep(.06,.32,f));}";
  function plomien(rodzic,ms,kolory){
    if(SPOKOJ)return;
    const c=warstwa(rodzic,!rodzic),gl=c.getContext("webgl",{premultipliedAlpha:false,alpha:true});
    if(!gl){c.remove();return;}
    const sh=(typ,src)=>{const s=gl.createShader(typ);gl.shaderSource(s,src);gl.compileShader(s);return s;};
    const p=gl.createProgram();
    gl.attachShader(p,sh(gl.VERTEX_SHADER,"attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}"));
    gl.attachShader(p,sh(gl.FRAGMENT_SHADER,FS));gl.linkProgram(p);gl.useProgram(p);
    const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
    const a=gl.getAttribLocation(p,"a");gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);
    gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
    const U=x=>gl.getUniformLocation(p,x);
    kolory=kolory||[[.55,.05,.02],[1,.45,.08]];
    gl.uniform2f(U("r"),c.width,c.height);gl.uniform3fv(U("k1"),kolory[0]);gl.uniform3fv(U("k2"),kolory[1]);
    const t0=performance.now();ms=ms||1800;
    (function klatka(t){
      const dt=(t-t0)/ms;
      // płomień rośnie, chwilę płonie i gaśnie
      const moc=dt<.2?dt/.2:dt>.65?Math.max(0,1-(dt-.65)/.35):1;
      gl.viewport(0,0,c.width,c.height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(U("t"),(t-t0)/1000);gl.uniform1f(U("moc"),moc);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
      if(dt<1)requestAnimationFrame(klatka);else c.remove();
    })(t0);
  }

  /* ---------- ROZBICIE: element pęka na odłamki (kłódka na planszy, porażka) ---------- */
  function rozbij(el,kolory,gotowe){
    const r=el.getBoundingClientRect();
    if(SPOKOJ||!r.width){el.style.visibility="hidden";gotowe&&gotowe();return;}
    const c=warstwa(null,true),g=c.getContext("2d");g.scale(DPR,DPR);
    kolory=kolory||[getComputedStyle(el).backgroundColor||"#C9C0A0"];
    const N=5,M=5,pkt=[];
    for(let j=0;j<=M;j++)for(let i=0;i<=N;i++){
      const brzeg=i===0||j===0||i===N||j===M;
      pkt.push([r.left+r.width*i/N+(brzeg?0:(Math.random()-.5)*r.width/N*.8),r.top+r.height*j/M+(brzeg?0:(Math.random()-.5)*r.height/M*.8)]);
    }
    const P=(i,j)=>pkt[j*(N+1)+i],cx=r.left+r.width/2,cy=r.top+r.height/2,odl=[];
    for(let j=0;j<M;j++)for(let i=0;i<N;i++){
      [[P(i,j),P(i+1,j),P(i,j+1)],[P(i+1,j),P(i+1,j+1),P(i,j+1)]].forEach(tr=>{
        const mx=(tr[0][0]+tr[1][0]+tr[2][0])/3,my=(tr[0][1]+tr[1][1]+tr[2][1])/3,kat=Math.atan2(my-cy,mx-cx),v=3+Math.random()*5;
        odl.push({tr:tr.map(p=>[p[0]-mx,p[1]-my]),x:mx,y:my,vx:Math.cos(kat)*v,vy:Math.sin(kat)*v-4,rot:0,vr:(Math.random()-.5)*.3,k:kolory[Math.floor(Math.random()*kolory.length)]});
      });
    }
    el.style.visibility="hidden";
    const t0=performance.now();
    (function klatka(t){
      const dt=(t-t0)/1100;g.clearRect(0,0,innerWidth,innerHeight);
      odl.forEach(o=>{o.vy+=.45;o.x+=o.vx;o.y+=o.vy;o.rot+=o.vr;
        g.save();g.translate(o.x,o.y);g.rotate(o.rot);g.globalAlpha=Math.max(0,1-dt);g.fillStyle=o.k;g.strokeStyle="rgba(58,42,20,.8)";g.lineWidth=1.5;
        g.beginPath();g.moveTo(o.tr[0][0],o.tr[0][1]);g.lineTo(o.tr[1][0],o.tr[1][1]);g.lineTo(o.tr[2][0],o.tr[2][1]);g.closePath();g.fill();g.stroke();g.restore();});
      if(dt<1)requestAnimationFrame(klatka);else{c.remove();gotowe&&gotowe();}
    })(t0);
  }

  /* ---------- CZĄSTECZKI: obraz składa się z pikseli (herb, zdjęcie miasta) ---------- */
  let AKTYWNE=[];
  function przerwij(){AKTYWNE.forEach(a=>{a.stop=true;a.c.remove();a.img.style.opacity="";});AKTYWNE=[];}
  function czasteczki(img,ms){
    if(SPOKOJ)return;
    przerwij();
    const start=()=>{
      const r=img.getBoundingClientRect();if(!r.width||!r.height)return;
      // obraz rysowany tak jak w CSS (object-fit: contain albo cover)
      const fit=getComputedStyle(img).objectFit,iw=img.naturalWidth,ih=img.naturalHeight;
      const s=fit==="cover"?Math.max(r.width/iw,r.height/ih):Math.min(r.width/iw,r.height/ih),dw=iw*s,dh=ih*s,ox=(r.width-dw)/2,oy=(r.height-dh)/2;
      const krok=Math.max(4,Math.round(Math.sqrt(dw*dh/2600)));
      const src=document.createElement("canvas");src.width=Math.ceil(r.width/krok);src.height=Math.ceil(r.height/krok);
      const sg=src.getContext("2d");
      try{sg.drawImage(img,ox/krok,oy/krok,dw/krok,dh/krok);var dane=sg.getImageData(0,0,src.width,src.height).data;}catch(e){return;}
      const cz=[];
      for(let y=0;y<src.height;y++)for(let x=0;x<src.width;x++){const i=(y*src.width+x)*4;if(dane[i+3]<40)continue;
        const kat=Math.random()*Math.PI*2,d=80+Math.random()*Math.max(r.width,r.height)*.6;
        cz.push({x:x*krok,y:y*krok,sx:r.width/2+Math.cos(kat)*d,sy:r.height/2+Math.sin(kat)*d,op:Math.random()*.35,k:"rgb("+dane[i]+","+dane[i+1]+","+dane[i+2]+")"});}
      const c=document.createElement("canvas");c.width=r.width*DPR;c.height=r.height*DPR;
      c.style.cssText="position:fixed;left:"+r.left+"px;top:"+r.top+"px;width:"+r.width+"px;height:"+r.height+"px;pointer-events:none;z-index:950";
      document.body.appendChild(c);const g=c.getContext("2d");g.scale(DPR,DPR);
      img.style.opacity="0";
      const ja={c,img,stop:false};AKTYWNE.push(ja);
      const t0=performance.now();ms=ms||1000;
      (function klatka(t){
        if(ja.stop)return;
        const dt=Math.min(1,(t-t0)/ms);g.clearRect(0,0,r.width,r.height);
        cz.forEach(p=>{const q=Math.min(1,Math.max(0,(dt-p.op)/(1-p.op))),e=1-Math.pow(1-q,3);
          g.fillStyle=p.k;g.globalAlpha=Math.min(1,q*2);g.fillRect(p.sx+(p.x-p.sx)*e,p.sy+(p.y-p.sy)*e,krok+.6,krok+.6);});
        if(dt<1)requestAnimationFrame(klatka);else{img.style.transition="opacity .25s";img.style.opacity="1";AKTYWNE=AKTYWNE.filter(a=>a!==ja);setTimeout(()=>c.remove(),260);}
      })(t0);
    };
    if(img.complete&&img.naturalWidth)requestAnimationFrame(start);else img.addEventListener("load",()=>requestAnimationFrame(start),{once:true});
  }

  /* ---------- FALA: kręgi rozchodzące się od miejsca stuknięcia ---------- */
  function fala(x,y,kolor){
    if(SPOKOJ)return;
    for(let i=0;i<3;i++){
      const d=document.createElement("span");
      d.style.cssText="position:fixed;left:"+x+"px;top:"+y+"px;width:12px;height:12px;margin:-6px 0 0 -6px;border-radius:50%;border:3px solid "+(kolor||"#FFF6E0")+";pointer-events:none;z-index:960;"
        +"animation:efekt-fala .8s "+(i*.12)+"s cubic-bezier(.2,.7,.3,1) both";
      document.body.appendChild(d);setTimeout(()=>d.remove(),1200);
    }
  }
  const st=document.createElement("style");
  st.textContent="@keyframes efekt-fala{from{transform:scale(1);opacity:.9}to{transform:scale(9);opacity:0}}";
  document.head.appendChild(st);

  /* ---------- CHMURY: mgła nad zamkniętymi krainami planszy ---------- */
  function chmury(kontener,przewijany,obszary){
    // obszary(): lista {top,bottom} w pikselach planszy, które mają być zachmurzone
    const c=document.createElement("canvas");
    c.style.cssText="position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;z-index:4";
    kontener.appendChild(c);const g=c.getContext("2d");
    let kl=[],W=0,H=0;
    function rozmiar(){const r=kontener.getBoundingClientRect();W=r.width;H=r.height;c.width=W*DPR;c.height=H*DPR;g.setTransform(DPR,0,0,DPR,0,0);}
    function zbuduj(){
      kl=[];
      obszary().forEach(o=>{for(let y=o.top;y<o.bottom;y+=46)for(let i=0;i<4;i++)
        kl.push({x:Math.random()*W,y:y+Math.random()*46,r:50+Math.random()*60,v:(Math.random()-.5)*.25,f:Math.random()*6.28,a:.72+Math.random()*.25,top:o.top,bottom:o.bottom});});
    }
    rozmiar();zbuduj();
    let wl=true;
    (function klatka(t){
      if(!c.isConnected)return;
      const sy=przewijany.scrollTop;g.clearRect(0,0,W,H);
      kl.forEach(k=>{
        const y=k.y-sy;if(y<-k.r||y>H+k.r)return;
        const x=((k.x+(SPOKOJ?0:Math.sin(t/4000+k.f)*30)+k.v*t/40)%(W+200)+W+200)%(W+200)-100;
        const gr=g.createRadialGradient(x,y,0,x,y,k.r);gr.addColorStop(0,"rgba(255,255,255,"+k.a+")");gr.addColorStop(.6,"rgba(244,247,250,"+(k.a*.75)+")");gr.addColorStop(1,"rgba(244,247,250,0)");
        g.fillStyle=gr;g.beginPath();g.arc(x,y,k.r,0,6.283);g.fill();
      });
      if(wl)requestAnimationFrame(klatka);
    })(0);
    addEventListener("resize",()=>{rozmiar();zbuduj();});
    return {odswiez(){zbuduj();},rozwiej(top,bottom){
      // chmury z danej krainy odpływają na boki
      if(SPOKOJ){kl=kl.filter(k=>!(k.top===top));return;}
      kl.filter(k=>k.top===top).forEach(k=>{k.v=(k.x<W/2?-1:1)*(6+Math.random()*6);k.a*=.98;});
      setTimeout(()=>{kl=kl.filter(k=>k.top!==top);},2500);
    },stop(){wl=false;c.remove();}};
  }

  return {plomien,rozbij,czasteczki,przerwij,fala,chmury,SPOKOJ};
})();
