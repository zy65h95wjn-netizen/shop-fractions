// Real R12 -> R13 worker upgrade, normal production storage and offline operation.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../../..'),app=path.resolve(__dirname,'..'),prior='76cc6f11cff4cf77bd3d6e1eb34880246b23e9e7';
const old=file=>execFileSync('git',['show',`${prior}:peach-physics/v8/${file}`],{cwd:root,maxBuffer:4e6});
const oldHTML=old('index.html'),oldWorker=old('sw.js');
const names=['ember','midnight','aurelia','holly','santa'];
const profiles=Object.fromEntries(names.map((id,i)=>[id,{version:2,preset:'custom',bounce:61+i,softness:64+i,settle:50+i,transfer:17*i,slapAudioEnabled:i%2===0,...(id==='santa'?{santaLaughEnabled:true}:{})}]));
let checks=0;const ok=(x,label)=>{assert.ok(x,label);checks++;},eq=(a,b,label)=>{assert.deepEqual(a,b,label);checks++;};
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const report={prior,diagnosis:true,checks:0,backends:[],errors:[]};
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});try{
for(const fallback of [false,true]){
 let promoted=false;const requests=[];const allowed=new Set(['index.html','sw.js','motion.js','manifest.webmanifest','apple-touch-icon.png','assets/aurelia-frost.jpg','assets/holly-heartbreaker.jpg','assets/santa-claus.jpg']);
 const server=http.createServer((req,res)=>{const u=new URL(req.url,'http://localhost'),prefix='/peach-physics/v8/';if(!u.pathname.startsWith(prefix)){res.writeHead(404);res.end();return;}const name=u.pathname.slice(prefix.length)||'index.html';if(!allowed.has(name)||(!promoted&&name==='motion.js')){res.writeHead(404);res.end();return;}const type=name.endsWith('.js')?'text/javascript':name.endsWith('.html')?'text/html':name.endsWith('.jpg')?'image/jpeg':name.endsWith('.png')?'image/png':'application/manifest+json';requests.push({name,promoted,type,time:Date.now()});res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store'});res.end(!promoted&&name==='index.html'?oldHTML:!promoted&&name==='sw.js'?oldWorker:fs.readFileSync(path.join(app,name)));});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}/peach-physics/v8/`;
 const c=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});try{
 await c.addInitScript(({profiles,fallback})=>{
  if(!localStorage.getItem('r13-release-test-seeded')){localStorage.setItem('r13-release-test-seeded','1');localStorage.setItem('peach-physics-v008-active','holly');for(const[id,value]of Object.entries(profiles))localStorage.setItem('peach-physics-v008-profile-'+id,JSON.stringify(value));localStorage.setItem('r13-preview:peach-physics-v008-active','ember');localStorage.setItem('r13-preview:peach-physics-v008-profile-holly',JSON.stringify({...profiles.holly,bounce:2}));}
  window.permissionCalls=0;window.permissionHadGesture=false;Object.defineProperty(window,'DeviceMotionEvent',{configurable:true,value:{requestPermission:()=>{permissionCalls++;permissionHadGesture=navigator.userActivation.isActive;return Promise.resolve('granted');}}});
  Object.defineProperty(navigator,'share',{configurable:true,value:async data=>{window.sharedData=data;}});
  if(fallback){const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(t,...a){return t.includes('webgl')?null:get.call(this,t,...a);};}
 },{profiles,fallback});
 const p=await c.newPage();p.on('pageerror',e=>report.errors.push(e.message));
 const ready=()=>p.waitForFunction(()=>window.__peachPhysicsDebug?.snapshot().frames>2);
 const snap=()=>p.evaluate(()=>__peachPhysicsDebug.snapshot());
 const stored=()=>p.evaluate(()=>Object.fromEntries(Object.entries(localStorage).filter(([k])=>k.startsWith('peach-physics-v008-profile-')||k.startsWith('r13-preview:')).map(([k,v])=>{try{return[k,JSON.parse(v)];}catch{return[k,v];}})));
 await p.goto(base);await ready();ok((await p.title()).includes('r12'),'real R12 initially');const before=await snap(),beforeStored=await stored();
 await p.evaluate(async()=>{await caches.open('peach-physics-v0071-preservation-sentinel');await navigator.serviceWorker.register('./sw.js',{scope:'./'});await navigator.serviceWorker.ready;});await p.waitForFunction(()=>navigator.serviceWorker.controller);
 ok((await p.evaluate(()=>caches.keys())).includes('peach-physics-v008-r12'),'R12 cache installed');
 await c.setOffline(true);await p.reload();await ready();ok((await p.title()).includes('r12'),'R12 opens offline before upgrade');await c.setOffline(false);
 await p.evaluate(()=>{window.priorWorker=navigator.serviceWorker.controller;window.lifecycle=[];navigator.serviceWorker.addEventListener('controllerchange',()=>lifecycle.push({event:'controllerchange',time:performance.now(),state:navigator.serviceWorker.controller?.state}));});promoted=true;await p.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();await r.update();});
 await p.waitForFunction(async()=>{if(navigator.serviceWorker.controller===window.priorWorker)return false;return(await caches.keys()).includes('peach-physics-v008-r13');});
 const inspect=()=>p.evaluate(async()=>{const c=await caches.open('peach-physics-v008-r13'),requested=new URL('./motion.js',location.href),reg=await navigator.serviceWorker.getRegistration();const response=async key=>{const r=await c.match(key);return r?{url:r.url,type:r.type,status:r.status,contentType:r.headers.get('content-type'),length:(await r.text()).length}:null;};return {pageURL:location.href,requestedURL:requested.href,controller:{url:navigator.serviceWorker.controller?.scriptURL,state:navigator.serviceWorker.controller?.state,sameAsPrior:navigator.serviceWorker.controller===priorWorker},registration:{active:reg.active?.state,waiting:reg.waiting?.state,installing:reg.installing?.state},entries:(await c.keys()).map(r=>r.url),urlObjectMatch:await response(requested),stringMatch:await response(requested.href),lifecycle};});
 const immediate=await inspect();const asyncWaitResult=await(await p.waitForFunction(async()=>false)).jsonValue();await p.waitForTimeout(1000);const later=await inspect();report.backends.push({renderer:fallback?'canvas':'webgl',immediate,later,asyncWaitResult,requests});

 }finally{await c.close();await new Promise(r=>server.close(r));}
}ok(report.errors.length===0,'no browser errors');report.checks=checks;fs.writeFileSync(path.join(__dirname,'motion-cache-diagnosis.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});
