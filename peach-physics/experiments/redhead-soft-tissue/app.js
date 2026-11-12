import {Physics,contours,centers} from './physics.js';
import {Renderer,views} from './render.js';
const $=s=>document.querySelector(s),model=new Physics(),img=new Image();
const query=new URLSearchParams(location.search);let type=query.get('renderer')==='canvas'?'canvas':'webgl',display=query.get('view')|| (innerWidth<700?'B':'split'),view=views.study,renderers=[],demoTime=null,last=0,acc=0,frameCount=0,ready=false,paused=false,events=[],eventIndex=0,actual=type;
const status=$('#status');
function bind(canvas){
 const point=e=>{const r=canvas.getBoundingClientRect();return [view[0]+(e.clientX-r.left)/r.width*view[2],view[1]+(e.clientY-r.top)/r.height*view[3]];};
 canvas.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button!==0)return;stopDemo();if(model.down(e.pointerId,...point(e))){e.preventDefault();try{canvas.setPointerCapture(e.pointerId);}catch{/* Synthetic inputs or browsers without capture still receive local events. */}}});
 canvas.addEventListener('pointermove',e=>{if(model.pointers.has(e.pointerId)){e.preventDefault();model.move(e.pointerId,...point(e));}});
 canvas.addEventListener('pointerup',e=>model.up(e.pointerId));
 for(const t of ['pointercancel','lostpointercapture'])canvas.addEventListener(t,e=>model.up(e.pointerId,true));
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();if(canvas.isConnected){actual='canvas';type='canvas';setup();status.textContent='WebGL context lost · switched to Canvas 2D';}});
}
function setup(){
 const old=renderers;renderers=[];
 for(const mode of ['A','B']){const prior=$('#canvas'+mode),canvas=prior.cloneNode(false);prior.replaceWith(canvas);bind(canvas);try{renderers.push({mode,r:new Renderer(canvas,img,type)});}catch(error){console.warn(error.message);type='canvas';const fresh=canvas.cloneNode(false);canvas.replaceWith(fresh);bind(fresh);renderers.push({mode,r:new Renderer(fresh,img,'canvas')});}}
 old.forEach(({r})=>r.dispose());actual=type;$('#renderer').value=actual;resize();
}
function resize(){for(const {r} of renderers)r.resize(view);draw();}
function draw(){if(!ready)return;for(const {mode,r} of renderers){if(display==='split'||display===mode)r.draw(model.field(mode));}guides();}
function guides(){for(const article of document.querySelectorAll('article')){const canvas=article.querySelector('.guide'),r=canvas.getBoundingClientRect();canvas.width=Math.max(2,r.width*devicePixelRatio);canvas.height=Math.max(2,r.height*devicePixelRatio);const c=canvas.getContext('2d');if(!$('#guides').checked)return;c.scale(canvas.width/view[2],canvas.height/view[3]);c.translate(-view[0],-view[1]);c.strokeStyle='#ffe0a1';c.lineWidth=1;for(const points of contours){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.stroke();}c.fillStyle='#ffe0a1';for(const p of model.pointers.values()){c.beginPath();c.arc(p.x,p.y,3,0,Math.PI*2);c.fill();}}}
function chooseDisplay(value){display=['A','B','split'].includes(value)?value:'split';$('#portraits').className=display;document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===display)));resize();}
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>chooseDisplay(b.dataset.view));
$('#renderer').onchange=e=>{type=e.target.value;stopDemo();model.reset();setup();};
$('#framing').onchange=e=>{view=views[e.target.value];document.querySelectorAll('.surface').forEach(s=>s.classList.toggle('full',e.target.value==='full'));stopDemo();model.cancel();resize();};
$('#guides').onchange=guides;
function stopDemo(){demoTime=null;$('#demo').textContent='Run comparison sequence';}
function reset(){stopDemo();model.reset();draw();}
$('#reset').onclick=reset;
// Deterministic recorded inputs, in image pixels and simulation seconds. Runs
// through the same down/move/up paths as real gestures, shared by A and B.
function sequence(){
 const out=[];const add=(t,kind,id,x,y,label)=>out.push({t,kind,id,x,y,label});
 const tap=(t,s,label)=>{const [x,y]=centers[s];add(t,'down',s,x,y,label);add(t+.08,'up',s,x,y,label);};
 tap(.3,0,'Light tap');for(let i=0;i<4;i++)tap(1.6+i*.22,1,'Repeated taps');
 const drag=(t,s,dx,dy,duration,label)=>{const [x,y]=centers[s];add(t,'down',s,x,y,label);for(let i=1;i<=12;i++)add(t+i*duration/12,'move',s,x+dx*i/12,y+dy*i/12,label);add(t+duration+.025,'up',s,x+dx,y+dy,label);};
 drag(3.4,0,0,-50,.15,'Upward flick');drag(5.1,0,37,0,.7,'Inward drag');drag(7.1,1,40,0,.7,'Outward drag');drag(9.1,0,-28,-25,.5,'Simultaneous left / right');drag(9.1,1,25,25,.5,'Simultaneous left / right');
 add(10.2,'label',0,0,0,'Settling and recovery');return out.sort((a,b)=>a.t-b.t);
}
function startDemo(){model.reset();events=sequence();eventIndex=0;demoTime=0;$('#demo').textContent='Stop sequence';}
$('#demo').onclick=()=>demoTime===null?startDemo():(stopDemo(),model.cancel());
function advance(dt){if(demoTime!==null){demoTime+=dt;while(eventIndex<events.length&&events[eventIndex].t<=demoTime){const e=events[eventIndex++];if(e.kind==='down')model.down(e.id,e.x,e.y);if(e.kind==='move')model.move(e.id,e.x,e.y);if(e.kind==='up')model.up(e.id);status.textContent=`${actual.toUpperCase()} · ${e.label} · matched input A / B`;}if(demoTime>14.5){stopDemo();status.textContent=`${actual.toUpperCase()} · Sequence complete · settled`;}}model.step(dt);}
function loop(now){const dt=last?Math.min(.065,(now-last)/1000):0;last=now;if(ready&&!paused&&!document.hidden){acc=Math.min(acc+dt,.065);while(acc>=1/120){advance(1/120);acc-=1/120;}draw();frameCount++;if(demoTime===null&&frameCount%60===0)status.textContent=`${actual.toUpperCase()} · ${model.lastGesture} · ${model.pointers.size} active contacts`;}requestAnimationFrame(loop);}
window.addEventListener('resize',resize);window.addEventListener('blur',()=>{stopDemo();model.cancel();});document.addEventListener('visibilitychange',()=>{last=0;acc=0;if(document.hidden){stopDemo();model.cancel();}});
img.onload=()=>{ready=true;setup();chooseDisplay(display);status.textContent=`${actual.toUpperCase()} · Ready · touch either portrait`;};img.onerror=()=>status.textContent='Original portrait failed to load. Reload to retry.';img.src='./assets/redhead-original.jpg';
// Explicit diagnostic surface for reproducible render tests and evidence.
window.redheadLab={get ready(){return ready;},model,reset,startDemo,advance,draw,pause:value=>{paused=value;last=0;},snapshot:()=>({...model.snapshot(),renderer:actual,display,view,frameCount}),field:mode=>model.field(mode),setDisplay:chooseDisplay};
requestAnimationFrame(loop);
