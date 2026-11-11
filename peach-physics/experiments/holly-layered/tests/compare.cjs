// Run after build.cjs with a repository-root HTTP server on :8000.
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const dir=path.resolve(__dirname,'..'),out=path.join(dir,'evidence'),raw=path.join(out,'raw');fs.mkdirSync(raw,{recursive:true});
const base=process.env.PEACH_TEST_URL||'http://127.0.0.1:8000';
const sizes=[{width:375,height:667},{width:390,height:844},{width:430,height:932},{width:440,height:956}];
let checks=0;const ok=(v,s)=>{assert.ok(v,s);checks++;};
const results={baseline:'ddf3456cc937c7f84f0b022f76f6824e59c2d079',checks:0,trajectory:[],frames:[],fields:[],rest:[],performance:[],errors:[],limitations:['Missing backing pixels are pink; this is NOT visual acceptance.','Hand-traced alpha is provisional; hair/fur tips need authored mattes.','Desktop Chromium/SwiftShader is not physical-iPhone validation.']};
async function open(b,version,size,backend,layered=false){
 const p=await b.newPage({viewport:size,deviceScaleFactor:2,isMobile:true,hasTouch:true});p.on('pageerror',e=>results.errors.push(e.message));
 await p.addInitScript(()=>{requestAnimationFrame=()=>0;window.testClock=1000;performance.now=()=>window.testClock;});
 await p.goto(`${base}/peach-physics/experiments/holly-layered/${version}.html?backend=${backend}${layered?'&mode=layered':''}`);
 await p.waitForFunction(()=>window.__hollyLab?.ready());
 await p.addStyleTag({content:'#loader,#hint,#characterToast,.slap-burst,#pulse,#labBack{display:none!important}'});
 await p.evaluate(()=>{document.querySelector('[data-preset="natural"]').click();__hollyLab.reset();__hollyLab.model.transfer=0;__hollyLab.render();});
 return p;
}
async function save(p,name){const url=await p.evaluate(()=>__hollyLab.capture());fs.writeFileSync(path.join(raw,name+'.png'),Buffer.from(url.split(',')[1],'base64'));}
async function pixels(p){const encoded=await p.evaluate(()=>{__hollyLab.render();const s=__hollyLab.renderer?.canvas||document.querySelector('#game'),c=document.createElement('canvas');c.width=s.width;c.height=s.height;const ctx=c.getContext('2d');ctx.drawImage(s,0,0);const bytes=ctx.getImageData(0,0,c.width,c.height).data;let text='';for(let i=0;i<bytes.length;i+=32768)text+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(text);});return Buffer.from(encoded,'base64');}
async function gesture(p,kind,side,link,green=false,preset='natural'){
 return p.evaluate(({kind,side,link,green,preset})=>{
  const t=__hollyLab;t.reset();document.querySelector(`[data-preset="${preset}"]`).click();t.model.transfer=link;window.testClock=1000;
  const f=__peachPhysicsDebug.snapshot().framing,point=green?(side?[580,630]:[220,630]):(side?[481,484]:[337,477]);
  const x=f.x+point[0]/720*f.width,y=f.y+point[1]/1280*f.height,c=document.querySelector('#game');
  const fire=(type,dx=0,dy=0)=>c.dispatchEvent(new PointerEvent(type,{pointerId:11,pointerType:'touch',clientX:x+dx,clientY:y+dy,pressure:.5,bubbles:true}));
  fire('pointerdown');window.testClock+=30;
  if(kind!=='tap'){fire('pointermove',12,14);window.testClock+=20;fire('pointermove',24,28);}
  if(kind!=='drag'){window.testClock+=20;fire('pointerup',kind==='tap'?0:24,kind==='tap'?0:28);}
  const trace=[];for(let i=0;i<180;i++){t.step(1/120);if(i%6===0)trace.push(t.raw());}
  if(kind==='drag'){window.testClock+=250;fire('pointerup',24,28);}
  return trace;
 },{kind,side,link,green,preset});
}
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 results.browser=await browser.version();
 // Check actual input dispatch and exact unrounded states. No visual-motion
 // threshold is used to bless the perimeter or the generated renderer.
 const reference=await open(browser,'r6',sizes[1],'webgl'),candidate=await open(browser,'r6',sizes[1],'webgl',true);
 for(const preset of ['natural','playful','chaos'])for(const side of [0,1])for(const link of [0,50,100])for(const kind of ['tap','drag','flick'])for(const green of [false,true]){
  const a=await gesture(reference,kind,side,link,green,preset),b=await gesture(candidate,kind,side,link,green,preset);
  assert.deepEqual(b,a,`${preset}/${side}/${link}/${kind}/${green}`);checks++;results.trajectory.push({preset,side,link,kind,green,exact:true});
 }
 console.log('Input/trajectory equivalence:',checks);
 // Independent side remains still at link 0, and transfer develops at 50/100.
 for(const link of [0,50,100]){const trace=await gesture(candidate,'tap',0,link,true),peak=Math.max(...trace.flatMap(s=>s.nodes.filter(n=>n.side===1).map(n=>Math.hypot(n.dx,n.dy))));ok(link===0?peak===0:peak>0,`link ${link}`);}
 // Two simultaneous marked touch targets retain independent capture.
 const touch=await candidate.evaluate(()=>{
  __hollyLab.reset();const f=__peachPhysicsDebug.snapshot().framing,c=document.querySelector('#game');
  [[220,630],[580,630]].forEach(([x,y],i)=>c.dispatchEvent(new PointerEvent('pointerdown',{pointerId:20+i,pointerType:'touch',clientX:f.x+x/720*f.width,clientY:f.y+y/1280*f.height,pressure:.5,bubbles:true})));
  const sides=__peachPhysicsDebug.snapshot().activePointers.map(p=>p.side);__hollyLab.reset();return sides;
 });assert.deepEqual(touch,[0,1]);checks++;
 // Generate one authoritative state sequence for all three renderers/sizes.
 const sequences=await reference.evaluate(()=>[0,1].map(side=>{
  const t=__hollyLab;t.reset();document.querySelector('[data-preset="natural"]').click();t.model.transfer=0;
  const rest=t.raw();t.tap(side);const states=[t.raw()];for(let i=1;i<=960;i++){t.step(1/120);states.push(t.raw());}
  let peak=0;for(let i=0;i<90;i++)if(Math.abs(states[i].nodes[side*3+1].dy)>Math.abs(states[peak].nodes[side*3+1].dy))peak=i;
  const sign=Math.sign(states[peak].nodes[side*3+1].dy);let rebound=peak;
  for(let i=peak+1;i<180;i++)if(states[i].nodes[side*3+1].dy*sign<states[rebound].nodes[side*3+1].dy*sign)rebound=i;
  return {side,rest,states,peak,rebound};
 }));
 fs.writeFileSync(path.join(out,'states.json'),JSON.stringify(sequences.map(s=>({side:s.side,peakStep:s.peak,reboundStep:s.rebound,dt:1/120,rest:s.rest,phases:[0,s.peak,s.rebound,960].map(i=>({step:i,state:s.states[i]})),movie:Array.from({length:46},(_,i)=>({step:i*4,state:s.states[i*4]}))}))));
 await reference.close();await candidate.close();
 for(const backend of (process.env.PEACH_TEST_BACKENDS||'webgl,canvas').split(','))for(const size of sizes){
  console.log('Capturing',backend,size.width);
  const pages=[];
  for(const label of ['r5','r6','layered'])pages.push(await open(browser,label==='r5'?'r5':'r6',size,backend,label==='layered'));
  const restArrays=[];
  for(let r=0;r<pages.length;r++){
   const p=pages[r],label=['r5','r6','layered'][r];restArrays.push(await pixels(p));
   await save(p,`${backend}-${size.width}-${label}-rest`);
   ok((await p.evaluate(()=>__hollyLab.info())).backend===backend,'requested backend active');
   const timing=[];
   for(const seq of sequences){
    const phases=[['impact',0],['peak',seq.peak],['rebound',seq.rebound],['settled',960]];
    for(const [phase,step] of phases){
     await p.evaluate(s=>__hollyLab.setState(s),seq.states[step]);
     await save(p,`${backend}-${size.width}-${label}-${seq.side}-${phase}`);
     results.frames.push({backend,width:size.width,label,side:seq.side,phase,step,time:step/120});
     if(label==='layered'&&phase!=='settled'){
      const metric=await p.evaluate(()=>__hollyLab.renderer.metrics());ok(metric.minDet>0,'sampled inverse map has no folds');results.fields.push({backend,width:size.width,side:seq.side,phase,...metric});
     }
    }
    if(size.width===390){
     for(let frame=0;frame<=45;frame++){
      timing.push(await p.evaluate(s=>{const start=Date.now();__hollyLab.setState(s);return Date.now()-start;},seq.states[frame*4]));
      await save(p,`movie-${backend}-${label}-${seq.side}-${String(frame).padStart(3,'0')}`);
     }
    }
   }
   await p.evaluate(()=>{__hollyLab.reset();__hollyLab.render();});
   const after=await pixels(p);ok(after.every((v,i)=>v===restArrays[r][i]),`${backend}/${size.width}/${label} exact reset`);
   if(timing.length){timing.sort((a,b)=>a-b);results.performance.push({backend,label,width:size.width,frames:timing.length,medianMs:timing[Math.floor(timing.length*.5)],p95Ms:timing[Math.floor(timing.length*.95)],maxMs:timing.at(-1)});}
  }
  const a=restArrays[1],b=restArrays[2];let changed=0,max=0,sum=0;
  for(let i=0;i<a.length;i++){const d=Math.abs(a[i]-b[i]);if(d)changed++;max=Math.max(max,d);sum+=d;}
  results.rest.push({backend,width:size.width,changedChannels:changed,maxChannelDifference:max,meanChannelDifference:sum/a.length});
  ok(max<=2,`${backend}/${size.width} resting image matches r6 within texture-sampling rounding`);
  // Fixed source features outside any possible new occlusion, selected on photo.
  const fixed=[[176,520],[648,525],[191,575],[612,590],[400,680],[300,700],[335,300]];
  const p=pages[2];
  for(const side of [0,1])for(const [x,y] of [[26,30],[-26,-30],[26,-30],[-26,30]]){
   await p.evaluate(({x,y,side})=>__hollyLab.pose(x,y,side),{x,y,side});
   const data=await pixels(p),fr=await p.evaluate(()=>__peachPhysicsDebug.snapshot().framing);
   for(const [px,py] of fixed){const sx=Math.round((fr.x+px/720*fr.width)*2),sy=Math.round((fr.y+py/1280*fr.height)*2),at=(sy*size.width*2+sx)*4;ok([0,1,2].every(k=>data[at+k]===b[at+k]),'stationary hair/arm/clothing/scenery sample');}
   const m=await p.evaluate(()=>__hollyLab.renderer.metrics());ok(m.minDet>0,'extreme field no sampled fold');results.fields.push({backend,width:size.width,side,pose:[x,y],...m});
  }
  for(const p of pages)await p.close();
 }
 // Field vectors and material ownership at the same right-side peak.
 const field=await open(browser,'r6',sizes[1],'webgl',true);
 const fieldData=await field.evaluate(s=>{
  __hollyLab.setState(s);const r=__hollyLab.renderer,g=HollyLayers.geometry,vectors=[];let missingArea=0,maxMissingRun=0;
  for(let y=360;y<670;y++){
   let run=0;for(let x=170;x<646;x++){
    const a=g.alpha(0,x,y)+g.alpha(1,x,y),l=r.map(0,x,y),q=r.map(1,x,y),m=Math.max(0,a-g.alpha(0,...l)-g.alpha(1,...q));
    if(m>.5){missingArea++;run++;maxMissingRun=Math.max(maxMissingRun,run);}else run=0;
   }
  }
  for(let y=370;y<670;y+=12)for(let x=180;x<640;x+=12){const side=x<414?0:1,q=r.map(side,x,y);vectors.push({x,y,dx:x-q[0],dy:y-q[1],side,material:g.alpha(side,x,y),support:g.support(side,x,y)});}
  return {vectors,edges:g.edges,missingAreaSourcePixels:missingArea,maxHorizontalMissingRunSourcePixels:maxMissingRun,metrics:r.metrics()};
 },sequences[1].states[sequences[1].peak]);
 fs.writeFileSync(path.join(out,'field.json'),JSON.stringify(fieldData));
 await field.close();
 ok(results.errors.length===0,'no browser exceptions');results.checks=checks;
 if(process.env.PEACH_WEBGL_CHECKPOINT){
  const prior=JSON.parse(fs.readFileSync(process.env.PEACH_WEBGL_CHECKPOINT));
  for(const key of ['frames','fields','rest','performance'])results[key]=[...prior[key].filter(r=>r.backend==='webgl'),...results[key]];
  results.reusedWebGLValidation='Completed WebGL matrix retained; only Canvas sampling was changed. checks counts the final Canvas run and shared checks.';
 }
 fs.writeFileSync(path.join(out,'metrics.json'),JSON.stringify(results,null,2));console.log(JSON.stringify({checks,rest:results.rest,performance:results.performance,output:out},null,2));await browser.close();
})().catch(e=>{console.error(e);fs.writeFileSync(path.join(out,'incomplete.json'),JSON.stringify(results,null,2));process.exit(1)});
