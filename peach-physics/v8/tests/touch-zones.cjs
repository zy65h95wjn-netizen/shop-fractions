const {chromium,fs,path,assert,root,out,base,setup,character,scenario,canvas}=require('./harness.cjs');
const {execFileSync}=require('node:child_process');
let checks=0;const ok=(v,label)=>{assert.ok(v,label);checks++};
// Constant coordinate offsets can differ by floating-point roundoff after CSS scaling.
function sameMotion(a,b){
 if(typeof a==='number'){assert.ok(Math.abs(a-b)<1e-9,`${a} differs from ${b}`);return;}
 assert.deepEqual(Object.keys(a),Object.keys(b));for(const k of Object.keys(a))sameMotion(a[k],b[k]);
}
const sizes=[{width:375,height:667},{width:390,height:844},{width:430,height:932},{width:440,height:956}];
// Native points inside the outlined side controls, covering arm, corset and outer area.
const zones=[[[150,550],[220,630],[330,690],[250,750]],[[650,550],[580,630],[470,690],[550,750]]];
const centers=[[337,477],[481,484]],outside=[[414,650],[100,900],[700,300],[440,800],[650,800],[600,450]];
async function input(p,point,kind='tap'){
 return p.evaluate(({point,kind})=>{
  __test.reset();__test.model.transfer=0;const snap=__peachPhysicsDebug.snapshot(),f=snap.framing,[w,h]=snap.image;
  const x=f.x+point[0]/w*f.width,y=f.y+point[1]/h*f.height,c=document.querySelector('#game');
  const fire=(type,dx=0,dy=0)=>c.dispatchEvent(new PointerEvent(type,{pointerId:41,pointerType:'touch',pressure:.5,clientX:x+dx,clientY:y+dy,bubbles:true}));
  fire('pointerdown');const captured=__peachPhysicsDebug.snapshot().activePointers.map(p=>p.side);
  if(kind!=='tap'){testClock+=20;fire('pointermove',10,14);testClock+=20;fire('pointermove',20,28);}
  testClock+=kind==='drag'?200:50;fire('pointerup',kind==='tap'?0:20,kind==='tap'?0:28);
  let trace=[];for(let i=0;i<180;i++){__test.step(1/120);if(i%6===0)trace.push(__test.raw());}
  return {captured,trace};
 },{point,kind});
}
(async()=>{
 const oldPath=path.join(out,'v8-r2-baseline.html');fs.writeFileSync(oldPath,execFileSync('git',['show','f1c0795a1d592787276d0abab953499a8314eb37:peach-physics/v8/index.html'],{cwd:root,maxBuffer:2e6}));
 const b=await chromium.launch({executablePath:process.env.CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const old=await setup(b,'v8',sizes[1],true,false,false,oldPath),fresh=await setup(b,'v8',sizes[1]),metrics={};
 // The new input targets must not change any existing calibrated gestures or rendering.
 for(const id of ['ember','midnight','aurelia']){
  await character(old.page,id);await character(fresh.page,id);
  for(const side of [0,1])for(const kind of ['slap','kick','drag','flick'])for(const link of [0,50,100]){
   assert.deepEqual(await scenario(fresh.page,kind,side,link),await scenario(old.page,kind,side,link));checks++;
  }
  for(const size of sizes){
   for(const app of [old,fresh]){await app.page.setViewportSize(size);await app.page.evaluate(()=>{__test.resize();__test.reset();});}
   for(const side of [0,1]){
    for(const app of [old,fresh])await app.page.evaluate(side=>__test.forcePose(26,30,side),side);
    ok(await canvas(old.page)===await canvas(fresh.page),`${id} extreme rendering unchanged ${size.width} side ${side}`);
   }
  }
 }
 await old.context.close();await fresh.context.close();
 for(const fallback of [false,true]){
  const app=await setup(b,'v8',sizes[0],true,fallback),p=app.page;await character(p,'holly');
  for(const size of sizes){
   await p.setViewportSize(size);await p.evaluate(()=>{__test.resize();__test.reset();});
   for(const side of [0,1]){
    const reference=await input(p,centers[side]);
    for(const point of zones[side]){
     const actual=await input(p,point);ok(actual.captured.length===1&&actual.captured[0]===side,`green ${point} maps to ${side}`);
     sameMotion(actual.trace,reference.trace);checks++;
    }
    for(const kind of ['drag','flick']){
     sameMotion((await input(p,zones[side][1],kind)).trace,(await input(p,centers[side],kind)).trace);checks++;
    }
   }
   for(const point of outside){const r=await input(p,point);ok(r.captured.length===0,`outside ${point} ignored`);ok(r.trace.every(t=>t.nodes.every(n=>!n.dx&&!n.dy)),'outside creates no motion');}
   // Real simultaneous touches on the new left/right controls, including captured
   // dragging beyond the marked boundary without changing side ownership.
   const snap=await p.evaluate(()=>__peachPhysicsDebug.snapshot()),f=snap.framing;
   const points=[[220,630],[580,630]].map(([x,y],i)=>({id:i+1,x:f.x+x/720*f.width,y:f.y+y/1280*f.height,radiusX:4,radiusY:4,force:.5}));
   const cdp=await app.context.newCDPSession(p);await p.evaluate(()=>__test.reset());
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:points});
   ok(JSON.stringify((await p.evaluate(()=>__peachPhysicsDebug.snapshot())).activePointers.map(p=>p.side))==='[0,1]','two independent green-zone touches');
   await p.evaluate(()=>{testClock+=20;});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:points.map((q,i)=>({...q,x:q.x+(i?-20:20),y:q.y-15}))});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[points[1]]});
   ok((await p.evaluate(()=>__peachPhysicsDebug.snapshot())).activePointers.length===1,'remaining finger captured');
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
   ok((await p.evaluate(()=>__peachPhysicsDebug.snapshot())).activePointers.length===0,'release clears capture');
   await cdp.detach();if(!fallback)ok(await p.evaluate(()=>__test.error())===0,'GL clear');
  }
  ok(app.errors.length===0,'no uncaught errors');await app.context.close();
 }
 // Production service worker and saved v8 preferences survive the r3 update.
 const live=await b.newContext({viewport:sizes[1],isMobile:true,hasTouch:true}),p=await live.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(`${base}/peach-physics/v8/`);
 await p.evaluate(()=>{localStorage.setItem('peach-physics-v008-active','holly');localStorage.setItem('peach-physics-v008-profile-holly',JSON.stringify({version:2,preset:'custom',bounce:100,softness:80,settle:25,transfer:0,slapAudioEnabled:false}));});
 await p.reload();await p.waitForFunction(()=>window.__peachPhysicsDebug?.snapshot().frames>1);
 let snap=await p.evaluate(()=>__peachPhysicsDebug.snapshot());ok(snap.character==='holly'&&snap.model.bounce===100&&snap.model.softness===80&&snap.model.settle===25&&snap.model.transfer===0,'saved r2 preference fields unchanged');
 await p.evaluate(async()=>{await navigator.serviceWorker.register('./sw.js',{scope:'./'});await navigator.serviceWorker.ready;});await p.waitForFunction(()=>navigator.serviceWorker.controller);
 ok(await p.evaluate(async()=>!!await (await caches.open('peach-physics-v008-r4')).match('./assets/holly-heartbreaker.jpg')),'r3 artwork cached');
 await live.setOffline(true);await p.reload();await p.waitForFunction(()=>window.__peachPhysicsDebug?.snapshot().frames>1);
 snap=await p.evaluate(()=>__peachPhysicsDebug.snapshot());const f=snap.framing;
 for(const [x,y] of [[220,630],[580,630]]){const before=await p.evaluate(()=>__peachPhysicsDebug.snapshot().slapCount);await p.touchscreen.tap(f.x+x/720*f.width,f.y+y/1280*f.height);ok((await p.evaluate(()=>__peachPhysicsDebug.snapshot().slapCount))===before+1,'green target works offline');}
 ok(errors.length===0,'offline production no errors');
 fs.writeFileSync(path.join(out,'touch-zones.json'),JSON.stringify({checks,sizes,zones,outside,referenceCommit:'f1c0795a1d592787276d0abab953499a8314eb37'},null,2));console.log(JSON.stringify({checks,output:out}));await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
