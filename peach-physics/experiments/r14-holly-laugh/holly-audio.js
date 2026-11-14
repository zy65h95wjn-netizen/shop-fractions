/* Recorded Holly audio only. No physics, animation, random input or storage. */
(function(root){
'use strict';
class HollyAudio {
 constructor({eligible,withAudio,status,now=()=>performance.now()}){
  Object.assign(this,{eligible,withAudio,status,now});
  this.clips=[{url:'./assets/audio/holly-giggle.wav',minimum:1.74},{url:'./assets/audio/holly-giggle-2.wav',minimum:2.06}].map(clip=>({...clip,buffer:null,bytes:null,loading:null,decoding:null,error:'',plays:0}));
  this.generation=0;this.pending=null;this.active=null;this.context=null;this.watched=new WeakSet();
  this.tapNext=0;this.testNext=0;this.lastClip=null;
  this.nextAt=0;this.shakeAt=0;this.shakeEnergy=0;this.lastSample=-Infinity;
  this.counts={tap:0,release:0,shake:0,test:0};this.lastReason='initial';this.error='';
 }
 preload(index){
  if(index===undefined)return Promise.all(this.clips.map((_,i)=>this.preload(i)));
  const clip=this.clips[index];
  if(clip.bytes)return Promise.resolve(clip.bytes);
  if(!clip.loading){
   const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),8000);
   clip.loading=fetch(clip.url,{signal:abort.signal}).then(response=>{
    if(!response.ok)throw Error('Recording unavailable ('+response.status+')');
    return response.arrayBuffer();
   }).then(bytes=>clip.bytes=bytes).finally(()=>{clearTimeout(timer);clip.loading=null;});
  }
  return clip.loading;
 }
 prepare(ac,index){
  const clip=this.clips[index];
  if(clip.buffer)return Promise.resolve(clip.buffer);
  if(!clip.decoding)clip.decoding=this.preload(index).then(bytes=>ac.decodeAudioData(bytes.slice(0))).then(buffer=>{
   if(buffer.duration<clip.minimum)throw Error('Incomplete Holly recording');
   clip.buffer=buffer;clip.error='';return buffer;
  }).catch(error=>{clip.bytes=null;clip.error=String(error.message||error);throw error;}).finally(()=>{clip.decoding=null;});
  return clip.decoding;
 }
 activate(ac){
  this.context=ac;
  if(!this.watched.has(ac)){
   this.watched.add(ac);
   ac.addEventListener('statechange',()=>{if(ac===this.context&&ac.state!=='running')this.cancel('audio interrupted');});
  }
  // Fetch/decode early during the existing explicit Sound/Test/touch activation.
  this.clips.forEach((_,index)=>this.prepare(ac,index).catch(()=>{}));
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
  // Alternate accepted taps. Test has its own cursor, so auditioning never
  // consumes the first tap or skips a take. Other reaction choices stay intact.
  const index=kind==='tap'?this.tapNext:kind==='test'?this.testNext:0,clip=this.clips[index];
  const request={generation:this.generation,kind,index,expires:now+2000};this.pending=request;
  const valid=()=>this.pending===request&&request.generation===this.generation&&this.eligible();
  const failed=error=>{
   if(!valid())return;
   this.pending=null;this.error=String(error?.message||error||'Audio activation failed');
   this.status('Laugh could not start. Tap Test Holly Laugh to retry.');
  };
  this.withAudio(ac=>{
   if(!valid())return;
   this.status(clip.buffer?'Holly laugh ready.':'Loading Holly laugh…');
   this.prepare(ac,index).then(buffer=>{
    if(!valid())return;
    if(ac.state!=='running'||ac!==this.context){this.cancel('audio interrupted');return;}
    if(this.now()>request.expires){this.pending=null;this.status('Holly laugh ready. Tap again to play.');return;}
    const source=ac.createBufferSource(),gain=ac.createGain(),t=ac.currentTime;
    source.buffer=buffer;source.playbackRate.value=1;source.loop=false;
    // Match Test Holly Laugh for every accepted reaction. The old 1.10-second
    // tap duration cut off the rest of the performance; always play to EOF.
    const duration=buffer.duration;
    gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(1,t+.01);
    gain.gain.setValueAtTime(1,t+duration-.025);gain.gain.linearRampToValueAtTime(0,t+duration);
    source.connect(gain);gain.connect(ac.destination);
    const active={source,gain,index};this.active=active;this.pending=null;
    source.onended=()=>{source.disconnect();gain.disconnect();if(this.active===active)this.active=null;};
    source.start(t);
    // Only actual playback advances the sequence: ignored, failed, expired or
    // cancelled requests never skip a laugh. Both takes share the same gate.
    if(kind==='tap')this.tapNext=1-index;
    if(kind==='test')this.testNext=1-index;
    clip.plays++;this.lastClip=index+1;
    this.nextAt=this.now()+(kind==='tap'?2600:4200);
    if(kind==='shake')this.shakeAt=this.now()+12000;
    this.counts[kind]++;this.lastReason=kind;this.error='';
    this.status('Holly laugh '+(index+1)+' of 2. Auto Jiggle stays silent.');
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
 snapshot(){return {ready:!!this.clips[0].buffer,loading:this.clips.some(c=>c.loading||c.decoding),clips:this.clips.map(c=>({ready:!!c.buffer,plays:c.plays,error:c.error,duration:c.buffer?.duration||0})),nextTap:this.tapNext+1,nextTest:this.testNext+1,lastClip:this.lastClip,activeClip:this.active?this.active.index+1:null,pending:!!this.pending,active:!!this.active,activated:!!this.context&&this.context.state==='running',counts:{...this.counts},lastReason:this.lastReason,error:this.error,cooldown:Math.max(0,this.nextAt-this.now()),shakeCooldown:Math.max(0,this.shakeAt-this.now())};}
}
root.HollyAudio=HollyAudio;
})(globalThis);
