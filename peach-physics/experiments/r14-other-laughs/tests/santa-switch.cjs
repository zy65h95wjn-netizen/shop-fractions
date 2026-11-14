// Late Santa/elf fetch or resume must never play into the newly selected voice.
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
const dir=path.resolve(__dirname,'..'),base='http://127.0.0.1:8000/peach-physics/experiments/r14-other-laughs/';
const files={santa:'assets/santa-ho-ho-ho.mp3',holly:'assets/audio/holly-giggle.wav'};
const html=fs.readFileSync(dir+'/index.html','utf8').replace('presentCharacter();\ngetPhoto','window.__audioTest={ac:()=>audioContext};\npresentCharacter();\ngetPhoto');
let checks=0;const results=[],eq=(a,b,m)=>{assert.deepEqual(a,b,m);checks++;};
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});try{
 for(const fallback of [false,true])for(const mode of ['load','resume'])for(const [from,to]of [['santa','holly'],['holly','santa']]){
  const c=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.addInitScript(fallback=>{
   if(fallback){const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(t,...a){return t.includes('webgl')?null:get.call(this,t,...a);};}
   window.__starts={};const start=AudioBufferSourceNode.prototype.start;AudioBufferSourceNode.prototype.start=function(...args){if(this.buffer?.duration>1.3){const id=__peachPhysicsDebug.snapshot().character;__starts[id]=(__starts[id]||0)+1;}return start.apply(this,args);};
  },fallback);
  await p.route('**/index.html?*',r=>r.fulfill({contentType:'text/html',body:html}));let release;const gate=new Promise(r=>release=r);
  if(mode==='load')await p.route('**/'+files[from],async r=>{await gate;await r.fulfill({body:fs.readFileSync(dir+'/'+files[from]),contentType:from==='santa'?'audio/mpeg':'audio/wav'});});
  await p.goto(base+'index.html?character='+from);await p.click('#gear');await p.click('#slapAudio');
  if(mode==='resume'){
   await p.waitForFunction(id=>id==='santa'?__santaAudioDebug.snapshot().ready&&!__santaAudioDebug.snapshot().active:__hollyAudioDebug.snapshot().ready,from);
   await p.evaluate(()=>{const ac=__audioTest.ac();window.forcedState='interrupted';Object.defineProperty(ac,'state',{get:()=>forcedState,configurable:true});ac.dispatchEvent(new Event('statechange'));ac.resume=()=>new Promise(resolve=>{window.finishResume=()=>{forcedState='running';resolve();};});});
  }
  const before=await p.evaluate(id=>__starts[id]||0,from);await p.click('#testSound');
  eq(await p.evaluate(id=>id==='santa'?__santaAudioDebug.snapshot().pending:__hollyAudioDebug.snapshot().pending,from),true,'one pending '+from+' '+mode);
  await p.evaluate(id=>__peachPhysicsDebug.switchCharacter(id),to);await p.waitForFunction(id=>__peachPhysicsDebug.snapshot().character===id,to);
  if(mode==='resume')await p.evaluate(()=>{forcedState='running';});
  await p.click('#slapAudio');if(to==='holly')await p.click('#testSound');
  await p.waitForFunction(id=>id==='santa'?__santaAudioDebug.snapshot().active:__hollyAudioDebug.snapshot().active,to);
  if(mode==='load')release();else await p.evaluate(()=>finishResume());await p.waitForTimeout(200);
  eq(await p.evaluate(id=>__starts[id]||0,from),before,'old source never replays');eq(await p.evaluate(id=>__starts[id]||0,to),1,'new source plays once');
  const s=await p.evaluate(()=>({santa:__santaAudioDebug.snapshot(),elves:__elfAudioDebug.snapshot()}));eq(Number(s.santa.active)+s.elves.activeCount,1,'one active phrase');eq(Number(s.santa.pending)+s.elves.pendingCount,0,'no pending queue');eq(errors,[],'no browser errors');
  results.push({renderer:fallback?'canvas':'webgl',from,to,mode,passed:true});await c.close();
 }
 fs.writeFileSync(__dirname+'/santa-switch.json',JSON.stringify({checks,results,passed:true},null,2)+'\n');console.log({checks,passed:true});
}finally{await b.close();}})().catch(e=>{console.error(e);process.exit(1)});
