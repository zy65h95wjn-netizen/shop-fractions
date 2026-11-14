// Native browser touch input and real audio graph capture for the three new elves.
const h=require('../../../v8/tests/harness.cjs'),crypto=require('crypto');
const dir=h.path.resolve(__dirname,'..'),version='experiments/r14-other-laughs';
const characters={ember:{label:'Winter Ember',source:'cv'},midnight:{label:'Midnight Yule',source:'splice'},aurelia:{label:'Aurelia Frost',source:'mox'}};
const source='/tmp/r142-elf-audio.html';
h.fs.writeFileSync(source,h.fs.readFileSync(dir+'/index.html','utf8').replace('presentCharacter();\ngetPhoto',`window.__audioTest={ac:()=>audioContext,bank:voices,motion,ui:motionUI};\npresentCharacter();\ngetPhoto`).replace('<head>','<head><script>Object.defineProperty(DeviceMotionEvent,"requestPermission",{value:()=>Promise.resolve(window.motionAllowed?"granted":"denied"),configurable:true});</script>'));
const suite=h.fs.readFileSync(__dirname+'/audio.cjs','utf8');
const capture=eval('('+suite.slice(suite.indexOf('async function capture('),suite.indexOf('async function clearCapture')).trim()+')');
const clearCapture=eval('('+suite.slice(suite.indexOf('async function clearCapture('),suite.indexOf('async function recorded(')).trim()+')');
const recorded=eval('('+suite.slice(suite.indexOf('async function recorded('),suite.indexOf('async function cancelCase(')).trim()+')');
const snap=p=>p.evaluate(()=>__elfAudioDebug.snapshot());
const active=p=>p.waitForFunction(()=>__elfAudioDebug.snapshot().current?.active,null,{polling:20});
const done=p=>p.waitForFunction(()=>!__elfAudioDebug.snapshot().activeCount&&!__elfAudioDebug.snapshot().pendingCount,null,{polling:20});
const next=p=>p.evaluate(()=>{testClock+=15000;});
const control=async(p,id)=>{if(!(await p.locator('#panel').evaluate(e=>e.classList.contains('open'))))await p.click('#gear');await p.click('#'+id);};
const close=async p=>{if(await p.locator('#panel').evaluate(e=>e.classList.contains('open')))await p.click('#close');};
let checks=0;const results=[];
const ok=(v,m)=>{h.assert.ok(v,m);checks++;},eq=(a,b,m)=>{h.assert.deepEqual(a,b,m);checks++;};
function wav(values,rate,file){const data=Buffer.alloc(values.length*2);values.forEach((v,i)=>data.writeInt16LE(Math.max(-32768,Math.min(32767,Math.round(v*32767))),i*2));const head=Buffer.alloc(44);head.write('RIFF');head.writeUInt32LE(36+data.length,4);head.write('WAVEfmt ',8);head.writeUInt32LE(16,16);head.writeUInt16LE(1,20);head.writeUInt16LE(1,22);head.writeUInt32LE(rate,24);head.writeUInt32LE(rate*2,28);head.writeUInt16LE(2,32);head.writeUInt16LE(16,34);head.write('data',36);head.writeUInt32LE(data.length,40);h.fs.writeFileSync(file,Buffer.concat([head,data]));}
async function shake(p,strong=true,valid=true){await p.evaluate(({strong,valid})=>{const m=__audioTest.motion;m.time=m.quietUntil+1;for(let i=0;i<12;i++){testClock+=20;const e=new Event('devicemotion');Object.defineProperty(e,'acceleration',{value:valid?{x:strong?10:.15,y:strong?8:.1,z:0}:{x:null,y:null,z:null}});dispatchEvent(e);m.tick(.02);}},{strong,valid});}
async function touch(p,cdp,kind='tap'){
 await close(p);
 const {x,y}=await p.evaluate(()=>{const d=__peachPhysicsDebug.snapshot(),f=d.framing,r=d.regions[0];return{x:f.x+r.x/d.image[0]*f.width,y:f.y+r.y/d.image[1]*f.height};});
 const point=(dx=0,dy=0)=>[{x:x+dx,y:y+dy,id:1,radiusX:3,radiusY:3,force:.5}];
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:point()});await p.evaluate(()=>{testClock+=20;});
 if(kind!=='tap'){
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:point(20,20)});await p.evaluate(()=>{testClock+=20;});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:point(40,40)});await p.evaluate(kind=>{testClock+=kind==='drag'?400:10;},kind);
 }
 await cdp.send('Input.dispatchTouchEvent',{type:kind==='cancel'?'touchCancel':'touchEnd',touchPoints:[]});
}
async function cancelCase(p,action,label){
 await control(p,'testSound');await active(p);await action();await p.waitForTimeout(120);await clearCapture(p);await p.waitForTimeout(150);
 const d=await snap(p);eq(d.activeCount,0,label+' active cleared');eq(d.pendingCount,0,label+' pending cleared');eq((await recorded(p)).peak,0,label+' actual graph silent');
}
(async()=>{
 const b=await h.chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--autoplay-policy=user-gesture-required','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{for(const fallback of [false,true])for(const [id,profile]of Object.entries(characters)){
  const renderer=fallback?'canvas':'webgl';console.log('Testing',id,renderer);
  const {page:p,context,errors}=await h.setup(b,version,{width:390,height:844},true,fallback,false,source),cdp=await context.newCDPSession(p);
  await h.character(p,id);await p.evaluate(()=>{window.trustedTouches=0;document.querySelector('#game').addEventListener('pointerup',e=>{if(e.isTrusted&&e.pointerType==='touch')trustedTouches++;});});
  eq(await p.locator('#testSound').textContent(),'Test '+profile.label+' Laugh','per-character Test label');
  eq(await p.evaluate(()=>__peachPhysicsDebug.snapshot().slapAudioEnabled),false,'Sound off by default');
  await touch(p,cdp);eq((await snap(p)).current.counts.tap,0,'muted native tap silent');
  await control(p,'slapAudio');await p.waitForFunction(()=>__elfAudioDebug.snapshot().current?.clips.every(c=>c.ready),null,{polling:20});await capture(p);
  for(let take=1;take<=2;take++){
   await next(p);await clearCapture(p);await touch(p,cdp);await active(p);
   const d=await snap(p);eq(d.current.lastClip,take,id+' tap alternation');eq(d.activeCount,1,'one active across bank');eq(d.pendingCount,0,'no queued source');
   if(take===1){
    for(let i=0;i<8;i++)await touch(p,cdp);
    eq((await snap(p)).current.counts.tap,1,'rapid native taps do not overlap');
    await p.evaluate(()=>document.querySelector('#game').dispatchEvent(new PointerEvent('pointercancel',{pointerId:999,pointerType:'touch'})));
    ok((await snap(p)).current.active,'unrelated cancelled touch does not cut off laugh');
   }
   const ref=await p.evaluate(take=>{const c=__audioTest.bank.current().clips[take-1],b=c.buffer;return{rate:b.sampleRate,values:Array.from(b.getChannelData(0)),duration:b.duration,url:c.url};},take);
   await done(p);await p.waitForTimeout(120);const stats=await recorded(p,'elf-'+renderer+'-'+id+'-'+take);
   ok(stats.peak>.01&&stats.peak<.95&&stats.rms>.001,'actual native tap output nonzero and unclipped');ok(stats.samples>=ref.values.length,'capture contains entire take');
   ref.values=ref.values.map((v,i)=>v*Math.min(1,i/ref.rate/.01,(ref.duration-i/ref.rate)/.025));wav(ref.values,ref.rate,__dirname+'/elf-reference-'+id+'-'+take+'.wav');
   const hash=await p.evaluate(async url=>{const bytes=await(await fetch(url)).arrayBuffer();return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');},ref.url);
   eq(hash,crypto.createHash('sha256').update(h.fs.readFileSync(dir+'/'+ref.url)).digest('hex'),'fetched source exact bytes');
   await touch(p,cdp);eq((await snap(p)).current.counts.tap,take,'cooldown blocks native tap');
   results.push({id,renderer,take,duration:ref.duration,stats,hash});
  }
  const nextTap=(await snap(p)).current.nextTap;
  for(let take=1;take<=2;take++){
   const physics=await p.evaluate(()=>__test.raw());await control(p,'testSound');await active(p);
   eq((await snap(p)).current.lastClip,take,'Test has independent alternating cursor');eq((await snap(p)).current.nextTap,nextTap,'Test never consumes tap variety');eq(await p.evaluate(()=>__test.raw()),physics,'Test produces no physics impulse');
   await control(p,'testSound');eq((await snap(p)).current.counts.test,take,'Test cannot overlap itself');await done(p);
  }
  await next(p);await touch(p,cdp,'flick');await active(p);eq((await snap(p)).current.counts.release,1,'native flick/release reacts');await done(p);
  await touch(p,cdp,'flick');eq((await snap(p)).current.counts.release,1,'release cooldown');
  await next(p);await touch(p,cdp,'drag');await active(p);eq((await snap(p)).current.counts.release,2,'deliberate slow release reacts');await done(p);
  await next(p);await touch(p,cdp,'cancel');eq((await snap(p)).current.counts.release,2,'cancelled drag silent');
  const counts=(await snap(p)).current.counts;
  await p.evaluate(()=>{for(let i=0;i<3600;i++){testClock+=1000/120;__audioTest.motion.tick(1/120);__test.step(1/120);}});
  eq((await snap(p)).current.counts,counts,'30 seconds Auto silent');
  await control(p,'shakeMotion');eq(await p.evaluate(()=>__audioTest.ui.snapshot().granted),false,'denied motion permission');
  await shake(p);eq((await snap(p)).current.counts.shake,0,'unpermitted sensor input silent');
  await p.evaluate(()=>{window.motionAllowed=true;});await control(p,'shakeMotion');ok(await p.evaluate(()=>__audioTest.ui.snapshot().granted),'explicit motion permission');
  await next(p);await shake(p,false,false);await shake(p,false);eq((await snap(p)).current.counts.shake,0,'invalid and gentle sensor readings silent');
  await shake(p);await active(p);eq((await snap(p)).current.counts.shake,1,'sustained energetic physical readings react');await done(p);
  await p.evaluate(()=>{testClock+=5000;});await shake(p);eq((await snap(p)).current.counts.shake,1,'longer shake cooldown');
  await next(p);await shake(p);await active(p);eq((await snap(p)).current.counts.shake,2,'shake after cooldown');await done(p);
  await cancelCase(p,()=>control(p,'slapAudio'),'mute');await touch(p,cdp);eq((await snap(p)).activeCount,0,'muted after opt-out');await control(p,'slapAudio');
  await cancelCase(p,()=>p.evaluate(()=>__test.reset()),'reset');
  await cancelCase(p,()=>h.character(p,'holly'),'character switch');
  eq(await p.evaluate(()=>__peachPhysicsDebug.snapshot().slapAudioEnabled),false,'Holly independent default Sound');
  await control(p,'slapAudio');await control(p,'testSound');await active(p);eq((await snap(p)).character,'holly','Holly after switch');eq((await snap(p)).activeCount,1,'Holly alone after switch');
  await h.character(p,id);eq((await snap(p)).activeCount,0,'switch away from Holly cancels');ok(await p.evaluate(()=>__peachPhysicsDebug.snapshot().slapAudioEnabled),'character Sound preference restored');
  await cancelCase(p,()=>p.evaluate(()=>{Object.defineProperty(document,'hidden',{value:true,configurable:true});document.dispatchEvent(new Event('visibilitychange'));}),'hidden');
  await p.evaluate(()=>{Object.defineProperty(document,'hidden',{value:false,configurable:true});document.dispatchEvent(new Event('visibilitychange'));});eq((await snap(p)).activeCount,0,'return never replays');
  await cancelCase(p,()=>p.evaluate(()=>dispatchEvent(new Event('blur'))),'blur');
  await cancelCase(p,()=>p.evaluate(()=>dispatchEvent(new Event('pagehide'))),'pagehide');
  await control(p,'testSound');await active(p);await p.evaluate(()=>__audioTest.ac().suspend());await done(p);ok(!(await snap(p)).current.activated,'suspension disarms sensor sound');
  await control(p,'testSound');await active(p);eq(await p.evaluate(()=>__audioTest.ac().state),'running','explicit gesture resumes');await done(p);
  ok(await p.evaluate(()=>trustedTouches>=10),'trusted browser touch events exercised');
  await p.reload();await p.waitForFunction(()=>window.__test&&document.querySelector('#loader').classList.contains('hiding'),null,{polling:20});
  eq((await snap(p)).character,id,'saved selected character');ok(await p.evaluate(()=>__peachPhysicsDebug.snapshot().slapAudioEnabled),'saved Sound restored');ok(!(await snap(p)).current.activated,'reload requires fresh audio activation');eq((await snap(p)).activeCount,0,'no automatic playback on reload');
  await control(p,'testSound');await active(p);await done(p);eq(errors,[],'no page errors');
  await context.close();
 }
 h.fs.writeFileSync(__dirname+'/elf-audio.json',JSON.stringify({checks,results,passed:true,limitations:['Native Chromium touch and browser PCM capture do not establish iPhone speaker behavior.','Sensor events and permission responses are simulated; candidate takes were approved by Lance, while character pairings await final listening approval.']},null,2)+'\n');console.log({checks,passed:true});
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exit(1)});
