// Holly fabric-support A/B experiment. A = default (r9.1), B = ?fabric=strong (forced here).
// Both run identical spring trajectories. Measures, through the real WebGL and Canvas renderers:
// trim width (photo-traced fur label), skin and garment travel, garment strain, and folds.
// Also proves A renders exactly as r9.1 and that B leaves springs and other characters unchanged.
const {chromium,fs,path,assert,root,out,setup,character,scenario,canvas}=require('./harness.cjs');
const {hook,MAT,MID,GRID,measure,draw,ratio}=require('./fur-measure.cjs');
const {execFileSync}=require('node:child_process');
const R91='5c9b9d2330b7520510c9756d25ddcf2fcd1a5401';
const current=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8'),switchLine='const HOLLY_FABRIC=true;';
assert.ok(current.includes(switchLine));
const html={r91:execFileSync('git',['show',R91+':peach-physics/v8/index.html'],{cwd:root,maxBuffer:3e6}).toString(),A:current.replace(switchLine,'const HOLLY_FABRIC=false;'),B:current};
const sources={};const marker='presentCharacter();\ngetPhoto';
for(const [v,h] of Object.entries(html)){sources[v]=path.join(out,`fabric-${v}.html`);fs.writeFileSync(sources[v],h.replace(marker,hook+marker));}
let checks=0;const ok=(value,message)=>{assert.ok(value,message);checks++;};
const report={r91:R91,checks:0,materialPositions:{all:MAT,midCup:MID},states:{},trajectories:{},field:{},summary:{},errors:[]};

const {STATES,drivePeak}=require('./fabric-inputs.cjs');
// GPU field statistics on the source grid (WebGL field hook): travel, principal strain, Jacobian.
const fieldStats=(p,regions,side)=>p.evaluate(({regions,side})=>{
 const c=document.querySelector('#game'),f=__peachPhysicsDebug.snapshot().framing,dpr=c.width/innerWidth,a=__test.pixels(),k=f.width/720*dpr;
 const F=(X,Y)=>{const at=((c.height-1-Y)*c.width+X)*4;return [(a[at]/255+a[at+1]/65025-.5)*128,(a[at+2]/255+a[at+3]/65025-.5)*128];};
 const S=(x,y)=>[Math.round((f.x+x/720*f.width)*dpr),Math.round((f.y+y/1280*f.height)*dpr)];
 const res={skin:{},trim:{travel:[],strain:[]},cup:{travel:[],strain:[]},skinBand:{strain:[]},minDet:Infinity,minDetAt:null};
 for(const [name,[x,y]] of Object.entries(regions.skinPoints[side===2?0:side])){const [X,Y]=S(x,y),d=F(X,Y);res.skin[name]=Math.hypot(...d);}
 for(let y=322;y<408;y++)for(let x=256;x<500;x++){
  if(side!==2&&(x<380)!==(side===0))continue;
  const [X,Y]=S(x+.5,y+.5),d=F(X,Y),a0=F(X-1,Y),a1=F(X+1,Y),b0=F(X,Y-1),b1=F(X,Y+1);
  // Backward map Jacobian per source pixel; forward stretches are reciprocals of its singular values.
  const A=1-(a1[0]-a0[0])*k/2,B=-(b1[0]-b0[0])*k/2,C=-(a1[1]-a0[1])*k/2,D=1-(b1[1]-b0[1])*k/2,det=A*D-B*C;
  const E=A*A+C*C,G=B*B+D*D,Fm=A*B+C*D,t=Math.sqrt(((E-G)/2)**2+Fm*Fm),s1=Math.sqrt(Math.max((E+G)/2+t,1e-9)),s2=Math.sqrt(Math.max((E+G)/2-t,1e-9));
  const strain=Math.max(Math.abs(1/s1-1),Math.abs(1/s2-1)),i=(y-264)*272+(x-240),region=regions.map[i];
  if(det<res.minDet){res.minDet=det;res.minDetAt=[x,y];}
  if(region===1){res.trim.travel.push(Math.hypot(...d));res.trim.strain.push(strain);}
  else if(region===2){res.cup.travel.push(Math.hypot(...d));res.cup.strain.push(strain);}
  else if(region===3)res.skinBand.strain.push(strain);
 }
 const sum=v=>{v.sort((p,q)=>p-q);return {mean:v.reduce((p,q)=>p+q,0)/Math.max(v.length,1),p95:v[Math.floor(v.length*.95)]||0,n:v.length};};
 return {skin:res.skin,minDet:res.minDet,minDetAt:res.minDetAt,trimTravel:sum(res.trim.travel).mean,cupTravel:sum(res.cup.travel).mean,trimStrain:sum(res.trim.strain),cupStrain:sum(res.cup.strain),skinBandStrain:sum(res.skinBand.strain)};
},{regions,side});

(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 // Regions (source pixels, fixed for A and B): 1 trim (photo label), 2 green cup (B garment channel,
 // not trim), 3 skin within 26 px above the trim.
 let regions;
 {
  const app=await setup(browser,'v8',{width:390,height:844},true,false,false,sources.B);await character(app.page,'holly');
  const label=await app.page.evaluate(()=>__fur.label()),mask=await app.page.evaluate(()=>__fur.mask()),map=new Array(272*176).fill(0);
  for(let y=0;y<176;y++)for(let x=0;x<272;x++){const X=x+240,Y=y+264,i=y*272+x,k=X-label.x0;
   const top=label.top[k]??null,bottom=label.bottom[k]??null;
   if(top!==null&&Y>=top&&Y<=bottom)map[i]=1;else if(mask[i*4+2]>0&&(top===null||Y>bottom))map[i]=2;else if(top!==null&&Y<top&&Y>=top-26&&(mask[i*4]>0||mask[i*4+1]>0))map[i]=3;}
  regions={map,skinPoints:[{center:[325,332],upper:[320,315],nearTrim:[325,345]},{center:[433,334],upper:[436,315],nearTrim:[433,345]}]};
  report.regionPixels=[1,2,3].map(r=>map.filter(v=>v===r).length);await app.context.close();
 }
 for(const backend of ['webgl','canvas']){
  const fallback=backend==='canvas',apps={};
  for(const v of ['r91','A','B']){apps[v]=await setup(browser,'v8',{width:390,height:844},true,fallback,false,sources[v]);await character(apps[v].page,'holly');await apps[v].page.evaluate(()=>__fur.label());}
  // A is r9.1, pixel for pixel, in motion; B's rest is unchanged.
  for(const s of STATES.slice(0,8)){for(const v of ['r91','A'])await drivePeak(apps[v].page,s);assert.equal(await canvas(apps.A.page),await canvas(apps.r91.page));checks++;}
  for(const v of ['A','B'])await apps[v].page.evaluate(()=>{document.querySelector('[data-preset="natural"]').click();__test.reset();});
  const restA=await canvas(apps.A.page);assert.equal(await canvas(apps.B.page),restA);checks++;
  const rest={};for(const v of ['A','B'])rest[v]=measure(await draw(apps[v].page));
  for(const s of STATES)for(const v of ['A','B']){
   const peak=await drivePeak(apps[v].page,s);const r=ratio(measure(await draw(apps[v].page)),rest[v]);
   const e=((report.states[s.name]??={})[backend]??={});e[v]=r;e.peak=peak;
  }
  for(const preset of ['natural','chaos'])for(const side of [0,1])for(const v of ['A','B']){
   const p=apps[v].page,series=[];
   await p.evaluate(({preset,side})=>{document.querySelector(`[data-preset="${preset}"]`).click();__test.reset();__test.model.transfer=50;__test.gesture('slap',side);},{preset,side});
   for(let i=0;i<90;i+=2){series.push(ratio(measure(await draw(p)),rest[v])[side]);await p.evaluate(()=>{__test.step(1/120);__test.step(1/120);});}
   ((report.trajectories[`${preset} tap ${side?'R':'L'}`]??={})[backend]??={})[v]=series;
  }
  // B settles to the rest image; B leaves the other characters exactly as A.
  await apps.B.page.evaluate(()=>{__test.reset();__test.gesture('slap',1);for(let i=0;i<960;i++)__test.step(1/120);});assert.equal(await canvas(apps.B.page),restA);checks++;
  for(const id of ['ember','midnight','aurelia']){
   for(const v of ['A','B']){await character(apps[v].page,id);await apps[v].page.evaluate(()=>{__test.reset();__test.gesture('slap',0);for(let i=0;i<12;i++)__test.step(1/120);});}
   assert.equal(await canvas(apps.B.page),await canvas(apps.A.page));checks++;
  }
  for(const v of ['A','B']){await character(apps[v].page,'holly');}
  for(const side of [0,1])for(const kind of ['slap','drag','flick'])for(const link of [0,100]){assert.deepEqual(await scenario(apps.A.page,kind,side,link),await scenario(apps.B.page,kind,side,link));checks++;}
  for(const app of Object.values(apps)){report.errors.push(...app.errors);await app.context.close();}
 }
 // GPU field statistics.
 for(const v of ['A','B']){
  const app=await setup(browser,'v8',{width:390,height:844},true,false,'holly',sources[v]);await character(app.page,'holly');
  for(const s of STATES){await drivePeak(app.page,s);(report.field[s.name]??={})[v]=await fieldStats(app.page,regions,s.side);}
  report.errors.push(...app.errors);await app.context.close();
 }
 // Summaries.
 for(const backend of ['webgl','canvas'])for(const v of ['A','B']){
  const worst=MAT.map(c=>c.map(()=>0)),take=(r,side)=>r.forEach((x,j)=>{if(x!==null)worst[side][j]=Math.max(worst[side][j],Math.abs(x-1));});
  for(const s of Object.values(report.states)){take(s[backend][v][0],0);take(s[backend][v][1],1);}
  for(const [n,t] of Object.entries(report.trajectories))for(const r of t[backend][v])take(r,n.endsWith('R')?1:0);
  const mid=MID.flatMap((c,s)=>c.map(x=>worst[s][MAT[s].indexOf(x)])),all=worst.flat();
  (report.summary[backend]??={})[v]={worst,meanWorst:all.reduce((a,b)=>a+b)/all.length,maxWorst:Math.max(...all),midCupMax:Math.max(...mid)};
 }
 fs.writeFileSync(path.join(out,'holly-fabric.json'),JSON.stringify(report)+'\n');
 // Assertions: B holds garment shape, keeps skin, moves coherently, does not fold.
 for(const backend of ['webgl','canvas']){const S=report.summary[backend];ok(S.B.midCupMax<=.10,`${backend}: B mid-cup trim within 10%`);ok(S.B.meanWorst<S.A.meanWorst,`${backend}: B trim shape better than A on average`);}
 for(const [name,t] of Object.entries(report.field)){
  // Upper skin keeps A's travel everywhere. Skin center is exact on peaks and downward motion; on
  // upward motion (rebound, flick up, inward-up) its backward-warp sample path crosses B's
  // skin-to-garment hand-off and it travels less. That loss is bounded here and reported.
  ok(Math.abs(t.B.skin.upper/t.A.skin.upper-1)<=.02,`${name}: B upper skin keeps A travel`);
  const upward=/rebound|flick up|inward-up/.test(name),limit=upward?(/node-bound/.test(name)?.2:.15):.02;
  ok(Math.abs(t.B.skin.center/t.A.skin.center-1)<=limit,`${name}: B skin center within ${limit*100}% of A`);
  ok(t.B.minDet>.1,`${name}: B has no fold or pinch (min Jacobian > 0.1)`);
  if(t.A.trimTravel>1.5){ok(t.B.trimStrain.mean<=t.A.trimStrain.mean+.01,`${name}: B trim strain no higher than A`);ok(t.B.cupStrain.mean<t.A.cupStrain.mean,`${name}: B cup strain below A`);ok(t.B.trimTravel>.3*t.A.trimTravel,`${name}: B garment still moves`);}
 }
 ok(report.errors.length===0,'no browser errors');report.checks=checks;
 fs.writeFileSync(path.join(out,'holly-fabric.json'),JSON.stringify(report)+'\n');
 const pct=x=>Math.round(x*100);
 for(const backend of ['webgl','canvas'])for(const v of ['A','B']){const s=report.summary[backend][v];console.log(backend,v,'trim width: mean worst',pct(s.meanWorst)+'%','max',pct(s.maxWorst)+'%','mid-cup',pct(s.midCupMax)+'%');}
 for(const [n,t] of Object.entries(report.field))console.log(n.padEnd(34),['A','B'].map(v=>`${v} skin ${t[v].skin.center.toFixed(1)} trim ${t[v].trimTravel.toFixed(1)} cup ${t[v].cupTravel.toFixed(1)} strain trim ${pct(t[v].trimStrain.mean)}% cup ${pct(t[v].cupStrain.mean)}% band p95 ${pct(t[v].skinBandStrain.p95)}% det ${t[v].minDet.toFixed(2)}`).join(' | '));
 console.log('checks',checks);await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
