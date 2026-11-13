// Test the user's R13.3 tuning: slightly stronger Auto and easier gentle-phone Shake.
const {chromium,setup,select,assert,fs,path,dir}=require('./fixtures.cjs');
const {execFileSync}=require('node:child_process');
(async()=>{const oldPath='/tmp/r132-motion.js';fs.writeFileSync(oldPath,execFileSync('git',['show','10fa408:peach-physics/experiments/r13-motion/motion.js'],{cwd:dir}));
const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});const rows=[];try{
for(const fallback of [false,true])for(const revision of ['r13.2','r13.3']){
 const app=await setup(b,{fallback,motionSource:revision==='r13.2'?oldPath:null});
 for(const id of ['ember','midnight','aurelia','holly','santa'])for(const preset of ['natural','playful','chaos']){await select(app.page,id);await app.page.evaluate(preset=>document.querySelector(`[data-preset="${preset}"]`).click(),preset);
 const result=await app.page.evaluate(()=>{const m=__motionTest.motion,a=__test;let seed=123;m.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);const d=__peachPhysicsDebug.snapshot(),scale=d.framing.width/d.image[0];const step=()=>{testClock+=1000/120;m.tick(1/120);a.step(1/120);};
 m.setAuto(false);m.setShake(false);a.reset();m.setAuto(true);let peak=0,speedPeak=0,windowPeak=0;const windows=[];
 for(let i=0;i<120*30;i++){step();peak=Math.max(peak,...a.nodes.map(n=>Math.hypot(n.dx,n.dy)));const speed=Math.max(...a.nodes.map(n=>Math.hypot(n.vx,n.vy)))*scale;speedPeak=Math.max(speedPeak,speed);if(i>=360){windowPeak=Math.max(windowPeak,speed);if(i%60===59){windows.push(windowPeak);windowPeak=0;}}}
 m.setAuto(false);const shake=[];
 for(const axis of ['x','y','z']){a.reset();m.setShake(true);for(let i=0;i<150;i++)step();let peak=0;for(let i=0;i<120*4;i++){if(i%2===0)m.sample({acceleration:{x:0,y:0,z:0,[axis]:.8*Math.sin(i/120*Math.PI*3.2)}},testClock);step();peak=Math.max(peak,...a.nodes.map(n=>Math.hypot(n.dx,n.dy)));}shake.push({axis,nodePeak:peak,cssPeak:peak*scale});m.setShake(false);}
 return {autoNodePeak:peak,autoCssPeak:peak*scale,autoSpeedPeakCss:speedPeak,minHalfSecondSpeedPeakCss:Math.min(...windows),quietWindows:windows.filter(s=>s<1).length,windowCount:windows.length,shake};});rows.push({id,preset,revision,renderer:fallback?'canvas':'webgl',...result});
 }await app.context.close();
}
for(const r of rows.filter(r=>r.revision==='r13.3')){const o=rows.find(o=>o.id===r.id&&o.preset===r.preset&&o.renderer===r.renderer&&o.revision==='r13.2');assert.equal(r.quietWindows,0,`${r.id}: no quiet half-second windows`);assert(r.autoCssPeak<8,`${r.id}: subtle Auto range`);assert(Math.abs(r.autoNodePeak/o.autoNodePeak-1.25)<.01,`${r.id}: modest Auto increase`);for(let i=0;i<3;i++){assert(r.shake[i].nodePeak>o.shake[i].nodePeak*1.4,`${r.id} ${r.shake[i].axis}: gentle shake improvement`);assert(r.shake[i].cssPeak>1,`${r.id} ${r.shake[i].axis}: visible gentle response`);}}
const app=await setup(b,{controlled:false});const p=app.page;await p.locator('#gear').tap();await p.locator('#autoMotion').tap();assert(!(await p.locator('#panel').evaluate(e=>e.classList.contains('open'))));await p.waitForFunction(()=>__peachMotionDebug.snapshot().counts.autoSteps>60,null,{timeout:3500});
await p.locator('#gear').tap();await p.locator('#autoMotion').tap();await p.locator('#shakeMotion').tap();await p.waitForFunction(()=>document.querySelector('#motionNotice').textContent.includes('No motion readings'),null,{timeout:4000});assert(await p.locator('#motionNotice').isVisible());
await p.evaluate(async()=>{for(let i=0;i<50;i++){const e=new Event('devicemotion');Object.defineProperty(e,'acceleration',{value:{x:0,y:0,z:.8*Math.sin(i*.2)}});window.dispatchEvent(e);await new Promise(r=>setTimeout(r,20));}});const state=await p.evaluate(()=>__peachMotionDebug.snapshot());assert(state.ui.readings&&state.counts.shakeSteps>0);assert.deepEqual(app.errors,[]);await app.context.close();
fs.writeFileSync(path.join(dir,'evidence/continuous.json'),JSON.stringify({rows,realAnimationLoop:true,touchToggles:true,noReadingsNotice:true,gentleDepthEventsReceived:true},null,2));console.log('60 before/after cases across all presets: continuous Auto, gentle XYZ shake, real animation loop and sensor feedback passed');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});
