const {chromium,fs,path,assert,out,base,setup,character,scenario,canvas}=require('./harness.cjs');
let checks=0;const ok=(v,label)=>{assert.ok(v,label);checks++};
const sizes=[{width:375,height:667},{width:390,height:844},{width:430,height:932},{width:440,height:956}];
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const fresh=await setup(browser,'v8'),old=await setup(browser,'v7-1'),p=fresh.page,metrics={};
 // Exact trajectories AND rendered frames for every accepted character vs latest release.
 for(const id of ['ember','midnight','aurelia']){
  await character(p,id);await character(old.page,id);
  for(const side of [0,1])for(const kind of ['slap','kick','drag','flick'])for(const link of [0,50,100]){
   assert.deepEqual(await scenario(p,kind,side,link),await scenario(old.page,kind,side,link));checks++;
  }
  for(const size of sizes){
   for(const pg of [p,old.page]){await pg.setViewportSize(size);await pg.evaluate(()=>{__test.resize();__test.reset();});}
   ok(await canvas(p)===await canvas(old.page),`${id} rest identical ${size.width}`);
   for(const side of [0,1])for(const kind of ['slap','flick']){
    for(const pg of [p,old.page])await pg.evaluate(({side,kind})=>{__test.reset();__test.model.transfer=50;__test.gesture(kind,side);},{side,kind});
    for(const n of [6,8,16,30]){
     for(const pg of [p,old.page])await pg.evaluate(n=>{for(let i=0;i<n;i++)__test.step(1/120)},n);
     ok(await canvas(p)===await canvas(old.page),`${id} ${side} ${kind} identical ${size.width}`);
    }
   }
  }
 }
 await old.context.close();await character(p,'holly');
 metrics.transfer={};
 for(const side of [0,1])for(const kind of ['slap','kick','drag','flick']){
  let prior=-1;
  for(const link of [0,50,100]){
   const trace=await scenario(p,kind,side,link),other=Math.max(...trace.map(t=>Math.hypot(t.nodes[(1-side)*3+1].dx,t.nodes[(1-side)*3+1].dy)));
   ok(link===0?other===0:other>prior,`${kind} ${side} link ${link}`);prior=other;
   ok(trace.every(t=>t.nodes.every(n=>Math.abs(n.dx)<=26&&Math.abs(n.dy)<=30&&Number.isFinite(n.dx))), 'bounded');
   metrics.transfer[`${side}-${kind}-${link}`]=other;
  }
 }
 const strength=await p.evaluate(()=>{let peaks=[];for(const strength of [.6,1.5]){__test.reset();__test.model.transfer=0;__test.slap(0,337,477,{sx:0,sy:0},strength);let peak=0;for(let i=0;i<120;i++){__test.step(1/120);peak=Math.max(peak,Math.abs(__test.nodes[1].dy));}peaks.push(peak);}return peaks;});
 ok(strength[1]>strength[0]*1.5,'strong contact exceeds light tap');metrics.strength=strength;
 for(const size of sizes){
  await p.setViewportSize(size);await p.evaluate(()=>{__test.resize();__test.reset();});
  const snap=await p.evaluate(()=>__peachPhysicsDebug.snapshot());
  ok(snap.image[0]===720&&snap.image[1]===1280,'native image dimensions');
  ok(Math.abs(snap.framing.width/snap.framing.height-720/1280)<1e-9,'unstretched aspect');
  ok(snap.framing.y>=70&&snap.framing.x>=-.001,'full hat and face framing');
  const boundaries=await p.evaluate(()=>{
   __test.reset();const rest=__test.pixels(),c=document.querySelector('#game'),f=__peachPhysicsDebug.snapshot().framing,dpr=c.width/innerWidth;
   const count=(pixels,box)=>{let changed=0;for(let y=box[1];y<box[3];y++)for(let x=box[0];x<box[2];x++){
    const sx=Math.round((f.x+x/720*f.width)*dpr),sy=Math.round((f.y+y/1280*f.height)*dpr);if(sx<0||sx>=c.width||sy<0||sy>=c.height)continue;
    const at=((c.height-1-sy)*c.width+sx)*4;for(let k=0;k<3;k++)if(pixels[at+k]!==rest[at+k]){changed++;break;}
   }return changed;};
   const boxes={head:[250,80,500,320],upperTorso:[310,335,450,400],lacing:[365,590,447,800],corset:[240,605,550,710],center:[409,455,417,570],leftHair:[160,350,220,580],rightHair:[570,360,610,460],leftArm:[100,620,190,720],rightArm:[590,620,635,720],background:[640,250,700,650],leftFur:[237,500,270,530],rightFur:[545,510,580,540],leftSkin:[300,445,380,500],rightSkin:[445,455,520,510]};
   const rows=[];for(const side of [0,1])for(const [dx,dy] of [[26,30],[-26,-30],[26,-30],[-26,30]]){
    __test.forcePose(dx,dy,side);const pixels=__test.pixels();rows.push({side,dx,dy,boxes:Object.fromEntries(Object.entries(boxes).map(([k,b])=>[k,count(pixels,b)]))});
   }return rows;
  });
  for(const row of boundaries)for(const [name,changed] of Object.entries(row.boxes))ok(name===(row.side?'rightSkin':'leftSkin')?changed>300:changed===0,`${size.width} ${row.side} ${name} changed=${changed}`);
  metrics[size.width]={boundaries};
  await p.addStyleTag({content:'#loader,#hint,#characterToast,.slap-burst,#pulse{display:none!important}'});
  for(const side of [0,1]){
   await p.evaluate(()=>{__test.reset();__test.model.transfer=0;document.querySelector('[data-preset="natural"]').click();__test.render();});
   const rest=await canvas(p);await p.screenshot({path:path.join(out,`holly-${size.width}-${side}-rest.png`)});
   // Determine peak and rebound from this actual integration trace.
   const phases=await p.evaluate(side=>{__test.gesture('slap',side);let trace=[];for(let i=0;i<240;i++){__test.step(1/120);trace.push(__test.nodes[side*3+1].dy);}let peak=trace.indexOf(Math.max(...trace));let rebound=peak+1+trace.slice(peak+1).indexOf(Math.min(...trace.slice(peak+1)));return {peak:peak+1,rebound:rebound+1};},side);
   await p.evaluate(side=>{__test.reset();__test.gesture('slap',side);__test.render();},side);
   let previous=0;for(const [name,frame] of [['contact',0],['peak',phases.peak],['rebound',phases.rebound],['secondary',Math.max(phases.rebound+25,100)],['settled',1800]]){
    await p.evaluate(n=>{for(let i=0;i<n;i++)__test.step(1/120);__test.render();},frame-previous);previous=frame;
    await p.screenshot({path:path.join(out,`holly-${size.width}-${side}-${name}.png`)});
   }
   ok(await canvas(p)===rest,'fully settled exact resting pixels');
   await p.evaluate(side=>__test.forcePose(26,30,side),side);await p.screenshot({path:path.join(out,`holly-${size.width}-${side}-extreme.png`)});
  }
  // Actual simultaneous touch inputs, independent capture and directional flick.
  await p.evaluate(()=>__test.reset());
  const f=snap.framing,points=[[337,477],[481,484]].map(([x,y],i)=>({id:i+1,x:f.x+x/720*f.width,y:f.y+y/1280*f.height,radiusX:4,radiusY:4,force:.5}));
  const cdp=await fresh.context.newCDPSession(p);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:points});
  ok((await p.evaluate(()=>__peachPhysicsDebug.snapshot())).activePointers.length===2,'two simultaneous fingers');
  await p.evaluate(()=>{testClock+=20;});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:points.map((q,i)=>({...q,x:q.x+(i?15:-15),y:q.y+12}))});
  await p.evaluate(()=>{testClock+=20;});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[points[1]]});
  ok((await p.evaluate(()=>__peachPhysicsDebug.snapshot())).activePointers.length===1,'one finger remains');
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  ok((await p.evaluate(()=>__peachPhysicsDebug.snapshot())).flickCount>0,'velocity-driven flick');
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:points});await p.evaluate(()=>{testClock+=60;});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  ok((await p.evaluate(()=>__peachPhysicsDebug.snapshot())).activePointers.length===0,'simultaneous tap release');await cdp.detach();
 }
 // Inspect the full sampled deformation field at extreme bounded poses.
 metrics.fields=[];
 for(const size of sizes){
  const f=await setup(browser,'v8',size,true,false,'holly');await character(f.page,'holly');
  for(const side of [0,1])for(const [dx,dy] of [[26,30],[-26,-30],[26,-30],[-26,30]]){
   const field=await f.page.evaluate(({side,dx,dy})=>{
    __test.forcePose(dx,dy,side);const a=__test.pixels(),c=document.querySelector('#game'),f=__peachPhysicsDebug.snapshot().framing,dpr=c.width/innerWidth,scale=f.width/720*dpr;
    const disp=(x,y)=>{const i=((c.height-1-y)*c.width+x)*4;return [(a[i]/255+a[i+1]/65025-.5)*128,(a[i+2]/255+a[i+3]/65025-.5)*128]};
    let minDet=Infinity,maxOutside=0,maxTravel=0;
    for(let y=390;y<590;y+=2)for(let x=220;x<600;x+=2){
     const sx=Math.round((f.x+x/720*f.width)*dpr),sy=Math.round((f.y+y/1280*f.height)*dpr),d=disp(sx,sy),l=disp(sx-1,sy),r=disp(sx+1,sy),t=disp(sx,sy-1),b=disp(sx,sy+1);
     minDet=Math.min(minDet,(1-(r[0]-l[0])*scale/2)*(1-(b[1]-t[1])*scale/2)-(b[0]-t[0])*(r[1]-l[1])*scale*scale/4);maxTravel=Math.max(maxTravel,Math.hypot(...d));
     if([-2,0,2].every(xx=>[-2,0,2].every(yy=>__test.hollySkinWeight(side,x+xx,y+yy)===0)))maxOutside=Math.max(maxOutside,Math.hypot(...d));
    }return {side,dx,dy,minDet,maxOutside,maxTravel,error:__test.error()};
   },{side,dx,dy});
   ok(field.minDet>0,'no sampled folds');ok(field.maxOutside<.01,'outside support stationary');ok(field.maxTravel<10&&field.maxTravel>2,'controlled visible motion');ok(field.error===0,'WebGL error clear');metrics.fields.push({width:size.width,...field});
  }await f.context.close();
 }
 // Canvas remapping at all phone sizes; spatially varying motion and reset.
 for(const size of sizes){
  const fb=await setup(browser,'v8',size,true,true);await character(fb.page,'holly');const rest=await canvas(fb.page);
  await scenario(fb.page,'slap',0,0);await fb.page.evaluate(()=>__test.forcePose(26,30,0));ok(await canvas(fb.page)!==rest,'Canvas deforms');
  await fb.page.screenshot({path:path.join(out,`holly-${size.width}-canvas-extreme.png`)});
  await fb.page.evaluate(()=>__test.reset());ok(await canvas(fb.page)===rest,'Canvas reset exact');
  for(const id of ['ember','midnight','aurelia','holly'])await character(fb.page,id);ok(fb.errors.length===0,'Canvas switching without errors');await fb.context.close();
 }
 // Separate presets/settings; migration leaves v7-1 untouched.
 await p.evaluate(()=>{localStorage.clear();localStorage.setItem('peach-physics-v0071-active','aurelia');localStorage.setItem('peach-physics-v0071-profile-aurelia',JSON.stringify({version:2,preset:'playful',bounce:80,softness:79,settle:35,transfer:73,slapAudioEnabled:true}));});
 await p.reload();await p.waitForFunction(()=>window.__test&&document.querySelector('#loader').classList.contains('hiding'));
 ok((await p.evaluate(()=>__peachPhysicsDebug.snapshot())).model.transfer===73,'v7-1 profile imported');
 await character(p,'holly');
 for(const preset of ['natural','playful','chaos']){await p.evaluate(preset=>document.querySelector(`[data-preset="${preset}"]`).click(),preset);ok((await p.evaluate(()=>__peachPhysicsDebug.snapshot())).preset===preset,`${preset} preset`);}
 await p.evaluate(()=>{document.querySelector('#slapAudio').click();const t=document.querySelector('#transfer');t.value=100;t.dispatchEvent(new Event('input'));});
 await p.reload();await p.waitForFunction(()=>window.__test&&document.querySelector('#loader').classList.contains('hiding'));
 const saved=await p.evaluate(()=>__peachPhysicsDebug.snapshot());ok(saved.character==='holly'&&saved.preset==='chaos'&&saved.model.transfer===100&&saved.slapAudioEnabled,'Holly profile and active selection persist');
 await character(p,'aurelia');ok((await p.evaluate(()=>__peachPhysicsDebug.snapshot())).model.transfer===73,'other profile unaffected');
 ok(await p.evaluate(()=>JSON.parse(localStorage.getItem('peach-physics-v0071-profile-aurelia')).transfer===73),'v7-1 storage untouched');
 // Uninstrumented production app: offline caching and all four character cycle.
 const live=await browser.newContext({viewport:sizes[1],isMobile:true,hasTouch:true}),lp=await live.newPage(),errors=[];lp.on('pageerror',e=>errors.push(e.message));
 await lp.goto(`${base}/peach-physics/v8/`);await lp.evaluate(async()=>{await navigator.serviceWorker.register('./sw.js',{scope:'./'});await navigator.serviceWorker.ready;});await lp.waitForFunction(()=>navigator.serviceWorker.controller);
 ok(await lp.evaluate(async()=>!!await (await caches.open('peach-physics-v008-r1')).match('./assets/holly-heartbreaker.jpg')),'Holly precached');
 await live.setOffline(true);await lp.reload();await lp.waitForFunction(()=>window.__peachPhysicsDebug?.snapshot().frames>1);
 for(const id of ['midnight','aurelia','holly','ember']){await lp.locator('#character').click();await lp.waitForFunction(id=>__peachPhysicsDebug.snapshot().character===id,id);ok(true,`offline ${id}`);}
 ok(errors.length===0&&fresh.errors.length===0,'no uncaught errors');
 fs.writeFileSync(path.join(out,'holly.json'),JSON.stringify({checks,metrics},null,2));console.log(JSON.stringify({checks,strength,minimumDeterminant:Math.min(...metrics.fields.map(f=>f.minDet)),output:out}));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
