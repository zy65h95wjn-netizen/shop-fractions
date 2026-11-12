const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const out=path.resolve(process.argv[2]||'/tmp/kelvinlet-evidence');fs.mkdirSync(out,{recursive:true});const base=(process.env.PEACH_TEST_URL||'http://127.0.0.1:8000')+'/peach-physics/experiments/redhead-kelvinlet/';
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});const results={};
 for(const renderer of ['webgl','canvas']){
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base+`?renderer=${renderer}&view=B`);await page.waitForFunction(()=>kelvinLab?.ready);
  const points=await page.evaluate(()=>{const r=document.querySelector('.portrait').getBoundingClientRect(),v=kelvinLab.snapshot().view;return [[351,462],[480,467]].map(([x,y],id)=>({x:r.left+(x-v[0])/v[2]*r.width,y:r.top+(y-v[1])/v[3]*r.height,id}));});const cdp=await context.newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:points});assert.equal(await page.evaluate(()=>kelvinLab.snapshot().pointers),2);await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:points.map((p,i)=>({...p,x:p.x+(i?12:-12),y:p.y-12}))});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});assert.equal(await page.evaluate(()=>kelvinLab.snapshot().pointers),0);
  await page.evaluate(()=>kelvinLab.pause(true));await page.locator('#framing').selectOption('full');const modes={};
  for(const mode of ['A','A+','B']){
   await page.getByRole('button',{name:mode,exact:true}).click();
   modes[mode]=await page.evaluate(async()=>{
    const {mask}=await import('../redhead-soft-tissue/physics.js');kelvinLab.reset();kelvinLab.draw();const src=document.querySelector('.portrait'),c=document.createElement('canvas');c.width=src.width;c.height=src.height;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(src,0,0);const rest=ctx.getImageData(0,0,c.width,c.height).data;
    let protectedChanged=0,boundaryChanged=0,skinChanged=0,maxProtectedDelta=0;
    const poses=[{s:0,x:351,y:462,dx:30,dy:-12},{s:1,x:480,y:467,dx:-24,dy:30},{s:0,x:398,y:507,dx:10,dy:20}];
    for(const p of poses){kelvinLab.reset();kelvinLab.model.down(5,p.x,p.y);for(let i=1;i<=48;i++){kelvinLab.model.move(5,p.x+p.dx*i/48,p.y+p.dy*i/48);kelvinLab.advance(1/120);}kelvinLab.draw();ctx.drawImage(src,0,0);const moved=ctx.getImageData(0,0,c.width,c.height).data;
     for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){const sx=(x+.5)/c.width*756,sy=(y+.5)/c.height*1280,k=(y*c.width+x)*4,d=Math.max(...[0,1,2].map(z=>Math.abs(rest[k+z]-moved[k+z])));const m=Math.max(mask(sx,sy,0),mask(sx,sy,1));if(!m){maxProtectedDelta=Math.max(maxProtectedDelta,d);if(d>1){protectedChanged++;if([[3,0],[-3,0],[0,3],[0,-3]].some(([dx,dy])=>mask(sx+dx,sy+dy,0)||mask(sx+dx,sy+dy,1)))boundaryChanged++;}}else if(d>1)skinChanged++;}
    }
    kelvinLab.model.cancel();for(let i=0;i<900;i++)kelvinLab.advance(1/120);kelvinLab.draw();ctx.drawImage(src,0,0);const settled=ctx.getImageData(0,0,c.width,c.height).data;let restoredDiff=0;for(let i=0;i<rest.length;i++)if(rest[i]!==settled[i])restoredDiff++;
    return {protectedChanged,boundaryChanged,maxProtectedDelta,skinChanged,restoredDiff};
   });assert.equal(modes[mode].protectedChanged,0);assert.equal(modes[mode].restoredDiff,0);assert(modes[mode].skinChanged>100);
  }
  await page.locator('#framing').selectOption('detail');await page.getByRole('button',{name:'Focus view',exact:true}).click();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:path.join(out,renderer+'-detail-mobile.png')});await page.getByRole('button',{name:'Exit focus'}).click();
  // Test blind UI without inventing or submitting any perceptual votes.
  await page.getByRole('button',{name:'Start 10 blind comparisons'}).click();const labels=await page.locator('.caption').allTextContents();assert(labels[0].startsWith('X')&&labels[1].startsWith('Y'));assert(!labels.join().includes('Kelvinlet'));assert.equal(await page.locator('[data-vote]:disabled').count(),3);await page.getByRole('button',{name:'Exit evaluation'}).click();
  if(renderer==='webgl'){await page.evaluate(()=>document.querySelector('.portrait').getContext('webgl').getExtension('WEBGL_lose_context').loseContext());await page.waitForFunction(()=>kelvinLab.snapshot().renderer==='canvas');}
  assert.deepEqual(errors,[]);results[renderer]={modes,errors,trustedMultitouch:true,blindUI:'labels hidden, voting locked until playback; no votes submitted'};await context.close();
 }
 fs.writeFileSync(path.join(out,'validation.json'),JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
