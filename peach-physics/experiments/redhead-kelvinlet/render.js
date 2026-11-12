import {W,H,ROI,GW,GH,GRID,mask,sample} from '../redhead-soft-tissue/physics.js';
export const views={study:[150,100,490,570],full:[0,0,W,H],detail:[245,390,325,190]};
const [X,Y,RW,RH]=ROI;
// A narrow exact contour guard prevents interpolation across zero-motion edges.
export const guard=new Uint8Array(RW*RH);
for(let y=0;y<RH;y++)for(let x=0;x<RW;x++)guard[y*RW+x]=Math.round(255*Math.min(1,Math.max(mask(X+x+.5,Y+y+.5,0),mask(X+x+.5,Y+y+.5,1))*30));
export class Renderer{
 constructor(canvas,img,type){
  this.canvas=canvas;this.img=img;this.type=type;this.view=views.study;
  if(type==='webgl')this.initGL();else this.initCanvas();
 }
 initCanvas(){
  this.ctx=this.canvas.getContext('2d',{alpha:false});
  const source=document.createElement('canvas');source.width=W;source.height=H;const sc=source.getContext('2d',{willReadFrequently:true});sc.drawImage(this.img,0,0);this.source=sc.getImageData(0,0,W,H).data;
  this.patch=document.createElement('canvas');this.patch.width=RW;this.patch.height=RH;this.pc=this.patch.getContext('2d');this.frame=this.pc.createImageData(RW,RH);
 }
 initGL(){
  const gl=this.canvas.getContext('webgl',{alpha:false,antialias:false,preserveDrawingBuffer:true});if(!gl)throw Error('WebGL unavailable');this.gl=gl;
  const shader=(type,src)=>{const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};
  const vs=shader(gl.VERTEX_SHADER,'attribute vec2 a; varying vec2 uv; void main(){uv=a;gl_Position=vec4(a.x*2.-1.,1.-a.y*2.,0.,1.);}');
  const fs=shader(gl.FRAGMENT_SHADER,`precision highp float;
   varying vec2 uv;uniform sampler2D photo;uniform sampler2D field;uniform sampler2D guardTex;uniform vec4 view;
   vec2 decode(vec2 p){vec4 t=texture2D(field,(p+.5)/vec2(${GW}.,${GH}.));return (vec2(t.r*255.*256.+t.g*255.,t.b*255.*256.+t.a*255.)-32768.)/1024.;}
   void main(){vec2 p=view.xy+uv*view.zw;vec2 q=(p-vec2(${X}.,${Y}.))/${GRID}.;
    if(q.x>=0.&&q.y>=0.&&q.x<${GW-1}.&&q.y<${GH-1}.){vec2 b=floor(q),f=fract(q);vec2 d=mix(mix(decode(b),decode(b+vec2(1.,0.)),f.x),mix(decode(b+vec2(0.,1.)),decode(b+vec2(1.,1.)),f.x),f.y);float g=texture2D(guardTex,(p-vec2(${X}.,${Y}.))/vec2(${RW}.,${RH}.)).r;p+=d*g;}
    gl_FragColor=texture2D(photo,p/vec2(${W}.,${H}.));}`);
  this.program=gl.createProgram();gl.attachShader(this.program,vs);gl.attachShader(this.program,fs);gl.linkProgram(this.program);if(!gl.getProgramParameter(this.program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(this.program));gl.useProgram(this.program);
  const b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([0,0,1,0,0,1,0,1,1,0,1,1]),gl.STATIC_DRAW);const a=gl.getAttribLocation(this.program,'a');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);
  const texture=(unit,name,linear)=>{gl.activeTexture(gl.TEXTURE0+unit);const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,linear?gl.LINEAR:gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,linear?gl.LINEAR:gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.uniform1i(gl.getUniformLocation(this.program,name),unit);return t;};
  texture(0,'photo',true);gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL,gl.NONE);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,this.img);
  this.fieldTexture=texture(1,'field',false);this.encoded=new Uint8Array(GW*GH*4);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,GW,GH,0,gl.RGBA,gl.UNSIGNED_BYTE,this.encoded);
  texture(2,'guardTex',true);gl.texImage2D(gl.TEXTURE_2D,0,gl.LUMINANCE,RW,RH,0,gl.LUMINANCE,gl.UNSIGNED_BYTE,guard);this.viewLoc=gl.getUniformLocation(this.program,'view');
 }
 resize(view){
  this.view=view;const r=this.canvas.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2),w=Math.max(2,Math.round(r.width*d)),h=Math.max(2,Math.round(r.height*d));
  if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h;}if(this.gl)this.gl.viewport(0,0,w,h);
 }
 draw(field){
  if(this.gl){const gl=this.gl;for(let i=0;i<GW*GH;i++){const x=Math.max(0,Math.min(65535,Math.round(field[2*i]*1024+32768))),y=Math.max(0,Math.min(65535,Math.round(field[2*i+1]*1024+32768)));this.encoded.set([x>>8,x&255,y>>8,y&255],i*4);}gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,this.fieldTexture);gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,GW,GH,gl.RGBA,gl.UNSIGNED_BYTE,this.encoded);gl.uniform4fv(this.viewLoc,this.view);gl.drawArrays(gl.TRIANGLES,0,6);return;}
  const [vx,vy,vw,vh]=this.view,c=this.ctx,cw=this.canvas.width,ch=this.canvas.height;c.drawImage(this.img,vx,vy,vw,vh,0,0,cw,ch);
  const dst=this.frame.data,src=this.source;
  for(let y=0;y<RH;y++)for(let x=0;x<RW;x++){
   const at=(y*RW+x)*4,g=guard[y*RW+x]/255,px=X+x+.5,py=Y+y+.5;
   const sx=px+sample(field,px,py,2,0)*g-.5,sy=py+sample(field,px,py,2,1)*g-.5;
   const ix=Math.floor(sx),iy=Math.floor(sy),fx=sx-ix,fy=sy-iy,k=(iy*W+ix)*4;
   for(let z=0;z<3;z++)dst[at+z]=(src[k+z]*(1-fx)+src[k+4+z]*fx)*(1-fy)+(src[k+W*4+z]*(1-fx)+src[k+(W+1)*4+z]*fx)*fy;dst[at+3]=255;
  }
  this.pc.putImageData(this.frame,0,0);
  // Composite into a full-size source before scaling: prevents ROI seams from
  // independently resampled patch edges, including non-integral mobile scales.
  if(!this.composite){this.composite=document.createElement('canvas');this.composite.width=W;this.composite.height=H;this.cc=this.composite.getContext('2d');}
  this.cc.drawImage(this.img,0,0);this.cc.drawImage(this.patch,X,Y);c.drawImage(this.composite,vx,vy,vw,vh,0,0,cw,ch);
 }
 dispose(){if(this.gl)this.gl.getExtension('WEBGL_lose_context')?.loseContext();}
}
