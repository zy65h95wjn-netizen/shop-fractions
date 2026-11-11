const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const dir=path.resolve(__dirname,'..'),lab=path.dirname(dir),out=path.join(dir,'evidence'),raw=path.join(out,'raw');fs.mkdirSync(raw,{recursive:true});
const sequences=JSON.parse(fs.readFileSync(path.join(lab,'evidence/states.json'))),report={baseline:'55fdcd55bd74b33345c4b2fb6e2a1f1379041319',poses:[],errors:[]};
const base='http://127.0.0.1:8000/peach-physics/experiments/holly-layered/';
async function capture(p,name){const data=await p.evaluate(()=>__hollyLab.capture());fs.writeFileSync(path.join(raw,name+'.png'),Buffer.from(data.split(',')[1],'base64'));}
(async()=>{
 const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 for(const backend of ['webgl','canvas']){
  const pages=[];
  for(const variant of ['before','after']){
   const p=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});p.on('pageerror',e=>report.errors.push(e.message));
   await p.addInitScript(()=>{requestAnimationFrame=()=>0;});
   await p.goto(base+(variant==='before'?'r6.html?mode=layered&':'reconstruction/index.html?')+'backend='+backend);
   await p.waitForFunction(()=>window.__hollyLab?.ready());
   await p.addStyleTag({content:'#loader,#hint,#characterToast,.slap-burst,#pulse,#labBack{display:none!important}'});
   await p.evaluate(()=>{__hollyLab.reset();__hollyLab.render();});
   await capture(p,`${backend}-${variant}-rest`);pages.push(p);
  }
  for(const seq of sequences){
   for(const phase of ['peak','rebound']){
    const state=seq.phases[phase==='peak'?1:2].state,hashes=[];
    for(let i=0;i<2;i++){
     const p=pages[i],variant=i?'after':'before';await p.evaluate(s=>__hollyLab.setState(s),state);
     const m=await p.evaluate(async()=>{
      const r=__hollyLab.renderer,buf=new Uint8Array(r.fields[0].byteLength+r.fields[1].byteLength);buf.set(new Uint8Array(r.fields[0].buffer));buf.set(new Uint8Array(r.fields[1].buffer),r.fields[0].byteLength);
      const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',buf)),b=>b.toString(16).padStart(2,'0')).join('');
      return {fieldHash:hash,metrics:r.metrics(),info:__hollyLab.info(),raw:__hollyLab.raw()};
     });hashes.push(m.fieldHash);report.poses.push({backend,side:seq.side,phase,variant,fieldHash:m.fieldHash,metrics:m.metrics,info:m.info});
     assert.deepEqual(m.raw.nodes,state.nodes);assert.equal(m.info.backend,backend);assert.equal(m.info.error,null);
     await capture(p,`${backend}-${variant}-${seq.side}-${phase}`);
    }
    assert.equal(hashes[0],hashes[1],'field must be bit-identical before/after');
   }
  }
  // Selected temporal frames reuse existing recorded states, not a new motion.
  for(const seq of sequences){
   for(const frame of [0,2,3,6,9,12,18,30,45])for(let i=0;i<2;i++){
    await pages[i].evaluate(s=>__hollyLab.setState(s),seq.movie[frame].state);
    await capture(pages[i],`${backend}-${i?'after':'before'}-${seq.side}-frame-${String(frame).padStart(2,'0')}`);
   }
   // Use the actual recorded eight-second state in the temporal sheet. Reset
   // below is a separate reversibility check, never a substitute settled pose.
   assert.equal(seq.phases[3].step,960);
   for(let i=0;i<2;i++){
    await pages[i].evaluate(s=>__hollyLab.setState(s),seq.phases[3].state);
    assert.deepEqual((await pages[i].evaluate(()=>__hollyLab.raw())).nodes,seq.phases[3].state.nodes);
    await capture(pages[i],`${backend}-${i?'after':'before'}-${seq.side}-settled`);
   }
  }
  for(let i=0;i<2;i++){
   await pages[i].evaluate(()=>{__hollyLab.reset();__hollyLab.render();});await capture(pages[i],`${backend}-${i?'after':'before'}-reset`);
   assert.equal(fs.readFileSync(path.join(raw,`${backend}-${i?'after':'before'}-reset.png`)).toString('base64'),fs.readFileSync(path.join(raw,`${backend}-${i?'after':'before'}-rest.png`)).toString('base64'),'exact reset');
   await pages[i].close();
  }
 }
 assert.equal(report.errors.length,0);report.fieldPairsIdentical=8;
 fs.writeFileSync(path.join(out,'matched.json'),JSON.stringify(report,null,2));console.log('Matched poses/temporal frames captured; eight exact field pairs, both renderers and resets pass.');await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
