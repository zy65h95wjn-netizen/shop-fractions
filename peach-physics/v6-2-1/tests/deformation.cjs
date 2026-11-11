// Measure the actual interpolated shader displacement, not a JS copy of the mask.
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
const root=path.resolve(__dirname,'../../..'),out=process.env.PEACH_TEST_OUTPUT||'/tmp/peach-v6-2-1-tests';fs.mkdirSync(out,{recursive:true});
const fragment=`precision highp float;varying vec2 vUV;varying vec2 vRawUV;
 vec2 encode(float x){vec2 e=fract(x*vec2(1.0,255.0));e.x-=e.y/255.0;return e;}
 void main(){vec2 d=(vRawUV-vUV)*vec2(941.0,1671.0);gl_FragColor=vec4(encode(.5+d.x/128.0),encode(.5+d.y/128.0));}`;
const hook=`window.field={pose:(dx,dy,stress=false)=>{reset();for(let i=0;i<3;i++){nodes[i].dx=dx;nodes[i].dy=dy;}if(stress){followers[0].dx=10;followers[0].dy=11;impacts[0].v=1.2;waves[0]={age:.08,strength:1};}resize();render();},read:()=>{render();const a=new Uint8Array(canvas.width*canvas.height*4);gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,a);return {a,w:canvas.width,h:canvas.height,f:{ox,oy,drawW,drawH,cssW},error:gl.getError()};}};`;
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});const metrics={};
for(const version of ['v6-2','v6-2-1']){
 const p=await browser.newPage({viewport:{width:440,height:956},deviceScaleFactor:2,isMobile:true,hasTouch:true});
 await p.addInitScript(()=>{requestAnimationFrame=()=>0;});
 await p.route(`**/${version}/`,route=>{let s=fs.readFileSync(path.join(root,'peach-physics',version,'index.html'),'utf8');s=s.replace(/const fragment=`[^`]+`;/,`const fragment=\`${fragment}\`;`);s=s.replace('presentCharacter();\ngetPhoto',hook+'\npresentCharacter();\ngetPhoto');return route.fulfill({contentType:'text/html',body:s});});
 await p.goto(`http://127.0.0.1:8000/peach-physics/${version}/`);await p.waitForFunction(()=>window.field&&document.querySelector('#loader').classList.contains('hiding'));await p.evaluate(()=>__peachPhysicsDebug.switchCharacter('midnight'));await p.waitForFunction(()=>__peachPhysicsDebug.snapshot().character==='midnight');
 const results=[];for(const [dx,dy,stress] of [[0,10,false],[26,30,true],[-26,-30,true],[26,-30,true],[-26,30,true]]){
 const m=await p.evaluate(({dx,dy,stress})=>{field.pose(dx,dy,stress);const {a,w,h,f,error}=field.read();
  function disp(x,y){const at=((h-1-y)*w+x)*4;return [(a[at]/255+a[at+1]/65025-.5)*128,(a[at+2]/255+a[at+3]/65025-.5)*128];}
  const dpr=w/f.cssW,scale=f.drawW/941*dpr;
  function at(x,y){return disp(Math.round((f.ox+x/941*f.drawW)*dpr),Math.round((f.oy+y/1671*f.drawH)*dpr));}
  const samples=Object.fromEntries(Object.entries({center:[300,1145],outer:[220,1180],inner:[400,1160],lower:[310,1230],upper:[315,1060]}).map(([k,[x,y]])=>[k,at(x,y)]));
  let minDet=Infinity,maxStretch=0,moving=0;
  for(let y=970;y<1310;y+=2)for(let x=155;x<463;x+=2){const sx=Math.round((f.ox+x/941*f.drawW)*dpr),sy=Math.round((f.oy+y/1671*f.drawH)*dpr);
   const l=disp(sx-1,sy),r=disp(sx+1,sy),t=disp(sx,sy-1),b=disp(sx,sy+1),d=disp(sx,sy);
   const a1=1-(r[0]-l[0])*scale/2,b1=-(b[0]-t[0])*scale/2,c1=-(r[1]-l[1])*scale/2,d1=1-(b[1]-t[1])*scale/2;
   minDet=Math.min(minDet,a1*d1-b1*c1);maxStretch=Math.max(maxStretch,Math.hypot(a1,c1),Math.hypot(b1,d1));if(Math.hypot(...d)>5)moving++;
  }
  return {dx,dy,stress,samples,minDet,maxStretch,moving,error};
 },{dx,dy,stress});results.push(m);}
 metrics[version]=results;await p.close();
}
fs.writeFileSync(path.join(out,'deformation.json'),JSON.stringify(metrics,null,2));console.log(JSON.stringify(metrics));
const old=metrics['v6-2'][0],next=metrics['v6-2-1'][0];
assert.ok(next.samples.inner[1]>old.samples.inner[1]*2,'inner skin no longer pinned by double mask');
const values=Object.values(next.samples).map(p=>p[1]);assert.ok(Math.min(...values)/Math.max(...values)>.9,'interior displacement stays coherent across five sample points');
assert.ok(next.moving>old.moving,'more skin participates');for(const result of metrics['v6-2-1']){assert.equal(result.error,0);assert.ok(result.minDet>0,'no texture fold under bounded stress');}
await browser.close();})().catch(e=>{console.error(e);process.exit(1)});
