// Visual evidence for the Holly trim correction: r8 / r9 / current at identical spring states,
// identical 390x844 framing (device scale 2), WebGL and Canvas. Writes full-canvas PNGs and a
// manifest to PEACH_TEST_OUTPUT/fur-captures; holly-fur-sheets.py composes the review images.
const {chromium,fs,path,root,out,setup,character}=require('./harness.cjs');
const {execFileSync}=require('node:child_process');
const revisions={r8:'eea60679ddad1a5cb39701e1f73fe8872ccb7e60',r9:'8e4fcbb30b24decb8af7c03c6e39aa009541386c'};
const sources={current:path.join(__dirname,'../index.html')};
for(const [label,rev] of Object.entries(revisions)){sources[label]=path.join(out,`captures-${label}.html`);fs.writeFileSync(sources[label],execFileSync('git',['show',rev+':peach-physics/v8/index.html'],{cwd:root,maxBuffer:3e6}));}
const dir=path.join(out,'fur-captures');fs.mkdirSync(dir,{recursive:true});
const STILLS=[['rest',null],['natural-peak',{preset:'natural',steps:12}],['natural-rebound',{preset:'natural',steps:[37,35]}],['chaos-peak',{preset:'chaos',steps:12}],['large-down',{pose:[26,30]}],['large-up',{pose:[-26,-30]}],['large-up-plus-x',{pose:[26,-30]}]];
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const manifest={viewport:{width:390,height:844,deviceScaleFactor:2},framing:null,stills:[],motion:[]};
 const save=async(p,name)=>{const url=await p.evaluate(()=>{__test.render();return document.querySelector('#game').toDataURL();});fs.writeFileSync(path.join(dir,name+'.png'),Buffer.from(url.split(',')[1],'base64'));};
 for(const backend of ['webgl','canvas'])for(const version of ['r8','r9','current']){
  const app=await setup(browser,'v8',{width:390,height:844},true,backend==='canvas',false,sources[version]),p=app.page;await character(p,'holly');
  manifest.framing??=await p.evaluate(()=>__peachPhysicsDebug.snapshot().framing);
  for(const side of [0,1])for(const [state,s] of STILLS){
   await p.evaluate(({s,side})=>{
    document.querySelector(`[data-preset="${s?.preset||'natural'}"]`).click();__test.reset();__test.model.transfer=0;
    if(!s)return;if(s.pose){__test.forcePose(s.pose[0],s.pose[1],side);return;}
    __test.gesture('slap',side);const n=Array.isArray(s.steps)?s.steps[side]:s.steps;for(let i=0;i<n;i++)__test.step(1/120);
   },{s,side});
   const name=`${backend}-${version}-${side?'R':'L'}-${state}`;await save(p,name);manifest.stills.push({backend,version,side,state,file:name+'.png'});
  }
  // Continuous motion: one natural and one chaos slap per side, every 2 steps (1/60 s) for 0.8 s.
  if(backend==='webgl')for(const preset of ['natural','chaos'])for(const side of [0,1]){
   await p.evaluate(({preset,side})=>{document.querySelector(`[data-preset="${preset}"]`).click();__test.reset();__test.model.transfer=50;__test.gesture('slap',side);},{preset,side});
   for(let f=0;f<48;f++){const name=`motion-${version}-${preset}-${side?'R':'L'}-${String(f).padStart(2,'0')}`;await save(p,name);manifest.motion.push({version,preset,side,frame:f,file:name+'.png'});await p.evaluate(()=>{__test.step(1/120);__test.step(1/120);});}
  }
  if(app.errors.length)throw Error(app.errors.join('\n'));await app.context.close();
 }
 fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify(manifest,null,1));console.log('captures',manifest.stills.length+manifest.motion.length,'in',dir);
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
