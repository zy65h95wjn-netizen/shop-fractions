// Run against a repository-root HTTP server. Requires Playwright and Chromium.
// Test-only hooks are injected into responses; shipped HTML is never instrumented.
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../..'),out=process.env.PEACH_TEST_OUTPUT||'/tmp/peach-v7-1-tests';fs.mkdirSync(out,{recursive:true});
const base=process.env.PEACH_TEST_URL||'http://127.0.0.1:8000';let checks=0;
function ok(value,label){assert.ok(value,label);checks++;}
const hook=`
window.__test={reset,render,step,model,nodes,followers,impacts,waves,resize,chooseCharacter,
 raw:()=>JSON.parse(JSON.stringify({nodes,followers,impacts,waves})),
 pixels:()=>{render();const p=new Uint8Array(canvas.width*canvas.height*4);gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,p);return p;},
 error:()=>gl.getError(),
 gesture:(kind,side=0)=>{
  const [x,y]=currentCharacter().impactCenters[side],sx=ox+x/W*drawW,sy=oy+y/H*drawH;
  if(kind==='slap'){slap(side,x,y,{sx,sy});return;}
  if(kind==='kick'){impulse(side,x,y);return;}
  const fire=(type,dx=0,dy=0)=>canvas.dispatchEvent(new PointerEvent(type,{pointerId:11,pointerType:'touch',clientX:sx+dx,clientY:sy+dy,bubbles:true}));
  fire('pointerdown');window.testClock+=20;fire('pointermove',12,14);window.testClock+=20;fire('pointermove',24,28);
  if(kind==='flick'){window.testClock+=10;fire('pointerup',24,28);}
 },
 forcePose:(dx,dy)=>{reset();for(let i=0;i<3;i++){nodes[i].dx=dx;nodes[i].dy=dy;}followers[0].dx=10;followers[0].dy=11;impacts[0].v=1.2;waves[0]={age:.08,strength:1};render();}
};
`;
async function setup(browser,version,size={width:390,height:844},controlled=true,fallback=false){
 const context=await browser.newContext({viewport:size,deviceScaleFactor:2,isMobile:true,hasTouch:true});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 if(controlled){await page.addInitScript(()=>{window.requestAnimationFrame=()=>0;window.testClock=1000;performance.now=()=>window.testClock;});}
 if(fallback)await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type.includes('webgl')?null:original.call(this,type,...args)};});
 await page.route(`**/peach-physics/${version}/`,route=>{
  let html=fs.readFileSync(path.join(root,'peach-physics',version,'index.html'),'utf8');
  html=html.replace('presentCharacter();\ngetPhoto',hook+'\npresentCharacter();\ngetPhoto');
  return route.fulfill({contentType:'text/html',body:html});
 });
 await page.goto(`${base}/peach-physics/${version}/`);await page.waitForFunction(()=>window.__test&&document.querySelector('#loader').classList.contains('hiding'));
 await page.evaluate(()=>{__test.resize();__test.render();});
 return {page,context,errors};
}
async function character(p,id){await p.evaluate(id=>__test.chooseCharacter(id==='ember'?0:1),id);await p.waitForFunction(id=>__peachPhysicsDebug.snapshot().character===id,id);await p.evaluate(()=>{__test.resize();__test.reset();__test.render();});}
async function scenario(p,kind,side,transfer){return p.evaluate(({kind,side,transfer})=>{__test.reset();__test.model.transfer=transfer;__test.gesture(kind,side);let trace=[];for(let i=0;i<180;i++){__test.step(1/120);if(i%6===0)trace.push(__test.raw());}return trace;},{kind,side,transfer});}
async function canvas(p){return p.evaluate(()=>{__test.render();return document.querySelector('#game').toDataURL();});}
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const old=await setup(browser,'v6-2-3'),fresh=await setup(browser,'v7-1');const a=old.page,b=fresh.page;
 const metrics={};
 for(const id of ['ember','midnight']){
  await character(a,id);await character(b,id);
  ok(await canvas(a)===await canvas(b),`${id} resting canvas unchanged`);
  for(const side of [0,1])for(const kind of ['slap','kick','drag','flick'])for(const transfer of [0,50,100]){
   const oldValue=transfer;
   const ta=await scenario(a,kind,side,oldValue),tb=await scenario(b,kind,side,transfer);
   ok(JSON.stringify(ta)===JSON.stringify(tb),`${id} side ${side} ${kind} ${transfer} complete trajectory equivalent`);
  }
  for(const renderedSide of [0,1]){
  for(const p of [a,b])await p.evaluate(side=>{__test.reset();__test.model.transfer=0;__test.gesture('slap',side);for(let i=0;i<6;i++)__test.step(1/120);},renderedSide);
  ok(await canvas(a)===await canvas(b),`${id} side ${renderedSide} rendered response unchanged`);}
 }
 for(const size of [{width:375,height:667},{width:390,height:844},{width:430,height:932},{width:440,height:956}]){
  await a.setViewportSize(size);await b.setViewportSize(size);await character(a,'midnight');await character(b,'midnight');
  const key=`${size.width}x${size.height}`;metrics[key]={};
  for(const [label,p] of [['old',a],['new',b]]){
   const stats=await p.evaluate(()=>{
    __test.reset();const rest=__test.pixels(),c=document.querySelector('#game'),f=__peachPhysicsDebug.snapshot().framing;
    const count=(pixels,box)=>{let count=0,max=0;const [x0,y0,x1,y1]=box;for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){
     const sx=Math.round((f.x+x/941*f.width)*2),sy=Math.round((f.y+y/1671*f.height)*2);if(sx<0||sx>=c.width||sy<0||sy>=c.height)continue;
     const at=((c.height-1-sy)*c.width+sx)*4;let d=0;for(let k=0;k<3;k++)d=Math.max(d,Math.abs(pixels[at+k]-rest[at+k]));if(d>2)count++;max=Math.max(max,d);
    }return {count,max};};
    const boxes={background:[110,1070,150,1260],garment:[260,960,390,985],skin:[250,1090,370,1220],crease:[250,1280,380,1305],belowCheek:[250,1330,380,1380],innerThigh:[430,1305,460,1350],stocking:[250,1460,380,1500],right:[520,1030,730,1280]};
    const results=[];for(const [dx,dy] of [[26,30],[-26,-30],[26,-30],[-26,30]]){__test.forcePose(dx,dy);const pixels=__test.pixels();results.push(Object.fromEntries(Object.entries(boxes).map(([k,v])=>[k,count(pixels,v)])));}
    return {results,error:__test.error(),framing:f};
   });metrics[key][label]=stats;
   ok(stats.error===0,`${key} ${label} no WebGL errors`);
   if(label==='new')for(const result of stats.results){ok(result.background.count===0,`${key} scenery stable`);ok(result.garment.count===0,`${key} garment stable`);ok(result.right.count===0,`${key} right stable during left motion`);ok(result.skin.count>1000,`${key} expressive left skin displacement`);ok(result.crease.count>500,`${key} green-marked lower crease moves`);ok(result.stocking.count===0,`${key} stocking stays fixed`);ok(result.belowCheek.count===0,`${key} below-cheek skin stays fixed`);ok(result.innerThigh.count===0,`${key} inner thigh stays fixed`);}
   await p.addStyleTag({content:'#loader,#hint,#characterToast,.slap-burst,#pulse{display:none!important}'});
   await p.screenshot({path:path.join(out,`${key}-${label}-left-motion.png`)});
  }
  ok(JSON.stringify(metrics[key].old.framing)===JSON.stringify(metrics[key].new.framing),`${key} framing unchanged`);
 }
 // Independent sides and proportional linked response, using the real pointer handlers.
 metrics.transfer={};for(const value of [0,25,50,75,100]){
  const trace=await scenario(b,'drag',0,value);const peak=Math.max(...trace.map(t=>Math.hypot(t.nodes[4].dx,t.nodes[4].dy)));metrics.transfer[value]=peak;
  if(value===0)ok(peak===0,'zero means independent');else ok(peak>metrics.transfer[value-25],'linked response increases monotonically');
 }
 // Genuine multi-touch via Chromium CDP on unmodified production HTML.
 const live=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});const p=await live.newPage();const liveErrors=[];p.on('pageerror',e=>liveErrors.push(e.message));
 await p.goto(`${base}/peach-physics/v7-1/`);await p.waitForFunction(()=>window.__peachPhysicsDebug?.snapshot().frames>1);
 await p.locator('#character').click();await p.waitForFunction(()=>__peachPhysicsDebug.snapshot().character==='midnight');
 const f=await p.evaluate(()=>__peachPhysicsDebug.snapshot().framing),point=(id,x,y)=>({id,x:f.x+x/941*f.width,y:f.y+y/1671*f.height,radiusX:4,radiusY:4,force:1});
 const cdp=await live.newCDPSession(p),l=point(1,285,1150),r=point(2,605,1150);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[l,r]});
 ok((await p.evaluate(()=>__peachPhysicsDebug.snapshot())).activePointers.length===2,'two genuine simultaneous touches');
 await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...l,x:l.x-12,y:l.y+10},{...r,x:r.x+12,y:r.y-10}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[r]});
 ok((await p.evaluate(()=>__peachPhysicsDebug.snapshot())).activePointers.length===1,'lifting one finger retains the other');
 await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{...r,x:r.x+25,y:r.y+15}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 ok((await p.evaluate(()=>__peachPhysicsDebug.snapshot())).activePointers.length===0,'both fingers released');
 await p.touchscreen.tap(l.x,l.y);ok((await p.evaluate(()=>__peachPhysicsDebug.snapshot())).slapCount>0,'tap produces slap');
 await p.locator('#gear').click();
 for(const name of ['natural','playful','chaos']){await p.locator(`[data-preset="${name}"]`).click();ok((await p.evaluate(()=>__peachPhysicsDebug.snapshot())).preset===name,`${name} preset`);}
 await p.locator('#slapAudio').click();await p.locator('#transfer').evaluate(el=>{el.value='73';el.dispatchEvent(new Event('input',{bubbles:true}));});
 await p.reload();await p.waitForFunction(()=>window.__peachPhysicsDebug?.snapshot().frames>1);
 const restored=await p.evaluate(()=>__peachPhysicsDebug.snapshot());ok(restored.character==='midnight'&&restored.preset==='chaos'&&restored.model.transfer===73&&restored.slapAudioEnabled,'reopen restores settings and audio');
 await p.locator('#character').click();await p.waitForFunction(()=>__peachPhysicsDebug.snapshot().character==='aurelia');await p.locator('#character').click();await p.waitForFunction(()=>__peachPhysicsDebug.snapshot().character==='ember');ok((await p.evaluate(()=>__peachPhysicsDebug.snapshot())).preset==='natural','character profiles independent');
 await p.locator('#character').click();await p.waitForFunction(()=>__peachPhysicsDebug.snapshot().character==='midnight');
 await p.evaluate(()=>{const el=document.querySelector('#transfer');el.value=100;el.dispatchEvent(new Event('input'));});
 for(let i=0;i<30;i++)await p.touchscreen.tap(i%2?l.x:r.x,l.y);
 const stressed=await p.evaluate(()=>__peachPhysicsDebug.snapshot());ok(stressed.nodes.every(n=>Number.isFinite(n.dx)&&Math.abs(n.dx)<=26&&Math.abs(n.dy)<=30),'30 Chaos slaps bounded');
 await p.waitForTimeout(1500);await p.screenshot({path:path.join(out,'live-chaos.png')});
 ok(liveErrors.length===0,'production page no uncaught errors');
 // One-time import keeps numeric slider values and never writes old-version profiles.
 const migration=await setup(browser,'v7-1');await migration.page.evaluate(()=>{localStorage.clear();localStorage.setItem('peach-physics-v00623-active','midnight');localStorage.setItem('peach-physics-v00623-profile-midnight',JSON.stringify({version:2,preset:'playful',bounce:80,softness:79,settle:35,transfer:50,slapAudioEnabled:true}));});
 await migration.page.reload();await migration.page.waitForFunction(()=>window.__test&&document.querySelector('#loader').classList.contains('hiding'));
 ok((await migration.page.evaluate(()=>__peachPhysicsDebug.snapshot())).model.transfer===50,'import retains numeric slider');
 await migration.page.locator('#transfer').evaluate(el=>{el.value=100;el.dispatchEvent(new Event('input'));});
 ok(await migration.page.evaluate(()=>JSON.parse(localStorage.getItem('peach-physics-v00623-profile-midnight')).transfer===50),'old preferences protected');
 const fb=await setup(browser,'v7-1',{width:390,height:844},true,true);await character(fb.page,'midnight');ok((await fb.page.evaluate(()=>__peachPhysicsDebug.snapshot())).renderer==='canvas','Canvas fallback starts');await scenario(fb.page,'slap',0,100);await fb.page.evaluate(()=>__test.render());await character(fb.page,'ember');await character(fb.page,'midnight');ok(fb.errors.length===0,'fallback switching and mask rebuild');
 // Exact rest/settling and delayed secondary response in the controlled simulation.
 const settle=await b.evaluate(()=>{__test.reset();__test.model.settle=48;__test.model.softness=65;__test.gesture('slap',0);let secondary=false;for(let i=0;i<1200;i++){__test.step(1/120);secondary ||= Math.abs(__test.followers[0].dy)>.05;}return {secondary,nodes:__test.raw().nodes,error:__test.error()};});
 ok(settle.secondary,'secondary follow-through present');ok(settle.nodes.every(n=>n.dx===0&&n.dy===0),'settles to rest');ok(settle.error===0,'final GL error clear');
 ok(old.errors.length===0&&fresh.errors.length===0,'controlled pages no uncaught errors');
 fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({checks,metrics},null,2));console.log(JSON.stringify({checks,transfer:metrics.transfer,output:out}));await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
