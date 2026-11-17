const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const base=process.env.PEACH_TEST_URL||'http://127.0.0.1:8123',url=base+'/peach-physics/previews/holly-bounce/',out='/tmp/holly-bounce';fs.mkdirSync(out,{recursive:true});
const report={baselineSnapshots:0,restPixelDifferences:[],protectedPixelDifferences:[],maskChecks:[],renderers:[],offline:false,errors:[]};
(async()=>{const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});try{
 for(const fallback of [false,true]){
  const c=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  await c.addInitScript(fallback=>{const raf=requestAnimationFrame;window.requestAnimationFrame=f=>raf(t=>{if(!window.testPaused)f(t)});if(fallback){const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type.includes('webgl')?null:get.call(this,type,...args)}}},fallback);
  const p=await c.newPage();p.on('pageerror',e=>report.errors.push(e.message));await p.goto(url);await p.waitForFunction(()=>window.__hollyBounce?.ready(),null,{timeout:60000});await p.evaluate(()=>testPaused=true);
  await p.evaluate(()=>{const a=__hollyBounce;a.changeView('both');a.setAuto(false);a.reset();a.draw()});
  const renderer=await p.evaluate(()=>__hollyBounce.apis()[1].snapshot().renderer);assert.equal(renderer,fallback?'canvas':'webgl');report.renderers.push(renderer);
  const masks=await p.evaluate(()=>{const m=__hollyBounce.apis()[1].masks(),[ox,oy,w,h]=m.crop;let border=0,garment=0,changed=0,upper=0;
   for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4;if(m.active[i+2]!==m.original[i+2])garment++;for(let side=0;side<2;side++){if(m.active[i+side]!==m.original[i+side])changed++;if(y+oy<420&&m.active[i+side]>m.original[i+side])upper++;if((x<2||x>=w-2||y<2||y>=h-2)&&m.active[i+side])border++}}
   return{border,garment,changed,upper};});assert.equal(masks.border,0);assert.equal(masks.garment,0);assert(masks.changed>5000&&masks.upper>200);report.maskChecks.push(masks);
  const pixels=await p.evaluate(()=>{const apis=__hollyBounce.apis(),rest=apis.map(a=>a.pixels());let different=0;for(let i=0;i<rest[0].length;i++)if(rest[0][i]!==rest[1][i])different++;
   const a=apis[1],frame=frames[1].contentDocument.querySelector('#game'),s=a.snapshot(),isCanvas=s.renderer==='canvas';let protectedChanges=0,motionDifferences=0;
   for(const [dx,dy] of [[26,30],[-26,-30],[26,-30],[-26,30]]){
    apis.forEach(a=>a.pose(dx,dy));const images=apis.map(a=>a.pixels());
    for(let y=0;y<frame.height;y++)for(let x=0;x<frame.width;x++){
     const py=isCanvas?y:frame.height-1-y;
     const sx=((x+.5)/frame.width*s.size[0]-s.framing.x)/s.framing.width*754;
     const sy=((py+.5)/frame.height*s.size[1]-s.framing.y)/s.framing.height*1280;
     const i=(y*frame.width+x)*4;
     if(sx<213||sx>603||sy<377||sy>639){for(let k=0;k<4;k++)if(images[1][i+k]!==rest[1][i+k])protectedChanges++}
     for(let k=0;k<3;k++)if(images[0][i+k]!==images[1][i+k])motionDifferences++;
    }
   }
   return {different,protectedChanges,motionDifferences};
  });assert.equal(pixels.different,0,'resting portrait is unchanged');assert.equal(pixels.protectedChanges,0,'face, arms and scenery remain stationary');assert(pixels.motionDifferences>1000,'candidate produces a visible deformation change');report.restPixelDifferences.push(pixels.different);report.protectedPixelDifferences.push(pixels.protectedChanges);
  await p.evaluate(()=>{__hollyBounce.changeView('softer');__hollyBounce.reset();__hollyBounce.draw()});
  const box=await p.locator('iframe[name="softer"]').boundingBox(),point=await p.evaluate(()=>{const s=__hollyBounce.apis()[1].snapshot();return{x:s.framing.x+323/754*s.framing.width,y:s.framing.y+474/1280*s.framing.height}});
  const x=box.x+point.x,y=box.y+point.y;await p.touchscreen.tap(x,y);assert.deepEqual(await p.evaluate(()=>__hollyBounce.apis().map(a=>a.snapshot().lastGesture)),['slap','slap']);
  await p.mouse.move(x,y);await p.mouse.down();await p.mouse.move(x+24,y+35,{steps:5});assert.deepEqual(await p.evaluate(()=>__hollyBounce.apis().map(a=>a.snapshot().activePointers.length)),[1,1]);await p.mouse.up();
  // Independent multitouch, then cancellation when the page loses focus.
  await p.evaluate(()=>{for(const [side,x] of [[0,323],[1,495]])__hollyRelay({type:'pointerdown',id:40+side,x,y:474})});assert.deepEqual(await p.evaluate(()=>__hollyBounce.apis().map(a=>a.snapshot().activePointers.length)),[2,2]);
  await p.evaluate(()=>window.dispatchEvent(new Event('blur')));assert.deepEqual(await p.evaluate(()=>__hollyBounce.apis().map(a=>a.snapshot().activePointers.length)),[0,0]);
  await p.evaluate(()=>{const a=__hollyBounce;a.setAuto(false);for(let i=0;i<120*10;i++)a.tick(1/120);a.draw()});assert((await p.evaluate(()=>__hollyBounce.apis().flatMap(a=>a.snapshot().nodes))).every(n=>Math.abs(n.dx)+Math.abs(n.dy)<.01));
  await p.locator('#closeup').tap();await p.evaluate(()=>{__hollyBounce.apis().forEach(a=>a.bounce());for(let i=0;i<12;i++)__hollyBounce.tick(1/120);__hollyBounce.draw()});await p.screenshot({path:out+(fallback?'/fallback-live.png':'/webgl-live.png')});
  if(!fallback){
   const root=path.resolve(__dirname,'../../v8');let source=fs.readFileSync(path.join(root,'index.html'),'utf8');
   source=source.replace(/const (IMAGE|OTHER_IMAGE)='[^']*';/g,"const $1='';").replace(/ CHARACTERS.forEach\(\(c,index\)=>.*?\);\n/,'').replaceAll('requestAnimationFrame(loop)','void 0').replaceAll('localStorage','previewStorage');
   source=source.replace('<script src="./motion.js?v=r14-auto2"></script>','<script>window.previewStorage={getItem:()=>null,setItem:()=>{}};</script><script>'+fs.readFileSync(path.join(root,'motion.js'),'utf8').replaceAll('win.localStorage','win.previewStorage')+'</script>');
   source=source.replace('presentCharacter();\ngetPhoto',`window.__native={ready:()=>!!img,configure:(preset,auto)=>{Object.assign(model,currentPresets()[preset]);reset();let seed=8147;motion.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};motion.time=0;motion.quietUntil=0;motion.autoDrive=null;motion.setAuto(auto)},tick:dt=>{motion.tick(dt);step(dt)},bounce:()=>{motion.interrupt();bounceBoth()},raw:()=>JSON.parse(JSON.stringify({nodes,followers,impacts,waves}))};\npresentCharacter();\ngetPhoto`);
   const n=await c.newPage(),nativeUrl=base+'/peach-physics/v8/?character=holly';await n.route(nativeUrl,r=>r.fulfill({contentType:'text/html',body:source}));await n.goto(nativeUrl);await n.waitForFunction(()=>window.__native?.ready());
   for(const preset of ['natural','playful','chaos'])for(const auto of [false,true]){
    await p.evaluate(({preset,auto})=>{__hollyBounce.apis().forEach(a=>{a.preset(preset);a.auto(auto);if(!auto)a.bounce()})},{preset,auto});await n.evaluate(({preset,auto})=>{__native.configure(preset,auto);if(!auto)__native.bounce()},{preset,auto});
    for(let i=0;i<12;i++){
     const [expected,actual]=await Promise.all([n.evaluate(()=>{for(let i=0;i<60;i++)__native.tick(1/120);return __native.raw()}),p.evaluate(()=>__hollyBounce.apis().map(a=>{for(let i=0;i<60;i++)a.tick(1/120);return a.raw()}))]);
     for(const a of actual){assert.deepEqual(a,expected,'v8 '+preset+' auto='+auto+' sample='+i);report.baselineSnapshots++}
    }
   }await n.close();
   await p.evaluate(async()=>{await navigator.serviceWorker.ready});await p.reload();await p.waitForFunction(()=>window.__hollyBounce?.ready()&&navigator.serviceWorker.controller);await c.setOffline(true);await p.reload();await p.waitForFunction(()=>window.__hollyBounce?.ready());await p.locator('#bounce').tap();assert.equal(await p.evaluate(()=>__hollyBounce.snapshot().offlineReady),true);report.offline=true;
  }
  assert.deepEqual(await p.evaluate(()=>__hollyBounce.apis().map(a=>a.error())),[0,0]);await c.close();
 }
 assert.deepEqual(report.errors,[]);fs.writeFileSync(out+'/results.json',JSON.stringify(report,null,2));console.log(report);
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
