/* Recorded Holly audio only. No physics, animation, random input or storage. */
(function(root){
'use strict';
class HollyAudio {
 constructor({eligible,withAudio,status,now=()=>performance.now(),url='./assets/audio/holly-giggle.wav'}){
  Object.assign(this,{eligible,withAudio,status,now,url});
  this.generation=0;this.pending=null;this.active=null;this.buffer=null;this.bytes=null;
  this.loading=null;this.decoding=null;this.context=null;this.watched=new WeakSet();
  this.nextAt=0;this.shakeAt=0;this.shakeEnergy=0;this.lastSample=-Infinity;
  this.counts={tap:0,release:0,shake:0,test:0};this.lastReason='initial';this.error='';
 }
 preload(){
  if(this.bytes)return Promise.resolve(this.bytes);
  if(!this.loading){
   const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),8000);
   this.loading=fetch(this.url,{signal:abort.signal}).then(response=>{
    if(!response.ok)throw Error('Recording unavailable ('+response.status+')');
    return response.arrayBuffer();
   }).then(bytes=>this.bytes=bytes).finally(()=>{clearTimeout(timer);this.loading=null;});
  }
  return this.loading;
 }
 prepare(ac){
  if(this.buffer)return Promise.resolve(this.buffer);
  if(!this.decoding)this.decoding=this.preload().then(bytes=>ac.decodeAudioData(bytes.slice(0))).then(buffer=>{
   if(buffer.duration<1.74)throw Error('Incomplete Holly recording');
   this.buffer=buffer;this.error='';return buffer;
  }).catch(error=>{this.bytes=null;throw error;}).finally(()=>{this.decoding=null;});
  return this.decoding;
 }
 activate(ac){
  this.context=ac;
  if(!this.watched.has(ac)){
   this.watched.add(ac);
   ac.addEventListener('statechange',()=>{if(ac===this.context&&ac.state!=='running')this.cancel('audio interrupted');});
  }
  // Fetch/decode early during the existing explicit Sound/Test/touch activation.
  this.prepare(ac).catch(error=>{this.error=String(error.message||error);});
 }
 cancel(reason,forgetActivation=true){
  this.generation++;this.pending=null;if(forgetActivation)this.context=null;
  this.nextAt=0;this.shakeAt=0;this.shakeEnergy=0;this.lastSample=-Infinity;this.lastReason=reason;
  const active=this.active;this.active=null;
  if(active){active.source.onended=null;try{active.source.stop();}catch{}active.source.disconnect();active.gain.disconnect();}
 }
 request(kind='tap'){
  const now=this.now();
  if(!this.eligible()||this.active||this.pending||(kind!=='test'&&now<this.nextAt))return false;
  if(kind==='shake'&&(!this.context||this.context.state!=='running'||now<this.shakeAt))return false;
  const request={generation:this.generation,kind,expires:now+2000};this.pending=request;
  const valid=()=>this.pending===request&&request.generation===this.generation&&this.eligible();
  const failed=error=>{
   if(!valid())return;
   this.pending=null;this.error=String(error?.message||error||'Audio activation failed');
   this.status('Laugh could not start. Tap Test Holly Laugh to retry.');
  };
  this.withAudio(ac=>{
   if(!valid())return;
   this.status(this.buffer?'Holly laugh ready.':'Loading Holly laugh…');
   this.prepare(ac).then(buffer=>{
    if(!valid())return;
    if(ac.state!=='running'||ac!==this.context){this.cancel('audio interrupted');return;}
    if(this.now()>request.expires){this.pending=null;this.status('Holly laugh ready. Tap again to play.');return;}
    const source=ac.createBufferSource(),gain=ac.createGain(),t=ac.currentTime;
    const duration=kind==='tap'?1.10:buffer.duration;
    source.buffer=buffer;source.playbackRate.value=1;source.loop=false;
    gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(1,t+.01);
    gain.gain.setValueAtTime(1,t+duration-.025);gain.gain.linearRampToValueAtTime(0,t+duration);
    source.connect(gain);gain.connect(ac.destination);
    const active={source,gain};this.active=active;this.pending=null;
    source.onended=()=>{source.disconnect();gain.disconnect();if(this.active===active)this.active=null;};
    source.start(t,0,duration);
    this.nextAt=this.now()+(kind==='tap'?2600:4200);
    if(kind==='shake')this.shakeAt=this.now()+12000;
    this.counts[kind]++;this.lastReason=kind;this.error='';
    this.status('Holly laugh ready. Auto Jiggle stays silent.');
   }).catch(failed);
  },()=>failed(Error('Audio activation failed')));
  return true;
 }
 physicalSample(controller,accepted,now){
  // Observe only accepted physical sensor samples. Auto tick never calls this.
  if(!accepted||!controller.shake||!this.eligible()||!this.context||this.context.state!=='running'){
   this.shakeEnergy=0;this.lastSample=-Infinity;return;
  }
  const gap=now-this.lastSample;this.lastSample=now;
  if(gap>150||gap<0)this.shakeEnergy=0;
  // Saturation alone occurs even for gentle motion; use the filtered actual
  // acceleration as well as the warmed-up force. Three energetic samples minimum.
  if(Math.hypot(...controller.force)>1.9&&Math.hypot(...controller.filtered)>5){
   this.shakeEnergy+=Math.min(Number.isFinite(gap)?gap:0,50);
   if(this.shakeEnergy>=100){this.request('shake');this.shakeEnergy=0;}
  }else this.shakeEnergy=0;
 }
 snapshot(){return {ready:!!this.buffer,loading:!!this.loading||!!this.decoding,pending:!!this.pending,active:!!this.active,activated:!!this.context&&this.context.state==='running',counts:{...this.counts},lastReason:this.lastReason,error:this.error,cooldown:Math.max(0,this.nextAt-this.now()),shakeCooldown:Math.max(0,this.shakeAt-this.now())};}
}
root.HollyAudio=HollyAudio;
})(globalThis);
