'use strict';
const frames=[...document.querySelectorAll('iframe')],apis=()=>frames.map(f=>f.contentWindow.__hollyFrame);
const each=fn=>apis().forEach(a=>{if(a)fn(a)}),$=id=>document.getElementById(id);
let ready=false,auto=true,closeup=false,previous=0,accumulator=0,offlineReady=false;
function setAuto(value){auto=value;each(a=>a.auto(auto));$('auto').setAttribute('aria-pressed',auto);$('auto').textContent=auto?'Auto on':'Auto off'}
function changeView(value){cancel();document.querySelector('.comparison').dataset.view=value;document.querySelectorAll('button[data-view]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.view===value));each(a=>a.resize())}
function reset(){cancel();each(a=>a.reset())}
document.querySelectorAll('button[data-view]').forEach(b=>b.onclick=()=>changeView(b.dataset.view));
$('auto').onclick=()=>setAuto(!auto);$('bounce').onclick=()=>each(a=>a.bounce());$('reset').onclick=reset;
$('closeup').onclick=()=>{closeup=!closeup;$('closeup').setAttribute('aria-pressed',closeup);$('closeup').textContent=closeup?'Full portrait':'Closer look';each(a=>a.closeup(closeup))};
window.__hollyRelay=data=>{if(ready)each(a=>a.pointer(data))};
function cancel(){each(a=>a.cancel());previous=0;accumulator=0}
document.addEventListener('visibilitychange',cancel);window.addEventListener('blur',cancel);window.addEventListener('resize',()=>each(a=>a.resize()));
function tick(dt){each(a=>a.tick(dt))}function draw(){each(a=>a.draw())}
function loop(now){
 if(!ready&&apis().every(a=>a?.ready())){ready=true;each(a=>a.preset('playful'));$('loading').hidden=true;document.querySelectorAll('[disabled]').forEach(b=>b.disabled=false)}
 if(ready&&!document.hidden){if(previous)accumulator+=Math.min(.05,(now-previous)/1000);while(accumulator>=1/120){tick(1/120);accumulator-=1/120}draw()}
 previous=now;requestAnimationFrame(loop);
}
window.__hollyBounce={ready:()=>ready,apis,tick,draw,setAuto,changeView,reset,snapshot:()=>({auto,closeup,offlineReady})};
setTimeout(()=>{if(!ready)$('loading').textContent='Still loading Holly. If this stays here, reload once with a connection.'},20000);
if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js',{scope:'./'}).then(()=>navigator.serviceWorker.ready).then(()=>{offlineReady=true;$('status').textContent='Ready offline · original artwork · silent preview'}).catch(()=>{$('status').textContent='Preview ready · offline save unavailable'});
requestAnimationFrame(loop);
