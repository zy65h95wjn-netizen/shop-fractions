// Photograph-based boundary samples independent of the runtime mask. r5 let
// motion reach these narrow hair/arm strips; r6 must keep their pixels fixed.
const {chromium,fs,path,assert,root,out,setup,character,scenario}=require('./harness.cjs');
const {execFileSync}=require('node:child_process');
let checks=0;const ok=(v,s)=>{assert.ok(v,s);checks++};
const edgePoints=[[[236,479],[227,500],[235,525],[242,551],[251,575],[269,603]],[[590,500],[597,520],[587,545],[574,574],[554,603]]];
const stableBoxes=[[[201,480,207,510],[210,520,217,532],[218,548,223,560],[225,576,231,585],[239,607,249,618]],[[608,498,614,503],[610,510,617,531],[608,535,615,542],[597,552,608,562],[586,575,597,584],[563,607,574,617],[575,454,584,467]]];
(async()=>{
 const baseline=path.join(out,'v8-r5-baseline.html');fs.writeFileSync(baseline,execFileSync('git',['show','8eb02d3ed70346a31112df89001b1310df75dc22:peach-physics/v8/index.html'],{cwd:root,maxBuffer:2e6}));
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const movement=[],boundaries=[];
 for(const [label,source] of [['r5',baseline],['r6',null]]){
  const app=await setup(browser,'v8',{width:390,height:844},true,false,'holly',source);await character(app.page,'holly');
  for(const side of [0,1]){
   const result=await app.page.evaluate(({side,points})=>{
    __test.reset();document.querySelector('[data-preset="natural"]').click();__test.model.transfer=0;__test.gesture('slap',side);
    const c=document.querySelector('#game'),f=__peachPhysicsDebug.snapshot().framing,dpr=c.width/innerWidth,peak=points.map(()=>0),inner=side?[481,484]:[337,477];let innerPeak=0;
    const read=(a,[x,y])=>{const sx=Math.round((f.x+x/720*f.width)*dpr),sy=Math.round((f.y+y/1280*f.height)*dpr),at=((c.height-1-sy)*c.width+sx)*4;return Math.hypot((a[at]/255+a[at+1]/65025-.5)*128,(a[at+2]/255+a[at+3]/65025-.5)*128);};
    for(let frame=0;frame<=180;frame+=6){if(frame)for(let i=0;i<6;i++)__test.step(1/120);const a=__test.pixels();points.forEach((p,i)=>peak[i]=Math.max(peak[i],read(a,p)));innerPeak=Math.max(innerPeak,read(a,inner));}
    return {peak,innerPeak,scale:f.width/720,error:__test.error()};
   },{side,points:edgePoints[side]});movement.push({label,side,...result});ok(result.error===0&&app.errors.length===0,'GL and browser clear');
  }await app.context.close();
 }
 for(const side of [0,1]){
  const before=movement.find(m=>m.label==='r5'&&m.side===side),after=movement.find(m=>m.label==='r6'&&m.side===side);
  for(let i=0;i<after.peak.length;i++)ok(side===0?after.peak[i]>before.peak[i]*(i<3?1.5:.95)&&after.peak[i]>4:after.peak[i]<before.peak[i]*.6,`${side} outer station ${i}: ${before.peak[i]} -> ${after.peak[i]}`);
  ok(after.innerPeak>16,'inner movement remains visible');
 }
 for(const [label,source] of [['r5',baseline],['r6',null]])for(const fallback of [false,true])for(const size of (label==='r5'?[{width:390,height:844}]:[{width:375,height:667},{width:390,height:844},{width:430,height:932},{width:440,height:956}])){
  const app=await setup(browser,'v8',size,true,fallback,false,source);await character(app.page,'holly');
  const rows=await app.page.evaluate(({fallback,boxes})=>{
   const c=document.querySelector('#game'),ctx=fallback?c.getContext('2d'):null,f=__peachPhysicsDebug.snapshot().framing,dpr=c.width/innerWidth;
   const read=()=>{__test.render();return fallback?ctx.getImageData(0,0,c.width,c.height).data:__test.pixels();};
   __test.reset();for(let i=0;i<4;i++)read();const rest=read(),rows=[];
   for(const side of [0,1])for(const [dx,dy] of [[26,30],[-26,-30],[26,-30],[-26,30]]){
    __test.forcePose(dx,dy,side);const moved=read(),counts=boxes[side].map(box=>{
     let changed=0;for(let y=box[1];y<box[3];y++)for(let x=box[0];x<box[2];x++){
      const sx=Math.round((f.x+x/720*f.width)*dpr),sy=Math.round((f.y+y/1280*f.height)*dpr),at=((fallback?sy:c.height-1-sy)*c.width+sx)*4;
      if([0,1,2].some(k=>rest[at+k]!==moved[at+k]))changed++;
     }return changed;
    });rows.push({side,dx,dy,counts});
   }return rows;
  },{fallback,boxes:stableBoxes});boundaries.push({label,fallback,width:size.width,rows});
  if(label==='r6')for(const row of rows)ok(row.counts.every(n=>n===0),`adjacent pixels fixed ${fallback}/${size.width}: ${JSON.stringify(row)}`);
  if(label==='r5')ok(rows.some(r=>r.side===1&&r.counts.some(n=>n>0)),'baseline reproduces right boundary pull');
  ok(app.errors.length===0,'no errors');await app.context.close();
 }
 // Both spring systems retain r5 trajectories. Rendering alone is calibrated.
 const a=await setup(browser,'v8'),b=await setup(browser,'v8',{width:390,height:844},true,false,false,baseline);
 for(const app of [a,b])await character(app.page,'holly');
 for(const side of [0,1])for(const kind of ['slap','kick','drag','flick'])for(const link of [0,50,100]){assert.deepEqual(await scenario(a.page,kind,side,link),await scenario(b.page,kind,side,link));checks++;}
 await a.context.close();await b.context.close();
 // Photographic before/after previews, independent taps on each side.
 for(const [label,source] of [['r5',baseline],['r6',null]]){
  const app=await setup(browser,'v8',{width:390,height:844},true,false,false,source);await character(app.page,'holly');await app.page.addStyleTag({content:'#loader,#hint,#characterToast,.slap-burst,#pulse{display:none!important}'});
  for(const side of [0,1]){
   await app.page.evaluate(()=>{__test.reset();document.querySelector('[data-preset="natural"]').click();__test.model.transfer=0;__test.render();});
   for(let frame=0;frame<=26;frame++){
    if(frame===3)await app.page.evaluate(side=>__test.gesture('slap',side),side);
    if(frame>3)await app.page.evaluate(()=>{for(let i=0;i<6;i++)__test.step(1/120);});
    await app.page.evaluate(()=>__test.render());await app.page.screenshot({path:path.join(out,`boundary-${label}-${side}-${String(frame).padStart(2,'0')}.png`),clip:{x:94,y:292,width:250,height:135}});
   }
  }ok(app.errors.length===0,'preview clear');await app.context.close();
 }
 fs.writeFileSync(path.join(out,'holly-edge.json'),JSON.stringify({checks,edgePoints,stableBoxes,movement,boundaries},null,2));console.log(JSON.stringify({checks,movement}));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
