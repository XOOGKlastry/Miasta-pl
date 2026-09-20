/* PolskoZnawca boot: Miasta na czas bez wyboru wielkości, Esri od razu. */
document.addEventListener("DOMContentLoaded",function(){
  if(/miasta\.html/.test(location.pathname||"")){
    var sc=document.getElementById("scope");
    if(sc){sc.style.display="none";sc.innerHTML="";}
    var msg=document.getElementById("msg");
    if(msg) msg.textContent="Wybierz czas i województwo, potem naciśnij Start. Wszystkie miasta biorą udział.";
  }
  function kick(){
    document.querySelectorAll(".leaflet-control-layers-base label").forEach(function(l){
      if(/Esri/i.test(l.textContent||"")){
        var i=l.querySelector("input");
        if(i&&!i.checked)i.click();
      }
    });
    var b=document.getElementById("imgEsri");
    if(b) b.click();
  }
  setTimeout(kick,400);
  setTimeout(kick,1400);
});
