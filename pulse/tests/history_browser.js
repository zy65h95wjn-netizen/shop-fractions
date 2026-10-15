// Local browser acceptance + synthetic before/after screenshots. No live service.
// Requires Playwright + browser installed outside the app. See review/history-explorer/README.md.
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const {execFileSync}=require('node:child_process');
const {fixture}=require('./history_integration.js');
const ROOT=path.resolve(__dirname,'../..');
const output=process.env.HISTORY_REVIEW_OUTPUT||'/tmp/resting-beast-history-review';
const baseline='f64a4c0ebd565e0f2d1eb818b44213f4d4920a25';
let playwright;
try{playwright=require('playwright');}catch{playwright=require(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'', 'playwright'));}
const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.webmanifest':'application/manifest+json'};
const server=http.createServer((req,res)=>{
  const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname),file=path.resolve(ROOT,'.'+name+(name.endsWith('/')?'index.html':''));
  if(!file.startsWith(ROOT+path.sep)){res.writeHead(403);res.end();return;}
  fs.readFile(file,(error,body)=>{res.writeHead(error?404:200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});res.end(error?'Not found':body);});
});
async function layout(page){
  const result=await page.evaluate(()=>{
    const width=document.documentElement.clientWidth;
    return {width,scrollWidth:document.documentElement.scrollWidth,
      overflow:[...document.querySelectorAll('#history-explorer *,.history-open')].filter(e=>{
        if(!e.getClientRects().length)return false;const r=e.getBoundingClientRect();return r.left< -1||r.right>width+1;
      }).map(e=>e.id||e.className),
      smallTargets:[...document.querySelectorAll('.history-open,.history-ranges button,#history-back,#history-lock')].filter(e=>{if(!e.getClientRects().length)return false;const r=e.getBoundingClientRect();return r.height<44||r.width<44;}).map(e=>e.id||e.className)};
  });
  assert.equal(result.scrollWidth,result.width,JSON.stringify(result));assert.deepEqual(result.overflow,[]);assert.deepEqual(result.smallTargets,[]);
}
async function capture(page,name){
  // Permanent QA label prevents synthetic screenshots being mistaken for records.
  await page.evaluate(()=>{
    if(document.getElementById('qa-banner'))return;
    const banner=document.createElement('p');banner.id='qa-banner';banner.textContent='SYNTHETIC QA DATA · NOT PERSONAL READINGS';
    document.querySelector('header').after(banner);
  });
  await page.screenshot({path:path.join(output,name+'.png'),fullPage:false});
}
async function run(){
  fs.mkdirSync(output,{recursive:true});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base='http://127.0.0.1:'+server.address().port;
  const engine=process.env.HISTORY_BROWSER||'chromium';
  const browser=await playwright[engine].launch({headless:true,...(process.env.HISTORY_BROWSER_PATH?{executablePath:process.env.HISTORY_BROWSER_PATH}:{})});
  const results=[];
  try{for(const [width,height] of [[320,568],[390,844],[430,932]]){
    const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:3,isMobile:true,hasTouch:true,reducedMotion:'reduce',timezoneId:'America/Los_Angeles',serviceWorkers:'block'});
    const page=await context.newPage(),errors=[],external=[],calls=[];let data=fixture(),before=true;
    page.on('pageerror',e=>errors.push(e.message));
    await page.clock.install({time:new Date('2026-10-15T15:00:00Z')});
    await page.route('**/*',async route=>{
      const request=route.request(),url=request.url();
      if(url.startsWith(base)){
        if(before&&url===base+'/pulse/')return route.fulfill({contentType:'text/html',body:execFileSync('git',['show',baseline+':pulse/index.html'],{cwd:ROOT})});
        return route.continue();
      }
      if(url==='https://wosfukbzxrykwarxobfw.supabase.co/functions/v1/pulse-dashboard-corrected'){
        calls.push(request.postDataJSON());return route.fulfill({status:200,json:data});
      }
      external.push(url);return route.abort();
    });
    async function unlock(){await page.locator('#key').fill('test-only-not-a-real-private-key-00000');await page.locator('#login .primary').click();await page.locator('#app').waitFor({state:'visible'});}
    await page.goto(base+'/pulse/');await unlock();await capture(page,engine+'-before-today-'+width);
    before=false;await page.reload();await page.locator('#app').waitFor({state:'visible'});await layout(page);
    await capture(page,engine+'-after-today-'+width);
    assert.equal(await page.locator('[data-history-metric]').count(),4,'one entry control per metric');
    const requestCount=calls.length;
    for(const [metric,name] of [['resting_heart_rate','Resting heart rate'],['heart_rate','Heart rate'],['hrv_sdnn','HRV / SDNN'],['blood_oxygen_saturation','Blood oxygen / SpO₂']]){
      const opener=page.locator('[data-history-metric="'+metric+'"]');await opener.scrollIntoViewIfNeeded();
      assert.equal(await opener.evaluate(e=>e.tagName),'BUTTON');
      const scroll=await page.evaluate(()=>window.scrollY);await opener.locator('.number').tap();
      assert.equal(await page.locator('#history-title').innerText(),name);
      assert.ok(await page.locator('#overview').isHidden());
      await layout(page);
      for(const days of [7,30,90]){
        await page.locator('[data-history-days="'+days+'"]').click();
        assert.equal(await page.locator('#history-values tr').count(),days);
        // Every graph selection must report exactly the corresponding table value.
        const mismatches=await page.evaluate(()=>{
          const rows=[...document.querySelectorAll('#history-values tr')],range=document.getElementById('history-scrubber'),out=[];
          if(rows[0].dataset.day!=='2026-10-15')out.push('today is not at top');
          if(rows.some((row,i)=>i>0&&row.dataset.day>=rows[i-1].dataset.day))out.push('list order');
          rows.forEach((row,i)=>{range.value=Number(range.max)-i;range.dispatchEvent(new Event('input',{bubbles:true}));
            if(document.getElementById('history-reading').textContent!==row.lastElementChild.textContent||!document.getElementById('history-day').textContent.startsWith(row.firstElementChild.textContent))out.push(row.dataset.day);});return out;
        });assert.deepEqual(mismatches,[]);await layout(page);
      }
      await page.locator('#history-chart').focus();await page.keyboard.press('Home');
      assert.equal(await page.locator('#history-chart').getAttribute('aria-valuenow'),'1');
      await page.keyboard.press('End');assert.equal(await page.locator('#history-chart').getAttribute('aria-valuenow'),'90');
      await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));await capture(page,engine+'-history-'+metric+'-'+width);
      await page.locator('#history-back').click();
      await page.waitForFunction(({y,metric})=>Math.abs(window.scrollY-y)<=2 &&
        document.activeElement===document.querySelector('[data-history-metric="'+metric+'"]'),{y:scroll,metric});
      assert.equal(await opener.evaluate(e=>document.activeElement===e),true);assert.equal(await page.locator('.dock a').count(),3);
      // Native button semantics must support both keyboard activation keys.
      for(const key of ['Enter','Space']){
        await opener.focus();await page.keyboard.press(key);assert.ok(await page.locator('#history-explorer').isVisible());
        await page.locator('#history-back').click();
        await page.waitForFunction(({y,metric})=>Math.abs(window.scrollY-y)<=2 &&
          document.activeElement===document.querySelector('[data-history-metric="'+metric+'"]'),{y:scroll,metric});
      }
    }
    assert.equal(calls.length,requestCount,'history must not initiate health reads');
    await page.locator('[data-history-metric="heart_rate"]').click();
    await page.locator('[data-history-days="7"]').click();data.latest.heart_rate.value=104.25;data.daily[0].heart_rate=77.375;
    await page.locator('#refresh').click();await page.waitForFunction(()=>document.getElementById('history-latest-value').textContent==='104.25 bpm');
    assert.equal(await page.locator('#history-values tr').count(),7);
    await page.locator('[data-page-link="trends"]').click();assert.ok(await page.locator('#history-explorer').isHidden());assert.ok(await page.locator('#trends').isVisible());
    // Navigation redraws the previously hidden Trends chart on the next animation frame.
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    await page.waitForFunction(()=>document.getElementById('chart').getAttribute('aria-valuetext')!==null);
    await page.locator('#chart').focus();
    await page.keyboard.press('End');
    await page.waitForFunction(()=>document.getElementById('chart').getAttribute('aria-valuenow')===document.getElementById('chart').getAttribute('aria-valuemax'));
    await page.keyboard.press('Home');
    await page.waitForFunction(()=>document.getElementById('chart').getAttribute('aria-valuenow')==='1');
    await page.locator('[data-page-link="context"]').click();
    for(const id of ['edit-trt','add-med','edit-nicotine','edit-caffeine','edit-bp']){await page.locator('#'+id).click();assert.ok(await page.locator('#dlg').isVisible());await page.locator('#cancel').click();}
    await page.locator('[data-page-link="today"]').click();await page.locator('[data-history-metric="heart_rate"]').click();
    data={...fixture(),daily:[],latest:{}};await page.locator('#refresh').click();await page.locator('#history-empty').waitFor({state:'visible'});await layout(page);
    await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));await capture(page,engine+'-empty-'+width);
    await page.locator('#history-lock').click();assert.ok(await page.locator('#app').isHidden());
    assert.equal(await page.locator('#history-values tr').count(),0);assert.equal(await page.locator('#history-latest-value').textContent(),'');
    assert.equal(await page.evaluate(()=>sessionStorage.length),0);assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
    results.push({engine,width,height,status:'passed',pageErrors:errors,unexpectedExternalRequests:external});
    await context.close();console.log('PASS: '+engine+' '+width+'px history browser acceptance');
  }}finally{await browser.close();}
  fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(results,null,2)+'\n');
}
run().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>server.close());
