const {chromium,fs,path,assert,out,base,setup,character,scenario,canvas}=require('./harness.cjs');
let checks=0;const ok=(v,label)=>{assert.ok(v,label);checks++};
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const sizes=[{width:375,height:667},{width:390,height:844},{width:430,height:932},{width:440,height:956}],metrics={};
 const fresh=await setup(browser,'v8'),old=await setup(browser,'v6-2-3'),p=fresh.page;
 for(const size of sizes){
  const key=`${size.width}x${size.height}`;metrics[key]={};
  await p.setViewportSize(size);await old.page.setViewportSize(size);
  for(const id of ['ember','midnight']){
   await character(p,id);await character(old.page,id);
   ok(await canvas(p)===await canvas(old.page),`${key} ${id} rest pixel-identical`);
   for(const side of [0,1])for(const kind of ['slap','flick']){
    for(const pg of [p,old.page])await pg.evaluate(({side,kind})=>{__test.model.transfer=50;__test.reset();__test.gesture(kind,side);},{side,kind});
    for(const steps of [6,8,16]){
     for(const pg of [p,old.page])await pg.evaluate(n=>{for(let i=0;i<n;i++)__test.step(1/120);},steps);
     ok(await canvas(p)===await canvas(old.page),`${key} ${id} ${kind} ${side} matched rendered frame`);
    }
   }
  }
  await character(p,'aurelia');
  const snap=await p.evaluate(()=>__peachPhysicsDebug.snapshot());ok(snap.image[0]===756&&snap.image[1]===1280,`${key} native dimensions`);
  ok(Math.abs(snap.framing.width/snap.framing.height-756/1280)<1e-9,`${key} native aspect`);
  ok(snap.framing.y>=54,`${key} hat top-safe`);
  ok(snap.renderer==='webgl',`${key} WebGL initialized`);
  const stable=await p.evaluate(()=>{
   __test.reset();const rest=__test.pixels(),c=document.querySelector('#game'),f=__peachPhysicsDebug.snapshot().framing,dpr=c.width/innerWidth;
   const count=(pixels,box)=>{let changed=0,max=0;for(let y=box[1];y<box[3];y++)for(let x=box[0];x<box[2];x++){
    const sx=Math.round((f.x+x/756*f.width)*dpr),sy=Math.round((f.y+y/1280*f.height)*dpr);if(sx<0||sx>=c.width||sy<0||sy>=c.height)continue;
    const at=((c.height-1-sy)*c.width+sx)*4;let d=0;for(let k=0;k<3;k++)d=Math.max(d,Math.abs(pixels[at+k]-rest[at+k]));if(d>0)changed++;max=Math.max(max,d);
   }return {changed,max};};
   const boxes={corset:[250,600,500,735],fur:[245,752,305,768],center:[397,875,402,985],leftThigh:[170,1030,360,1145],rightThigh:[420,1030,600,1145],background:[650,800,720,1100],stockings:[185,1190,300,1230],head:[280,100,460,270],leftSkin:[220,840,345,970],rightSkin:[460,850,560,980]};
   const results=[];for(const side of [0,1])for(const [dx,dy] of [[26,30],[-26,-30],[26,-30],[-26,30]]){__test.forcePose(dx,dy,side);const posedPixels=__test.pixels();results.push({side,dx,dy,boxes:Object.fromEntries(Object.entries(boxes).map(([k,v])=>[k,count(posedPixels,v)]))});}
   return results;
  });metrics[key].boundaries=stable;
  for(const result of stable)for(const [name,value] of Object.entries(result.boxes)){
   const moving=name===(result.side===0?'leftSkin':'rightSkin');ok(moving?value.changed>1000:value.changed===0,`${key} ${result.side} ${result.dx}/${result.dy} ${name} ${JSON.stringify(value)}`);
  }
  await p.addStyleTag({content:'#loader,#hint,#characterToast,.slap-burst,#pulse{display:none!important}'});
  for(const side of [0,1]){
   await p.evaluate(()=>{__test.reset();__test.model.transfer=0;});
   await p.screenshot({path:path.join(out,`${key}-aurelia-${side}-rest.png`)});
   await p.evaluate(side=>__test.gesture('slap',side),side);
   for(const [label,steps] of [['impact',0],['peak',14],['settling',46]]){
    await p.evaluate(n=>{for(let i=0;i<n;i++)__test.step(1/120);__test.render();},steps);
    await p.screenshot({path:path.join(out,`${key}-aurelia-${side}-${label}.png`)});
   }
   for(const [dx,dy] of [[26,30],[-26,-30],[26,-30],[-26,30]]){
    await p.evaluate(({dx,dy,side})=>__test.forcePose(dx,dy,side),{dx,dy,side});
    await p.screenshot({path:path.join(out,`${key}-aurelia-${side}-stress-${dx}-${dy}.png`)});
   }
  }
  // Real CDP touches, with controlled animation only to make assertions repeatable.
  for(const id of ['ember','midnight','aurelia']){
   await character(p,id);const data=await p.evaluate(()=>({s:__peachPhysicsDebug.snapshot(),c:__test.currentCharacter()}));
   const f=data.s.framing,[w,h]=data.s.image,points=data.c.impactCenters.map(([x,y],i)=>({id:i+1,x:f.x+x/w*f.width,y:f.y+y/h*f.height,radiusX:4,radiusY:4,force:1}));
   const cdp=await fresh.context.newCDPSession(p);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:points});
   ok((await p.evaluate(()=>__peachPhysicsDebug.snapshot())).activePointers.length===2,`${key} ${id} two touches`);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:points.map((q,i)=>({...q,x:q.x+(i?12:-12),y:q.y+10}))});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[points[1]]});
   ok((await p.evaluate(()=>__peachPhysicsDebug.snapshot())).activePointers.length===1,`${key} ${id} one remains`);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   await p.touchscreen.tap(points[0].x,points[0].y);ok((await p.evaluate(()=>__peachPhysicsDebug.snapshot())).slapCount>0,`${key} ${id} actual tap`);await cdp.detach();
  }
 }
 await character(p,'aurelia');metrics.transfer={};
 for(const kind of ['slap','kick','drag','flick'])for(const side of [0,1]){
  let prior=-1;for(const transfer of [0,50,100]){
   const trace=await scenario(p,kind,side,transfer),peak=Math.max(...trace.map(t=>Math.hypot(t.nodes[(1-side)*3+1].dx,t.nodes[(1-side)*3+1].dy)));
   metrics.transfer[`${kind}-${side}-${transfer}`]=peak;ok(transfer===0?peak===0:peak>prior,`${kind} ${side} linked ${transfer}`);prior=peak;
   ok(trace.every(t=>t.nodes.every(n=>Number.isFinite(n.dx)&&Math.abs(n.dx)<=26&&Math.abs(n.dy)<=30)),`${kind} bounded`);
  }
 }
 const variation=await p.evaluate(()=>{const result=[];for(const [x,y] of [[250,835],[280,970]]){__test.reset();__test.slap(0,x,y,{sx:0,sy:0});result.push(__test.raw().nodes);}return result;});ok(JSON.stringify(variation[0])!==JSON.stringify(variation[1]),'position-dependent tap');
 const settled=await p.evaluate(()=>{__test.reset();__test.gesture('slap',0);let secondary=false;for(let i=0;i<1200;i++){__test.step(1/120);secondary||=Math.abs(__test.followers[0].dy)>.05;}return {secondary,raw:__test.raw()};});
 ok(settled.secondary,'secondary oscillation');ok(settled.raw.nodes.every(n=>n.dx===0&&n.dy===0),'settling');
 // All profile fields, including audio and selected preset, survive cycling and reload.
 for(const [i,id] of ['ember','midnight','aurelia'].entries()){
  await character(p,id);await p.evaluate(i=>{document.querySelector(`[data-preset="${['natural','playful','chaos'][i]}"]`).click();for(const [key,value] of Object.entries({bounce:41+i,softness:51+i,settle:61+i,transfer:71+i})){const el=document.getElementById(key);el.value=value;el.dispatchEvent(new Event('input'));}if(i!==1)document.querySelector('#slapAudio').click();},i);
 }
 await p.reload();await p.waitForFunction(()=>window.__test&&document.querySelector('#loader').classList.contains('hiding'));
 ok((await p.evaluate(()=>__peachPhysicsDebug.snapshot())).character==='aurelia','saved active third character');
 for(const [i,id] of ['ember','midnight','aurelia'].entries()){
  await character(p,id);const s=await p.evaluate(()=>__peachPhysicsDebug.snapshot());ok(s.model.bounce===41+i&&s.model.softness===51+i&&s.model.settle===61+i&&s.model.transfer===71+i&&s.preset==='custom'&&s.slapAudioEnabled===(i!==1),`${id} full independent profile`);
  for(const preset of ['natural','playful','chaos']){await p.evaluate(name=>document.querySelector(`[data-preset="${name}"]`).click(),preset);ok((await p.evaluate(()=>__peachPhysicsDebug.snapshot())).preset===preset,`${id} ${preset}`);}
 }
 for(const id of ['holly','ember','midnight','aurelia']){await p.locator('#character').click();await p.waitForFunction(id=>__peachPhysicsDebug.snapshot().character===id,id);ok(await p.locator('#characterToast').textContent()===`${{ember:'Winter Ember',midnight:'Midnight Yule',aurelia:'Aurelia Frost',holly:'Holly Heartbreaker'}[id]} · ${['ember','midnight','aurelia','holly'].indexOf(id)+1}/4`,'cycle and toast');}
 for(const size of sizes){const fb=await setup(browser,'v8',size,true,true);for(const id of ['ember','midnight','aurelia']){await character(fb.page,id);await scenario(fb.page,'slap',0,100);await fb.page.evaluate(()=>__test.render());ok((await fb.page.evaluate(()=>__peachPhysicsDebug.snapshot())).renderer==='canvas',`${id} fallback ${size.width}`);}ok(fb.errors.length===0,'fallback no errors');await fb.context.close();}
 // Final texture coordinates across BOTH supports, not just selected pixel patches.
 const field=await setup(browser,'v8',sizes[3],true,false,true);await character(field.page,'aurelia');
 metrics.fields=[];
 for(const side of [0,1])for(const [dx,dy] of [[0,10],[26,30],[-26,-30],[26,-30],[-26,30]]){
  const m=await field.page.evaluate(({side,dx,dy})=>{
   __test.forcePose(dx,dy,side);const a=__test.pixels(),c=document.querySelector('#game'),f=__peachPhysicsDebug.snapshot().framing,dpr=c.width/innerWidth,scale=f.width/756*dpr;
   const disp=(x,y)=>{const at=((c.height-1-y)*c.width+x)*4;return [(a[at]/255+a[at+1]/65025-.5)*128,(a[at+2]/255+a[at+3]/65025-.5)*128]};
   const at=(x,y)=>disp(Math.round((f.x+x/756*f.width)*dpr),Math.round((f.y+y/1280*f.height)*dpr));
   let minDet=Infinity,maxOutside=0,moving=0,minAt;
   for(let y=750;y<1100;y+=2)for(let x=100;x<660;x+=2){
    const sx=Math.round((f.x+x/756*f.width)*dpr),sy=Math.round((f.y+y/1280*f.height)*dpr),d=disp(sx,sy),l=disp(sx-1,sy),r=disp(sx+1,sy),t=disp(sx,sy-1),b=disp(sx,sy+1);
    const det=(1-(r[0]-l[0])*scale/2)*(1-(b[1]-t[1])*scale/2)-(b[0]-t[0])*(r[1]-l[1])*scale*scale/4;
    if(det<minDet){minDet=det;minAt=[x,y];}if(Math.hypot(...d)>1)moving++;
    // Two-source-pixel margin accounts for raster interpolation and screen rounding.
    if([-2,0,2].every(xx=>[-2,0,2].every(yy=>__test.skinWeight(side,x+xx,y+yy)===0)))maxOutside=Math.max(maxOutside,Math.hypot(...d));
   }
   return {side,dx,dy,minDet,minAt,maxOutside,moving,center:at(side?515:265,905),offset:at(side?555:320,905),error:__test.error()};
  },{side,dx,dy});metrics.fields.push(m);ok(m.error===0,'field GL error');ok(m.minDet>0,`no folds ${JSON.stringify(m)}`);ok(m.maxOutside<.01,`outside support anchored ${JSON.stringify(m)}`);ok(Math.hypot(m.center[0]-m.offset[0],m.center[1]-m.offset[1])>.2,'interior varies');
 }
 // The same production service worker precaches the exact original artwork.
 const offline=await browser.newContext({viewport:sizes[1]});const op=await offline.newPage();await op.goto(`${base}/peach-physics/v8/`);
 await op.evaluate(async()=>{await navigator.serviceWorker.register('./sw.js',{scope:'./'});await navigator.serviceWorker.ready;});await op.waitForFunction(()=>navigator.serviceWorker.controller);
 const cached=await op.evaluate(async()=>{const c=await caches.open('peach-physics-v008-r4');return (await c.keys()).map(r=>r.url);});ok(cached.some(u=>u.endsWith('/assets/aurelia-frost.jpg')),'artwork precached');
 await offline.setOffline(true);await op.reload();await op.waitForFunction(()=>window.__peachPhysicsDebug?.snapshot().frames>1);
 for(const id of ['midnight','aurelia','holly','ember']){await op.locator('#character').click();await op.waitForFunction(id=>__peachPhysicsDebug.snapshot().character===id,id);ok(true,`offline ${id}`);}
 ok(fresh.errors.length===0&&old.errors.length===0&&field.errors.length===0,'no uncaught errors');
 fs.writeFileSync(path.join(out,'aurelia.json'),JSON.stringify({checks,metrics},null,2));console.log(JSON.stringify({checks,fields:metrics.fields,output:out}));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
