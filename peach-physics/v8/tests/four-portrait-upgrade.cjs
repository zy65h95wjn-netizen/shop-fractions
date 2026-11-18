// Upgrade from R14 (Santa), R15 (Midnight) and R15.2 through R15.4 (Holly), then disconnect.
const {chromium,assert,fs,path,root}=require('./harness.cjs');
const http=require('node:http'),{execFileSync}=require('node:child_process');
const app=path.join(root,'peach-physics/v8'),prefix='/peach-physics/v8/';
const active=['ember','midnight','aurelia','holly'],ids=[...active,'santa'];
const cacheName='peach-physics-v008-r15-holly-skin5';
const releases={r14:'0b1444a',r15:'363d875',r152:'d8f1b50',r153:'ca33de2',r154:'4342e1f'};
const types={html:'text/html',js:'application/javascript',webmanifest:'application/manifest+json',jpg:'image/jpeg',png:'image/png'};
function fixture(release){
  const old=Object.fromEntries(['index.html','sw.js','motion.js','manifest.webmanifest'].map(file=>[
    file,execFileSync('git',['show',releases[release]+':peach-physics/v8/'+file],{cwd:root,maxBuffer:4e6})
  ]));
  let upgraded=false;
  const server=http.createServer((req,res)=>{
    const pathname=new URL(req.url,'http://localhost').pathname;
    if(!pathname.startsWith(prefix)){res.writeHead(404).end();return;}
    const file=pathname.slice(prefix.length)||'index.html';
    if(!/^(index\.html|motion\.js|sw\.js|manifest\.webmanifest|apple-touch-icon\.png|assets\/[\w.-]+)$/.test(file)){res.writeHead(404).end();return;}
    res.setHeader('Content-Type',types[file.split('.').pop()]);
    res.setHeader('Cache-Control',file==='index.html'||file==='sw.js'?'no-cache':'public, max-age=86400');
    res.end(!upgraded&&old[file]?old[file]:fs.readFileSync(path.join(app,file)));
  });
  return {server,upgrade(){upgraded=true;}};
}
const profiles=Object.fromEntries(ids.map((id,i)=>[id,{
  version:2,preset:'custom',slapAudioEnabled:id==='holly',...(id==='santa'?{santaLaughEnabled:true}:{}),
  bounce:42+7*i,softness:58+3*i,settle:33+i,transfer:40+5*i
}]));
async function ready(page){
  await page.waitForFunction(()=>window.__peachPhysicsDebug&&document.querySelector('#loader.hiding')&&__peachPhysicsDebug.snapshot().frames>0);
}
async function run(browser,renderer,release){
  const selected=['r152','r153','r154'].includes(release)?'holly':release==='r14'?'santa':'midnight',first=selected==='santa'?'ember':selected;
  const fixtureServer=fixture(release),{server}=fixtureServer;
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const url='http://127.0.0.1:'+server.address().port+prefix;
  const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
  try{
    if(renderer==='canvas')await ctx.addInitScript(()=>{
      const original=HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext=function(kind,...args){return /webgl/i.test(kind)?null:original.call(this,kind,...args);};
    });
    const page=await ctx.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(url+'?character='+selected);
    await ready(page);
    assert.equal(await page.evaluate(()=>__peachPhysicsDebug.snapshot().character),selected);
    await page.evaluate(async ({profiles,selected})=>{
      await navigator.serviceWorker.register('./sw.js');
      await navigator.serviceWorker.ready;
      for(const [id,value] of Object.entries(profiles))localStorage.setItem('peach-physics-v008-profile-'+id,JSON.stringify(value));
      localStorage.setItem('peach-physics-v008-active',selected);
      localStorage.setItem('peach-r13-motion-options-v1',JSON.stringify({version:1,autoDefault:'holly-fullscreen-v1',auto:false,shake:true}));
    },{profiles,selected});
    await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
    fixtureServer.upgrade();
    await page.evaluate(async()=>{
      const reg=await navigator.serviceWorker.getRegistration();
      const activated=new Promise(resolve=>navigator.serviceWorker.addEventListener('controllerchange',resolve,{once:true}));
      await reg.update();await activated;
    });
    await page.waitForFunction(()=>navigator.serviceWorker.controller?.state==='activated');
    const cacheFiles=await page.evaluate(async name=>(await (await caches.open(name)).keys()).map(k=>k.url),cacheName);
    assert.deepEqual(cacheFiles.map(u=>u.slice(url.length)).sort(),[
      '','index.html','motion.js?v=r15-holly-skin5','assets/aurelia-frost.jpg','assets/holly-heartbreaker.png','manifest.webmanifest','apple-touch-icon.png'
    ].sort());
    await ctx.setOffline(true);
    await page.goto(url+'?character=santa&v=r15.5');
    await ready(page);
    await page.waitForFunction(async expected=>(await caches.keys()).every(key=>key===expected),cacheName);
    assert.equal(await page.evaluate(()=>localStorage.getItem('peach-physics-v008-active')),first);
    const appBytes=await page.evaluate(async()=>Promise.all(['./','./index.html','./motion.js?v=r15-holly-skin5','./manifest.webmanifest'].map(async file=>(await fetch(file)).text())));
    for(const [i,file] of ['index.html','index.html','motion.js','manifest.webmanifest'].entries())assert.equal(appBytes[i],fs.readFileSync(path.join(app,file),'utf8'),file);
    const start=active.indexOf(first),cycle=[...active.slice(start),...active.slice(0,start),first];
    for(const [i,id] of cycle.entries()){
      if(i)await page.locator('#character').tap();
      await page.waitForFunction(id=>__peachPhysicsDebug.snapshot().character===id,id);
      const {state,motion}=await page.evaluate(()=>({state:__peachPhysicsDebug.snapshot(),motion:__peachMotionDebug.snapshot()}));
      assert.deepEqual(state.characters,active);assert.equal(state.renderer,renderer);
      assert.deepEqual(state.model,Object.fromEntries(['bounce','softness','settle','transfer'].map(k=>[k,profiles[id][k]])));
      assert.equal(state.slapAudioEnabled,profiles[id].slapAudioEnabled);assert(!motion.auto&&motion.ui.saved.shake);
      assert.equal(await page.locator('#characterName').textContent(),state.characterName+' · '+(active.indexOf(id)+1)+'/4');
    }
    const saved=await page.evaluate(ids=>Object.fromEntries(ids.map(id=>[id,JSON.parse(localStorage.getItem('peach-physics-v008-profile-'+id))])),ids);
    assert.deepEqual(saved,profiles);
    await page.locator('#gear').tap();
    await page.locator('#autoMotion').tap();
    await page.waitForFunction(()=>__peachMotionDebug.snapshot().counts.autoSteps>24);
    const axis=selected==='holly'?'dy':'dx',cross=axis==='dy'?'dx':'dy';
    await page.waitForFunction(axis=>__peachPhysicsDebug.snapshot().nodes.some(n=>Math.abs(n[axis])>1),axis);
    assert(await page.evaluate(cross=>__peachPhysicsDebug.snapshot().nodes.every(n=>n[cross]===0),cross),'offline Auto direction');
    await page.locator('#gear').tap();await page.locator('#autoMotion').tap();
    assert.equal(await page.locator('#santaLaugh').isVisible(),false);
    assert.equal(await page.locator('#depthSway').isDisabled(),renderer==='canvas');
    if(renderer==='webgl')await page.locator('#depthSway').tap();
    if(!(await page.locator('#testSound').isEnabled()))await page.locator('#slapAudio').tap();
    await page.locator('#testSound').tap();
    await page.waitForFunction(()=>__peachPhysicsDebug.snapshot().audioState==='running');
    await page.locator('#close').tap();
    const target=await page.evaluate(()=>{
      const {image,framing:f,regions}=__peachPhysicsDebug.snapshot(),r=regions[0];
      return [f.x+r.x*f.width/image[0],f.y+r.y*f.height/image[1]];
    });
    await page.touchscreen.tap(...target);
    await page.waitForFunction(()=>__peachPhysicsDebug.snapshot().slapCount>0);
    await page.goto(url+'?v=r15.5');await ready(page);
    assert.equal(await page.locator('#depthSway').getAttribute('aria-checked'),'false');
    assert.equal(await page.evaluate(()=>__peachMotionDebug.snapshot().auto),false);
    assert.deepEqual(errors,[]);
    console.log(renderer,release,selected,'→ R15.5 offline, 4 picker entries, 5 saved profiles, motion preferences, audio and touch passed');
    if(renderer==='webgl'&&release==='r15'){
      const fresh=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
      try{
        const tab=await fresh.newPage();await tab.goto(url+'?character=aurelia');await ready(tab);
        const s=await tab.evaluate(()=>__peachPhysicsDebug.snapshot());
        assert.equal(s.character,'aurelia');assert.equal(s.preset,'playful');assert.equal(s.slapAudioEnabled,false);
        assert.equal(await tab.evaluate(()=>__peachMotionDebug.snapshot().auto),true);
        assert.equal(await tab.locator('#depthSway').getAttribute('aria-checked'),'false');
      }finally{await fresh.close();}
    }
  }finally{await ctx.close();await new Promise(resolve=>server.close(resolve));}
}
(async()=>{
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  try{for(const renderer of ['webgl','canvas'])for(const release of ['r154','r153','r152','r15','r14'])await run(browser,renderer,release);}
  finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
