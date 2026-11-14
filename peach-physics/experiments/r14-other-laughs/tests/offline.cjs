const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict'),crypto=require('crypto'),{execFileSync}=require('child_process'),{chromium}=require('playwright');
const app=path.resolve(__dirname,'..'),baseline=path.resolve(app,'../../v8'),scope='/peach-physics/experiments/r14-other-laughs/',prefix='peach-preview-r142-other-laughs-',cache=prefix+'v3',motionKey=prefix+'peach-r13-motion-options-v1',ids=['ember','midnight','aurelia','holly','santa'];
const profiles=Object.fromEntries(ids.map((id,i)=>[id,{version:2,preset:'custom',bounce:61+i,softness:64+i,settle:50+i,transfer:17*i,slapAudioEnabled:false,...(id==='santa'?{santaLaughEnabled:true}:{})}]));
const upgrade=process.argv[2]||'elves',checkpoint=upgrade!=='holly',prior=upgrade==='elves'?'c81515488ebb06c2daa0b41fdf65c0499ee3f9e3':checkpoint?'331d1e5a1a623e958498fc8c0746af36f6de7fe2':'5441324244eb2e28ffc115f8cf0d34f1ff2c5d21',oldVersion=upgrade==='elves'?'v2':checkpoint?'v1':'v0';
const previous=Object.fromEntries(['index.html','sw.js','holly-audio.js','assets/audio/holly-giggle.wav',...(checkpoint?['voice-profiles.js','voice-bank.js']:[])].map(name=>[name,execFileSync('git',['show',prior+':peach-physics/experiments/'+(checkpoint?'r14-other-laughs':'r14-holly-laugh')+'/'+name],{cwd:app,maxBuffer:4e6})]));
for(const name of ['index.html','sw.js'])previous[name]=Buffer.from(previous[name].toString().replaceAll('peach-preview-r14-holly-laugh-',prefix).replace(prefix+'v3',prefix+'v0'));
const oldHTML=previous['index.html'].toString();
let checks=0;const ok=(v,label)=>{assert(v,label);checks++;},eq=(a,b,label)=>{assert.deepEqual(a,b,label);checks++;};const report=[];
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{for(const fallback of [false,true]){
  let promoted=false,gateAudio=true,releaseAudio,requested;const audioRequested=new Promise(r=>requested=r);
  const server=http.createServer((req,res)=>{
   const name=new URL(req.url,'http://localhost').pathname.slice(scope.length)||'index.html';
   if(!req.url.startsWith(scope)||name.includes('..')||!fs.existsSync(path.join(app,name))){res.writeHead(404);res.end();return;}
   res.writeHead(200,{'Content-Type':name.endsWith('.js')?'text/javascript':name.endsWith('.html')?'text/html':name.endsWith('.mp3')?'audio/mpeg':name.endsWith('.wav')?'audio/wav':name.endsWith('.png')?'image/png':name.endsWith('.jpg')?'image/jpeg':'application/json','Cache-Control':name==='motion.js'?'public,max-age=3600':'no-store'});
   if(promoted&&gateAudio&&name==='assets/santa-ho-ho-ho.mp3'){releaseAudio=()=>{gateAudio=false;res.end(fs.readFileSync(path.join(app,name)));};requested();return;}
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
   ok((await p.evaluate(()=>caches.keys())).includes(prefix+oldVersion),'prior cache retained until complete install');
   releaseAudio();await p.waitForFunction(async cache=>navigator.serviceWorker.controller!==previousController&&(await caches.keys()).includes(cache),cache);
   await p.evaluate(async({key,html})=>{const c=await caches.open(key);for(const name of ['./','./index.html'])await c.put(name,new Response(html,{headers:{'Content-Type':'text/html'}}));},{key:prefix+oldVersion,html:oldHTML});
   await context.setOffline(true);await p.reload();await ready();
   eq(await p.title(),'Peach Physics — R14.2 Voice Preview','offline uses updated cache despite resurrected stale cache');
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
   for(const id of ['ember','midnight','aurelia']){
    await select(id);await click('slapAudio');await p.waitForFunction(()=>__elfAudioDebug.snapshot().current.clips.every(c=>c.ready));
    eq(await p.locator('#testSound').textContent(),'Test '+({ember:'Winter Ember',midnight:'Midnight Yule',aurelia:'Aurelia Frost'})[id]+' Laugh','offline Test label '+id);
    for(let take=1;take<=2;take++){
     await click('testSound');await p.waitForFunction(()=>__elfAudioDebug.snapshot().current.active);
     const d=await p.evaluate(()=>__elfAudioDebug.snapshot());eq(d.current.lastClip,take,'offline alternate take '+id+take);eq(d.activeCount,1,'one offline sound '+id+take);
     const clip=await p.evaluate(async({id,take})=>{const file=ElfVoiceProfiles[id].clips[take-1].url,b=await(await fetch(file)).arrayBuffer();return{file,hash:Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b)),x=>x.toString(16).padStart(2,'0')).join('')};},{id,take});
     eq(clip.hash,crypto.createHash('sha256').update(fs.readFileSync(app+'/'+clip.file)).digest('hex'),'exact offline recording '+id+take);
     await p.waitForFunction(()=>!__elfAudioDebug.snapshot().current.active);
    }
    await p.reload();await ready();eq(await p.evaluate(()=>__peachPhysicsDebug.snapshot().character),id,'offline selected character '+id);ok(await p.evaluate(()=>__peachPhysicsDebug.snapshot().slapAudioEnabled),'offline Sound profile '+id);
    eq(await p.evaluate(()=>__elfAudioDebug.snapshot().current.counts),{tap:0,release:0,shake:0,test:0},'offline Auto and reload silent '+id);
    if(await p.locator('#panel').evaluate(x=>x.classList.contains('open')))await p.click('#close');
    const target=await p.evaluate(()=>{const d=__peachPhysicsDebug.snapshot(),f=d.framing,r=d.regions[0];return{x:f.x+r.x/d.image[0]*f.width,y:f.y+r.y/d.image[1]*f.height};});
    await p.touchscreen.tap(target.x,target.y);await p.waitForFunction(()=>__elfAudioDebug.snapshot().current.active);eq(await p.evaluate(()=>__elfAudioDebug.snapshot().current.lastClip),1,'first offline native tap '+id);await p.waitForFunction(()=>!__elfAudioDebug.snapshot().current.active);
   }
   eq(await p.evaluate(()=>__voices),[],'new elves never synthesize laughter');
   await select('santa');await click('slapAudio');await p.waitForFunction(()=>__santaAudioDebug.snapshot().active);await p.waitForFunction(()=>!__santaAudioDebug.snapshot().active);
   eq(await p.locator('#testSound').textContent(),'Test Santa laugh','Santa recorded Test control offline');
   await click('testSound');await p.waitForFunction(()=>__santaAudioDebug.snapshot().active);await p.waitForFunction(()=>!__santaAudioDebug.snapshot().active);
   ok(await p.evaluate(()=>__sounds.some(s=>Math.abs(s.duration-1.5)<.01&&s.rate===1)),'complete natural-rate Santa voice offline');
   if(await p.locator('#panel').evaluate(x=>x.classList.contains('open')))await p.click('#close');
   const target=await p.evaluate(()=>{const d=__peachPhysicsDebug.snapshot(),f=d.framing,r=d.regions[0];return{x:f.x+r.x/d.image[0]*f.width,y:f.y+r.y/d.image[1]*f.height};});
   await p.touchscreen.tap(target.x,target.y);await p.waitForFunction(()=>__santaAudioDebug.snapshot().active);
   ok(await p.evaluate(()=>__sounds.some(s=>Math.abs(s.duration-.1)<.01)),'original Santa tap sound retained');
   ok(await p.evaluate(()=>!__voices.includes('sawtooth')),'Santa uses approved recording instead of synthetic voice');
   const santaHash=await p.evaluate(async()=>{const b=await(await fetch('./assets/santa-ho-ho-ho.mp3')).arrayBuffer();return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b)),x=>x.toString(16).padStart(2,'0')).join('');});
   eq(santaHash,'c0874443e5e562fe5431c5cfb10880a18a2a1b888a73c1630a12e1be299d0e7b','exact approved Santa bytes offline');
   const preserved=await p.evaluate(async()=>({keys:await caches.keys(),profile:localStorage.getItem('peach-physics-v008-profile-holly'),motion:localStorage.getItem('peach-r13-motion-options-v1')}));
   ok(preserved.keys.includes('peach-physics-v008-r14-auto2')&&preserved.keys.includes('peach-santa-approved-preview-sentinel'),'production/other preview caches untouched');eq(preserved.profile,'production-sentinel','production profile untouched');eq(preserved.motion,'production-motion-sentinel','production motion preference untouched');
   const remoteHash=await p.evaluate(async()=>{const b=await(await fetch('./assets/audio/holly-giggle.wav')).arrayBuffer();return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b)),x=>x.toString(16).padStart(2,'0')).join('');});eq(remoteHash,crypto.createHash('sha256').update(fs.readFileSync(app+'/assets/audio/holly-giggle.wav')).digest('hex'),'offline recording exact bytes');
   const offlineAudio=await p.evaluate(async()=>await(await fetch('./holly-audio.js?v=r14-laugh3')).text());eq(offlineAudio,fs.readFileSync(app+'/holly-audio.js','utf8'),'offline upgrade retains approved Holly engine');
   const motion=await p.evaluate(async()=>await(await fetch('./motion.js?v=r14-auto2')).text());eq(motion,fs.readFileSync(baseline+'/motion.js','utf8'),'warm motion HTTP cache preserves approved module');
   const bankCode=await p.evaluate(async()=>await(await fetch('./voice-bank.js?v=r142-2')).text());eq(bankCode,fs.readFileSync(app+'/voice-bank.js','utf8'),'new voice bank cached completely');
   const profileCode=await p.evaluate(async()=>await(await fetch('./voice-profiles.js?v=r142-2')).text());eq(profileCode,fs.readFileSync(app+'/voice-profiles.js','utf8'),'new character assignments cached completely');
   await p.goto(url+'audition.html');await p.waitForFunction(()=>window.__auditionDebug);
   for(const candidate of ['cv','splice','mox'])for(let take=1;take<=2;take++){
    await p.click('[data-voice='+candidate+']');await p.waitForFunction(()=>__auditionDebug.snapshot().current?.active);
    eq(await p.evaluate(()=>__auditionDebug.snapshot().current.lastClip),take,'source comparison take offline '+candidate+take);
    await p.waitForFunction(()=>!__auditionDebug.snapshot().current?.active);
   }
   eq(errors,[],'no offline page errors');
   await context.setOffline(false);
   for(const staleMigration of [false,true]){const fresh=await browser.newContext();if(staleMigration)await fresh.addInitScript(key=>localStorage.setItem(key,JSON.stringify({version:1,auto:false,shake:false})),motionKey);const q=await fresh.newPage();await q.goto(url+'?character=holly');await q.waitForFunction(()=>window.__peachMotionDebug);ok(await q.evaluate(()=>__peachMotionDebug.snapshot().auto),staleMigration?'R14 Auto migration retained':'fresh Auto On');eq(await q.evaluate(()=>__peachPhysicsDebug.snapshot().slapAudioEnabled),false,'fresh Sound off');await fresh.close();}
   report.push({renderer:fallback?'canvas':'webgl',offlineCharacters:5,offlineRecordedElfTakes:8,offlineRecordedSantaPhrase:true,offlineNativeTapCharacters:3,assignmentsPending:false,upgradedFrom:prior,atomicAudioInstall:true,staleCacheRace:true,profileMigration:true,productionIsolation:true,offlineRecordingHash:remoteHash,secondRecordingHash:secondHash,passed:true});
  }finally{await context.close();await new Promise(r=>server.close(r));}
 }
 fs.writeFileSync(__dirname+'/offline-'+upgrade+'.json',JSON.stringify({checks,results:report,passed:true},null,2)+'\n');console.log({checks,results:report});
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
