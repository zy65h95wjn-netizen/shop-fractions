// Compare manual Bounce trajectories against v8. Preview 2 intentionally changes Auto; verify-clap.cjs covers that input.
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
const dir=__dirname,v8=path.resolve(dir,'../../v8');
let source=fs.readFileSync(path.join(v8,'index.html'),'utf8');
source=source.replace('<script src="./motion.js?v=r14-auto2"></script>',`<script>window.previewStorage={getItem:key=>key.endsWith('-active')?'aurelia':null,setItem:()=>{}};</script><script>${fs.readFileSync(path.join(v8,'motion.js'),'utf8').replace('win.localStorage','win.previewStorage')}</script>`);
source=source.replaceAll('localStorage','previewStorage').replaceAll('requestAnimationFrame(loop)','void 0');
source=source.replace(/ CHARACTERS.forEach\(\(c,index\)=>.*?\);\n/,'');
source=source.replace('presentCharacter();\ngetPhoto',`
window.__native={ready:()=>!!img,configure:(preset,auto)=>{Object.assign(model,currentPresets()[preset]);reset();let seed=8147;motion.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};motion.time=0;motion.quietUntil=0;motion.autoDrive=null;motion.setAuto(auto)},tick:dt=>{motion.tick(dt);step(dt)},bounce:bounceBoth,raw:()=>JSON.parse(JSON.stringify({nodes,followers,impacts,waves}))};
presentCharacter();\ngetPhoto`);
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});let comparisons=0;try{
 const p=await b.newPage();await p.addInitScript(()=>{const r=requestAnimationFrame;window.requestAnimationFrame=f=>r(t=>{if(!window.testPaused)f(t)})});
 await p.route('http://localhost/preview',r=>r.fulfill({contentType:'text/html',body:fs.readFileSync(path.join(dir,'index.html'),'utf8')}));await p.goto('http://localhost/preview');await p.waitForFunction(()=>__aureliaComparison.ready(),null,{polling:100});await p.evaluate(()=>testPaused=true);
 const n=await b.newPage();await n.route('http://localhost/native/',r=>r.fulfill({contentType:'text/html',body:source}));await n.route('**/assets/aurelia-frost.jpg',r=>r.fulfill({contentType:'image/jpeg',body:fs.readFileSync(path.join(v8,'assets/aurelia-frost.jpg'))}));await n.goto('http://localhost/native/');await n.waitForFunction(()=>window.__native?.ready(),null,{polling:100});
 for(const preset of ['natural','playful','chaos'])for(const auto of [false]){
  await p.evaluate(({preset,auto})=>{const a=__aureliaComparison.apis()[0];a.preset(preset);a.auto(auto);if(!auto)a.bounce()},{preset,auto});
  await n.evaluate(({preset,auto})=>{__native.configure(preset,auto);if(!auto)__native.bounce()},{preset,auto});
  for(let sample=0;sample<12;sample++){
   const [a,c]=await Promise.all([p.evaluate(()=>{const a=__aureliaComparison.apis()[0];for(let i=0;i<30;i++)a.tick(1/120);return a.raw()}),n.evaluate(()=>{for(let i=0;i<30;i++)__native.tick(1/120);return __native.raw()})]);
   assert.deepEqual(a,c,'original v8 trajectory: '+preset+' auto='+auto+' sample='+sample);comparisons++;
  }
 }
 console.log({exactBaselineSnapshots:comparisons});
}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});
