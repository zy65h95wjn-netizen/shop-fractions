// Final local/commit-pinned smoke test, using the visible character selector.
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
const url=process.env.R142_PREVIEW_URL||'http://127.0.0.1:8000/peach-physics/experiments/r14-other-laughs/index.html?character=ember';
const remote=url.startsWith('https:'),output=remote?'/tmp/r142-hosted-preview.json':__dirname+'/preview.json';
const ids=['ember','midnight','aurelia','holly'],labels=['Winter Ember','Midnight Yule','Aurelia Frost','Holly'];
let checks=0;const results=[],eq=(a,b,m)=>{assert.deepEqual(a,b,m);checks++;},ok=(v,m)=>{assert.ok(v,m);checks++;};
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/chromium',...(remote&&process.env.HTTPS_PROXY?{proxy:{server:process.env.HTTPS_PROXY}}:{}),args:['--no-sandbox','--ignore-certificate-errors','--use-angle=swiftshader','--enable-unsafe-swiftshader']});try{
 for(const fallback of [false,true]){
  const c=await b.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,ignoreHTTPSErrors:true}),p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  if(fallback)await p.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(t,...args){return t.includes('webgl')?null:get.call(this,t,...args);};});
  const ready=()=>p.waitForFunction(()=>window.__elfAudioDebug&&document.querySelector('#loader').classList.contains('hiding'),null,{timeout:60000});
  const settings=async()=>{if(!await p.locator('#panel').evaluate(e=>e.classList.contains('open')))await p.click('#gear');};
  const close=async()=>{if(await p.locator('#panel').evaluate(e=>e.classList.contains('open')))await p.click('#close');await p.waitForTimeout(300);};
  const advance=async id=>{await close();await p.click('#character');await p.waitForFunction(id=>__peachPhysicsDebug.snapshot().character===id,id);};
  await p.goto(url,{waitUntil:'domcontentloaded',timeout:60000});if((await p.title()).includes('External Content Notice'))await p.getByText('Open the page',{exact:true}).click();await ready();
  eq(await p.title(),'Peach Physics — R14.2 Voice Preview','title');eq(await p.evaluate(()=>__peachPhysicsDebug.snapshot().renderer),fallback?'canvas':'webgl','renderer');
  if(!remote)await p.evaluate(()=>navigator.serviceWorker.register('./sw.js'));
  await p.waitForFunction(()=>navigator.serviceWorker.controller,null,{timeout:60000});
  for(const offline of [false,true]){
   if(offline){await c.setOffline(true);await p.reload({waitUntil:'domcontentloaded'});await ready();}
   if(await p.evaluate(()=>__peachPhysicsDebug.snapshot().character==='santa'))await advance('ember');
   for(let i=0;i<ids.length;i++){
    const id=ids[i];eq(await p.evaluate(()=>__peachPhysicsDebug.snapshot().character),id,'visible selector '+id);await settings();
    eq(await p.locator('#testSound').textContent(),'Test '+labels[i]+' Laugh','Test label '+id);
    if(!offline){eq(await p.evaluate(()=>__peachPhysicsDebug.snapshot().slapAudioEnabled),false,'fresh Sound off '+id);await p.click('#slapAudio');}
    else ok(await p.evaluate(()=>__peachPhysicsDebug.snapshot().slapAudioEnabled),'offline saved Sound '+id);
    for(let take=1;take<=2;take++){
     await p.click('#testSound');await p.waitForFunction(()=>__elfAudioDebug.snapshot().current?.active);
     const s=await p.evaluate(()=>__elfAudioDebug.snapshot());eq(s.current.lastClip,take,'complete alternating Test '+id);eq(s.activeCount,1,'single source');
     await p.waitForFunction(()=>!__elfAudioDebug.snapshot().activeCount);results.push({renderer:fallback?'canvas':'webgl',offline,id,take});
    }
    if(!remote&&!offline){
     for(const size of [{width:375,height:667},{width:390,height:844},{width:430,height:932}]){
      await p.setViewportSize(size);await p.locator('#testSound').scrollIntoViewIfNeeded();
      const d=await p.locator('#testSound').evaluate(e=>{const r=e.getBoundingClientRect();return{left:r.left,right:r.right,width:r.width,scroll:e.scrollWidth,client:e.clientWidth,screen:innerWidth};});ok(d.left>=0&&d.right<=d.screen&&d.scroll<=d.client+1,'Test fits iPhone '+id+' '+size.width);
     }
     await p.setViewportSize({width:390,height:844});await p.evaluate(()=>{scrollTo(0,0);document.querySelector('#stage').scrollTo(0,0);document.querySelector('#panel').scrollTop=0;});await p.waitForTimeout(350);await p.screenshot({path:__dirname+'/settings-'+(fallback?'canvas':'webgl')+'-'+id+'.png'});
     await close();await p.evaluate(()=>document.querySelector('#stage').scrollTo(0,0));await p.screenshot({path:__dirname+'/portrait-'+(fallback?'canvas':'webgl')+'-'+id+'.png'});
    }
    await advance(i===3?'santa':ids[i+1]);
   }
   await settings();eq(await p.locator('#testSound').textContent(),'Test Santa laugh','approved Santa control');
   if(!offline){await p.click('#slapAudio');await p.waitForFunction(()=>__santaAudioDebug.snapshot().active);await p.waitForFunction(()=>!__santaAudioDebug.snapshot().active);}
   else ok(await p.evaluate(()=>__peachPhysicsDebug.snapshot().slapAudioEnabled),'Santa saved Sound offline');
   await p.click('#testSound');await p.waitForFunction(()=>__santaAudioDebug.snapshot().active);eq(await p.evaluate(()=>__elfAudioDebug.snapshot().activeCount),0,'Santa alone');await p.waitForFunction(()=>!__santaAudioDebug.snapshot().active);
   results.push({renderer:fallback?'canvas':'webgl',offline,id:'santa',take:1});
   if(!remote&&!offline){await p.evaluate(()=>{document.querySelector('#stage').scrollTo(0,0);document.querySelector('#panel').scrollTop=0;});await p.waitForTimeout(300);await p.screenshot({path:__dirname+'/settings-'+(fallback?'canvas':'webgl')+'-santa.png'});}
   await advance('ember');
  }
  const cacheKeys=await p.evaluate(()=>caches.keys());ok(cacheKeys.includes('peach-preview-r142-other-laughs-v3'),'current complete cache');eq(errors,[],'no page exceptions');await c.close();
 }
 fs.writeFileSync(output,JSON.stringify({url,checks,results,passed:true},null,2)+'\n');console.log({checks,passed:true,output});
}finally{await b.close();}})().catch(e=>{console.error(e);process.exit(1)});
