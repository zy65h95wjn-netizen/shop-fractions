'use strict';
const frames=[...document.querySelectorAll('iframe')];
const apis=()=>frames.map(f=>f.contentWindow.__hollyFrame);
const each=fn=>apis().forEach(a=>{if(a)fn(a)});
const $=id=>document.getElementById(id),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
let ready=false,auto=true,sway=true,closeup=false,previous=0,accumulator=0,time=0;
let view=[0,0],target=[0,0],look=null,depthAvailable=true,offlineReady=false;
function swayUI(){ $('sway').setAttribute('aria-pressed',sway) }
function updateStatus(){
 $('status').textContent=depthAvailable?(offlineReady?'Ready offline · original artwork · silent preview':'Original artwork · small viewing range · silent preview'):'Reduced graphics · original motion works; depth needs WebGL';
}
function setView(x,y,immediate=false){
 target=[clamp(x,-.12,.12),clamp(y,-.075,.075)];
 if(immediate){view=[...target];each(a=>a.view(...view))}
}
function front(){sway=false;look=null;swayUI();setView(0,0,true);each(a=>a.draw())}
function setAuto(value){auto=value;each(a=>a.auto(auto));$('auto').setAttribute('aria-pressed',auto);$('auto').textContent=auto?'Auto on':'Auto off'}
function changeView(value){
 cancel();document.querySelector('.comparison').dataset.view=value;
 document.querySelectorAll('button[data-view]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.view===value));
 each(a=>a.resize());
}
document.querySelectorAll('button[data-view]').forEach(b=>b.onclick=()=>changeView(b.dataset.view));
$('auto').onclick=()=>setAuto(!auto);
$('sway').onclick=()=>{sway=!sway;swayUI();if(!sway)setView(0,0,true)};
$('front').onclick=front;
$('bounce').onclick=()=>each(a=>a.bounce());
$('closeup').onclick=()=>{closeup=!closeup;$('closeup').setAttribute('aria-pressed',closeup);$('closeup').textContent=closeup?'Full portrait':'Closer look';each(a=>a.closeup(closeup))};
window.__hollyRelay=data=>{
 if(!ready)return;
 if(data.type==='pointerdown'){sway=false;swayUI();target=[...view]}
 each(a=>a.pointer(data));
};
window.__hollyLook=data=>{
 if(!ready||!depthAvailable)return;
 if(data.type==='pointerdown'&&!look){sway=false;swayUI();look={id:data.id,x:data.x,y:data.y,view:[...view]}}
 if(look?.id!==data.id)return;
 if(data.type==='pointermove')setView(look.view[0]+(data.x-look.x)*.0013,look.view[1]+(data.y-look.y)*.0008);
 if(data.type==='pointerup'||data.type==='pointercancel')look=null;
};
function cancel(){each(a=>a.cancel());look=null;previous=0;accumulator=0}
document.addEventListener('visibilitychange',cancel);window.addEventListener('blur',cancel);
window.addEventListener('resize',()=>each(a=>a.resize()));
function tick(dt){
 each(a=>a.tick(dt));time+=dt;
 if(sway&&depthAvailable){const fade=clamp((time-.6)/1.4,0,1);setView(Math.sin(time*.62)*.095*fade,Math.sin(time*.43)*.035*fade)}
 const blend=1-Math.exp(-dt*12);view=view.map((v,i)=>v+(target[i]-v)*blend);
 each(a=>a.view(...view));
}
function draw(){each(a=>a.draw())}
function loop(now){
 if(!ready&&apis().every(a=>a?.ready())){
  ready=true;each(a=>a.preset('playful'));depthAvailable=apis()[1].snapshot().renderer==='webgl';
  $('loading').hidden=true;document.querySelectorAll('[disabled]').forEach(b=>b.disabled=false);
  if(!depthAvailable){sway=false;swayUI();$('sway').disabled=$('front').disabled=true;$('depthLabel').textContent='2D fallback';$('hint').textContent='Tap or drag Holly to play.'}
  updateStatus();
 }
 if(ready&&!document.hidden){if(previous)accumulator+=Math.min(.05,(now-previous)/1000);while(accumulator>=1/120){tick(1/120);accumulator-=1/120}draw()}
 previous=now;requestAnimationFrame(loop);
}
window.__holly25d={ready:()=>ready,apis,tick,draw,front,setAuto,changeView,setView,
 reset:()=>{cancel();each(a=>a.reset());time=0;front()},
 snapshot:()=>({view:[...view],target:[...target],auto,sway,closeup,depthAvailable,offlineReady,time}),
};
setTimeout(()=>{if(!ready)$('loading').textContent='Still loading Holly. If this stays here, reload once with a connection.'},20000);
if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js',{scope:'./'}).then(()=>navigator.serviceWorker.ready).then(()=>{offlineReady=true;updateStatus()}).catch(()=>{$('status').textContent='Preview ready · offline save unavailable'});
requestAnimationFrame(loop);
