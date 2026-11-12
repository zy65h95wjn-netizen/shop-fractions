import {Comparison,contours,modes} from './model.js';
import {Renderer,views} from './render.js';
import {Playback,duration} from './sequence.js';
import {BlindTrial} from './blind.js';
const $=s=>document.querySelector(s),model=new Comparison(),img=new Image();img.crossOrigin='anonymous';
const query=new URLSearchParams(location.search);let type=query.get('renderer')==='canvas'?'canvas':'webgl',display=query.get('view')||'pair',view=views.study,renderers=[],ready=false,paused=false,playback=null,blind=null,blindEnd=null,last=0,acc=0,frames=0,fields=null,drawTimes=[];
const status=$('#status');
function panels(){if(blind)return [{mode:blind.current.left,label:'X'},{mode:blind.current.right,label:'Y'}];if(display==='pair')return [{mode:$('#left').value},{mode:$('#right').value}];if(display==='all')return modes.map(mode=>({mode}));return [{mode:display}];}
function stop(){playback=null;blindEnd=null;model.cancel();$('#demo').textContent='Play matched sequence';}
function setup(){
 const old=renderers;renderers=[];$('#portraits').replaceChildren();
 for(const {mode,label} of panels()){
  const article=document.createElement('article');article.dataset.mode=mode;
  const caption=document.createElement('div');caption.className='caption';caption.innerHTML=`<strong>${label||mode} <span>${label?'Unlabeled method':mode==='A'?'Original':mode==='A+'?'Strength matched':'2D Kelvinlet'}</span></strong>`;
  const surface=document.createElement('div');surface.className='surface'+(view===views.full?' full':'');surface.style.aspectRatio=`${view[2]}/${view[3]}`;let canvas=document.createElement('canvas');canvas.className='portrait';canvas.setAttribute('aria-label',`${label||mode} interactive portrait`);const guide=document.createElement('canvas');guide.className='guide';surface.append(canvas,guide);article.append(caption,surface);$('#portraits').append(article);
  let r;try{r=new Renderer(canvas,img,type);}catch(e){console.warn(e.message);type='canvas';const replacement=canvas.cloneNode();canvas.replaceWith(replacement);canvas=replacement;r=new Renderer(canvas,img,type);}
  renderers.push({mode,r,guide});bind(canvas);
 }
 old.forEach(({r})=>r.dispose());$('#renderer').value=type;$('#portraits').className=renderers.length===3?'all':renderers.length===2?'pair':'single';resize();
}
function bind(canvas){
 const point=e=>{const r=canvas.getBoundingClientRect();return [view[0]+(e.clientX-r.left)/r.width*view[2],view[1]+(e.clientY-r.top)/r.height*view[3]];};
 canvas.onpointerdown=e=>{if(blind||(e.pointerType==='mouse'&&e.button!==0))return;if(playback)stop();if(model.down(e.pointerId,...point(e))){e.preventDefault();try{canvas.setPointerCapture(e.pointerId);}catch{}}};
 canvas.onpointermove=e=>{if(model.pointers.has(e.pointerId)){e.preventDefault();model.move(e.pointerId,...point(e));}};
 canvas.onpointerup=e=>model.up(e.pointerId);canvas.onpointercancel=e=>model.up(e.pointerId,true);canvas.onlostpointercapture=e=>model.up(e.pointerId,true);
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();if(canvas.isConnected){type='canvas';setup();}});
}
function resize(){document.documentElement.style.setProperty('--focus-ratio',view[2]/view[3]);for(const {r} of renderers)r.resize(view);draw();}
function draw(){
 if(!ready)return;const begin=performance.now();fields=model.fields();for(const {mode,r} of renderers)r.draw(fields[mode]);drawTimes.push(performance.now()-begin);if(drawTimes.length>300)drawTimes.shift();
 for(const {r,guide} of renderers){guide.width=r.canvas.width;guide.height=r.canvas.height;if(!$('#guides').checked||blind)continue;const c=guide.getContext('2d');c.scale(guide.width/view[2],guide.height/view[3]);c.translate(-view[0],-view[1]);c.strokeStyle='#ffe0a1';c.lineWidth=1;for(const points of contours){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.stroke();}}
 if(!blind)$('#matching').textContent=(model.safety?.fallback?'Candidate safety fallback: A shown in all views. ':model.safety?.baselineStrain?'Inherited baseline boundary strain is high. ':'')+model.match.map(m=>`${m.side?'Right':'Left'}: pressure ×${m.gain.toFixed(2)}; RMS ${m.achieved.toFixed(3)} / ${m.target.toFixed(3)} px${m.limited?' (gain bound reached)':''}`).join(' · ');
}
function choose(v){if(blind)return;display=modes.includes(v)||['pair','all'].includes(v)?v:'pair';document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===display)));if(ready)setup();}
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>choose(b.dataset.view));$('#left').onchange=$('#right').onchange=()=>choose('pair');
$('#renderer').onchange=e=>{type=e.target.value;stop();model.reset();setup();};$('#framing').onchange=e=>{view=views[e.target.value];stop();setup();};$('#guides').onchange=draw;
function reset(){stop();model.reset();draw();}$('#reset').onclick=reset;
function start(){playback=new Playback(model);$('#demo').textContent='Stop playback';}$('#demo').onclick=()=>playback?stop():start();
function advance(dt){if(playback){playback.step(dt);if(blind&&playback.time>=blindEnd){playback=null;status.textContent='Replay or choose a preference';document.querySelectorAll('[data-vote]').forEach(b=>b.disabled=false);}else if(!blind&&playback.time>=duration){stop();status.textContent=`${type.toUpperCase()} · Playback complete`;}}else model.step(dt);}
function loop(now){const elapsed=last?Math.min(.065,(now-last)/1000):0;last=now;if(ready&&!paused&&!document.hidden){acc=Math.min(.065,acc+elapsed);while(acc>=1/120){advance(1/120);acc-=1/120;}draw();frames++;if(frames%15===0&&(!blind||playback))status.textContent=`${type.toUpperCase()} · ${playback?playback.label:model.lastGesture}${blind?' · methods hidden':''}`;}requestAnimationFrame(loop);}
function focus(flag){document.body.classList.toggle('focus',flag);$('#exit-focus').hidden=!flag;if(flag&&renderers.length!==1){choose($('#right').value);}resize();}$('#fullscreen').onclick=()=>focus(true);$('#exit-focus').onclick=()=>focus(false);
function replayTrial(){start();const startAt=blind.current.start;for(let i=0;i<Math.round(startAt*120);i++)playback.step(1/120);blindEnd=Math.min(duration,startAt+4);$('#trial-label').textContent=`Comparison ${blind.index+1} of 10 · watch both motions before choosing`;document.querySelectorAll('[data-vote]').forEach(b=>b.disabled=true);draw();}
$('#blind-start').onclick=()=>{focus(false);stop();blind=new BlindTrial();document.body.classList.add('blinding');$('#blind-controls').hidden=false;$('#blind-result').textContent='';$('#export').hidden=true;setup();replayTrial();};$('#replay').onclick=()=>{if(blind)replayTrial();};
let completed=null;document.querySelectorAll('[data-vote]').forEach(b=>b.onclick=()=>{if(!blind||playback)return;if(blind.vote(b.dataset.vote)){completed=blind.result();$('#blind-result').textContent=`B preferred ${completed.B}/10; A+ ${completed.Aplus}/10; no preference ${completed.ties}/10. ${completed.passesPracticalRule?'Meets':'Does not meet'} the practical 8/10 rule. Not statistical proof.`;$('#export').hidden=false;endBlind();}else{setup();replayTrial();}});
function endBlind(){blind=null;stop();document.body.classList.remove('blinding');$('#blind-controls').hidden=true;model.reset();setup();}$('#blind-exit').onclick=endBlind;
$('#export').onclick=()=>{const a=document.createElement('a'),u=URL.createObjectURL(new Blob([JSON.stringify(completed,null,2)],{type:'application/json'}));a.href=u;a.download='kelvinlet-blind-votes.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);};
window.addEventListener('resize',resize);window.addEventListener('blur',()=>{if(!blind)stop();model.cancel();});document.addEventListener('visibilitychange',()=>{last=0;acc=0;if(document.hidden)model.cancel();});
img.onload=()=>{ready=true;choose(display);status.textContent=`${type.toUpperCase()} · Ready`;};img.onerror=()=>status.textContent='Could not load the original JPEG. Reload to retry.';img.src='../redhead-soft-tissue/assets/redhead-original.jpg';
window.kelvinLab={get ready(){return ready;},model,start,reset,advance,draw,pause:value=>{paused=value;last=0;},fields:()=>fields,snapshot:()=>({...model.snapshot(),renderer:type,display,view,frames,matches:model.match,safety:model.safety,drawTimes:[...drawTimes]}),choose};requestAnimationFrame(loop);
