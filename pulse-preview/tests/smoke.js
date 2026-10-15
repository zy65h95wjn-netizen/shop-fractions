'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),http=require('node:http'),path=require('node:path');
const {chromium,webkit}=require('playwright');
const engine=process.env.PREVIEW_BROWSER==='webkit'?webkit:chromium;
const ROOT=path.resolve(__dirname,'../..');
const out=process.env.PREVIEW_OUTPUT||'/tmp/resting-beast-preview-smoke';
const server=http.createServer((req,res)=>{
  const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const file=path.resolve(ROOT,'.'+name+(name.endsWith('/')?'index.html':''));
  if(!file.startsWith(ROOT+path.sep)){res.writeHead(403);res.end();return;}
  fs.readFile(file,(err,body)=>{res.writeHead(err?404:200,{
    'Content-Type':file.endsWith('.html')?'text/html':file.endsWith('.css')?'text/css':
      file.endsWith('.js')?'text/javascript':file.endsWith('.svg')?'image/svg+xml':'application/octet-stream'
  });res.end(err?'Not found':body);});
});
(async()=>{
  fs.mkdirSync(out,{recursive:true});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const browser=await engine.launch({headless:true});
  try{
    for(const width of [320,390,430]){
      const ctx=await browser.newContext({viewport:{width,height:844},hasTouch:true,isMobile:true,timezoneId:'America/New_York',serviceWorkers:'block'});
      const page=await ctx.newPage(),errors=[],external=[];
      page.on('pageerror',error=>errors.push(error.message));
      await page.route('**/*',route=>{
        if(route.request().url().startsWith('http://127.0.0.1:'))return route.continue();
        external.push(route.request().url());return route.abort();
      });
      await page.goto('http://127.0.0.1:'+server.address().port+'/pulse-preview/');
      await page.locator('#app').waitFor({state:'visible',timeout:15000});
      assert.equal(await page.locator('#status').innerText(),'Demo');
      assert.match(await page.locator('.preview-banner').innerText(),/FICTIONAL/);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'horizontal overflow');
      assert.equal(await page.locator('[data-history-metric]').count(),4);
      assert.equal(await page.locator('#save').isDisabled(),true);
      assert.equal(await page.evaluate(()=>sessionStorage.getItem('pulse_protocol_key_v1')),null);
      await page.screenshot({path:path.join(out,engine.name()+'-today-'+width+'.png')});
      for(const metric of ['resting_heart_rate','heart_rate','hrv_sdnn','blood_oxygen_saturation']){
        await page.locator('[data-history-metric="'+metric+'"]').click();
        await page.locator('#history-explorer').waitFor({state:'visible'});
        assert.equal(await page.locator('#history-values tr').count(),30);
        await page.locator('[data-history-days="7"]').click();
        assert.equal(await page.locator('#history-values tr').count(),7);
        await page.locator('[data-history-days="90"]').click();
        assert.equal(await page.locator('#history-values tr').count(),90);
        if(metric==='heart_rate')await page.screenshot({path:path.join(out,engine.name()+'-history-'+width+'.png')});
        await page.locator('#history-back').click();
        await page.locator('#overview').waitFor({state:'visible'});
      }
      await page.locator('[data-page-link="trends"]').click();
      await page.locator('#trends').waitFor({state:'visible'});
      await page.locator('[data-page-link="context"]').click();
      await page.locator('#context').waitFor({state:'visible'});
      await page.locator('#edit-bp').click();
      assert.equal(await page.locator('#save').isDisabled(),true);
      await page.locator('#cancel').click();
      await page.locator('[data-page-link="today"]').click();
      await page.locator('#lock').click();
      assert.equal(await page.locator('#status').innerText(),'Demo locked');
      assert.equal(await page.evaluate(()=>sessionStorage.getItem('pulse_protocol_key_v1')),null);
      await page.locator('#login .primary').click();
      await page.locator('#app').waitFor({state:'visible'});
      assert.equal(await page.locator('#status').innerText(),'Demo');
      assert.deepEqual(errors,[]);
      assert.deepEqual(external,[]);
      console.log('PASS '+engine.name()+' '+width+'px: demo, graphs, navigation, no real session/backend writes');
      await ctx.close();
    }
  }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
