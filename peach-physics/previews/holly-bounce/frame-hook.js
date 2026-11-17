// Runs only in this private preview copy, before its photograph is loaded.
const bounceExperiment=window.name==='softer';
let bounceClose=false,bounceOriginalMask=null;
const bounceSmooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t)};
// Give upper skin a longer transition into its attachments. The silhouette,
// central gap and garment support keep the existing guards and trim handoff.
const bounceContours=HOLLY_MOTION_CONTOURS.map(points=>points.map(p=>[...p]));
bounceContours[0].splice(0,4,[274,372],[316,360],[359,378],[392,414]);
bounceContours[1].splice(0,3,[437,381],[477,369],[524,400]);
const bouncePlanes=bounceContours.map(points=>points.map(([x,y],i)=>{
 const [bx,by]=points[(i+1)%points.length],len=Math.hypot(bx-x,by-y),nx=-(by-y)/len,ny=(bx-x)/len;return[nx,ny,-nx*x-ny*y];
}));
const bounceBuildMask=buildHollyMask;
buildHollyMask=function(){
 if(hollyMaskPixels)return;
 bounceBuildMask();bounceOriginalMask=new Uint8Array(hollyMaskPixels);
 if(!bounceExperiment)return;
 const [ox,oy,w,h]=HOLLY_CROP;
 const base=(side,x,y)=>hollyMotionWeight(side,x,y)*(1-.45*bounceSmooth((y-(566-.0025*(x-410)**2)+32)/56));
 const trims=HOLLY_FUR.map((points,side)=>hollyTrimLine(points,side,base));
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const px=ox+x+.5,py=oy+y+.5,i=(y*w+x)*4;
  for(let side=0;side<2;side++){
   const edge=bounceSmooth(Math.min(...bouncePlanes[side].map(([nx,ny,c])=>(nx*px+ny*py+c)/38)));
   const p=hollyTrimPoint(trims[side],px,py);
   const cover=bounceSmooth((p.d+p.half+26)/24)*bounceSmooth(p.ends/10);
   // Keep the texture border zero so CLAMP cannot carry motion outside this crop.
   const cropGuard=bounceSmooth((py-oy-2)/22)*bounceSmooth((oy+h-2-py)/14)*bounceSmooth((px-ox-2)/16)*bounceSmooth((ox+w-2-px)/16);
   const low=bounceSmooth((py-558)/28),lace=side===0?bounceSmooth((388-px)/20):bounceSmooth((px-439)/22);
   const broader=Math.min(edge,hollyOuterWeight(side,px,py))*(1-cover)*cropGuard*(1-low*(1-lace));
   hollyMaskPixels[i+side]=Math.round(.25*hollyMaskPixels[i+side]+.75*255*broader);
  }
  // Blue remains byte-identical: Strong Fabric B's shared garment support.
 }
};
const bounceNativeVelocity=hollyVelocity;
hollyVelocity=function(x,y,side){
 if(!bounceExperiment)return bounceNativeVelocity(x,y,side);
 const upper=nodes[side*3],center=nodes[side*3+1],lower=nodes[side*3+2],f=followers[side];
 let dx=.18*upper.dx+.64*center.dx+.18*lower.dx+f.dx*.35;
 let dy=.18*upper.dy+.64*center.dy+.18*lower.dy+f.dy*.50;
 const roll=clamp((lower.dx-upper.dx)*.0014,-.018,.018),shape=clamp((lower.dy-upper.dy)*.00065,-.010,.010);
 const lx=x-center.x,ly=y-center.y;dx+=-ly*roll+lx*shape;dy+=lx*roll-ly*shape;
 const p=impacts[side],hx=x-p.x*W,hy=y-p.y*H,fall=Math.exp(-2.6*((hx/74)**2+(hy/66)**2));
 const pressure=fall*(p.v*.035-p.contact*.045);dx+=hx*pressure;dy+=hy*pressure;
 const length=Math.hypot(dx,dy),gain=length>16?(16+8*(1-Math.exp(-(length-16)/8)))/length:1;
 return [dx*gain*HOLLY_JIGGLE_GAIN,dy*gain*HOLLY_JIGGLE_GAIN];
};
function bouncePointer({type,id,x,y,pressure}){
 const rect=canvas.getBoundingClientRect();
 const event=new PointerEvent(type,{pointerId:id,pointerType:'touch',clientX:rect.left+ox+x/W*drawW,clientY:rect.top+oy+y/H*drawH,pressure:pressure||.5,bubbles:true,cancelable:true});
 Object.defineProperty(event,'bounceForwarded',{value:true});canvas.dispatchEvent(event);
}
for(const type of ['pointerdown','pointermove','pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,e=>{
 if(e.bounceForwarded)return;e.preventDefault();e.stopImmediatePropagation();
 if(type==='pointerdown'){if(e.pointerType==='mouse'&&e.button!==0)return;try{canvas.setPointerCapture(e.pointerId)}catch{}}
 const p=readPoint(e);parent.__hollyRelay?.({type:type==='lostpointercapture'?'pointercancel':type,id:e.pointerId,x:p.x,y:p.y,pressure:e.pressure});
},{capture:true,passive:false});
function bounceReset(){
 reset();let seed=8147;motion.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
 motion.time=0;motion.quietUntil=0;motion.autoDrive=null;
}
window.__hollyFrame={
 ready:()=>!!img&&loader.classList.contains('hiding'),tick:dt=>{motion.tick(dt);step(dt)},
 draw:()=>{if(stage.clientWidth&&stage.clientHeight)render()},pointer:bouncePointer,reset:bounceReset,auto:v=>motion.setAuto(v),
 bounce:()=>{motion.interrupt();bounceBoth()},
 preset:value=>{activePreset=value;Object.assign(model,currentPresets()[value]);refreshPrefs();bounceReset()},
 closeup:value=>{bounceClose=value;needSize=true},resize:()=>{needSize=true},
 cancel:()=>{for(const p of [...pointers.values()])bouncePointer({type:'pointercancel',id:p.id,x:p.last.x,y:p.last.y})},
 snapshot:()=>({...__peachPhysicsDebug.snapshot(),experiment:bounceExperiment}),raw:()=>JSON.parse(JSON.stringify({nodes,followers,impacts,waves})),
 pixels:()=>{render();if(!gl)return ctx2.getImageData(0,0,canvas.width,canvas.height).data;const a=new Uint8Array(canvas.width*canvas.height*4);gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,a);return a},
 masks:()=>({original:bounceOriginalMask,active:hollyMaskPixels,crop:HOLLY_CROP}),
 pose:(dx,dy,side)=>{bounceReset();motion.setAuto(false);for(const n of nodes)if(side===undefined||n.side===side){n.dx=dx;n.dy=dy}},
 error:()=>gl?gl.getError():0
};
bounceReset();motion.setAuto(true);
