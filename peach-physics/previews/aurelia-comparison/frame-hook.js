// Runs inside a private copy of the v8 closure. Never loaded by production v8.
const comparisonBake=__BAKE__;
const comparisonExperiment=window.name==='blender';
let comparisonTime=0,comparisonCloseup=false,comparisonNext=.1,comparisonDt=1/120;
const comparisonPulses=[[],[]],comparisonReleased=[-Infinity,-Infinity];
function comparisonDamping(side){
 if(!comparisonExperiment)return 1;
 const age=comparisonTime-comparisonReleased[side];
 if(age>=1.2)return 1;
 const t=clamp((age-.16)/.5,0,1);return .92+.65*t*t*(3-2*t);
}
function comparisonCurve(side,age){
 const a=comparisonBake.curves[side],at=age*comparisonBake.fps,i=Math.floor(at);
 if(i<0||i>=a.length-1)return 0;
 return (a[i]+(a[i+1]-a[i])*(at-i))*Math.exp(-age*1.1);
}
function comparisonPulse(side,power=1,dx=0,clap=false){
 if(!comparisonExperiment)return;
 comparisonPulses[side].push({t:comparisonTime,x:clap?(side?-1:1)*(4+model.bounce*.08)*power:dx||(side?1:-1)*1.1*power,y:clap?0:(4+model.bounce*.08)*power,clap});
 if(comparisonPulses[side].length>16)comparisonPulses[side].shift();
}
function comparisonOffset(index){
 const side=nodes[index].side,layer=[.72,1,.88][index%3];let x=0,y=0;
 for(const p of comparisonPulses[side]){const k=comparisonCurve(p.clap?0:side,comparisonTime-p.t)*layer;x+=p.x*k;y+=p.y*k}
 return {x,y};
}
const comparisonNativeRender=render;
render=function(){
 if(!comparisonExperiment)return comparisonNativeRender();
 const saved=nodes.map(n=>({dx:n.dx,dy:n.dy}));
 try{
  nodes.forEach((n,i)=>{const d=comparisonOffset(i);n.dx=clamp(n.dx+d.x,-26,26);n.dy=clamp(n.dy+d.y,-30,30)});
  return comparisonNativeRender();
 }finally{nodes.forEach((n,i)=>Object.assign(n,saved[i]))}
};
const comparisonNativeSlap=slap;
slap=function(side,...args){comparisonNativeSlap(side,...args);comparisonReleased[side]=-Infinity;comparisonPulse(side,.75)};
function comparisonReset(){
 reset();comparisonPulses.forEach(p=>p.length=0);comparisonReleased.fill(-Infinity);
 comparisonTime=0;comparisonNext=.1;
 // Keep the production controller's timing and touch interruption behavior.
 let seed=8147;motion.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
 motion.time=0;motion.quietUntil=0;motion.autoDrive=null;
}
function comparisonDraw(){if(stage.clientWidth&&stage.clientHeight)render()}
// One horizontal force, mirrored about the center. No vertical Auto input.
const comparisonNativeAdd=motion.add.bind(motion);
motion.add=function(side,x,y,scale=1){
 if(this.auto&&!this.shake){
  const age=this.autoDrive?.age||0,t=clamp(age/.7,0,1),fade=t*t*(3-2*t);
  x=(side?-1:1)*PeachMotion.calibration.aurelia.auto*.85*fade*Math.sin(age*2*Math.PI*.8)*comparisonDt;
  y=0;
 }
 return comparisonNativeAdd(side,x,y,scale);
};
function comparisonTick(dt){
 comparisonDt=dt;motion.tick(dt);step(dt);
 if(comparisonExperiment&&motion.auto&&motion.time>=motion.quietUntil&&pointers.size===0){
  if(comparisonTime>=comparisonNext){
   comparisonPulse(0,.55,0,true);comparisonPulse(1,.55,0,true);
   comparisonNext=comparisonTime+1.25;
  }
 }
 for(let s=0;s<2;s++)comparisonPulses[s]=comparisonPulses[s].filter(p=>comparisonTime-p.t<4.4);
}
function comparisonPointer(data){
 const {type,id,x,y,pressure}=data,side=pickSide(x,y);
 if(type==='pointerdown'&&side>=0&&comparisonExperiment){
  // Keep the visible pose continuous when a finger catches a baked response.
  nodes.forEach((n,i)=>{if(n.side===side){const d=comparisonOffset(i);n.dx=clamp(n.dx+d.x,-26,26);n.dy=clamp(n.dy+d.y,-30,30)}});
  comparisonPulses[side].length=0;comparisonReleased[side]=-Infinity;
 }
 const held=pointers.get(id),wasDrag=!!held?.grabbed,heldSide=held?.side;
 const rect=canvas.getBoundingClientRect();
 const event=new PointerEvent(type,{pointerId:id,pointerType:'touch',clientX:rect.left+ox+x/W*drawW,clientY:rect.top+oy+y/H*drawH,pressure:pressure||.5,bubbles:true,cancelable:true});
 Object.defineProperty(event,'comparisonForwarded',{value:true});canvas.dispatchEvent(event);
 if(type==='pointerup'&&wasDrag&&comparisonExperiment)comparisonReleased[heldSide]=comparisonTime;
}
for(const type of ['pointerdown','pointermove','pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,e=>{
 if(e.comparisonForwarded)return;
 e.preventDefault();e.stopImmediatePropagation();
 if(type==='pointerdown'){try{canvas.setPointerCapture(e.pointerId)}catch{}}
 const p=readPoint(e);
 parent.__aureliaRelay?.({type:type==='lostpointercapture'?'pointercancel':type,id:e.pointerId,x:p.x,y:p.y,pressure:e.pressure});
},{capture:true,passive:false});
window.__aureliaFrame={
 ready:()=>!!img&&loader.classList.contains('hiding'),tick:comparisonTick,draw:comparisonDraw,pointer:comparisonPointer,
 reset:comparisonReset,
 bounce:()=>{motion.interrupt();bounceBoth();comparisonPulse(0,1);comparisonPulse(1,.88)},
 auto:value=>{motion.setAuto(value);comparisonNext=comparisonTime+.1},
 preset:value=>{activePreset=value;Object.assign(model,currentPresets()[value]);refreshPrefs();comparisonReset()},
 closeup:value=>{comparisonCloseup=value;needSize=true;comparisonDraw()},
 resize:()=>{needSize=true;comparisonDraw()},
 snapshot:()=>({...__peachPhysicsDebug.snapshot(),experiment:comparisonExperiment,time:comparisonTime,pulses:comparisonPulses.map(p=>p.length),renderOffsets:nodes.map((n,i)=>{const d=comparisonOffset(i);return {dx:clamp(n.dx+d.x,-26,26),dy:clamp(n.dy+d.y,-30,30)}})}),
 raw:()=>JSON.parse(JSON.stringify({nodes,followers,impacts,waves})),
 pose:(dx,dy,side)=>{comparisonReset();motion.setAuto(false);for(const n of nodes)if(n.side===side){n.dx=dx;n.dy=dy}comparisonDraw()}
};
comparisonReset();motion.setAuto(true);
