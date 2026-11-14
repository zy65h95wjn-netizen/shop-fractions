const h=require('../../../v8/tests/harness.cjs');
const dir=h.path.resolve(__dirname,'..'),version='experiments/r14-other-laughs';
const source='/tmp/r142-santa-lifecycle.html';h.fs.writeFileSync(source,h.fs.readFileSync(dir+'/index.html','utf8').replace('presentCharacter();\ngetPhoto','window.__audioTest={ac:()=>audioContext,buffer:()=>santaVoiceBuffer,motion,visual:()=>{santaLaughEnabled=true;startSantaLaugh();for(let i=0;i<240;i++)step(1/120);santaLaughEnabled=false;}};\npresentCharacter();\ngetPhoto'));
const suite=h.fs.readFileSync(__dirname+'/audio.cjs','utf8');
const capture=eval('('+suite.slice(suite.indexOf('async function capture('),suite.indexOf('async function clearCapture')).trim()+')');
const clearCapture=eval('('+suite.slice(suite.indexOf('async function clearCapture('),suite.indexOf('async function recorded(')).trim()+')');
const recorded=eval('('+suite.slice(suite.indexOf('async function recorded('),suite.indexOf('async function cancelCase(')).trim()+')');
const active=p=>p.waitForFunction(()=>__santaAudioDebug.snapshot().active,null,{polling:20}),done=p=>p.waitForFunction(()=>!__santaAudioDebug.snapshot().active&&!__santaAudioDebug.snapshot().pending,null,{polling:20});
const control=async(p,id)=>{if(!await p.locator('#panel').evaluate(e=>e.classList.contains('open')))await p.click('#gear');await p.click('#'+id);};
let checks=0;const results=[],ok=(v,m)=>{h.assert.ok(v,m);checks++;},eq=(a,b,m)=>{h.assert.deepEqual(a,b,m);checks++;};
(async()=>{const b=await h.chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});try{
 for(const fallback of [false,true]){
  const {page:p,context,errors}=await h.setup(b,version,{width:390,height:844},true,fallback,false,source),renderer=fallback?'canvas':'webgl';
  await p.evaluate(()=>__test.chooseCharacter(4));await p.waitForFunction(()=>__peachPhysicsDebug.snapshot().character==='santa',null,{polling:20});
  await control(p,'slapAudio');await active(p);await done(p);await capture(p);
  await clearCapture(p);await control(p,'testSound');await active(p);
  await p.evaluate(()=>__audioTest.visual());ok(await p.evaluate(()=>__santaAudioDebug.snapshot().active),'visual sequence completion cannot cut off phrase');
  await done(p);await p.waitForTimeout(120);const stats=await recorded(p,'santa-'+renderer+'-test');ok(stats.peak>.5&&stats.peak<1&&stats.rms>.03,'Santa actual PCM non-silent and unclipped');
  await p.evaluate(()=>{window.__santaReference={rate:__audioTest.buffer().sampleRate,values:Array.from(__audioTest.buffer().getChannelData(0))};});
  const ref=await p.evaluate(()=>__santaReference);const pcm=Buffer.alloc(ref.values.length*2);ref.values.forEach((v,i)=>pcm.writeInt16LE(Math.max(-32768,Math.min(32767,Math.round(v*32767))),i*2));h.fs.writeFileSync(__dirname+'/santa-'+renderer+'-reference.pcm',pcm);h.fs.writeFileSync(__dirname+'/santa-'+renderer+'-reference.json',JSON.stringify({sampleRate:ref.rate,samples:ref.values.length}));
  const actions={mute:()=>control(p,'slapAudio'),reset:()=>p.evaluate(()=>__test.reset()),hide:()=>p.evaluate(()=>{Object.defineProperty(document,'hidden',{value:true,configurable:true});document.dispatchEvent(new Event('visibilitychange'));}),blur:()=>p.evaluate(()=>dispatchEvent(new Event('blur'))),pagehide:()=>p.evaluate(()=>dispatchEvent(new Event('pagehide'))),switch:()=>h.character(p,'holly')};
  for(const [name,action]of Object.entries(actions)){
   await control(p,'testSound');await active(p);await action();await done(p);await p.waitForTimeout(100);await clearCapture(p);await p.waitForTimeout(140);eq((await recorded(p)).peak,0,name+' makes graph silent');
   if(name==='mute'){await control(p,'slapAudio');await active(p);await done(p);}
   if(name==='hide')await p.evaluate(()=>{Object.defineProperty(document,'hidden',{value:false,configurable:true});document.dispatchEvent(new Event('visibilitychange'));});
  }
  await control(p,'slapAudio');await control(p,'testSound');await p.waitForFunction(()=>__hollyAudioDebug.snapshot().active,null,{polling:20});
  eq(await p.evaluate(()=>__santaAudioDebug.snapshot().active),false,'Holly plays without Santa');await p.evaluate(()=>__test.chooseCharacter(4));await p.waitForFunction(()=>__peachPhysicsDebug.snapshot().character==='santa',null,{polling:20});eq(await p.evaluate(()=>__elfAudioDebug.snapshot().activeCount),0,'switch back cancels Holly');
  await control(p,'testSound');await active(p);await p.evaluate(()=>__audioTest.ac().suspend());await done(p);await p.evaluate(()=>__audioTest.ac().resume());await p.waitForTimeout(120);eq(await p.evaluate(()=>__santaAudioDebug.snapshot().active),false,'resume never replays interrupted Santa');
  await control(p,'testSound');await active(p);await done(p);
  await control(p,'testSound');await active(p);await p.evaluate(()=>__audioTest.ac().close());await done(p);await control(p,'testSound');await active(p);eq(await p.evaluate(()=>__audioTest.ac().state),'running','closed context recreated for Santa');await done(p);
  await control(p,'santaLaugh');await active(p);await done(p);
  await p.evaluate(()=>{for(let i=0;i<3600;i++){testClock+=1000/120;__audioTest.motion.tick(1/120);__test.step(1/120);}});eq(await p.evaluate(()=>__santaAudioDebug.snapshot().active),false,'Auto cannot request Santa voice');
  eq(errors,[],'no browser exceptions');results.push({renderer,stats,passed:true});await context.close();
 }
 h.fs.writeFileSync(__dirname+'/santa-lifecycle.json',JSON.stringify({checks,results,passed:true},null,2)+'\n');console.log({checks,passed:true});
}finally{await b.close();}})().catch(e=>{console.error(e);process.exit(1)});
