const {chromium,setup,select,assert,fs,path,dir}=require('./fixtures.cjs');
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});const report={permissions:[],characters:[],regressions:[],errors:[]};try{
for(const variant of [{permission:'denied'},{permission:'error'},{supported:false}]){const app=await setup(b,variant);await app.page.locator('#gear').click();if(variant.supported===false)assert(await app.page.locator('#shakeMotion').isDisabled());else await app.page.locator('#shakeMotion').click();const state=await app.page.evaluate(()=>__peachMotionDebug.snapshot());assert(!state.shake&&!state.ui.listening);report.permissions.push({...variant,state});await app.context.close();}
for(const fallback of [false,true]){
 const app=await setup(b,{fallback}),old=await setup(b,{fallback,baseline:true}),p=app.page;
 const defaults=await p.evaluate(()=>__peachMotionDebug.snapshot());assert(!defaults.shake&&!defaults.auto);assert.equal(await p.evaluate(()=>motionPermissionCalls),0);
 for(const id of ['ember','midnight','aurelia','holly','santa']){
  for(const page of [p,old.page])await select(page,id);
  for(const preset of ['natural','playful','chaos'])for(const kind of ['kick','drag','flick']){
   const simulate=page=>page.evaluate(({preset,kind})=>{document.querySelector(`[data-preset="${preset}"]`).click();__test.reset();__test.gesture(kind,0);const trace=[];for(let i=0;i<120;i++){window.__motionTest?.motion.tick(1/120);__test.step(1/120);if(i%12===0)trace.push(__test.raw());}__test.render();return {trace,pixels:document.querySelector('#game').toDataURL()};},{preset,kind});
   assert.deepEqual(await simulate(p),await simulate(old.page));report.regressions.push({id,preset,kind,renderer:fallback?'canvas':'webgl'});
  }
 }
 await p.evaluate(()=>__test.reset());await p.locator('#gear').click();await p.locator('#shakeMotion').click();assert(await p.evaluate(()=>motionPermissionGesture));assert.equal(await p.evaluate(()=>motionPermissionCalls),1);await p.locator('#close').click();
 for(const id of ['ember','midnight','aurelia','holly','santa']){
  await select(p,id);
  const r=await p.evaluate(()=>{const a=__test,m=__motionTest.motion;a.model.transfer=0;const step=()=>{testClock+=1000/120;m.tick(1/120);a.step(1/120);};for(let i=0;i<150;i++)step();const rest=(()=>{a.render();return document.querySelector('#game').toDataURL()})();
   let max=0;for(let i=0;i<96;i++){if(i%2===0){const e=new Event('devicemotion');Object.defineProperty(e,'acceleration',{value:{x:i<48?6:-6,y:2,z:0}});window.dispatchEvent(e);}step();max=Math.max(max,...a.nodes.map(n=>Math.hypot(n.dx,n.dy)));}a.render();const changed=document.querySelector('#game').toDataURL()!==rest;const counts=m.counts.shakeSteps;
   for(let i=0;i<3600;i++)step();a.render();const returned=document.querySelector('#game').toDataURL()===rest;
   a.gesture('drag',0);const before=m.counts.shakeSteps;for(let i=0;i<240;i++){const e=new Event('devicemotion');Object.defineProperty(e,'acceleration',{value:{x:20,y:20}});window.dispatchEvent(e);step();}const blocked=m.counts.shakeSteps===before;a.reset();return {max,changed,returned,counts,blocked,audio:__peachPhysicsDebug.snapshot().slapCount};});
  assert(r.max>0&&r.changed&&r.returned&&r.blocked);report.characters.push({id,renderer:fallback?'canvas':'webgl',...r});
 }
 await p.locator('#gear').click();await p.locator('#autoMotion').click();await p.locator('#close').click();
 const auto=await p.evaluate(()=>{__test.reset();const m=__motionTest.motion;for(let i=0;i<120*40;i++){testClock+=1000/120;m.tick(1/120);__test.step(1/120);}const before=m.counts.autoPulses;Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));for(let i=0;i<120*30;i++)m.tick(1/120);const after=m.counts.autoPulses,state=__peachMotionDebug.snapshot();Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));return {before,after,state};});assert(auto.before>0);assert.equal(auto.after,auto.before);assert(!auto.state.ui.listening);report.permissions.push({renderer:fallback?'canvas':'webgl',hidden:auto});
 const storageBefore=await p.evaluate(()=>Object.fromEntries(Object.entries(localStorage).filter(([k])=>k!=='peach-r13-motion-options-v1')));await p.reload();await p.waitForFunction(()=>window.__motionTest&&document.querySelector('#loader').classList.contains('hiding'));const saved=await p.evaluate(()=>__peachMotionDebug.snapshot());assert(saved.auto&&saved.ui.saved.shake&&!saved.shake&&!saved.ui.listening);assert.equal(await p.evaluate(()=>motionPermissionCalls),0);assert.deepEqual(await p.evaluate(()=>Object.fromEntries(Object.entries(localStorage).filter(([k])=>k!=='peach-r13-motion-options-v1'))),storageBefore);
 report.errors.push(...app.errors,...old.errors);await app.context.close();await old.context.close();
}assert.deepEqual(report.errors,[]);fs.writeFileSync(path.join(dir,'evidence/browser.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({regressionCases:report.regressions.length,motionCases:report.characters.length,permissions:report.permissions.length,errors:report.errors}));}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});
