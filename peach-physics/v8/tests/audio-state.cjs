const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'../../..'),html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8'),old=execFileSync('git',['show','48eb1ae:peach-physics/v8/index.html'],{cwd:root,maxBuffer:4e6}).toString();
const between=(s,a,b)=>s.slice(s.indexOf(a),s.indexOf(b,s.indexOf(a)));
assert.equal(between(html,'  const buffer=ac.createBuffer','\n  tone.connect'),between(old,'  const buffer=ac.createBuffer','\n  tone.connect'));
assert.equal(between(html,"  voice.type='sawtooth'",'\n  santaLaughSound=true;'),between(old,"  voice.type='sawtooth'",'\n  santaLaughSound=true;'));
assert.deepEqual(fs.readFileSync(path.join(__dirname,'../motion.js')),execFileSync('git',['show','2e48db4:peach-physics/experiments/r13-motion/motion.js'],{cwd:root}));
function rig(state='running',legacy=false,options={}){const log={starts:0,resumes:0,contexts:[],status:{textContent:''},errors:[]},navigator={audioSession:{type:'auto'}},document={hidden:false,getElementById:()=>log.status};let next=state,character='ember';
 const param=()=>({value:0,setValueAtTime(){},exponentialRampToValueAtTime(){}}),node=()=>({connect(){},start(){log.starts++;},stop(){},gain:param(),frequency:param(),Q:param()});
 class Context{constructor(){this.state=next;next='running';this.currentTime=0;this.sampleRate=48000;this.destination={};log.contexts.push(this);}resume(){log.resumes++;return new Promise((resolve,reject)=>{this.finish=()=>{this.state='running';resolve();};this.reject=()=>reject(Error('permission blocked'));});}createBuffer(ch,n){return{getChannelData:()=>new Float32Array(n)}}createBufferSource(){return node()}createOscillator(){return node()}createBiquadFilter(){return node()}createGain(){return node()}}
 const context={window:options.unsupported?{}:{AudioContext:Context},navigator,document,console,Promise,Float32Array,log,currentCharacter:()=>({id:character}),say:text=>log.errors.push(text)};
 const source=legacy?between(old,'function slapSound(){','function slap(side'):between(html,'function withAudio(', 'function slap(side');
 vm.runInNewContext(`let slapAudioEnabled=true,audioContext=null,audioEpoch=0,audioLastError='';${source};globalThis.api={slapSound,off:()=>{slapAudioEnabled=false;audioEpoch++;},on:()=>{slapAudioEnabled=true;audioEpoch++;},get:()=>audioContext};`,context);return{...context,log,setCharacter:id=>character=id};}
let checks=0;const ok=(v,msg)=>{assert(v,msg);checks++;};const flush=async()=>{await Promise.resolve();await Promise.resolve();};
(async()=>{
 const previous=rig('interrupted',true);previous.api.slapSound();ok(previous.log.resumes===0&&previous.log.starts===2,'old code schedules into interrupted context without resuming');
 for(const state of ['running','suspended','interrupted']){const r=rig(state);r.api.slapSound();ok(r.navigator.audioSession.type==='playback',state+' selects playback route');if(state!=='running'){ok(r.log.resumes===1&&r.log.starts===0,state+' resumes before scheduling');r.api.get().finish();await flush();}ok(r.log.starts===2,state+' schedules original noise and tone');}
 const closed=rig();closed.api.slapSound();closed.api.get().state='closed';closed.api.slapSound();ok(closed.log.contexts.length===2&&closed.log.starts===4,'closed context recreated');
 const off=rig('interrupted');off.api.slapSound();off.api.off();off.api.get().finish();await flush();ok(off.log.starts===0,'turning sound off cancels pending playback');
 const hidden=rig('interrupted');hidden.api.slapSound();hidden.document.hidden=true;hidden.api.get().finish();await flush();ok(hidden.log.starts===0,'hidden page does not play a queued sound');
 const denied=rig('suspended');denied.api.slapSound();denied.api.get().reject();await flush();ok(denied.log.starts===0&&denied.log.status.textContent.includes('could not start'),'resume rejection gives visible retry message');
 denied.api.slapSound();denied.api.get().finish();await flush();ok(denied.log.starts===2&&denied.log.status.textContent.includes('Sound ready'),'retry recovers after resume rejection');
 const switched=rig('interrupted');switched.api.slapSound();switched.setCharacter('santa');switched.api.get().finish();await flush();ok(switched.log.starts===0,'character switch cancels queued sound');
 const absent=rig('running',false,{unsupported:true});absent.api.slapSound();ok(absent.log.status.textContent.includes('could not start'),'unsupported audio gives visible message');
 const disabled=rig();disabled.api.off();disabled.api.slapSound();ok(disabled.log.contexts.length===0&&disabled.navigator.audioSession.type==='auto','sound off does not activate audio');
 const routing=rig();Object.defineProperty(routing.navigator,'audioSession',{get(){throw Error('not allowed')}});routing.api.slapSound();ok(routing.log.starts===2,'unsupported audio-session routing falls back to Web Audio');
 const report={checks,oldInterruptedFailureReproduced:true,waveformSourceUnchanged:true,approvedMotionByteIdentical:true};fs.writeFileSync(path.join(__dirname,'audio-state.json'),JSON.stringify(report,null,2)+'\n');console.log(report);
})().catch(e=>{console.error(e);process.exit(1)});
