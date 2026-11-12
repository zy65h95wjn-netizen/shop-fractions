// Real animation loop, offline reload, source hash, settings isolation, audio
// scheduling and browser-native touch. No production test hooks.
const {chromium,fs,path,assert,out,base}=require('./harness.cjs');
const crypto=require('node:crypto');
const report={checks:0,renderers:[],errors:[]};
const ok=(v,label)=>{assert.ok(v,label);report.checks++;};
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
 for(const fallback of (process.env.PEACH_BACKEND==='canvas'?[true]:process.env.PEACH_BACKEND==='webgl'?[false]:[false,true])){
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  if(fallback)await context.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(t,...a){return t.includes('webgl')?null:get.call(this,t,...a);};});
  await context.addInitScript(()=>{
   const Audio=window.AudioContext||window.webkitAudioContext;window.__audioProof={starts:[],contexts:[]};
   if(Audio)window.AudioContext=class extends Audio{
    constructor(...args){super(...args);window.__audioProof.contexts.push(this);}
    createOscillator(){const n=super.createOscillator(),start=n.start.bind(n);n.start=(t)=>{window.__audioProof.starts.push(t);return start(t);};return n;}
   };
  });
  const p=await context.newPage();p.on('pageerror',e=>report.errors.push(e.message));
  await p.goto(base+'/peach-physics/v8/?character=santa');await p.waitForFunction(()=>window.__peachPhysicsDebug?.snapshot().character==='santa'&&__peachPhysicsDebug.snapshot().frames>4);
  const snapshot=await p.evaluate(()=>__peachPhysicsDebug.snapshot());ok(snapshot.renderer===(fallback?'canvas':'webgl'),'renderer active');
  ok(snapshot.characters.join(',')==='ember,midnight,aurelia,holly,santa','fifth slot');
  const bytes=await p.evaluate(async()=>Array.from(new Uint8Array(await (await fetch('./assets/santa-claus.jpg')).arrayBuffer())));
  ok(crypto.createHash('sha256').update(Buffer.from(bytes)).digest('hex')==='0c081474e67e0f5a94a12fdce68f712884933485a21082d45b9c36188cfea5ed','served original bytes');
  const f=snapshot.framing;await p.touchscreen.tap(f.x+355/1024*f.width,f.y+790/1280*f.height);
  await p.waitForFunction(()=>__peachPhysicsDebug.snapshot().slapCount>0);
  const t0=await p.evaluate(()=>({time:performance.now(),frames:__peachPhysicsDebug.snapshot().frames}));
  await p.waitForTimeout(1200);const t1=await p.evaluate(()=>({time:performance.now(),frames:__peachPhysicsDebug.snapshot().frames}));
  const fps=(t1.frames-t0.frames)*1000/(t1.time-t0.time);ok(fps>2,'animation loop continues');
  await p.locator('#gear').click();await p.locator('#slapAudio').click();await p.locator('#santaLaugh').click();
  await p.waitForFunction(()=>__peachPhysicsDebug.snapshot().santaLaughSound);
  await p.waitForFunction(()=>window.__audioProof.starts.length===3&&window.__audioProof.contexts.every(c=>c.state==='running'));
  const sound=await p.evaluate(()=>({starts:window.__audioProof.starts,states:window.__audioProof.contexts.map(c=>c.state)}));
  ok(sound.starts.length===3&&sound.starts[1]-sound.starts[0]>.25&&sound.starts[2]-sound.starts[1]>.25,'three original chuckles on active audio clock');
  await p.locator('[data-preset="chaos"]').click();await p.locator('#close').click();
  // Install the unmodified production worker explicitly on secure localhost.
  await p.evaluate(async()=>{await caches.open('peach-physics-v008-r10');await navigator.serviceWorker.register('./sw.js',{scope:'./'});await navigator.serviceWorker.ready;});
  await p.waitForFunction(()=>navigator.serviceWorker.controller);
  const keys=await p.evaluate(()=>caches.keys());ok(!keys.includes('peach-physics-v008-r10'),'superseded r10 cache retired after r11 install');ok(keys.includes('peach-physics-v008-r11'),'r11 offline cache installed');
  await context.setOffline(true);await p.reload();await p.waitForFunction(()=>window.__peachPhysicsDebug?.snapshot().frames>3);
  ok((await p.evaluate(()=>__peachPhysicsDebug.snapshot().preset))==='chaos','offline preset restored');
  for(const id of ['ember','midnight','aurelia','holly','santa']){
   await p.evaluate(id=>__peachPhysicsDebug.switchCharacter(id),id);await p.waitForFunction(id=>__peachPhysicsDebug.snapshot().character===id,id);ok(true,id+' switches offline');
  }
  const offline=await p.evaluate(()=>__peachPhysicsDebug.snapshot());ok(offline.santaLaughEnabled&&offline.slapAudioEnabled,'Santa options persist offline');
  await p.screenshot({path:path.join(out,`santa-${fallback?'canvas':'webgl'}-phone.png`)});
  report.renderers.push({renderer:snapshot.renderer,softwareDesktopFPS:+fps.toFixed(1),offline:true,audioScheduled:true,audio:sound});
  await context.close();console.log(snapshot.renderer+' runtime passed');
 }
 ok(report.errors.length===0,'no runtime errors');
 fs.writeFileSync(path.join(out,'santa-runtime.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
