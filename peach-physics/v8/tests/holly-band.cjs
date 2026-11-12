// Local upper-band support versus r8; all instrumentation stays in test responses.
const {chromium,fs,path,assert,root,out,setup,character,scenario,canvas}=require('./harness.cjs');
const {execFileSync}=require('node:child_process');
const baseline='eea60679ddad1a5cb39701e1f73fe8872ccb7e60';
const r8=execFileSync('git',['show',baseline+':peach-physics/v8/index.html'],{cwd:root,maxBuffer:3e6}).toString();
const current=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const sources={};
for(const [label,html] of [['r8',r8],['r9',current]]){
 const marker='presentCharacter();\ngetPhoto';assert.ok(html.includes(marker));sources[label]=path.join(out,`band-${label}.html`);
 fs.writeFileSync(sources[label],html.replace(marker,'window.__bandReview=()=>({crop:HOLLY_CROP,mask:Array.from(hollyMaskPixels)});\n'+marker));
}
let checks=0;const ok=(value,message)=>{assert.ok(value,message);checks++;};
const samplePoints=[
 {skinUpper:[320,315],skinCenter:[325,332],skinNearFur:[325,350],furOuter:[286,360],furMiddle:[320,374],cupBand:[319,391],innerAttach:[353,386],lowerCup:[310,416]},
 {skinUpper:[436,315],skinCenter:[433,334],skinNearFur:[433,350],furOuter:[474,357],furMiddle:[440,374],cupBand:[440,391],innerAttach:[410,386],lowerCup:[450,416]}
];
const report={baseline,checks:0,samplePoints,framing:[],mask:null,movement:[],errors:[]};
for(const [start,end] of [['const CHARACTERS=','const CHARACTER_KEY='],['function resize(){','function compiler('],['const HOLLY_CONTOURS=','function buildHollyMask(){']]){
 assert.ok(current.includes(start)&&current.includes(end));assert.equal(current.slice(current.indexOf(start),current.indexOf(end)),r8.slice(r8.indexOf(start),r8.indexOf(end)));checks++;
}
async function natural(p){await p.evaluate(()=>{document.querySelector('[data-preset="natural"]').click();__test.reset();__test.model.transfer=0;});}
async function pose(p,side,phase){await natural(p);await p.evaluate(({side,phase})=>{
 if(phase==='large-down'||phase==='large-up'){__test.forcePose(phase==='large-down'?26:-26,phase==='large-down'?30:-30,side);return;}
 if(phase==='rest')return;__test.gesture('slap',side);
 const n=phase==='impact'?0:phase==='peak'?12:phase==='rebound'?(side?35:37):960;
 for(let i=0;i<n;i++)__test.step(1/120);
 },{side,phase});}
async function save(p,name){fs.writeFileSync(path.join(out,name+'.png'),Buffer.from((await canvas(p)).split(',')[1],'base64'));}
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 for(const fallback of [false,true]){
  const backend=fallback?'canvas':'webgl',apps={};
  for(const label of ['r8','r9']){apps[label]=await setup(browser,'v8',{width:390,height:844},true,fallback,false,sources[label]);await character(apps[label].page,'holly');}
  for(const size of [{width:375,height:667},{width:390,height:844}]){
   const frames=[];
   for(const app of Object.values(apps)){await app.page.setViewportSize(size);frames.push(await app.page.evaluate(()=>{__test.resize();__test.render();return __peachPhysicsDebug.snapshot().framing;}));}
   assert.deepEqual(frames[0],frames[1]);checks++;report.framing.push({backend,size,framing:frames[1]});
  }
  const before=apps.r8.page,after=apps.r9.page;
  if(!fallback){
   const a=await before.evaluate(()=>__bandReview()),b=await after.evaluate(()=>__bandReview());assert.deepEqual(a.crop,b.crop);checks++;
   const [cx,cy,w,h]=a.crop,changed=[0,0],bounds=[Infinity,Infinity,-Infinity,-Infinity];let increased=0;
   for(let y=0;y<h;y++)for(let x=0;x<w;x++)for(let side=0;side<2;side++){
    const at=(y*w+x)*4+side;if(b.mask[at]>a.mask[at])increased++;
    if(a.mask[at]!==b.mask[at]){changed[side]++;bounds[0]=Math.min(bounds[0],cx+x);bounds[1]=Math.min(bounds[1],cy+y);bounds[2]=Math.max(bounds[2],cx+x);bounds[3]=Math.max(bounds[3],cy+y);}
   }
   ok(increased===0&&changed.every(n=>n>0),'both sides gain localized support');
   // Independent photo-coordinate rectangles: exposed skin, lower cup and lacing.
   const preserved=[[300,300,350,340],[410,300,460,340],[300,414,315,423],[448,414,460,423],[369,380,391,420]];
   for(const [x0,y0,x1,y1] of preserved){let mismatches=0;for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)for(let s=0;s<2;s++){const at=((y-cy)*w+x-cx)*4+s;if(a.mask[at]!==b.mask[at])mismatches++;}ok(mismatches===0,'skin/lower-cup/lacing support preserved');}
   report.mask={changedPixelsPerSide:changed,changedBounds:bounds,preservedRectangles:preserved};
  }
  for(const side of [0,1])for(const kind of ['slap','drag','flick'])for(const link of [0,50,100]){assert.deepEqual(await scenario(before,kind,side,link),await scenario(after,kind,side,link));checks++;}
  await natural(before);await natural(after);const rest=await canvas(after);assert.equal(await canvas(before),rest);checks++;
  for(const side of [0,1])for(const phase of ['rest','impact','peak','rebound','large-down','large-up','settled'])for(const [label,app] of Object.entries(apps)){
   await pose(app.page,side,phase);await save(app.page,`${backend}-${label}-${side}-${phase}`);
   if(phase==='settled'){assert.equal(await canvas(app.page),rest);checks++;}
  }
  for(const app of Object.values(apps)){report.errors.push(...app.errors);await app.context.close();}
 }
 // Read actual GPU texture-coordinate travel; visual comparison remains primary.
 for(const label of ['r8','r9']){
  const app=await setup(browser,'v8',{width:390,height:844},true,false,'holly',sources[label]);await character(app.page,'holly');
  for(const side of [0,1])for(const phase of ['peak','rebound','large-down','large-up']){
   await pose(app.page,side,phase);
   const samples=await app.page.evaluate(points=>{
    const c=document.querySelector('#game'),f=__peachPhysicsDebug.snapshot().framing,dpr=c.width/innerWidth,a=__test.pixels(),result={};
    for(const [name,[x,y]] of Object.entries(points)){
     const sx=Math.round((f.x+x/720*f.width)*dpr),sy=Math.round((f.y+y/1280*f.height)*dpr),at=((c.height-1-sy)*c.width+sx)*4;
     result[name]=Math.hypot((a[at]/255+a[at+1]/65025-.5)*128,(a[at+2]/255+a[at+3]/65025-.5)*128);
    }return result;
   },samplePoints[side]);report.movement.push({label,side,phase,samples});
  }
  ok(await app.page.evaluate(()=>__test.error())===0,'field renderer has no GL errors');report.errors.push(...app.errors);await app.context.close();
 }
 for(const side of [0,1])for(const phase of ['peak','rebound','large-down','large-up']){
  const a=report.movement.find(m=>m.label==='r8'&&m.side===side&&m.phase===phase).samples,b=report.movement.find(m=>m.label==='r9'&&m.side===side&&m.phase===phase).samples;
  for(const point of ['skinUpper','skinCenter'])ok(Math.abs(b[point]-a[point])<.01,'exposed skin field remains unchanged');
  if(phase==='peak')for(const point of ['furMiddle','cupBand'])ok(b[point]>.4*a[point]&&b[point]<.95*a[point],'band retains reduced nonzero motion');
 }
 ok(report.errors.length===0,'no browser errors');report.checks=checks;
 fs.writeFileSync(path.join(out,'holly-band.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
