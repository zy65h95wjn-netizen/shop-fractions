// Voice-loading races must never play a stale phrase or overlap recordings.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const voice=html.slice(html.indexOf('// Recorded CC0 Santa voice.'),html.indexOf('function startSantaLaugh(){'));
const flush=()=>new Promise(r=>setImmediate(r));
function rig(){
 const log={fetches:0,decodes:0,starts:0,stops:0,status:{textContent:''},nodes:[]};let resolveFetch,rejectFetch,resolveDecode,rejectDecode;
 const ac={state:'running',destination:{},decodeAudioData:()=>{log.decodes++;return new Promise((r,j)=>{resolveDecode=r;rejectDecode=j;});},createBufferSource:()=>{const n={connect(){},disconnect(){},start(){log.starts++;},stop(){log.stops++;}};log.nodes.push(n);return n;}};
 const c={Promise,AbortController,setTimeout,clearTimeout,document:{hidden:false,getElementById:()=>log.status},slapAudioEnabled:true,audioEpoch:0,audioLastError:'',isSanta:()=>c.character==='santa',character:'santa',withAudio:fn=>fn(ac),fetch:()=>{log.fetches++;return new Promise((r,j)=>{resolveFetch=r;rejectFetch=j;});}};
 vm.runInNewContext(voice+`;santaLaughEnabled=true;globalThis.api={play:santaChuckle,stop:stopSantaVoice,off:()=>{slapAudioEnabled=false;audioEpoch++;stopSantaVoice();},laughOff:()=>{santaLaughEnabled=false;stopSantaLaugh();},state:()=>({pending:santaVoicePending,playing:!!santaVoiceSource}),naturalEnd:()=>stopSantaLaugh(false)};`,c);
 return {c,log,ac,okFetch:()=>resolveFetch({ok:true,arrayBuffer:async()=>new ArrayBuffer(4)}),badFetch:()=>rejectFetch(Error('offline')),okDecode:()=>resolveDecode({duration:1.5}),badDecode:()=>rejectDecode(Error('invalid MP3'))};
}
let checks=0;const ok=(v,label)=>{assert(v,label);checks++;};
(async()=>{
 const r=rig();r.c.api.play();r.c.api.play();ok(r.log.fetches===1,'one pending request');r.okFetch();await flush();r.okDecode();await flush();
 ok(r.log.starts===1&&r.c.api.state().playing,'one phrase starts');r.c.api.play();ok(r.log.starts===1,'no overlapping phrase');r.c.api.naturalEnd();ok(r.log.stops===0,'animation ending cannot truncate voice');
 r.log.nodes[0].onended();r.c.api.play();await flush();ok(r.log.starts===2&&r.log.fetches===1&&r.log.decodes===1,'decoded clip reused');r.c.api.stop();ok(r.log.stops===1,'explicit reset stops voice');
 for(const stage of ['fetch','decode'])for(const action of ['off','laughOff','stop','hidden','character']){
  const r=rig();r.c.api.play();if(stage==='decode'){r.okFetch();await flush();}
  if(action==='hidden'){r.c.document.hidden=true;r.c.api.stop();}else if(action==='character'){r.c.character='ember';r.c.api.stop();}else r.c.api[action]();
  if(stage==='fetch'){r.okFetch();await flush();}else{r.okDecode();await flush();}
  ok(r.log.starts===0&&!r.c.api.state().pending,`${action} cancels pending ${stage}`);
 }
 const failed=rig();failed.c.api.play();failed.badFetch();await flush();ok(failed.log.status.textContent.includes('could not load'),'fetch failure visible');failed.c.api.play();ok(failed.log.fetches===2,'retry fetches again');failed.okFetch();await flush();failed.okDecode();await flush();ok(failed.log.starts===1,'retry plays');
 const decoded=rig();decoded.c.api.play();decoded.okFetch();await flush();decoded.badDecode();await flush();ok(decoded.log.status.textContent.includes('could not load'),'decode failure visible');decoded.c.api.play();ok(decoded.log.fetches===2,'invalid cached bytes discarded');decoded.badFetch();await flush();
 const muted=rig();muted.c.api.off();muted.c.api.play(true);ok(muted.log.fetches===0,'preview respects master mute');
 const preview=rig();preview.c.api.laughOff();preview.c.api.play(true);preview.okFetch();await flush();preview.okDecode();await flush();ok(preview.log.starts===1,'Test Santa laugh works with optional animation off');
 const report={checks};fs.writeFileSync(path.join(__dirname,'santa-voice-state.json'),JSON.stringify(report,null,2)+'\n');console.log(report);
})().catch(e=>{console.error(e);process.exit(1)});
