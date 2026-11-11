// Targeted checks after capturing: adjacent-feature field and legacy isolation.
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const dir=path.resolve(__dirname,'..'),raw=path.join(dir,'evidence/raw');
const states=JSON.parse(fs.readFileSync(path.join(dir,'../holly-layered/evidence/states.json')));
const main=JSON.parse(fs.readFileSync(path.join(dir,'evidence/measurements.json')));
const points=[[204,495,0],[213,526,0],[220,554,0],[228,580,0],[244,612,0],[613,520,1],[603,557,1],[591,580,1],[568,612,1],[579,460,1]];
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const out={pointDescription:'Centers of photograph-selected adjacent hair/arm boxes from the existing boundary suite. Displacement from the existing CPU inverse-map calculation, not optical flow.',points:[],legacyExactCaptures:0,errors:[]};
 async function open(variant,backend){
  const p=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  p.on('pageerror',e=>out.errors.push(e.message));await p.addInitScript(()=>{requestAnimationFrame=()=>0;testClock=1000;performance.now=()=>testClock;});
  await p.goto('http://127.0.0.1:8000/peach-physics/experiments/holly-artwork-compatibility/'+(variant==='r5'?'r5.html':'index.html')+`?variant=${variant}&backend=${backend}`);
  await p.waitForFunction(()=>__artLab.ready());return p;
 }
 for(const variant of ['r5','r6','simple']){
  const p=await open(variant,'webgl');
  for(const seq of states)for(const phase of ['peak','rebound']){
   await p.evaluate(s=>__artLab.setState(s),seq.phases[phase==='peak'?1:2].state);
   out.points.push({variant,side:seq.side,phase,values:await p.evaluate(points=>__artLab.points(points),points.filter(q=>q[2]===seq.side))});
  }
  await p.close();
 }
 for(const backend of ['webgl','canvas']){
  const p=await open('simple',backend);
  for(const id of ['ember','midnight','aurelia']){
   await p.evaluate(id=>__artLab.chooseCharacter(['ember','midnight','aurelia','holly'].indexOf(id)),id);
   await p.waitForFunction(id=>__artLab.ready()&&__artLab.info().character===id,id);
   await p.evaluate(()=>{document.querySelector('[data-preset="natural"]').click();__artLab.model.transfer=0;});
   for(const side of [0,1])for(const phase of ['peak','rebound']){
    const step=main.study.find(q=>q.backend===backend&&q.id===id&&q.side===side)[phase];
    const data=await p.evaluate(({side,step})=>{__artLab.reset();__artLab.tap(side);for(let i=0;i<step;i++)__artLab.step(1/120);return __artLab.capture();},{side,step});
    assert.deepEqual(Buffer.from(data.split(',')[1],'base64'),fs.readFileSync(path.join(raw,`${backend}-${id}-${side}-${phase}.png`)),`${backend}/${id}/${side}/${phase} unchanged`);out.legacyExactCaptures++;
   }
  }
  await p.close();
 }
 assert.equal(out.errors.length,0);await browser.close();
 fs.writeFileSync(path.join(dir,'evidence/isolation-and-adjacency.json'),JSON.stringify(out,null,2)+'\n');
 console.log(JSON.stringify({legacyExactCaptures:out.legacyExactCaptures,adjacentPoseSamples:out.points.length,errors:out.errors}));
})().catch(e=>{console.error(e);process.exit(1)});
