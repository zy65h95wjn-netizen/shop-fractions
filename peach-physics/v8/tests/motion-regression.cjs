// R13 promotion contract. Frozen source commits are independent of branch heads.
const h=require('./harness.cjs'),{execFileSync}=require('node:child_process'),crypto=require('node:crypto');
const {assert,fs,path,chromium}=h,app=path.resolve(__dirname,'..');
const approved='2e48db4a0ab7833513bf1a1fbc82a0856869e3ad',prior='76cc6f11cff4cf77bd3d6e1eb34880246b23e9e7';
const show=(sha,file)=>execFileSync('git',['show',`${sha}:${file}`],{cwd:h.root,maxBuffer:4e6});
const accepted=show(approved,'peach-physics/experiments/r13-motion/index.html').toString(),old=show(prior,'peach-physics/v8/index.html').toString(),current=fs.readFileSync(path.join(app,'index.html'),'utf8');
const runtime=s=>s.match(/<script>\s*(\(\(\) => \{[\s\S]*?\}\)\(\);)\s*<\/script>/)[1];
const normalized=runtime(accepted).replace(/const profileStorage=\{.*?\};\n/,'').replaceAll('profileStorage.','localStorage.');
assert.equal(runtime(current),normalized,'only preview profile storage may change in approved runtime');
assert.deepEqual(fs.readFileSync(path.join(app,'motion.js')),show(approved,'peach-physics/experiments/r13-motion/motion.js'),'approved controller byte-identical');
for(const file of ['manifest.webmanifest','apple-touch-icon.png','assets/aurelia-frost.jpg','assets/holly-heartbreaker.jpg','assets/santa-claus.jpg'])assert.deepEqual(fs.readFileSync(path.join(app,file)),show(prior,'peach-physics/v8/'+file));
assert(!current.includes('r13-preview:'));assert(current.includes('<title>Peach Physics — Elf Lab 0.0.8 r13</title>'));
assert(current.includes(old.match(/<script>\s*if\('serviceWorker'[\s\S]*?<\/script>/)[0]));
const sources={r12:old,approved:accepted,r13:current};
for(const [key,html]of Object.entries(sources))fs.writeFileSync('/tmp/peach-release-'+key+'.html',html.replace('window.__peachMotionDebug=', 'window.__motionTest={motion};window.__peachMotionDebug='));
async function setup(browser,key,fallback){
 const proxy={newContext:async options=>{const c=await browser.newContext(options);await c.route('**/motion.js',r=>r.fulfill({path:path.join(app,'motion.js'),contentType:'text/javascript'}));await c.route('**/assets/*.jpg*',r=>{const name=new URL(r.request().url()).pathname.split('/').pop();return ['aurelia-frost.jpg','holly-heartbreaker.jpg','santa-claus.jpg'].includes(name)?r.fulfill({path:path.join(app,'assets',name),contentType:'image/jpeg'}):r.abort();});return c;}};
 return h.setup(proxy,'v8',{width:390,height:844},true,fallback,false,'/tmp/peach-release-'+key+'.html');
}
async function select(p,id){await p.evaluate(id=>__test.chooseCharacter(['ember','midnight','aurelia','holly','santa'].indexOf(id)),id);await p.waitForFunction(id=>__peachPhysicsDebug.snapshot().character===id,id);await p.evaluate(()=>{__test.resize();__test.reset();});}
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
async function run(p,preset,kind){const r=await p.evaluate(({preset,kind})=>{const a=__test,m=window.__motionTest?.motion;document.querySelector(`[data-preset="${preset}"]`).click();a.reset();
// Give both pages the same initial contact history. R12 intentionally retains
// inactive coordinates on reset; the reset contract is checked separately.
const character=a.currentCharacter();a.impacts.forEach((p,i)=>{p.x=character.impactCenters[i][0]/(character.width||941);p.y=character.impactCenters[i][1]/(character.height||1671);});testClock=1000;let seed=123;if(m){m.time=0;m.lastCharacter=a.currentCharacter().id;m.interrupt();m.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);m.setShake(false);m.setAuto(false);}const tick=()=>{testClock+=1000/120;m?.tick(1/120);a.step(1/120);};for(let i=0;i<150;i++)tick();
 const on=['shake','auto','both'].includes(kind);if(on){m.setShake(kind!=='auto');m.setAuto(kind!=='shake');}else a.gesture(kind,0);
 const trace=[],pixels=[];for(let i=0;i<(on?480:120);i++){if(on&&kind!=='auto'&&i%2===0)m.sample({acceleration:{x:.8*Math.sin(i*.05),y:.3*Math.cos(i*.05),z:.4*Math.sin(i*.07)}},testClock);tick();if(i%30===0)trace.push(a.raw());if(i===60||i===119||i===479){a.render();pixels.push(document.querySelector('#game').toDataURL());}}
 if(m){m.setShake(false);m.setAuto(false);}a.reset();return {trace,pixels};},{preset,kind});return {trace:r.trace,pixels:r.pixels.map(hash)};}
async function resetContract(p){const result=await p.evaluate(()=>{const a=__test;a.reset();a.gesture('drag',0);for(let i=0;i<12;i++)a.step(1/120);const before=a.impacts.map(p=>({x:p.x,y:p.y}));a.reset();const after=a.impacts.map(p=>({x:p.x,y:p.y})),inactive=a.impacts.every(p=>p.v===0&&p.contact===0&&p.target===0)&&a.waves.every(w=>w.strength===0);for(let i=0;i<3;i++){a.nodes[i].dx=4;a.nodes[i].dy=3;}a.render();const original=document.querySelector('#game').toDataURL();a.impacts[0].x+=.04;a.impacts[0].y+=.03;a.render();const changed=document.querySelector('#game').toDataURL();a.reset();return {before,after,inactive,pixelsIdentical:original===changed};});assert.deepEqual(result.after,result.before,'R12 reset preserves contact coordinates');assert(result.inactive,'reset clears all active contact/wave state');assert(result.pixelsIdentical,'inactive contact coordinates do not affect moving-spring rendering');}
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});const report={approved,prior,provenance:true,disabledComparisons:0,approvedComparisons:0,resetContracts:0,errors:[]};try{for(const fallback of [false,true]){const apps={};for(const key of Object.keys(sources))apps[key]=await setup(b,key,fallback);
 for(const id of ['ember','midnight','aurelia','holly','santa']){for(const a of Object.values(apps)){await select(a.page,id);await resetContract(a.page);report.resetContracts++;}for(const preset of ['natural','playful','chaos']){
  for(const kind of ['kick','drag','flick']){assert.deepEqual(await run(apps.r13.page,preset,kind),await run(apps.r12.page,preset,kind),`${id}/${preset}/${kind}/${fallback}: R12 disabled-feature regression`);report.disabledComparisons++;}
  for(const kind of ['shake','auto','both']){assert.deepEqual(await run(apps.r13.page,preset,kind),await run(apps.approved.page,preset,kind),`${id}/${preset}/${kind}/${fallback}: approved R13.3 parity`);report.approvedComparisons++;}
 }}for(const a of Object.values(apps)){report.errors.push(...a.errors);await a.context.close();}
}assert.deepEqual(report.errors,[]);fs.writeFileSync(path.join(__dirname,'motion-regression.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});
