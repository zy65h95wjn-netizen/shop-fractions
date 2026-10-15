// Local browser acceptance. No live backend requests; all health data is synthetic.
// Run: node pulse/tests/reliability_browser.js [chromium|webkit]
'use strict';
const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {fixture}=require('./reliability_harness');
const {chromium,webkit}=require('playwright');
const root=path.resolve(__dirname,'..'),engine=process.argv[2]==='webkit'?webkit:chromium;
(async()=>{
  let browser;
  try{browser=await engine.launch();}
  catch(error){console.error('UNVERIFIED: '+engine.name()+' failed to launch: '+error.message);process.exitCode=2;return;}
  const server=http.createServer((req,res)=>{
    const filename=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));
    if(!filename.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
    fs.readFile(filename,(err,data)=>{if(err){res.writeHead(404);res.end();return;}
      res.setHeader('Content-Type',filename.endsWith('.html')?'text/html':filename.endsWith('.js')?'text/javascript':filename.endsWith('.css')?'text/css':filename.endsWith('.webp')?'image/webp':'application/octet-stream');res.end(data);});
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
  try{
    for(const width of [320,390,430]){
      const context=await browser.newContext({viewport:{width,height:844},hasTouch:true,timezoneId:'America/New_York'});
      const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
      await page.clock.install({time:new Date('2026-10-15T15:00:00Z')});
      await page.addInitScript(()=>sessionStorage.setItem('pulse_protocol_key_v1','test-only-not-a-real-private-key-00000'));
      let read={status:200,json:fixture()},pendingRead=null,pendingWrite=null,holdWrite=false;
      await page.route('**/*',async route=>{
        if(route.request().url().startsWith(base+'/'))return route.continue();
        if(route.request().url().endsWith('pulse-dashboard-corrected')){
          if(pendingRead){const fn=pendingRead;pendingRead=null;return fn(route);}
          return route.fulfill(read);
        }
        if(route.request().url().endsWith('pulse_write')){
          if(holdWrite){pendingWrite=route;return;}
          return route.fulfill({status:200,json:{}});
        }
        throw Error('Unexpected external request: '+route.request().url());
      });
      await page.goto(base+'/index.html');await page.locator('#app').waitFor({state:'visible'});
      for(const name of ['today','trends','context','history']){
        await page.evaluate(n=>window.RestingBeastPages.showPage(n==='history'?'today':n),name);
        if(name==='history')await page.locator('[data-history-metric="heart_rate"]').click();
        await page.waitForTimeout(50);
        assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
        read={status:503,json:{}};await page.locator('#refresh').click();await page.locator('#error').filter({hasText:'previously loaded'}).waitFor();
        await page.locator('#error').scrollIntoViewIfNeeded();assert.equal(await page.locator('#error').isVisible(),true);
        assert.equal(await page.locator('#status').innerText(),'Stale');
        read={status:200,json:fixture()};await page.locator('#refresh').click();await page.waitForFunction(()=>document.getElementById('status').textContent==='Protected');
      }
      await page.evaluate(()=>window.RestingBeastPages.showPage('context'));
      await page.locator('#edit-trt').click();holdWrite=true;await page.locator('#save').click();
      await page.waitForTimeout(50);assert.ok(pendingWrite);await page.locator('#cancel2').click();await page.locator('#edit-bp').click();await page.locator('#sys').fill('127');
      await pendingWrite.fulfill({status:200,json:{}});await page.locator('#save-notice').filter({hasText:'earlier entry was saved'}).waitFor();
      assert.equal(await page.locator('#dlg').isVisible(),true);assert.equal(await page.locator('#sys').inputValue(),'127');await page.locator('#cancel2').click();
      // Resume after NY midnight: stale labels disappear while the read is pending.
      await page.clock.setSystemTime(new Date('2026-10-16T13:00:00Z'));
      let heldRead;pendingRead=route=>{heldRead=route;};
      await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
      assert.equal(await page.locator('#steps-today').innerText(),'—');await page.waitForTimeout(50);assert.ok(heldRead);
      await heldRead.fulfill({status:200,json:fixture()});await page.waitForFunction(()=>document.getElementById('status').textContent==='Protected');
      await page.evaluate(()=>window.RestingBeastPages.showPage('today'));
      await page.locator('[data-history-metric="heart_rate"]').click();
      read={status:401,json:{code:'key_mismatch'}};await page.locator('#refresh').click();await page.locator('#connect').waitFor({state:'visible'});
      assert.equal(await page.locator('#status').innerText(),'Locked');assert.equal(await page.evaluate(()=>sessionStorage.getItem('pulse_protocol_key_v1')),null);
      assert.equal(await page.locator('#key').getAttribute('autocomplete'),'current-password');
      assert.equal(await page.locator('#history-values tr').count(),0);
      assert.equal(await page.locator('#history-latest-value').innerText(),'');
      assert.equal(await page.locator('#chart').getAttribute('aria-valuetext'),null);
      const label='Inspect daily trend values. Drag on the chart, or use left and right arrow keys.';
      assert.equal(await page.locator('#chart').getAttribute('aria-label'),label);
      read={status:200,json:fixture()};await page.locator('#key').fill('test-only-not-a-real-private-key-00000');await page.locator('#login .primary').click();await page.locator('#app').waitFor({state:'visible'});
      await page.evaluate(()=>window.RestingBeastPages.showPage('trends'));
      assert.equal(await page.locator('#chart').getAttribute('aria-label'),label);
      assert.ok(await page.locator('#chart').getAttribute('aria-valuetext'));
      await page.evaluate(()=>window.RestingBeastPages.showPage('today'));await page.locator('#lock').click();
      assert.equal(await page.locator('#chart').getAttribute('aria-valuetext'),null);
      await page.locator('#key').fill('test-only-not-a-real-private-key-00000');await page.locator('#login .primary').click();await page.locator('#app').waitFor({state:'visible'});
      await page.evaluate(()=>window.RestingBeastPages.showPage('trends'));assert.equal(await page.locator('#chart').getAttribute('aria-label'),label);
      assert.deepEqual(errors,[]);console.log('PASS: '+engine.name()+' '+width+'px layout/navigation, alerts, save race, midnight resume, rejection, AutoFill markup');
      await context.close();
    }
  }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;});
