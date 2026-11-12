// Exact r10 trajectory, artwork and rendered-frame comparisons for all four
// approved characters. Santa is deliberately absent from the baseline.
const {chromium,fs,path,assert,root,out,setup,character,scenario,canvas}=require('./harness.cjs');
const {execFileSync}=require('node:child_process');
const baseline=path.join(out,'santa-r10.html');
fs.writeFileSync(baseline,execFileSync('git',['show','46738952269e3efe7044dfe24df2256d5c240155:peach-physics/v8/index.html'],{cwd:root,maxBuffer:3e6}));
(async()=>{
 let checks=0;const errors=[];
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
 for(const fallback of [false,true]){
  const a=await setup(browser,'v8',{width:390,height:844},true,fallback,false,baseline),b=await setup(browser,'v8',{width:390,height:844},true,fallback);
  for(const id of ['ember','midnight','aurelia','holly']){
   for(const app of [a,b])await character(app.page,id);
   for(const size of [{width:375,height:667},{width:390,height:844},{width:430,height:932},{width:440,height:956},{width:844,height:390}]){
    for(const app of [a,b]){await app.page.setViewportSize(size);await app.page.evaluate(()=>{__test.resize();__test.reset();__test.render();});}
    assert.deepEqual(await a.page.evaluate(()=>__peachPhysicsDebug.snapshot().framing),await b.page.evaluate(()=>__peachPhysicsDebug.snapshot().framing));checks++;
    assert.equal(await canvas(a.page),await canvas(b.page));checks++;
   }
   for(const app of [a,b]){await app.page.setViewportSize({width:390,height:844});await app.page.evaluate(()=>__test.resize());}
   for(const preset of ['natural','playful','chaos']){
    for(const app of [a,b])await app.page.evaluate(p=>document.querySelector(`[data-preset="${p}"]`).click(),preset);
    for(const side of [0,1])for(const kind of ['slap','drag','flick'])for(const link of [0,50,100]){
     assert.deepEqual(await scenario(a.page,kind,side,link),await scenario(b.page,kind,side,link));checks++;
     assert.equal(await canvas(a.page),await canvas(b.page));checks++;
    }
   }
   console.log(`${fallback?'Canvas':'WebGL'} ${id}: exact r10 frames, framing and trajectories`);
  }
  errors.push(...a.errors,...b.errors);await a.context.close();await b.context.close();
 }
 assert.deepEqual(errors,[]);checks++;
 fs.writeFileSync(path.join(out,'santa-regression.json'),JSON.stringify({checks,errors,baseline:'46738952269e3efe7044dfe24df2256d5c240155'},null,2));
 console.log(`${checks} regression checks passed`);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
