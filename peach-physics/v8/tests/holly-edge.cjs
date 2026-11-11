// User-marked outer cup acceptance: compare visible travel with published r4.
const {chromium,fs,path,assert,root,out,setup,character,scenario,canvas}=require('./harness.cjs');
const {execFileSync}=require('node:child_process');
let checks=0;const ok=(v,s)=>{assert.ok(v,s);checks++};
const points=[[567,463],[579,482],[585,505],[585,530],[580,550],[571,575],[560,595],[550,608]];
(async()=>{
 const baseline=path.join(out,'v8-r4-baseline.html');fs.writeFileSync(baseline,execFileSync('git',['show','f5826124cac58b00f2647d82cc3c1087f22d3ea8:peach-physics/v8/index.html'],{cwd:root,maxBuffer:2e6}));
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const before=await setup(browser,'v8',{width:390,height:844},true,false,false,baseline),after=await setup(browser,'v8');
 for(const app of [before,after])await character(app.page,'holly');
 for(const side of [0,1])for(const kind of ['slap','kick','drag','flick'])for(const link of [0,50,100]){
  assert.deepEqual(await scenario(after.page,kind,side,link),await scenario(before.page,kind,side,link));checks++;
 }
 for(const app of [before,after])await app.page.evaluate(()=>{__test.reset();__test.render();});
 ok(await canvas(before.page)===await canvas(after.page),'rest unchanged');
 for(const frame of [8,12,30,50]){
  for(const app of [before,after])await app.page.evaluate(frame=>{__test.reset();__test.model.transfer=0;__test.gesture('slap',0);for(let i=0;i<frame;i++)__test.step(1/120);__test.render();},frame);
  ok(await canvas(before.page)===await canvas(after.page),'screen-left rendered motion unchanged');
 }
 for(const [label,app] of [['r4',before],['r5',after]]){
  await app.page.addStyleTag({content:'#loader,#hint,#characterToast,.slap-burst,#pulse{display:none!important}'});
  await app.page.evaluate(()=>{__test.reset();document.querySelector('[data-preset="natural"]').click();__test.model.transfer=0;__test.render();});
  for(let frame=0;frame<=30;frame++){
   if(frame===3)await app.page.evaluate(()=>__test.gesture('slap',1));
   if(frame>3)await app.page.evaluate(()=>{for(let i=0;i<6;i++)__test.step(1/120);});
   await app.page.evaluate(()=>__test.render());await app.page.screenshot({path:path.join(out,`edge-${label}-${String(frame).padStart(2,'0')}.png`),clip:{x:260,y:300,width:80,height:130}});
  }
  ok(app.errors.length===0,'no page errors');await app.context.close();
 }
 const measurements=[];
 for(const [label,source] of [['r4',baseline],['r5',null]])for(const size of [{width:375,height:667},{width:390,height:844},{width:430,height:932},{width:440,height:956}]){
  const app=await setup(browser,'v8',size,true,false,'holly',source);await character(app.page,'holly');
  const result=await app.page.evaluate(points=>{
   __test.reset();document.querySelector('[data-preset="natural"]').click();__test.model.transfer=0;__test.gesture('slap',1);
   const c=document.querySelector('#game'),f=__peachPhysicsDebug.snapshot().framing,dpr=c.width/innerWidth,peak=points.map(()=>0);
   const read=(a,x,y)=>{const sx=Math.round((f.x+x/720*f.width)*dpr),sy=Math.round((f.y+y/1280*f.height)*dpr),at=((c.height-1-sy)*c.width+sx)*4;return Math.hypot((a[at]/255+a[at+1]/65025-.5)*128,(a[at+2]/255+a[at+3]/65025-.5)*128);};
   let stable=0;for(let frame=0;frame<=180;frame+=6){if(frame)for(let i=0;i<6;i++)__test.step(1/120);const a=__test.pixels();points.forEach(([x,y],i)=>peak[i]=Math.max(peak[i],read(a,x,y)));for(const [x,y] of [[625,500],[625,540],[620,580],[600,630],[580,440],[620,460],[650,530],[409,510],[400,610]])stable=Math.max(stable,read(a,x,y));}
   return {peak,stable,scale:f.width/720,error:__test.error()};
  },points);
  measurements.push({label,width:size.width,...result});ok(result.error===0&&app.errors.length===0,'no browser or GL errors');ok(result.stable<.01,'surrounding arm, upper hair, scenery and center fixed');
  if(label==='r5')result.peak.forEach((value,i)=>ok(value>(i===0?3:8),`marked station ${i} moves at ${size.width}: ${value}`));
  await app.context.close();
 }
 fs.writeFileSync(path.join(out,'holly-edge.json'),JSON.stringify({checks,points,measurements},null,2));console.log(JSON.stringify({checks,measurements}));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
