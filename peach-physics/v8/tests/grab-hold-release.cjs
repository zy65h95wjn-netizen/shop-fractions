// Promotion contract: exact approved runtime plus a real r11 -> r12 worker upgrade.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../../..'),appRoot=path.resolve(__dirname,'..');
const approved='c4b72cb86d27e1ae9f55577813be7f9cb429b7e4',prior='d2a1fa1686aa1dda3cb1553872f0ad126138b873';
const show=(sha,file)=>execFileSync('git',['show',`${sha}:peach-physics/v8/${file}`],{cwd:root,maxBuffer:3e6}).toString();
const oldHTML=show(prior,'index.html'),oldWorker=show(prior,'sw.js'),approvedHTML=execFileSync('git',['show',approved+':peach-physics/experiments/female-grab-hold/index.html'],{cwd:root,maxBuffer:3e6}).toString();
const html=fs.readFileSync(path.join(appRoot,'index.html'),'utf8');
let checks=0;const ok=(x,label)=>{assert.ok(x,label);checks++;};
const runtime=h=>h.match(/<script>\s*(\(\(\) => \{[\s\S]*?\}\)\(\);)\s*<\/script>/)[1];
const accepted=runtime(approvedHTML).replace('// Preview preferences cannot overwrite production profiles on the same origin.\n','').replace(/const previewStorage=\{.*?\};\n/,'').replaceAll('previewStorage.','localStorage.');
assert.equal(runtime(html),accepted);checks++;
assert(!html.includes('female-grab-preview:'));checks++;

const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
ok(hash(fs.readFileSync(path.join(appRoot,'assets/santa-claus.jpg')))==='0c081474e67e0f5a94a12fdce68f712884933485a21082d45b9c36188cfea5ed','approved JPEG bytes');
const report={approved,priorProduction:prior,checks:0,backends:[],errors:[]};
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
 for(const fallback of [false,true]){
  let promoted=false;
  const server=http.createServer((req,res)=>{
   const url=new URL(req.url,'http://localhost'),prefix='/peach-physics/v8/';
   if(!url.pathname.startsWith(prefix)){res.writeHead(404);res.end();return;}
   const name=url.pathname.slice(prefix.length)||'index.html',file=path.resolve(appRoot,name);
   if(!file.startsWith(appRoot+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}
   const type=name.endsWith('.js')?'text/javascript':name.endsWith('.html')?'text/html':name.endsWith('.jpg')?'image/jpeg':name.endsWith('.png')?'image/png':name.endsWith('.webmanifest')?'application/manifest+json':'application/octet-stream';
   res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store'});
   res.end(!promoted&&name==='index.html'?oldHTML:!promoted&&name==='sw.js'?oldWorker:fs.readFileSync(file));
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${server.address().port}/peach-physics/v8/`;
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  try{
   await context.addInitScript(()=>{
    if(!localStorage.getItem('peach-physics-v008-active'))localStorage.setItem('peach-physics-v008-active','holly');
    if(!localStorage.getItem('peach-physics-v008-profile-holly'))localStorage.setItem('peach-physics-v008-profile-holly',JSON.stringify({version:2,preset:'custom',bounce:63,softness:68,settle:54,transfer:71,slapAudioEnabled:false}));
   });
   if(fallback)await context.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(t,...args){return t.includes('webgl')?null:get.call(this,t,...args);};});
   const p=await context.newPage();p.on('pageerror',e=>report.errors.push(e.message));
   await p.goto(base);await p.waitForFunction(()=>window.__peachPhysicsDebug?.snapshot().frames>2);
   ok((await p.title()).includes('r11'),'begin with real r11');
   const before=await p.evaluate(()=>__peachPhysicsDebug.snapshot());
   await p.evaluate(async()=>{await caches.open('peach-physics-v0071-preservation-sentinel');await navigator.serviceWorker.register('./sw.js',{scope:'./'});await navigator.serviceWorker.ready;});
   await p.waitForFunction(()=>navigator.serviceWorker.controller);
   ok((await p.evaluate(()=>caches.keys())).includes('peach-physics-v008-r11'),'old production cache installed');
   await p.evaluate(()=>window.priorController=navigator.serviceWorker.controller);
   promoted=true;
   await p.evaluate(async()=>{const reg=await navigator.serviceWorker.getRegistration();await reg.update();});
   let cached=null;const cacheDeadline=Date.now()+30000;
   while(!cached&&Date.now()<cacheDeadline){cached=await p.evaluate(async()=>{
    if(navigator.serviceWorker.controller===window.priorController)return null;
    if(!(await caches.keys()).includes('peach-physics-v008-r12'))return null;
    const cache=await caches.open('peach-physics-v008-r12'),requests=await cache.keys();
    const art=await cache.match(new URL('./assets/santa-claus.jpg',location.href).href);
    if(requests.length!==7||!art)return null;
    return {keys:requests.map(r=>r.url),art:Array.from(new Uint8Array(await art.arrayBuffer()))};
   });if(!cached)await new Promise(resolve=>setTimeout(resolve,250));}
   ok(cached!==null,'new worker controls page with complete release cache');
   const keys=await p.evaluate(()=>caches.keys());ok(keys.includes('peach-physics-v0071-preservation-sentinel'),'earlier release cache survives');
   ok(cached.keys.length===7,'all seven runtime resources precached');
   ok(hash(Buffer.from(cached.art))==='0c081474e67e0f5a94a12fdce68f712884933485a21082d45b9c36188cfea5ed','offline Santa JPEG exact');
   await context.setOffline(true);await p.reload();await p.waitForFunction(()=>window.__peachPhysicsDebug?.snapshot().frames>2);
   ok((await p.title()).includes('r12'),'offline reload uses r12');
   const after=await p.evaluate(()=>__peachPhysicsDebug.snapshot());
   assert.deepEqual(after.model,before.model);checks++;assert.deepEqual(after.framing,before.framing);checks++;
   ok(after.character==='holly'&&after.preset==='custom','selected character and custom profile survive upgrade');
   ok(after.grabHold===true,'Holly hold enabled after upgrade');
   ok(after.characters.join(',')==='ember,midnight,aurelia,holly,santa','five slots after upgrade');
   for(const id of ['ember','midnight','aurelia','holly','santa']){
    await p.evaluate(id=>__peachPhysicsDebug.switchCharacter(id),id);await p.waitForFunction(id=>__peachPhysicsDebug.snapshot().character===id,id);
    await p.waitForTimeout(200);ok((await p.evaluate(()=>__peachPhysicsDebug.snapshot().status))==='',id+' renders offline');ok((await p.evaluate(()=>__peachPhysicsDebug.snapshot().grabHold))===(id!=='santa'),id+' correct grab-and-hold state');
   }
   const snap=await p.evaluate(()=>__peachPhysicsDebug.snapshot()),f=snap.framing;
   await p.touchscreen.tap(f.x+355/1024*f.width,f.y+790/1280*f.height);await p.waitForFunction(()=>__peachPhysicsDebug.snapshot().slapCount>0);ok(true,'Santa interaction works after offline upgrade');
   report.backends.push({renderer:snap.renderer,upgrade:true,offline:true,preservedProfile:true,preservedHollyFraming:true});
  }finally{await context.close();await new Promise(resolve=>server.close(resolve));}
 }
 ok(report.errors.length===0,'no page errors');report.checks=checks;
 fs.writeFileSync(path.join(__dirname,'grab-hold-release.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
