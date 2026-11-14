// Native audio, actual touchscreen events, and recordings of the browser's
// voice output. A source-start counter alone cannot establish audible speech.
const h=require('../../../v8/tests/harness.cjs'),crypto=require('node:crypto');
const {fs,path,assert,chromium}=h,app=path.resolve(__dirname,'..');
const recordings=path.join(__dirname,'santa-voice-evidence');fs.mkdirSync(recordings,{recursive:true});
async function setup(b,fallback){
 const proxy={newContext:async options=>{const c=await b.newContext(options);await c.addInitScript(()=>{
  window.voiceProbe={phrases:0,oscillators:0,recordings:[],buffers:[]};const Native=window.AudioContext;
  window.AudioContext=class extends Native{constructor(...args){super(...args);
   const oscillator=this.createOscillator.bind(this);this.createOscillator=(...args)=>{voiceProbe.oscillators++;return oscillator(...args);};
   const create=this.createBufferSource.bind(this);this.createBufferSource=(...args)=>{const node=create(...args),start=node.start.bind(node),stop=node.stop.bind(node);let recorder;
    node.start=(...args)=>{if(node.buffer?.duration>1){
     voiceProbe.phrases++;let peak=0,energy=0;for(const value of node.buffer.getChannelData(0)){peak=Math.max(peak,Math.abs(value));energy+=value*value;}voiceProbe.buffers.push({duration:node.buffer.duration,peak,rms:Math.sqrt(energy/node.buffer.length),rate:node.playbackRate.value});
     const stream=this.createMediaStreamDestination();node.connect(stream);recorder=new MediaRecorder(stream.stream,{mimeType:'audio/webm;codecs=opus'});const parts=[];
     recorder.ondataavailable=e=>parts.push(e.data);recorder.onstop=async()=>{voiceProbe.recordings.push(Array.from(new Uint8Array(await new Blob(parts).arrayBuffer())));stream.stream.getTracks().forEach(t=>t.stop());};
     node.addEventListener('ended',()=>{if(recorder.state!=='inactive')recorder.stop();},{once:true});recorder.start();
    }return start(...args);};node.stop=(...args)=>stop(...args);return node;};
  }};
 });
 return c;}};
 return h.setup(proxy,'experiments/r14-other-laughs',{width:390,height:844},false,fallback);
}
async function tap(p){const pt=await p.evaluate(()=>{const s=__peachPhysicsDebug.snapshot(),r=s.regions[0],f=s.framing;return{x:f.x+r.x/s.image[0]*f.width,y:f.y+r.y/s.image[1]*f.height};});await p.touchscreen.tap(pt.x,pt.y);}
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});const report={backends:[],errors:[]};try{
 for(const fallback of [false,true]){
  const a=await setup(b,fallback),p=a.page,renderer=fallback?'canvas':'webgl';await p.evaluate(()=>__peachPhysicsDebug.switchCharacter('santa'));await p.waitForFunction(()=>__peachPhysicsDebug.snapshot().character==='santa');
  await p.locator('#gear').tap();await p.locator('#slapAudio').tap();await p.waitForFunction(()=>voiceProbe.phrases===1);
  await p.waitForFunction(()=>voiceProbe.recordings.length===1);assert.equal(await p.evaluate(()=>voiceProbe.oscillators),0,'Santa preview must be a recording, with no synthetic voice');
  await p.locator('#testSound').tap();await p.waitForFunction(()=>voiceProbe.phrases===2);await p.waitForFunction(()=>voiceProbe.recordings.length===2);
  await p.locator('#santaLaugh').tap();await p.waitForFunction(()=>voiceProbe.phrases===3);await p.locator('#reset').tap();await p.waitForTimeout(200);
  await tap(p);await p.waitForFunction(()=>voiceProbe.phrases===4);await tap(p);await p.waitForTimeout(250);assert.equal(await p.evaluate(()=>voiceProbe.phrases),4,'repeated belly tap cannot overlap/restart phrase');
  await p.waitForFunction(()=>voiceProbe.recordings.length===4);
  const capture=await p.evaluate(()=>voiceProbe.recordings[3]);assert(capture.length>4000);fs.writeFileSync(path.join(recordings,renderer+'-belly-tap.webm'),Buffer.from(capture));
  const buffers=await p.evaluate(()=>voiceProbe.buffers);for(const buffer of buffers){assert(buffer.duration>1.4&&buffer.duration<1.6);assert(buffer.peak>.05&&buffer.rms>.015,'clip must contain real non-silent signal');assert.equal(buffer.rate,1,'natural recording speed');}
  await p.locator('#gear').tap();await p.locator('#slapAudio').tap();await p.locator('#reset').tap();const before=await p.evaluate(()=>voiceProbe.phrases);await tap(p);await p.waitForTimeout(200);assert.equal(await p.evaluate(()=>voiceProbe.phrases),before,'Sound Off mutes belly laugh');
  await p.locator('#gear').tap();await p.locator('#slapAudio').tap();await p.waitForFunction(n=>voiceProbe.phrases>n,before);await p.evaluate(()=>__peachPhysicsDebug.switchCharacter('ember'));await p.waitForFunction(()=>__peachPhysicsDebug.snapshot().character==='ember');await p.waitForTimeout(300);assert.equal(await p.evaluate(()=>__peachPhysicsDebug.snapshot().slapAudioEnabled),false,'other character Sound stays unchanged');
  report.backends.push({renderer,recording:renderer+'-belly-tap.webm',buffers,actualTap:true,noOverlap:true,mute:true,characterSwitch:true});report.errors.push(...a.errors);await a.context.close();
 }
 assert.deepEqual(report.errors,[]);fs.writeFileSync(path.join(__dirname,'santa-voice.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});
