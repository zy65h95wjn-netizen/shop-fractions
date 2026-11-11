// Rendered-displacement regression against the first published v8, not node motion alone.
const {chromium,fs,path,assert,root,out,setup,character}=require('./harness.cjs');
const {execFileSync}=require('node:child_process');
let checks=0;const ok=(v,s)=>{assert.ok(v,s);checks++};
(async()=>{
 const baselinePath=path.join(out,'v8-r1-baseline.html');fs.writeFileSync(baselinePath,execFileSync('git',['show','48d063b2750eb04fe0ea18adc72fb83b22c67b5a:peach-physics/v8/index.html'],{cwd:root,maxBuffer:2e6}));
 const b=await chromium.launch({executablePath:process.env.CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const old=await setup(b,'v8',{width:390,height:844},true,false,'holly',baselinePath),next=await setup(b,'v8',{width:390,height:844},true,false,'holly');
 for(const app of [old,next])await character(app.page,'holly');
 const profiles={natural:{bounce:55,softness:58,settle:60,transfer:50},allMax:{bounce:100,softness:100,settle:100,transfer:100},chaos:{bounce:92,softness:84,settle:32,transfer:50},maxMotion:{bounce:100,softness:100,settle:0,transfer:100}},rows=[];
 for(const side of [0,1])for(const [name,model] of Object.entries(profiles)){
  const row={side,profile:name};
  for(const [label,app] of [['before',old],['after',next]]){
   row[label]=await app.page.evaluate(({side,model})=>{
    __test.reset();Object.assign(__test.model,model);__test.gesture('slap',side);
    const c=document.querySelector('#game'),f=__peachPhysicsDebug.snapshot().framing,dpr=c.width/innerWidth;
    let peak=0,peakFrame=0,rebound=false;const samples=[];
    for(let frame=0;frame<120;frame+=5){
     if(frame)for(let i=0;i<5;i++)__test.step(1/120);
     const a=__test.pixels();let travel=0;
     for(let y=425;y<550;y+=5)for(let x=side?435:270;x<(side?550:398);x+=5){
      const sx=Math.round((f.x+x/720*f.width)*dpr),sy=Math.round((f.y+y/1280*f.height)*dpr),at=((c.height-1-sy)*c.width+sx)*4;
      const dx=(a[at]/255+a[at+1]/65025-.5)*128,dy=(a[at+2]/255+a[at+3]/65025-.5)*128;travel=Math.max(travel,Math.hypot(dx,dy));
     }
     if(travel>peak){peak=travel;peakFrame=frame;}samples.push(travel);
    }
    return {peakSourcePixels:peak,peakCssPixels:peak*f.width/720,peakFrame,error:__test.error()};
   },{side,model});
  }
  row.ratio=row.after.peakSourcePixels/row.before.peakSourcePixels;
  ok(row.ratio>2.1,`${name} ${side} visibly stronger: ${row.ratio}`);ok(row.after.peakSourcePixels<24,'bounded');ok(row.after.error===0&&row.before.error===0,'GL clear');rows.push(row);
 }
 // Record the actual two poses for visual comparison, using normal photo rendering.
 for(const [label,source] of [['before',baselinePath],['after',null]]){
  const app=await setup(b,'v8',{width:390,height:844},true,false,false,source);await character(app.page,'holly');await app.page.addStyleTag({content:'#loader,#hint,#characterToast,.slap-burst,#pulse{display:none!important}'});
  const frame=rows.find(r=>r.side===0&&r.profile==='allMax')[label].peakFrame;
  await app.page.evaluate(({frame,model})=>{__test.reset();Object.assign(__test.model,model);__test.gesture('slap',0);for(let i=0;i<frame;i++)__test.step(1/120);__test.render();},{frame,model:profiles.allMax});
  await app.page.screenshot({path:path.join(out,`holly-max-${label}.png`)});await app.context.close();
 }
 ok(old.errors.length===0&&next.errors.length===0,'no errors');fs.writeFileSync(path.join(out,'holly-amplitude.json'),JSON.stringify({checks,rows},null,2));console.log(JSON.stringify({checks,rows}));await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
