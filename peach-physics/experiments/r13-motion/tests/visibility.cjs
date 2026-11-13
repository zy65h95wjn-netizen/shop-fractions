// Regression for the first iPhone report: a nonzero spring value was not enough.
const {chromium,setup,select,assert,fs,path,dir}=require('./fixtures.cjs');
const {execFileSync}=require('node:child_process');
(async()=>{const oldPath='/tmp/r13-original-motion.js';fs.writeFileSync(oldPath,execFileSync('git',['show','556a971:peach-physics/experiments/r13-motion/motion.js'],{cwd:dir}));
const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});const rows=[];try{
for(const fallback of [false,true])for(const revision of ['original','revised']){
 const app=await setup(b,{fallback,motionSource:revision==='original'?oldPath:null});
 for(const id of ['ember','midnight','aurelia','holly','santa']){await select(app.page,id);
 const result=await app.page.evaluate(()=>{const m=__motionTest.motion,a=__test; m.setAuto(false);m.setShake(false);a.reset();m.random=()=>.5;const count=m.counts.autoPulses;m.setAuto(true);let first=null,peak=0;for(let i=0;i<120*12;i++){m.tick(1/120);a.step(1/120);if(first===null&&m.counts.autoPulses>count)first=i/120;peak=Math.max(peak,...a.nodes.map(n=>Math.hypot(n.dx,n.dy)));}
 m.setAuto(false);a.reset();m.setShake(true);for(let i=0;i<150;i++){m.tick(1/120);a.step(1/120);}let depthPeak=0;for(let i=0;i<240;i++){testClock+=1000/120;if(i%2===0)m.sample({acceleration:{x:0,y:0,z:6*Math.sin(i/120*Math.PI*4)}},testClock);m.tick(1/120);a.step(1/120);depthPeak=Math.max(depthPeak,...a.nodes.map(n=>Math.hypot(n.dx,n.dy)));}
 const d=__peachPhysicsDebug.snapshot();return {firstAutoSeconds:first,autoNodePeak:peak,autoNodePeakCss:peak*d.framing.width/d.image[0],depthNodePeak:depthPeak};});rows.push({id,revision,renderer:fallback?'canvas':'webgl',...result});
 }await app.context.close();
}
for(const r of rows.filter(r=>r.revision==='revised')){const o=rows.find(o=>o.id===r.id&&o.renderer===r.renderer&&o.revision==='original');assert(r.firstAutoSeconds<2.1&&o.firstAutoSeconds>5);assert(r.autoNodePeakCss>1);assert(r.autoNodePeak>o.autoNodePeak*1.5);assert(r.depthNodePeak>1&&o.depthNodePeak===0);}
const app=await setup(b,{controlled:false});const p=app.page;await p.locator('#gear').tap();await p.locator('#autoMotion').tap();assert(!(await p.locator('#panel').evaluate(e=>e.classList.contains('open'))));await p.waitForFunction(()=>__peachMotionDebug.snapshot().counts.autoPulses>0,null,{timeout:3500});
await p.locator('#gear').tap();await p.locator('#autoMotion').tap();await p.locator('#shakeMotion').tap();await p.waitForFunction(()=>document.querySelector('#motionNotice').textContent.includes('No motion readings'),null,{timeout:4000});assert(await p.locator('#motionNotice').isVisible());
await p.evaluate(async()=>{for(let i=0;i<50;i++){const e=new Event('devicemotion');Object.defineProperty(e,'acceleration',{value:{x:0,y:0,z:6*Math.sin(i*.2)}});window.dispatchEvent(e);await new Promise(r=>setTimeout(r,20));}});const state=await p.evaluate(()=>__peachMotionDebug.snapshot());assert(state.ui.readings&&state.counts.shakeSteps>0);assert((await p.locator('#motionNotice').textContent()).includes('Motion ready'));assert.deepEqual(app.errors,[]);await app.context.close();
fs.writeFileSync(path.join(dir,'evidence/visibility.json'),JSON.stringify({rows,realAnimationLoop:true,touchToggles:true,autoClosesPanel:true,noReadingsNotice:true,depthEventsReceived:true},null,2));console.log('20 before/after cases, real animation-loop auto, touch toggles, no-readings notice and depth events passed');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});
