'use strict';
const get=id=>document.getElementById(id);
const frames=Array.from(document.querySelectorAll('iframe'));
const stage=document.querySelector('.stage');
const loading=document.querySelector('.loading');
const controls=document.querySelectorAll('button');
const names={
 ember:['Diagonal flick','Watch the outer edge on the left during release.'],
 midnight:['Left tap','Tap each side, then drag to see how the other side follows.'],
 aurelia:['Clap','Watch the gap as both sides close and rebound.'],
 holly:['Cup rebound','Watch the white trim where it meets the lacing.']
};
const panes=()=>frames.map(frame=>frame.contentWindow.study);
let generation=0,ready=false,auto=false,depth=true,zoom=false;
let lastTime=0,budget=0,cameraTime=0,clip=null,lastKind='bounce';
function setPressed(id,value){get(id).setAttribute('aria-pressed',String(value))}
function setAuto(value){
 auto=value;
 panes().forEach(p=>p.auto(auto));
 setPressed('auto',auto);
}
function startClip(kind,rate){
 lastKind=kind;
 panes().forEach(p=>{p.cancel();p.reset();p.exercise(kind)});
 auto=false;setPressed('auto',false);
 budget=0;lastTime=0;cameraTime=0;
 clip={kind,rate,steps:0};
 get('hint').textContent=(rate===1?'':'Quarter speed · ')+names[get('portrait').value][1];
}
function tick(){
 const apis=panes();
 if(clip?.kind==='exercise'&&get('portrait').value==='aurelia'&&clip.steps===150)apis.forEach(p=>p.auto(false));
 apis.forEach(p=>p.tick(1/120));
 cameraTime+=1/120;
 if(clip && ++clip.steps===360)clip=null;
}
function loop(now){
 if(ready&&!document.hidden){
  const elapsed=lastTime?Math.min(.065,(now-lastTime)/1000):0;
  budget+=elapsed*(clip?.rate??1);
  while(budget>=1/120){tick();budget-=1/120}
  const x=depth?.073*Math.sin(cameraTime*.74):0;
  const y=depth?.025*Math.sin(cameraTime*.52):0;
  for(const p of panes()){p.view(x,y);p.draw()}
 }
 lastTime=now;requestAnimationFrame(loop);
}
window.relay=data=>{
 if(!ready)return;
 if(data.type==='pointerdown'&&clip){clip=null;setAuto(false)}
 panes().forEach(p=>p.pointer(data));
};
function cancel(){
 if(ready)panes().forEach(p=>p.cancel());
 lastTime=0;budget=0;
}
document.addEventListener('visibilitychange',cancel);
window.addEventListener('blur',cancel);
new ResizeObserver(()=>{if(ready)panes().forEach(p=>p.resize())}).observe(stage);
for(const button of document.querySelectorAll('button[data-mode]')){
 button.onclick=()=>{
  cancel();stage.dataset.mode=button.dataset.mode;
  document.querySelectorAll('button[data-mode]').forEach(b=>b.setAttribute('aria-pressed',b===button));
  if(ready)panes().forEach(p=>{p.resize();p.draw()});
 };
}
get('bounce').onclick=()=>startClip('bounce',1);
get('exercise').onclick=()=>startClip('exercise',1);
get('replay').onclick=()=>startClip(lastKind,.25);
get('auto').onclick=()=>{clip=null;setAuto(!auto)};
get('depth').onclick=()=>{depth=!depth;setPressed('depth',depth)};
get('zoom').onclick=()=>{zoom=!zoom;setPressed('zoom',zoom);panes().forEach(p=>p.close(zoom))};
async function selectPortrait(){
 const job=++generation,id=get('portrait').value;
 cancel();ready=false;clip=null;loading.hidden=false;loading.textContent='Opening portraits…';
 controls.forEach(b=>b.disabled=true);
 try{
  await artReady;
  if(job!==generation)return;
  const engine=new URL('./engine.html',location.href);
  engine.searchParams.set('portrait',id);
  engine.searchParams.set('v','4');
  for(const frame of frames)frame.src=engine.href;
  const limit=performance.now()+45000;
  while(!frames.every(f=>f.contentWindow.location.href===engine.href&&f.contentWindow.study?.ready())){
   if(job!==generation)return;
   if(performance.now()>limit)throw Error('Artwork took too long to load.');
   await new Promise(resolve=>setTimeout(resolve,60));
  }
  if(job!==generation)return;
  const apis=panes();apis.forEach(p=>{p.configure();p.close(zoom)});
  controls.forEach(b=>b.disabled=false);
  const hasDepth=apis.every(p=>p.snapshot().renderer==='webgl');
  get('depth').disabled=!hasDepth;
  setPressed('depth',depth&&hasDepth);
  get('depth').textContent=hasDepth?'Depth sway':'Flat view';
  get('exercise').textContent=names[id][0];
  ready=true;loading.hidden=true;startClip('bounce',1);
 }catch(error){if(job===generation)loading.textContent=error.message+' Reload to try again.'}
}
// Read only the two approved image literals from the cached production file.
const artReady=fetch('../../v8/index.html').then(async response=>{
 if(!response.ok)throw Error('Portrait download failed.');
 const html=await response.text();
 window.embeddedPortraits=['IMAGE','OTHER_IMAGE'].map(name=>{
  const match=html.match(new RegExp("const "+name+"='(data:image/[^']+)';"));
  if(!match)throw Error('Portrait unavailable.');
  return match[1];
 });
});
const requestedPortrait=new URLSearchParams(location.search).get('portrait');
if(Object.hasOwn(names,requestedPortrait))get('portrait').value=requestedPortrait;
get('portrait').onchange=selectPortrait;
selectPortrait();
requestAnimationFrame(loop);
if('serviceWorker' in navigator){
 navigator.serviceWorker.register('./sw.js').then(()=>navigator.serviceWorker.ready).then(()=>get('offline').textContent='Ready offline').catch(()=>get('offline').textContent='Offline save unavailable');
}
