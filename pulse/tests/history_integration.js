// Browser-free integration harness. Exercises actual scripts + HTML with synthetic
// data. This models DOM/events/canvas, not CSS layout or a real Safari gesture.
// Run: node pulse/tests/history_integration.js
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const {series,shiftDay,reading}=require('../history-v1.js');
const base=path.resolve(__dirname,'..');
const NOW='2026-10-15T15:00:00Z',DAY='2026-10-15';
const KEY='test-only-not-a-real-private-key-00000';
function fixture(){
  return {resting_hr_method:'latest_end_at_per_local_day',latest:{
    resting_heart_rate:{value:83.75,at:'2026-10-15T14:00:00Z'},
    heart_rate:{value:101.5,at:'2026-10-15T03:30:00Z'},
    hrv_sdnn:{value:44.125,at:'2026-10-14T16:00:00Z'},
    blood_oxygen_saturation:{value:98.625,at:'2026-10-13T16:00:00Z'}
  },daily:Array.from({length:90},(_,i)=>({day:shiftDay(DAY,-i),
    resting_heart_rate:i%6===2?null:83.75-i/10,
    heart_rate:i%7===3?null:76.125+i/10,
    hrv_sdnn:i%8===4?null:38.456+i/10,
    blood_oxygen_saturation:i%9===5?null:97.625+i/100
  })).filter((_,i)=>i!==1),events:[
    {id:'synthetic-trt',kind:'trt',effective_at:'2026-10-01T12:00:00Z',data:{dose_mg:40,interval_days:3,route:'SubQ'}},
    {id:'synthetic-med',kind:'medication',effective_at:'2026-10-01T12:00:00Z',data:{name:'Synthetic medication',dose:'test dose',frequency:'test frequency',status:'active'}}
  ],steps:{today:1234,yesterday:5678,last_completed_day:'2026-10-14'}};
}
class FakeEvent{
  constructor(type,options={}){Object.assign(this,{type,bubbles:false,cancelable:false,defaultPrevented:false},options);}
  preventDefault(){if(this.cancelable)this.defaultPrevented=true;}
}
function canvasContext(){
  return {paths:[],path:[],setTransform(){},clearRect(){this.paths=[];},beginPath(){this.path=[];},
    moveTo(x,y){this.path.push(['move',x,y]);},lineTo(x,y){this.path.push(['line',x,y]);},
    stroke(){this.paths.push({style:this.strokeStyle,path:this.path.slice()});},arc(){},fill(){},fillText(){},setLineDash(){}};
}
function environment(width){
  let document;
  class Node{
    constructor(tag,attrs={}){
      this.tagName=tag.toUpperCase();this.attrs={...attrs};this.children=[];this.parentElement=null;this.events={};
      this.hidden='hidden' in attrs;this.disabled='disabled' in attrs;this.id=attrs.id||'';this.className=attrs.class||'';
      this.dataset={};this.style={};this.value=attrs.value||'';this._text='';
      for(const [k,v] of Object.entries(attrs))if(k.startsWith('data-'))this.dataset[k.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=v;
      this.classList={toggle:(name,on)=>{const a=new Set(this.className.split(' '));if(on)a.add(name);else a.delete(name);this.className=[...a].join(' ');}};
      if(tag==='canvas')this.ctx=canvasContext();
    }
    set textContent(t){this._text=String(t);this.children=[];}
    get textContent(){return this._text+this.children.map(c=>c.textContent).join('');}
    set innerHTML(t){this._text='';this.children=[];parse(t,this);}
    append(...nodes){for(const node of nodes){if(node.tagName==='FRAGMENT'){this.append(...node.children);continue;}node.parentElement=this;this.children.push(node);}}
    replaceChildren(...nodes){this.children=[];this._text='';this.append(...nodes);}
    setAttribute(k,v){this.attrs[k]=String(v);}
    getAttribute(k){return this.attrs[k]??null;}
    removeAttribute(k){delete this.attrs[k];}
    addEventListener(type,fn){(this.events[type]??=[]).push(fn);}
    dispatchEvent(event){if(!event.target)event.target=this;event.currentTarget=this;for(const fn of this.events[event.type]||[])fn(event);if(event.bubbles)this.parentElement?.dispatchEvent(event);return !event.defaultPrevented;}
    click(){this.dispatchEvent(new FakeEvent('click',{bubbles:true,cancelable:true}));}
    focus(){document.activeElement=this;}
    getBoundingClientRect(){return {left:0,top:0,width:width-80,height:this.id==='today-rhr-spark'?146:225};}
    getContext(){return this.ctx;}
    setPointerCapture(){}
    scrollIntoView(){}
    showModal(){this.attrs.open='';}
    close(){delete this.attrs.open;}
    matches(selector){
      if(selector.includes(' ')&&!selector.includes(' > ')){const parts=selector.split(' '),last=parts.pop();return this.matches(last)&&!!this.parentElement?.closest(parts.join(' '));}
      if(selector.includes(' > ')){const [parent,child]=selector.split(' > ');return this.matches(child)&&!!this.parentElement?.matches(parent);}
      const tag=selector.match(/^[a-z]+/i)?.[0];if(tag&&this.tagName!==tag.toUpperCase())return false;
      const id=selector.match(/#([\w-]+)/)?.[1];if(id&&this.id!==id)return false;
      for(const [,name] of selector.matchAll(/\.([\w-]+)/g))if(!this.className.split(' ').includes(name))return false;
      for(const [,name,val] of selector.matchAll(/\[([\w-]+)(?:="([^"]*)")?\]/g))if(!(name in this.attrs)||(val!==undefined&&this.attrs[name]!==val))return false;
      return true;
    }
    querySelectorAll(selector){const out=[];for(const child of this.children){if(selector.split(',').some(s=>child.matches(s.trim())))out.push(child);out.push(...child.querySelectorAll(selector));}return out;}
    querySelector(s){return this.querySelectorAll(s)[0]||null;}
    closest(s){return s.split(',').some(a=>this.matches(a.trim()))?this:this.parentElement?.closest(s)||null;}
  }
  function parse(html,parent){
    const stack=[parent],voids=new Set(['meta','link','input','img','br']);
    for(const token of html.matchAll(/<\/?[a-z][^>]*>|[^<]+/gi)){
      const t=token[0];if(!t.startsWith('<')){stack.at(-1)._text+=t;continue;}
      if(t.startsWith('</')){if(stack.length>1)stack.pop();continue;}
      const tag=t.match(/^<([\w-]+)/)[1];const attrs={};
      for(const [,k,v1,v2] of t.slice(tag.length+1,-1).matchAll(/([\w-]+)(?:="([^"]*)"|='([^']*)')?/g))attrs[k]=v1??v2??'';
      const node=new Node(tag,attrs);stack.at(-1).append(node);
      if(!voids.has(tag)&&!t.endsWith('/>'))stack.push(node);
    }
  }
  document=new Node('document');document.readyState='complete';document.hidden=false;
  document.createElement=tag=>new Node(tag);document.createDocumentFragment=()=>new Node('fragment');
  document.getElementById=id=>document.querySelector('#'+id);
  parse(fs.readFileSync(path.join(base,'index.html'),'utf8'),document);
  for(const select of document.querySelectorAll('select')){
    const opt=select.querySelector('option[selected]')||select.querySelector('option');select.value=opt?.value||opt?.textContent||'';
  }
  const session=new Map([['pulse_protocol_key_v1',KEY]]),frames=new Map();let frameId=0;
  const window=new Node('window');window.document=document;window.window=window;window.innerWidth=width;window.devicePixelRatio=3;window.scrollY=0;
  window.scrollTo=(x,y)=>{window.scrollY=typeof x==='object'?x.top:y;};
  window.requestAnimationFrame=fn=>{frames.set(++frameId,fn);return frameId;};window.cancelAnimationFrame=id=>frames.delete(id);
  window.sessionStorage={getItem:k=>session.get(k)??null,setItem:(k,v)=>session.set(k,v),removeItem:k=>session.delete(k)};
  window.location={hash:''};window.history={replaceState:(_,__,hash)=>window.location.hash=hash};
  window.Event=FakeEvent;window.Date=class extends Date{constructor(...args){super(...(args.length?args:[NOW]));}static now(){return Date.parse(NOW);}};
  window.setInterval=fn=>window.interval=fn;window.console=console;
  let response=fixture(),calls=[],deferred=null;
  window.fetch=async(url,options)=>{
    calls.push({url,body:JSON.parse(options.body)});
    if(deferred)return await new Promise(resolve=>{deferred.resolve=resolve;});
    return {ok:true,status:200,json:async()=>structuredClone(response)};
  };
  const context=vm.createContext(window);
  for(const file of ['history-v1.js','app-iron-v11.js','compare.js','pages-v1.js'])vm.runInContext(fs.readFileSync(path.join(base,file),'utf8'),context,{filename:file});
  return {window,document,calls,session,get data(){return response;},set data(data){response=data;},
    defer(){deferred={};return deferred;},flush(){for(const [id,fn] of frames){frames.delete(id);fn();}}};
}
const settle=()=>new Promise(resolve=>setImmediate(resolve));
async function test(width){
  const env=environment(width),{window:w,document:d}=env,$=id=>d.getElementById(id);
  await settle();env.flush();
  assert.equal($('app').hidden,false);assert.equal($('steps-today').textContent,'1,234');
  const open=metric=>d.querySelector('[data-history-metric="'+metric+'"]').querySelector('.number').click();
  assert.equal(d.querySelectorAll('[data-history-metric]').length,4,'one control per measurement, no duplicate History buttons');
  for(const id of ['rhr','hr','hrv','spo2']){
    const button=$(id).parentElement;assert.equal(button.tagName,'BUTTON');
    assert.equal(button.getAttribute('type'),'button');
    assert.ok(button.getAttribute('aria-label').includes('history'));
    assert.equal(button.getAttribute('aria-describedby'),id+' '+id+'-at');
  }
  assert.equal($('rhr').textContent,'84bpm','existing rounded Today value and unit formatting remain');
  assert.equal($('hr').textContent,'102bpm');assert.equal($('hrv').textContent,'44ms');
  assert.equal($('spo2').textContent,'98.6%','existing SpO₂ precision remains');
  const specs=[['resting_heart_rate','Resting heart rate','bpm'],['heart_rate','Heart rate','bpm'],['hrv_sdnn','HRV / SDNN','ms'],['blood_oxygen_saturation','Blood oxygen / SpO₂','%']];
  for(const [metric,name,unit] of specs){
    w.scrollY=375;open(metric);
    assert.equal($('overview').hidden,true);assert.equal($('history-title').textContent,name);
    assert.equal(w.scrollY,0);assert.equal(d.activeElement,$('history-title'));
    assert.equal($('history-latest-value').textContent,reading(env.data.latest[metric].value,unit));
    if(metric==='heart_rate')assert.ok($('history-latest-at').textContent.includes('Oct 14, 2026'),'latest timestamp uses New York date');
    for(const days of [7,30,90]){
      d.querySelector('[data-history-days="'+days+'"]').click();
      const expected=series(env.data.daily,metric,days,DAY),rows=$('history-values').children;
      assert.equal(rows.length,days);assert.equal(rows[0].dataset.day,DAY,'today must be the first list row');
      assert.ok(rows.every((row,i)=>i===0||row.dataset.day<rows[i-1].dataset.day),'list is strictly newest-first');assert.equal($('history-chart').getAttribute('aria-valuemax'),String(days));
      for(let i=0;i<days;i++){
        const row=rows[days-1-i];
        assert.equal(row.dataset.day,expected[i].day);
        assert.equal(row.children[1].textContent,reading(expected[i].value,unit));
        $('history-scrubber').value=String(i);$('history-scrubber').dispatchEvent(new FakeEvent('input'));
        assert.equal($('history-reading').textContent,row.children[1].textContent);
        assert.ok($('history-day').textContent.startsWith(row.children[0].textContent),'selected date and list date agree too');
      }
      const graph=$('history-chart').ctx.paths.find(p=>p.style==='#e5b878');
      let expectedLines=0;for(let i=1;i<expected.length;i++)if(expected[i-1].value!==null&&expected[i].value!==null)expectedLines++;
      assert.equal(graph.path.filter(p=>p[0]==='line').length,expectedLines,'missing dates break graph segments');
    }
    assert.ok($('history-list-caption').textContent.includes(metric==='resting_heart_rate'?'Watch estimate':'Daily average'));
    $('history-chart').dispatchEvent(new FakeEvent('keydown',{key:'Home',cancelable:true}));
    assert.equal($('history-chart').getAttribute('aria-valuenow'),'1');
    assert.ok($('history-day').textContent.startsWith($('history-values').children.at(-1).children[0].textContent),'graph starts with oldest day, at bottom of list');
    $('history-chart').dispatchEvent(new FakeEvent('keydown',{key:'ArrowRight',cancelable:true}));
    assert.equal($('history-chart').getAttribute('aria-valuenow'),'2');
    $('history-chart').dispatchEvent(new FakeEvent('keydown',{key:'End',cancelable:true}));
    assert.equal($('history-chart').getAttribute('aria-valuenow'),'90');
    // Touch direction tests verify cancellation behavior, not native scrolling.
    const touch=(x,y)=>({identifier:1,clientX:x,clientY:y});
    const start=new FakeEvent('touchstart',{bubbles:true,touches:[touch(80,100)],changedTouches:[touch(80,100)]});
    $('history-chart').dispatchEvent(start);
    const vertical=new FakeEvent('touchmove',{cancelable:true,touches:[touch(82,180)]});$('history-chart').dispatchEvent(vertical);
    assert.equal(vertical.defaultPrevented,false,'vertical page scrolling stays available');
    $('history-chart').dispatchEvent(start);
    const horizontal=new FakeEvent('touchmove',{cancelable:true,touches:[touch(180,102)]});$('history-chart').dispatchEvent(horizontal);
    assert.equal(horizontal.defaultPrevented,true,'horizontal scrubbing owns gesture');
    $('history-chart').dispatchEvent(new FakeEvent('touchcancel'));
    $('history-back').click();env.flush();assert.equal(w.scrollY,375);assert.equal($('history-explorer').hidden,true);
    assert.equal(d.activeElement.dataset.historyMetric,metric,'focus returns to opener');
  }
  assert.equal(env.calls.length,1,'opening/ranging/scrubbing does not fetch health data');
  open('heart_rate');d.querySelector('[data-history-days="7"]').click();
  $('history-scrubber').value='0';$('history-scrubber').dispatchEvent(new FakeEvent('input'));
  env.data.daily[0].heart_rate=77.375;env.data.latest.heart_rate.value=104.25;
  $('refresh').click();await settle();
  assert.equal($('history-values').children.length,7,'live refresh preserves range');
  assert.equal($('history-chart').getAttribute('aria-valuenow'),'1','live refresh preserves selected day');
  assert.equal($('history-values').children[0].children[1].textContent,'77.375 bpm');
  assert.equal($('history-latest-value').textContent,'104.25 bpm');
  w.RestingBeastPages.showPage('trends');env.flush();assert.equal($('history-explorer').hidden,true);assert.equal($('trends').hidden,false);
  $('chart').dispatchEvent(new FakeEvent('keydown',{key:'Home',cancelable:true}));
  assert.equal($('chart').getAttribute('aria-valuenow'),'1','existing Trends keyboard scrub survives');
  $('chart-scrubber').value='20';$('chart-scrubber').dispatchEvent(new FakeEvent('input'));
  assert.equal($('chart').getAttribute('aria-valuenow'),'21','existing native scrub survives');
  d.querySelector('[data-page-link="context"]').click();
  assert.equal(w.RestingBeastPages.getCurrentPage(),'context','existing dock routes still operate');
  for(const [id,kind] of [['edit-trt','trt'],['add-med','medication'],['edit-nicotine','nicotine'],['edit-caffeine','caffeine'],['edit-bp','bp']]){
    $(id).click();assert.equal($('kind').value,kind);assert.ok('open' in $('dlg').attrs);assert.ok($('fields').children.length);$('cancel').click();
  }
  $('edit-bp').click();$('sys').value='120';$('dia').value='80';$('pulse').value='65';
  $('event-form').dispatchEvent(new FakeEvent('submit',{cancelable:true}));await settle();
  assert.ok(env.calls.some(c=>c.url.endsWith('pulse_write')&&c.body.p_data.systolic===120),'existing logging reaches mock write only');
  w.RestingBeastPages.showPage('today');
  const swipe=(target,x1,y1,x2,y2)=>{
    target.dispatchEvent(new FakeEvent('touchstart',{bubbles:true,touches:[{identifier:7,clientX:x1,clientY:y1}]}));
    target.dispatchEvent(new FakeEvent('touchend',{bubbles:true,changedTouches:[{identifier:7,clientX:x2,clientY:y2}]}));
  };
  swipe($('overview'),220,200,100,203);assert.equal(w.RestingBeastPages.getCurrentPage(),'trends','existing page swipe still operates');
  swipe($('trends'),100,200,220,203);assert.equal(w.RestingBeastPages.getCurrentPage(),'today');
  open('heart_rate');swipe($('history-values'),220,200,100,203);
  assert.equal(w.PulseHistory.isOpen(),true,'history gesture must not switch underlying page');
  $('history-back').click();w.RestingBeastPages.showPage('context');env.flush();
  assert.equal($('overview').hidden,true,'navigation cancels pending Back restoration');
  w.RestingBeastPages.showPage('today');open('heart_rate');
  // Empty response must replace old protected content while staying in explorer.
  env.data={...fixture(),daily:[],latest:{}};$('refresh').click();await settle();
  assert.equal($('history-empty').hidden,false);assert.ok($('history-coverage').textContent.startsWith('0/30'));
  assert.equal($('history-latest-value').textContent,'No reading');
  assert.ok($('history-values').children.every(row=>row.children[1].textContent==='No reading'));
  const pending=env.defer();$('refresh').click();await settle();
  $('history-lock').click();assert.equal($('app').hidden,true);assert.equal($('history-explorer').hidden,true);
  assert.equal($('history-values').children.length,0);assert.equal($('history-latest-value').textContent,'');assert.equal(env.session.size,0);assert.equal($('history-scrubber').getAttribute('aria-valuetext'),null);
  open('heart_rate');assert.equal($('history-explorer').hidden,true,'cannot reopen while locked');
  pending.resolve({ok:true,status:200,json:async()=>fixture()});await settle();assert.equal($('app').hidden,true,'late response cannot unlock history or app');
  assert.equal($('history-values').children.length,0);
  console.log('PASS: modeled '+width+'px canvas: four native value buttons, newest-first list/chronological graph agreement at 7/30/90, gaps, latest, refresh, Back/focus, lock/race, existing Trends and forms');
}
module.exports={fixture};
if(require.main===module)(async()=>{for(const width of [320,390,430])await test(width);})().catch(e=>{console.error(e);process.exitCode=1;});
