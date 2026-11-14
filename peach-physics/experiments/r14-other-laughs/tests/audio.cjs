const h=require('../../../v8/tests/harness.cjs');
const dir=h.path.resolve(__dirname,'..'),version='experiments/r14-other-laughs';let checks=0;const results=[];
const ok=(v,m)=>{h.assert.ok(v,m);checks++;},eq=(a,b,m)=>{h.assert.deepEqual(a,b,m);checks++;};
const hook=`window.__audioTest={ac:()=>audioContext,laugh:voices.players.holly,motion,ui:motionUI};\npresentCharacter();\ngetPhoto`;
const source='/tmp/holly-audio-test.html';h.fs.writeFileSync(source,h.fs.readFileSync(h.path.join(dir,'index.html'),'utf8').replace('presentCharacter();\ngetPhoto',hook).replace('<head>', '<head><script>Object.defineProperty(DeviceMotionEvent,"requestPermission",{value:()=>Promise.resolve("granted"),configurable:true});</script>'));
const snap=p=>p.evaluate(()=>__hollyAudioDebug.snapshot());
const next=p=>p.evaluate(()=>{window.testClock+=15000;});
const open=async p=>{if(!(await p.locator('#panel').evaluate(x=>x.classList.contains('open'))))await p.click('#gear');};
const click=async(p,id)=>{await open(p);await p.click('#'+id);};
const waitActive=p=>p.waitForFunction(()=>__hollyAudioDebug.snapshot().active,null,{polling:20});
const waitDone=p=>p.waitForFunction(()=>!__hollyAudioDebug.snapshot().active&&!__hollyAudioDebug.snapshot().pending,null,{polling:20});
async function tap(p,kind='tap'){
 await p.evaluate(kind=>{
  const s=__peachPhysicsDebug.snapshot(),x=s.framing.x+s.regions[0].x/s.image[0]*s.framing.width,y=s.framing.y+s.regions[0].y/s.image[1]*s.framing.height;
  const fire=(type,dx=0,dy=0)=>document.querySelector('#game').dispatchEvent(new PointerEvent(type,{pointerId:17,pointerType:'touch',clientX:x+dx,clientY:y+dy,bubbles:true}));
  fire('pointerdown');window.testClock+=20;
  if(kind!=='tap'){fire('pointermove',20,20);window.testClock+=20;fire('pointermove',40,40);window.testClock+=kind==='drag'?400:10;}
  fire(kind==='cancel'?'pointercancel':'pointerup',kind==='tap'?0:40,kind==='tap'?0:40);
 },kind);
}
async function capture(p){
 await p.evaluate(async()=>{
  const ac=__audioTest.ac(),tap=ac.createGain(),sink=ac.createGain();sink.gain.value=0;
  // Capture on the audio thread. ScriptProcessor can lose a render quantum
  // while the main thread handles the rapid-tap stress case.
  const code=`class GraphCapture extends AudioWorkletProcessor {
   constructor(){super();this.data=new Float32Array(1024);this.offset=0;}
   process(inputs){const data=inputs[0]?.[0]||new Float32Array(128);this.data.set(data,this.offset);this.offset+=data.length;
    if(this.offset===1024){this.port.postMessage(this.data.buffer,[this.data.buffer]);this.data=new Float32Array(1024);this.offset=0;}return true;}
  }registerProcessor('graph-capture',GraphCapture);`;
  const url=URL.createObjectURL(new Blob([code],{type:'text/javascript'}));await ac.audioWorklet.addModule(url);URL.revokeObjectURL(url);
  const processor=new AudioWorkletNode(ac,'graph-capture',{numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[1]});
  window.__recording=[];processor.port.onmessage=e=>{__recording.push(...new Float32Array(e.data));};
  tap.connect(processor);processor.connect(sink);sink.connect(ac.destination);
  const original=AudioNode.prototype.connect;
  AudioNode.prototype.connect=function(dest,...args){const r=original.call(this,dest,...args);if(dest===ac.destination&&this!==sink)original.call(this,tap);return r;};
  window.__capture={rate:ac.sampleRate,tap,processor,sink};
 });
}
async function clearCapture(p){await p.evaluate(()=>{__recording.length=0;});}
async function recorded(p,name){
 const x=await p.evaluate(()=>({rate:__capture.rate,values:__recording}));
 const values=x.values;
 let max=0,sum=0,active=0;for(const v of values){max=Math.max(max,Math.abs(v));sum+=v*v;if(Math.abs(v)>.001)active++;}
 const stats={samples:values.length,sampleRate:x.rate,peak:max,rms:Math.sqrt(sum/Math.max(values.length,1)),audibleSamples:active};
 if(name){const pcm=Buffer.alloc(values.length*2);values.forEach((v,i)=>pcm.writeInt16LE(Math.max(-32768,Math.min(32767,Math.round(v*32767))),i*2));const header=Buffer.alloc(44);header.write('RIFF',0);header.writeUInt32LE(36+pcm.length,4);header.write('WAVEfmt ',8);header.writeUInt32LE(16,16);header.writeUInt16LE(1,20);header.writeUInt16LE(1,22);header.writeUInt32LE(x.rate,24);header.writeUInt32LE(x.rate*2,28);header.writeUInt16LE(2,32);header.writeUInt16LE(16,34);header.write('data',36);header.writeUInt32LE(pcm.length,40);h.fs.writeFileSync(h.path.join(__dirname,name+'.wav'),Buffer.concat([header,pcm]));}
 return stats;
}
async function cancelCase(p,action,name){
 await next(p);await click(p,'testSound');await waitActive(p);await p.waitForTimeout(180);await action();await p.waitForTimeout(150);await clearCapture(p);await p.waitForTimeout(160);
 const state=await snap(p),stats=await recorded(p);ok(!state.active&&!state.pending,name+' clears playback');ok(stats.peak===0,name+' graph silent');results.push({test:name,stats});
}
(async()=>{
 const browser=await h.chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--autoplay-policy=user-gesture-required','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
 for(const fallback of [false,true]){
  console.log('Audio renderer',fallback?'canvas':'webgl');
  const {page:p,context,errors}=await h.setup(browser,version,{width:390,height:844},true,fallback,false,source);
  await h.character(p,'holly');eq(await p.locator('#testSound').textContent(),'Test Holly Laugh','Holly test label');
  await tap(p);eq((await snap(p)).counts.tap,0,'Sound Off silent');
  await click(p,'slapAudio');await p.waitForFunction(()=>__hollyAudioDebug.snapshot().ready,null,{polling:20});ok((await snap(p)).activated,'Sound click unlocks');
  await capture(p);const physicsBefore=await p.evaluate(()=>__test.raw());
  await click(p,'testSound');await waitActive(p);eq(await p.evaluate(()=>__test.raw()),physicsBefore,'Test button has no physics side effects');
  await p.waitForTimeout(1950);const full=await recorded(p,fallback?'canvas-laugh':'webgl-laugh');ok(full.peak>.1&&full.peak<.9&&full.rms>.005,'actual human recording graph non-silent and unclipped');ok(full.audibleSamples>10000,'substantial recorded output');
  await waitDone(p);await next(p);await clearCapture(p);await tap(p);await waitActive(p);eq((await snap(p)).counts.tap,1,'first tap deterministic');
  for(let i=0;i<20;i++)await tap(p);eq((await snap(p)).counts.tap,1,'rapid taps never stack');
  await p.evaluate(()=>document.querySelector('#game').dispatchEvent(new PointerEvent('pointercancel',{pointerId:999,pointerType:'touch'})));
  ok((await snap(p)).active,'unrelated cancelled touch does not interrupt an accepted laugh');
  await p.waitForTimeout(1950);await waitDone(p);const tapRecording=await recorded(p,fallback?'canvas-tap':'webgl-tap');ok(tapRecording.peak>.1&&tapRecording.rms>.005,'complete tap graph audible');await tap(p);eq((await snap(p)).counts.tap,1,'cooldown after clip');
  eq((await snap(p)).nextTap,2,'blocked taps never advance variety');
  await next(p);await clearCapture(p);await tap(p);await waitActive(p);eq((await snap(p)).lastClip,2,'second accepted tap selects the other recording');
  const blockedCounts=(await snap(p)).counts;await click(p,'testSound');eq((await snap(p)).counts,blockedCounts,'Test never overlaps a tap');
  await p.waitForTimeout(2300);await waitDone(p);const secondTap=await recorded(p,fallback?'canvas-tap-2':'webgl-tap-2');ok(secondTap.peak>.1&&secondTap.peak<.9,'second tap audible and unclipped');
  await next(p);await tap(p);await waitActive(p);eq((await snap(p)).lastClip,1,'third accepted tap returns to first laugh');await waitDone(p);
  const nextTap=(await snap(p)).nextTap;await clearCapture(p);await click(p,'testSound');await waitActive(p);eq((await snap(p)).lastClip,2,'Test cycles independently to second laugh');eq((await snap(p)).nextTap,nextTap,'Test does not consume tap variety');
  await p.waitForTimeout(2300);await waitDone(p);await recorded(p,fallback?'canvas-test-2':'webgl-test-2');
  await next(p);await tap(p,'flick');await waitActive(p);eq((await snap(p)).counts.release,1,'flick release laugh');eq((await snap(p)).lastClip,1,'existing flick recording retained');await waitDone(p);
  await next(p);await tap(p,'drag');await waitActive(p);eq((await snap(p)).counts.release,2,'deliberate slow drag release laugh');await waitDone(p);
  await next(p);const beforeCancel=(await snap(p)).counts;await tap(p,'cancel');await p.waitForTimeout(100);eq((await snap(p)).counts,beforeCancel,'pointer cancel silent');
  // Existing R14 Auto default remains on and cannot call the physical sample hook.
  const beforeAuto=(await snap(p)).counts;
  await p.evaluate(()=>{for(let i=0;i<3600;i++){testClock+=1000/120;__audioTest.motion.tick(1/120);__test.step(1/120);}});
  eq((await snap(p)).counts,beforeAuto,'30 seconds Auto silent');
  await click(p,'shakeMotion');ok(await p.evaluate(()=>__audioTest.ui.snapshot().granted),'motion explicitly enabled');
  async function shake(strong=true,valid=true){await p.evaluate(({strong,valid})=>{const m=__audioTest.motion;m.time=m.quietUntil+1;for(let i=0;i<12;i++){testClock+=20;const e=new Event('devicemotion');Object.defineProperty(e,'acceleration',{value:valid?{x:strong?10:.15,y:strong?8:.1,z:0}:{x:null,y:null,z:null}});window.dispatchEvent(e);m.tick(.02);}},{strong,valid});}
  await next(p);await shake(false,false);await shake(false);eq((await snap(p)).counts.shake,0,'invalid and gentle readings silent');
  await shake();await waitActive(p);eq((await snap(p)).counts.shake,1,'energetic valid physical samples laugh');await waitDone(p);
  await p.evaluate(()=>testClock+=5000);await shake();eq((await snap(p)).counts.shake,1,'shake longer cooldown');await next(p);await shake();await waitActive(p);eq((await snap(p)).counts.shake,2,'shake after cooldown');await waitDone(p);
  console.log('Audio cancellation checks',fallback);
  await cancelCase(p,()=>click(p,'slapAudio'),'mute '+fallback);await tap(p);ok(!(await snap(p)).active,'muted taps remain silent');await click(p,'slapAudio');
  await cancelCase(p,()=>p.evaluate(()=>__test.reset()),'reset '+fallback);
  await cancelCase(p,()=>p.evaluate(()=>__test.chooseCharacter(0)),'switch '+fallback);await p.waitForFunction(()=>__peachPhysicsDebug.snapshot().character==='ember');eq(await p.locator('#testSound').textContent(),'Test Winter Ember Laugh','character-specific label');await h.character(p,'holly');
  await cancelCase(p,()=>p.evaluate(()=>{Object.defineProperty(document,'hidden',{value:true,configurable:true});document.dispatchEvent(new Event('visibilitychange'));}),'hidden '+fallback);
  await p.evaluate(()=>{Object.defineProperty(document,'hidden',{value:false,configurable:true});document.dispatchEvent(new Event('visibilitychange'));});ok(!(await snap(p)).active,'return never auto-replays');
  await cancelCase(p,()=>p.evaluate(()=>window.dispatchEvent(new Event('blur'))),'blur '+fallback);
  await next(p);await click(p,'testSound');await waitActive(p);await p.evaluate(()=>__audioTest.ac().suspend());await p.waitForFunction(()=>!__hollyAudioDebug.snapshot().active,null,{polling:20});ok(!(await snap(p)).activated,'suspension disarms sensor sound');await click(p,'testSound');await waitActive(p);eq(await p.evaluate(()=>__audioTest.ac().state),'running','explicit test gesture resumes context');await waitDone(p);
  await cancelCase(p,()=>p.evaluate(()=>window.dispatchEvent(new Event('pagehide'))),'pagehide '+fallback);await p.evaluate(()=>window.dispatchEvent(new Event('pageshow')));
  // Saved per-character sound preference restores without activating or playing on load.
  await p.reload();await p.waitForFunction(()=>window.__test&&document.querySelector('#loader').classList.contains('hiding'));eq(await p.evaluate(()=>__peachPhysicsDebug.snapshot().slapAudioEnabled),true,'Holly sound preference persists');ok(!(await snap(p)).activated,'reload never activates audio');
  await click(p,'testSound');await waitActive(p);await waitDone(p);eq(errors,[],'no browser exceptions');
  results.push({renderer:fallback?'canvas':'webgl',full,tap:tapRecording,secondTap,passed:true});await context.close();
 }
 const report={checks,results,passed:true,limitations:['Chromium Web Audio capture does not establish iPhone speaker playback or human naturalness.','Physical shake is synthetic sensor input, not a real iPhone.']};h.fs.writeFileSync(h.path.join(__dirname,'audio.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
