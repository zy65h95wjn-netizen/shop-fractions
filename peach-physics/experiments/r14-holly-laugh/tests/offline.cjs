const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict'),crypto=require('crypto'),{execFileSync}=require('child_process'),{chromium}=require('playwright');
const app=path.resolve(__dirname,'..'),baseline=path.resolve(app,'../../v8'),scope='/peach-physics/experiments/r14-holly-laugh/',prefix='peach-preview-r14-holly-laugh-',cache=prefix+'v3',motionKey=prefix+'peach-r13-motion-options-v1',ids=['ember','midnight','aurelia','holly','santa'];
const profiles=Object.fromEntries(ids.map((id,i)=>[id,{version:2,preset:'custom',bounce:61+i,softness:64+i,settle:50+i,transfer:17*i,slapAudioEnabled:false,...(id==='santa'?{santaLaughEnabled:true}:{})}]));
const prior='975b581a0dcf8100e20b44e87e2376d0b8f54f50';
const previous=Object.fromEntries(['index.html','sw.js','holly-audio.js','assets/audio/holly-giggle.wav'].map(name=>[name,execFileSync('git',['show',prior+':peach-physics/experiments/r14-holly-laugh/'+name],{cwd:app,maxBuffer:4e6})]));
const oldHTML=previous['index.html'].toString();
let checks=0;const ok=(v,label)=>{assert(v,label);checks++;},eq=(a,b,label)=>{assert.deepEqual(a,b,label);checks++;};const report=[];
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{for(const fallback of [false,true]){
  let promoted=false,gateAudio=true,releaseAudio,requested;const audioRequested=new Promise(r=>requested=r);
  const server=http.createServer((req,res)=>{
   const name=new URL(req.url,'http://localhost').pathname.slice(scope.length)||'index.html';
   if(!req.url.startsWith(scope)||name.includes('..')||!fs.existsSync(path.join(app,name))){res.writeHead(404);res.end();return;}
   res.writeHead(200,{'Content-Type':name.endsWith('.js')?'text/javascript':name.endsWith('.html')?'text/html':name.endsWith('.wav')?'audio/wav':name.endsWith('.png')?'image/png':name.endsWith('.jpg')?'image/jpeg':'application/json','Cache-Control':name==='motion.js'?'public,max-age=3600':'no-store'});
   if(promoted&&gateAudio&&name==='assets/audio/holly-giggle-2.wav'){releaseAudio=()=>{gateAudio=false;res.end(fs.readFileSync(path.join(app,name)));};requested();return;}
   res.end(!promoted&&previous[name]?previous[name]:fs.readFileSync(path.join(app,name)));
  });await new Promise(r=>server.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${server.address().port}${scope}`;
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await context.addInitScript(fallback=>{
   if(fallback){const g=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(t,...args){return t.includes('webgl')?null:g.call(this,t,...args)};}
   const source=AudioContext.prototype.createBufferSource,osc=AudioContext.prototype.createOscillator;window.__sounds=[];window.__voices=[];
   AudioContext.prototype.createBufferSource=function(){const n=source.call(this),start=n.start.bind(n);n.start=(...args)=>{__sounds.push({duration:n.buffer?.duration,rate:n.playbackRate.value});return start(...args)};return n;};
   AudioContext.prototype.createOscillator=function(){const n=osc.call(this),start=n.start.bind(n);n.start=(...args)=>{__voices.push(n.type);return start(...args)};return n;};
  },fallback);
  const p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  const ready=()=>p.waitForFunction(()=>window.__peachPhysicsDebug&&document.querySelector('#loader').classList.contains('hiding'));
  const select=async id=>{await p.evaluate(id=>__peachPhysicsDebug.switchCharacter(id),id);await p.waitForFunction(id=>__peachPhysicsDebug.snapshot().character===id,id);};
  const click=async id=>{if(!(await p.locator('#panel').evaluate(x=>x.classList.contains('open'))))await p.click('#gear');await p.click('#'+id);};
  try{
   await p.goto(url);await ready();
   await p.evaluate(async({profiles,prefix,motionKey})=>{
    localStorage.setItem(prefix+'v008-active','holly');
    for(const[id,v]of Object.entries(profiles))localStorage.setItem(prefix+(id==='holly'?'v0071':'v008')+'-profile-'+id,JSON.stringify(v));
    localStorage.setItem(motionKey,JSON.stringify({version:1,autoDefault:'holly-fullscreen-v1',auto:false,shake:true}));
    localStorage.setItem('peach-physics-v008-profile-holly','production-sentinel');localStorage.setItem('peach-r13-motion-options-v1','production-motion-sentinel');
    await caches.open('peach-physics-v008-r14-auto2');await caches.open('peach-santa-approved-preview-sentinel');
    await navigator.serviceWorker.register('./sw.js');await navigator.serviceWorker.ready;
   },{profiles,prefix,motionKey});
   await p.reload();await ready();await p.waitForFunction(()=>!!navigator.serviceWorker.controller);await p.evaluate(()=>window.previousController=navigator.serviceWorker.controller);
   promoted=true;await p.evaluate(()=>navigator.serviceWorker.getRegistration().then(r=>r.update()));await audioRequested;
   ok(await p.evaluate(()=>navigator.serviceWorker.controller===previousController),'audio install gate retains prior controller');
   ok((await p.evaluate(()=>caches.keys())).includes(prefix+'v2'),'prior cache retained until complete install');
   releaseAudio();await p.waitForFunction(async cache=>navigator.serviceWorker.controller!==previousController&&(await caches.keys()).includes(cache),cache);
   await p.evaluate(async({key,html})=>{const c=await caches.open(key);for(const name of ['./','./index.html'])await c.put(name,new Response(html,{headers:{'Content-Type':'text/html'}}));},{key:prefix+'v2',html:oldHTML});
   await context.setOffline(true);await p.reload();await ready();
   eq(await p.title(),'Peach Physics — Holly Laugh Preview','offline uses updated cache despite resurrected stale cache');
   eq(await p.evaluate(()=>__peachPhysicsDebug.snapshot().renderer),fallback?'canvas':'webgl','offline renderer');
   eq(await p.evaluate(()=>__peachMotionDebug.snapshot().auto),false,'existing Auto off retained');
   ok(await p.evaluate(()=>__peachMotionDebug.snapshot().ui.saved.shake),'saved Shake retained');
   eq(await p.evaluate(()=>__peachMotionDebug.snapshot().shake),false,'saved Shake requires fresh sensor permission');
   for(const id of ids){await select(id);const d=await p.evaluate(()=>__peachPhysicsDebug.snapshot());eq(d.model,{bounce:profiles[id].bounce,softness:profiles[id].softness,settle:profiles[id].settle,transfer:profiles[id].transfer},id+' profile offline');eq(d.slapAudioEnabled,false,id+' Sound off retained');}
   await select('holly');await click('slapAudio');await p.waitForFunction(()=>__hollyAudioDebug.snapshot().ready);await click('testSound');await p.waitForFunction(()=>__hollyAudioDebug.snapshot().counts.test===1);
   await p.waitForFunction(()=>!__hollyAudioDebug.snapshot().active);await click('testSound');await p.waitForFunction(()=>__hollyAudioDebug.snapshot().counts.test===2);
   eq(await p.evaluate(()=>__hollyAudioDebug.snapshot().lastClip),2,'second recording plays offline');
   const secondHash=await p.evaluate(async()=>{const b=await(await fetch('./assets/audio/holly-giggle-2.wav')).arrayBuffer();return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b)),x=>x.toString(16).padStart(2,'0')).join('');});eq(secondHash,crypto.createHash('sha256').update(fs.readFileSync(app+'/assets/audio/holly-giggle-2.wav')).digest('hex'),'second offline recording exact bytes');
   const sounds=await p.evaluate(()=>({sounds:__sounds,voices:__voices}));ok(sounds.sounds.some(s=>Math.abs(s.duration-1.76)<.01&&s.rate===1),'offline natural-rate local recording decoded');ok(sounds.sounds.some(s=>Math.abs(s.duration-2.08)<.01&&s.rate===1),'second complete recording decoded offline');eq(sounds.voices,[],'Holly has no synthetic voice');
   await p.reload();await ready();ok(await p.evaluate(()=>__peachPhysicsDebug.snapshot().slapAudioEnabled),'offline Sound preference persists');eq(await p.evaluate(()=>__peachPhysicsDebug.snapshot().audioState),'not-started','reload never starts sound');
   await click('testSound');await p.waitForFunction(()=>__hollyAudioDebug.snapshot().counts.test===1);
   await click('autoMotion');await p.reload();await ready();ok(await p.evaluate(()=>__peachMotionDebug.snapshot().auto),'Auto On persisted');await p.waitForFunction(()=>__peachMotionDebug.snapshot().counts.autoSteps>30);eq(await p.evaluate(()=>__hollyAudioDebug.snapshot().counts),{tap:0,release:0,shake:0,test:0},'offline Auto silent');
   for(const id of ['ember','midnight','aurelia','santa']){
    await select(id);await click('slapAudio');await p.waitForFunction(()=>__peachPhysicsDebug.snapshot().audioState==='running');await click('testSound');
    ok(await p.evaluate(()=>__sounds.some(s=>Math.abs(s.duration-.1)<.01)),'original slap sample '+id);
    if(id==='santa'){await p.evaluate(()=>document.querySelector('#both').click());await p.waitForFunction(()=>__peachPhysicsDebug.snapshot().santaLaughSound);ok(await p.evaluate(()=>__voices.includes('sawtooth')),'current synthetic Santa remains');}
   }
   const preserved=await p.evaluate(async()=>({keys:await caches.keys(),profile:localStorage.getItem('peach-physics-v008-profile-holly'),motion:localStorage.getItem('peach-r13-motion-options-v1')}));
   ok(preserved.keys.includes('peach-physics-v008-r14-auto2')&&preserved.keys.includes('peach-santa-approved-preview-sentinel'),'production/other preview caches untouched');eq(preserved.profile,'production-sentinel','production profile untouched');eq(preserved.motion,'production-motion-sentinel','production motion preference untouched');
   const remoteHash=await p.evaluate(async()=>{const b=await(await fetch('./assets/audio/holly-giggle.wav')).arrayBuffer();return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b)),x=>x.toString(16).padStart(2,'0')).join('');});eq(remoteHash,crypto.createHash('sha256').update(fs.readFileSync(app+'/assets/audio/holly-giggle.wav')).digest('hex'),'offline recording exact bytes');
   const offlineAudio=await p.evaluate(async()=>await(await fetch('./holly-audio.js?v=r14-laugh3')).text());eq(offlineAudio,fs.readFileSync(app+'/holly-audio.js','utf8'),'offline upgrade includes alternating laugh module');
   const motion=await p.evaluate(async()=>await(await fetch('./motion.js?v=r14-auto2')).text());eq(motion,fs.readFileSync(baseline+'/motion.js','utf8'),'warm motion HTTP cache preserves approved module');
   eq(errors,[],'no offline page errors');
   await context.setOffline(false);
   for(const staleMigration of [false,true]){const fresh=await browser.newContext();if(staleMigration)await fresh.addInitScript(key=>localStorage.setItem(key,JSON.stringify({version:1,auto:false,shake:false})),motionKey);const q=await fresh.newPage();await q.goto(url+'?character=holly');await q.waitForFunction(()=>window.__peachMotionDebug);ok(await q.evaluate(()=>__peachMotionDebug.snapshot().auto),staleMigration?'R14 Auto migration retained':'fresh Auto On');eq(await q.evaluate(()=>__peachPhysicsDebug.snapshot().slapAudioEnabled),false,'fresh Sound off');await fresh.close();}
   report.push({renderer:fallback?'canvas':'webgl',offlineCharacters:5,upgradedFrom:prior,atomicAudioInstall:true,staleCacheRace:true,profileMigration:true,productionIsolation:true,offlineRecordingHash:remoteHash,secondRecordingHash:secondHash,passed:true});
  }finally{await context.close();await new Promise(r=>server.close(r));}
 }
 fs.writeFileSync(__dirname+'/offline.json',JSON.stringify({checks,results:report,passed:true},null,2)+'\n');console.log({checks,results:report});
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
