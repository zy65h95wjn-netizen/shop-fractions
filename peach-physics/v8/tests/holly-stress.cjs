const {chromium,fs,path,assert,out,setup,character}=require('./harness.cjs');
let checks=0;const ok=(v,s)=>{assert.ok(v,s);checks++};
(async()=>{
 const b=await chromium.launch({executablePath:process.env.CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const app=await setup(b,'v8');await character(app.page,'holly');
 const stress=await app.page.evaluate(()=>{
  let rows=[];for(const preset of ['natural','playful','chaos','allMax','maxMotion'])for(const link of [0,50,100]){
   __test.reset();document.querySelector(`[data-preset="${['allMax','maxMotion'].includes(preset)?'chaos':preset}"]`).click();
   if(preset==='allMax'||preset==='maxMotion')Object.assign(__test.model,{bounce:100,softness:100,settle:preset==='allMax'?100:0});
   __test.model.transfer=link;
   let bounded=true,secondary=false;for(let n=0;n<80;n++){__test.gesture(n%3?'slap':'kick',n%2);for(let i=0;i<6;i++)__test.step(1/120);bounded&&=__test.nodes.every(n=>Number.isFinite(n.dx)&&Math.abs(n.dx)<=26&&Math.abs(n.dy)<=30);secondary||=__test.followers.some(f=>Math.abs(f.dy)>.05);}
   for(let i=0;i<2400;i++)__test.step(1/120);
   rows.push({preset,link,bounded,secondary,rest:__test.nodes.every(n=>!n.dx&&!n.dy)&&__test.followers.every(f=>!f.dx&&!f.dy)});
  }return rows;
 });
 for(const r of stress){ok(r.bounded,'repeated impulses bounded');ok(r.secondary,'secondary motion');ok(r.rest,`${r.preset}/${r.link} settles completely`);}
 const fb=await setup(b,'v8',{width:390,height:844},true,true);await character(fb.page,'holly');
 const result=await fb.page.evaluate(()=>{
  __test.reset();__test.render();const c=document.querySelector('#game'),ctx=c.getContext('2d');
  // Warm repeated readback before reference capture: Chromium may migrate a Canvas
  // from GPU to CPU on the second read, changing its base-image resampling.
  for(let i=0;i<4;i++){__test.render();ctx.getImageData(0,0,c.width,c.height);}
  __test.render();const rest=ctx.getImageData(0,0,c.width,c.height).data,f=__peachPhysicsDebug.snapshot().framing,dpr=c.width/innerWidth;
  let rows=[];for(const side of [0,1]){
   __test.forcePose(26,30,side);const moved=ctx.getImageData(0,0,c.width,c.height).data;
   let outside=0,max=0,inside=0;for(let y=380;y<610;y+=2)for(let x=210;x<620;x+=2){
    const sx=Math.round((f.x+x/720*f.width)*dpr),sy=Math.round((f.y+y/1280*f.height)*dpr),at=(sy*c.width+sx)*4;
    const d=Math.max(...[0,1,2].map(k=>Math.abs(rest[at+k]-moved[at+k])));
    if([-3,0,3].every(xx=>[-3,0,3].every(yy=>__test.hollySkinWeight(side,x+xx,y+yy)===0))){if(d>0)outside++;max=Math.max(max,d);}else if(d>0)inside++;
   }rows.push({side,outside,max,inside});
  }
  const times=[];for(let i=0;i<30;i++){const t=Date.now();__test.render();times.push(Date.now()-t);}return {rows,averageRenderMs:times.reduce((a,b)=>a+b)/times.length};
 });
 for(const r of result.rows){ok(r.outside===0,`Canvas outside fixed: ${JSON.stringify(r)}`);ok(r.inside>100,'Canvas spatial motion');}
 ok(app.errors.length===0&&fb.errors.length===0,'no errors');fs.writeFileSync(path.join(out,'holly-stress.json'),JSON.stringify({checks,stress,canvas:result},null,2));console.log(JSON.stringify({checks,canvas:result}));await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
