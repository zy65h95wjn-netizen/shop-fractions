// Approved full-body Holly: existing engine, four slots, original photo bytes.
// Run against the v8 files served at PEACH_TEST_URL (default localhost:8000).
const {chromium,fs,path,assert,root,out,setup,character,scenario,canvas}=require('./harness.cjs');
const {execFileSync}=require('node:child_process'),crypto=require('node:crypto');
let checks=0;const ok=(v,label)=>{assert.ok(v,label);checks++;};
const report={checks:0,backend:[],legacyComparisons:0,errors:[],artworkSha256:'b5af2ccfa267b2ea8b4a6fa4b98aa2935e7f2b4e869d279f93d99fb9e5964349'};
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const original=execFileSync('git',['show','ddf3456cc937c7f84f0b022f76f6824e59c2d079:peach-physics/v8/index.html'],{cwd:root,maxBuffer:3e6}).toString();
const current=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
for(const [start,end] of [['function step(dt){','function linkedImpulse('],['function linkedImpulse(','function savePrefs(){'],['function hollyVelocity(x,y,side){','// Bilinear CPU texture remapping'],['function renderHollyFallback(sc){','function initGL(){'],['const PRESETS=Object.freeze','const currentPresets=']]){
 assert.equal(current.slice(current.indexOf(start),current.indexOf(end)),original.slice(original.indexOf(start),original.indexOf(end)));checks++;
}
const baseline=path.join(out,'approved-baseline.html');fs.writeFileSync(baseline,original);
ok(sha(fs.readFileSync(path.join(__dirname,'../assets/holly-heartbreaker.jpg')))===report.artworkSha256,'approved JPEG exact bytes');
async function save(p,name){fs.writeFileSync(path.join(out,name+'.png'),Buffer.from((await canvas(p)).split(',')[1],'base64'));}
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 for(const fallback of [false,true]){
  const backend=fallback?'canvas':'webgl';
  // First three characters retain exact render output and unrounded states.
  const a=await setup(browser,'v8',{width:390,height:844},true,fallback,false,baseline),b=await setup(browser,'v8',{width:390,height:844},true,fallback);
  for(const id of ['ember','midnight','aurelia']){
   for(const app of [a,b]){await character(app.page,id);await app.page.evaluate(()=>{document.querySelector('[data-preset="natural"]').click();__test.reset();__test.model.transfer=50;});}
   assert.equal(await canvas(a.page),await canvas(b.page));checks++;
   for(const side of [0,1]){
    assert.deepEqual(await scenario(a.page,'slap',side,50),await scenario(b.page,'slap',side,50));checks++;
    const pose=async p=>p.evaluate(side=>{__test.reset();__test.gesture('slap',side);for(let i=0;i<12;i++)__test.step(1/120);},side);
    await pose(a.page);await pose(b.page);assert.equal(await canvas(a.page),await canvas(b.page));checks++;report.legacyComparisons++;
   }
  }
  report.errors.push(...a.errors,...b.errors);await a.context.close();await b.context.close();
  for(const size of [{width:375,height:667},{width:390,height:844}]){
   const app=await setup(browser,'v8',size,true,fallback),p=app.page;await character(p,'holly');
   const snapshot=await p.evaluate(()=>__peachPhysicsDebug.snapshot());assert.deepEqual(snapshot.characters,['ember','midnight','aurelia','holly']);checks++;
   const f=snapshot.framing;
   ok(f.y>=54&&f.x+220/720*f.width>=0&&f.x+450/720*f.width<=size.width,'full head and hat remain inside closer framing');
   ok(snapshot.character==='holly','Holly occupies existing fourth slot');
   const loaded=await p.evaluate(()=>({src:__test.currentCharacter().src,width:__test.currentCharacter().width,height:__test.currentCharacter().height}));
   ok(loaded.src==='./assets/holly-heartbreaker.jpg?v=r7'&&loaded.width===720&&loaded.height===1280,'slot uses approved asset');
   await p.evaluate(()=>{document.querySelector('[data-preset="natural"]').click();__test.reset();__test.model.transfer=0;});
   const rest=await canvas(p);if(size.width===390)await save(p,`${backend}-approved-rest`);
   for(const side of [0,1]){
    await p.evaluate(()=>__test.reset());
    const center=await p.evaluate(side=>__test.currentCharacter().impactCenters[side],side);
    // Actual touch input, both skin and upper cup targets; no forced pose.
    for(const point of [center,side?[460,386]:[294,383]]){
     await p.evaluate(()=>{__test.reset();__test.model.transfer=0;});
     await p.touchscreen.tap(f.x+point[0]/720*f.width,f.y+point[1]/1280*f.height);
     const trace=await p.evaluate(()=>{const samples=[];for(let i=0;i<180;i++){__test.step(1/120);if(i%6===0)samples.push(__test.raw());}return samples;});
     const active=Math.max(...trace.flatMap(s=>s.nodes.filter(n=>n.side===side).map(n=>Math.hypot(n.dx,n.dy))));
     const other=Math.max(...trace.flatMap(s=>s.nodes.filter(n=>n.side!==side).map(n=>Math.hypot(n.dx,n.dy))));
     ok(active>1,'tap produces motion');ok(other===0,'link 0 leaves other side independent');
    }
    // Capture the actual original slap response at impact, peak and rebound.
    await p.evaluate(side=>{__test.reset();__test.gesture('slap',side);},side);
    let previous=0;
    for(const [phase,step] of [['impact',0],['peak',12],['rebound',side?35:37],['settled',960]]){
     await p.evaluate(n=>{for(let i=0;i<n;i++)__test.step(1/120);__test.render();},step-previous);previous=step;
     const image=await canvas(p);if(phase==='peak')ok(image!==rest,'motion changes visible image');if(phase==='settled'){assert.equal(image,rest);checks++;}
     if(size.width===390)await save(p,`${backend}-approved-${side}-${phase}`);
    }
    for(const kind of ['drag','flick']){
     const trace=await scenario(p,kind,side,0);ok(trace.some(s=>s.nodes.some(n=>n.side===side&&Math.hypot(n.dx,n.dy)>1)),`${kind} works`);
    }
   }
   for(const transfer of [50,100]){
    const trace=await scenario(p,'slap',0,transfer);ok(trace.some(s=>s.nodes.some(n=>n.side===1&&Math.hypot(n.dx,n.dy)>.1)),`link ${transfer} works`);
   }
   await p.evaluate(()=>{__test.reset();__test.render();});assert.equal(await canvas(p),rest);checks++;
   // Four-character selector wraps from Holly to Winter, with no fifth slot.
   await p.locator('#character').click();await p.waitForFunction(()=>__peachPhysicsDebug.snapshot().character==='ember');checks++;
   report.backend.push({backend,size,framing:f});report.errors.push(...app.errors);await app.context.close();
  }
 }
 // Existing service-worker lifecycle updates the shell and preserves portrait bytes.
 const context=await browser.newContext(),p=await context.newPage();await p.goto((process.env.PEACH_TEST_URL||'http://127.0.0.1:8000')+'/peach-physics/v8/');
 const offline=await p.evaluate(async()=>{
  await caches.open('peach-physics-v008-r8');await caches.open('peach-physics-v0071-preservation-test');
  await navigator.serviceWorker.register('./sw.js');await navigator.serviceWorker.ready;
  if(!navigator.serviceWorker.controller)await new Promise(r=>navigator.serviceWorker.addEventListener('controllerchange',r,{once:true}));
  const keys=await caches.keys(),cache=await caches.open('peach-physics-v008-r9'),response=await cache.match('./assets/holly-heartbreaker.jpg?v=r7');
  const bytes=await response.arrayBuffer(),hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
  return {keys,hash};
 });
 ok(offline.keys.includes('peach-physics-v008-r9')&&!offline.keys.includes('peach-physics-v008-r8'),'r9 cache replaces r8');
 ok(offline.keys.includes('peach-physics-v0071-preservation-test'),'earlier caches preserved');ok(offline.hash===report.artworkSha256,'offline cache has exact approved asset');
 await context.setOffline(true);await p.reload();await p.waitForFunction(()=>window.__peachPhysicsDebug&&document.querySelector('#loader').classList.contains('hiding'));
 for(const id of ['midnight','aurelia','holly']){
  await p.locator('#character').click();await p.waitForFunction(id=>__peachPhysicsDebug.snapshot().character===id,id);
 }
 ok(await p.evaluate(()=>__peachPhysicsDebug.snapshot().character==='holly'),'fourth portrait loads through selector offline');
 // Verify offline bytes directly as well as the cached shell reload.
 const offlineHash=await p.evaluate(async()=>{const b=await (await fetch('./assets/holly-heartbreaker.jpg?v=r7')).arrayBuffer();return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b)),v=>v.toString(16).padStart(2,'0')).join('');});
 ok(offlineHash===report.artworkSha256,'approved portrait available offline');await context.close();
 ok(report.errors.length===0,'no browser errors');report.checks=checks;
 fs.writeFileSync(path.join(out,'holly-approved.json'),JSON.stringify(report,null,2)+'\n');
 await browser.close();console.log(JSON.stringify(report,null,2));
})().catch(e=>{console.error(e);process.exit(1)});
