// r4 acceptance measures visible garment features, with a photographic motion preview.
const {chromium,fs,path,assert,root,out,setup,character}=require('./harness.cjs');
const {execFileSync}=require('node:child_process');
let checks=0;const ok=(v,s)=>{assert.ok(v,s);checks++};
(async()=>{
 const baseline=path.join(out,'v8-r3-baseline.html');fs.writeFileSync(baseline,execFileSync('git',['show','05a1730163440037d8247d9d1775de88065c3ee5:peach-physics/v8/index.html'],{cwd:root,maxBuffer:2e6}));
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const metrics=[];
 for(const [label,source] of [['r3',baseline],['r4',null]]){
  const app=await setup(browser,'v8',{width:390,height:844},true,false,'holly',source);await character(app.page,'holly');
  for(const side of [0,1])for(const profile of ['natural','chaos','allMax']){
   const m=await app.page.evaluate(({side,profile})=>{
    __test.reset();document.querySelector(`[data-preset="${profile==='allMax'?'chaos':profile}"]`).click();if(profile==='allMax')Object.assign(__test.model,{bounce:100,softness:100,settle:100});__test.model.transfer=0;__test.gesture('slap',side);
    const c=document.querySelector('#game'),f=__peachPhysicsDebug.snapshot().framing,dpr=c.width/innerWidth,points=side?[[520,550],[510,590],[481,484]]:[[310,535],[300,580],[337,477]],trace=[];
    for(let frame=0;frame<=180;frame+=6){
     if(frame)for(let i=0;i<6;i++)__test.step(1/120);
     const a=__test.pixels(),read=([x,y])=>{const sx=Math.round((f.x+x/720*f.width)*dpr),sy=Math.round((f.y+y/1280*f.height)*dpr),at=((c.height-1-sy)*c.width+sx)*4;return [(a[at]/255+a[at+1]/65025-.5)*128,(a[at+2]/255+a[at+3]/65025-.5)*128]};
     trace.push({ms:frame/120*1000,fur:read(points[0]),cup:read(points[1]),skin:read(points[2])});
    }
    return {side,profile,trace,scale:f.width/720,error:__test.error()};
   },{side,profile});
   m.label=label;metrics.push(m);ok(m.error===0,'GL clear');
   if(label==='r4'){
    const max=Math.max(...m.trace.map(t=>t.fur[1])),min=Math.min(...m.trace.map(t=>t.fur[1]));
    ok(max>6,`${side} ${profile} visible neckline travel ${max}`);ok(min<-.8,`${side} ${profile} visible rebound ${min}`);
    ok(Math.max(...m.trace.map(t=>Math.hypot(...t.cup)))>3,'attached soft cup moves');
    ok(m.trace.some(t=>t.ms>=400&&Math.abs(t.fur[1])>1),'secondary motion persists beyond 400ms');
   }
  }
  ok(app.errors.length===0,'no page errors');await app.context.close();
 }
 // Normal-photo frames for an actual before/after animation, Natural left-side tap.
 for(const [label,source] of [['r3',baseline],['r4',null]]){
  const app=await setup(browser,'v8',{width:390,height:844},true,false,false,source),p=app.page;await character(p,'holly');await p.addStyleTag({content:'#loader,#hint,#characterToast,.slap-burst,#pulse{display:none!important}'});
  await p.evaluate(()=>{__test.reset();document.querySelector('[data-preset="natural"]').click();__test.model.transfer=0;__test.render();});
  for(let frame=0;frame<=30;frame++){
   if(frame===3)await p.evaluate(()=>__test.gesture('slap',0));
   if(frame>3)await p.evaluate(()=>{for(let i=0;i<6;i++)__test.step(1/120);});
   await p.evaluate(()=>__test.render());await p.screenshot({path:path.join(out,`volume-${label}-${String(frame).padStart(2,'0')}.png`),clip:{x:90,y:260,width:260,height:190}});
  }
  await app.context.close();
 }
 fs.writeFileSync(path.join(out,'holly-volume.json'),JSON.stringify({checks,metrics},null,2));console.log(JSON.stringify({checks,summary:metrics.map(m=>({label:m.label,side:m.side,profile:m.profile,furPeakCss:Math.max(...m.trace.map(t=>t.fur[1]))*m.scale,furReboundCss:Math.min(...m.trace.map(t=>t.fur[1]))*m.scale}))}));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
