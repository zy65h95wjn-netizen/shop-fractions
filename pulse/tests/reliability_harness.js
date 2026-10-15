// Browser-free integration harness. Exercises actual scripts + HTML with synthetic
// data. This models DOM/events/canvas, not CSS layout or a real Safari gesture.
// Shared by frontend_reliability.js and reliability_browser.js.
'use strict';
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const shiftDay=(s,n)=>{const d=new Date(s+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);};
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
function environment(width=390){
  let now=NOW;const intervals=[];
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
    set value(v){this._value=String(v);}
    get value(){return this._value;}
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
    get open(){return 'open' in this.attrs;}
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
  window.Event=FakeEvent;window.Date=class extends Date{constructor(...args){super(...(args.length?args:[now]));}static now(){return Date.parse(now);}};
  window.setInterval=(fn,ms)=>intervals.push({fn,ms});window.console=console;
  const response=fixture(),calls=[],queue=[];
  window.fetch=async(url,options)=>{
    calls.push({url,body:JSON.parse(options.body)});
    if(queue.length)return queue.shift()(url,options);
    return {ok:true,status:200,json:async()=>structuredClone(response)};
  };
  const context=vm.createContext(window);
  for(const file of ['app-iron-v11.js','compare.js','pages-v1.js'])vm.runInContext(fs.readFileSync(path.join(base,file),'utf8'),context,{filename:file});
  return {window,document,calls,session,context,data:response,
    at(t){now=t;},tick(ms){intervals.filter(x=>x.ms===ms).forEach(x=>x.fn());},
    next(status,payload){queue.push(async()=>({ok:status>=200&&status<300,status,json:async()=>payload}));},
    network(){queue.push(async()=>{throw Error('Synthetic offline');});},
    defer(){let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});queue.push(()=>promise);return {resolve,reject};},
    flush(){for(const [id,fn] of frames){frames.delete(id);fn();}}};
}
const settle=()=>new Promise(resolve=>setImmediate(resolve));

module.exports={environment,fixture,FakeEvent,settle};
