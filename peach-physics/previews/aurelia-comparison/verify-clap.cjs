const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('assert/strict'),{execFileSync}=require('child_process');
const old=execFileSync('git',['show','af77a2566d499c7ab7dfd8713488b6892627534e:peach-physics/previews/aurelia-comparison/index.html'],{maxBuffer:2e6}).toString();
const current=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});try{
 const pages=[];for(const html of [old,current]){
  const p=await b.newPage({viewport:{width:390,height:844}});
  await p.addInitScript(()=>{const raf=requestAnimationFrame;window.requestAnimationFrame=f=>raf(t=>{if(!window.paused)f(t)});window.clock=1000;Object.defineProperty(performance,'now',{value:()=>clock})});
  await p.route('http://localhost/clap',r=>r.fulfill({contentType:'text/html',body:html}));await p.goto('http://localhost/clap');await p.waitForFunction(()=>window.__aureliaComparison?.ready(),null,{polling:100});await p.evaluate(()=>paused=true);pages.push(p);
 }
 let unchangedManualCases=0;const autoResults=[];
 for(const preset of ['natural','playful','chaos']){
  for(const kind of ['bounce','tap','drag']){
   const results=await Promise.all(pages.map(p=>p.evaluate(({preset,kind})=>{
    const apis=__aureliaComparison.apis();apis.forEach(a=>{a.preset(preset);a.auto(false)});
    if(kind==='bounce')apis.forEach(a=>a.bounce());else{
     for(const f of document.querySelectorAll('iframe'))f.contentWindow.clock=1000;
     __aureliaRelay({type:'pointerdown',id:10,x:270,y:903});
     if(kind==='drag'){
      for(const f of document.querySelectorAll('iframe'))f.contentWindow.clock=1200;
      __aureliaRelay({type:'pointermove',id:10,x:335,y:965});
      for(let i=0;i<30;i++)__aureliaComparison.step(1/120);
     }
     for(const f of document.querySelectorAll('iframe'))f.contentWindow.clock=kind==='drag'?1400:1100;
     __aureliaRelay({type:'pointerup',id:10,x:335,y:965});
    }
    const trace=[];for(let i=0;i<360;i++){__aureliaComparison.step(1/120);if(i%6===0)trace.push(apis.map(a=>({raw:a.raw(),render:a.snapshot().renderOffsets})))}return trace;
   },{preset,kind})));
   assert.deepEqual(results[1],results[0],preset+' '+kind+' unchanged in both panes');unchangedManualCases+=2;
  }
  const results=await pages[1].evaluate(preset=>{
   const apis=__aureliaComparison.apis();apis.forEach(a=>{a.preset(preset);a.auto(true)});
   const stats=apis.map(()=>({maxY:0,minX:0,maxX:0,opposed:0,samples:0,maxBound:0}));
   for(let i=0;i<120*20;i++){
    __aureliaComparison.step(1/120);
    apis.forEach((a,j)=>{const s=a.snapshot(),r=a.raw(),st=stats[j],l=s.renderOffsets[1].dx,right=s.renderOffsets[4].dx;
     st.minX=Math.min(st.minX,l);st.maxX=Math.max(st.maxX,l);
     for(const n of [...r.nodes,...r.followers,...s.renderOffsets]){st.maxY=Math.max(st.maxY,Math.abs(n.dy));if(!Number.isFinite(n.dx+n.dy))throw Error('Nonfinite motion')}
     for(const n of s.renderOffsets)st.maxBound=Math.max(st.maxBound,Math.abs(n.dx)/26,Math.abs(n.dy)/30);
     if(i>120&&Math.abs(l)>1&&Math.abs(right)>1){st.samples++;if(l*right<0)st.opposed++}
    });
   }
   apis.forEach(a=>a.auto(false));for(let i=0;i<120*10;i++)__aureliaComparison.step(1/120);
   return{stats,rest:apis.map(a=>a.snapshot().renderOffsets)};
  },preset);
  for(const s of results.stats){assert.equal(s.maxY,0,'no vertical Auto motion');assert(s.minX<-2&&s.maxX>2,'inward and outward travel');assert(s.samples>100&&s.opposed/s.samples>.98,'paired sides move toward/away from one another');assert(s.maxBound<=1)}
  assert(results.rest.flat().every(n=>Math.abs(n.dx)+Math.abs(n.dy)<.02),'Auto off settles');autoResults.push({preset,...results.stats.reduce((v,s)=>({maxY:Math.max(v.maxY,s.maxY),minX:Math.min(v.minX,s.minX),maxX:Math.max(v.maxX,s.maxX)}),{maxY:0,minX:0,maxX:0})});
 }
 console.log({unchangedManualCases,autoCases:6,autoResults});
}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});
