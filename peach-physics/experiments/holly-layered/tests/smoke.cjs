const {chromium}=require('playwright');
(async()=>{
 const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 for(const backend of ['webgl','canvas']){
  const p=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:2});
  p.on('pageerror',e=>console.log('ERROR',e.message));
  await p.addInitScript(()=>{requestAnimationFrame=()=>0;});
  await p.goto(`http://127.0.0.1:8000/peach-physics/experiments/holly-layered/r6.html?mode=layered&backend=${backend}`);
  await p.waitForFunction(()=>window.__hollyLab?.ready());
  console.log(await p.evaluate(()=>{__hollyLab.reset();__hollyLab.render();__hollyLab.tap(1);for(let i=0;i<18;i++)__hollyLab.step(1/120);__hollyLab.render();return {info:__hollyLab.info(),metrics:__hollyLab.renderer.metrics()};}));
  await p.screenshot({path:`/tmp/holly-${backend}.png`});await p.close();
 }
 await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
