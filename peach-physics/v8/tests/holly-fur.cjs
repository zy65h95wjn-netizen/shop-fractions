// Holly fur-trim shape retention: r8 / r9 / current, measured through the real renderers.
// A fur label traced from the approved photograph (independently of the runtime mask) replaces
// the photo texture: R = fur coverage, G = source column - 240. The actual WebGL shader and the
// actual Canvas remap draw it, and the fur's thickness is measured normal to the trim at fixed
// material positions. Everything outside the mask builder must stay exactly as in r9.
const {chromium,fs,path,assert,root,out,setup,character,scenario,canvas}=require('./harness.cjs');
const {execFileSync}=require('node:child_process');
const revisions={r8:'eea60679ddad1a5cb39701e1f73fe8872ccb7e60',r9:'8e4fcbb30b24decb8af7c03c6e39aa009541386c'};
const html={current:fs.readFileSync(path.join(__dirname,'../index.html'),'utf8')};
for(const [label,rev] of Object.entries(revisions))html[label]=execFileSync('git',['show',rev+':peach-physics/v8/index.html'],{cwd:root,maxBuffer:3e6}).toString();
const VERSIONS=['r8','r9','current'];
let checks=0;const ok=(value,message)=>{assert.ok(value,message);checks++;};
const report={revisions,checks:0,materialPositions:null,rest:{},states:{},summary:{},trajectories:{},travel:{},jacobian:{},consistency:{},errors:[]};

// 1. Physics, gestures, presets, framing and character data are byte-identical to r9.
for(const [start,end] of [['const CHARACTERS=','const CHARACTER_KEY='],['function resize(){','function compiler('],['function hollyVelocity(x,y,side){','// Bilinear CPU texture remapping'],['function step(dt){','function savePrefs(){'],['const PRESETS=Object.freeze','const currentPresets='],['const HOLLY_CONTOURS=','const HOLLY_CROP=']])
 ok(html.r9.includes(start)&&html.current.includes(start)&&html.r9.slice(html.r9.indexOf(start),html.r9.indexOf(end))===html.current.slice(html.current.indexOf(start),html.current.indexOf(end)),`unchanged from r9: ${start}`);
const {hook,MAT,MID,GRID,measure,draw,ratio}=require('./fur-measure.cjs');
const sources={};
for(const v of VERSIONS){
 const marker='presentCharacter();\ngetPhoto';assert.ok(html[v].includes(marker));sources[v]=path.join(out,`fur-${v}.html`);
 fs.writeFileSync(sources[v],html[v].replace(marker,hook+marker));
}
report.materialPositions={all:MAT,midCup:MID};
const STATES=[];
for(const side of [0,1]){
 for(const [preset,steps] of [['natural',[0,12,side?35:37]],['playful',[12]],['chaos',[12,36]]])for(const n of steps)STATES.push({name:`${side?'R':'L'} ${preset} slap ${n}`,side,preset,kind:'slap',steps:n,link:0});
 STATES.push({name:`${side?'R':'L'} natural flick 12`,side,preset:'natural',kind:'flick',steps:12,link:0});
 STATES.push({name:`${side?'R':'L'} chaos drag 10`,side,preset:'chaos',kind:'drag',steps:10,link:0});
 STATES.push({name:`${side?'R':'L'} natural link-100 opposite 30`,side:1-side,preset:'natural',kind:'slap',steps:30,link:100,driver:side});
 // All four node-bound corners (screen +x is right). 'large-down'/'large-up' match the r9 test's poses.
 for(const [name,dx,dy] of [['large-down',26,30],['large-up',-26,-30],['large-down -x',-26,30],['large-up +x',26,-30]])STATES.push({name:`${side?'R':'L'} ${name}`,side,pose:[dx,dy]});
}
STATES.push({name:'both chaos slap 13 link 50',side:2,preset:'chaos',kind:'both',steps:13,link:50});
if(process.env.FUR_QUICK)STATES.splice(4,STATES.length-6);
async function drive(p,s){await p.evaluate(s=>{
 document.querySelector(`[data-preset="${s.preset||'natural'}"]`).click();__test.reset();__test.model.transfer=s.link||0;
 if(s.pose){__test.forcePose(s.pose[0],s.pose[1],s.side);return;}
 if(s.kind==='both'){__test.gesture('slap',0);__test.gesture('slap',1);}else __test.gesture(s.kind,s.driver??s.side);
 for(let i=0;i<s.steps;i++)__test.step(1/120);
},s);}

(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const traced={};
 for(const backend of ['webgl','canvas']){
  const fallback=backend==='canvas',apps={};
  for(const v of VERSIONS){apps[v]=await setup(browser,'v8',{width:390,height:844},true,fallback,false,sources[v]);await character(apps[v].page,'holly');}
  for(const v of VERSIONS){const t=await apps[v].page.evaluate(()=>__fur.label());traced.label??=t;}
  // Stationary set and outside-band weights are exactly r8's.
  if(!fallback){
   const m8=await apps.r8.page.evaluate(()=>__fur.mask()),mc=await apps.current.page.evaluate(()=>__fur.mask());let fresh=0,changed=0;
   for(let i=0;i<m8.length;i++){if(i%4>1)continue;if(m8[i]===0&&mc[i]>0)fresh++;if(m8[i]!==mc[i])changed++;}
   ok(fresh===0,'no pixel that was stationary in r8 moves');report.maskChangedBytes=changed;
   const [cx,cy,w]=[240,264,272];
   // Photo rectangles: lower corset and central lacing exactly r8; upper exposed skin within 3/255.
   // (The skin just above the trim is the designed transition zone and is measured by travel below.)
   const diff=([x0,y0,x1,y1])=>{let n=0;for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)for(let s=0;s<2;s++){const i=((y-cy)*w+x-cx)*4+s;n=Math.max(n,Math.abs(m8[i]-mc[i]));}return n;};
   for(const r of [[300,414,315,423],[448,414,460,423],[369,380,391,420]])ok(diff(r)===0,'corset/lacing weights equal r8');
   for(const r of [[300,296,350,318],[410,296,460,318]])ok(diff(r)<=3,'upper exposed-skin weights within 3/255 of r8');
  }
  const rest={};for(const v of VERSIONS){await apps[v].page.evaluate(()=>{__test.reset();});rest[v]=measure(await draw(apps[v].page));}
  ok(JSON.stringify(rest.r8)===JSON.stringify(rest.current),'rest trim identical');report.rest[backend]=rest.current;
  for(const s of STATES)for(const v of VERSIONS){
   await drive(apps[v].page,s);const r=ratio(measure(await draw(apps[v].page)),rest[v]);
   ((report.states[s.name]??={})[backend]??={})[v]=r;
  }
  // Continuous motion: every second 1/120 s step through 0.75 s of a slap, both sides, natural and chaos.
  for(const preset of process.env.FUR_QUICK?[]:['natural','chaos'])for(const side of [0,1])for(const v of VERSIONS){
   const p=apps[v].page,series=[];
   await p.evaluate(({preset,side})=>{document.querySelector(`[data-preset="${preset}"]`).click();__test.reset();__test.model.transfer=50;__test.gesture('slap',side);},{preset,side});
   for(let i=0;i<90;i+=2){const r=ratio(measure(await draw(p)),rest[v]);series.push(r[side]);await p.evaluate(()=>{__test.step(1/120);__test.step(1/120);});}
   ((report.trajectories[`${preset} slap ${side?'R':'L'}`]??={})[backend]??={})[v]=series;
  }
  for(const app of Object.values(apps)){report.errors.push(...app.errors);await app.context.close();}
 }
 // Summaries: worst absolute thickness change per material position over every state and trajectory frame.
 for(const backend of ['webgl','canvas'])for(const v of VERSIONS){
  const worst=MAT.map(c=>c.map(()=>0));let missing=0;
  const take=(r,side)=>r.forEach((x,j)=>{if(x===null){missing++;return;}worst[side][j]=Math.max(worst[side][j],Math.abs(x-1));});
  for(const s of Object.values(report.states))take(s[backend][v][0],0),take(s[backend][v][1],1);
  for(const [name,t] of Object.entries(report.trajectories))for(const r of t[backend][v])take(r,name.endsWith('R')?1:0);
  const mid=MID.map((c,s)=>c.map(x=>worst[s][MAT[s].indexOf(x)])).flat(),all=worst.flat();
  (report.summary[backend]??={})[v]={worst,meanWorst:all.reduce((a,b)=>a+b)/all.length,maxWorst:Math.max(...all),midCupMax:Math.max(...mid),missing};
 }
 fs.writeFileSync(path.join(out,'holly-fur.json'),JSON.stringify(report)+'\n');
 for(const backend of ['webgl','canvas']){
  const S=report.summary[backend];
  ok(MID.every((c,s)=>c.every(x=>S.current.worst[s][MAT[s].indexOf(x)]>0)),'mid-cup positions measured');
  ok(S.current.meanWorst<.5*S.r8.meanWorst&&S.current.meanWorst<.5*S.r9.meanWorst,'mean worst thickness change at most half of r8 and r9');
  for(let s=0;s<2;s++)MAT[s].forEach((x,j)=>ok(S.current.worst[s][j]<S.r8.worst[s][j]&&S.current.worst[s][j]<S.r9.worst[s][j],`fur at ${x} retains shape better than r8 and r9`));
  ok(S.current.midCupMax<=.17,'mid-cup trim within 17% in every measured state (target 10%)');
 }
 // WebGL and Canvas agree on the measured trim.
 {let worst=0;for(const s of Object.values(report.states))for(let side=0;side<2;side++)s.webgl.current[side].forEach((x,j)=>{const y=s.canvas.current[side][j];if(x!==null&&y!==null)worst=Math.max(worst,Math.abs(x-y));});
  report.consistency.maxRatioDifference=worst;ok(worst<.06,'WebGL and Canvas trim thickness agree');}

 // 2. GPU field: exposed-skin and fur travel, and fold check (Jacobian of the sample map).
 const skin=[{upper:[320,315],center:[325,332],nearFur:[325,345],outer:[300,335]},{upper:[436,315],center:[433,334],nearFur:[433,345],outer:[460,335]}];
 for(const v of VERSIONS){
  const app=await setup(browser,'v8',{width:390,height:844},true,false,'holly',sources[v]);await character(app.page,'holly');await app.page.evaluate(()=>__fur.label());
  for(const s of STATES.filter(s=>/natural slap 12|large-|chaos slap 12/.test(s.name))){
   await drive(app.page,s);
   const r=await app.page.evaluate(({points,label})=>{
    const c=document.querySelector('#game'),f=__peachPhysicsDebug.snapshot().framing,dpr=c.width/innerWidth,a=__test.pixels(),L=window.__furLabel;
    const field=(X,Y)=>{const at=((c.height-1-Y)*c.width+X)*4;return [(a[at]/255+a[at+1]/65025-.5)*128,(a[at+2]/255+a[at+3]/65025-.5)*128];};
    const toScreen=(x,y)=>[Math.round((f.x+x/720*f.width)*dpr),Math.round((f.y+y/1280*f.height)*dpr)];
    const result={skin:{},fur:0,minDet:Infinity,at:null};
    for(const [name,[x,y]] of Object.entries(points)){const [X,Y]=toScreen(x,y),d=field(X,Y);result.skin[name]=Math.hypot(d[0],d[1]);}
    let sum=0,n=0;const [X0,Y0]=toScreen(255,320),[X1,Y1]=toScreen(500,410),k=(f.width/720)*dpr;
    for(let Y=Y0+1;Y<Y1-1;Y++)for(let X=X0+1;X<X1-1;X++){
     const x=(X/dpr-f.x)/f.width*720,y=(Y/dpr-f.y)/f.height*1280;
     if(L[(Math.round(y)*720+Math.round(x))*4]&&((x<380)===(label.side===0)||label.side===2)){const d=field(X,Y);sum+=Math.hypot(d[0],d[1]);n++;}
     const a0=field(X-1,Y),a1=field(X+1,Y),b0=field(X,Y-1),b1=field(X,Y+1);
     const sxx=1-(a1[0]-a0[0])*k/2,sxy=-(b1[0]-b0[0])*k/2,syx=-(a1[1]-a0[1])*k/2,syy=1-(b1[1]-b0[1])*k/2,det=sxx*syy-sxy*syx;
     if(det<result.minDet){result.minDet=det;result.at=[Math.round(x),Math.round(y)];}
    }
    result.fur=sum/n;return result;
   },{points:skin[s.side===2?0:s.side],label:{side:s.side}});
   (report.travel[s.name]??={})[v]=r;
  }
  report.errors.push(...app.errors);await app.context.close();
 }
 fs.writeFileSync(path.join(out,'holly-fur.json'),JSON.stringify(report)+'\n');
 for(const [name,t] of Object.entries(report.travel)){
  // Gesture-driven states keep r8 skin travel within 1%; forced clamp poses (node bounds) within 7%.
  const limit=/large-/.test(name)?.07:.01;
  for(const point of ['upper','center'])ok(Math.abs(t.current.skin[point]/t.r8.skin[point]-1)<=limit,`${name}: exposed skin ${point} keeps r8 travel`);
  ok(t.current.minDet>.1,`${name}: no fold or pinch in the moving field (min Jacobian > 0.1)`);
  ok(t.current.fur>.6*t.r8.fur,`${name}: trim keeps most of its r8 travel`);
 }

 // 3. Regressions against r9: Holly trajectories, rest, settle, framing, other characters.
 for(const fallback of [false,true]){
  const a=await setup(browser,'v8',{width:390,height:844},true,fallback,false,sources.r9),b=await setup(browser,'v8',{width:390,height:844},true,fallback,false,sources.current);
  for(const id of ['ember','midnight','aurelia']){
   for(const app of [a,b]){await character(app.page,id);await app.page.evaluate(()=>{document.querySelector('[data-preset="natural"]').click();__test.reset();__test.model.transfer=50;});}
   assert.equal(await canvas(a.page),await canvas(b.page));checks++;
   for(const side of [0,1]){const pose=p=>p.evaluate(side=>{__test.reset();__test.gesture('slap',side);for(let i=0;i<12;i++)__test.step(1/120);},side);await pose(a.page);await pose(b.page);assert.equal(await canvas(a.page),await canvas(b.page));checks++;}
  }
  for(const app of [a,b])await character(app.page,'holly');
  for(const side of [0,1])for(const kind of ['slap','drag','flick'])for(const link of [0,50,100]){assert.deepEqual(await scenario(a.page,kind,side,link),await scenario(b.page,kind,side,link));checks++;}
  for(const size of [{width:375,height:667},{width:390,height:844},{width:430,height:932}]){
   const frames=[];for(const app of [a,b]){await app.page.setViewportSize(size);frames.push(await app.page.evaluate(()=>{__test.resize();__test.reset();__test.render();return __peachPhysicsDebug.snapshot().framing;}));}
   assert.deepEqual(frames[0],frames[1]);checks++;
   const restA=await canvas(a.page),restB=await canvas(b.page);assert.equal(restA,restB);checks++;
   await b.page.evaluate(()=>{__test.reset();__test.gesture('slap',1);for(let i=0;i<960;i++)__test.step(1/120);});assert.equal(await canvas(b.page),restB);checks++;
  }
  report.errors.push(...a.errors,...b.errors);await a.context.close();await b.context.close();
 }
 ok(report.errors.length===0,'no browser errors');report.checks=checks;
 fs.writeFileSync(path.join(out,'holly-fur.json'),JSON.stringify(report)+'\n');
 const pct=x=>Math.round(x*100);
 for(const backend of ['webgl','canvas'])for(const v of VERSIONS){const s=report.summary[backend][v];console.log(backend.padEnd(7),v.padEnd(8),'mean',pct(s.meanWorst)+'%','max',pct(s.maxWorst)+'%','mid-cup max',pct(s.midCupMax)+'%','|',s.worst.map((w,i)=>w.map((x,j)=>MAT[i][j]+':'+pct(x)).join(' ')).join(' | '));}
 console.log('checks',checks,'webgl/canvas max difference',report.consistency.maxRatioDifference.toFixed(3));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
