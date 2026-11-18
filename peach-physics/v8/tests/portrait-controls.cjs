// Run against the repository-root server. Exercise the native click and motion listeners.
const {chromium, assert, base, out, path} = require('./harness.cjs');

async function run(browser, reduced) {
  const ctx=await browser.newContext({viewport:{width:393,height:852},deviceScaleFactor:1,isMobile:true,
    hasTouch:true,reducedMotion:reduced?'reduce':'no-preference',serviceWorkers:'block'});
  try {
    const page=await ctx.newPage(),errors=[];
    page.on('pageerror',err=>errors.push(err.message));
    await page.addInitScript(()=>{
      window.permissionCalls=0;
      Object.defineProperty(window,'DeviceMotionEvent',{value:class{
        static async requestPermission(){window.permissionCalls++;return 'granted';}
      }});
    });
    await page.goto(base+'/peach-physics/v8/');
    const ready=()=>page.waitForFunction(()=>window.__peachPhysicsDebug?.snapshot().frames>0);
    await ready();
    const el=id=>page.locator('#'+id),tap=id=>el(id).tap();
    async function state(shortcut,setting,attr,on){
      for(const id of [shortcut,setting])assert.equal(await el(id).getAttribute(attr),String(on),id);
    }
    const sound=on=>state('quickSound','slapAudio','aria-pressed',on);
    const auto=on=>state('quickAuto','autoMotion','aria-checked',on);
    await sound(false);await auto(true);
    await tap('quickSound');await sound(true);
    await page.waitForFunction(()=>__peachPhysicsDebug.snapshot().audioState==='running');
    await el('quickAuto').press('Space');await auto(false);
    await tap('character');
    await page.waitForFunction(()=>__peachPhysicsDebug.snapshot().character==='midnight');
    await sound(false);await auto(false);
    await tap('gear');
    assert(!(await el('quickAuto').isVisible()));
    await tap('slapAudio');await sound(true);
    await tap('autoMotion');await auto(true);
    assert(await el('quickAuto').isVisible());
    await el('quickSound').press('Space');await sound(false);
    await page.reload();await ready();await sound(false);await auto(true);
    for(const id of ['aurelia','holly','ember']){
      await tap('character');await page.waitForFunction(id=>__peachPhysicsDebug.snapshot().character===id,id);
    }
    await sound(true);await auto(true);
    assert.equal(await page.evaluate(()=>window.permissionCalls),0);
    await tap('quickSound'); // Show the default muted speaker and enabled peach in the capture.
    await tap('gear');await tap('shakeMotion');
    await page.waitForFunction(()=>__peachMotionDebug.snapshot().ui.listening);
    assert.equal(await page.evaluate(()=>window.permissionCalls),1);
    const elapsed=page.evaluate(()=>{
      const notice=document.getElementById('motionNotice'),start=performance.now();
      return new Promise(resolve=>{
        const observer=new MutationObserver(()=>{
          if(notice.hidden){observer.disconnect();resolve(performance.now()-start);}
        });
        observer.observe(notice,{attributes:true,attributeFilter:['hidden']});
        const reading=()=>{
          const e=new Event('devicemotion');Object.defineProperty(e,'acceleration',{value:{x:0,y:.4,z:0}});
          window.dispatchEvent(e);
        };
        reading();
        setTimeout(reading,2000); // Sensor samples continue while the confirmation is visible.
      });
    });
    await page.waitForFunction(()=>document.querySelector('#motionNotice').textContent==='Shake is on. Try a gentle flick.');
    const [stage,notice,left,right]=await page.evaluate(async()=>{
      await new Promise(requestAnimationFrame);
      return ['stage','motionNotice','quickSound','quickAuto'].map(id=>document.getElementById(id).getBoundingClientRect().toJSON());
    });
    assert(left.width>=44&&left.height>=44&&right.width>=44&&right.height>=44);
    assert(left.x<30&&right.x>300&&left.y===right.y);
    assert(notice.y>stage.height*.65&&notice.bottom<left.y);
    assert(Math.abs(notice.x+notice.width/2-stage.x-stage.width/2)<1,JSON.stringify({stage,notice}));
    if(!reduced)await page.screenshot({path:path.join(out,'portrait-controls.jpg'),quality:92});
    const ms=await elapsed;
    assert(ms>=5950&&ms<7000,'shake notice duration '+ms);
    assert.match(await el('motionStatus').textContent(),/Shake is on/);
    await tap('quickAuto');
    const replacement=await page.evaluate(async()=>{
      await new Promise(r=>setTimeout(r,1500));
      document.querySelector('#quickAuto').click();
      await new Promise(r=>setTimeout(r,4700));
      return !document.querySelector('#motionNotice').hidden;
    });
    assert(replacement,'the timer for the old notice hid the replacement');
    await el('motionNotice').waitFor({state:'hidden',timeout:3000});
    await page.setViewportSize({width:844,height:390});
    const landscape=await el('quickAuto').boundingBox();
    assert(landscape.x>750&&landscape.y+landscape.height<=390);
    assert.deepEqual(errors,[]);
    console.log(reduced?'Reduced motion':'Normal motion','— sound profiles, global Auto, keyboard, touch and six-second notice passed');
  } finally { await ctx.close(); }
}
(async()=>{
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM||'/usr/bin/chromium',
    args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  try{for(const reduced of [false,true])await run(browser,reduced);}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
