/* Holly layered feasibility renderer. Source photograph is read-only.
 * A moving material matte is NOT a displacement envelope. The latter extends
 * beyond the silhouette. Missing backing pixels are explicitly marked.
 * No spring integration, gesture processing or gain changes live in this file.
 */
'use strict';
(() => {
 const W=720,H=1280,BOX=[160,352,496,336],G=4,NX=BOX[2]/G+1,NY=BOX[3]/G+1;
 const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
 const smooth=x=>{x=clamp(x);return x*x*x*(x*(x*6-15)+10);};
 // y,x coordinates, traced on the original JPEG. These are material ownership,
 // not pinned borders. The upper hair is a separate, stationary foreground.
 const EDGES=[
  [[352,347],[380,326],[400,304],[420,277],[440,252],[456,236],[470,216],[488,208],[506,210],[526,219],[546,223],[566,229],[586,236],[606,250],[622,261],[638,281],[656,298],[688,315]],
  [[352,479],[380,500],[400,515],[420,530],[440,549],[460,565],[476,577],[488,599],[505,605],[520,607],[535,603],[550,592],[570,584],[590,573],[610,551],[628,519],[650,477],[688,460]]
 ];
 function edge(side,y){const p=EDGES[side];let i=0;while(i<p.length-2&&y>p[i+1][0])i++;return p[i][1]+clamp((y-p[i][0])/(p[i+1][0]-p[i][0]))*(p[i+1][1]-p[i][1]);}
 function alpha(side,x,y){
  const e=edge(side,y),outer=smooth(((side?e-x:x-e)+.8)/1.6);
  const middle=side?smooth((x-413)/2):1-smooth((x-413)/2);
  return outer*middle*smooth((y-355)/12)*(1-smooth((y-650)/16));
 }
 function support(side,x,y){
  // C2 continuous anatomical/garment attachments; NO outer-edge attenuation.
  const top=smooth((y-374)/72),bottom=1-smooth((y-550)/108);
  const center=side?smooth((x-414)/42):smooth((414-x)/42);
  return top*bottom*center;
 }
 function canvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
 // All CPU sampling and WebGL sampling use pixel centers, not pixel corners.
 function sample(a,w,h,x,y,k,stride=4){
  x=clamp(x-.5,0,w-1.001);y=clamp(y-.5,0,h-1.001);
  const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,i=(iy*w+ix)*stride+k;
  return (a[i]*(1-fx)+a[i+stride]*fx)*(1-fy)+(a[i+w*stride]*(1-fx)+a[i+w*stride+stride]*fx)*fy;
 }
 class HollyLayers {
  constructor(original,getState,params){
   this.original=original;this.getState=getState;this.params=params;this.ready=false;this.error=null;
   this.canvas=canvas(1,1);this.canvas.id='hollyLayers';
   this.canvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:1;display:none';
   original.after(this.canvas);
   this.fields=[new Float32Array(NX*NY*2),new Float32Array(NX*NY*2)];
   this.velocityGrid=new Float32Array(NX*NY*2);this.packed=new Uint8Array(NX*NY*4);
   this.photo=new Image();this.photo.onload=()=>{try{this.prepare();this.ready=true;}catch(e){this.error=e.message;console.error(e);}};
   this.photo.onerror=()=>{this.error='Original portrait could not be loaded';};
   this.photo.src='../../v8/assets/holly-heartbreaker.jpg';
  }
  prepare(){
   const c=canvas(W,H),ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(this.photo,0,0);
   this.source=ctx.getImageData(0,0,W,H).data;
   this.matte=new Uint8Array(BOX[2]*BOX[3]*4);
   for(let y=0;y<BOX[3];y++)for(let x=0;x<BOX[2];x++){
    const px=x+BOX[0]+.5,py=y+BOX[1]+.5,i=(y*BOX[2]+x)*4;
    for(let side=0;side<2;side++)this.matte[i+side]=Math.round(255*alpha(side,px,py));
    // Hair in front of upper skin is held over the moving layers. Fur below
    // it can pass in FRONT of the arms and loose hair, changing occlusion only.
    this.matte[i+2]=Math.round(255*(1-Math.max(alpha(0,px,py),alpha(1,px,py)))*(1-smooth((py-451)/20)));
    this.matte[i+3]=255;
   }
   this.gl=this.params.get('backend')==='canvas'?null:this.canvas.getContext('webgl',{alpha:true,premultipliedAlpha:false,preserveDrawingBuffer:true,antialias:false});
   if(this.gl){this.backend='webgl';this.initGL();}else{this.backend='canvas';this.ctx=this.canvas.getContext('2d');}
   this.canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.ready=false;this.error='Layered WebGL context lost; reload or choose Canvas';this.hide();});
   this.canvas.addEventListener('webglcontextrestored',()=>{try{this.initGL();this.lastKey=null;this.error=null;this.ready=true;}catch(e){this.error=e.message;}});
  }
  hide(){this.canvas.style.display='none';this.original.style.opacity='';}
  updateFields(velocity){
   let max=0;
   for(let side=0;side<2;side++){
    const v=this.velocityGrid,f=this.fields[side];
    for(let j=0;j<NY;j++)for(let i=0;i<NX;i++){
     const x=BOX[0]+i*G,y=BOX[1]+j*G,a=support(side,x,y),d=velocity(x,y,side),at=(j*NX+i)*2;
     v[at]=d[0]*a;v[at+1]=d[1]*a;max=Math.max(max,Math.hypot(v[at],v[at+1]));
    }
    // Integrate the SAME smooth field on both backends. Midpoint flow keeps a
    // continuous silhouette, avoiding direct translation and folded triangles.
    for(let j=0;j<NY;j++)for(let i=0;i<NX;i++){
     const x=BOX[0]+i*G,y=BOX[1]+j*G;let sx=x,sy=y;
     for(let k=0;k<8;k++){
      const gx=(sx-BOX[0])/G+.5,gy=(sy-BOX[1])/G+.5;
      const vx=sample(v,NX,NY,gx,gy,0,2),vy=sample(v,NX,NY,gx,gy,1,2);
      const mx=(sx-vx/16-BOX[0])/G+.5,my=(sy-vy/16-BOX[1])/G+.5;
      sx-=sample(v,NX,NY,mx,my,0,2)/8;sy-=sample(v,NX,NY,mx,my,1,2)/8;
     }
     const at=(j*NX+i)*2;f[at]=sx-x;f[at+1]=sy-y;
    }
   }
   this.maxVelocity=max;
  }
  map(side,x,y){const f=this.fields[side],gx=(x-BOX[0])/G+.5,gy=(y-BOX[1])/G+.5;return [x+sample(f,NX,NY,gx,gy,0,2),y+sample(f,NX,NY,gx,gy,1,2)];}
  metrics(){
   let minDet=Infinity,maxTravel=0,maxStretch=0,minStretch=Infinity;
   for(const f of this.fields)for(let y=1;y<NY-1;y++)for(let x=1;x<NX-1;x++){
    const i=(y*NX+x)*2,a=1+(f[i+2]-f[i-2])/(2*G),b=(f[i+NX*2]-f[i-NX*2])/(2*G),c=(f[i+3]-f[i-1])/(2*G),d=1+(f[i+NX*2+1]-f[i-NX*2+1])/(2*G);
    const det=a*d-b*c,tr=a*a+b*b+c*c+d*d,disc=Math.sqrt(Math.max(0,tr*tr-4*det*det));
    minDet=Math.min(minDet,det);maxTravel=Math.max(maxTravel,Math.hypot(f[i],f[i+1]));
    minStretch=Math.min(minStretch,Math.sqrt((tr-disc)/2));maxStretch=Math.max(maxStretch,Math.sqrt((tr+disc)/2));
   }
   return {minDet,maxTravel,minStretch,maxStretch,backend:this.backend,frameMs:this.lastMs,missingBacking:true};
  }
  render(){
   const start=Date.now(),s=this.getState();this.canvas.style.display='block';this.original.style.opacity='0';
   this.canvas.style.maskImage=this.original.style.maskImage;this.canvas.style.webkitMaskImage=this.original.style.webkitMaskImage;
   const resized=this.canvas.width!==this.original.width||this.canvas.height!==this.original.height;
   if(resized){this.canvas.width=this.original.width;this.canvas.height=this.original.height;this.base=null;}
   if(s.key===this.lastKey&&!resized)return;
   this.updateFields(s.velocity);this.lastKey=s.key;
   if(this.gl)this.renderGL(s);else this.renderCanvas(s);
   this.lastMs=Date.now()-start;
  }
  initGL(){
   const gl=this.gl;
   const compile=(type,src)=>{const shader=gl.createShader(type);gl.shaderSource(shader,src);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(shader));return shader;};
   const vs=`precision highp float;attribute vec2 p;varying vec2 photoUV;uniform vec4 frame;void main(){photoUV=p*frame.xy+frame.zw;gl_Position=vec4(p.x*2.-1.,1.-p.y*2.,0.,1.);}`;
   const fs=`precision highp float;
    varying vec2 photoUV;uniform sampler2D photo,matte,leftField,rightField;uniform float diagnostic;
    vec2 muv(vec2 p){return (p-vec2(160.,352.))/vec2(496.,336.);}
    vec2 flow(sampler2D f,vec2 p){vec4 v=texture2D(f,((p-vec2(160.,352.))/4.+.5)/vec2(125.,85.));return (vec2(v.r*65280.+v.g*255.,v.b*65280.+v.a*255.)-32768.)/1024.;}
    void main(){
     if(photoUV.x<0.||photoUV.x>1.||photoUV.y<0.||photoUV.y>1.)discard;
     vec2 uv=photoUV*vec2(720.,1280.);
     vec4 base=texture2D(photo,photoUV);
     if(uv.x<160.||uv.x>656.||uv.y<352.||uv.y>688.){gl_FragColor=base;return;}
     vec3 m=texture2D(matte,muv(uv)).rgb;
     vec2 dl=flow(leftField,uv),dr=flow(rightField,uv),sl=uv+dl,sr=uv+dr;
     if(dot(dl,dl)+dot(dr,dr)<.0000001&&diagnostic<.5){gl_FragColor=base;return;}
     float al=texture2D(matte,muv(sl)).r,ar=texture2D(matte,muv(sr)).g;
     float a=al+ar,old=m.r+m.g,reveal=max(0.,old-a);
     // A bright diagnostic is intentionally NOT a reconstruction or a success.
     float stripe=step(.5,fract((uv.x+uv.y)/10.));
     vec3 missing=mix(vec3(.30,.02,.18),vec3(1.,.18,.60),stripe);
     vec3 color=base.rgb*(1.-min(1.,a+reveal))+texture2D(photo,sl/vec2(720.,1280.)).rgb*al+texture2D(photo,sr/vec2(720.,1280.)).rgb*ar+missing*reveal;
     color=mix(color,base.rgb,m.b);
     if(diagnostic>0.5){
      vec2 d=length(dl)>length(dr)?dl:dr;
      float grid=max(1.-step(1.,mod(sl.x,12.)),1.-step(1.,mod(sl.y,12.)));
      color=mix(base.rgb,vec3(.1+abs(d.x)/28.,.25+length(d)/32.,.8),.6)*mix(1.,.3,grid);
      color=mix(color,missing,reveal);
     }
     gl_FragColor=vec4(clamp(color,0.,1.),1.);
    }`;
   const p=gl.createProgram();gl.attachShader(p,compile(gl.VERTEX_SHADER,vs));gl.attachShader(p,compile(gl.FRAGMENT_SHADER,fs));gl.linkProgram(p);
   if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));this.program=p;gl.useProgram(p);
   // Match the release rasterization at rest, including its normalized UV mesh.
   const verts=new Float32Array(63*113*2),indices=new Uint16Array(62*112*6);let vi=0,ii=0;
   for(let y=0;y<=112;y++)for(let x=0;x<=62;x++){verts[vi++]=x/62;verts[vi++]=y/112;}
   for(let y=0;y<112;y++)for(let x=0;x<62;x++){const a=y*63+x,b=a+1,c=a+63,d=c+1;for(const n of [a,b,c,b,d,c])indices[ii++]=n;}
   this.meshCount=indices.length;
   const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,verts,gl.STATIC_DRAW);
   const ib=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,indices,gl.STATIC_DRAW);
   const loc=gl.getAttribLocation(p,'p');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
   this.textures=[];
   for(const [unit,name] of ['photo','matte','leftField','rightField'].entries()){
    const t=gl.createTexture();this.textures.push(t);gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,t);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    if(unit===0)gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,this.photo);
    else gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,unit===1?BOX[2]:NX,unit===1?BOX[3]:NY,0,gl.RGBA,gl.UNSIGNED_BYTE,unit===1?this.matte:null);
    gl.uniform1i(gl.getUniformLocation(p,name),unit);
   }
  }
  renderGL(s){
   const gl=this.gl;gl.viewport(0,0,this.canvas.width,this.canvas.height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.useProgram(this.program);
   gl.uniform4f(gl.getUniformLocation(this.program,'frame'),s.cssW/s.drawW,s.cssH/s.drawH,-s.ox/s.drawW,-s.oy/s.drawH);
   gl.uniform1f(gl.getUniformLocation(this.program,'diagnostic'),this.params.get('view')==='field'?1:0);
   for(let side=0;side<2;side++){
    const f=this.fields[side];for(let i=0;i<f.length/2;i++)for(let k=0;k<2;k++){const n=Math.round(clamp(f[i*2+k]*1024+32768,0,65535));this.packed[i*4+k*2]=n>>8;this.packed[i*4+k*2+1]=n&255;}
    gl.activeTexture(gl.TEXTURE2+side);gl.bindTexture(gl.TEXTURE_2D,this.textures[side+2]);gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,NX,NY,gl.RGBA,gl.UNSIGNED_BYTE,this.packed);
   }
   gl.drawElements(gl.TRIANGLES,this.meshCount,gl.UNSIGNED_SHORT,0);
  }
  renderCanvas(s){
   const ctx=this.ctx,dpr=this.canvas.width/s.cssW,scale=s.drawW/W*dpr,offx=s.ox*dpr,offy=s.oy*dpr;
   if(!this.base){const c=canvas(this.canvas.width,this.canvas.height),b=c.getContext('2d');b.drawImage(this.photo,offx,offy,s.drawW*dpr,s.drawH*dpr);this.base=c;this.basePixels=b.getImageData(0,0,c.width,c.height).data;}
   ctx.clearRect(0,0,this.canvas.width,this.canvas.height);ctx.drawImage(this.base,0,0);
   if(this.maxVelocity===0)return;
   const x0=Math.max(0,Math.floor(offx+BOX[0]*scale)),y0=Math.max(0,Math.floor(offy+BOX[1]*scale));
   const w=Math.min(this.canvas.width-x0,Math.ceil(BOX[2]*scale)+2),h=Math.min(this.canvas.height-y0,Math.ceil(BOX[3]*scale)+2),frame=ctx.createImageData(w,h),a=frame.data;
   for(let j=0;j<h;j++)for(let i=0;i<w;i++){
    const x=(x0+i+.5-offx)/scale,y=(y0+j+.5-offy)/scale,at=(j*w+i)*4,baseAt=((y0+j)*this.canvas.width+x0+i)*4;
    const [lx,ly]=this.map(0,x,y),[rx,ry]=this.map(1,x,y);
    const al=sample(this.matte,BOX[2],BOX[3],lx-BOX[0],ly-BOX[1],0)/255,ar=sample(this.matte,BOX[2],BOX[3],rx-BOX[0],ry-BOX[1],1)/255;
    const old=(sample(this.matte,BOX[2],BOX[3],x-BOX[0],y-BOX[1],0)+sample(this.matte,BOX[2],BOX[3],x-BOX[0],y-BOX[1],1))/255;
    const fg=sample(this.matte,BOX[2],BOX[3],x-BOX[0],y-BOX[1],2)/255,reveal=Math.max(0,old-al-ar),stripe=((x+y)/10)%1>=.5,missing=stripe?[255,45.9,153]:[76.5,5.1,45.9];
    for(let k=0;k<3;k++){
     const base=this.basePixels[baseAt+k];
     // Delta against the same unwarped bilinear source avoids a sampling seam
     // where a tiny nonzero motion meets the browser's cached static photo.
     const original=sample(this.source,W,H,x,y,k),left=sample(this.source,W,H,lx,ly,k),right=sample(this.source,W,H,rx,ry,k);
     const color=base+(left-original)*al+(right-original)*ar+(missing[k]-original)*reveal;
     a[at+k]=color*(1-fg)+base*fg;
    }
    a[at+3]=255;
   }
   ctx.putImageData(frame,x0,y0);
  }
 }
 HollyLayers.geometry={box:BOX,edges:EDGES,alpha,support};window.HollyLayers=HollyLayers;
})();
