// Entirely synthetic; actual application scripts/HTML, mocked transport and clock.
'use strict';
const assert=require('node:assert/strict');
const {environment,fixture,FakeEvent,settle}=require('./reliability_harness');
const key='test-only-not-a-real-private-key-00000';
const ok=data=>({ok:true,status:200,json:async()=>data});
async function setup(){const e=environment();await settle();e.flush();e.$=id=>e.document.getElementById(id);return e;}
const openHistory=e=>e.document.querySelector('[data-history-metric="heart_rate"]').click();
const chartLabel='Inspect daily trend values. Drag on the chart, or use left and right arrow keys.';
const submit=e=>e.$('event-form').dispatchEvent(new FakeEvent('submit',{cancelable:true}));
function locked(e){assert.equal(e.$('app').hidden,true);assert.equal(e.$('status').textContent,'Locked');assert.equal(e.session.size,0);assert.equal(e.$('key').value,'');assert.equal(e.$('dlg').open,false);assert.equal(e.$('hr').textContent,'—');assert.equal(e.$('history').textContent.includes('40 mg'),false);assert.equal(e.$('chart').getAttribute('aria-valuetext'),null);assert.equal(e.$('trt-rail').children.length,0);assert.equal(e.$('fields').children.length,0);assert.equal(e.$('med-list').textContent.includes('Synthetic medication'),false);assert.equal(e.window.PulseHistory.isOpen(),false);assert.equal(e.$('history-values').children.length,0);for(const id of ['history-latest-value','history-latest-at','history-day','history-reading'])assert.equal(e.$(id).textContent,'');assert.equal(e.$('history-chart').getAttribute('aria-valuetext'),null);assert.equal(e.$('history-scrubber').getAttribute('aria-valuetext'),null);assert.equal(e.$('chart').getAttribute('aria-label'),chartLabel);assert.equal(e.$('today-rhr-spark').getAttribute('aria-label'),null);}
(async()=>{
  for(const page of ['today','trends','context','history']){
    const e=await setup();assert.equal(e.$('app').hidden,false);
    if(page==='history'){openHistory(e);assert.equal(e.window.PulseHistory.isOpen(),true);}
    else e.window.RestingBeastPages.showPage(page);
    e.$('edit-bp').click();e.$('sys').value='123';
    e.next(401,{code:'key_mismatch'});e.$('refresh').click();await settle();locked(e);
    assert.match(e.$('login-error').textContent,/Unlock again/);
    // Valid login again with unchanged password semantics.
    e.$('key').value=key;e.$('login').dispatchEvent(new FakeEvent('submit',{cancelable:true}));await settle();
    assert.equal(e.$('app').hidden,false);assert.equal(e.$('key').value,'');
    e.window.RestingBeastPages.showPage('trends');e.flush();assert.equal(e.$('chart').getAttribute('aria-label'),chartLabel);assert.ok(e.$('chart').getAttribute('aria-valuetext'));
    e.window.RestingBeastPages.showPage('today');openHistory(e);assert.equal(e.$('history-latest-value').textContent,'101.5 bpm');
  }
  console.log('PASS: explicit rejection locks/clears all pages, actual History clearing, reauthentication and restored Trends accessible name');
  {
    const e=await setup();
    for(const page of ['today','trends','context','history']){
      e.window.RestingBeastPages.showPage(page==='history'?'today':page);if(page==='history')openHistory(e);
      const historyBefore=e.$('history-values').textContent,updated=e.$('updated').textContent;e.next(503,{code:'key_mismatch'});e.$('refresh').click();await settle();
      assert.equal(e.session.size,1);assert.equal(e.$('app').hidden,false);assert.equal(e.$('status').textContent,'Stale');
      assert.match(e.$('error').textContent,/previously loaded/);assert.equal(e.$('hr').textContent,'102bpm');
      assert.equal(e.$('error').closest('.app-page'),null,'shared alert outside page visibility');assert.equal(e.$('error').closest('#history-explorer'),null);assert.equal(e.$('updated').textContent,updated,'failed refresh cannot advance freshness');
      if(page==='history'){assert.equal(e.window.PulseHistory.isOpen(),true);assert.equal(e.$('history-values').textContent,historyBefore);assert.equal(e.$('history-latest-value').textContent,'101.5 bpm');}
    }
    for(const [status,payload] of [[401,{code:'upstream_auth_unavailable'}],[500,{}]]){
      e.next(status,payload);e.$('refresh').click();await settle();assert.equal(e.session.size,1);
    }
    e.network();e.$('refresh').click();await settle();assert.equal(e.session.size,1);
    e.$('refresh').click();await settle();assert.equal(e.$('error').textContent,'');assert.equal(e.$('status').textContent,'Protected');
  }
  console.log('PASS: network/5xx/unconfirmed 401 preserve safe cached data and credential; success clears stale alert');
  {
    const e=await setup(),pending=e.defer();openHistory(e);e.$('refresh').click();e.$('lock').click();locked(e);
    pending.resolve(ok(fixture()));await settle();locked(e);
    e.$('key').value=key;e.$('login').dispatchEvent(new FakeEvent('submit',{cancelable:true}));await settle();
    const old=e.defer();e.$('refresh').click();e.$('refresh').click();await settle();
    old.resolve({ok:false,status:401,json:async()=>({code:'key_mismatch'})});await settle();locked(e);
  }
  console.log('PASS: pending read after lock cannot unlock; superseded read rejection still locks matching session');
  for(const [before,after,previous,nextPrevious] of [
    ['2026-10-16T03:59:59Z','2026-10-16T04:00:01Z','2026-10-14','2026-10-15'],
    ['2026-03-08T04:59:59Z','2026-03-09T04:00:01Z','2026-03-06','2026-03-08'],
    ['2026-11-01T03:59:59Z','2026-11-02T05:00:01Z','2026-10-30','2026-11-01']]){
    const e=await setup();e.at(before);e.data.steps={today:0,yesterday:5678,last_completed_day:previous};
    e.$('refresh').click();await settle();assert.equal(e.$('steps-today').textContent,'0');assert.match(e.$('steps-today-note').textContent,/So far today/);
    const pending=e.defer();e.at(after);e.tick(1000);
    assert.equal(e.$('steps-today').textContent,'—');assert.equal(e.$('steps-yesterday').textContent,'—');assert.match(e.$('steps-today-note').textContent,/unverified/);
    pending.resolve(ok({...fixture(),steps:{today:null,yesterday:9876,last_completed_day:nextPrevious}}));await settle();
    assert.equal(e.$('steps-today').textContent,'—');assert.match(e.$('steps-today-note').textContent,/not zero/);assert.equal(e.$('steps-yesterday').textContent,'9,876');
  }
  {
    const e=await setup();e.at('2026-10-17T13:00:00Z');const pending=e.defer();
    e.document.hidden=true;e.document.dispatchEvent(new FakeEvent('visibilitychange'));const calls=e.calls.length;
    e.document.hidden=false;e.document.dispatchEvent(new FakeEvent('visibilitychange'));
    assert.equal(e.calls.length,calls+1);assert.match(e.$('steps-today-note').textContent,/unverified/);
    pending.resolve(ok(fixture()));await settle();assert.equal(e.$('steps-today').textContent,'—');
    e.data.steps={today:1234,yesterday:5678};e.$('refresh').click();await settle();assert.equal(e.$('steps-today').textContent,'—');
    for(const event of ['pageshow','focus']){const n=e.calls.length;e.window.dispatchEvent(new FakeEvent(event));await settle();assert.equal(e.calls.length,n+1);}
  }
  console.log('PASS: NY midnight, spring/fall DST overnight, visible/pageshow/focus resume, zero versus missing, absent/stale marker');
  for(const outcome of ['success','failure','reject','lock']){
    const e=await setup();openHistory(e);e.$('edit-trt').click();const pending=e.defer();submit(e);
    const write=e.calls.at(-1);assert.ok(write.url.endsWith('pulse_write'));assert.equal(write.body.p_data.dose_mg,40);
    e.$('cancel2').click();e.$('edit-bp').click();e.$('sys').value='127';e.$('dia').value='81';
    if(outcome==='lock'){e.$('lock').click();pending.resolve(ok({}));await settle();locked(e);continue;}
    // Simulate the queued native close from the canceled session arriving late.
    e.$('dlg').dispatchEvent(new FakeEvent('close'));
    if(outcome==='failure')pending.reject(Error('Synthetic network failure'));
    else if(outcome==='reject')pending.resolve({ok:false,status:401,json:async()=>({code:'28000'})});
    else pending.resolve(ok({}));
    await settle();
    if(outcome==='reject'){locked(e);continue;}
    assert.equal(e.$('dlg').open,true);assert.equal(e.$('kind').value,'bp');assert.equal(e.$('sys').value,'127');assert.equal(e.$('save').disabled,false);assert.equal(e.$('save-error').textContent,'');
    assert.match(e.$('save-notice').textContent,outcome==='success'?/earlier entry was saved/:/could not be confirmed/);
    submit(e);await settle();assert.equal(e.calls.filter(x=>x.url.endsWith('pulse_write')).at(-1).body.p_data.systolic,127);
    assert.equal(e.$('dlg').open,false);
  }
  {
    const e=await setup();e.$('edit-bp').click();e.$('sys').value='121';e.$('dia').value='79';
    const pending=e.defer();submit(e);e.$('refresh').click();await settle();pending.resolve(ok({}));await settle();assert.equal(e.$('dlg').open,false,'harmless refresh must not invalidate active save');
    e.$('edit-trt').click();const p=e.defer();submit(e);e.$('dlg').dispatchEvent(new FakeEvent('cancel'));e.$('dlg').close();e.$('edit-caffeine').click();p.reject(Error('Old error'));await settle();assert.equal(e.$('save-error').textContent,'');assert.equal(e.$('dlg').open,true);
  }
  {
    const e=await setup();e.$('edit-trt').click();const old=e.defer();submit(e);
    e.$('cancel').click();e.$('edit-bp').click();e.$('sys').value='120';e.$('dia').value='80';const newer=e.defer();submit(e);
    old.resolve(ok({}));await settle();assert.equal(e.$('save').disabled,true,'old completion cannot enable newer pending save');assert.equal(e.$('dlg').open,true);
    newer.resolve(ok({}));await settle();assert.equal(e.$('dlg').open,false);
    const p=e.defer();e.$('refresh').click();e.$('lock').click();e.$('key').value=key;e.$('login').dispatchEvent(new FakeEvent('submit',{cancelable:true}));await settle();
    p.resolve({ok:false,status:401,json:async()=>({code:'key_mismatch'})});await settle();assert.equal(e.$('app').hidden,false,'old session rejection cannot lock new login');
  }
  console.log('PASS: save/cancel/reopen races, old success/error/rejection, queued close, native cancel, lock, independent refresh');
  {
    const e=await setup();
    for(const [id,kind,values] of [
      ['edit-trt','trt',{dose:'40',interval:'3',route:'IM'}],
      ['add-med','medication',{name:'Synthetic other medication','med-status':'active','med-dose':'test','frequency':'daily'}],
      ['edit-nicotine','nicotine',{level:'low',notes:'synthetic'}],
      ['edit-caffeine','caffeine',{level:'none',notes:'synthetic'}],
      ['edit-bp','bp',{sys:'122',dia:'80',pulse:'66'}]]){
      e.$(id).click();for(const [name,value]of Object.entries(values))e.$(name).value=value;submit(e);await settle();
      const write=e.calls.filter(x=>x.url.endsWith('pulse_write')).at(-1);assert.equal(write.body.p_kind,kind);assert.ok(write.body.p_effective_at.endsWith('Z'));
      if(kind==='trt')assert.deepEqual(write.body.p_data,{dose_mg:40,interval_days:3,route:'IM'});
      if(kind==='bp')assert.deepEqual(write.body.p_data,{systolic:122,diastolic:80,pulse:66});
    }
    e.window.RestingBeastPages.showPage('trends');e.flush();e.$('chart').dispatchEvent(new FakeEvent('keydown',{key:'Home',cancelable:true}));assert.equal(e.$('chart').getAttribute('aria-valuenow'),'1');
    e.$('chart-scrubber').value='20';e.$('chart-scrubber').dispatchEvent(new FakeEvent('input'));assert.equal(e.$('chart').getAttribute('aria-valuenow'),'21');
    const input=e.$('key');assert.equal(input.getAttribute('autocomplete'),'current-password');assert.equal(input.getAttribute('name'),'password');assert.equal(input.getAttribute('type'),'password');
    assert.equal(e.$('error').getAttribute('role'),'alert');assert.equal(e.$('login-error').getAttribute('role'),'alert');
  }
  {
    for(const empty of [false,true]){
      const e=await setup();e.window.RestingBeastPages.showPage('trends');e.flush();
      assert.equal(e.$('chart').getAttribute('aria-label'),chartLabel);
      e.$('chart').dispatchEvent(new FakeEvent('keydown',{key:'Home',cancelable:true}));
      assert.ok(e.$('chart').getAttribute('aria-valuetext'));
      e.$('lock').click();locked(e);
      if(empty){e.data.daily=[];e.data.latest={};}
      e.$('key').value=key;e.$('login').dispatchEvent(new FakeEvent('submit',{cancelable:true}));await settle();
      e.window.RestingBeastPages.showPage('trends');e.flush();
      assert.equal(e.$('chart').getAttribute('aria-label'),chartLabel,'static accessible name survives lock and re-unlock, including empty data');
      assert.ok(e.$('chart').getAttribute('aria-valuetext'));
      if(empty)assert.equal(e.$('chart').getAttribute('aria-valuetext'),'No recorded data');
      else assert.match(e.$('chart').getAttribute('aria-valuetext'),/bpm/);
    }
  }
  console.log('PASS: manual lock/re-unlock Trends label regression with populated and empty data');
  console.log('PASS: all five logging payloads, Trends/chart inspection, existing login/AutoFill markup, accessible alerts');
})().catch(e=>{console.error(e);process.exitCode=1;});
