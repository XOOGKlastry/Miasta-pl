/* PLANSZA: krajobraz krain w stylu ilustracji z książki dla dzieci.
   Warstwy każdej krainy (od spodu): teren (łąki, morze, jeziora, pola, góry) → dekoracje (statyczne) → animacje.
   Ścieżkę, pola poziomów, chmury i interfejs rysuje index.html osobno, nad tymi warstwami.
   Motywy to organiczne kształty z krzywych Béziera z fakturą farby (filtry SVG).
   Każdy motyw można podmienić na malowaną grafikę: wpis w krainy-grafiki.json, np.
     {"latarnia":"grafiki/krainy/latarnia.webp"} → kwadrat 400×400 px, podstawa motywu na środku dolnej krawędzi.
   Układ jest stały: zależy tylko od numeru krainy i szerokości ekranu (co 10 px), nie od chwili rysowania. */
window.Krainy=(function(){
  const T="#4A3520";
  const o=w=>' stroke="'+T+'" stroke-width="'+(w||1.4)+'" stroke-linejoin="round" stroke-linecap="round"';
  const cien=(rx,cx)=>'<ellipse cx="'+(cx||50)+'" cy="97" rx="'+rx+'" ry="'+(rx*.2).toFixed(1)+'" fill="#23401B" opacity=".18"/>';
  const F=(v,s)=>(v*s).toFixed(1);
  /* ---------- drzewa ---------- */
  function sosna(x,y,s,k){
    k=k||["#2E6537","#5E9C58"];const f=v=>F(v,s);
    return '<g transform="translate('+x+' '+y+')">'
      +'<path d="M'+f(-2.4)+' 0C'+f(-2.4)+' '+f(-6)+' '+f(-2)+' '+f(-9)+' '+f(-1.6)+' '+f(-12)+'H'+f(1.6)+'C'+f(2)+' '+f(-9)+' '+f(2.4)+' '+f(-6)+' '+f(2.4)+' 0Z" fill="#7A5232"/>'
      +'<path d="M0 '+f(-52)+'C'+f(4)+' '+f(-44)+' '+f(8)+' '+f(-38)+' '+f(12)+' '+f(-33)+'C'+f(9)+' '+f(-32)+' '+f(8)+' '+f(-32)+' '+f(7)+' '+f(-32)+'C'+f(12)+' '+f(-26)+' '+f(16)+' '+f(-20)+' '+f(19)+' '+f(-15)+'C'+f(10)+' '+f(-10)+' '+f(-10)+' '+f(-10)+' '+f(-19)+' '+f(-15)+'C'+f(-16)+' '+f(-20)+' '+f(-12)+' '+f(-26)+' '+f(-7)+' '+f(-32)+'C'+f(-8)+' '+f(-32)+' '+f(-9)+' '+f(-32)+' '+f(-12)+' '+f(-33)+'C'+f(-8)+' '+f(-38)+' '+f(-4)+' '+f(-44)+' 0 '+f(-52)+'Z" fill="'+k[0]+'"'+o(1.1)+'/>'
      +'<path d="M0 '+f(-50)+'C'+f(-3)+' '+f(-43)+' '+f(-7)+' '+f(-37)+' '+f(-10)+' '+f(-33)+'C'+f(-6)+' '+f(-32)+' '+f(-5)+' '+f(-32)+' '+f(-5)+' '+f(-31)+'C'+f(-10)+' '+f(-25)+' '+f(-14)+' '+f(-20)+' '+f(-16)+' '+f(-16)+'C'+f(-10)+' '+f(-13)+' '+f(-4)+' '+f(-13)+' 0 '+f(-14)+'Z" fill="'+k[1]+'" opacity=".55"/></g>';
  }
  function drzewo(x,y,s,k){
    k=k||["#4F8F3E","#8CC266"];const f=v=>F(v,s);
    return '<g transform="translate('+x+' '+y+')">'
      +'<path d="M'+f(-3)+' 0C'+f(-2)+' '+f(-8)+' '+f(-3)+' '+f(-14)+' '+f(-6)+' '+f(-19)+'L'+f(-1)+' '+f(-17)+'L0 '+f(-24)+'L'+f(2)+' '+f(-17)+'L'+f(6)+' '+f(-20)+'C'+f(3)+' '+f(-14)+' '+f(2)+' '+f(-8)+' '+f(3)+' 0Z" fill="#7A5232"/>'
      +'<path d="M'+f(-20)+' '+f(-24)+'C'+f(-27)+' '+f(-28)+' '+f(-24)+' '+f(-42)+' '+f(-14)+' '+f(-42)+'C'+f(-12)+' '+f(-52)+' '+f(4)+' '+f(-56)+' '+f(10)+' '+f(-46)+'C'+f(20)+' '+f(-48)+' '+f(27)+' '+f(-36)+' '+f(21)+' '+f(-28)+'C'+f(25)+' '+f(-20)+' '+f(14)+' '+f(-14)+' '+f(7)+' '+f(-18)+'C'+f(2)+' '+f(-13)+' '+f(-10)+' '+f(-14)+' '+f(-12)+' '+f(-19)+'C'+f(-17)+' '+f(-17)+' '+f(-22)+' '+f(-20)+' '+f(-20)+' '+f(-24)+'Z" fill="'+k[0]+'"'+o(1.1)+'/>'
      +'<path d="M'+f(-15)+' '+f(-30)+'C'+f(-18)+' '+f(-38)+' '+f(-10)+' '+f(-45)+' '+f(-4)+' '+f(-43)+'C0 '+f(-50)+' '+f(10)+' '+f(-48)+' '+f(10)+' '+f(-42)+'C'+f(2)+' '+f(-40)+' '+f(-6)+' '+f(-34)+' '+f(-15)+' '+f(-30)+'Z" fill="'+k[1]+'" opacity=".7"/></g>';
  }
  function brzoza(x,y,s){
    const f=v=>F(v,s);
    return '<g transform="translate('+x+' '+y+')"><path d="M'+f(-1.8)+' 0C'+f(-1.4)+' '+f(-20)+' '+f(-1.2)+' '+f(-34)+' '+f(-.6)+' '+f(-44)+'H'+f(.8)+'C'+f(1.4)+' '+f(-30)+' '+f(1.8)+' '+f(-16)+' '+f(1.8)+' 0Z" fill="#F4F1EA"'+o(.9)+'/>'
      +'<path d="M'+f(-1.6)+' '+f(-10)+'h'+f(2)+'M'+f(-1.2)+' '+f(-22)+'h'+f(2)+'M'+f(-1)+' '+f(-32)+'h'+f(1.6)+'" stroke="#3A2A14" stroke-width="'+f(1.2)+'"/>'
      +'<path d="M'+f(-11)+' '+f(-26)+'C'+f(-16)+' '+f(-36)+' '+f(-8)+' '+f(-50)+' 0 '+f(-50)+'C'+f(9)+' '+f(-50)+' '+f(15)+' '+f(-36)+' '+f(10)+' '+f(-26)+'C'+f(6)+' '+f(-20)+' '+f(-6)+' '+f(-20)+' '+f(-11)+' '+f(-26)+'Z" fill="#9CC75E" opacity=".9"'+o(1)+'/></g>';
  }
  const kepa=(x,y,s,c)=>{const f=v=>F(v,s);return '<path transform="translate('+x.toFixed(1)+' '+y.toFixed(1)+')" d="M'+f(-9)+' 0C'+f(-8)+' '+f(-7)+' '+f(-5)+' '+f(-11)+' '+f(-4)+' '+f(-12)+'C'+f(-3)+' '+f(-8)+' '+f(-1)+' '+f(-6)+' 0 '+f(-14)+'C'+f(1)+' '+f(-7)+' '+f(4)+' '+f(-9)+' '+f(6)+' '+f(-11)+'C'+f(6)+' '+f(-6)+' '+f(8)+' '+f(-3)+' '+f(9)+' 0Z" fill="'+(c||"#8DB85A")+'"/>';};
  const kwiatki=(x,y,s)=>[[-8,-2,"#F7E27A"],[-2,-5,"#F4F1EA"],[5,-2,"#E98AA6"],[1,-1,"#F7E27A"],[9,-4,"#F4F1EA"]].map(([a,b,c])=>'<circle cx="'+(x+a*s).toFixed(1)+'" cy="'+(y+b*s).toFixed(1)+'" r="'+(1.8*s).toFixed(1)+'" fill="'+c+'"/>').join("");
  /* ---------- budynki ---------- */
  function dach(x1,x2,y,h,c,okap){okap=okap==null?4:okap;return '<path d="M'+(x1-okap)+' '+y+'C'+(x1+(x2-x1)*.2)+' '+(y-h*.55)+' '+(x1+(x2-x1)*.4)+' '+(y-h)+' '+((x1+x2)/2)+' '+(y-h)+'C'+(x1+(x2-x1)*.6)+' '+(y-h)+' '+(x1+(x2-x1)*.8)+' '+(y-h*.55)+' '+(x2+okap)+' '+y+'Z" fill="'+c+'"'+o()+'/>';}
  function sciana(x,y,w,h,c){return '<path d="M'+x+' '+y+'C'+(x-.6)+' '+(y-h*.5)+' '+(x+.4)+' '+(y-h)+' '+(x+.3)+' '+(y-h)+'H'+(x+w-.3)+'C'+(x+w-.4)+' '+(y-h)+' '+(x+w+.6)+' '+(y-h*.5)+' '+(x+w)+' '+y+'Z" fill="'+c+'"'+o()+'/>';}
  const okno=(x,y,w,h,c)=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="1.4" fill="'+(c||"#BFE3F2")+'"'+o(1.1)+'/>';
  const drzwi=(x,y,w,h,c)=>'<path d="M'+x+' '+y+'V'+(y-h+w/2)+'a'+(w/2)+' '+(w/2)+' 0 0 1 '+w+' 0V'+y+'Z" fill="'+(c||"#7A4E26")+'"'+o(1.1)+'/>';
  /* ---------- MOTYWY (pole 100×100, podstawa w punkcie 50,100) ---------- */
  const M={
    sosna:()=>cien(16)+sosna(50,98,1.75),
    las_iglasty:()=>cien(42)+sosna(26,94,1.25)+sosna(72,93,1.35)+sosna(48,99,1.7)+sosna(86,99,1.05)+sosna(12,99,1)+kepa(34,99,1)+kepa(64,99,1.1),
    drzewo:()=>cien(22)+drzewo(50,98,1.65),
    las_mieszany:()=>cien(42)+drzewo(28,92,1.15,["#4A8A3C","#8CC266"])+sosna(66,90,1.2)+drzewo(54,99,1.35)+sosna(14,99,1)+drzewo(84,99,1,["#6E9E3A","#A9CF6A"]),
    brzozy:()=>cien(28)+brzoza(36,97,1.3)+brzoza(56,99,1.6)+brzoza(72,96,1.2)+kepa(46,99,1),
    jablon:()=>cien(22)+drzewo(50,98,1.55,["#5A9A42","#94C66A"])+[[36,46],[56,40],[44,62],[62,56],[30,58],[52,52]].map(([a,b])=>'<circle cx="'+a+'" cy="'+b+'" r="3.2" fill="#E2483A"'+o(.9)+'/>').join(""),
    sad:()=>cien(44)+[[24,90,1.05],[70,88,1.1],[46,99,1.25],[88,99,.9]].map(([x,y,s])=>drzewo(x,y,s,["#5A9A42","#94C66A"])+'<circle cx="'+(x-5*s)+'" cy="'+(y-34*s)+'" r="'+2.6*s+'" fill="#E2483A"/><circle cx="'+(x+6*s)+'" cy="'+(y-40*s)+'" r="'+2.6*s+'" fill="#E2483A"/>').join(""),
    krzewy:()=>cien(30)+'<path d="M18 98C14 86 24 78 32 82C34 72 50 70 54 80C62 74 76 78 76 88C84 88 86 98 80 98Z" fill="#5E9A47"'+o()+'/><path d="M30 86C32 80 40 78 44 82" fill="none" stroke="#8CC266" stroke-width="3" stroke-linecap="round"/>'+kwiatki(50,94,1.2),
    kwiaty:()=>kepa(30,99,1.3)+kepa(60,99,1.5)+kwiatki(44,94,1.6)+kwiatki(66,96,1.3),
    stog:()=>cien(22)+'<path d="M30 98C28 80 36 64 50 62C64 64 72 80 70 98Z" fill="#E7C561"'+o()+'/><path d="M36 80C44 78 56 78 64 80M33 90C44 88 56 88 67 90" fill="none" stroke="#B9962F" stroke-width="1.8"/><path d="M50 62V54"'+o(2)+'/>',
    plot:()=>'<path d="M8 86C30 84 70 84 92 86M8 94C30 92 70 92 92 94" fill="none" stroke="#8A5C33" stroke-width="2.4" stroke-linecap="round"/>'+[14,30,46,62,78,90].map(x=>'<path d="M'+x+' 99V80" stroke="#7A4E26" stroke-width="3" stroke-linecap="round"/>').join(""),
    // wybrzeże
    wydma:()=>'<path d="M2 99C10 80 24 70 40 72C52 64 72 66 84 80C90 86 96 92 98 99Z" fill="#F0D79A"'+o()+'/><path d="M20 84C30 78 44 76 52 78" fill="none" stroke="#FFF3CF" stroke-width="3" stroke-linecap="round"/>'+kepa(30,82,1.1,"#9DBB5C")+kepa(58,76,1.2,"#9DBB5C")+kepa(78,86,1,"#9DBB5C"),
    latarnia:()=>cien(20)+'<path d="M40 98L43 34H57L60 98Z" fill="#F7F3EA"/><path d="M41.4 76L58.6 76L59.4 88L40.6 88ZM42.6 52L57.4 52L58 64L42 64Z" fill="#D9473B"/><path d="M40 98L43 34H57L60 98Z" fill="none"'+o()+'/><rect x="41" y="24" width="18" height="11" rx="2" fill="#F6D36B"'+o()+'/><path d="M39 25C42 16 58 16 61 25Z" fill="#D9473B"'+o()+'/><path d="M50 14V8"'+o(1.8)+'/><path d="M26 98V86C26 82 30 80 34 80H40V98Z" fill="#E9DCC3"'+o()+'/><path d="M24 84C26 76 36 74 40 78" fill="#C9503E"'+o()+'/>',
    molo:()=>'<path d="M0 66C34 64 66 64 100 66V72C66 70 34 70 0 72Z" fill="#C79A64"'+o()+'/>'+[8,26,44,62,80,96].map(x=>'<path d="M'+x+' 71V92" stroke="#7A4E26" stroke-width="3" stroke-linecap="round"/>').join("")+[14,50,86].map(x=>'<path d="M'+x+' 65V48"'+o(1.8)+'/><circle cx="'+x+'" cy="46" r="3" fill="#F6D36B"'+o(1.1)+'/>').join(""),
    promenada:()=>'<path d="M4 90C30 86 70 86 96 90V96C70 92 30 92 4 96Z" fill="#E4C99A"'+o()+'/>'+[18,50,82].map(x=>'<path d="M'+x+' 90V64"'+o(1.8)+'/><path d="M'+(x-5)+' 64C'+(x-5)+' 58 '+(x+5)+' 58 '+(x+5)+' 64Z" fill="#3E5F7A"'+o(1.1)+'/><circle cx="'+x+'" cy="66" r="2.4" fill="#F6D36B"/>').join("")+'<path d="M30 90V80H42V90M58 90V80H70V90" fill="#7FB6D8"'+o(1.1)+'/><path d="M28 80C32 74 40 74 44 80ZM56 80C60 74 68 74 72 80Z" fill="#E98AA6"'+o(1.1)+'/>',
    falochron:()=>[10,22,34,46,58,70,82].map((x,i)=>'<path d="M'+x+' '+(92-i*2)+'C'+(x-1)+' '+(84-i*2)+' '+(x+7)+' '+(84-i*2)+' '+(x+6)+' '+(92-i*2)+'Z" fill="#8A6038"'+o(1.1)+'/>').join(""),
    kaszubski_kwiat:()=>cien(18)+'<path d="M50 98V62" stroke="#3F7F45" stroke-width="3" stroke-linecap="round"/><path d="M50 80C40 78 34 70 36 64C44 66 48 72 50 80ZM50 74C60 72 66 64 64 58C56 60 52 66 50 74Z" fill="#5E9C58"'+o(1.1)+'/><path d="M50 62C38 62 32 48 38 38C42 44 46 46 50 46C54 46 58 44 62 38C68 48 62 62 50 62Z" fill="#2F6FB5"'+o()+'/><path d="M50 56C44 54 42 46 46 42C48 46 50 48 50 48C50 48 52 46 54 42C58 46 56 54 50 56Z" fill="#F6D36B"'+o(1.1)+'/><circle cx="50" cy="36" r="5" fill="#D9473B"'+o(1.1)+'/>',
    // domy
    chata:()=>cien(30)+sciana(26,98,48,30,"#EAD2A2")+dach(26,74,70,30,"#A9743E")+'<path d="M30 60C40 52 60 52 70 60" fill="none" stroke="#C8925A" stroke-width="2"/>'+okno(32,78,10,9)+okno(58,78,10,9)+drzwi(45,98,10,16)+'<path d="M64 46V36H70V50" fill="#B5643C"'+o(1.1)+'/>',
    chata_kaszubska:()=>cien(30)+sciana(24,98,52,28,"#F2E6D0")+dach(24,76,72,30,"#3E5F7A")+'<path d="M24 78H76" stroke="#2F6FB5" stroke-width="2.4"/>'+okno(30,80,10,9)+okno(60,80,10,9)+drzwi(45,98,10,16,"#2F6FB5")+'<circle cx="35" cy="76" r="2" fill="#D9473B"/><circle cx="65" cy="76" r="2" fill="#D9473B"/>',
    dom_podlaski:()=>cien(30)+sciana(24,98,52,30,"#5C9BCF")+dach(24,76,70,26,"#3F6A4A")+'<path d="M24 76H76" stroke="#F6D36B" stroke-width="2.4"/>'+okno(30,80,11,11,"#FFF")+okno(59,80,11,11,"#FFF")+'<path d="M28 80H43M57 80H72" stroke="#F6D36B" stroke-width="2.6" stroke-linecap="round"/><path d="M42 58C46 52 54 52 58 58" fill="none" stroke="#F6D36B" stroke-width="2"/>'+drzwi(46,98,8,12,"#F6D36B"),
    dom_murowany:()=>cien(26)+sciana(30,98,40,38,"#D98C5F")+dach(30,70,60,20,"#9A4A30")+okno(36,70,8,10,"#F6E7C0")+okno(56,70,8,10,"#F6E7C0")+drzwi(46,98,8,14)+'<path d="M30 84H70" stroke="#B5674A" stroke-width="1.4"/>',
    familok:()=>cien(36)+sciana(14,98,72,44,"#B5543C")+dach(14,86,54,14,"#7A3A2A",2)+[[20,62],[36,62],[52,62],[68,62],[20,78],[36,78],[52,78]].map(([x,y])=>okno(x,y,9,10,"#F6E7C0")).join("")+drzwi(68,98,10,16)+'<path d="M14 72H86" stroke="#D98C5F" stroke-width="1.6"/>',
    kamienice:()=>cien(40)+sciana(8,98,26,46,"#E8B66A")+'<path d="M8 52C12 40 30 40 34 52Z" fill="#E8B66A"'+o()+'/>'+sciana(34,98,30,58,"#E57D5D")+'<path d="M34 40L49 24L64 40Z" fill="#E57D5D"'+o()+'/>'+sciana(64,98,28,48,"#9FC7A8")+'<path d="M64 50C70 42 86 42 92 50Z" fill="#9FC7A8"'+o()+'/>'+[[14,60],[14,76],[42,48],[52,48],[42,66],[52,66],[70,60],[80,60],[70,78]].map(([x,y])=>okno(x,y,7,9,"#FFF3D6")).join("")+drzwi(44,98,10,14)+drzwi(80,98,8,12),
    gotyk:()=>cien(40)+sciana(10,98,38,48,"#B5543C")+'<path d="M10 50L29 18L48 50Z" fill="#B5543C"'+o()+'/><path d="M16 46L29 26L42 46" fill="none" stroke="#7A3A2A" stroke-width="1.6"/>'+sciana(52,98,38,42,"#C46A48")+'<path d="M52 56L71 28L90 56Z" fill="#C46A48"'+o()+'/>'+[[18,60],[34,60],[18,78],[60,64],[76,64]].map(([x,y])=>'<path d="M'+x+' '+(y+12)+'V'+(y+4)+'a4 4 0 0 1 8 0V'+(y+12)+'Z" fill="#F6E7C0"'+o(1)+'/>').join("")+drzwi(26,98,10,14)+drzwi(66,98,10,14),
    // zwierzęta
    zubr:()=>cien(34)+'<path d="M22 70C18 58 26 48 40 48C46 42 58 42 64 50C72 50 80 56 80 66C82 72 78 76 74 76V92H67V80C58 82 46 82 38 80V92H31V78C24 78 22 74 22 70Z" fill="#7A5232"'+o()+'/><path d="M40 48C36 56 36 68 40 76C32 76 24 74 22 68C20 58 28 48 40 48Z" fill="#5A3A22"'+o()+'/><path d="M28 56C24 52 22 46 26 44" fill="none"'+o(1.8)+'/><circle cx="31" cy="60" r="1.6" fill="#1D140A"/><path d="M24 66C26 70 30 70 32 68" fill="none" stroke="#3A2A14" stroke-width="1.6"/>',
    los:()=>cien(32)+'<path d="M28 66C28 58 36 54 46 54H64C72 54 76 58 76 64V92H70V74H40V92H34V74C30 72 28 70 28 66Z" fill="#8A5A34"'+o()+'/><path d="M64 54C66 46 70 40 76 40C82 40 84 46 82 52C80 56 74 58 70 56" fill="#8A5A34"'+o()+'/><path d="M72 40C68 32 70 26 74 24M76 40C80 32 86 30 88 34M72 32H66" fill="none"'+o(2)+'/><circle cx="78" cy="46" r="1.6" fill="#1D140A"/>',
    bocian:()=>cien(14)+'<path d="M46 98V80M54 98V80" stroke="#D9473B" stroke-width="2" stroke-linecap="round"/><path d="M40 72C38 62 44 56 52 58C58 60 62 66 60 74C56 80 44 80 40 72Z" fill="#F4F1EA"'+o()+'/><path d="M44 74C50 78 58 76 60 72C56 76 48 78 44 74Z" fill="#2B1D0E"/><path d="M52 58C52 50 54 44 58 42" fill="none" stroke="#F4F1EA" stroke-width="5" stroke-linecap="round"/><path d="M52 58C52 50 54 44 58 42" fill="none"'+o()+'/><path d="M60 42L74 40L60 44Z" fill="#E2483A"'+o(1)+'/>',
    koziolki:()=>cien(36)+[[30,1],[70,-1]].map(([x,d])=>'<g transform="translate('+x+' 0) scale('+d+' 1)"><path d="M-14 70C-14 62 -8 58 0 58H4L10 50L14 56C16 60 16 64 14 68V92H9V78H-6V92H-11V76C-13 74 -14 72 -14 70Z" fill="#F4F1EA"'+o()+'/><path d="M10 50C8 42 12 38 18 40" fill="none"'+o(1.8)+'/><circle cx="12" cy="56" r="1.4" fill="#1D140A"/></g>').join("")+'<path d="M38 52L50 44L62 52" fill="none" stroke="#F6D36B" stroke-width="2"/>',
    zyrafa:()=>cien(24)+'<path d="M34 98V70C34 62 38 58 46 58H52V26C52 20 56 16 62 16H66L70 22L62 24V60C68 60 72 66 72 72V98H66V78H60V98H54V80H44V98Z" fill="#F2B84A"'+o()+'/>'+[[42,68],[56,72],[64,86],[58,40],[60,30],[44,86]].map(([a,b])=>'<path d="M'+a+' '+b+'c3-2 6 0 5 3s-5 3-6 0z" fill="#B66A26"/>').join("")+'<path d="M58 18V12M64 18V12"'+o(1.6)+'/><circle cx="62" cy="21" r="1.4" fill="#1D140A"/>',
    dino:()=>cien(34)+'<path d="M14 88C20 76 34 70 46 72L54 42C56 34 64 30 70 34C76 38 74 46 68 48L64 50L60 72C70 74 76 82 76 92H68L66 86H56L54 92H46V86C34 88 22 92 14 88Z" fill="#7BB86A"'+o()+'/><path d="M44 70L46 62L50 68L52 58L56 66" fill="none"'+o(1.4)+'/><circle cx="68" cy="40" r="1.6" fill="#1D140A"/><path d="M30 80C36 78 42 78 46 80" fill="none" stroke="#A9D98A" stroke-width="3" stroke-linecap="round"/>',
    zuzel:()=>cien(34)+'<circle cx="28" cy="84" r="12" fill="none"'+o(2.4)+'/><circle cx="74" cy="84" r="12" fill="none"'+o(2.4)+'/><path d="M28 84L42 66H62L74 84M42 66L38 58H50" fill="none"'+o(2.2)+'/><path d="M46 52C42 44 46 36 54 36C60 36 62 42 60 48L54 66" fill="#2F6FB5"'+o()+'/><circle cx="54" cy="30" r="7" fill="#D9473B"'+o()+'/><path d="M8 94C14 86 20 88 18 94" fill="#C79A64" opacity=".8"/><path d="M4 92C8 84 12 86 10 92" fill="#C79A64" opacity=".6"/>',
    // zabytki
    cerkiew:()=>cien(34)+sciana(26,98,48,34,"#A06A3C")+dach(26,74,64,10,"#3F6A8A",3)+'<path d="M38 56V40H62V56" fill="#A06A3C"'+o()+'/><path d="M36 40C36 28 44 22 50 18C56 22 64 28 64 40Z" fill="#3F7FBF"'+o()+'/><path d="M50 18V8M46 12H54M47 15L53 11"'+o(1.6)+'/>'+drzwi(45,98,10,16,"#5A3A22")+okno(32,74,8,10,"#F6E7C0")+okno(60,74,8,10,"#F6E7C0"),
    kosciolek:()=>cien(34)+sciana(20,98,40,30,"#A06A3C")+dach(20,60,68,24,"#6B4220")+'<path d="M58 98V46H72V98" fill="#A06A3C"'+o()+'/><path d="M56 48C58 38 62 30 65 26C68 30 72 38 74 48Z" fill="#6B4220"'+o()+'/><path d="M65 26V16M61.5 19.5H68.5"'+o(1.6)+'/>'+drzwi(34,98,10,16,"#3A2A14"),
    pkin:()=>cien(34)+'<path d="M28 98V64H72V98Z" fill="#E7D7B5"'+o()+'/><path d="M34 64V44H66V64Z" fill="#E7D7B5"'+o()+'/><path d="M39 44V28H61V44Z" fill="#E7D7B5"'+o()+'/><path d="M44 28V18H56V28Z" fill="#E7D7B5"'+o()+'/><path d="M48 18L50 4L52 18Z" fill="#E7D7B5"'+o(1.1)+'/><path d="M14 98V78H28M86 98V78H72" fill="#E7D7B5"'+o()+'/><rect x="46" y="22" width="8" height="5" rx="1" fill="#F7F3EA"/>'+[[40,72],[52,72],[60,72],[40,84],[52,84],[60,84],[42,52],[52,52],[58,52],[46,34],[52,34]].map(([x,y])=>'<path d="M'+x+' '+y+'V'+(y+6)+'" stroke="#9A8A6A" stroke-width="2"/>').join(""),
    syrenka:()=>cien(22)+'<path d="M36 98C36 92 44 88 50 88C56 88 64 92 64 98Z" fill="#B8B2A2"'+o()+'/><path d="M48 88C40 82 38 72 42 64C44 58 50 54 52 48L58 52C56 60 52 64 52 72C54 78 60 82 64 80C62 86 56 90 48 88Z" fill="#5FAF9F"'+o()+'/><circle cx="50" cy="38" r="7" fill="#F3CFA6"'+o()+'/><path d="M43 36C44 28 56 28 57 36C54 32 46 32 43 36Z" fill="#F2B84A"'+o(1.1)+'/><path d="M44 54L30 62L36 70L46 60Z" fill="#C9B79A"'+o()+'/><path d="M58 50L74 22"'+o(2)+'/><path d="M72 18C76 20 78 24 76 28" fill="none"'+o(1.6)+'/>',
    zamek_krolewski:()=>cien(42)+sciana(8,98,84,34,"#E39B66")+dach(8,92,64,8,"#7A3A2A",2)+'<path d="M42 98V30H58V98" fill="#E39B66"'+o()+'/><path d="M40 32C42 22 46 16 50 12C54 16 58 22 60 32Z" fill="#3F6A4A"'+o()+'/><circle cx="50" cy="42" r="5" fill="#F7F3EA"'+o(1.1)+'/>'+[[14,72],[26,72],[66,72],[78,72],[14,84],[26,84],[66,84],[78,84]].map(([x,y])=>okno(x,y,7,8,"#F6E7C0")).join("")+drzwi(45,98,10,16),
    piernik:()=>cien(24)+'<path d="M50 30C58 30 62 36 60 42C68 42 76 48 74 56L66 58L70 84C70 92 62 94 60 88L52 74L44 88C42 94 34 92 34 84L38 58L30 56C28 48 36 42 44 42C42 36 44 30 50 30Z" fill="#B97A3E"'+o()+'/><path d="M44 36h.1M56 36h.1" stroke="#fff" stroke-width="3" stroke-linecap="round"/><path d="M44 42C48 46 52 46 56 42M38 60C44 62 56 62 62 60M40 70H60" fill="none" stroke="#FFF3E0" stroke-width="2" stroke-linecap="round" stroke-dasharray="1 4"/>',
    rogal:()=>cien(34)+'<path d="M16 86C14 70 28 56 50 56C72 56 86 70 84 86C78 80 72 80 68 86C66 78 58 74 50 76C42 74 34 78 32 86C28 80 22 80 16 86Z" fill="#E3A35A"'+o()+'/><path d="M34 64L38 80M50 60V78M66 64L62 80" stroke="#A86A2A" stroke-width="2" stroke-linecap="round"/><path d="M28 70C30 66 34 64 36 64" fill="none" stroke="#FFE3B0" stroke-width="2.4" stroke-linecap="round"/>'+[[42,62],[56,62],[48,70]].map(([a,b])=>'<circle cx="'+a+'" cy="'+b+'" r="1.4" fill="#FFF"/>').join(""),
    zamek:()=>cien(40)+'<path d="M12 98V52H22V44H28V52H36V36H46V30H54V36H64V52H72V44H78V52H88V98Z" fill="#CBB99A"'+o()+'/><path d="M40 36C42 24 46 18 50 14C54 18 58 24 60 36Z" fill="#C9503E"'+o()+'/>'+drzwi(42,98,16,22,"#6B4220")+okno(20,64,7,9,"#4A3520")+okno(74,64,7,9,"#4A3520")+'<path d="M16 76H84" stroke="#A89878" stroke-width="1.6"/>',
    palac:()=>cien(42)+sciana(6,98,88,30,"#F4E6C8")+'<path d="M2 70C20 60 80 60 98 70Z" fill="#B5643C"'+o()+'/><path d="M36 68V52H64V68" fill="#F4E6C8"'+o()+'/><path d="M34 54C40 44 60 44 66 54Z" fill="#3F6A4A"'+o()+'/>'+[[12,76],[24,76],[70,76],[82,76],[42,58],[52,58]].map(([x,y])=>okno(x,y,7,10,"#DCEEF6")).join("")+'<path d="M38 98V78H62V98" fill="#EADCBC"'+o(1.1)+'/>'+[42,50,58].map(x=>'<path d="M'+x+' 98V80" stroke="#B8A47E" stroke-width="2"/>').join(""),
    sky_tower:()=>cien(26)+'<path d="M38 98V16C38 10 44 6 50 6C56 6 62 10 62 16V98Z" fill="#A7CBE0"'+o()+'/><path d="M44 12V98M50 7V98M56 12V98" stroke="#6E98B5" stroke-width="1" opacity=".7"/><path d="M38 30C46 28 54 28 62 30M38 50C46 48 54 48 62 50M38 70C46 68 54 68 62 70" fill="none" stroke="#F7F3EA" stroke-width="1.4" opacity=".6"/><path d="M18 98V70H38M82 98V64H62" fill="#C9D6DE"'+o()+'/>',
    rynek:()=>cien(44)+sciana(4,98,20,40,"#F2B84A")+'<path d="M4 58C8 48 20 48 24 58Z" fill="#F2B84A"'+o()+'/>'+sciana(24,98,18,46,"#E57D5D")+'<path d="M24 52L33 40L42 52Z" fill="#E57D5D"'+o()+'/><path d="M42 98V36L50 12L58 36V98Z" fill="#C9B79A"'+o()+'/><path d="M46 36L50 16L54 36Z" fill="#9AA06A"'+o(1)+'/>'+sciana(58,98,18,46,"#9FC7A8")+'<path d="M58 52L67 40L76 52Z" fill="#9FC7A8"'+o()+'/>'+sciana(76,98,20,40,"#7FB6D8")+'<path d="M76 58C80 48 92 48 96 58Z" fill="#7FB6D8"'+o()+'/>'+[[9,66],[29,62],[63,62],[81,66],[46,50],[46,66]].map(([x,y])=>okno(x,y,6,8,"#FFF3D6")).join(""),
    manufaktura:()=>cien(44)+sciana(4,98,70,40,"#B5543C")+dach(4,74,58,8,"#7A3A2A",2)+[12,26,40,54].map(x=>'<path d="M'+x+' 92V72a4 4 0 0 1 8 0V92Z" fill="#F6D9A8"'+o(1)+'/>').join("")+'<path d="M76 98V18H88V98Z" fill="#B5543C"'+o()+'/><path d="M76 24H88" stroke="#7A3A2A" stroke-width="2"/><path d="M78 14C76 8 84 4 88 8" fill="none" stroke="#C9C9C9" stroke-width="3" stroke-linecap="round" opacity=".8"/>',
    szyb:()=>cien(40)+'<path d="M28 98L40 26H60L72 98" fill="none"'+o(2.4)+'/><path d="M33 72H67M36 50H64M30 86L58 50M70 86L42 50" fill="none" stroke="'+T+'" stroke-width="1.6"/><circle cx="40" cy="24" r="8" fill="#C9B79A"'+o()+'/><circle cx="60" cy="24" r="8" fill="#C9B79A"'+o()+'/><circle cx="40" cy="24" r="2" fill="'+T+'"/><circle cx="60" cy="24" r="2" fill="'+T+'"/>'+sciana(6,98,24,24,"#B5543C")+sciana(70,98,24,24,"#B5543C"),
    spodek:()=>cien(42)+'<path d="M6 62C20 46 80 46 94 62C82 74 18 74 6 62Z" fill="#A9B4BE"'+o()+'/><path d="M14 62C28 70 72 70 86 62" fill="none" stroke="#F4F1EA" stroke-width="2"/><path d="M22 70L14 98M78 70L86 98M38 72L34 98M62 72L66 98"'+o(2.2)+'/><path d="M24 56C34 52 50 50 60 52" fill="none" stroke="#fff" stroke-width="2" opacity=".6" stroke-linecap="round"/>',
    wawel:()=>cien(44)+sciana(6,98,88,28,"#F1E2C2")+'<path d="M2 72C24 64 76 64 98 72Z" fill="#B5643C"'+o()+'/>'+sciana(14,72,14,26,"#F1E2C2")+'<path d="M12 48C12 38 30 38 30 48Z" fill="#E7B54A"'+o()+'/><path d="M21 38V32"'+o(1.4)+'/>'+sciana(66,72,16,34,"#F1E2C2")+'<path d="M64 40L74 24L84 40Z" fill="#3F6A4A"'+o()+'/>'+[[12,80],[30,80],[48,80],[66,80],[82,80]].map(([x,y])=>okno(x,y,6,9,"#E6F2F8")).join(""),
    dab_bartek:()=>cien(44)+'<path d="M40 98C42 88 40 78 34 70L44 72L48 62L54 72L62 68C58 78 56 88 60 98Z" fill="#6B4220"'+o()+'/><path d="M8 52C2 40 12 26 26 28C30 14 50 10 60 20C72 12 92 22 90 38C98 46 92 60 80 60C76 70 60 72 54 66C46 72 30 72 26 64C14 66 6 60 8 52Z" fill="#4E8A35"'+o()+'/><path d="M20 40C24 32 34 30 40 34M56 26C64 22 74 26 76 32" fill="none" stroke="#7DBB5E" stroke-width="4" stroke-linecap="round"/>',
    jaskinia:()=>'<path d="M4 98C4 66 22 44 50 44C78 44 96 66 96 98Z" fill="#A89F8E"'+o()+'/><path d="M30 98C30 80 38 68 50 68C62 68 70 80 70 98Z" fill="#3A2A14"/><path d="M16 74C20 64 28 58 36 56M64 56C72 58 80 64 84 72" fill="none" stroke="#C9C0B0" stroke-width="3" stroke-linecap="round"/>'+kepa(14,98,1.2)+kepa(86,98,1.1),
    maczuga:()=>cien(20)+'<path d="M40 98C42 86 40 74 36 62C30 46 32 28 42 22C52 16 64 22 64 36C64 48 58 58 58 70C58 80 60 90 62 98Z" fill="#DCD5C4"'+o()+'/><path d="M44 30C48 26 54 26 58 30M42 50C46 48 50 48 54 52" fill="none" stroke="#B5AE9C" stroke-width="2" stroke-linecap="round"/>'+drzewo(24,98,.7)+sosna(78,98,.9),
    ul:()=>cien(20)+'<path d="M32 98V70C32 58 40 50 50 50C60 50 68 58 68 70V98Z" fill="#EBB846"'+o()+'/><path d="M32 74H68M32 86H68" stroke="#A86A2A" stroke-width="2"/><circle cx="50" cy="92" r="3" fill="'+T+'"/><path d="M28 98H72"'+o(2)+'/>',
    chmiel:()=>'<path d="M36 98V20M64 98V20"'+o(2)+'/><path d="M36 22C46 26 54 30 64 22" fill="none" stroke="#7A5232" stroke-width="1.4"/><path d="M36 30C44 44 56 50 64 64M64 30C56 44 44 50 36 64" fill="none" stroke="#3F7F45" stroke-width="2"/>'+[[42,40],[58,46],[44,58],[56,30],[50,72]].map(([a,b])=>'<path d="M'+a+' '+(b-6)+'C'+(a-5)+' '+(b-2)+' '+(a-4)+' '+(b+4)+' '+a+' '+(b+6)+'C'+(a+4)+' '+(b+4)+' '+(a+5)+' '+(b-2)+' '+a+' '+(b-6)+'Z" fill="#A9CF6A"'+o(1)+'/>').join("")+kepa(50,98,1.2),
    wiatrak:()=>cien(22)+'<path d="M38 98L42 50H58L62 98Z" fill="#C79A64"'+o()+'/><path d="M36 52C40 40 60 40 64 52Z" fill="#8A5C33"'+o()+'/>'+drzwi(46,98,8,12)
  };
  // ludzie w strojach regionalnych
  function postac(stroj){return cien(16)+stroj+'<circle cx="50" cy="30" r="8" fill="#F3CFA6"'+o()+'/><circle cx="47" cy="30" r="1.1" fill="#1D140A"/><circle cx="53" cy="30" r="1.1" fill="#1D140A"/><path d="M47 34C49 36 51 36 53 34" fill="none" stroke="#A0522D" stroke-width="1.2"/>';}
  M.opolanka=()=>postac('<path d="M38 96C38 74 42 56 50 50C58 56 62 74 62 96Z" fill="#2F6FB5"'+o()+'/><path d="M40 82C46 80 54 80 60 82" stroke="#F4F1EA" stroke-width="3"/><circle cx="44" cy="70" r="2" fill="#E2483A"/><circle cx="50" cy="66" r="2" fill="#F6D36B"/><circle cx="56" cy="70" r="2" fill="#E2483A"/><path d="M42 52C44 44 56 44 58 52" fill="#3A2A14"/><path d="M41 26C43 18 57 18 59 26C54 22 46 22 41 26Z" fill="#F4F1EA"'+o(1)+'/>');
  M.lowiczanka=()=>postac('<path d="M36 96C36 74 42 58 50 52C58 58 64 74 64 96Z" fill="#F2B84A"'+o()+'/><path d="M38 64H62M37 70H63M36 76H64M36 82H64M36 88H64" stroke="#E2483A" stroke-width="2.4"/><path d="M38 67H62M37 79H63M36 91H64" stroke="#3F7F45" stroke-width="1.6"/><path d="M36 73H64M36 85H64" stroke="#2F6FB5" stroke-width="1.6"/><path d="M42 54C44 46 56 46 58 54" fill="#3A2A14"/><path d="M40 26C42 16 58 16 60 26C56 20 44 20 40 26Z" fill="#E2483A"'+o(1)+'/>');
  M.krakowiak=()=>postac('<path d="M40 96V60C40 50 60 50 60 60V96H54V74H46V96Z" fill="#F4F1EA"'+o()+'/><path d="M40 60C40 50 60 50 60 60V72H40Z" fill="#2F6FB5"'+o()+'/><path d="M44 54V70M56 54V70" stroke="#F6D36B" stroke-width="1.6"/><path d="M40 24H60L58 18H42Z" fill="#E2483A"'+o(1)+'/><path d="M56 18C60 8 70 6 72 12C66 12 62 14 60 18" fill="#3F7FBF"'+o(1)+'/>');
  M.goral=()=>postac('<path d="M40 96V60C40 50 60 50 60 60V96H54V74H46V96Z" fill="#F4F1EA"'+o()+'/><path d="M40 60C40 52 60 52 60 60V70H40Z" fill="#7A5232"'+o()+'/><path d="M44 80L46 86M56 80L54 86" stroke="#E2483A" stroke-width="2"/><path d="M36 24H64"'+o(2)+'/><path d="M40 24C40 14 60 14 60 24" fill="#3A2A14"'+o(1)+'/><path d="M41 22H59" stroke="#F4F1EA" stroke-width="1.6"/>');
  /* ---------- motywy animowane (osobna warstwa) ---------- */
  const A={
    kuter:'<g class="a-bujanie"><path d="M14 74H86L76 90H24Z" fill="#D9473B"'+o()+'/><path d="M30 74V58H58V74" fill="#F4F1EA"'+o()+'/><path d="M50 58V48H58V58" fill="#3A2A14"/><path d="M34 64H40M46 64H52"'+o(1.6)+'/><path d="M64 74V36M64 40L82 60"'+o(1.6)+'/></g>',
    zaglowka:'<g class="a-bujanie"><path d="M24 78H76L68 90H32Z" fill="#8A5C33"'+o()+'/><path d="M50 18V78"'+o(1.6)+'/><path d="M52 22C66 36 72 54 74 74H52Z" fill="#F7F3EA"'+o()+'/><path d="M48 30C38 42 34 58 32 74H48Z" fill="#E98A6A"'+o()+'/></g>',
    mewa:'<g class="a-mewa"><path d="M30 50C36 42 44 42 50 50C56 42 64 42 70 50" fill="none" stroke="#4A3520" stroke-width="2.6" stroke-linecap="round"/></g>',
    smigla:'<g transform="translate(50 50)"><g class="a-smigla"><path d="M0 0L-5 -42H5ZM0 0L42 -5V5ZM0 0L5 42H-5ZM0 0L-42 5V-5Z" fill="#F4F1EA"'+o(1.2)+'/></g><circle r="4" fill="#4A3520"/></g>',
    pszczola:'<g class="a-pszczola"><ellipse cx="50" cy="50" rx="7" ry="5" fill="#F2B84A"'+o(1)+'/><path d="M48 46V54M52 46V54" stroke="#3A2A14" stroke-width="1.6"/><ellipse cx="47" cy="44" rx="4" ry="3" fill="#E6F4FB" opacity=".9"'+o(.8)+'/><ellipse cx="53" cy="43" rx="4" ry="3" fill="#E6F4FB" opacity=".9"'+o(.8)+'/></g>',
    szybowiec:'<g class="a-lot"><path d="M6 52C30 48 70 46 94 48L92 52C70 52 30 54 8 56Z" fill="#F7F3EA"'+o()+'/><path d="M36 52C42 46 56 46 62 50L58 56H40Z" fill="#E2483A"'+o()+'/><path d="M60 54L82 54L86 46" fill="none"'+o(1.4)+'/></g>',
    awionetka:'<g class="a-lot"><path d="M18 50C18 44 30 42 60 44C70 44 78 46 80 50C78 54 70 56 60 56C30 58 18 56 18 50Z" fill="#F2B84A"'+o()+'/><path d="M40 46L46 30H54L52 46M40 54L46 68H54L52 54" fill="#E2483A"'+o()+'/><path d="M84 40V60" stroke="#3A2A14" stroke-width="3" stroke-linecap="round"/><path d="M20 50L12 40H18L26 48Z" fill="#E2483A"'+o(1.1)+'/><circle cx="66" cy="48" r="3" fill="#BFE3F2"'+o(1)+'/></g>'
  };
  const SMIGLA={wiatrak:{x:50,y:46,s:.62}};
  /* ---------- REGIONY: teren i kompozycja ---------- */
  // f: motywy pierwszoplanowe (zabytki, większe), g: wypełnienie krajobrazu, a: animowane, t: teren
  const R={
    "zachodniopomorskie":{t:{morze:1},f:["latarnia","molo","promenada"],g:["las_iglasty","las_iglasty","wydma","sosna","las_mieszany","kwiaty","falochron"],a:["kuter","zaglowka","mewa","mewa"]},
    "pomorskie":{t:{morze:1},f:["latarnia","chata_kaszubska","kaszubski_kwiat"],g:["las_iglasty","wydma","sosna","las_mieszany","kwiaty","chata_kaszubska"],a:["zaglowka","kuter","mewa"]},
    "warmińsko-mazurskie":{t:{jeziora:3},f:["chata","chata"],g:["las_iglasty","las_mieszany","brzozy","sosna","krzewy","plot","bocian"],a:["zaglowka","zaglowka","mewa"]},
    "podlaskie":{t:{jeziora:1},f:["cerkiew","zubr","dom_podlaski","dom_podlaski"],g:["las_iglasty","las_mieszany","brzozy","kwiaty","bocian","plot"],a:[]},
    "mazowieckie":{t:{pola:2},f:["pkin","syrenka","zamek_krolewski","kamienice","los"],g:["sad","jablon","las_mieszany","kwiaty"],a:[]},
    "kujawsko-pomorskie":{t:{pola:2,jeziora:1},f:["piernik","gotyk","gotyk"],g:["las_mieszany","drzewo","stog","kwiaty"],a:["zaglowka"]},
    "wielkopolskie":{t:{jeziora:2},f:["koziolki","rogal","zamek"],g:["las_iglasty","las_mieszany","drzewo","kwiaty"],a:["zaglowka"]},
    "lubuskie":{t:{},f:["zuzel"],g:["las_iglasty","las_iglasty","las_mieszany","sosna","krzewy"],a:[]},
    "dolnośląskie":{t:{gory:"srednie"},f:["sky_tower","rynek","zamek","palac","dom_murowany"],g:["las_iglasty","las_mieszany","drzewo"],a:[]},
    "opolskie":{t:{pola:3},f:["opolanka","dino","dino"],g:["las_mieszany","drzewo","kwiaty","las_iglasty","stog","krzewy"],a:[]},
    "śląskie":{t:{gory:"niskie"},f:["szyb","spodek","zyrafa","familok"],g:["las_iglasty","drzewo","las_mieszany","familok","kwiaty","szyb"],a:[]},
    "łódzkie":{t:{pola:3},f:["manufaktura","lowiczanka","wiatrak","wiatrak"],g:["drzewo","stog","kwiaty","las_mieszany"],a:[]},
    "świętokrzyskie":{t:{pola:2,gory:"pagorki"},f:["dab_bartek","zamek","jaskinia"],g:["las_iglasty","las_mieszany","stog","drzewo"],a:[]},
    "lubelskie":{t:{pola:3},f:["palac","ul","ul","chmiel"],g:["sad","jablon","stog","kwiaty"],a:["pszczola","pszczola"]},
    "podkarpackie":{t:{gory:"poloniny",jeziora:1},f:["kosciolek","cerkiew"],g:["las_iglasty","las_mieszany","sosna","krzewy"],a:["szybowiec","awionetka","zaglowka"]},
    "małopolskie":{t:{gory:"tatry"},f:["wawel","krakowiak","goral","maczuga"],g:["las_iglasty","sosna","las_iglasty","chata"],a:[]}
  };
  /* ---------- pomocnicze ---------- */
  function los(z){let s=(z>>>0)||1;return()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};}
  function gladko(p,zamk){
    const n=p.length,g=i=>p[(i+n)%n];let d="M"+p[0][0].toFixed(1)+" "+p[0][1].toFixed(1);
    const max=zamk?n:n-1;
    for(let i=0;i<max;i++){const p0=zamk?g(i-1):p[Math.max(0,i-1)],p1=g(i),p2=zamk?g(i+1):p[Math.min(n-1,i+1)],p3=zamk?g(i+2):p[Math.min(n-1,i+2)];
      d+="C"+(p1[0]+(p2[0]-p0[0])/6).toFixed(1)+" "+(p1[1]+(p2[1]-p0[1])/6).toFixed(1)+" "+(p2[0]-(p3[0]-p1[0])/6).toFixed(1)+" "+(p2[1]-(p3[1]-p1[1])/6).toFixed(1)+" "+p2[0].toFixed(1)+" "+p2[1].toFixed(1);}
    return d+(zamk?"Z":"");
  }
  function plama(cx,cy,rx,ry,r,n,nier){n=n||9;nier=nier==null?.22:nier;const p=[];for(let i=0;i<n;i++){const a=i/n*Math.PI*2,k=1-nier+r()*nier*2;p.push([cx+Math.cos(a)*rx*k,cy+Math.sin(a)*ry*k]);}return gladko(p,true);}
  // próbki ścieżki: te same krzywe co w index.html
  function probkiSciezki(pts){const s=[];for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i],my=(a.y+b.y)/2;for(let t=0;t<=1;t+=.05){const u=1-t;s.push({x:u*u*u*a.x+3*u*u*t*a.x+3*u*t*t*b.x+t*t*t*b.x,y:u*u*u*a.y+3*u*u*t*my+3*u*t*t*my+t*t*t*b.y});}}return s;}
  const odlSciezki=(S,x,y)=>{let m=1e9;for(const p of S){const d=(p.x-x)*(p.x-x)+(p.y-y)*(p.y-y);if(d<m)m=d;}return Math.sqrt(m);};
  function xSciezki(S,y){let best=null,bd=1e9;for(const p of S){const d=Math.abs(p.y-y);if(d<bd){bd=d;best=p;}}return best?best.x:0;}
  /* ---------- malowane grafiki (opcjonalne) ---------- */
  let GRAFIKI={};
  function ustawGrafiki(g){GRAFIKI=g||{};}
  function motyw(id){if(GRAFIKI[id])return '<image href="'+GRAFIKI[id]+'" x="0" y="0" width="100" height="100" preserveAspectRatio="xMidYMax meet"/>';const f=M[id];return f?f():"";}
  /* ---------- TEREN ---------- */
  function teren(t,W,H,S,r,id,st){
    let h="";
    const ziel=["#8EC274","#7DB36B","#9BCB7E","#6FA75D"];
    for(let i=0;i<Math.round(H/80);i++){const x=r()*W,y=r()*H;h+='<path d="'+plama(x,y,60+r()*90,40+r()*60,r)+'" fill="'+ziel[i%4]+'" opacity=".55"/>';}
    for(let i=0;i<(t.pola||0)*2;i++){
      const y=60+r()*(H-140),strona=r()<.5,x=strona?4+r()*W*.12:W*.62+r()*W*.12,w=W*.26+r()*30,hh=44+r()*26,kol=["#E8CC6A","#C9D97A","#E2B95A","#B9D46E"][i%4];
      h+='<path d="'+gladko([[x,y],[x+w,y-6],[x+w+6,y+hh],[x-4,y+hh+4]],true)+'" fill="'+kol+'" stroke="#B89A4A" stroke-width="1.2" opacity=".9"/>';
      for(let k=1;k<5;k++)h+='<path d="M'+(x+k*w/5).toFixed(1)+' '+(y+2).toFixed(1)+'Q'+(x+k*w/5+4).toFixed(1)+' '+(y+hh/2).toFixed(1)+' '+(x+k*w/5+2).toFixed(1)+' '+(y+hh).toFixed(1)+'" stroke="#B89A4A" stroke-width="1" fill="none" opacity=".55"/>';
    }
    for(let i=0;i<(t.jeziora||0);i++){
      const y=90+((i+.5)/(t.jeziora))*(H-200)+r()*30,xs=xSciezki(S,y),lewa=xs>W/2,rx=Math.min(48,W*.13)+r()*14,ry=22+r()*10;
      const x=lewa?Math.max(rx+6,xs-60-rx):Math.min(W-rx-6,xs+60+rx);
      h+='<path d="'+plama(x,y,rx+7,ry+6,r,10,.12)+'" fill="#CFE3A8"/><path d="'+plama(x,y,rx,ry,r,10,.12)+'" fill="#7EBFE0" stroke="#4A7FA6" stroke-width="1.4"/>'
        +'<path d="M'+(x-rx*.5).toFixed(1)+' '+(y-ry*.2).toFixed(1)+'q8-4 16 0M'+x.toFixed(1)+' '+(y+ry*.3).toFixed(1)+'q8-4 16 0" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" opacity=".8"/>';
      st.jeziora.push({x,y,rx,ry});
    }
    if(t.gory){
      const typ=t.gory,wys=typ==="tatry"?H*.42:typ==="srednie"?H*.32:typ==="poloniny"?H*.3:H*.24;
      const kol=typ==="tatry"?["#94A3B6","#7E8EA3"]:typ==="poloniny"?["#A9CB78","#8EB863"]:typ==="pagorki"?["#9CC57A","#86B466"]:["#97ABA6","#7F9792"];
      for(let w=0;w<2;w++){
        const n=typ==="poloniny"||typ==="pagorki"?5:7,pp=[];
        for(let i=0;i<=n;i++)pp.push([i/n*W,(i%2?wys*(.1+r()*.18):wys*(.42+r()*.2))+w*wys*.24]);
        const d=(typ==="poloniny"||typ==="pagorki"?gladko(pp,false):"M"+pp.map(p=>p[0].toFixed(1)+" "+p[1].toFixed(1)).join("L"))+"L"+W+" "+(wys+80)+"L0 "+(wys+80)+"Z";
        h+='<path d="'+d+'" fill="'+kol[w]+'" stroke="#5E6E6C" stroke-width="1.2"/>';
        if(typ==="tatry"&&w===0)pp.forEach((p,i)=>{if(i%2)h+='<path d="M'+(p[0]-14).toFixed(1)+' '+(p[1]+15).toFixed(1)+'L'+p[0].toFixed(1)+' '+p[1].toFixed(1)+'L'+(p[0]+14).toFixed(1)+' '+(p[1]+15).toFixed(1)+'Q'+(p[0]+6).toFixed(1)+' '+(p[1]+11).toFixed(1)+' '+p[0].toFixed(1)+' '+(p[1]+17).toFixed(1)+'Q'+(p[0]-6).toFixed(1)+' '+(p[1]+11).toFixed(1)+' '+(p[0]-14).toFixed(1)+' '+(p[1]+15).toFixed(1)+'Z" fill="#F7FBFF" stroke="#8E9DB0" stroke-width="1"/>';});
      }
      h+='<path d="M0 '+(wys+60)+'Q'+W/2+' '+(wys+30)+' '+W+' '+(wys+60)+'V'+(wys+90)+'H0Z" fill="#7DB36B" opacity=".7"/>';
      if(typ==="tatry"){const gx=W*.8,gy=wys*.06;
        h+='<path d="M'+(gx-52)+' '+(wys*.55)+'C'+(gx-30)+' '+(gy+30)+' '+(gx-16)+' '+(gy+6)+' '+gx+' '+gy+'C'+(gx+14)+' '+(gy+14)+' '+(gx+30)+' '+(gy+40)+' '+(gx+52)+' '+(wys*.55)+'Z" fill="#8494A9" stroke="#5E6E6C" stroke-width="1.4"/><path d="M'+(gx-10)+' '+(gy+12)+'L'+gx+' '+gy+'L'+(gx+9)+' '+(gy+10)+'Q'+gx+' '+(gy+8)+' '+(gx-10)+' '+(gy+12)+'Z" fill="#fff"/><path d="M'+gx+' '+(gy-1)+'V'+(gy-16)+'M'+(gx-5)+' '+(gy-11)+'H'+(gx+5)+'" stroke="#3A2A14" stroke-width="2.2" stroke-linecap="round"/>';}
    }
    if(t.morze){
      const brzeg=[],plaza=[];
      for(let y=-40;y<=H+40;y+=40){const xs=xSciezki(S,Math.max(0,Math.min(H,y)));const xb=Math.max(30,Math.min(W*.44,xs-66+Math.sin(y/55)*8));brzeg.push([xb,y]);plaza.push([xb+18+Math.sin(y/37)*4,y]);}
      st.morze=brzeg;
      h+='<path d="'+gladko(plaza,false)+'L-10 '+(H+40)+'L-10 -40Z" fill="#F2DDA4"/>';
      h+='<path d="'+gladko(brzeg,false)+'L-10 '+(H+40)+'L-10 -40Z" fill="#62ADD8"/>';
      h+='<path d="'+gladko(brzeg.map(p=>[p[0]*.5,p[1]]),false)+'L-10 '+(H+40)+'L-10 -40Z" fill="#3E8EC4" opacity=".5"/>';
      h+='<path d="'+gladko(brzeg.map(p=>[p[0]-5,p[1]]),false)+'" fill="none" stroke="#fff" stroke-width="3" opacity=".8" stroke-linecap="round"/>';
    }
    // faktura farby (drobne ziarno) na całym terenie
    h+='<rect width="'+W+'" height="'+H+'" filter="url(#ziarno'+id+')" opacity=".2"/>';
    return h;
  }
  /* ---------- ROZMIESZCZENIE ---------- */
  function warstwy(woj,W,H,pts,baner,ziarno,id){
    const reg=R[woj];if(!reg)return {teren:"",deko:"",anim:""};
    const r=los(ziarno+Math.round(W/10)*7919),st={morze:null,jeziora:[]};
    const S=probkiSciezki(pts);
    const ter=teren(reg.t,W,H,S,r,id,st);
    const wezly=pts.filter(p=>p.y>-60&&p.y<H+60);
    const naMorzu=(x,y)=>{if(!st.morze)return false;let b=st.morze[0],bd=1e9;for(const p of st.morze){const d=Math.abs(p[1]-y);if(d<bd){bd=d;b=p;}}return x<b[0]-6;};
    const wJeziorze=(x,y,pad)=>st.jeziora.some(z=>((x-z.x)/(z.rx+pad))**2+((y-z.y)/(z.ry+pad))**2<1);
    const zajete=[];
    // prostokąt, który motyw naprawdę zajmuje (pole 100×100 z podstawą w y+34·s)
    const prost=(cx,cy,s)=>({x1:cx-46*s,x2:cx+46*s,y1:cy-64*s,y2:cy+34*s});
    const odlProst=(p,q)=>Math.hypot(Math.max(q.x1-p.x,0,p.x-q.x2),Math.max(q.y1-p.y,0,p.y-q.y2));
    // pole poziomu z gwiazdkami pod spodem: tego nie wolno zasłonić
    const polaR=wezly.map(p=>({x1:p.x-36,x2:p.x+36,y1:p.y-36,y2:p.y+50}));
    const kolizja=(a,b,zapas)=>a.x1<b.x2+zapas&&a.x2>b.x1-zapas&&a.y1<b.y2+zapas&&a.y2>b.y1-zapas;
    // bezpieczny odstęp: 16 px od krawędzi ścieżki i od pól poziomów; baner krainy bez ozdób
    function wolne(cx,cy,s,nakl){
      const q=prost(cx,cy,s);
      if(q.x1<-4||q.x2>W+4||q.y1<-10||q.y2>H-2)return false;
      for(const p of S)if(odlProst(p,q)<17+16)return false;
      if(polaR.some(p=>kolizja(q,p,10)))return false;
      if(baner&&q.y2>baner.top&&q.y1<baner.bottom)return false;
      if(naMorzu(cx,cy+30*s)||naMorzu(q.x1+8*s,cy+30*s)||wJeziorze(cx,cy+30*s,6))return false;
      // motywy mogą się lekko zachodzić (las za domem), ale nie przykrywać całkiem
      return !zajete.some(z=>{const ix=Math.min(z.x2,q.x2)-Math.max(z.x1,q.x1),iy=Math.min(z.y2,q.y2)-Math.max(z.y1,q.y1);if(ix<=0||iy<=0)return false;return ix*iy>(1-nakl)*Math.min((z.x2-z.x1)*(z.y2-z.y1),(q.x2-q.x1)*(q.y2-q.y1));});
    }
    const elem=[];
    function postaw(id,s,nakl,proby){for(let i=0;i<proby;i++){const cx=46*s+r()*(W-92*s),cy=64*s+r()*(H-98*s);if(wolne(cx,cy,s,nakl)){zajete.push(prost(cx,cy,s));elem.push({id,x:cx,y:cy,s});return true;}}return false;}
    reg.f.forEach(id=>{if(!postaw(id,1.05+r()*.2,.85,200))if(!postaw(id,.9,.75,240))postaw(id,.74,.7,300);});
    const ile=Math.round(W*H/8500),licz={},LIMIT={chata:2,chata_kaszubska:2,dom_podlaski:2,dom_murowany:2,familok:2,szyb:2,stog:3,wydma:3,falochron:2,plot:2,bocian:2,kamienice:1,gotyk:2};
    for(let i=0;i<ile;i++){const id=reg.g[i%reg.g.length];if(LIMIT[id]&&(licz[id]||0)>=LIMIT[id])continue;if(postaw(id,.66+r()*.3,.62,40))licz[id]=(licz[id]||0)+1;}
    let drobne="";
    for(let i=0;i<Math.round(W*H/5200);i++){const x=r()*W,y=r()*H;if(odlSciezki(S,x,y)>36&&!naMorzu(x,y)&&!wJeziorze(x,y,2)&&!wezly.some(p=>Math.hypot(p.x-x,p.y-y)<50)&&!(baner&&y>baner.top&&y<baner.bottom))drobne+=r()<.6?kepa(x,y,.9+r()*.5,["#8DB85A","#77A84C","#A5C870"][i%3]):kwiatki(x,y,.9);}
    // niższe motywy zasłaniają wyższe, jak w krajobrazie
    elem.sort((a,b)=>a.y-b.y);
    let deko=drobne;
    elem.forEach(e=>{const sz=100*e.s;deko+='<g transform="translate('+(e.x-sz/2).toFixed(1)+' '+(e.y+34*e.s-sz).toFixed(1)+') scale('+e.s.toFixed(2)+')">'+motyw(e.id)+'</g>';});
    // animacje: łodzie na wodzie, ptaki i samoloty w powietrzu, śmigła wiatraków, pszczoły
    let anim="";
    if(st.morze){let fale="";for(let y=26;y<H;y+=36){let b=st.morze[0];for(const p of st.morze)if(Math.abs(p[1]-y)<Math.abs(b[1]-y))b=p;const n=Math.floor((b[0]-26)/12);if(n<2)continue;let d="M6 "+y;for(let k=0;k<n;k++)d+="q3-4 6 0t6 0";fale+='<path d="'+d+'" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" opacity=".75"/>';}anim+='<g class="a-fale">'+fale+'</g>';}
    reg.a.forEach(id=>{
      const woda=id==="kuter"||id==="zaglowka";let x=null,y=null;
      for(let k=0;k<120;k++){const cx=16+r()*(W-32),cy=40+r()*(H-80);
        if(woda){if(st.morze?naMorzu(cx+24,cy):wJeziorze(cx,cy,-16)){x=cx;y=cy;break;}}
        else if(odlSciezki(S,cx,cy)>44&&!wezly.some(p=>Math.hypot(p.x-cx,p.y-cy)<64)&&!(baner&&cy>baner.top-20&&cy<baner.bottom+20)){x=cx;y=cy;break;}}
      if(x==null)return;
      const s=woda?(st.morze?.52:.36):id==="mewa"?.36:id==="pszczola"?.34:.5;
      anim+='<g transform="translate('+(x-50*s).toFixed(1)+' '+(y-50*s).toFixed(1)+') scale('+s+')">'+A[id]+'</g>';
    });
    elem.forEach(e=>{const sm=SMIGLA[e.id];if(sm&&!GRAFIKI[e.id]){const sz=100*e.s,x0=e.x-sz/2,y0=e.y+34*e.s-sz;anim+='<g transform="translate('+(x0+(sm.x-50*sm.s)*e.s).toFixed(1)+' '+(y0+(sm.y-50*sm.s)*e.s).toFixed(1)+') scale('+(sm.s*e.s).toFixed(2)+')">'+A.smigla+'</g>';}});
    return {teren:ter,deko,anim,ile:elem.length,motywy:elem.map(e=>e.id)};
  }
  function filtry(id){
    return '<defs><filter id="pedzel'+id+'" x="-2%" y="-2%" width="104%" height="104%"><feTurbulence type="fractalNoise" baseFrequency=".04" numOctaves="2" seed="'+id+'"/><feDisplacementMap in="SourceGraphic" scale="3"/></filter>'
      +'<filter id="pedzelD'+id+'" x="-2%" y="-2%" width="104%" height="104%"><feTurbulence type="fractalNoise" baseFrequency=".09" numOctaves="1" seed="'+(id+5)+'"/><feDisplacementMap in="SourceGraphic" scale="1.6"/></filter>'
      +'<filter id="ziarno'+id+'"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="'+(id+3)+'"/><feColorMatrix values="0 0 0 0 .25  0 0 0 0 .2  0 0 0 0 .1  0 0 0 .9 0"/></filter></defs>';
  }
  // jedna kraina = trzy warstwy SVG: teren, dekoracje, animacje (wszystkie bez przechwytywania kliknięć)
  function kraina(woj,W,H,pts,baner,ziarno,id){
    const w=warstwy(woj,W,H,pts,baner,ziarno,id);
    const sv=(cls,tresc,filtr)=>'<svg class="'+cls+'" width="'+W+'" height="'+H+'" viewBox="0 0 '+W+' '+H+'" aria-hidden="true" focusable="false">'+tresc+'</svg>';
    return {teren:sv("k-teren",filtry(id)+'<g filter="url(#pedzel'+id+')">'+w.teren+'</g>'),deko:sv("k-deko",filtry(id+100)+'<g filter="url(#pedzelD'+(id+100)+')">'+w.deko+'</g>'),anim:sv("k-anim",w.anim),ile:w.ile,motywy:w.motywy};
  }
  return {kraina,ustawGrafiki,MOTYWY:M,ANIMOWANE:A,REGIONY:R,motyw};
})();
