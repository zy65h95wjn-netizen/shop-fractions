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

// 1. Only the Holly mask builder, its trim table and the release labels differ from r9.
{
 const strip=s=>s.replace(/r9\.1|r9/g,'R');
 const a=strip(html.r9),b=strip(html.current),cut=(s,x,y)=>s.slice(0,s.indexOf(x))+s.slice(s.indexOf(y));
 const start='let hollyMaskLoc,hollyMaskPixels',end='function createHollyShapeTexture(){';
 ok(a.includes(start)&&b.includes(start)&&cut(a,start,end)===cut(b,start,end),'only the Holly mask builder changed');
}
const hook=`window.__fur={
 mask:()=>Array.from(hollyMaskPixels),
 // Fur label traced from the loaded photograph; independent of the runtime mask.
 label:()=>{
  const c=document.createElement('canvas');c.width=720;c.height=1280;const g=c.getContext('2d');g.drawImage(img,0,0);
  const d=g.getImageData(0,0,720,1280).data,x0=255,x1=505,y0=315,y1=405,W0=x1-x0,H0=y1-y0,raw=new Uint8Array(W0*H0);
  for(let y=0;y<H0;y++)for(let x=0;x<W0;x++){const i=((y+y0)*720+x+x0)*4,mx=Math.max(d[i],d[i+1],d[i+2]),mn=Math.min(d[i],d[i+1],d[i+2]);raw[y*W0+x]=(mx-mn)/Math.max(mx,1)<.27&&mx>105?1:0;}
  const morph=(a,keep)=>{const b=new Uint8Array(a.length);for(let y=0;y<H0;y++)for(let x=0;x<W0;x++){let v=keep;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const yy=y+dy,xx=x+dx;const q=yy<0||xx<0||yy>=H0||xx>=W0?0:a[yy*W0+xx];if(q!==keep)v=1-keep;}b[y*W0+x]=v;}return b;};
  const open=morph(morph(raw,1),0),lab=new Int32Array(open.length),sizes=[0];
  for(let i=0;i<open.length;i++)if(open[i]&&!lab[i]){const id=sizes.length,stack=[i];lab[i]=id;let n=0;
   while(stack.length){const j=stack.pop();n++;const x=j%W0,y=(j-x)/W0;for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const xx=x+dx,yy=y+dy,k=yy*W0+xx;if(xx>=0&&yy>=0&&xx<W0&&yy<H0&&open[k]&&!lab[k]){lab[k]=id;stack.push(k);}}}sizes.push(n);}
  const top=new Array(W0).fill(null),bottom=new Array(W0).fill(null);
  for(let x=0;x<W0;x++)for(let y=0;y<H0;y++){const id=lab[y*W0+x];if(id&&sizes[id]>800){if(top[x]===null)top[x]=y;bottom[x]=y;}}
  // Columns are filled between the outer edges; a 21-column median closes the dark shadow fold
  // inside the left outer trim without moving either traced edge outward.
  const med=(arr,x)=>{const v=[];for(let k=x-10;k<=x+10;k++)if(k>=0&&k<W0&&arr[k]!==null)v.push(arr[k]);v.sort((a,b)=>a-b);return v.length?v[v.length>>1]:null;};
  const T=top.map((v,x)=>v===null?null:Math.min(v,med(top,x))),B=bottom.map((v,x)=>v===null?null:Math.max(v,med(bottom,x)));
  const rgba=new Uint8Array(720*1280*4);
  for(let y=0;y<1280;y++)for(let x=0;x<720;x++){const i=(y*720+x)*4,xx=x-x0,yy=y-y0;rgba[i+1]=Math.max(0,Math.min(255,x-240));rgba[i+3]=255;
   if(xx>=0&&xx<W0&&T[xx]!==null&&yy>=T[xx]&&yy<=B[xx])rgba[i]=255;}
  window.__furLabel=rgba;return {top:T.map(v=>v===null?null:v+y0),bottom:B.map(v=>v===null?null:v+y0),x0};
 },
 // Render the label through the active renderer; returns it on the source crop grid [x0..x1) x [y0..y1).
 draw:(x0,y0,x1,y1)=>{
  const L=window.__furLabel,w=x1-x0,h=y1-y0,res=new Uint8Array(w*h*2);
  if(gl){
   gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,720,1280,0,gl.RGBA,gl.UNSIGNED_BYTE,L);
   render();const dpr=canvas.width/innerWidth,sx=x=>(ox+x/W*drawW)*dpr,sy=y=>(oy+y/H*drawH)*dpr;
   const X0=Math.floor(sx(x0))-2,Y0=Math.floor(sy(y0))-2,X1=Math.ceil(sx(x1))+2,Y1=Math.ceil(sy(y1))+2,RW=X1-X0,RH=Y1-Y0,p=new Uint8Array(RW*RH*4);
   gl.readPixels(X0,canvas.height-Y1,RW,RH,gl.RGBA,gl.UNSIGNED_BYTE,p);
   const at=(X,Y,k)=>p[((RH-1-Y)*RW+X)*4+k];
   for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const fx=sx(x0+x+.5)-.5-X0,fy=sy(y0+y+.5)-.5-Y0,ix=Math.floor(fx),iy=Math.floor(fy),ax=fx-ix,ay=fy-iy;
    for(let k=0;k<2;k++)res[(y*w+x)*2+k]=Math.round((at(ix,iy,k)*(1-ax)+at(ix+1,iy,k)*ax)*(1-ay)+(at(ix,iy+1,k)*(1-ax)+at(ix+1,iy+1,k)*ax)*ay);
   }
   gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);render();
  }else{
   const saved=hollySource;hollySource=new Uint8ClampedArray(L);render();hollySource=saved;
   const [cx,cy,cw,ch]=HOLLY_CROP,layer=hollyLayer.getContext('2d').getImageData(0,0,cw,ch).data;
   for(let y=0;y<h;y++)for(let x=0;x<w;x++){const X=x0+x-cx,Y=y0+y-cy,j=(Y*cw+X)*4,moving=layer[j+3]>0,i=((y0+y)*720+x0+x)*4;
    res[(y*w+x)*2]=moving?layer[j]:L[i];res[(y*w+x)*2+1]=moving?layer[j+1]:L[i+1];}
   render();
  }
  return Array.from(res);
 }
};
`;
const sources={};
for(const v of VERSIONS){
 const marker='presentCharacter();\ngetPhoto';assert.ok(html[v].includes(marker));sources[v]=path.join(out,`fur-${v}.html`);
 fs.writeFileSync(sources[v],html[v].replace(marker,hook+marker));
}
// Material positions (source x) along each trim, kept away from the attached tips.
const MAT=[[286,296,306,316,326,336,346,352],[408,416,426,436,446,456,466,474]];
// Mid-cup: at least ~24 source px from both trim tips and inside the right guard's plateau.
const MID=[[296,306,316,326,336],[426,436,446]];report.materialPositions={all:MAT,midCup:MID};
const GRID=[255,320,500,410];
function measure(res){
 const [x0,y0,x1,y1]=GRID,w=x1-x0,h=y1-y0,out=[[],[]];
 for(const side of [0,1]){
  const cols=[];
  for(let x=side?394:258;x<=(side?494:368);x+=2){
   let top=null,bottom=null,prev=0,sum=0;const X=x-x0;
   for(let y=0;y<h;y++){const v=res[(y*w+X)*2]/255;sum+=v;if(y>0){if(top===null&&prev<.5&&v>=.5)top=y0+y-1+(.5-prev)/(v-prev);if(prev>=.5&&v<.5)bottom=y0+y-1+(prev-.5)/(prev-v);}prev=v;}
   if(top===null||bottom===null){cols.push(null);continue;}
   const m=Math.round((top+bottom)/2)-y0;cols.push({x,top,bottom,vertical:sum,source:res[(m*w+X)*2+1]+240});
  }
  for(let k=3;k<cols.length-3;k++){const a=cols[k-3],c=cols[k],b=cols[k+3];if(!a||!b||!c)continue;
   const slope=((b.top+b.bottom)-(a.top+a.bottom))/2/(b.x-a.x);c.normal=c.vertical/Math.sqrt(1+slope*slope);}
  out[side]=MAT[side].map(xm=>{for(let k=0;k<cols.length-1;k++){const a=cols[k],b=cols[k+1];
   if(a&&b&&a.normal!==undefined&&b.normal!==undefined&&(a.source-xm)*(b.source-xm)<=0&&a.source!==b.source){const t=(xm-a.source)/(b.source-a.source);return {normal:a.normal+(b.normal-a.normal)*t,top:a.top+(b.top-a.top)*t,x:a.x+(b.x-a.x)*t};}}
   return null;});
 }
 return out;
}
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
const draw=p=>p.evaluate(g=>__fur.draw(...g),GRID);
const ratio=(m,rest)=>m.map((side,s)=>side.map((c,j)=>c?c.normal/rest[s][j].normal:null));

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
