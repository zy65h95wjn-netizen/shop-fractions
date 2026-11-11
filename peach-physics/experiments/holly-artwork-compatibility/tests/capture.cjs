// Matched visual feasibility first. No numerical visual-acceptance threshold.
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const dir=path.resolve(__dirname,'..'),raw=path.join(dir,'evidence/raw');fs.mkdirSync(raw,{recursive:true});
const base='http://127.0.0.1:8000/peach-physics/experiments/holly-artwork-compatibility/';
const states=JSON.parse(fs.readFileSync(path.join(dir,'../holly-layered/evidence/states.json')));
const variants=['r5','r6','simple'];
const report={reference:'b7b5a2ba1c3784a8d9b5f9423405e6de8d954f2b',viewport:{width:390,height:844,dpr:2},variants,errors:[],poses:[],study:[],inputChecks:0,resetChecks:0,notVisualAcceptance:true};
const points=[[337,477,0],[227,500,0],[229,566,0],[305,614,0],[208,497,0],[192,545,0],[481,484,1],[597,520,1],[573,590,1],[510,618,1],[610,518,1],[620,570,1]];
async function open(browser,variant,backend){
 const p=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
 p.on('pageerror',e=>report.errors.push(e.message));
 await p.addInitScript(()=>{requestAnimationFrame=()=>0;window.testClock=1000;performance.now=()=>testClock;});
 await p.goto(base+(variant==='r5'?'r5.html':'index.html')+`?variant=${variant}&backend=${backend}`);
 await p.waitForFunction(()=>window.__artLab?.ready());
 await p.evaluate(()=>{document.querySelector('[data-preset="natural"]').click();__artLab.reset();__artLab.model.transfer=0;__artLab.render();});
 assert.equal((await p.evaluate(()=>__artLab.info())).backend,backend);
 return p;
}
async function save(p,name){
 const data=await p.evaluate(()=>__artLab.capture());fs.writeFileSync(path.join(raw,name+'.png'),Buffer.from(data.split(',')[1],'base64'));
}
async function gesture(p,preset,side,link,kind,green){
 return p.evaluate(({preset,side,link,kind,green})=>{
  const t=__artLab;t.reset();document.querySelector(`[data-preset="${preset}"]`).click();t.model.transfer=link;testClock=1000;
  const f=t.info().framing,point=green?(side?[580,630]:[220,630]):(side?[481,484]:[337,477]);
  const x=f.x+point[0]/720*f.width,y=f.y+point[1]/1280*f.height,c=document.querySelector('#game');
  const fire=(type,dx=0,dy=0)=>c.dispatchEvent(new PointerEvent(type,{pointerId:11,pointerType:'touch',clientX:x+dx,clientY:y+dy,pressure:.5,bubbles:true}));
  fire('pointerdown');testClock+=30;
  if(kind!=='tap'){fire('pointermove',12,14);testClock+=20;fire('pointermove',24,28);}
  if(kind!=='drag'){testClock+=20;fire('pointerup',kind==='tap'?0:24,kind==='tap'?0:28);}
  const trace=[];for(let i=0;i<180;i++){t.step(1/120);if(i%6===0)trace.push(t.raw());}
  if(kind==='drag'){testClock+=250;fire('pointerup',24,28);}
  return trace;
 },{preset,side,link,kind,green});
}
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 report.browser=await browser.version();
 for(const backend of ['webgl','canvas']){
  for(const variant of variants){
   console.log('Holly',backend,variant);
   const p=await open(browser,variant,backend),info=await p.evaluate(()=>__artLab.info());
   await save(p,`${backend}-${variant}-rest`);
   const mask=await p.evaluate(()=>__artLab.mask());
   fs.writeFileSync(path.join(raw,`mask-${variant}.json`),JSON.stringify(mask));
   const [,,w,h]=mask.box,border=[];for(let x=0;x<w;x++)border.push(mask.pixels[x],mask.pixels[(h-1)*w+x]);for(let y=0;y<h;y++)border.push(mask.pixels[y*w],mask.pixels[y*w+w-1]);
   assert.equal(Math.max(...border),0,'zero raster-mask border prevents clamp leakage');
   for(const seq of states){
    const phases=[['impact',seq.phases[0]],['loading',seq.movie[2]],['peak',seq.phases[1]],['return',seq.movie[6]],['rebound',seq.phases[2]],['settled',seq.phases[3]]];
    for(const [phase,pose] of phases){
     await p.evaluate(s=>__artLab.setState(s),pose.state);
     assert.deepEqual(await p.evaluate(()=>__artLab.raw()),pose.state);
     await save(p,`${backend}-${variant}-${seq.side}-${phase}`);
     report.poses.push({backend,variant,side:seq.side,phase,step:pose.step,framing:info.framing,points:await p.evaluate(q=>__artLab.points(q),points)});
    }
   }
   await p.evaluate(()=>{__artLab.reset();__artLab.render();});await save(p,`${backend}-${variant}-reset`);
   assert.deepEqual(fs.readFileSync(path.join(raw,`${backend}-${variant}-reset.png`)),fs.readFileSync(path.join(raw,`${backend}-${variant}-rest.png`)));report.resetChecks++;
   await p.close();
  }
  // Observe each accepted character using its own unchanged Natural response.
  const p=await open(browser,'r6',backend);
  for(const id of ['ember','midnight','aurelia']){
   await p.evaluate(id=>__artLab.chooseCharacter(['ember','midnight','aurelia','holly'].indexOf(id)),id);
   await p.waitForFunction(id=>__artLab.ready()&&__artLab.info().character===id,id);
   await p.evaluate(()=>{document.querySelector('[data-preset="natural"]').click();__artLab.reset();__artLab.model.transfer=0;__artLab.render();});
   const info=await p.evaluate(()=>__artLab.info()),mask=await p.evaluate(()=>__artLab.mask());
   fs.writeFileSync(path.join(raw,`mask-${id}.json`),JSON.stringify(mask));
   await save(p,`${backend}-${id}-rest`);
   for(const side of [0,1]){
    const sequence=await p.evaluate(side=>{
     const t=__artLab;t.reset();t.tap(side);const states=[t.raw()];for(let i=1;i<=960;i++){t.step(1/120);states.push(t.raw());}
     let peak=0;for(let i=0;i<90;i++)if(Math.abs(states[i].nodes[side*3+1].dy)>Math.abs(states[peak].nodes[side*3+1].dy))peak=i;
     const sign=Math.sign(states[peak].nodes[side*3+1].dy);let rebound=peak;
     for(let i=peak+1;i<180;i++)if(states[i].nodes[side*3+1].dy*sign<states[rebound].nodes[side*3+1].dy*sign)rebound=i;
     return {peak,rebound,poses:[0,peak,rebound,960].map(step=>({step,state:states[step]}))};
    },side);
    report.study.push({backend,id,side,info,peak:sequence.peak,rebound:sequence.rebound});
    for(let i=0;i<4;i++){await p.evaluate(s=>__artLab.setState(s),sequence.poses[i].state);await save(p,`${backend}-${id}-${side}-${['impact','peak','rebound','settled'][i]}`);}
   }
  }
  await p.close();
 }
 // Rendering-mask edits must not change accepted input targets or trajectories.
 const reference=await open(browser,'r6','webgl');
 for(const variant of ['simple']){
  const p=await open(browser,variant,'webgl');
  for(const preset of ['natural','playful','chaos'])for(const side of [0,1])for(const link of [0,50,100])for(const kind of ['tap','drag','flick'])for(const green of [false,true]){
   assert.deepEqual(await gesture(p,preset,side,link,kind,green),await gesture(reference,preset,side,link,kind,green),`${variant}/${preset}/${side}/${link}/${kind}/${green}`);report.inputChecks++;
  }
  await p.close();
 }
 await reference.close();assert.equal(report.errors.length,0);
 fs.writeFileSync(path.join(dir,'evidence/measurements.json'),JSON.stringify(report,null,2)+'\n');
 await browser.close();console.log(JSON.stringify({inputChecks:report.inputChecks,resetChecks:report.resetChecks,poses:report.poses.length,studyPoses:report.study.length,errors:report.errors}));
})().catch(e=>{console.error(e);fs.writeFileSync(path.join(raw,'incomplete.json'),JSON.stringify(report,null,2));process.exit(1)});
