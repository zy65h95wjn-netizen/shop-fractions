// Visual evidence for the fabric A/B experiment: A (r9.1) and B (?fabric=strong) at identical
// spring states and 390x844 framing (device scale 2), WebGL and Canvas, plus 60 fps motion
// sequences. Writes PNGs and a manifest to PEACH_TEST_OUTPUT/fabric-captures; compose with
// holly-fabric-sheets.py.
const {chromium,fs,path,out,setup,character}=require('./harness.cjs');
const {STATES,drivePeak,OUTER}=require('./fabric-inputs.cjs');
const current=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8'),switchLine='const HOLLY_FABRIC=/[?&]fabric=strong(&|$)/.test(location.search);';
if(!current.includes(switchLine))throw Error('fabric switch not found');
const sources={A:path.join(out,'fabric-capture-A.html'),B:path.join(out,'fabric-capture-B.html')};
fs.writeFileSync(sources.A,current);fs.writeFileSync(sources.B,current.replace(switchLine,'const HOLLY_FABRIC=true;'));
const dir=path.join(out,'fabric-captures');fs.mkdirSync(dir,{recursive:true});
const STILLS=['natural tap peak','natural tap rebound','chaos tap peak','strong flick down','strong flick up','drag inward-up from outer cup','node-bound inward-up'];
// Motion: each starts at rest, records 48 frames at 1/60 s from the start of input.
const MOTION=[['natural-tap',{preset:'natural',tap:true}],['chaos-tap',{preset:'chaos',tap:true}],['flick-up',{preset:'natural',flick:[0,-70],at:'center'}],['drag-inward-up',{preset:'natural',drag:'inward',at:'outer'}]];
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const manifest={viewport:{width:390,height:844,deviceScaleFactor:2},framing:null,stills:[],motion:[]};
 const save=async(p,name)=>{const url=await p.evaluate(()=>{__test.render();return document.querySelector('#game').toDataURL();});fs.writeFileSync(path.join(dir,name+'.png'),Buffer.from(url.split(',')[1],'base64'));};
 for(const backend of ['webgl','canvas'])for(const v of ['A','B']){
  const app=await setup(browser,'v8',{width:390,height:844},true,backend==='canvas',false,sources[v]),p=app.page;await character(p,'holly');
  manifest.framing??=await p.evaluate(()=>__peachPhysicsDebug.snapshot().framing);
  await p.evaluate(()=>{document.querySelector('[data-preset="natural"]').click();__test.reset();});await save(p,`${backend}-${v}-rest`);
  for(const s of STATES.filter(s=>s.side<2&&STILLS.includes(s.name.slice(2)))){
   await drivePeak(p,s);const name=`${backend}-${v}-${s.name.replace(/\s+/g,'-')}`;await save(p,name);manifest.stills.push({backend,v,state:s.name,file:name+'.png'});
  }
  for(const [label,m] of MOTION)for(const side of [0,1]){
   if(backend==='canvas'&&label!=='natural-tap')continue;
   await p.evaluate(({m,side,OUTER})=>{
    document.querySelector(`[data-preset="${m.preset}"]`).click();__test.reset();__test.model.transfer=50;
    if(m.tap){__test.gesture('slap',side);window.__seq=[];return;}
    const c=document.querySelector('#game'),f=__peachPhysicsDebug.snapshot().framing;
    const [x,y]=m.at==='outer'?OUTER[side]:__test.currentCharacter().impactCenters[side],X=f.x+x/720*f.width,Y=f.y+y/1280*f.height;
    const [dx,dy]=m.drag?[45*(side?-1:1),-55]:m.flick;
    const fire=(type,a=0,b=0)=>c.dispatchEvent(new PointerEvent(type,{pointerId:21,pointerType:'touch',clientX:X+a,clientY:Y+b,bubbles:true}));
    fire('pointerdown');window.__seq=[1,2,3,4].map(k=>()=>{window.testClock+=12;fire('pointermove',dx*k/4,dy*k/4);});
    if(m.flick)window.__seq.push(()=>{window.testClock+=8;fire('pointerup',dx,dy);});
   },{m,side,OUTER});
   for(let fr=0;fr<48;fr++){
    const name=`motion-${backend}-${v}-${label}-${side?'R':'L'}-${String(fr).padStart(2,'0')}`;await save(p,name);manifest.motion.push({backend,v,label,side,frame:fr,file:name+'.png'});
    await p.evaluate(()=>{for(let i=0;i<2;i++){const f=window.__seq.shift();if(f)f();__test.step(1/120);}});
   }
  }
  if(app.errors.length)throw Error(app.errors.join('\n'));await app.context.close();
 }
 fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify(manifest,null,1));console.log('captures',manifest.stills.length+manifest.motion.length,'in',dir);
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
