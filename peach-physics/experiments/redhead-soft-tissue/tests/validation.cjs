const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const out=path.resolve(process.argv[2]||'/tmp/redhead-evidence');
const base=(process.env.PEACH_TEST_URL||'http://127.0.0.1:8000')+'/peach-physics/experiments/redhead-soft-tissue/';
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});const results={};
 for(const renderer of ['webgl','canvas']){
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+`?renderer=${renderer}&view=B`);await page.waitForFunction(()=>redheadLab?.ready);
  const points=await page.evaluate(()=>{const r=document.querySelector('#canvasB').getBoundingClientRect(),v=redheadLab.snapshot().view;return [[351,462],[480,467]].map(([x,y],id)=>({x:r.left+(x-v[0])/v[2]*r.width,y:r.top+(y-v[1])/v[3]*r.height,id}));});
  const cdp=await context.newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:points});assert.equal(await page.evaluate(()=>redheadLab.snapshot().pointers),2);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:points.map((p,i)=>({...p,x:p.x+(i?12:-12),y:p.y-14}))});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.equal(await page.evaluate(()=>redheadLab.snapshot().pointers),0);
  // Check actual rendered pixels, including full-image protected regions.
  await page.locator('#framing').selectOption('full');
  const pixels=await page.evaluate(async()=>{
   const {mask}=await import('../redhead-soft-tissue/physics.js');redheadLab.pause(true);redheadLab.reset();redheadLab.draw();
   const src=document.querySelector('#canvasB'),copy=document.createElement('canvas');copy.width=src.width;copy.height=src.height;const c=copy.getContext('2d',{willReadFrequently:true});
   c.drawImage(src,0,0);const rest=c.getImageData(0,0,copy.width,copy.height).data;
   redheadLab.model.down(5,351,462);for(let i=0;i<48;i++){redheadLab.model.move(5,351+i*.8,462-i*.3);redheadLab.advance(1/120);}redheadLab.draw();c.drawImage(src,0,0);const moved=c.getImageData(0,0,copy.width,copy.height).data;
   let protectedChanged=0,skinChanged=0,maxDiff=0;for(let y=0;y<copy.height;y++)for(let x=0;x<copy.width;x++){const sx=(x+.5)/copy.width*756,sy=(y+.5)/copy.height*1280,p=(y*copy.width+x)*4,d=Math.max(...[0,1,2].map(k=>Math.abs(rest[p+k]-moved[p+k])));if(d>1){if(mask(sx,sy,0)||mask(sx,sy,1))skinChanged++;else protectedChanged++;maxDiff=Math.max(maxDiff,d);}}
   redheadLab.model.cancel();for(let i=0;i<720;i++)redheadLab.advance(1/120);redheadLab.draw();c.drawImage(src,0,0);const settled=c.getImageData(0,0,copy.width,copy.height).data;let settledChanged=0;for(let i=0;i<rest.length;i++)if(rest[i]!==settled[i])settledChanged++;
   return {protectedChanged,skinChanged,maxDiff,settledChanged};
  });assert.equal(pixels.protectedChanged,0,'no rendered change outside skin contour');assert(pixels.skinChanged>100);assert.equal(pixels.settledChanged,0,'exact rest image recovered');
  await page.screenshot({path:path.join(out,renderer+'-mobile-validated.png')});
  if(renderer==='webgl'){await page.evaluate(()=>document.querySelector('#canvasB').getContext('webgl').getExtension('WEBGL_lose_context').loseContext());await page.waitForFunction(()=>redheadLab.snapshot().renderer==='canvas');}
  assert.deepEqual(errors,[]);results[renderer]={pixels,errors,trustedMultitouch:true,contextLossFallback:renderer==='webgl'};await context.close();
 }
 const page=await browser.newPage();await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,...args){return kind==='webgl'?null:original.call(this,kind,...args);};});await page.goto(base);await page.waitForFunction(()=>redheadLab?.ready);assert.equal(await page.evaluate(()=>redheadLab.snapshot().renderer),'canvas');results.noWebGLFallback=true;
 fs.writeFileSync(path.join(out,'validation.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results));await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
