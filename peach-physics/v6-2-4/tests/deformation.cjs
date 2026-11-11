// Measure the actual interpolated shader displacement, not a JS copy of the mask.
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
const root=path.resolve(__dirname,'../../..'),out=process.env.PEACH_TEST_OUTPUT||'/tmp/peach-v6-2-4-tests';fs.mkdirSync(out,{recursive:true});
const encode=`vec2 encode(float x){vec2 e=fract(x*vec2(1.0,255.0));e.x-=e.y/255.0;return e;}\n`;
const hook=`window.field={pose:(side,dx,dy,stress=false)=>{reset();for(let i=side*3;i<side*3+3;i++){nodes[i].dx=dx;nodes[i].dy=dy;}if(stress===true){followers[side].dx=10;followers[side].dy=11;impacts[side].v=1.2;waves[side]={age:.08,strength:1};}if(stress==='ripple-on')waves[side]={age:.08,strength:1};resize();render();},read:()=>{render();const a=new Uint8Array(canvas.width*canvas.height*4);gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,a);return {a,w:canvas.width,h:canvas.height,f:{ox,oy,drawW,drawH,cssW},error:gl.getError()};}};`;
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});const metrics={};
for(const version of ['v6-2-3','v6-2-4']){
 const p=await browser.newPage({viewport:{width:440,height:956},deviceScaleFactor:2,isMobile:true,hasTouch:true});
 await p.addInitScript(()=>{requestAnimationFrame=()=>0;});
 await p.route(`**/${version}/`,route=>{let s=fs.readFileSync(path.join(root,'peach-physics',version,'index.html'),'utf8');s=s.replace(/const fragment=`([^`]+)`;/,(_,fragment)=>'const fragment=`'+fragment.replace('void main()',encode+'void main()').replace(/gl_FragColor=texture2D\(uPhoto,(\w+)\);/,(_,uv)=>'vec2 displacement=(vRawUV-'+uv+')*vec2(941.0,1671.0);gl_FragColor=vec4(encode(.5+displacement.x/128.0),encode(.5+displacement.y/128.0));')+'`;');s=s.replace('presentCharacter();\ngetPhoto',hook+'\npresentCharacter();\ngetPhoto');return route.fulfill({contentType:'text/html',body:s});});
 await p.goto(`http://127.0.0.1:8000/peach-physics/${version}/`);await p.waitForFunction(()=>window.field&&document.querySelector('#loader').classList.contains('hiding'));await p.evaluate(()=>__peachPhysicsDebug.switchCharacter('midnight'));await p.waitForFunction(()=>__peachPhysicsDebug.snapshot().character==='midnight');
 const results=[];for(const side of [0,1])for(const [dx,dy,stress] of [[0,10,false],[26,30,true],[-26,-30,true],[26,-30,true],[-26,30,true],[0,25,'ripple-off'],[0,25,'ripple-on']]){
 const m=await p.evaluate(({side,dx,dy,stress})=>{field.pose(side,dx,dy,stress);const {a,w,h,f,error}=field.read();
  function disp(x,y){const at=((h-1-y)*w+x)*4;return [(a[at]/255+a[at+1]/65025-.5)*128,(a[at+2]/255+a[at+3]/65025-.5)*128];}
  const dpr=w/f.cssW,scale=f.drawW/941*dpr;
  function at(x,y){return disp(Math.round((f.ox+x/941*f.drawW)*dpr),Math.round((f.oy+y/1671*f.drawH)*dpr));}
  const samples=Object.fromEntries(Object.entries({center:[300,1145],outer:[183,1200],inner:[435,1205],lower:[310,1290],upper:[315,1020],coreSide:[365,1145],belowCheek:[310,1350],innerThigh:[445,1320],wave:[283,1223],leftSeam:[320,997],leftTrim:[320,984],leftInnerSeam:[402,1030],leftVelvet:[320,946],rightSeam:[605,993],rightTrim:[605,977],rightInnerSeam:[525,1018],rightOuterSeam:[675,1012],rightBlend:[605,1020],rightCore:[605,1140],rightLower:[605,1250],rightVelvet:[605,945]}).map(([k,[x,y]])=>[k,at(x,y)]));
  let minDet=Infinity,maxStretch=0,moving=0,minAt=null;
  for(let y=940;y<1405;y+=2)for(let x=155;x<790;x+=2){const sx=Math.round((f.ox+x/941*f.drawW)*dpr),sy=Math.round((f.oy+y/1671*f.drawH)*dpr);
   const l=disp(sx-1,sy),r=disp(sx+1,sy),t=disp(sx,sy-1),b=disp(sx,sy+1),d=disp(sx,sy);
   const a1=1-(r[0]-l[0])*scale/2,b1=-(b[0]-t[0])*scale/2,c1=-(r[1]-l[1])*scale/2,d1=1-(b[1]-t[1])*scale/2;
   if(a1*d1-b1*c1<minDet){minDet=a1*d1-b1*c1;minAt=[x,y];}maxStretch=Math.max(maxStretch,Math.hypot(a1,c1),Math.hypot(b1,d1));if(Math.hypot(...d)>5)moving++;
  }
  return {side,dx,dy,stress,samples,minDet,minAt,maxStretch,moving,error};
 },{side,dx,dy,stress});results.push(m);}
 metrics[version]=results;await p.close();
}
fs.writeFileSync(path.join(out,'deformation.json'),JSON.stringify(metrics,null,2));
const old=metrics['v6-2-3'],next=metrics['v6-2-4'];
for(let i=0;i<next.length;i++){
 const a=old[i],b=next[i];assert.equal(b.error,0);
 assert.ok(b.minDet>0,'no sampled texture folds on either side');
 for(const key of b.side===0?['center','coreSide','outer','inner','lower','belowCheek','innerThigh','wave']:['rightCore','rightLower']){
  assert.deepEqual(b.samples[key],a.samples[key],`${key} approved motion unchanged in pose ${i}`);
 }
 if(b.side===0)for(const key of ['belowCheek','innerThigh','leftVelvet'])assert.ok(Math.hypot(...b.samples[key])<.01,`${key} stays anchored`);
}
const first=next[0];
for(const key of ['leftSeam','leftInnerSeam'])assert.ok(first.samples[key][1]>3 && first.samples[key][1]>old[0].samples[key][1]+2,`${key} motion reaches the clothing line`);
assert.ok(first.samples.leftTrim[1]>1,'lower left trim follows');
if(process.env.SEAM_PHASE!=='left'){
 const a=old[7],b=next[7];
 for(const key of ['rightSeam','rightTrim','rightInnerSeam','rightOuterSeam']){
  const ratio=b.samples[key][1]/a.samples[key][1];
  assert.ok(ratio>.4 && ratio<.85,`${key} firmer but still moving: ${ratio}`);
 }
 assert.ok(b.samples.rightBlend[1]>b.samples.rightSeam[1] && b.samples.rightCore[1]>b.samples.rightBlend[1],'right transition gradually yields to the cheek');
}
console.log(JSON.stringify({left:next[0].samples,right:next[7].samples,minLeftDet:Math.min(...next.filter(x=>x.side===0).map(x=>x.minDet)),rightStress:next.filter(x=>x.side===1).map(x=>x.minDet)}));
await browser.close();})().catch(e=>{console.error(e);process.exit(1)});
