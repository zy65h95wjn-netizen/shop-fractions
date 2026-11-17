const aureliaMotionGain = comparisonExperiment ? 1.25 : 1;
// Normalized silhouette points traced on each original portrait. Depth feathers
// across the outline and goes to zero at the photo edges.
const outlines = {
 ember: [[.09,.99],[.09,.87],[.07,.73],[.08,.60],[.12,.54],[.12,.43],[.14,.29],[.18,.18],[.16,.07],[.25,0],[.66,0],[.72,.08],[.78,.15],[.81,.25],[.91,.33],[.90,.39],[.84,.42],[.90,.57],[.97,.65],[.90,.74],[.83,.83],[.79,.99]],
 midnight: [[.18,1],[.18,.88],[.13,.77],[.14,.69],[.20,.60],[.32,.53],[.23,.49],[.22,.38],[.18,.29],[.23,.14],[.32,.06],[.51,.02],[.64,.04],[.72,.11],[.74,.22],[.78,.31],[.84,.38],[.80,.46],[.77,.56],[.83,.63],[.84,.77],[.76,.90],[.71,1]],
 aurelia: [[.22,1],[.17,.90],[.14,.78],[.16,.68],[.23,.60],[.18,.62],[.18,.51],[.23,.42],[.18,.39],[.18,.34],[.26,.32],[.28,.24],[.33,.16],[.35,.07],[.40,.02],[.60,0],[.74,.05],[.80,.15],[.84,.24],[.78,.28],[.76,.37],[.81,.40],[.78,.45],[.77,.57],[.74,.61],[.82,.68],[.85,.81],[.79,.94],[.75,1]]
};
let depthBuffer, depthAttribute, viewUniform, viewX=0, viewY=0;
const outline = (outlines[selection] || []).map(([u,v])=>[u*W,v*H]);
function depthAt(x,y) {
 if (isHolly()) return reliefDepth(x,y)/W;
 const edge = reliefSmooth(0,32,Math.min(x,W-x,y,H-y));
 let bulge=0;
 for (const region of regions) {
  const radius=((x-region.x)/region.rx)**2+((y-region.y)/region.ry)**2;
  bulge+=.024*Math.exp(-2*radius);
 }
 return edge*reliefPolygon(outline,x,y)*(.094+bulge);
}
function uploadDepth() {
 const data=new Float32Array(63*113);
 for(let y=0;y<=112;y++)for(let x=0;x<=62;x++){
  data[y*63+x]=depthAt((x/62*uvCover[0]+uvCover[2])*W,(y/112*uvCover[1]+uvCover[3])*H);
 }
 gl.bindBuffer(gl.ARRAY_BUFFER,depthBuffer);
 gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);
 gl.enableVertexAttribArray(depthAttribute);
 gl.vertexAttribPointer(depthAttribute,1,gl.FLOAT,false,0,0);
}
function pointer(data) {
 const {type,id,x,y}=data,rect=canvas.getBoundingClientRect();
 const held=pointers.get(id),release=held?.grabbed,side=held?.side;
 const e=new PointerEvent(type,{pointerId:id,pointerType:'touch',clientX:rect.left+ox+x/W*drawW,clientY:rect.top+oy+y/H*drawH,bubbles:true,cancelable:true});
 Object.defineProperty(e,'relayed',{value:true});
 canvas.dispatchEvent(e);
 if(comparisonExperiment && type==='pointerup' && release) comparisonReleased[side]=comparisonTime;
}
for(const type of ['pointerdown','pointermove','pointerup','pointercancel','lostpointercapture']){
 canvas.addEventListener(type,e=>{
  if(e.relayed)return;
  e.preventDefault();e.stopImmediatePropagation();
  if(type==='pointerdown'){try{canvas.setPointerCapture(e.pointerId)}catch{}}
  if(needSize)resize();
  const p=readPoint(e);
  let x=p.x,y=p.y;
  if(!fallback)for(let i=0;i<6;i++){const d=depthAt(x,y)*W;x=p.x-viewX*d;y=p.y-viewY*d}
  parent.relay({type:type==='lostpointercapture'?'pointercancel':type,id:e.pointerId,x,y});
 },{capture:true,passive:false});
}
function exercise(kind) {
 const c=currentCharacter();
 if(kind==='bounce'){bounceBoth();comparisonPulse(0,1);comparisonPulse(1,.88);return}
 const [x,y]=c.impactCenters[0];
 if(selection==='ember'){impulse(0,x,y,1,520,-430,true);return}
 if(selection==='midnight'){slap(0,x,y,{sx:0,sy:0});return}
 if(selection==='aurelia'){motion.setAuto(true);return}
 impulse(0,x,y,1.2);
}
window.study={
 revision:7,
 ready:()=>!!img&&loader.classList.contains('hiding'),
 view:(x,y)=>{viewX=x;viewY=y},
 draw:()=>{if(needSize)resize();render()},
 reset:()=>{comparisonReset();motion.lastCharacter=selection;motion.setAuto(false)},
 configure:()=>{Object.assign(model,currentPresets().playful);activePreset='playful';refreshPrefs()},
 tick:comparisonTick,exercise,pointer,
 auto:value=>motion.setAuto(value),
 close:value=>{bounceClose=value;needSize=true},
 resize:()=>{needSize=true},
 cancel:()=>{for(const p of [...pointers.values()])pointer({type:'pointercancel',id:p.id,x:p.last.x,y:p.last.y})},
 snapshot:()=>__peachPhysicsDebug.snapshot()
};
