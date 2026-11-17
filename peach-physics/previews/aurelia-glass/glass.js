// Rendering-only glass experiment. The solver and original photograph stay intact.
const glassMode=window.name==='glass',glassPressure=[.58,.58];
const glassCenters=[[265,901],[515,909]],glassRadii=[[112,99],[94,94]];
let glassCanvas,glassGL,glassCtx,glassReadCanvas,glassReadCtx,glassRenderer='none';
let glassProgram,glassFrameTexture,glassMaskTexture,glassOverlay;
const glassMask=new Uint8Array(528*256*4);
function glassWeight(side,x,y){return Math.min(aureliaSkinWeight(side,x,y),aureliaDragWeight(side,x,y))}
function glassSample(side,x,y){
 x-=112.5;y-=768.5;if(x<0||y<0||x>=527||y>=255)return 0;
 const ix=Math.floor(x),iy=Math.floor(y),tx=x-ix,ty=y-iy,i=(iy*528+ix)*4+side;
 return ((glassMask[i]*(1-tx)+glassMask[i+4]*tx)*(1-ty)+(glassMask[i+528*4]*(1-tx)+glassMask[i+528*4+4]*tx)*ty)/255;
}
function glassDisplacement(x,y){
 let dx=0,dy=0;
 for(let side=0;side<2;side++){
  const qx=(x-glassCenters[side][0])/glassRadii[side][0],qy=(y-glassCenters[side][1])/glassRadii[side][1];
  const w=glassSample(side,x,y)*Math.exp(-1.5*(qx*qx+qy*qy))*glassPressure[side];
  dx+=qx*24*w;dy-=qy*12*w;
 }
 return [dx,dy];
}
function glassSheen(x,y){
 let a=0;for(let side=0;side<2;side++){
  const qx=(x-glassCenters[side][0])/(side?66:78),qy=(y-glassCenters[side][1])/54;
  a+=.055*glassPressure[side]*glassSample(side,x,y)*Math.exp(-1.8*(qx*qx+qy*qy));
 }return a;
}
function glassStep(dt){
 for(let side=0;side<2;side++){
  const held=[...pointers.values()].some(p=>p.side===side);
  // Soft breathing pressure while Auto runs; a hold presses more firmly.
  const target=held?.94:.58+(motion.auto?.07*Math.sin(comparisonTime*2*Math.PI*.8):0);
  glassPressure[side]+=(target-glassPressure[side])*(1-Math.exp(-dt*7));
 }
}
function glassInit(){
  for(let y=0;y<256;y++)for(let x=0;x<528;x++){const i=(y*528+x)*4;glassMask[i]=Math.round(glassWeight(0,112+x+.5,768+y+.5)*255);glassMask[i+1]=Math.round(glassWeight(1,112+x+.5,768+y+.5)*255);glassMask[i+3]=255}

 glassCanvas=document.createElement('canvas');glassCanvas.id='glassCanvas';glassCanvas.setAttribute('aria-hidden','true');
 glassCanvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:2';stage.appendChild(glassCanvas);
 glassOverlay=document.createElement('div');glassOverlay.id='glassSurface';glassOverlay.setAttribute('aria-hidden','true');
 glassOverlay.style.cssText='position:absolute;inset:0;pointer-events:none;z-index:3;box-shadow:inset 1px 0 #d9f3ff30,inset -1px 0 #d9f3ff18;background:linear-gradient(111deg,transparent 25%,#dcefff03 33%,#e7f7ff16 33.5%,#def3ff06 35%,transparent 43%,transparent 78%,#e8f8ff0a 79%,transparent 80%)';stage.appendChild(glassOverlay);
 try{
  const g=glassCanvas.getContext('webgl',{alpha:true,antialias:false,preserveDrawingBuffer:true});if(!g)throw Error('Canvas fallback');glassGL=g;
  const compile=(type,source)=>{const s=g.createShader(type);g.shaderSource(s,source);g.compileShader(s);if(!g.getShaderParameter(s,g.COMPILE_STATUS))throw Error(g.getShaderInfoLog(s));return s};
  const vertex=compile(g.VERTEX_SHADER,'attribute vec2 pos;varying vec2 uv;void main(){uv=vec2((pos.x+1.)*.5,(1.-pos.y)*.5);gl_Position=vec4(pos,0.,1.);}');
  const fragment=compile(g.FRAGMENT_SHADER,`precision highp float;varying vec2 uv;
   uniform sampler2D frame;uniform sampler2D mask;uniform vec2 resolution;uniform vec4 framing;uniform vec2 pressure;
   vec2 weights(vec2 p){vec2 m=(p-vec2(112.,768.))/vec2(528.,256.);if(m.x<0.||m.y<0.||m.x>1.||m.y>1.)return vec2(0.);return texture2D(mask,m).rg;}
   vec2 field(vec2 p){vec2 l=(p-vec2(265.,901.))/vec2(112.,99.),r=(p-vec2(515.,909.))/vec2(94.,94.);vec2 w=weights(p)*pressure;
    return (l*exp(-1.5*dot(l,l))*w.x+r*exp(-1.5*dot(r,r))*w.y)*vec2(24.,-12.);}
   void main(){vec2 p=(uv*resolution-framing.xy)/framing.zw*vec2(756.,1280.),q=p;
    for(int i=0;i<6;i++)q-=field(q)/6.;
    vec2 sampleUV=(q/vec2(756.,1280.)*framing.zw+framing.xy)/resolution;
    vec4 color=texture2D(frame,sampleUV);vec2 w=weights(p)*pressure;
    vec2 l=(p-vec2(265.,901.))/vec2(78.,54.),r=(p-vec2(515.,909.))/vec2(66.,54.);
    float sheen=.055*(w.x*exp(-1.8*dot(l,l))+w.y*exp(-1.8*dot(r,r)));
    gl_FragColor=vec4(mix(color.rgb,vec3(.98,.97,.92),sheen),color.a);
   }`);
  glassProgram=g.createProgram();g.attachShader(glassProgram,vertex);g.attachShader(glassProgram,fragment);g.linkProgram(glassProgram);if(!g.getProgramParameter(glassProgram,g.LINK_STATUS))throw Error(g.getProgramInfoLog(glassProgram));g.useProgram(glassProgram);
  const buffer=g.createBuffer();g.bindBuffer(g.ARRAY_BUFFER,buffer);g.bufferData(g.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),g.STATIC_DRAW);const pos=g.getAttribLocation(glassProgram,'pos');g.enableVertexAttribArray(pos);g.vertexAttribPointer(pos,2,g.FLOAT,false,0,0);
  const textures=[];for(let i=0;i<2;i++){const t=g.createTexture();textures.push(t);g.activeTexture(g.TEXTURE0+i);g.bindTexture(g.TEXTURE_2D,t);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.LINEAR);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,g.LINEAR);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_S,g.CLAMP_TO_EDGE);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_WRAP_T,g.CLAMP_TO_EDGE);g.uniform1i(g.getUniformLocation(glassProgram,i?'mask':'frame'),i)}
  [glassFrameTexture,glassMaskTexture]=textures;g.texImage2D(g.TEXTURE_2D,0,g.RGBA,528,256,0,g.RGBA,g.UNSIGNED_BYTE,glassMask);glassRenderer='webgl';
 }catch(error){
  // Replace the element if a WebGL context was allocated before a shader failure.
  if(glassGL){const next=glassCanvas.cloneNode();glassCanvas.replaceWith(next);glassCanvas=next;glassGL=null}
  glassCtx=glassCanvas.getContext('2d',{alpha:true});glassReadCanvas=document.createElement('canvas');glassReadCtx=glassReadCanvas.getContext('2d',{willReadFrequently:true});glassRenderer='canvas';
 }
}
function glassDraw(){
 if(!glassCanvas)glassInit();
 if(glassCanvas.width!==canvas.width||glassCanvas.height!==canvas.height){glassCanvas.width=canvas.width;glassCanvas.height=canvas.height}
 if(!canvas.width||!canvas.height)return;
 const sc=canvas.width/cssW;
 if(glassGL){const g=glassGL;g.useProgram(glassProgram);g.viewport(0,0,canvas.width,canvas.height);g.activeTexture(g.TEXTURE0);g.bindTexture(g.TEXTURE_2D,glassFrameTexture);g.texImage2D(g.TEXTURE_2D,0,g.RGBA,g.RGBA,g.UNSIGNED_BYTE,canvas);g.uniform2f(g.getUniformLocation(glassProgram,'resolution'),canvas.width,canvas.height);g.uniform4f(g.getUniformLocation(glassProgram,'framing'),ox*sc,oy*sc,drawW*sc,drawH*sc);g.uniform2fv(g.getUniformLocation(glassProgram,'pressure'),glassPressure);g.drawArrays(g.TRIANGLE_STRIP,0,4);return}
 glassCtx.clearRect(0,0,canvas.width,canvas.height);glassCtx.drawImage(canvas,0,0);
 if(glassReadCanvas.width!==canvas.width||glassReadCanvas.height!==canvas.height){glassReadCanvas.width=canvas.width;glassReadCanvas.height=canvas.height}
 glassReadCtx.clearRect(0,0,canvas.width,canvas.height);glassReadCtx.drawImage(canvas,0,0);
 const x0=Math.max(0,Math.floor((ox+112/W*drawW)*sc)),y0=Math.max(0,Math.floor((oy+768/H*drawH)*sc));
 const x1=Math.min(canvas.width,Math.ceil((ox+640/W*drawW)*sc)),y1=Math.min(canvas.height,Math.ceil((oy+1024/H*drawH)*sc));
 if(x1<=x0||y1<=y0)return;
 const source=glassReadCtx.getImageData(0,0,canvas.width,canvas.height),patch=glassCtx.createImageData(x1-x0,y1-y0),width=canvas.width;
 for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){
  const px=((x+.5)/sc-ox)/drawW*W,py=((y+.5)/sc-oy)/drawH*H;let qx=px,qy=py;
  for(let i=0;i<6;i++){const [dx,dy]=glassDisplacement(qx,qy);qx-=dx/6;qy-=dy/6}
  const sx=clamp((ox+qx/W*drawW)*sc-.5,0,canvas.width-2),sy=clamp((oy+qy/H*drawH)*sc-.5,0,canvas.height-2),ix=Math.floor(sx),iy=Math.floor(sy),tx=sx-ix,ty=sy-iy,at=(iy*width+ix)*4,to=((y-y0)*(x1-x0)+x-x0)*4,a=glassSheen(px,py);
  for(let k=0;k<4;k++){const value=(source.data[at+k]*(1-tx)+source.data[at+4+k]*tx)*(1-ty)+(source.data[at+width*4+k]*(1-tx)+source.data[at+width*4+4+k]*tx)*ty;patch.data[to+k]=k===3?value:value*(1-a)+[249.9,247.35,234.6][k]*a}
 }
 glassCtx.putImageData(patch,x0,y0);
}
