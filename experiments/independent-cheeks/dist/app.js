import {Physics,DEFAULTS,REGIONS,WIDTH,HEIGHT} from './physics.js';
import {Renderer} from './renderer.js';

const $=id=>document.getElementById(id);
const engine=new Physics();
const surface=$('surface'),canvas=$('canvas'),portrait=$('portrait');
let renderer=null,raf=0,last=0,original=false,ready=false,lost=false;
const testButtons=[$('test-left'),$('test-right')];
testButtons.forEach(b=>b.disabled=true);
const svg=$('zones-overlay');
REGIONS.forEach((r,i)=>{
  const polygon=document.createElementNS('http://www.w3.org/2000/svg','polygon');
  polygon.setAttribute('points',r.outline.map(p=>p.join(',')).join(' '));
  polygon.setAttribute('class',`touch-zone zone-${r.name}`);
  svg.append(polygon);
  const text=document.createElementNS('http://www.w3.org/2000/svg','text');
  text.setAttribute('x',r.center[0]);text.setAttribute('y',r.center[1]+6);
  text.setAttribute('class','zone-label');text.textContent=i===0?'L':'R';svg.append(text);
});

function status() {
  $('mode-status').textContent=!ready?'Original artwork':original?'Viewing original':
    engine.settings.linked===0?'Soft crease · unlinked':`Linked · ${engine.settings.linked}%`;
  engine.bodies.forEach((b,i)=>{
    $(i===0?'left-state':'right-state').textContent=b.pointer!==null?'Held':b.sleeping?'Resting':'Settling';
    $(i===0?'left-meter':'right-meter').style.width=`${Math.min(100,Math.hypot(b.x,b.y)/REGIONS[i].limit*100)}%`;
  });
}
function cancelPointers() {
  for(const id of engine.pointers.keys()) {
    if(svg.hasPointerCapture(id)) svg.releasePointerCapture(id);
  }
  engine.reset();
}
function stop() {
  cancelAnimationFrame(raf);raf=0;last=0;
  cancelPointers();surface.classList.remove('is-moving');status();
}
function frame(time) {
  raf=0;
  if(!ready || original || document.hidden) {last=0;return;}
  engine.advance(last ? (time-last)/1000 : 1/60);last=time;
  renderer.draw(engine.bodies);status();
  surface.classList.toggle('is-moving',engine.active);
  if(engine.active) raf=requestAnimationFrame(frame); else last=0;
}
function wake() { if(ready && !original && !raf && !document.hidden) raf=requestAnimationFrame(frame); }
function point(e) {
  const rect=surface.getBoundingClientRect();
  return [(e.clientX-rect.left)*WIDTH/rect.width,(e.clientY-rect.top)*HEIGHT/rect.height];
}
svg.addEventListener('pointerdown',e=>{
  if(!ready || original || (e.pointerType==='mouse' && e.button!==0)) return;
  const [x,y]=point(e);
  if(engine.down(e.pointerId,x,y,e.timeStamp)<0) return;
  svg.setPointerCapture(e.pointerId);e.preventDefault();wake();
});
svg.addEventListener('pointermove',e=>{
  if(!engine.pointers.has(e.pointerId)) return;
  const samples=typeof e.getCoalescedEvents==='function'?e.getCoalescedEvents():[];
  for(const sample of samples.length?samples:[e]) {
    const [x,y]=point(sample);engine.move(e.pointerId,x,y,sample.timeStamp);
  }
  e.preventDefault();wake();
});
function release(e,cancelled) {
  engine.up(e.pointerId,e.timeStamp,cancelled);
  if(svg.hasPointerCapture(e.pointerId)) svg.releasePointerCapture(e.pointerId);
  wake();
}
svg.addEventListener('pointerup',e=>release(e,false));
svg.addEventListener('pointercancel',e=>release(e,true));
svg.addEventListener('lostpointercapture',e=>{if(engine.pointers.has(e.pointerId)) release(e,true);});
svg.addEventListener('contextmenu',e=>e.preventDefault());

for(const key of Object.keys(DEFAULTS)) {
  const input=$(key);
  const update=()=>{
    engine.set(key,Number(input.value));
    $(key+'-value').textContent=key==='linked'?(input.value==='0'?'Off · 0%':input.value+'%'):input.value;
    input.style.setProperty('--fill',`${Number(input.value)/Number(input.max)*100}%`);
    input.setAttribute('aria-valuetext',key==='linked'?`${input.value} percent spring coupling`:input.value+' out of 100');
    status();wake();
  };
  input.addEventListener('input',update);update();
}
function setOriginal(value) {
  stop();original=value;
  surface.classList.toggle('paused',original);
  $('original').setAttribute('aria-pressed',String(original));
  $('original').textContent=original?'Return to motion':'View original';
  testButtons.forEach(b=>b.disabled=original || !ready);status();
}
$('original').addEventListener('click',()=>setOriginal(!original));
$('stop').addEventListener('click',stop);
$('defaults').addEventListener('click',()=>{
  stop();
  for(const [key,value] of Object.entries(DEFAULTS)) {$(key).value=value;$(key).dispatchEvent(new Event('input'));}
  setOriginal(false);
});
$('zones').addEventListener('click',()=>{
  const enabled=surface.classList.toggle('show-zones');
  $('zones').setAttribute('aria-pressed',String(enabled));
  $('zones').innerHTML=(enabled?'Hide touch zones':'Show touch zones')+' <span aria-hidden="true">⌖</span>';
});
testButtons.forEach((button,i)=>button.addEventListener('click',()=>{engine.impulse(i);wake();}));
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
window.addEventListener('blur',stop);
window.addEventListener('pagehide',stop);
const observer=new ResizeObserver(()=>{
  stop();if(renderer && !lost) renderer.resize();
});observer.observe(surface);

function notice(message) {$('notice').textContent=message;$('notice').hidden=false;}
function init() {
  try {
    if(renderer && !lost) renderer.dispose();
    renderer=new Renderer(canvas,portrait);renderer.resize();
    ready=true;lost=false;surface.classList.remove('unavailable');
    testButtons.forEach(b=>b.disabled=original);
    $('notice').hidden=true;status();
    // No autoplay. Reduced-motion users get explicit, cancellable interaction.
    if(matchMedia('(prefers-reduced-motion: reduce)').matches)
      notice('Motion starts only when you touch a region or use a test button. Stop motion returns instantly to the original.');
  } catch(error) {
    ready=false;surface.classList.add('unavailable');testButtons.forEach(b=>b.disabled=true);
    notice('Motion is unavailable in this browser. The untouched portrait is shown; try Safari or another browser with WebGL enabled.');
    console.error('Portrait renderer:',error);status();
  }
}
canvas.addEventListener('webglcontextlost',e=>{
  e.preventDefault();stop();lost=true;ready=false;surface.classList.add('unavailable');
  testButtons.forEach(b=>b.disabled=true);notice('Graphics paused. The original is shown while the browser recovers.');status();
});
canvas.addEventListener('webglcontextrestored',()=>{renderer=null;init();});
if(portrait.complete && portrait.naturalWidth) init();
else {
  portrait.addEventListener('load',init,{once:true});
  portrait.addEventListener('error',()=>{notice('The portrait could not load. Check your connection and reload this page.');status();},{once:true});
}
