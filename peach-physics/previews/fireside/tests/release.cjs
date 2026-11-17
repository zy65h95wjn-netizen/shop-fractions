// Run from the repository with Node, Playwright and Chromium installed.
const {chromium}=require('playwright');
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const {execFileSync}=require('child_process');
const before=execFileSync('git',['show','46fef2ceb254c8244b2d188fbbb77d87166074df:peach-physics/previews/fireside/index.html'],{maxBuffer:2e6}).toString();
const after=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const report={releaseCases:0,unchangedCases:0,flickCases:0,errors:[]};
 try{
  const pages=[];
  for(const html of [before,after]){
   const p=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
   p.on('pageerror',e=>report.errors.push(e.message));
   await p.addInitScript(()=>{window.requestAnimationFrame=()=>0;window.testClock=1000;Object.defineProperty(performance,'now',{value:()=>window.testClock});});
   await p.route('http://localhost/release',r=>r.fulfill({contentType:'text/html',body:html}));
   await p.goto('http://localhost/release');await p.waitForFunction(()=>window.__fireside?.ready(),null,{polling:100});pages.push(p);
  }
  const sample=(p,options)=>p.evaluate(({mode,preset,side,dx,dy,kind})=>{
   const a=__fireside;a.configure({mode,preset,auto:kind==='auto',linked:false});
   const c=document.querySelector('canvas'),r=c.getBoundingClientRect(),[cx,cy]=a.centers[side];
   const pointer=(type,x=cx,y=cy)=>c.dispatchEvent(new PointerEvent(type,{pointerId:7,pointerType:'touch',clientX:r.left+x/961*r.width,clientY:r.top+y/1280*r.height,bubbles:true}));
   const advance=n=>{for(let i=0;i<n;i++)a.step(1/120)};
   testClock=1000;let held;
   if(kind!=='auto'){
    pointer('pointerdown');
    if(kind!=='tap'){
     testClock+=200;pointer('pointermove',cx+dx*40,cy+dy*40);advance(60);held=a.state();
     testClock+=kind==='flick'?16:180;
    }else testClock+=100;
    pointer(kind==='cancel'?'pointercancel':'pointerup');
   }
   const trace=[];for(let i=0;i<600;i++){advance(1);trace.push(a.state().offsets)}
   return{held,trace,holds:a.state().holds};
  },options);
  for(const mode of ['springs','blender'])for(const preset of ['gentle','playful','bold'])for(const side of [0,1]){
   for(const [dx,dy] of [[0,1],[Math.SQRT1_2,Math.SQRT1_2]]){
    const options={mode,preset,side,dx,dy,kind:'drag'};
    const [old,next]=await Promise.all(pages.map(p=>sample(p,options)));
    assert.deepEqual(next.held,old.held,'held/diagonal response unchanged');assert.equal(next.holds,0);
    assert.deepEqual(next.trace.map(s=>s[1-side]),old.trace.map(s=>s[1-side]),'other side independent');
    const project=v=>v[side][0]*dx+v[side][1]*dy;
    const rebound=v=>-Math.min(...v.trace.slice(0,60).map(project));
    const tail=v=>Math.max(...v.trace.slice(90,144).map(s=>Math.abs(project(s))));
    assert(rebound(next)>rebound(old)*1.02&&rebound(next)<rebound(old)*1.15,'slightly fuller first rebound');
    assert(tail(next)<tail(old)*.7,'smaller trailing oscillations');
    assert(next.trace.at(-1).flat().every(v=>Math.abs(v)<.01),'returns to rest');
    report.releaseCases++;
   }
   for(const kind of ['auto','tap','cancel']){
    const options={mode,preset,side,dx:0,dy:1,kind};
    const [old,next]=await Promise.all(pages.map(p=>sample(p,options)));assert.deepEqual(next,old,kind+' unchanged');report.unchangedCases++;
   }
   const next=await sample(pages[1],{mode,preset,side,dx:Math.SQRT1_2,dy:-Math.SQRT1_2,kind:'flick'});
   assert(next.trace.every(s=>s.every(([x,y])=>Number.isFinite(x+y)&&Math.hypot(x,y)<=34.00001)),'flick bounded');
   assert(next.trace.at(-1).flat().every(v=>Math.abs(v)<.01),'flick settles');report.flickCases++;
  }
  assert.deepEqual(report.errors,[]);console.log(JSON.stringify(report,null,2));
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
