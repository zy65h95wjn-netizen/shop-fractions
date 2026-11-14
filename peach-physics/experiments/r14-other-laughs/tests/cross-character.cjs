// A late load/resume from one character must not interrupt or overlap another.
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
const dir=path.resolve(__dirname,'..'),base='http://127.0.0.1:8000/peach-physics/experiments/r14-other-laughs/';
const files={ember:'assets/candidates/cv-1.wav',midnight:'assets/candidates/splice-1.wav',aurelia:'assets/candidates/mox-1.wav',holly:'assets/audio/holly-giggle.wav'};
const html=fs.readFileSync(dir+'/index.html','utf8').replace('presentCharacter();\ngetPhoto','window.__audioTest={ac:()=>audioContext};\npresentCharacter();\ngetPhoto');
let checks=0;const results=[],eq=(a,b,m)=>{assert.deepEqual(a,b,m);checks++;};
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});try{
 for(const fallback of [false,true])for(const mode of ['late load','late resume'])for(const [from,to]of [['ember','midnight'],['midnight','aurelia'],['aurelia','holly'],['holly','ember']]){
  const c=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  if(fallback)await p.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type.includes('webgl')?null:get.call(this,type,...args);};});
  await p.route('**/index.html?*',r=>r.fulfill({contentType:'text/html',body:html}));
  let release;const gate=new Promise(r=>release=r);
  if(mode==='late load')await p.route('**/'+files[from],async r=>{await gate;await r.fulfill({contentType:'audio/wav',body:fs.readFileSync(dir+'/'+files[from])});});
  await p.goto(base+'index.html?character='+from);await p.click('#gear');await p.click('#slapAudio');
  if(mode==='late resume'){
   await p.waitForFunction(()=>__elfAudioDebug.snapshot().current.ready);
   await p.evaluate(()=>{const ac=__audioTest.ac();window.forcedState='interrupted';Object.defineProperty(ac,'state',{get:()=>forcedState,configurable:true});ac.dispatchEvent(new Event('statechange'));ac.resume=()=>new Promise(resolve=>{window.finishResume=()=>{forcedState='running';resolve();};});});
  }
  await p.click('#testSound');eq(await p.evaluate(()=>__elfAudioDebug.snapshot().pendingCount),1,'one pending '+mode);
  await p.evaluate(id=>__peachPhysicsDebug.switchCharacter(id),to);await p.waitForFunction(id=>__peachPhysicsDebug.snapshot().character===id,to);
  if(mode==='late resume')await p.evaluate(()=>{forcedState='running';});
  await p.click('#slapAudio');await p.click('#testSound');await p.waitForFunction(()=>__elfAudioDebug.snapshot().current.active);
  if(mode==='late load'){release();await p.waitForFunction(id=>__elfAudioDebug.snapshot().players[id].ready,from);}else await p.evaluate(()=>finishResume());
  await p.waitForTimeout(120);
  const state=await p.evaluate(()=>__elfAudioDebug.snapshot());eq(state.players[from].counts.test,0,'stale request never starts '+mode);eq(state.players[to].counts.test,1,'new character starts once '+mode);eq(state.activeCount,1,'new character alone '+mode);eq(state.pendingCount,0,'no pending queue '+mode);
  eq(errors,[],'no page errors');results.push({from,to,mode,renderer:fallback?'canvas':'webgl',passed:true});await c.close();
 }
 fs.writeFileSync(__dirname+'/cross-character.json',JSON.stringify({checks,results,passed:true},null,2)+'\n');console.log({checks,passed:true});
}finally{await b.close();}})().catch(e=>{console.error(e);process.exit(1)});
