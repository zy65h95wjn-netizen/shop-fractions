const {chromium,fs,path,assert,out,setup,character,scenario,canvas}=require('./harness.cjs');
let checks=0;const ok=(v,label)=>{assert.ok(v,label);checks++};
const sizes=[{width:375,height:667},{width:390,height:844},{width:430,height:932},{width:440,height:956}];
async function samples(p,dx,dy,lag=0,wave=0){return p.evaluate(({dx,dy,lag,wave})=>{
 __test.reset();for(let i=3;i<6;i++){__test.nodes[i].dx=dx;__test.nodes[i].dy=dy;}__test.followers[1].dy=lag;__test.waves[1]={age:.08,strength:wave};
 const a=__test.pixels(),c=document.querySelector('#game'),f=__peachPhysicsDebug.snapshot().framing,dpr=c.width/innerWidth;
 const disp=(x,y)=>{const at=((c.height-1-y)*c.width+x)*4;return [(a[at]/255+a[at+1]/65025-.5)*128,(a[at+2]/255+a[at+3]/65025-.5)*128]};
 const at=(x,y)=>disp(Math.round((f.x+x/756*f.width)*dpr),Math.round((f.y+y/1280*f.height)*dpr));
 const points=Object.fromEntries(Object.entries({center:[520,905],foldTop:[520,960],fold:[520,982],crease:[520,1000],thigh:[520,1030],innerThigh:[415,1030],left:[265,950],seam:[400,950],garment:[520,780],wavefront:[513,967]}).map(([key,[x,y]])=>[key,at(x,y)]));
 const scale=f.width/756*dpr;let minDet=Infinity;
 for(let y=900;y<1060;y+=2)for(let x=405;x<635;x+=2){const sx=Math.round((f.x+x/756*f.width)*dpr),sy=Math.round((f.y+y/1280*f.height)*dpr),l=disp(sx-1,sy),r=disp(sx+1,sy),t=disp(sx,sy-1),b=disp(sx,sy+1);const det=(1-(r[0]-l[0])*scale/2)*(1-(b[1]-t[1])*scale/2)-(b[0]-t[0])*(r[1]-l[1])*scale*scale/4;minDet=Math.min(minDet,det);}
 return {dx,dy,lag,wave,points,minDet,error:__test.error()};
},{dx,dy,lag,wave});}
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const a=await setup(browser,'v7'),b=await setup(browser,'v8'),metrics={};
 for(const id of ['ember','midnight','aurelia']){
  await character(a.page,id);await character(b.page,id);
  ok(await canvas(a.page)===await canvas(b.page),`${id} rest identical to v7`);
  for(const side of [0,1])for(const kind of ['slap','kick','drag','flick'])for(const transfer of [0,50,100]){
   ok(JSON.stringify(await scenario(a.page,kind,side,transfer))===JSON.stringify(await scenario(b.page,kind,side,transfer)),`${id} ${side} ${kind} ${transfer} simulation identical`);
  }
 }
 for(const size of sizes){
  const key=`${size.width}x${size.height}`;metrics[key]={};
  const old=await setup(browser,'v7',size,true,false,true),next=await setup(browser,'v8',size,true,false,true);
  await character(old.page,'aurelia');await character(next.page,'aurelia');
  const measurements=[];
  for(const [dx,dy,lag,wave] of [[0,10,0,0],[0,-10,0,0],[10,0,0,0],[-10,0,0,0],[0,0,6,0],[0,20,0,0],[0,20,0,1],[26,30,11,1],[-26,-30,-11,1],[26,-30,-11,1],[-26,30,11,1]]){
   const before=await samples(old.page,dx,dy,lag,wave),after=await samples(next.page,dx,dy,lag,wave);measurements.push({before,after});
   ok(after.error===0,'no WebGL error');ok(after.minDet>0,`${key} no sampled texture folds ${dx}/${dy}`);
   ok(JSON.stringify(before.points.center)===JSON.stringify(after.points.center),`${key} upper center unchanged`);
   for(const name of ['thigh','innerThigh','left','seam','garment'])ok(Math.hypot(...after.points[name])<.01,`${key} ${name} anchored`);
  }
  const down=measurements[0],up=measurements[1],slide=measurements[2],delayed=measurements[4];
  const ratio=(m,axis)=>Math.abs(m.after.points.fold[axis]/m.before.points.fold[axis]);
  ok(ratio(down,1)<.65,`${key} fold resists downward pull`);
  ok(ratio(up,1)>ratio(down,1)+.05&&ratio(up,1)<.85,`${key} opening differs from compression`);
  ok(ratio(slide,0)>ratio(down,1)+.15,`${key} sliding along fold is freer than crossing it`);
  ok(delayed.after.points.fold[1]>delayed.before.points.fold[1]+.25,`${key} distinct delayed settling`);
  const ripple=Math.abs(measurements[6].after.points.wavefront[1]-measurements[5].after.points.wavefront[1]);ok(ripple>.2,`${key} traveling wave remains visible: ${ripple}`);
  metrics[key]={measurements,ripple};
  await old.context.close();await next.context.close();
  // Matched actual renderings, plus exact protection of Aurelia's left-only response.
  for(const pg of [a.page,b.page]){await pg.setViewportSize(size);await character(pg,'aurelia');await pg.addStyleTag({content:'#loader,#hint,#characterToast,.slap-burst,#pulse{display:none!important}'});await pg.evaluate(()=>{__test.model.transfer=0;__test.gesture('slap',0);for(let i=0;i<14;i++)__test.step(1/120);});}
  ok(await canvas(a.page)===await canvas(b.page),`${key} Aurelia left rendering unchanged`);
  for(const [label,pg] of [['v7',a.page],['v8',b.page]]){
   await pg.evaluate(()=>{__test.reset();__test.gesture('slap',1);});
   for(const [time,steps] of [[0,0],[117,14],[250,16],[500,30]]){await pg.evaluate(n=>{for(let i=0;i<n;i++)__test.step(1/120);__test.render();},steps);await pg.screenshot({path:path.join(out,`fold-${key}-${label}-${time}ms.png`)});}
  }
 }
 // v7 settings, including the third active character, import without rewriting v7.
 await b.page.evaluate(()=>{localStorage.clear();localStorage.setItem('peach-physics-v007-active','aurelia');localStorage.setItem('peach-physics-v007-profile-aurelia',JSON.stringify({version:2,preset:'playful',bounce:80,softness:79,settle:35,transfer:73,slapAudioEnabled:true}));});
 await b.page.reload();await b.page.waitForFunction(()=>window.__test&&document.querySelector('#loader').classList.contains('hiding'));
 const restored=await b.page.evaluate(()=>__peachPhysicsDebug.snapshot());ok(restored.character==='aurelia'&&restored.model.transfer===73&&restored.preset==='playful'&&restored.slapAudioEnabled,'v7 profile import');
 await b.page.evaluate(()=>{const el=document.querySelector('#transfer');el.value=91;el.dispatchEvent(new Event('input'));});
 ok(await b.page.evaluate(()=>JSON.parse(localStorage.getItem('peach-physics-v007-profile-aurelia')).transfer===73),'v7 original profile protected');
 ok(a.errors.length===0&&b.errors.length===0,'no page errors');fs.writeFileSync(path.join(out,'fold.json'),JSON.stringify({checks,metrics},null,2));console.log(JSON.stringify({checks,output:out,summary:Object.fromEntries(Object.entries(metrics).map(([size,v])=>[size,{ripple:v.ripple,minDet:Math.min(...v.measurements.map(m=>m.after.minDet)),down:v.measurements[0],up:v.measurements[1]}]))}));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
