// Run from any directory: node tests/browser.cjs [output-directory]
// Needs Playwright, Chromium, ffmpeg, and repo root served on localhost:8000.
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{spawn}=require('node:child_process');
const out=path.resolve(process.argv[2]||'/tmp/redhead-evidence');fs.mkdirSync(out,{recursive:true});
const url=(process.env.PEACH_TEST_URL||'http://127.0.0.1:8000')+'/peach-physics/experiments/redhead-soft-tissue/';
async function main(){
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const report={renderers:{},errors:[]};
 for(const renderer of ['webgl','canvas']){
  const page=await browser.newPage({viewport:{width:1200,height:1120},deviceScaleFactor:1});page.on('pageerror',e=>report.errors.push(e.message));
  await page.goto(url+`?renderer=${renderer}&view=split`);await page.waitForFunction(()=>window.redheadLab?.ready);await page.evaluate(()=>redheadLab.pause(true));
  assert.equal(await page.evaluate(()=>redheadLab.snapshot().renderer),renderer);
  await page.screenshot({path:path.join(out,renderer+'-rest.png')});
  // Actual pointer dispatch with capture, then cancellation; both sides are
  // exercised separately and simultaneously before deterministic evidence.
  const pointer=await page.evaluate(()=>{
   const c=document.querySelector('#canvasB'),r=c.getBoundingClientRect(),v=redheadLab.snapshot().view;
   const fire=(type,id,x,y)=>c.dispatchEvent(new PointerEvent(type,{pointerId:id,pointerType:'touch',clientX:r.left+(x-v[0])/v[2]*r.width,clientY:r.top+(y-v[1])/v[3]*r.height,bubbles:true}));
   fire('pointerdown',31,351,462);fire('pointerdown',32,480,467);const both=redheadLab.snapshot().pointers;
   redheadLab.advance(.02);fire('pointermove',31,375,450);fire('pointermove',32,500,482);const moved=redheadLab.snapshot();
   fire('pointercancel',31,375,450);fire('pointercancel',32,500,482);const cleared=redheadLab.snapshot().pointers;redheadLab.reset();return {both,cleared,moved};
  });assert.equal(pointer.both,2);assert.equal(pointer.cleared,0);
  // Browser screenshot is the actual rendered A/B page, not a synthesized
  // displacement plot. Fixed simulation time keeps both renderer videos matched.
  const video=process.env.RECORD_VIDEO==='0'?null:spawn('ffmpeg',['-y','-loglevel','error','-f','image2pipe','-framerate','24','-vcodec','png','-i','pipe:0','-c:v','libx264','-preset','fast','-crf','20','-pix_fmt','yuv420p','-movflags','+faststart',path.join(out,renderer+'-ab.mp4')]);
  let fferr='';video?.stderr.on('data',d=>fferr+=d);const complete=video?new Promise((resolve,reject)=>video.on('close',code=>code===0?resolve():reject(Error(fferr)))):Promise.resolve();
  await page.evaluate(()=>redheadLab.startDemo());
  let minDet=Infinity,maxMotion=0;const states=[];
  for(let frame=0;frame<360;frame++){
   const check=await page.evaluate(()=>{for(let k=0;k<5;k++)redheadLab.advance(1/120);redheadLab.draw();const f=redheadLab.field('B'),gw=169,gh=85;let min=Infinity,max=0;for(let j=1;j<gh-1;j++)for(let i=1;i<gw-1;i++){const p=2*(j*gw+i),xx=(f[p+2]-f[p-2])/4,xy=(f[p+gw*2]-f[p-gw*2])/4,yx=(f[p+3]-f[p-1])/4,yy=(f[p+gw*2+1]-f[p-gw*2+1])/4;min=Math.min(min,(1+xx)*(1+yy)-xy*yx);max=Math.max(max,Math.hypot(f[p],f[p+1]));}return {min,max,snapshot:redheadLab.snapshot()};});
   minDet=Math.min(minDet,check.min);maxMotion=Math.max(maxMotion,check.max);
   const selected=[10,14,42,56,83,90,130,139,178,187,224,233,260,359].includes(frame);
   const shot=video||selected?await page.screenshot():null;if(video&&!video.stdin.write(shot))await new Promise(r=>video.stdin.once('drain',r));
   if(selected){fs.writeFileSync(path.join(out,`${renderer}-${String(frame).padStart(3,'0')}.png`),shot);states.push({frame,...check});}
  }
  video?.stdin.end();await complete;
  const settled=await page.evaluate(()=>redheadLab.snapshot());
  assert(settled.nodes.every(n=>Math.hypot(n.dx,n.dy)<.015),'settles after sequence');assert(minDet>0,'no folded sampling map');
  // Full portrait and narrow viewport remain usable without page overflow.
  await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'B · Localized',exact:true}).click();await page.locator('#framing').selectOption('full');await page.screenshot({path:path.join(out,renderer+'-mobile-full.png')});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.locator('#renderer').selectOption(renderer==='webgl'?'canvas':'webgl');assert.equal(await page.evaluate(()=>redheadLab.snapshot().renderer),renderer==='webgl'?'canvas':'webgl');
  report.renderers[renderer]={pointer,minDet,maxMotion,settled,states};await page.close();
 }
 assert.deepEqual(report.errors,[]);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(report,null,2));await browser.close();console.log(JSON.stringify({out,renderers:Object.fromEntries(Object.entries(report.renderers).map(([k,v])=>[k,{minDet:v.minDet,maxMotion:v.maxMotion}])),errors:report.errors}));
}
main().catch(e=>{console.error(e);process.exit(1);});
