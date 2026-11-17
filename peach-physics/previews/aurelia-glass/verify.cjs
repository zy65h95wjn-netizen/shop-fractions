const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
const dir=__dirname,out='/tmp/aurelia-glass';fs.mkdirSync(out,{recursive:true});
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});const report={renderers:[],errors:[],externalRequests:[],pressureCases:0,stabilityCases:0,pixelProtectionCases:0};try{
 for(const fallback of [false,true]){
  const c=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});await c.setOffline(true);
  await c.addInitScript(fallback=>{const raf=requestAnimationFrame;window.requestAnimationFrame=f=>raf(t=>{if(!window.paused)f(t)});window.testClock=1000;performance.now=()=>testClock;if(fallback){const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(t,...args){if(t.includes('webgl'))return null;return get.call(this,t,t==='2d'?{...args[0],willReadFrequently:true}:args[0])}}},fallback);
  const p=await c.newPage();p.on('pageerror',e=>report.errors.push(e.message));p.on('request',r=>{if(/^https?:/.test(r.url())&&r.url()!=='http://localhost/glass')report.externalRequests.push(r.url())});
  await p.route('http://localhost/glass',r=>r.fulfill({contentType:'text/html',body:fs.readFileSync(path.join(dir,'index.html'),'utf8')}));await p.goto('http://localhost/glass');await p.waitForFunction(()=>window.__aureliaComparison?.ready(),null,{polling:100,timeout:60000});await p.evaluate(()=>{paused=true;__aureliaComparison.apis().forEach(a=>{a.auto(false);a.reset();a.draw()})});
  const states=await p.evaluate(()=>__aureliaComparison.apis().map(a=>a.snapshot()));assert.equal(states[0].glass,false);assert.equal(states[1].glass,true);assert.equal(states[1].glassRenderer,fallback?'canvas':'webgl');report.renderers.push(states[1].glassRenderer);
  const embedded=await p.evaluate(()=>__aureliaComparison.frameSource().match(/data:image\/jpeg;base64,([^']+)/)[1]);assert(Buffer.from(embedded,'base64').equals(fs.readFileSync(path.resolve(dir,'../../v8/assets/aurelia-frost.jpg'))));
  for(const preset of ['natural','playful','chaos']){
   const traces=await p.evaluate(preset=>{const apis=__aureliaComparison.apis();apis.forEach(a=>{a.preset(preset);a.auto(true)});let max=0;for(let i=0;i<120*12;i++){__aureliaComparison.step(1/120);if(i%30===0){const [a,b]=apis.map(a=>a.raw());if(JSON.stringify(a)!==JSON.stringify(b))throw Error('Rendering changed solver state');for(const n of b.nodes){if(!Number.isFinite(n.dx+n.dy))throw Error('Nonfinite');max=Math.max(max,Math.abs(n.dx)/26,Math.abs(n.dy)/30)}}}apis.forEach(a=>{a.auto(false);a.reset();a.draw()});return max},preset);assert(traces<=1);report.stabilityCases++;
  }
  const pixels=await p.evaluate(fallback=>{
   const a=__aureliaComparison.apis()[1],c=a.glassDebug.canvas();
   const read=()=>{if(fallback)return new Uint8Array(c.getContext('2d').getImageData(0,0,c.width,c.height).data);const gl=c.getContext('webgl'),p=new Uint8Array(c.width*c.height*4);gl.readPixels(0,0,c.width,c.height,gl.RGBA,gl.UNSIGNED_BYTE,p);return p};
   a.glassDebug.setPressure(0);const before=read();a.glassDebug.setPressure(.94);const after=read(),s=a.snapshot(),scale=c.width/s.size[0];let changed=0,protectedChanges=0;
   for(let i=0;i<after.length;i++)if(after[i]!==before[i])changed++;
   for(const [x,y] of [[375,220],[320,520],[360,730],[400,890],[170,1100],[530,1100],[100,900]]){const cx=Math.floor((s.framing.x+x/756*s.framing.width)*scale),cy=Math.floor((s.framing.y+y/1280*s.framing.height)*scale),at=((fallback?cy:c.height-1-cy)*c.width+cx)*4;for(let k=0;k<4;k++)if(before[at+k]!==after[at+k])protectedChanges++}
   return{changed,protectedChanges};
  },fallback);assert(pixels.changed>100);assert.equal(pixels.protectedChanges,0);report.pixelProtectionCases++;
  // Pressure broadens the surface gently; fixed garment/crease/thigh/face probes stay anchored.
  for(const pressure of [0,.58,.94]){
   const result=await p.evaluate(pressure=>{
    const a=__aureliaComparison.apis()[1];a.glassDebug.setPressure(pressure);
    const probes=[[375,220],[320,520],[360,730],[400,890],[170,1100],[530,1100],[100,900]];
    const stationary=probes.map(([x,y])=>a.glassDebug.displacement(x,y));
    const left=a.glassDebug.displacement(225,901),right=a.glassDebug.displacement(305,901),top=a.glassDebug.displacement(265,861),bottom=a.glassDebug.displacement(265,941);
    let max=0;for(let y=768;y<1024;y+=6)for(let x=112;x<640;x+=6)max=Math.max(max,Math.hypot(...a.glassDebug.displacement(x,y)));
    return{stationary,left,right,top,bottom,max};
   },pressure);
   assert(result.stationary.flat().every(v=>v===0));assert(result.max<10);
   if(pressure){assert(result.left[0]<0&&result.right[0]>0);assert(result.top[1]>0&&result.bottom[1]<0)}else assert.equal(result.max,0);report.pressureCases++;
  }
  await p.evaluate(()=>{__aureliaComparison.apis().forEach(a=>a.reset());__aureliaRelay({type:'pointerdown',id:11,x:270,y:903});for(let i=0;i<90;i++)__aureliaComparison.step(1/120);__aureliaComparison.draw()});
  assert(await p.evaluate(()=>__aureliaComparison.apis()[1].snapshot().glassPressure[0]>.93));
  await p.screenshot({path:path.join(out,(fallback?'canvas':'webgl')+'-phone.png')});
  await p.locator('button[data-view="glass"]').click();await p.locator('#closeup').click();await p.evaluate(()=>{__aureliaComparison.apis().forEach(a=>a.resize());__aureliaComparison.draw()});await p.screenshot({path:path.join(out,(fallback?'canvas':'webgl')+'-close.png')});
  await p.evaluate(()=>{__aureliaRelay({type:'pointercancel',id:11,x:270,y:903});for(let i=0;i<120*6;i++)__aureliaComparison.step(1/120)});
  const released=await p.evaluate(()=>__aureliaComparison.apis().map(a=>a.snapshot()));assert(released.every(s=>s.activePointers.length===0));assert(released[1].glassPressure.every(v=>Math.abs(v-.58)<.001));assert(released.every(s=>s.nodes.every(n=>Math.abs(n.dx)+Math.abs(n.dy)<.02)));
  assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await c.close();
 }
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.externalRequests,[]);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(report,null,2));console.log(report);
}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});
