import {W,H,makeField} from './layers.js';

const vertex=`
attribute vec2 aPosition;
varying vec2 vUV;
void main(){vUV=vec2((aPosition.x+1.0)*.5,(1.0-aPosition.y)*.5);gl_Position=vec4(aPosition,0.,1.);}
`;
const common=`
precision highp float;
varying vec2 vUV;
uniform sampler2D uImage;
uniform sampler2D uLeftField;
uniform sampler2D uRightField;
const vec2 SIZE=vec2(756.,1280.);
float curve(float y){return 284.+.004*(y-882.)*(y-882.);}
vec4 field(vec2 p,float side){return side>.5?texture2D(uRightField,p/SIZE):texture2D(uLeftField,p/SIZE);}
`;
const baseFragment=common+`
void main(){
  vec2 p=vUV*SIZE;
  vec4 original=texture2D(uImage,vUV);
  float cut=max(texture2D(uLeftField,vUV).a,texture2D(uRightField,vUV).a);
  float c=curve(p.y);
  // A narrow, static backing plate continues nearby source skin beneath the
  // original seam and lower fold. It is seen only when a cutout moves away.
  vec2 back=p;
  float seam=1.-smoothstep(12.,42.,abs(p.x-c));
  float side=p.x<c?-1.:1.;
  // Preserve horizontal texture variation in the extension; collapsing a
  // whole strip to one column creates an obvious stretched band.
  back.x=p.x+side*36.*seam;
  float foldY=p.x<c?979.:997.;
  float fold=1.-smoothstep(4.,26.,abs(p.y-foldY));
  back.y=mix(p.y,p.y+28.,fold);
  vec3 backing=texture2D(uImage,back/SIZE).rgb;
  // Concealed surfaces receive restrained ambient shading. Foreground skin
  // retains the exact source colors; this affects newly exposed backing only.
  backing*=1.-.12*seam;
  // Only the fully covered part is replaced: at rest foregrounds cover every
  // modified pixel. The unmodified photograph is displayed after settling.
  gl_FragColor=vec4(mix(original.rgb,backing,step(.999,cut)),1.);
}`;
const layerFragment=common+`
uniform vec4 uBody;
uniform float uSide;
vec2 movement(vec2 p){
  vec4 f=field(p,uSide);
  float wy=f.r*(f.g*2.-1.),wx=f.r*(f.b*2.-1.);
  return vec2(f.r*uBody.x+.08*wy*(uBody.z-uBody.x)+.04*wx*uBody.y,
              f.r*uBody.y+.08*wy*(uBody.w-uBody.y)-.03*wx*uBody.x);
}
void main(){
  vec2 destination=vUV*SIZE,source=destination;
  // Independent inverse maps. One side never samples the other side's body.
  for(int i=0;i<12;i++){source=destination-movement(source);}
  float alpha=field(source,uSide).a;
  if(alpha<.002)discard;
  gl_FragColor=vec4(texture2D(uImage,source/SIZE).rgb,alpha);
}`;

export class Renderer {
  constructor(canvas,image){
    this.canvas=canvas;
    const gl=canvas.getContext('webgl',{alpha:false,antialias:false,depth:false,
      stencil:false,preserveDrawingBuffer:false,powerPreference:'low-power'});
    if(!gl)throw new Error('WebGL is unavailable');
    this.gl=gl;this.textures=[];
    const compile=(type,source)=>{
      const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);
      if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(shader));
      return shader;
    };
    const program=fragment=>{
      const p=gl.createProgram(),v=compile(gl.VERTEX_SHADER,vertex),f=compile(gl.FRAGMENT_SHADER,fragment);
      gl.attachShader(p,v);gl.attachShader(p,f);gl.linkProgram(p);gl.deleteShader(v);gl.deleteShader(f);
      if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));
      return p;
    };
    this.base=program(baseFragment);this.layer=program(layerFragment);
    this.buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
    const texture=(unit,data)=>{
      gl.activeTexture(gl.TEXTURE0+unit);
      const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);this.textures.push(t);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
      if(unit===0)gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,data);
      else gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,W,H,0,gl.RGBA,gl.UNSIGNED_BYTE,data);
    };
    texture(0,image);texture(1,makeField(0));texture(2,makeField(1));
    for(const p of [this.base,this.layer]){
      gl.useProgram(p);
      for(const [name,i] of [['uImage',0],['uLeftField',1],['uRightField',2]])gl.uniform1i(gl.getUniformLocation(p,name),i);
    }
    this.body=gl.getUniformLocation(this.layer,'uBody');this.side=gl.getUniformLocation(this.layer,'uSide');
  }
  use(program){
    const gl=this.gl;gl.useProgram(program);gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);
    const a=gl.getAttribLocation(program,'aPosition');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);
  }
  resize(){
    const rect=this.canvas.getBoundingClientRect();
    const width=Math.max(1,Math.min(W,Math.round(rect.width*Math.min(devicePixelRatio||1,2))));
    this.canvas.width=width;this.canvas.height=Math.round(width*H/W);
    this.gl.viewport(0,0,this.canvas.width,this.canvas.height);
  }
  draw(bodies){
    const gl=this.gl;
    gl.disable(gl.BLEND);gl.disable(gl.SCISSOR_TEST);this.use(this.base);gl.drawArrays(gl.TRIANGLES,0,6);
    gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
    gl.enable(gl.SCISSOR_TEST);
    const scale=this.canvas.width/W;
    gl.scissor(Math.floor(105*scale),Math.floor((H-1055)*scale),Math.ceil(520*scale),Math.ceil(310*scale));
    this.use(this.layer);
    // Fixed anatomical depth: right is in front. Occlusion can change; the
    // underlying left geometry and texture never move with the right input.
    for(let side=0;side<2;side++){
      const b=bodies[side];gl.uniform1f(this.side,side);gl.uniform4f(this.body,b.x,b.y,b.sx,b.sy);
      gl.drawArrays(gl.TRIANGLES,0,6);
    }
    gl.disable(gl.SCISSOR_TEST);gl.disable(gl.BLEND);
  }
  dispose(){
    const gl=this.gl;this.textures.forEach(t=>gl.deleteTexture(t));gl.deleteBuffer(this.buffer);
    gl.deleteProgram(this.base);gl.deleteProgram(this.layer);
  }
}
