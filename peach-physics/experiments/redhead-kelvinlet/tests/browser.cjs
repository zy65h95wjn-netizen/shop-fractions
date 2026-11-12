const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{spawn}=require('node:child_process');
const out=path.resolve(process.argv[2]||'/tmp/kelvinlet-evidence');fs.mkdirSync(out,{recursive:true});const base=(process.env.PEACH_TEST_URL||'http://127.0.0.1:8000')+'/peach-physics/experiments/redhead-kelvinlet/';
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});const result={};
 for(const renderer of ['webgl','canvas']){
  const context=await browser.newContext({viewport:{width:1440,height:1080},deviceScaleFactor:1});const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+`?renderer=${renderer}&view=all`);await page.waitForFunction(()=>window.kelvinLab?.ready);await page.evaluate(()=>kelvinLab.pause(true));
  assert.equal(await page.locator('.portrait').count(),3);assert.equal(await page.evaluate(()=>kelvinLab.snapshot().renderer),renderer);
  await page.screenshot({path:path.join(out,`${renderer}-rest.png`)});
  const boxes=await page.locator('article').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};}));
  const video=process.env.RECORD_VIDEO==='0'?null:spawn('ffmpeg',['-y','-loglevel','error','-f','image2pipe','-framerate','24','-vcodec','png','-i','pipe:0','-c:v','libx264','-preset','fast','-crf','19','-pix_fmt','yuv420p','-movflags','+faststart',path.join(out,renderer+'-three-way.mp4')]);let fferr='';video?.stderr.on('data',d=>fferr+=d);const complete=video?new Promise((resolve,reject)=>video.on('close',code=>code?reject(Error(fferr)):resolve())):Promise.resolve();
  await page.evaluate(()=>kelvinLab.start());const timings=[],fallbacks=[];
  const captures=new Map([[0,'start'],[14,'light-tap'],[51,'strong-tap'],[108,'hold'],[131,'release'],[170,'repeated'],[216,'inward'],[264,'outward'],[301,'upward'],[339,'downward'],[391,'both'],[527,'restored']]);
  for(let frame=0;frame<528;frame++){
   const sample=await page.evaluate(()=>{for(let i=0;i<5;i++)kelvinLab.advance(1/120);const t=performance.now();kelvinLab.draw();return {ms:performance.now()-t,safety:kelvinLab.snapshot().safety};});timings.push(sample.ms);if(sample.safety.fallback)fallbacks.push(frame);
   const shot=video||captures.has(frame)?await page.screenshot():null;if(video&&!video.stdin.write(shot))await new Promise(r=>video.stdin.once('drain',r));if(captures.has(frame))fs.writeFileSync(path.join(out,`${renderer}-${captures.get(frame)}.png`),shot);
  }
  video?.stdin.end();await complete;
  const state=await page.evaluate(()=>kelvinLab.snapshot());assert(state.nodes.every(n=>n.dx===0&&n.dy===0),'complete spring rest');
  // Compare actual resting pixels, including all renderers and all methods.
  const restored=await page.evaluate(()=>{const snap=()=>[...document.querySelectorAll('.portrait')].map(c=>c.toDataURL());const before=snap();kelvinLab.reset();return before.every((p,i)=>p===snap()[i]);});assert(restored);
  await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'B',exact:true}).click();await page.getByRole('button',{name:'Focus view',exact:true}).click();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:path.join(out,`${renderer}-iphone-focus.png`)});await page.getByRole('button',{name:'Exit focus'}).click();
  await page.getByRole('button',{name:'Compare',exact:true}).click();await page.locator('#renderer').selectOption(renderer==='canvas'?'webgl':'canvas');assert.equal(await page.evaluate(()=>kelvinLab.snapshot().renderer),renderer==='canvas'?'webgl':'canvas');
  assert.deepEqual(errors,[]);timings.sort((a,b)=>a-b);result[renderer]={boxes,errors,fallbacks,restored,renderTimeMs:{median:timings[Math.floor(timings.length*.5)],p95:timings[Math.floor(timings.length*.95)]},note:'CPU field generation + draw submission at 1440x1080, 3 panels, Chromium SwiftShader. Screenshot encode time excluded; not GPU-completion or iPhone timings.'};
  await context.close();fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify(result,null,2));
 }
 await browser.close();console.log(JSON.stringify(result,null,2));
})().catch(e=>{console.error(e);process.exit(1)});
