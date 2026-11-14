const h=require('../../../v8/tests/harness.cjs');
const crypto=require('node:crypto');
const preview='experiments/r14-holly-laugh',baseDir=h.path.join(h.root,'peach-physics/v8'),dir=h.path.join(h.root,'peach-physics',preview);
let checks=0;const results=[];
const equal=(a,b,label)=>{h.assert.deepEqual(a,b,label);checks++;};
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
for(const f of ['motion.js','assets/holly-heartbreaker.png','assets/aurelia-frost.jpg','assets/santa-claus.jpg','apple-touch-icon.png'])equal(sha(h.fs.readFileSync(h.path.join(dir,f))),sha(h.fs.readFileSync(h.path.join(baseDir,f))),f+' source bytes');
equal(sha(h.fs.readFileSync(h.path.join(dir,'assets/holly-heartbreaker.png'))),'f7267c4f7624ea17d2215251e0bdf63d3e1cbc59bb33e3b9bcaca7f81b486a58','approved Holly hash');
const main=h.fs.readFileSync(h.path.join(baseDir,'index.html'),'utf8'),html=h.fs.readFileSync(h.path.join(dir,'index.html'),'utf8');
for(const [start,end] of [['const CHARACTERS=','const CHARACTER_KEY='],['const MIDNIGHT_LEFT_CONTOUR=','// Profiles are separate'],['function step(','function loop('],['function fallbackRect(','function impulse('],['function slapSound(){','function slap(side'],['function stopSantaLaugh(){','function initGL(){']]){
 const section=s=>{const a=s.indexOf(start),b=s.indexOf(end,a+start.length);h.assert(a>=0&&b>a,[start,end]);return s.slice(a,b);};
 equal(section(html),section(main),start+' byte-identical');
}
const extra='window.__motionTest=motion;\npresentCharacter();\ngetPhoto';
const src={};for(const [key,content] of [['baseline',main],['preview',html]]){src[key]='/tmp/holly-'+key+'.html';h.fs.writeFileSync(src[key],content.replace('presentCharacter();\ngetPhoto',extra));}
(async()=>{
 const browser=await h.chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
 for(const fallback of [false,true]){
  const a=await h.setup(browser,'v8',{width:390,height:844},true,fallback,false,src.baseline),b=await h.setup(browser,preview,{width:390,height:844},true,fallback,false,src.preview);
  for(let index=0;index<5;index++){
   for(const x of [a,b]){await x.page.evaluate(i=>__test.chooseCharacter(i),index);await x.page.waitForFunction(i=>__peachPhysicsDebug.snapshot().character===['ember','midnight','aurelia','holly','santa'][i],index);await x.page.evaluate(()=>{__test.resize();__test.reset();__test.render();});}
   const char=await b.page.evaluate(()=>__peachPhysicsDebug.snapshot().character);
   for(const transfer of [0,50,100])for(const gesture of ['slap','drag','flick'])for(const side of [0,1]){
    equal(await h.scenario(b.page,gesture,side,transfer),await h.scenario(a.page,gesture,side,transfer),`${char} ${fallback?'canvas':'webgl'} ${gesture}/${side}/${transfer} trajectory`);
   }
   for(const mode of ['auto','shake']){
    const run=p=>p.evaluate(mode=>{
     __test.reset();const m=__motionTest;let seed=123456;m.random=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
     m.setAuto(mode==='auto');m.setShake(mode==='shake');m.time=0;m.quietUntil=0;m.lastCharacter=__test.currentCharacter().id;
     const trace=[];for(let i=0;i<600;i++){if(mode==='shake'&&i%2===0)m.sample({acceleration:{x:Math.sin(i*.1)*8,y:Math.cos(i*.15)*8,z:1}},10000+i*1000/120);m.tick(1/120);__test.step(1/120);if(i%20===0)trace.push(__test.raw());}__test.render();return trace;
    },mode);
    equal(await run(b.page),await run(a.page),char+' '+mode+' trajectory');
    equal(sha(await h.canvas(b.page)),sha(await h.canvas(a.page)),char+' '+mode+' rendered frame');
   }
   results.push({character:char,renderer:fallback?'canvas':'webgl',manualTrajectories:18,motionTrajectories:2,identicalFrames:2});
  }
  for(const size of [{width:375,height:667},{width:390,height:844},{width:430,height:932}]){
   for(const x of [a,b]){await x.page.evaluate(()=>__test.chooseCharacter(3));await x.page.waitForFunction(()=>__peachPhysicsDebug.snapshot().character==='holly');await x.page.setViewportSize(size);await x.page.evaluate(()=>{__test.resize();__test.reset();__test.render();});}
   equal(await b.page.evaluate(()=>__peachPhysicsDebug.snapshot().framing),await a.page.evaluate(()=>__peachPhysicsDebug.snapshot().framing),'framing '+JSON.stringify(size));
   equal(sha(await h.canvas(b.page)),sha(await h.canvas(a.page)),'rest frame '+JSON.stringify(size));
   if(size.width===390)await b.page.waitForTimeout(1450);
   if(size.width===390)await b.page.screenshot({path:h.path.join(dir,'tests','holly-'+(fallback?'canvas':'webgl')+'.png')});
  }
  equal(a.errors,[],'baseline page errors');equal(b.errors,[],'preview page errors');await a.context.close();await b.context.close();
 }
 const report={baseline:'2adb9257532ac3b17e39aeea815a23f5fb7f85ce',checks,results,passed:true};h.fs.writeFileSync(h.path.join(dir,'tests/preservation.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
