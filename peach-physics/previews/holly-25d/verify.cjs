// Run with a repository-root server at 8123. Captures stay in /tmp.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const base=process.env.PEACH_TEST_URL||'http://127.0.0.1:8123';
const url=base+'/peach-physics/previews/holly-25d/',out='/tmp/holly-25d';fs.mkdirSync(out,{recursive:true});
const report={baselineSnapshots:0,frontPixelDifferences:null,projectedHitError:0,minProjectionJacobian:1,renderers:[],offline:false,errors:[]};
const launch={executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']};
async function context(browser,fallback){
 const c=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
 await c.addInitScript(fallback=>{
  const raf=requestAnimationFrame;window.requestAnimationFrame=f=>raf(t=>{if(!window.testPaused)f(t)});
  if(fallback){const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type.includes('webgl')?null:get.call(this,type,...args)}}
 },fallback);
 return c;
}
(async()=>{const browser=await chromium.launch(launch);try{
 for(const fallback of [false,true]){
  const c=await context(browser,fallback),p=await c.newPage();p.on('pageerror',e=>report.errors.push(e.message));
  await p.goto(url);await p.waitForFunction(()=>window.__holly25d?.ready(),null,{timeout:60000});await p.evaluate(()=>testPaused=true);
  await p.evaluate(()=>{const a=__holly25d;a.changeView('both');a.setAuto(false);a.reset();a.draw()});
  assert.deepEqual(await p.evaluate(()=>__holly25d.apis().map(a=>a.snapshot().renderer)),[fallback?'canvas':'webgl',fallback?'canvas':'webgl']);report.renderers.push(fallback?'Canvas fallback':'WebGL1');
  const exact=await p.evaluate(()=>{
   const apis=__holly25d.apis(),x=apis[0].pixels(),y=apis[1].pixels();if(x.length!==y.length)throw Error('Mismatched comparison dimensions');
   let differences=0;for(let i=0;i<x.length;i++)if(x[i]!==y[i])differences++;
   return {differences,errors:apis.map(a=>a.error())};
  });assert.equal(exact.differences,0,'front view must match original renderer exactly');assert.deepEqual(exact.errors,[0,0]);report.frontPixelDifferences=0;
  await p.evaluate(()=>{const a=__holly25d;a.changeView('relief');a.setView(.12,-.075,true);a.draw()});
  await p.screenshot({path:out+(fallback?'/fallback.png':'/angle-right.png')});
  if(!fallback){
   const m=await p.evaluate(()=>{
    const a=__holly25d.apis()[1];let minJac=Infinity,maxHitError=0;
    // Check that the relief remains invertible throughout both extreme views.
    for(const view of [[.12,.075],[-.12,-.075],[.12,-.075],[-.12,.075]]){
     a.view(...view);
     for(let y=4;y<1280;y+=8)for(let x=4;x<754;x+=8){
      const p=a.project(x,y),px=a.project(x+1,y),py=a.project(x,y+1);
      const jac=(px.x-p.x)*(py.y-p.y)-(px.y-p.y)*(py.x-p.x);minJac=Math.min(minJac,jac);
      if(x>240&&x<570&&y>410&&y<590){let q={...p};for(let i=0;i<7;i++){const t=a.project(q.x,q.y);q.x+=p.x-t.x;q.y+=p.y-t.y}maxHitError=Math.max(maxHitError,Math.hypot(q.x-x,q.y-y))}
     }
    }
    return {minJac,maxHitError};
   });assert(m.minJac>.35,'no folded or inverted projection');assert(m.maxHitError<.1,'touch alignment at extreme view');report.minProjectionJacobian=m.minJac;report.projectedHitError=m.maxHitError;
   await p.evaluate(()=>{__holly25d.setView(-.12,.075,true);__holly25d.draw()});await p.screenshot({path:out+'/angle-left.png'});
  }
  // Actual browser taps and drags at projected image coordinates.
  await p.evaluate(()=>{__holly25d.reset();__holly25d.setView(.12,-.075,true);__holly25d.draw()});
  const iframe=p.locator('iframe[name="relief"]'),box=await iframe.boundingBox();
  const point=await p.evaluate(()=>{const a=__holly25d.apis()[1],s=a.snapshot(),p=a.project(323,474);return{x:s.framing.x+p.x/754*s.framing.width,y:s.framing.y+p.y/1280*s.framing.height}});
  const x=box.x+point.x,y=box.y+point.y;
  await p.touchscreen.tap(x,y);assert.deepEqual(await p.evaluate(()=>__holly25d.apis().map(a=>a.snapshot().lastGesture)),['slap','slap']);
  await p.mouse.move(x,y);await p.mouse.down();await p.mouse.move(x+18,y+24,{steps:5});
  assert.deepEqual(await p.evaluate(()=>__holly25d.apis().map(a=>a.snapshot().activePointers.length)),[1,1]);
  await p.evaluate(()=>{for(let i=0;i<30;i++)__holly25d.tick(1/120);__holly25d.draw()});await p.mouse.up();
  assert.deepEqual(await p.evaluate(()=>__holly25d.apis().map(a=>a.snapshot().activePointers.length)),[0,0]);
  await p.evaluate(()=>{const a=__holly25d;a.setAuto(false);for(let i=0;i<120*10;i++)a.tick(1/120);a.draw()});
  assert((await p.evaluate(()=>__holly25d.apis().flatMap(a=>a.snapshot().nodes))).every(n=>Math.abs(n.dx)+Math.abs(n.dy)<.01));
  // A background drag changes only the view, and Front restores zero depth.
  if(!fallback){await p.mouse.move(box.x+15,box.y+80);await p.mouse.down();await p.mouse.move(box.x+85,box.y+95,{steps:5});await p.mouse.up();await p.evaluate(()=>{for(let i=0;i<80;i++)__holly25d.tick(1/120);__holly25d.draw()});assert(Math.abs(await p.evaluate(()=>__holly25d.snapshot().view[0]))>.01)}
  if(fallback){assert(await p.locator('#front').isDisabled());await p.evaluate(()=>__holly25d.front())}
  else await p.locator('#front').tap();
  assert.deepEqual(await p.evaluate(()=>__holly25d.snapshot().view),[0,0]);
  await p.locator('#closeup').tap();await p.evaluate(()=>__holly25d.draw());await p.screenshot({path:out+(fallback?'/fallback-close.png':'/close.png')});
  await p.locator('#closeup').tap();await p.evaluate(()=>__holly25d.draw());
  if(!fallback){
   // Compare the preview to unmodified v8 integration and Auto trajectories.
   const root=path.resolve(__dirname,'../../v8');let source=fs.readFileSync(path.join(root,'index.html'),'utf8');
   source=source.replace(/const (IMAGE|OTHER_IMAGE)='[^']*';/g,"const $1='';").replace(/ CHARACTERS.forEach\(\(c,index\)=>.*?\);\n/,'').replaceAll('requestAnimationFrame(loop)','void 0').replaceAll('localStorage','previewStorage');
   source=source.replace('<script src="./motion.js?v=r14-auto2"></script>','<script>window.previewStorage={getItem:()=>null,setItem:()=>{}};</script><script>'+fs.readFileSync(path.join(root,'motion.js'),'utf8').replaceAll('win.localStorage','win.previewStorage')+'</script>');
   source=source.replace('presentCharacter();\ngetPhoto',`window.__native={ready:()=>!!img,configure:(preset,auto)=>{Object.assign(model,currentPresets()[preset]);reset();let seed=8147;motion.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};motion.time=0;motion.quietUntil=0;motion.autoDrive=null;motion.setAuto(auto)},tick:dt=>{motion.tick(dt);step(dt)},bounce:()=>{motion.interrupt();bounceBoth()},raw:()=>JSON.parse(JSON.stringify({nodes,followers,impacts,waves}))};\npresentCharacter();\ngetPhoto`);
   const n=await c.newPage(),nativeUrl=base+'/peach-physics/v8/?character=holly';await n.route(nativeUrl,r=>r.fulfill({contentType:'text/html',body:source}));await n.goto(nativeUrl);await n.waitForFunction(()=>window.__native?.ready());
   for(const preset of ['natural','playful','chaos'])for(const auto of [false,true]){
    await p.evaluate(({preset,auto})=>{__holly25d.apis().forEach(a=>{a.preset(preset);a.auto(auto);if(!auto)a.bounce()})},{preset,auto});
    await n.evaluate(({preset,auto})=>{__native.configure(preset,auto);if(!auto)__native.bounce()},{preset,auto});
    for(let i=0;i<12;i++){
     const [expected,actual]=await Promise.all([n.evaluate(()=>{for(let i=0;i<60;i++)__native.tick(1/120);return __native.raw()}),p.evaluate(()=>__holly25d.apis().map(a=>{for(let i=0;i<60;i++)a.tick(1/120);return a.raw()}))]);
     for(const a of actual){assert.deepEqual(a,expected,'v8 '+preset+' auto='+auto+' sample='+i);report.baselineSnapshots++}
    }
   }await n.close();
   // Reload the exact phone preview without network, including its source art.
   await p.evaluate(async()=>{await navigator.serviceWorker.ready});await p.reload();await p.waitForFunction(()=>window.__holly25d?.ready()&&navigator.serviceWorker.controller);
   await c.setOffline(true);await p.reload();await p.waitForFunction(()=>window.__holly25d?.ready());await p.locator('#bounce').tap();
   assert.equal(await p.evaluate(()=>__holly25d.snapshot().offlineReady),true);report.offline=true;await p.screenshot({path:out+'/offline.png'});
  }
  await c.close();
 }
 assert.deepEqual(report.errors,[]);fs.writeFileSync(out+'/results.json',JSON.stringify(report,null,2));console.log(report);
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
