// Private preview closure. No production code or saved profile is modified.
const reliefExperiment=window.name==='relief';
let reliefClose=false,reliefBuffer=null,reliefLoc=null,reliefViewLoc=null,reliefMotionLoc=null;
let reliefView=[0,0];
const reliefSmooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t)};
// Approximate relief only: these silhouettes are authored from the unchanged
// photograph, not measured anatomy. Broad flat areas keep facial detail intact.
const reliefShapes=[
 {z:76,p:[[247,0],[426,0],[477,46],[498,95],[506,151],[530,163],[509,201],[485,226],[482,292],[499,344],[469,370],[307,368],[295,313],[281,268],[264,229],[235,201],[211,253],[193,244],[206,196],[211,125],[219,65]]},
 {z:94,p:[[201,358],[273,352],[329,367],[407,370],[479,355],[536,372],[568,409],[580,458],[577,532],[545,609],[519,696],[531,758],[576,802],[621,866],[605,916],[513,953],[393,954],[293,926],[223,891],[144,866],[169,811],[211,752],[248,707],[255,625],[236,556],[227,484],[215,434]]},
 {z:82,p:[[193,363],[228,379],[238,464],[227,551],[205,647],[178,752],[148,852],[140,937],[157,1004],[147,1071],[128,1058],[105,998],[93,951],[95,884],[116,782],[140,663],[151,565],[151,470],[165,398]]},
 {z:82,p:[[538,379],[568,392],[591,441],[592,532],[604,640],[625,757],[650,873],[663,942],[655,1006],[632,1055],[616,1065],[607,1043],[626,985],[623,923],[603,852],[569,747],[544,641],[537,546],[535,459]]},
 {z:90,p:[[160,859],[302,885],[393,951],[519,909],[599,868],[622,968],[608,1082],[582,1176],[581,1280],[188,1280],[174,1180],[148,1092],[130,979]]}
];
function reliefPolygon(poly,x,y){
 let inside=false,d=Infinity;
 for(let i=0,j=poly.length-1;i<poly.length;j=i++){
  const [ax,ay]=poly[j],[bx,by]=poly[i],dx=bx-ax,dy=by-ay;
  const t=clamp(((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy),0,1);
  d=Math.min(d,Math.hypot(x-ax-t*dx,y-ay-t*dy));
  if((ay>y)!==(by>y)&&x<(bx-ax)*(y-ay)/(by-ay)+ax)inside=!inside;
 }
 return reliefSmooth(-12,34,inside?d:-d);
}
function reliefDepth(x,y){
 let d=0;
 for(const shape of reliefShapes)d=Math.max(d,shape.z*reliefPolygon(shape.p,x,y));
 const bump=(cx,cy,rx,ry)=>Math.exp(-2*(((x-cx)/rx)**2+((y-cy)/ry)**2));
 const face=16*bump(399,238,75,95),chest=27*bump(323,474,80,74)+27*bump(495,477,77,75);
 return (d+(face+chest)*reliefSmooth(40,75,d))*reliefSmooth(0,24,x)*reliefSmooth(0,24,W-x)*reliefSmooth(0,24,y)*reliefSmooth(0,24,H-y);
}
function reliefInit(){
 reliefBuffer=gl.createBuffer();reliefLoc=gl.getAttribLocation(program,'aRelief');
 reliefViewLoc=gl.getUniformLocation(program,'uReliefView');reliefMotionLoc=gl.getUniformLocation(program,'uReliefMotion');
}
function reliefRefresh(){
 const nx=62,ny=112,data=new Float32Array((nx+1)*(ny+1)*3);let k=0;
 for(let iy=0;iy<=ny;iy++)for(let ix=0;ix<=nx;ix++){
  const x=(ix/nx*uvCover[0]+uvCover[2])*W,y=(iy/ny*uvCover[1]+uvCover[3])*H;
  data[k++]=reliefDepth(x,y);data[k++]=hollySkinWeight(0,x,y);data[k++]=hollySkinWeight(1,x,y);
 }
 gl.bindBuffer(gl.ARRAY_BUFFER,reliefBuffer);gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);
 gl.enableVertexAttribArray(reliefLoc);gl.vertexAttribPointer(reliefLoc,3,gl.FLOAT,false,0,0);
}
function reliefUniforms(){
 gl.uniform2fv(reliefViewLoc,reliefExperiment?reliefView:[0,0]);
 gl.uniform2f(reliefMotionLoc,clamp(nodes[1].dy*.2-impacts[0].contact*6,-10,8),clamp(nodes[4].dy*.2-impacts[1].contact*6,-10,8));
}
function reliefProject(x,y){
 const d=reliefDepth(x,y)+hollySkinWeight(0,x,y)*clamp(nodes[1].dy*.2-impacts[0].contact*6,-10,8)+hollySkinWeight(1,x,y)*clamp(nodes[4].dy*.2-impacts[1].contact*6,-10,8);
 return {x:x+(reliefExperiment&&!fallback?reliefView[0]*d:0),y:y+(reliefExperiment&&!fallback?reliefView[1]*d:0)};
}
function reliefRead(e){
 const p=readPoint(e),rawX=p.x,rawY=p.y;
 // The bounded relief has a monotone projection. Invert it for hit testing.
 for(let i=0;i<7;i++){const q=reliefProject(p.x,p.y);p.x+=rawX-q.x;p.y+=rawY-q.y;}
 return p;
}
function reliefPointer({type,id,x,y,pressure}){
 const rect=canvas.getBoundingClientRect();
 const event=new PointerEvent(type,{pointerId:id,pointerType:'touch',clientX:rect.left+ox+x/W*drawW,clientY:rect.top+oy+y/H*drawH,pressure:pressure||.5,bubbles:true,cancelable:true});
 Object.defineProperty(event,'reliefForwarded',{value:true});canvas.dispatchEvent(event);
}
const reliefGestures=new Map();
for(const type of ['pointerdown','pointermove','pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,e=>{
 if(e.reliefForwarded)return;
 e.preventDefault();e.stopImmediatePropagation();
 const p=reliefRead(e),kind=type==='lostpointercapture'?'pointercancel':type;
 if(kind==='pointerdown'){
  if(e.pointerType==='mouse'&&e.button!==0)return;
  try{canvas.setPointerCapture(e.pointerId)}catch{}
  reliefGestures.set(e.pointerId,pickSide(p.x,p.y)>=0?'touch':'view');
 }
 const mode=reliefGestures.get(e.pointerId);
 if(mode==='touch')parent.__hollyRelay?.({type:kind,id:e.pointerId,x:p.x,y:p.y,pressure:e.pressure});
 if(mode==='view')parent.__hollyLook?.({type:kind,id:e.pointerId,x:e.clientX,y:e.clientY});
 if(kind==='pointerup'||kind==='pointercancel')reliefGestures.delete(e.pointerId);
},{capture:true,passive:false});
function reliefReset(){
 reset();let seed=8147;motion.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
 motion.time=0;motion.quietUntil=0;motion.autoDrive=null;
}
window.__hollyFrame={
 ready:()=>!!img&&loader.classList.contains('hiding'),
 tick:dt=>{motion.tick(dt);step(dt)},draw:()=>{if(stage.clientWidth&&stage.clientHeight)render()},
 pointer:reliefPointer,reset:reliefReset,auto:v=>motion.setAuto(v),
 bounce:()=>{motion.interrupt();bounceBoth()},
 preset:value=>{activePreset=value;Object.assign(model,currentPresets()[value]);refreshPrefs();reliefReset()},
 view:(x,y)=>{reliefView=[clamp(x,-.12,.12),clamp(y,-.075,.075)]},
 closeup:value=>{reliefClose=value;needSize=true},resize:()=>{needSize=true},
 cancel:()=>{for(const p of [...pointers.values()])reliefPointer({type:'pointercancel',id:p.id,x:p.last.x,y:p.last.y});reliefGestures.clear()},
 snapshot:()=>({...__peachPhysicsDebug.snapshot(),relief:reliefExperiment,view:[...reliefView]}),
 raw:()=>JSON.parse(JSON.stringify({nodes,followers,impacts,waves})),
 project:reliefProject,depth:reliefDepth,
 pixels:()=>{render();if(!gl)return ctx2.getImageData(0,0,canvas.width,canvas.height).data;const a=new Uint8Array(canvas.width*canvas.height*4);gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,a);return a},
 error:()=>gl?gl.getError():0
};
reliefReset();motion.setAuto(true);
