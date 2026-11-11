// Small final delivery checks: links, backend parity, isolation and GL recovery.
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../../..'),dir=path.resolve(__dirname,'..');
(async()=>{
 const source=fs.readFileSync(path.join(root,'peach-physics/v8/index.html'),'utf8'),runner=fs.readFileSync(path.join(dir,'r6.html'),'utf8');
 const section=(s,a,b)=>s.slice(s.indexOf(a),s.indexOf(b,s.indexOf(a)));
 for(const [a,b] of [['function step(dt){','function openPanel(flag)'],['const HOLLY_RIGHT_TOUCH=','const HOLLY_CROP='],['function hollyVelocity(','// Bilinear CPU']])assert.equal(section(source,a,b),section(runner,a,b),`${a} unchanged`);
 assert.ok(!runner.includes('rel="manifest"'));
 const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:2});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{requestAnimationFrame=()=>0;localStorage.setItem('peach-physics-v008-active','midnight');localStorage.setItem('peach-physics-v008-profile-holly','untouched sentinel');});
 await page.goto('http://127.0.0.1:8000/peach-physics/experiments/holly-layered/r6.html?mode=layered');await page.waitForFunction(()=>window.__hollyLab?.ready());
 await page.evaluate(()=>{__hollyLab.reset();__hollyLab.render();});
 const rest=await page.evaluate(()=>__hollyLab.capture());
 await page.evaluate(()=>{const r=__hollyLab.renderer;window.recoveryExtension=r.gl.getExtension('WEBGL_lose_context');recoveryExtension.loseContext();});
 await page.waitForFunction(()=>!__hollyLab.renderer.ready);
 await page.evaluate(()=>recoveryExtension.restoreContext());await page.waitForFunction(()=>__hollyLab.renderer.ready);
 assert.equal(await page.evaluate(()=>__hollyLab.capture()),rest,'context restore redraws unchanged state');
 for(const id of [0,1,2,3]){await page.evaluate(id=>__hollyLab.chooseCharacter(id),id);await page.waitForFunction(id=>__peachPhysicsDebug.snapshot().character===['ember','midnight','aurelia','holly'][id],id);await page.evaluate(()=>__hollyLab.render());assert.equal(await page.locator('#hollyLayers').evaluate(el=>el.style.display),id===3?'block':'none');}
 assert.deepEqual(await page.evaluate(()=>[localStorage.getItem('peach-physics-v008-active'),localStorage.getItem('peach-physics-v008-profile-holly')]),['midnight','untouched sentinel']);
 assert.deepEqual(errors,[]);
 await page.goto('http://127.0.0.1:8000/peach-physics/experiments/holly-layered/');
 const paths=await page.locator('a[href],video[src]').evaluateAll(els=>els.map(e=>e.href||e.src));
 for(const url of paths){const r=await page.request.get(url);assert.equal(r.status(),200,url);}
 await b.close();console.log('Solver/input/source blocks, preference isolation, legacy dispatch, GL recovery and review links pass.');
})().catch(e=>{console.error(e);process.exit(1)});
