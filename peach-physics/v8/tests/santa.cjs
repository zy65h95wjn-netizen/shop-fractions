// Browser acceptance for Santa. Uses native CDP touch sequences, the actual
// renderers, numerical constraints, and independently chosen scenery samples.
const {chromium,fs,path,assert,out,setup,canvas}=require('./harness.cjs');
const crypto=require('node:crypto');
const evidence=path.join(out,'santa');fs.mkdirSync(evidence,{recursive:true});
let checks=0;const ok=(v,label)=>{assert.ok(v,label);checks++;};
const report={checks:0,phases:[],framing:[],multitouch:[],errors:[],performance:[]};
const hook=`
window.__santa={velocity:santaVelocity,weight:santaWeight,mask:()=>santaMaskPixels,
 point:(x,y)=>({x:ox+x/W*drawW,y:oy+y/H*drawH}),
 pixels:()=>{render();if(fallback)return Array.from(ctx2.getImageData(0,0,canvas.width,canvas.height).data);const p=new Uint8Array(canvas.width*canvas.height*4);gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,p);return Array.from(p);},
 crop:(x,y,w,h)=>{render();const px=Math.round((ox+x/W*drawW)*canvas.width/cssW),py=Math.round((oy+y/H*drawH)*canvas.height/cssH),pw=Math.max(1,Math.round(w/W*drawW*canvas.width/cssW)),ph=Math.max(1,Math.round(h/H*drawH*canvas.height/cssH));if(fallback)return Array.from(ctx2.getImageData(px,py,pw,ph).data);const p=new Uint8Array(pw*ph*4);gl.readPixels(px,canvas.height-py-ph,pw,ph,gl.RGBA,gl.UNSIGNED_BYTE,p);return Array.from(p);},
 flow:(x,y)=>{const v=santaVelocity(x,y);let sx=x,sy=y;for(let k=0;k<6;k++){let w=santaWeight(sx,sy);sx-=v[0]*w/6;sy-=v[1]*w/6;}return [sx,sy];},
 laugh:startSantaLaugh,stopLaugh:stopSantaLaugh};
`;
const source=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const instrumented=path.join(out,'santa-hooks.html');fs.writeFileSync(instrumented,source.replace('presentCharacter();\ngetPhoto',hook+'\npresentCharacter();\ngetPhoto'));
async function santa(p){await p.evaluate(()=>__test.chooseCharacter(4));await p.waitForFunction(()=>__peachPhysicsDebug.snapshot().character==='santa');await p.evaluate(()=>{__test.resize();__test.reset();__test.render();});}
async function save(p,name){if(process.env.PEACH_CAPTURE==='0')return;fs.writeFileSync(path.join(evidence,name+'.png'),Buffer.from((await canvas(p)).split(',')[1],'base64'));}
const fixed={beard:[400,360,130,100],leftHand:[112,719,42,78],rightHand:[722,844,54,67],coat:[808,477,76,135],belt:[295,1055,260,45],elf:[50,228,138,260],scene:[850,45,90,180]};
async function stationary(p){return p.evaluate(rects=>Object.fromEntries(Object.entries(rects).map(([k,r])=>[k,__santa.crop(...r)])),fixed);}
async function preset(p,id){await p.evaluate(id=>{document.querySelector(`[data-preset="${id}"]`).click();__test.reset();},id);}
async function touch(client,type,points){await client.send('Input.dispatchTouchEvent',{type,touchPoints:points.map((p,i)=>({x:p.x,y:p.y,id:p.id||i+1,radiusX:6,radiusY:6,force:.6}))});}
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
 for(const fallback of (process.env.PEACH_BACKEND==='canvas'?[true]:process.env.PEACH_BACKEND==='webgl'?[false]:[false,true])){
  const backend=fallback?'canvas':'webgl';
  const app=await setup(browser,'v8',{width:390,height:844},true,fallback,false,instrumented),p=app.page;
  await santa(p);ok((await p.evaluate(()=>__peachPhysicsDebug.snapshot().renderer))===backend,backend+' is active');
  const rest=await canvas(p),scenery=await stationary(p);
  for(const name of ['natural','playful','chaos']){
   await preset(p,name);await save(p,`${backend}-${name}-rest`);
   const trace=await p.evaluate(()=>{__test.gesture('slap',0);const trace=[];for(let i=0;i<1200;i++){if(i) __test.step(1/120);trace.push({t:i/120,dy:__santa.velocity(410,820)[1],state:__test.raw()});}return trace;});
   const peak=trace.reduce((a,b)=>b.dy>a.dy?b:a),rebound=trace.filter(t=>t.t>peak.t).reduce((a,b)=>b.dy<a.dy?b:a);
   ok(peak.dy>15&&peak.dy<49,`${name} broad mass excursion`);ok(peak.t>.12,`${name} heavy delayed peak`);ok(rebound.dy< -2,`${name} rebounds`);
   ok(trace.every(t=>t.state.nodes.every(n=>Number.isFinite(n.dx+n.dy)&&Math.abs(n.dx)<=58&&Math.abs(n.dy)<=66)),name+' bounded');
   const phases=[['impact',0],['peak',Math.round(peak.t*120)],['rebound',Math.round(rebound.t*120)],['settling',Math.round((rebound.t+.9)*120)],['settled',1800]];
   await p.evaluate(()=>{__test.reset();__test.gesture('slap',0)});let prev=0;
   for(const [phase,frame] of phases){
    await p.evaluate(n=>{for(let i=0;i<n;i++)__test.step(1/120)},frame-prev);prev=frame;await save(p,`${backend}-${name}-${phase}`);
    assert.deepEqual(await stationary(p),scenery,`${backend}/${name}/${phase} fixed objects`);checks++;
    if(phase==='settled'){assert.equal(await canvas(p),rest);checks++;}
   }
   report.phases.push({backend,preset:name,peak:{seconds:peak.t,sourcePixels:peak.dy},rebound:{seconds:rebound.t,sourcePixels:rebound.dy}});
   // Consecutive rendered frames, not CSS animation or a fabricated motion mock.
   await p.evaluate(()=>{__test.reset();__test.gesture('slap',0)});
   const dir=path.join(evidence,`${backend}-${name}-motion`);fs.mkdirSync(dir,{recursive:true});
   for(let i=0;i<(process.env.PEACH_CAPTURE==='0'?0:75);i++){await p.evaluate(()=>{for(let j=0;j<4;j++)__test.step(1/120)});fs.writeFileSync(path.join(dir,`${String(i).padStart(3,'0')}.png`),Buffer.from((await canvas(p)).split(',')[1],'base64'));}
  }
  // Native multi-contact events (not dispatchEvent), retained separate capture IDs.
  const client=await app.context.newCDPSession(p);await preset(p,'natural');
  const points=await p.evaluate(()=>[__santa.point(355,790),__santa.point(572,790)]);
  await touch(client,'touchStart',points);let snap=await p.evaluate(()=>__peachPhysicsDebug.snapshot());
  ok(snap.activePointers.length===2,'native simultaneous two-contact capture');
  ok(new Set(snap.activePointers.map(p=>p.side)).size===2,'both belly targets captured');
  await p.evaluate(()=>window.testClock+=30);
  await touch(client,'touchMove',points.map((pt,i)=>({x:pt.x+(i?-24:24),y:pt.y+25})));
  snap=await p.evaluate(()=>__peachPhysicsDebug.snapshot());ok(snap.nodes.every(n=>Number.isFinite(n.dx+n.dy)),'two-finger drag finite');
  await p.evaluate(()=>window.testClock+=20);await touch(client,'touchEnd',[]);
  snap=await p.evaluate(()=>__peachPhysicsDebug.snapshot());ok(snap.activePointers.length===0&&snap.flickCount>=2,'two independent releases produce flicks');
  report.multitouch.push({backend,nativeContacts:2,flicks:snap.flickCount});
  assert.deepEqual(await stationary(p),scenery);checks++;
  // Directional flicks, cancel, same-side two touches and out-of-belly rejection.
  for(const [dx,dy] of [[45,0],[-45,0],[0,45],[0,-45]]){
   await p.evaluate(()=>__test.reset());await touch(client,'touchStart',[points[0]]);await p.evaluate(()=>window.testClock+=25);
   await touch(client,'touchMove',[{x:points[0].x+dx,y:points[0].y+dy}]);await p.evaluate(()=>window.testClock+=20);await touch(client,'touchEnd',[]);
   const v=await p.evaluate(()=>__santa.velocity(410,820));ok((dx?v[0]*dx:v[1]*dy)>0,'drag direction preserved');
   await p.evaluate(()=>{for(let i=0;i<18;i++)__test.step(1/120)});
   assert.deepEqual(await stationary(p),scenery);checks++;
  }
  await p.evaluate(()=>__test.reset());await touch(client,'touchStart',[points[0],{x:points[0].x+12,y:points[0].y+18}]);
  ok((await p.evaluate(()=>__peachPhysicsDebug.snapshot().activePointers.length))===2,'same-side multitouch');
  await touch(client,'touchCancel',[]);ok((await p.evaluate(()=>__peachPhysicsDebug.snapshot().activePointers.length))===0,'cancel releases both');
  for(const [x,y] of [[140,780],[750,880],[530,400],[480,1075],[120,350]]){
   const pt=await p.evaluate(([x,y])=>__santa.point(x,y),[x,y]);await touch(client,'touchStart',[pt]);ok((await p.evaluate(()=>__peachPhysicsDebug.snapshot().activePointers.length))===0,'stationary feature rejects input');await touch(client,'touchEnd',[]);
  }
  // A new drag during a large rebound must not snap back to the elves' bounds.
  await p.evaluate(()=>{__test.reset();for(const n of __test.nodes){n.dx=45;n.dy=50;}});
  await touch(client,'touchStart',[points[0]]);await p.evaluate(()=>window.testClock+=25);
  await touch(client,'touchMove',[{x:points[0].x+1,y:points[0].y+1}]);
  ok((await p.evaluate(()=>__test.nodes[1].dx))>=45,'drag preserves an already displaced heavy mass');
  await touch(client,'touchCancel',[]);await p.evaluate(()=>__test.reset());
  // Folding/strain checks use the actual calibrated field, not just node bounds.
  const stress=await p.evaluate(()=>{
   const results=[];
   for(const [dx,dy] of [[58,66],[-58,66],[58,-66],[-58,-66]]){
    __test.reset();for(const n of __test.nodes){n.dx=dx;n.dy=dy;}
    let minDet=Infinity,maxTravel=0;
    for(let y=530;y<1010;y+=10)for(let x=180;x<760;x+=10){
     const q=__santa.flow(x,y),a=__santa.flow(x+.5,y),b=__santa.flow(x,y+.5);
     const det=((a[0]-q[0])*(b[1]-q[1])-(a[1]-q[1])*(b[0]-q[0]))/.25;
     minDet=Math.min(minDet,det);maxTravel=Math.max(maxTravel,Math.hypot(q[0]-x,q[1]-y));
    }results.push({dx,dy,minDet,maxTravel});
   }__test.reset();return results;
  });
  ok(stress.every(s=>s.minDet>.15&&s.maxTravel<49),'extreme fields do not fold');report[backend+'Stress']=stress;
  for(const size of [{width:375,height:667},{width:390,height:844},{width:430,height:932},{width:440,height:956},{width:844,height:390}]){
   await p.setViewportSize(size);await p.evaluate(()=>{__test.resize();__test.reset();__test.render()});const snap=await p.evaluate(()=>__peachPhysicsDebug.snapshot()),f=snap.framing;
   ok(Math.abs(f.width/f.height-.8)<1e-10,'source aspect ratio');
   for(const [x,y] of [[470,180],[180,820],[760,790],[430,1015]]){const pt={x:f.x+x/1024*f.width,y:f.y+y/1280*f.height};ok(pt.x>=0&&pt.x<=size.width&&pt.y>=0&&pt.y<=size.height,'face and belly visible');}
   await save(p,`${backend}-framing-${size.width}x${size.height}`);report.framing.push({backend,size,framing:f});
  }
  await p.setViewportSize({width:390,height:844});await p.evaluate(()=>{__test.resize();__test.reset();document.querySelector('[data-preset="playful"]').click();document.querySelector('#santaLaugh').click();});
  ok((await p.evaluate(()=>__peachPhysicsDebug.snapshot().santaLaughEnabled))===true,'laugh opt-in');
  const beats=await p.evaluate(()=>{const a=[];for(let i=0;i<180;i++){__test.step(1/120);if(i%43===0)a.push(document.querySelector('#santaReaction').textContent);}return a;});
  ok(beats.includes('HO!')&&beats.includes('HO HO!')&&beats.includes('HO HO HO!'),'laugh synchronized to three pulses');
  await p.evaluate(()=>__test.reset());ok((await p.locator('#santaReaction').textContent())==='','reset cancels laugh');
  await p.evaluate(()=>__test.chooseCharacter(3));await p.waitForFunction(()=>__peachPhysicsDebug.snapshot().character==='holly');
  ok((await p.evaluate(()=>__peachPhysicsDebug.snapshot().model.bounce))===55,'Santa profile isolated from Holly');
  await santa(p);ok((await p.evaluate(()=>__peachPhysicsDebug.snapshot().model.bounce))===80,'Santa profile restored');
  report.errors.push(...app.errors);await app.context.close();console.log(backend+' Santa tests passed');
 }
 ok(report.errors.length===0,'no browser errors');report.checks=checks;
 fs.writeFileSync(path.join(evidence,'results.json'),JSON.stringify(report,null,2));console.log(`${checks} Santa checks passed`);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
