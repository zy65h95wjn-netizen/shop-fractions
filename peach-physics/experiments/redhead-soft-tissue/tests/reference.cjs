// Read-only r10 reference capture. Hooks are injected into browser responses;
// no production file is edited. Run with the same root server as browser.cjs.
const {chromium,setup,character,canvas}=require('../../../v8/tests/harness.cjs');
const fs=require('node:fs'),path=require('node:path');
const out=path.resolve(process.argv[2]||'/tmp/redhead-evidence');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const {page,context,errors}=await setup(browser,'v8',{width:600,height:950},true,false);
 await character(page,'holly');await page.evaluate(()=>{__test.model.transfer=0;__test.reset();__test.render();});
 fs.writeFileSync(path.join(out,'holly-rest.png'),Buffer.from((await canvas(page)).split(',')[1],'base64'));
 await page.evaluate(()=>__test.impulse(0,325,332,.7));
 for(let i=0;i<120;i++){await page.evaluate(()=>{for(let k=0;k<4;k++)__test.step(1/120);__test.render();});if([2,5,9,14,29,59,119].includes(i))fs.writeFileSync(path.join(out,`holly-tap-${i}.png`),Buffer.from((await canvas(page)).split(',')[1],'base64'));}
 const state=await page.evaluate(()=>__peachPhysicsDebug.snapshot());fs.writeFileSync(path.join(out,'holly-reference.json'),JSON.stringify({errors,state,note:'Unmodified live r10 reference, transfer=0 and tap amplitude=.7. Portrait calibration differs; not a controlled character swap.'},null,2));
 await context.close();await browser.close();console.log('Holly reference captured',errors);
})().catch(e=>{console.error(e);process.exit(1);});
