const h=require('../../../v8/tests/harness.cjs'),crypto=require('crypto');
const preview='experiments/r14-other-laughs',dir=h.path.resolve(__dirname,'..'),hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const sources={main:h.fs.readFileSync(h.path.join(h.root,'peach-physics/v8/index.html'),'utf8'),preview:h.fs.readFileSync(dir+'/index.html','utf8')};
for(const [name,html]of Object.entries(sources)){
 const s=html.replace(/function santaChuckle\([^)]*\)\{[\s\S]*?function startSantaLaugh\(\)\{/,"function santaChuckle(){if(slapAudioEnabled)window.phrases++;}\nfunction startSantaLaugh(){")
 .replace(/function withAudio\(play,onFailure=\(\)=>\{\}\)\{[\s\S]*?function slapSound\(\)\{/,'function withAudio(){}\nfunction slapSound(){')
 .replace('presentCharacter();\ngetPhoto',"window.__santaMotion={flags:(sound,laugh)=>{slapAudioEnabled=sound;santaLaughEnabled=laugh;motion.setAuto(false);}};\npresentCharacter();\ngetPhoto");
 h.fs.writeFileSync('/tmp/r142-santa-motion-'+name+'.html',s);
}
async function run(p,config){const r=await p.evaluate(config=>{__test.reset();__santaMotion.flags(config.sound,config.laugh);window.phrases=0;testClock=1000;__test.gesture('slap',0);const trace=[],frames=[];for(let i=0;i<240;i++){if(config.repeat&&(i===12||i===24))__test.gesture('slap',0);__test.step(1/120);if(i%15===0)trace.push(__test.raw());if([30,90,210].includes(i)){__test.render();frames.push(document.querySelector('#game').toDataURL());}}return{trace,frames,phrases,timer:__peachPhysicsDebug.snapshot().santaLaughTime};},config);return{...r,frames:r.frames.map(hash)};}
(async()=>{const b=await h.chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});const results=[];try{for(const fallback of [false,true]){
 const a=await h.setup(b,'v8',{width:390,height:844},true,fallback,false,'/tmp/r142-santa-motion-main.html'),p=await h.setup(b,preview,{width:390,height:844},true,fallback,false,'/tmp/r142-santa-motion-preview.html');
 for(const c of [a,p]){await c.page.evaluate(()=>__test.chooseCharacter(4));await c.page.waitForFunction(()=>__peachPhysicsDebug.snapshot().character==='santa');}
 for(const config of [{sound:true,laugh:false},{sound:true,laugh:true},{sound:false,laugh:true},{sound:true,laugh:true,repeat:true}]){
  const expected=await run(a.page,config),actual=await run(p.page,config);
  h.assert.deepEqual({...actual,phrases:undefined},{...expected,phrases:undefined},'Santa motion and frames unchanged with laugh enabled');
  h.assert.equal(actual.phrases,config.sound&&config.laugh?1:0);h.assert.equal(expected.phrases,config.sound&&config.laugh?3:0);
  results.push({renderer:fallback?'canvas':'webgl',...config,identicalMotion:true,identicalFrames:3,recordedPhrases:actual.phrases});
 }
 h.assert.deepEqual(a.errors,[]);h.assert.deepEqual(p.errors,[]);await a.context.close();await p.context.close();
}h.fs.writeFileSync(__dirname+'/santa-motion.json',JSON.stringify({cases:results.length,results,passed:true},null,2)+'\n');console.log({cases:results.length,passed:true});}finally{await b.close();}})().catch(e=>{console.error(e);process.exit(1)});
