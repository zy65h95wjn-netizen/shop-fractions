/* Optional inputs only. No solver, renderer, contact, audio or profile changes. */
(function(root){
'use strict';
const calibration=Object.freeze({
 ember:{accel:210,auto:55,limit:210},midnight:{accel:195,auto:50,limit:200},
 aurelia:{accel:150,auto:40,limit:165},holly:{accel:36,auto:14,limit:65},
 santa:{accel:85,auto:50,limit:210}
});
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
class MotionInput{
 constructor({character,nodes,busy,random=Math.random,onChange=()=>{}}){
  Object.assign(this,{character,nodes,busy,random,onChange});
  this.shake=false;this.auto=false;this.visible=true;this.time=0;this.quietUntil=0;
  this.nextAuto=null;this.lastCharacter=character();this.counts={shakeSteps:0,autoPulses:0};this.clearSensor();
 }
 clearSensor(){this.filtered=[0,0];this.gravity=null;this.lastEvent=null;this.lastSampleAt=-Infinity;this.warmup=0;this.source=null;this.force=[0,0];this.burst=0;this.cooldown=0;}
 setShake(value){this.shake=!!value;this.clearSensor();}
 setAuto(value){this.auto=!!value;this.nextAuto=null;}
 interrupt(){this.clearSensor();this.nextAuto=null;this.quietUntil=this.time+1.2;}
 setVisible(value){this.visible=!!value;this.interrupt();}
 sample(event,now,angle=0){
  if(!this.shake||!this.visible||this.busy()||this.time<this.quietUntil){this.clearSensor();return false;}
  if(!Number.isFinite(now)||now-this.lastSampleAt<16)return false;
  const finite=v=>v&&Number.isFinite(v.x)&&Number.isFinite(v.y);
  let value,source;
  if(finite(event.acceleration)){value=event.acceleration;source='linear';}
  else if(finite(event.accelerationIncludingGravity)){value=event.accelerationIncludingGravity;source='gravity';}
  else {this.clearSensor();return false;}
  if(source!==this.source||this.lastEvent===null||now-this.lastEvent>250||now<this.lastEvent){this.clearSensor();this.source=source;}
  const dt=this.lastEvent===null?1/60:clamp((now-this.lastEvent)/1000,1/240,.1);
  this.lastEvent=this.lastSampleAt=now;this.sensorAge=0;
  let x=clamp(value.x,-30,30),y=clamp(value.y,-30,30);
  if(source==='gravity'){
   if(!this.gravity)this.gravity=[x,y];
   const alpha=1-Math.exp(-dt/.6);this.gravity[0]+=(x-this.gravity[0])*alpha;this.gravity[1]+=(y-this.gravity[1])*alpha;
   x-=this.gravity[0];y-=this.gravity[1];
  }
  this.warmup+=dt;
  const r=(Number.isFinite(angle)?angle:0)*Math.PI/180,c=Math.cos(r),s=Math.sin(r);
  const sx=x*c+y*s,sy=x*s-y*c,alpha=1-Math.exp(-dt/.07);
  this.filtered[0]+=(sx-this.filtered[0])*alpha;this.filtered[1]+=(sy-this.filtered[1])*alpha;
  if(this.warmup<(source==='gravity'?.5:.1)){this.force=[0,0];return true;}
  const length=Math.hypot(...this.filtered),gain=length>1.2?Math.min(14,length-1.2)/length:0;
  this.force=this.filtered.map(v=>-v*gain);return true;
 }
 add(side,x,y,scale=1){
  const config=calibration[this.character()];if(!config)return;
  for(let j=0;j<3;j++){
   const n=this.nodes()[side*3+j],weight=[.82,1,.93][j]*scale;
   if(Math.abs(n.vx)<config.limit)n.vx=clamp(n.vx+x*weight,-config.limit,config.limit);
   if(Math.abs(n.vy)<config.limit)n.vy=clamp(n.vy+y*weight,-config.limit,config.limit);
  }
 }
 tick(dt){
  if(!Number.isFinite(dt)||dt<=0)return;dt=Math.min(dt,.05);this.time+=dt;
  if(!this.shake&&!this.auto)return;
  if(this.character()!==this.lastCharacter){this.lastCharacter=this.character();this.interrupt();}
  if(!this.visible||this.busy()){this.interrupt();return;}
  if(this.time<this.quietUntil)return;
  const config=calibration[this.character()];if(!config)return;
  this.sensorAge=(this.sensorAge||0)+dt;this.cooldown=Math.max(0,this.cooldown-dt);
  if(this.shake&&this.sensorAge<.18&&this.cooldown===0&&Math.hypot(...this.force)>0){
   this.burst+=dt;
   if(this.burst>.65){this.cooldown=.18;this.burst=0;}
   else{this.add(0,this.force[0]*config.accel*dt,this.force[1]*config.accel*dt,.97);this.add(1,this.force[0]*config.accel*dt,this.force[1]*config.accel*dt,1.03);this.counts.shakeSteps++;}
  }else if(this.sensorAge>=.18||Math.hypot(...this.force)===0)this.burst=0;
  if(this.auto){
   if(this.nextAuto===null)this.nextAuto=this.time+3.8+this.random()*4.8;
   if(this.time>=this.nextAuto){
    const side=this.random()<.5?0:1,angle=this.random()*Math.PI*2,strength=config.auto*(.55+.45*this.random());
    this.add(side,Math.cos(angle)*strength,Math.sin(angle)*strength*.8);
    this.add(1-side,Math.cos(angle+.4)*strength,Math.sin(angle+.4)*strength*.8,.10+.15*this.random());
    this.counts.autoPulses++;this.nextAuto=this.time+3.8+this.random()*4.8;
   }
  }
 }
 snapshot(){return {shake:this.shake,auto:this.auto,visible:this.visible,counts:{...this.counts},force:[...this.force],cooldown:this.cooldown,nextAuto:this.nextAuto,source:this.source};}
}
function attachUI(controller,{win=window,doc=document,storage}={}){
 try{storage=storage||win.localStorage;}catch{storage=null;}
 const key='peach-r13-motion-options-v1',shake=doc.getElementById('shakeMotion'),auto=doc.getElementById('autoMotion'),status=doc.getElementById('motionStatus');
 let saved={shake:false,auto:false},granted=false,pending=false,listening=false,epoch=0,timer=null,readings=false;
 try{const value=JSON.parse(storage.getItem(key)||'null');if(value?.version===1)saved={shake:value.shake===true,auto:value.auto===true};}catch{}
 const supported=!!win.DeviceMotionEvent&&win.isSecureContext;
 function persist(){try{storage.setItem(key,JSON.stringify({version:1,...saved}));}catch{}}
 function refresh(){shake.setAttribute('aria-checked',String(controller.shake));auto.setAttribute('aria-checked',String(saved.auto));shake.disabled=!supported||pending;shake.textContent=pending?'Shake to Jiggle: requesting…':controller.shake?'Shake to Jiggle: on':saved.shake?'Shake to Jiggle: tap to enable':'Shake to Jiggle: off';auto.textContent='Auto Jiggle: '+(saved.auto?'on':'off');}
 function detach(){if(listening)win.removeEventListener('devicemotion',onMotion);listening=false;win.clearTimeout(timer);timer=null;controller.clearSensor();}
 function onMotion(event){const angle=win.screen?.orientation?.angle??win.orientation??0;controller.sample(event,win.performance.now(),angle);const valid=value=>value&&Number.isFinite(value.x)&&Number.isFinite(value.y);if((valid(event.acceleration)||valid(event.accelerationIncludingGravity))&&!readings){readings=true;win.clearTimeout(timer);status.textContent='Motion ready. Move your phone gently; touch takes priority.';}}
 function connect(){detach();if(!granted||!saved.shake||doc.hidden)return;readings=false;win.addEventListener('devicemotion',onMotion,{passive:true});listening=true;timer=win.setTimeout(()=>{if(!readings)status.textContent='No motion readings yet. This device or browser may not provide them; Auto Jiggle still works.';},2500);}
 shake.addEventListener('click',async()=>{
  if(controller.shake){epoch++;saved.shake=false;granted=false;controller.setShake(false);detach();persist();status.textContent='Shake to Jiggle is off.';refresh();return;}
  if(!supported)return;
  const token=++epoch;pending=true;refresh();
  try{
   // Called directly in this click handler, before any await or timer: iOS gesture requirement.
   const permission=typeof win.DeviceMotionEvent.requestPermission==='function'?await win.DeviceMotionEvent.requestPermission():'granted';
   if(token!==epoch)return;
   granted=permission==='granted';saved.shake=granted;controller.setShake(granted);persist();
   status.textContent=granted?'Move your phone gently. Touch takes priority.':'Motion permission was denied. You can retry after allowing Motion & Orientation in browser settings; Auto Jiggle still works.';
   if(granted)connect();else detach();
  }catch{if(token===epoch){saved.shake=false;granted=false;controller.setShake(false);detach();persist();status.textContent='Motion permission could not be enabled. Auto Jiggle is still available.';}}
  finally{if(token===epoch){pending=false;refresh();}}
 });
 // Keep native switch keyboard activation from reaching R12's global Space-to-bounce shortcut.
 for(const control of [shake,auto])control.addEventListener('keydown',event=>{if(event.code==='Space')event.stopPropagation();});
 auto.addEventListener('click',()=>{saved.auto=!saved.auto;controller.setAuto(saved.auto);persist();status.textContent=saved.auto?'Auto Jiggle is on. It pauses during touch and while hidden.':controller.shake?'Auto Jiggle is off. Shake remains on.':'Motion effects are off.';refresh();});
 doc.addEventListener('visibilitychange',()=>{controller.setVisible(!doc.hidden);if(doc.hidden)detach();else connect();});
 win.addEventListener('pagehide',()=>{controller.setVisible(false);detach();});
 win.addEventListener('pageshow',()=>{controller.setVisible(!doc.hidden);connect();});
 win.addEventListener('orientationchange',()=>controller.interrupt());
 win.screen?.orientation?.addEventListener('change',()=>controller.interrupt());
 controller.setAuto(saved.auto);controller.setVisible(!doc.hidden);
 status.textContent=!supported?'Device motion is unavailable here. Auto Jiggle still works.':saved.shake?'Shake preference saved. Tap Shake to Jiggle to enable motion for this visit.':saved.auto?'Auto Jiggle restored. Touch always takes priority.':'Optional motion effects are off until enabled. Touch always takes priority.';
 refresh();return {snapshot:()=>({saved:{...saved},granted,pending,listening,supported}),key};
}
const api={MotionInput,attachUI,calibration};if(typeof module==='object'&&module.exports)module.exports=api;else root.PeachMotion=api;
})(typeof globalThis==='object'?globalThis:this);
