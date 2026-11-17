const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
const dir=__dirname,root=path.resolve(dir,'../../..'),out='/tmp/aurelia-comparison';fs.mkdirSync(out,{recursive:true});
const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
const report={renderers:[],mirroredGestures:0,protectedPoses:0,stabilityCases:0,errors:[],requests:[]};
(async()=>{const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});try{
 for(const fallback of [false,true]){
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  await context.setOffline(true);
  await context.addInitScript(({fallback})=>{
   const raf=window.requestAnimationFrame;window.requestAnimationFrame=fn=>raf.call(window,t=>{if(!window.testPaused)fn(t)});
   window.testClock=1000;Object.defineProperty(performance,'now',{value:()=>window.testClock});
   // Any production profile access is a test failure, including reads.
   window.storageAttempts=0;Storage.prototype.getItem=Storage.prototype.setItem=()=>{window.storageAttempts++;throw Error('Persistent storage used')};
   // Keep Canvas readbacks on one backend: Chromium otherwise switches resamplers mid-test.
   if(fallback){const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(t,...a){if(t.includes('webgl'))return null;if(t==='2d')return get.call(this,t,{...a[0],willReadFrequently:true});return get.call(this,t,...a)}};
  },{fallback});
  const p=await context.newPage();p.on('pageerror',e=>report.errors.push(e.message));p.on('request',r=>{if(/^https?:/.test(r.url())&&r.url()!=='http://localhost/aurelia')report.requests.push(r.url())});
  await p.route('http://localhost/aurelia',r=>r.fulfill({contentType:'text/html',body:html}));await p.goto('http://localhost/aurelia');
  await p.waitForFunction(()=>window.__aureliaComparison?.ready(),null,{polling:100,timeout:30000});
  await p.evaluate(()=>{testPaused=true;__aureliaComparison.apis().forEach(a=>{a.auto(false);a.reset();a.draw()})});
  let states=await p.evaluate(()=>__aureliaComparison.apis().map(a=>a.snapshot()));
  assert(states.every(s=>s.character==='aurelia'&&s.renderer===(fallback?'canvas':'webgl')));report.renderers.push(states[0].renderer);
  assert.equal(states[0].experiment,false);assert.equal(states[1].experiment,true);
  assert.deepEqual(states[0].regions,states[1].regions);assert.deepEqual(states[0].model,states[1].model);
  const embedded=await p.evaluate(()=>__aureliaComparison.frameSource().match(/data:image\/jpeg;base64,([^']+)/)[1]);
  assert(Buffer.from(embedded,'base64').equals(fs.readFileSync(path.join(root,'peach-physics/v8/assets/aurelia-frost.jpg'))));
  // Real browser touch on either pane must reach BOTH engines.
  for(let frameIndex=0;frameIndex<2;frameIndex++){
   const pos=await p.evaluate(i=>{const f=document.querySelectorAll('iframe')[i],r=f.getBoundingClientRect(),s=f.contentWindow.__aureliaFrame.snapshot();return{x:r.x+s.framing.x+270/756*s.framing.width,y:r.y+s.framing.y+903/1280*s.framing.height}},frameIndex);
   await p.touchscreen.tap(pos.x,pos.y);
   states=await p.evaluate(()=>__aureliaComparison.apis().map(a=>a.snapshot()));
   assert(states.every(s=>s.slapCount===frameIndex+1&&s.activePointers.length===0));report.mirroredGestures++;
  }
  const dragPoint=await p.evaluate(()=>{const f=document.querySelector('iframe'),r=f.getBoundingClientRect(),s=f.contentWindow.__aureliaFrame.snapshot();return{x:r.x+s.framing.x+270/756*s.framing.width,y:r.y+s.framing.y+903/1280*s.framing.height}});
  await p.mouse.move(dragPoint.x,dragPoint.y);await p.mouse.down();await p.mouse.move(dragPoint.x+15,dragPoint.y+15,{steps:6});
  states=await p.evaluate(()=>__aureliaComparison.apis().map(a=>a.snapshot()));assert(states.every(s=>s.activePointers.length===1&&s.activePointers[0].grabbed));
  await p.mouse.up();states=await p.evaluate(()=>__aureliaComparison.apis().map(a=>a.snapshot()));assert(states.every(s=>s.activePointers.length===0));report.mirroredGestures++;
  for(const preset of ['natural','playful','chaos']){
   const result=await p.evaluate(preset=>{const apis=__aureliaComparison.apis();apis.forEach(a=>{a.preset(preset);a.auto(true)});let max=0,difference=0;for(let i=0;i<120*15;i++){apis.forEach(a=>a.tick(1/120));if(i%10===0){const [a,b]=apis.map(a=>a.snapshot());for(let j=0;j<6;j++){const d=b.renderOffsets[j];if(!Number.isFinite(d.dx+d.dy))throw Error('Nonfinite');max=Math.max(max,Math.abs(d.dx)/26,Math.abs(d.dy)/30);difference+=Math.hypot(d.dx-a.renderOffsets[j].dx,d.dy-a.renderOffsets[j].dy)}}}apis.forEach(a=>{a.auto(false);for(let i=0;i<120*10;i++)a.tick(1/120);a.draw()});return{max,difference,rest:apis.map(a=>a.snapshot().renderOffsets)}},preset);
   assert(result.max<=1&&result.difference>10,'different but bounded motion');assert(result.rest.flat().every(d=>Math.abs(d.dx)<.02&&Math.abs(d.dy)<.02),'both settle');report.stabilityCases++;
  }
  // Rest/pose comparisons use identical calibrated source coordinates in both views.
  const protectedPoints=[[375,220],[320,520],[360,730],[400,890],[170,1100],[530,1100],[100,900]];
  for(const side of [0,1])for(const [dx,dy] of [[26,30],[-26,-30]]){
   const result=await p.evaluate(({side,dx,dy,protectedPoints,fallback})=>{
    const apis=__aureliaComparison.apis(),frames=[...document.querySelectorAll('iframe')];
    const read=f=>{const c=f.contentDocument.querySelector('canvas'),gl=c.getContext('webgl');if(gl){const b=new Uint8Array(c.width*c.height*4);gl.readPixels(0,0,c.width,c.height,gl.RGBA,gl.UNSIGNED_BYTE,b);return b}return c.getContext('2d').getImageData(0,0,c.width,c.height).data};
    apis.forEach(a=>a.pose(0,0,side));const before=frames.map(read);apis.forEach(a=>a.pose(dx,dy,side));const after=frames.map(read);
    let changed=0,protectedChanges=0,paneDifference=0,probeDiffs=[];
    for(let i=0;i<after[0].length;i++)if(after[0][i]!==after[1][i])paneDifference++;
    frames.forEach((f,j)=>{const c=f.contentDocument.querySelector('canvas'),s=apis[j].snapshot(),scale=c.width/s.size[0];for(let i=0;i<after[j].length;i++)if(before[j][i]!==after[j][i])changed++;
     for(const [x,y] of protectedPoints){const cx=Math.floor((s.framing.x+x/756*s.framing.width)*scale),cy=Math.floor((s.framing.y+y/1280*s.framing.height)*scale),at=((fallback?cy:c.height-1-cy)*c.width+cx)*4;for(let k=0;k<3;k++)if(before[j][at+k]!==after[j][at+k]){protectedChanges++;probeDiffs.push({j,x,y,k,before:before[j][at+k],after:after[j][at+k]})}}
    });return{changed,protectedChanges,paneDifference,probeDiffs};
   },{side,dx,dy,protectedPoints,fallback});
   if(result.protectedChanges)console.log({fallback,side,dx,dy,...result});assert(result.changed>100);assert.equal(result.protectedChanges,0);assert.equal(result.paneDifference,0,'identical pose gives identical rendering');report.protectedPoses++;
  }
  // Two simultaneous fingers and diagonal drag/release/cancel use the same source input.
  await p.evaluate(()=>{const apis=__aureliaComparison.apis();apis.forEach(a=>a.reset());for(const [id,x] of [[11,270],[12,513]])__aureliaRelay({type:'pointerdown',id,x,y:905});for(const [id,x] of [[11,330],[12,565]])__aureliaRelay({type:'pointermove',id,x,y:965});apis.forEach(a=>a.tick(1/120))});
  states=await p.evaluate(()=>__aureliaComparison.apis().map(a=>a.snapshot()));assert(states.every(s=>s.activePointers.length===2));assert.deepEqual(states[0].nodes,states[1].nodes);
  await p.evaluate(()=>{__aureliaRelay({type:'pointerup',id:11,x:330,y:965});__aureliaRelay({type:'pointercancel',id:12,x:565,y:965});for(let i=0;i<120*8;i++)__aureliaComparison.step(1/120)});
  states=await p.evaluate(()=>__aureliaComparison.apis().map(a=>a.snapshot()));assert(states.every(s=>s.activePointers.length===0&&s.nodes.every(n=>Math.abs(n.dx)+Math.abs(n.dy)<.02)));report.mirroredGestures+=2;
  await p.locator('#closeup').click();await p.locator('button[data-view="blender"]').click();
  await p.evaluate(()=>__aureliaComparison.apis().forEach(a=>{a.resize();a.draw()}));
  await p.screenshot({path:path.join(out,(fallback?'canvas':'webgl')+'-closer.png')});
  await p.locator('button[data-view="both"]').click();await p.locator('#closeup').click();
  await p.evaluate(()=>__aureliaComparison.apis().forEach(a=>{a.resize();a.bounce();for(let i=0;i<14;i++)a.tick(1/120);a.draw()}));
  await p.screenshot({path:path.join(out,(fallback?'canvas':'webgl')+'-phone.png')});
  assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal overflow');
  assert.equal(await p.evaluate(()=>storageAttempts+[...document.querySelectorAll('iframe')].reduce((n,f)=>n+f.contentWindow.storageAttempts,0)),0,'no persistent profile reads or writes');
  await context.close();
 }
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.requests,[]);
 fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(report,null,2));console.log(report);
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
