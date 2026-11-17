const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});try{
 const p=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});const errors=[];p.on('pageerror',e=>errors.push(e.message));
 const url='https://zy65h95wjn-netizen.github.io/shop-fractions/peach-physics/previews/aurelia-comparison/?v=1';
 const r=await p.goto(url);assert(r.ok());assert.equal(await r.text(),fs.readFileSync(path.join(__dirname,'index.html'),'utf8'));
 await p.waitForFunction(()=>window.__aureliaComparison?.ready(),null,{polling:100});
 await p.locator('#auto').tap();assert.equal(await p.locator('#auto').getAttribute('aria-pressed'),'false');
 const target=await p.evaluate(()=>{const f=document.querySelector('iframe'),r=f.getBoundingClientRect(),s=f.contentWindow.__aureliaFrame.snapshot();return{x:r.x+s.framing.x+270/756*s.framing.width,y:r.y+s.framing.y+903/1280*s.framing.height}});
 await p.touchscreen.tap(target.x,target.y);assert(await p.evaluate(()=>__aureliaComparison.apis().every(a=>a.snapshot().slapCount===1)));
 await p.locator('#bounce').tap();await p.locator('#closeup').tap();await p.locator('button[data-view="blender"]').tap();
 assert(await p.locator('iframe[name="blender"]').isVisible());assert(!(await p.locator('iframe[name="peaches"]').isVisible()));
 await p.locator('button[data-view="both"]').tap();await p.locator('#closeup').tap();await p.locator('#preset').selectOption('natural');
 assert(await p.evaluate(()=>__aureliaComparison.apis().every(a=>a.snapshot().preset==='natural')));
 await p.screenshot({path:'/tmp/aurelia-comparison/live-phone.png'});assert.deepEqual(errors,[]);
 console.log({url,exactPublishedBytes:true,mirroredTouch:true,controls:true,phoneViewport:[390,844],errors,physicalSafariTested:false});
}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});
