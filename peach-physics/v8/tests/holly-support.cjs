// r7 comparison: closer framing and rendering-only garment support.
const {chromium,fs,path,assert,root,out,setup,character,scenario,canvas}=require('./harness.cjs');
const {execFileSync}=require('node:child_process');
const r7=execFileSync('git',['show','953f626c5fd4d71ff1fe475570fe3495f1b7c4cc:peach-physics/v8/index.html'],{cwd:root,maxBuffer:3e6}).toString();
const current=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const original=path.join(out,'support-r7.html'),matched=path.join(out,'support-r7-matched.html');
fs.writeFileSync(original,r7);
// Equal framing isolates the material change in the photographic comparisons.
const oldFit='Math.min(cssW/W,(cssH-topClear-bottomClear)/H):baseScale';
assert.ok(r7.includes(oldFit));fs.writeFileSync(matched,r7.replace(oldFit,'Math.min(cssW/W,(cssH-topClear-bottomClear)/H)*1.4:baseScale'));
let checks=0;const ok=(value,message)=>{assert.ok(value,message);checks++;};
const report={checks:0,framing:[],movement:[],errors:[]};
for(const [start,end] of [['function pickSide(','function compiler('],['function hollyMotionWeight(','const HOLLY_CROP=']]){
 assert.equal(current.slice(current.indexOf(start),current.indexOf(end)),r7.slice(r7.indexOf(start),r7.indexOf(end)));checks++;
}
const samplePoints=[{skin:[325,332],fur:[320,374],cup:[319,391]},{skin:[433,334],fur:[435,374],cup:[440,391]}];
async function natural(p){await p.evaluate(()=>{document.querySelector('[data-preset="natural"]').click();__test.reset();__test.model.transfer=0;});}
async function pose(p,side,phase){await natural(p);await p.evaluate(({side,phase})=>{
 if(phase==='large-down'||phase==='large-up'){__test.forcePose(phase==='large-down'?26:-26,phase==='large-down'?30:-30,side);return;}
 __test.gesture('slap',side);const n=phase==='peak'?12:phase==='rebound'?(side?35:37):960;
 for(let i=0;i<n;i++)__test.step(1/120);
 },{side,phase});}
async function save(p,name){fs.writeFileSync(path.join(out,name+'.png'),Buffer.from((await canvas(p)).split(',')[1],'base64'));}
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 for(const fallback of [false,true]){
  const backend=fallback?'canvas':'webgl';
  const before=await setup(browser,'v8',{width:390,height:844},true,fallback,false,original),after=await setup(browser,'v8',{width:390,height:844},true,fallback);
  for(const app of [before,after])await character(app.page,'holly');
  for(const size of [{width:375,height:667},{width:390,height:844}]){
   const frames=[];
   for(const app of [before,after]){await app.page.setViewportSize(size);frames.push(await app.page.evaluate(()=>{__test.resize();__test.render();return __peachPhysicsDebug.snapshot().framing;}));}
   ok(Math.abs(frames[1].width/frames[0].width-1.4)<1e-9,'Holly is 40% larger');
   ok(frames[1].y===frames[0].y,'head-safe top anchor retained');
   report.framing.push({backend,size,before:frames[0],after:frames[1]});
  }
  await save(before.page,`${backend}-r7-framing`);await save(after.page,`${backend}-r8-framing`);
  report.errors.push(...before.errors);await before.context.close();
  const same=await setup(browser,'v8',{width:390,height:844},true,fallback,false,matched);await character(same.page,'holly');
  // Equal zoom makes screen-space drag/flick inputs match in source space too.
  for(const side of [0,1])for(const kind of ['slap','drag','flick'])for(const link of [0,50,100]){
   assert.deepEqual(await scenario(same.page,kind,side,link),await scenario(after.page,kind,side,link));checks++;
  }
  await natural(same.page);await natural(after.page);const rest=await canvas(after.page);
  assert.equal(await canvas(same.page),rest);checks++;
  for(const side of [0,1])for(const phase of ['peak','rebound','large-down','large-up','settled']){
   for(const [label,app] of [['r7-matched',same],['r8',after]]){await pose(app.page,side,phase);await save(app.page,`${backend}-${label}-${side}-${phase}`);if(phase==='settled'){assert.equal(await canvas(app.page),rest);checks++;}}
  }
  report.errors.push(...same.errors,...after.errors);await same.context.close();await after.context.close();
 }
 // Read the actual WebGL texture-coordinate field, in source pixels, so zoom
 // cannot masquerade as a change in material response. Images remain primary.
 for(const [label,source] of [['r7',matched],['r8',null]]){
  const app=await setup(browser,'v8',{width:390,height:844},true,false,'holly',source);await character(app.page,'holly');
  for(const side of [0,1])for(const phase of ['peak','rebound','large-down','large-up']){
   await pose(app.page,side,phase);
   const samples=await app.page.evaluate(points=>{
    const c=document.querySelector('#game'),f=__peachPhysicsDebug.snapshot().framing,dpr=c.width/innerWidth,a=__test.pixels(),result={};
    for(const [name,[x,y]] of Object.entries(points)){
     const sx=Math.round((f.x+x/720*f.width)*dpr),sy=Math.round((f.y+y/1280*f.height)*dpr),at=((c.height-1-sy)*c.width+sx)*4;
     result[name]=Math.hypot((a[at]/255+a[at+1]/65025-.5)*128,(a[at+2]/255+a[at+3]/65025-.5)*128);
    }
    return result;
   },samplePoints[side]);
   report.movement.push({label,side,phase,samples});
  }
  ok(await app.page.evaluate(()=>__test.error())===0,'field renderer has no GL errors');report.errors.push(...app.errors);await app.context.close();
 }
 for(const side of [0,1]){
  const a=report.movement.find(m=>m.label==='r7'&&m.side===side&&m.phase==='peak').samples,b=report.movement.find(m=>m.label==='r8'&&m.side===side&&m.phase==='peak').samples;
  ok(b.skin>6&&b.skin>a.skin*.85,'skin retains visible peak motion');
  for(const material of ['fur','cup'])ok(b[material]>a[material]*.25&&b[material]<a[material]*.85,`${material} retains reduced nonzero motion`);
 }
 ok(report.errors.length===0,'no browser errors');report.checks=checks;
 fs.writeFileSync(path.join(out,'holly-support.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
