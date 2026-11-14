// Technical audition transport checks only. No personality/character assignment.
const h=require('../../../v8/tests/harness.cjs'),crypto=require('crypto');
const dir=h.path.resolve(__dirname,'..'),html=h.fs.readFileSync(dir+'/audition.html','utf8').replace('window.__auditionDebug=', 'window.__candidateTest={bank,ac:()=>context};\nwindow.__auditionDebug=');
const suite=h.fs.readFileSync(__dirname+'/audio.cjs','utf8');
// Reuse the established audio-thread recorder from the retained Holly test.
const capture=eval('('+suite.slice(suite.indexOf('async function capture('),suite.indexOf('async function clearCapture')).trim()+')');
const clearCapture=eval('('+suite.slice(suite.indexOf('async function clearCapture('),suite.indexOf('async function recorded(')).trim()+')');
const recorded=eval('('+suite.slice(suite.indexOf('async function recorded('),suite.indexOf('async function cancelCase(')).trim()+')');
let checks=0;const results=[];const ok=(v,m)=>{h.assert.ok(v,m);checks++;};
function wav(values,rate,file){const data=Buffer.alloc(values.length*2);values.forEach((v,i)=>data.writeInt16LE(Math.max(-32768,Math.min(32767,Math.round(v*32767))),i*2));const head=Buffer.alloc(44);head.write('RIFF',0);head.writeUInt32LE(36+data.length,4);head.write('WAVEfmt ',8);head.writeUInt32LE(16,16);head.writeUInt16LE(1,20);head.writeUInt16LE(1,22);head.writeUInt32LE(rate,24);head.writeUInt32LE(rate*2,28);head.writeUInt16LE(2,32);head.writeUInt16LE(16,34);head.write('data',36);head.writeUInt32LE(data.length,40);h.fs.writeFileSync(file,Buffer.concat([head,data]));}
(async()=>{const b=await h.chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});try{
 const c=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.route('**/audition.html',r=>r.fulfill({contentType:'text/html',body:html.replace('window.__candidateTest={bank,ac:()=>context};','window.__candidateTest={bank,ac:()=>context};window.__audioTest=__candidateTest;')}));
 await p.goto(h.base+'/peach-physics/experiments/r14-other-laughs/audition.html');
 await p.click('[data-voice=holly]');await p.waitForFunction(()=>__auditionDebug.snapshot().current?.active);await p.waitForFunction(()=>!__auditionDebug.snapshot().current?.active);await capture(p);
 for(const id of ['cv','splice','mox'])for(let take=1;take<=2;take++){
  await clearCapture(p);await p.click('[data-voice='+id+']');await p.waitForFunction(()=>__auditionDebug.snapshot().current?.active);
  const current=await p.evaluate(()=>__auditionDebug.snapshot());ok(current.current.lastClip===take,'candidate cycle '+id+take);ok(current.activeCount===1&&current.pendingCount===0,'single playback '+id+take);
  const ref=await p.evaluate(({id,take})=>{const buffer=__candidateTest.bank.players[id].clips[take-1].buffer;return{rate:buffer.sampleRate,values:Array.from(buffer.getChannelData(0)),duration:buffer.duration};},{id,take});
  await p.waitForFunction(()=>!__auditionDebug.snapshot().current?.active);await p.waitForTimeout(100);const stats=await recorded(p,'candidate-'+id+'-'+take);
  ok(stats.peak>.01&&stats.peak<.95&&stats.rms>.001,'non-silent unclipped '+id+take);ok(stats.samples>=ref.values.length,'complete captured duration '+id+take);
  // Apply the unchanged approved engine's boundary fades to the decoded reference.
  ref.values=ref.values.map((v,i)=>v*Math.min(1,i/ref.rate/.01,(ref.duration-i/ref.rate)/.025));wav(ref.values,ref.rate,__dirname+'/reference-'+id+'-'+take+'.wav');
  const responseHash=await p.evaluate(async filename=>{const bytes=await(await fetch('./assets/candidates/'+filename)).arrayBuffer();return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');},id+'-'+take+'.wav');
  ok(responseHash===crypto.createHash('sha256').update(h.fs.readFileSync(dir+'/assets/candidates/'+id+'-'+take+'.wav')).digest('hex'),'exact source bytes '+id+take);results.push({candidate:id,take,duration:ref.duration,stats,hash:responseHash});
 }
 await p.click('[data-voice=cv]');await p.waitForFunction(()=>__auditionDebug.snapshot().current?.active);await p.click('[data-voice=splice]');await p.waitForFunction(()=>__auditionDebug.snapshot().current?.active);ok(await p.evaluate(()=>__auditionDebug.snapshot().activeCount===1),'candidate switch cancels prior sound');
 await p.click('#stop');await p.waitForTimeout(150);await clearCapture(p);await p.waitForTimeout(150);ok((await recorded(p)).peak===0,'stop clears graph');ok(errors.length===0,'no browser exceptions');
 await p.screenshot({path:__dirname+'/audition.png'});await c.close();h.fs.writeFileSync(__dirname+'/candidates.json',JSON.stringify({checks,results,passed:true,scope:'Unassigned candidate technical audition only; no subjective voice, personality or character selection claim.'},null,2)+'\n');console.log({checks,passed:true});
}finally{await b.close();}})().catch(e=>{console.error(e);process.exit(1)});
