const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
const character=process.argv[2]||'holly';
const files={holly:['assets/audio/holly-giggle.wav','assets/audio/holly-giggle-2.wav'],ember:['assets/candidates/cv-1.wav','assets/candidates/cv-2.wav'],midnight:['assets/candidates/splice-1.wav','assets/candidates/splice-2.wav'],aurelia:['assets/candidates/mox-1.wav','assets/candidates/mox-2.wav']}[character];assert(files,'known character');
const dir=path.resolve(__dirname,'..'),url='http://127.0.0.1:8000/peach-physics/experiments/r14-other-laughs/index.html?character='+character;
const html=fs.readFileSync(dir+'/index.html','utf8').replace('presentCharacter();\ngetPhoto','window.__audioTest={ac:()=>audioContext,laugh:voices.current(),reset,chooseCharacter};window.__loadingCharacter='+JSON.stringify(character)+';window.__loadingDebug={snapshot:()=>voices.players['+JSON.stringify(character)+'].snapshot()};\npresentCharacter();\ngetPhoto');
let checks=0;const eq=(a,b,msg)=>{assert.deepEqual(a,b,msg);checks++;},ok=(v,msg)=>{assert(v,msg);checks++;};const report=[];
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=user-gesture-required']});
 try{
 for(const cancel of ['mute','reset','switch','hidden','blur','pagehide','pointercancel']){
  const context=await browser.newContext({viewport:{width:390,height:844}}),p=await context.newPage();let release;const gate=new Promise(r=>release=r),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.route('**/index.html?*',route=>route.fulfill({contentType:'text/html',body:html}));
  await p.route('**/'+files[0],async route=>{await gate;await route.fulfill({contentType:'audio/wav',body:fs.readFileSync(dir+'/'+files[0])});});
  await p.goto(url);await p.waitForFunction(()=>window.__loadingDebug&&document.querySelector('#loader').classList.contains('hiding'));await p.click('#gear');await p.click('#slapAudio');await p.click('#testSound');
  ok(await p.evaluate(()=>__loadingDebug.snapshot().pending),'one pending initial load '+cancel);
  for(let i=0;i<5;i++)await p.evaluate(()=>document.querySelector('#testSound').click());
  await p.evaluate(cancel=>{
   if(cancel==='mute')document.querySelector('#slapAudio').click();
   if(cancel==='reset')__audioTest.reset();
   if(cancel==='switch')__audioTest.chooseCharacter(window.__loadingCharacter==='ember'?1:0);
   if(cancel==='hidden'){Object.defineProperty(document,'hidden',{value:true,configurable:true});document.dispatchEvent(new Event('visibilitychange'));}
   if(cancel==='blur'||cancel==='pagehide')window.dispatchEvent(new Event(cancel));
   if(cancel==='pointercancel')document.querySelector('#game').dispatchEvent(new PointerEvent('pointercancel',{pointerId:10}));
  },cancel);
  release();await p.waitForFunction(()=>__loadingDebug.snapshot().ready);await p.waitForTimeout(120);
  const d=await p.evaluate(()=>__loadingDebug.snapshot());eq(d.counts,{tap:0,release:0,shake:0,test:0},cancel+' never plays stale decoded audio');ok(!d.pending&&!d.active,cancel+' clears pending');eq(errors,[],cancel+' page errors');report.push({cancel,passed:true});await context.close();
 }
 // The first real tap also survives an in-progress initial decode, without a queue.
 {
  const c=await browser.newContext({viewport:{width:390,height:844}}),p=await c.newPage();let release;const gate=new Promise(r=>release=r);
  await p.route('**/index.html?*',r=>r.fulfill({contentType:'text/html',body:html}));await p.route('**/'+files[0],async r=>{await gate;await r.fulfill({contentType:'audio/wav',body:fs.readFileSync(dir+'/'+files[0])});});
  await p.goto(url);await p.click('#gear');await p.click('#slapAudio');await p.click('#close');
  const target=await p.evaluate(()=>{const d=__peachPhysicsDebug.snapshot(),f=d.framing,r=d.regions[0];return{x:f.x+r.x/d.image[0]*f.width,y:f.y+r.y/d.image[1]*f.height};});
  await p.mouse.click(target.x,target.y);ok(await p.evaluate(()=>__loadingDebug.snapshot().pending),'first tap waits for initial decoding');release();await p.waitForFunction(()=>__loadingDebug.snapshot().active);eq(await p.evaluate(()=>__loadingDebug.snapshot().counts.tap),1,'first accepted real tap plays exactly once');await c.close();
 }
 // An expired request is dropped rather than turning into delayed background laughter.
 {
  const c=await browser.newContext(),p=await c.newPage();let release;const gate=new Promise(r=>release=r);await p.route('**/index.html?*',r=>r.fulfill({contentType:'text/html',body:html}));await p.route('**/'+files[0],async r=>{await gate;await r.fulfill({contentType:'audio/wav',body:fs.readFileSync(dir+'/'+files[0])});});await p.goto(url);await p.click('#gear');await p.click('#slapAudio');await p.click('#testSound');await p.waitForTimeout(2150);release();await p.waitForFunction(()=>__loadingDebug.snapshot().ready&&!__loadingDebug.snapshot().pending);eq(await p.evaluate(()=>__loadingDebug.snapshot().counts.test),0,'expired loading request not queued');await p.click('#testSound');await p.waitForFunction(()=>__loadingDebug.snapshot().active);eq(await p.evaluate(()=>__loadingDebug.snapshot().counts.test),1,'new explicit test succeeds after loading');await c.close();
 }
 // Failed downloads and decoder errors both recover on the next explicit Test.
 for(const corrupt of [false,true]){
  const c=await browser.newContext(),p=await c.newPage();let failed=true;await p.route('**/index.html?*',r=>r.fulfill({contentType:'text/html',body:html}));await p.route('**/'+files[0],r=>r.fulfill(failed?{status:corrupt?200:503,contentType:'text/plain',body:'unavailable'}:{contentType:'audio/wav',body:fs.readFileSync(dir+'/'+files[0])}));await p.goto(url);await p.click('#gear');await p.click('#slapAudio');await p.click('#testSound');await p.waitForFunction(()=>__loadingDebug.snapshot().error&&!__loadingDebug.snapshot().pending);ok((await p.locator('#audioStatus').textContent()).includes('retry'),'visible retry '+corrupt);failed=false;await p.click('#testSound');await p.waitForFunction(()=>__loadingDebug.snapshot().active);eq(await p.evaluate(()=>__loadingDebug.snapshot().counts.test),1,'failed recording retry '+corrupt);await c.close();
 }
 // The second take cannot block the first, queue behind it, or skip on cancellation/failure.
 for(const mode of ['delayed','failed']){
  const c=await browser.newContext({viewport:{width:390,height:844}}),p=await c.newPage();let release,failed=true;const gate=new Promise(r=>release=r);
  await p.route('**/index.html?*',r=>r.fulfill({contentType:'text/html',body:html}));
  await p.route('**/'+files[1],async r=>{if(mode==='delayed')await gate;await r.fulfill(mode==='failed'&&failed?{status:503,body:'unavailable'}:{contentType:'audio/wav',body:fs.readFileSync(dir+'/'+files[1])});});
  await p.goto(url);await p.click('#gear');await p.click('#slapAudio');await p.waitForFunction(()=>__loadingDebug.snapshot().ready);await p.click('#close');
  const target=await p.evaluate(()=>{const d=__peachPhysicsDebug.snapshot(),f=d.framing,r=d.regions[0];return{x:f.x+r.x/d.image[0]*f.width,y:f.y+r.y/d.image[1]*f.height};});
  await p.mouse.click(target.x,target.y);await p.waitForFunction(()=>__loadingDebug.snapshot().active);eq(await p.evaluate(()=>__loadingDebug.snapshot().lastClip),1,'first take available despite second '+mode);await p.waitForTimeout(2700);
  await p.mouse.click(target.x,target.y);
  if(mode==='delayed'){
   ok(await p.evaluate(()=>__loadingDebug.snapshot().pending),'second take waits without advancing');
   for(let i=0;i<4;i++)await p.mouse.click(target.x,target.y);
   await p.evaluate(()=>__audioTest.reset());release();await p.waitForFunction(()=>__loadingDebug.snapshot().clips[1].ready);await p.waitForTimeout(100);
  }else{await p.waitForFunction(()=>__loadingDebug.snapshot().error&&!__loadingDebug.snapshot().pending);failed=false;}
  eq(await p.evaluate(()=>__loadingDebug.snapshot().counts.tap),1,'no queued or failed second laugh '+mode);
  eq(await p.evaluate(()=>__loadingDebug.snapshot().nextTap),2,'second remains next after '+mode);
  await p.mouse.click(target.x,target.y);await p.waitForFunction(()=>__loadingDebug.snapshot().active);eq(await p.evaluate(()=>__loadingDebug.snapshot().lastClip),2,'second retry plays correct take '+mode);eq(await p.evaluate(()=>__loadingDebug.snapshot().nextTap),1,'sequence advances only on successful second playback '+mode);await c.close();
 }
 // Safari-like interrupted resume, rejected resume and late resume cancellation.
 {
  const c=await browser.newContext(),p=await c.newPage();await p.route('**/index.html?*',r=>r.fulfill({contentType:'text/html',body:html}));await p.goto(url);await p.click('#gear');await p.click('#slapAudio');await p.waitForFunction(()=>__loadingDebug.snapshot().ready);
  await p.evaluate(()=>{const ac=__audioTest.ac();window.originalResume=ac.resume.bind(ac);window.forcedState='interrupted';Object.defineProperty(ac,'state',{get:()=>forcedState,configurable:true});ac.dispatchEvent(new Event('statechange'));ac.resume=()=>new Promise((resolve,reject)=>{window.resolveResume=async()=>{forcedState='running';await originalResume();resolve();};window.rejectResume=()=>reject(Error('permission denied fixture'));});});
  await p.click('#testSound');ok(await p.evaluate(()=>__loadingDebug.snapshot().pending),'interrupted waits for resume');await p.evaluate(()=>rejectResume());await p.waitForFunction(()=>!__loadingDebug.snapshot().pending);eq(await p.evaluate(()=>__loadingDebug.snapshot().counts.test),0,'resume rejection silent');
  await p.click('#testSound');await p.evaluate(()=>{__audioTest.reset();resolveResume();});await p.waitForTimeout(120);eq(await p.evaluate(()=>__loadingDebug.snapshot().counts.test),0,'late resume after reset ignored');
  await p.click('#testSound');await p.waitForFunction(()=>__loadingDebug.snapshot().active);eq(await p.evaluate(()=>__loadingDebug.snapshot().counts.test),1,'interrupted retry succeeds');
  await p.evaluate(async()=>{delete __audioTest.ac().state;await __audioTest.ac().close();});await p.waitForFunction(()=>!__loadingDebug.snapshot().active);await p.click('#testSound');await p.waitForFunction(()=>__loadingDebug.snapshot().active);eq(await p.evaluate(()=>__audioTest.ac().state),'running','closed context recreated');await c.close();
 }
 fs.writeFileSync(__dirname+'/loading-'+character+'.json',JSON.stringify({character,checks,results:report,passed:true},null,2)+'\n');console.log({checks,passed:true});
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
