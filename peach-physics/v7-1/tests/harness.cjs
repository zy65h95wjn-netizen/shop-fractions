// Run against a repository-root HTTP server. Requires Playwright and Chromium.
// Test-only hooks are injected into responses; shipped HTML is never instrumented.
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../..'),out=process.env.PEACH_TEST_OUTPUT||'/tmp/peach-v7-1-tests';fs.mkdirSync(out,{recursive:true});
const base=process.env.PEACH_TEST_URL||'http://127.0.0.1:8000';let checks=0;
function ok(value,label){assert.ok(value,label);checks++;}
const hook=`
window.__test={reset,render,step,model,nodes,followers,impacts,waves,resize,chooseCharacter,currentCharacter,slap,impulse,skinWeight:typeof aureliaSkinWeight==='function'?aureliaSkinWeight:null,
 raw:()=>JSON.parse(JSON.stringify({nodes,followers,impacts,waves})),
 pixels:()=>{render();const p=new Uint8Array(canvas.width*canvas.height*4);gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,p);return p;},
 error:()=>gl.getError(),
 gesture:(kind,side=0)=>{
  const [x,y]=currentCharacter().impactCenters[side],sx=ox+x/W*drawW,sy=oy+y/H*drawH;
  if(kind==='slap'){slap(side,x,y,{sx,sy});return;}
  if(kind==='kick'){impulse(side,x,y);return;}
  const fire=(type,dx=0,dy=0)=>canvas.dispatchEvent(new PointerEvent(type,{pointerId:11,pointerType:'touch',clientX:sx+dx,clientY:sy+dy,bubbles:true}));
  fire('pointerdown');window.testClock+=20;fire('pointermove',12,14);window.testClock+=20;fire('pointermove',24,28);
  if(kind==='flick'){window.testClock+=10;fire('pointerup',24,28);}
 },
 forcePose:(dx,dy,side=0)=>{reset();for(let i=side*3;i<side*3+3;i++){nodes[i].dx=dx;nodes[i].dy=dy;}followers[side].dx=10;followers[side].dy=11;impacts[side].v=1.2;waves[side]={age:.08,strength:1};render();}
};
`;
async function setup(browser,version,size={width:390,height:844},controlled=true,fallback=false,field=false){
 const context=await browser.newContext({viewport:size,deviceScaleFactor:2,isMobile:true,hasTouch:true});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 if(controlled){await page.addInitScript(()=>{window.requestAnimationFrame=()=>0;window.testClock=1000;performance.now=()=>window.testClock;});}
 if(fallback)await page.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type.includes('webgl')?null:original.call(this,type,...args)};});
 await page.route(`**/peach-physics/${version}/`,route=>{
  let html=fs.readFileSync(path.join(root,'peach-physics',version,'index.html'),'utf8');
  if(field)html=html.replace('void main(){\n  if(vRawUV', 'vec2 encode(float x){vec2 e=fract(x*vec2(1.0,255.0));e.x-=e.y/255.0;return e;}\n void main(){\n  if(vRawUV').replace('gl_FragColor=texture2D(uPhoto,photoUV);','vec2 d=(vRawUV-photoUV)*vec2(756.0,1280.0);gl_FragColor=vec4(encode(.5+d.x/128.0),encode(.5+d.y/128.0));');
  html=html.replace('presentCharacter();\ngetPhoto',hook+'\npresentCharacter();\ngetPhoto');
  return route.fulfill({contentType:'text/html',body:html});
 });
 await page.goto(`${base}/peach-physics/${version}/`);await page.waitForFunction(()=>window.__test&&document.querySelector('#loader').classList.contains('hiding'));
 await page.evaluate(()=>{__test.resize();__test.render();});
 return {page,context,errors};
}
async function character(p,id){await p.evaluate(id=>__test.chooseCharacter(['ember','midnight','aurelia'].indexOf(id)),id);await p.waitForFunction(id=>__peachPhysicsDebug.snapshot().character===id,id);await p.evaluate(()=>{__test.resize();__test.reset();__test.render();});}
async function scenario(p,kind,side,transfer){return p.evaluate(({kind,side,transfer})=>{__test.reset();__test.model.transfer=transfer;__test.gesture(kind,side);let trace=[];for(let i=0;i<180;i++){__test.step(1/120);if(i%6===0)trace.push(__test.raw());}return trace;},{kind,side,transfer});}
async function canvas(p){return p.evaluate(()=>{__test.render();return document.querySelector('#game').toDataURL();});}

module.exports={chromium,fs,path,assert,root,out,base,setup,character,scenario,canvas};
