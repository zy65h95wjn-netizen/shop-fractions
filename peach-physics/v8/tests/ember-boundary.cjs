const h=require('./harness.cjs'),crypto=require('crypto');
const {fs,path,assert,chromium}=h;
const out=process.env.PEACH_TEST_OUTPUT||'/tmp/peach-ember-tests';fs.mkdirSync(out,{recursive:true});
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const report={baseline:'2adb9257532ac3b17e39aeea815a23f5fb7f85ce',trajectories:0,otherCharacterRenders:0,restRenders:0,protected:[],errors:[]};
const extra=`window.reviewTest={motion, reset:()=>{reset();motion.setAuto(false);motion.setShake(false);impacts.forEach((p,i)=>{p.x=currentCharacter().impactCenters[i][0]/W;p.y=currentCharacter().impactCenters[i][1]/H});},pose:(dx,dy,drag)=>{for(let i=0;i<3;i++){nodes[i].dx=dx;nodes[i].dy=dy;}dragBoundary[0]=drag?1:0;}, auto:()=>{let seed=123;motion.random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);motion.time=0;motion.quietUntil=0;motion.setAuto(true);},pixels:()=>{render();if(fallback)return Array.from(ctx2.getImageData(0,0,canvas.width,canvas.height).data);const a=new Uint8Array(canvas.width*canvas.height*4);gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,a);return Array.from(a);}};`;
async function setup(b,fixed,fallback,field=false,size={width:390,height:844}){
 let s=fixed?fs.readFileSync(h.root+'/peach-physics/v8/index.html','utf8'):require('child_process').execFileSync('git',['show','2adb9257532ac3b17e39aeea815a23f5fb7f85ce:peach-physics/v8/index.html'],{cwd:h.root,maxBuffer:4e6}).toString();
 if(field)s=s.replace('void main(){\n  if(vRawUV','vec2 encode(float x){vec2 e=fract(x*vec2(1.0,255.0));e.x-=e.y/255.0;return e;}\n void main(){\n  if(vRawUV').replace('gl_FragColor=texture2D(uPhoto,photoUV);','vec2 d=(vRawUV-photoUV)*vec2(941.0,1671.0);gl_FragColor=vec4(encode(.5+d.x/128.0),encode(.5+d.y/128.0));');
 s=s.replace('presentCharacter();\ngetPhoto',extra+'\npresentCharacter();\ngetPhoto');
 const file=out+`/test-${fixed}-${fallback}-${field}.html`;fs.writeFileSync(file,s);
 const p=await h.setup(b,'v8',size,true,fallback,false,file);
 await p.page.addStyleTag({content:'#loader,#hint,#characterToast,#pulse,.slap-burst{display:none!important}'});
 return p;
}
async function select(p,id){await p.evaluate(id=>__peachPhysicsDebug.switchCharacter(id),id);await p.waitForFunction(id=>__peachPhysicsDebug.snapshot().character===id,id);await p.evaluate(()=>{__test.resize();reviewTest.reset()});}
async function run(p,kind,preset){return p.evaluate(({kind,preset})=>{
 reviewTest.reset();document.querySelector('[data-preset="'+preset+'"]').click();testClock=1000;
 if(kind==='auto')reviewTest.auto();else __test.gesture(kind,0);
 const traces=[],images=[];
 for(let i=0;i<360;i++){testClock+=1000/120;if(kind==='auto')reviewTest.motion.tick(1/120);__test.step(1/120);if(i%30===0)traces.push(__test.raw());if(i===30||i===330){__test.render();images.push(document.querySelector('#game').toDataURL())}}
 return {traces,images};
 },{kind,preset});}
async function fieldStats(p,dx,dy,drag){return p.evaluate(({dx,dy,drag})=>{
 reviewTest.reset();reviewTest.pose(dx,dy,drag);const a=reviewTest.pixels(),c=document.querySelector('#game'),f=__peachPhysicsDebug.snapshot().framing,s=c.width/innerWidth*f.width/941;
 const d=(x,y)=>{const px=Math.round((f.x+x*f.width/941)*c.width/innerWidth),py=Math.round((f.y+y*f.height/1671)*c.width/innerWidth),i=((c.height-1-py)*c.width+px)*4;return [(a[i]/255+a[i+1]/65025-.5)*128,(a[i+2]/255+a[i+3]/65025-.5)*128]};
 let garment=0,fold=0,minDet=Infinity;
 for(let x=155;x<=345;x+=10)for(let y=900;y<920+.004*(x-210)**2-5;y+=5)garment=Math.max(garment,Math.hypot(...d(x,y)));
 for(let x=180;x<=340;x+=10)fold=Math.max(fold,Math.hypot(...d(x,1230)));
 for(let y=940;y<=1240;y+=4)for(let x=110;x<=380;x+=4){const l=d(x-2,y),r=d(x+2,y),t=d(x,y-2),b=d(x,y+2);minDet=Math.min(minDet,(1-(r[0]-l[0])/4)*(1-(b[1]-t[1])/4)-(b[0]-t[0])*(r[1]-l[1])/16)}
 return {garment,fold,minDet,center:Math.hypot(...d(245,1078))};
 },{dx,dy,drag});}
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});try{
 for(const fallback of [false,true]){
  const old=await setup(b,false,fallback),next=await setup(b,true,fallback);
  for(const id of ['ember','midnight','aurelia','holly','santa']){
   for(const p of [old.page,next.page])await select(p,id);
   assert.equal(hash(await h.canvas(old.page)),hash(await h.canvas(next.page)),id+' rest');report.restRenders++;
   for(const preset of ['natural','playful','chaos'])for(const kind of ['slap','drag','flick','auto']){
    const a=await run(old.page,kind,preset),z=await run(next.page,kind,preset);
    assert.deepEqual(z.traces,a.traces,id+'/'+kind+'/'+preset+' spring preservation');report.trajectories++;
    if(id!=='ember'){assert.deepEqual(z.images.map(hash),a.images.map(hash),id+' render preservation');report.otherCharacterRenders+=a.images.length;}
   }
   console.log((fallback?'Canvas':'WebGL')+' '+id+' trajectories and preservation passed');
  }
  for(const p of [old.page,next.page]){await select(p,'ember');await p.evaluate(()=>{reviewTest.reset();reviewTest.pose(0,30,false);__test.render()});}
  for(const [label,p] of [['current',old.page],['adjusted',next.page]])await p.screenshot({path:out+`/${fallback?'canvas':'webgl'}-${label}.png`});
  report.errors.push(...old.errors,...next.errors);await old.context.close();await next.context.close();
 }
 for(const size of [{width:375,height:667},{width:430,height:932}]){
  const old=await setup(b,false,false,true,size),next=await setup(b,true,false,true,size);
  for(const [dx,dy] of [[0,10],[0,30],[0,-30],[26,30],[-26,-30]])for(const drag of [false,true]){
   const before=await fieldStats(old.page,dx,dy,drag),after=await fieldStats(next.page,dx,dy,drag);
   assert(after.garment<.03,'clothing anchored');assert(after.fold<.03,'lower fold anchored');assert(after.minDet>0,'no sampled folds');assert(after.center>2,'visible movement preserved');
   report.protected.push({size,dx,dy,drag,before,after});
  }
  report.errors.push(...old.errors,...next.errors);await old.context.close();await next.context.close();
 }
 assert.deepEqual(report.errors,[]);fs.writeFileSync(__dirname+'/ember-boundary.json',JSON.stringify(report,null,2));
 console.log(JSON.stringify({trajectories:report.trajectories,otherCharacterRenders:report.otherCharacterRenders,restRenders:report.restRenders,protectedCases:report.protected.length,maxGarmentMotion:Math.max(...report.protected.map(x=>x.after.garment)),minDet:Math.min(...report.protected.map(x=>x.after.minDet))}));
 }finally{await b.close();for(const name of fs.readdirSync(out))if(name.startsWith('test-'))fs.unlinkSync(out+'/'+name)}})().catch(e=>{console.error(e);process.exit(1)});
