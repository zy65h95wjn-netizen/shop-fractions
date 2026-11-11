/* Source-layer repair only. The baseline class owns the unchanged flow map. */
'use strict';
(() => {
 const Baseline=window.HollyLayers;
 const W=720,H=1280,BOX=[160,352,496,336];
 const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
 function sample(data,x,y,k){
  x=clamp(x-BOX[0]-.5,0,BOX[2]-1.001);y=clamp(y-BOX[1]-.5,0,BOX[3]-1.001);
  const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,at=(iy*BOX[2]+ix)*4+k;
  return (data[at]*(1-fx)+data[at+4]*fx)*(1-fy)+(data[at+BOX[2]*4]*(1-fx)+data[at+BOX[2]*4+4]*fx)*fy;
 }
 const assetNames=['ownership.png','backing-composite.png','material-0-premult.png','material-1-premult.png'];
 class ReconstructedHolly extends Baseline {
  constructor(original,state,params){
   super(original,state,params);this.assets={};
   // The constructor's image load is asynchronous; override before it fires.
   this.photo.onload=async()=>{
    try{
     for(const name of assetNames){
      const image=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(Error('Missing reconstruction asset: '+name));i.src='reconstruction/assets/'+name;});
      const c=document.createElement('canvas');c.width=BOX[2];c.height=BOX[3];const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);
      this.assets[name]=ctx.getImageData(0,0,c.width,c.height).data;
     }
     this.prepare();this.ready=true;
    }catch(e){this.error=e.message;console.error(e);}
   };
  }
  initGL(){
   super.initGL();const gl=this.gl,oldProgram=this.program;
   const vertex=gl.getAttachedShaders(oldProgram).find(s=>gl.getShaderParameter(s,gl.SHADER_TYPE)===gl.VERTEX_SHADER);
   const fragment=gl.createShader(gl.FRAGMENT_SHADER);
   gl.shaderSource(fragment,`precision highp float;
    varying vec2 photoUV;
    uniform sampler2D photo,matte,leftField,rightField,backing,leftMaterial,rightMaterial;
    uniform float diagnostic;
    vec2 muv(vec2 p){return (p-vec2(160.,352.))/vec2(496.,336.);}
    vec2 flow(sampler2D f,vec2 p){vec4 v=texture2D(f,((p-vec2(160.,352.))/4.+.5)/vec2(125.,85.));return (vec2(v.r*65280.+v.g*255.,v.b*65280.+v.a*255.)-32768.)/1024.;}
    void main(){
     if(photoUV.x<0.||photoUV.x>1.||photoUV.y<0.||photoUV.y>1.)discard;
     vec4 original=texture2D(photo,photoUV);vec2 p=photoUV*vec2(720.,1280.);
     if(p.x<160.||p.x>656.||p.y<352.||p.y>688.){gl_FragColor=original;return;}
     vec2 dl=flow(leftField,p),dr=flow(rightField,p);
     if(dot(dl,dl)+dot(dr,dr)<.0000001){gl_FragColor=original;return;}
     vec4 ml0=texture2D(leftMaterial,muv(p)),mr0=texture2D(rightMaterial,muv(p));
     vec4 ml=texture2D(leftMaterial,muv(p+dl)),mr=texture2D(rightMaterial,muv(p+dr));
     vec3 plate=texture2D(backing,muv(p)).rgb;
     float foreground=texture2D(matte,muv(p)).b;
     // A rest-reference difference preserves the exact original composition.
     // Any residual matte error remains visible in motion; it is NOT acceptance.
     vec3 delta=ml.rgb+mr.rgb-ml0.rgb-mr0.rgb+plate*(ml0.a+mr0.a-ml.a-mr.a);
     vec3 color=original.rgb+delta*(1.-foreground);
     if(diagnostic>.5){float reveal=max(0.,ml0.a+mr0.a-ml.a-mr.a)*(1.-foreground);color=mix(color,vec3(1.,.1,.6),reveal);}
     gl_FragColor=vec4(clamp(color,0.,1.),original.a);
    }`);
   gl.compileShader(fragment);if(!gl.getShaderParameter(fragment,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(fragment));
   const p=gl.createProgram();gl.attachShader(p,vertex);gl.attachShader(p,fragment);gl.bindAttribLocation(p,gl.getAttribLocation(oldProgram,'p'),'p');gl.linkProgram(p);
   if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));
   gl.useProgram(p);this.program=p;
   for(const [unit,name] of ['photo','matte','leftField','rightField','backing','leftMaterial','rightMaterial'].entries())gl.uniform1i(gl.getUniformLocation(p,name),unit);
   for(const [unit,name] of [[1,'ownership.png'],[4,'backing-composite.png'],[5,'material-0-premult.png'],[6,'material-1-premult.png']]){
    gl.activeTexture(gl.TEXTURE0+unit);
    if(unit>3)this.textures[unit]=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,this.textures[unit]);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,BOX[2],BOX[3],0,gl.RGBA,gl.UNSIGNED_BYTE,this.assets[name]);
   }
   gl.deleteProgram(oldProgram);
  }
  renderCanvas(s){
   const ctx=this.ctx,dpr=this.canvas.width/s.cssW,scale=s.drawW/W*dpr,offx=s.ox*dpr,offy=s.oy*dpr;
   if(!this.base){const c=document.createElement('canvas');c.width=this.canvas.width;c.height=this.canvas.height;const b=c.getContext('2d');b.drawImage(this.photo,offx,offy,s.drawW*dpr,s.drawH*dpr);this.base=c;this.basePixels=b.getImageData(0,0,c.width,c.height).data;}
   ctx.clearRect(0,0,this.canvas.width,this.canvas.height);ctx.drawImage(this.base,0,0);if(this.maxVelocity===0)return;
   const x0=Math.max(0,Math.floor(offx+BOX[0]*scale)),y0=Math.max(0,Math.floor(offy+BOX[1]*scale));
   const w=Math.min(this.canvas.width-x0,Math.ceil(BOX[2]*scale)+2),h=Math.min(this.canvas.height-y0,Math.ceil(BOX[3]*scale)+2),frame=ctx.createImageData(w,h);
   const l=this.assets['material-0-premult.png'],r=this.assets['material-1-premult.png'],b=this.assets['backing-composite.png'],m=this.assets['ownership.png'];
   for(let j=0;j<h;j++)for(let i=0;i<w;i++){
    const x=(x0+i+.5-offx)/scale,y=(y0+j+.5-offy)/scale,at=(j*w+i)*4,baseAt=((y0+j)*this.canvas.width+x0+i)*4;
    const [lx,ly]=this.map(0,x,y),[rx,ry]=this.map(1,x,y);
    const alpha0=(sample(l,x,y,3)+sample(r,x,y,3))/255,alpha=(sample(l,lx,ly,3)+sample(r,rx,ry,3))/255;
    const fg=sample(m,x,y,2)/255;
    for(let k=0;k<3;k++){
     const delta=sample(l,lx,ly,k)+sample(r,rx,ry,k)-sample(l,x,y,k)-sample(r,x,y,k)+sample(b,x,y,k)*(alpha0-alpha);
     frame.data[at+k]=this.basePixels[baseAt+k]+delta*(1-fg);
    }
    frame.data[at+3]=255;
   }
   ctx.putImageData(frame,x0,y0);
  }
  metrics(){return {...super.metrics(),missingBacking:false,backingIsInferred:true,sourceRepair:true};}
 }
 ReconstructedHolly.geometry=Baseline.geometry;
 window.HollyLayers=ReconstructedHolly;
 window.__hollyRepair={Baseline,ReconstructedHolly,assetNames};
})();
