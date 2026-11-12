import {W,H,makeField} from './layers.js';
import {createSurface,updateSurface} from './surface.js';
const baseVertex=`attribute vec2 aPosition; varying vec2 vUV; void main(){vUV=vec2((aPosition.x+1.)*.5,(1.-aPosition.y)*.5);gl_Position=vec4(aPosition,.999,1.);}`;
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
const meshVertex=`
attribute vec3 aPosition;
attribute vec3 aProject;
attribute vec3 aNormal;
attribute vec3 aRestNormal;
varying vec3 vProject;
varying vec3 vNormal;
varying vec3 vRestNormal;
void main(){
  float q=1600.-aPosition.z;
  gl_Position=vec4(aPosition.x*1600./378.,(-260.*q-aPosition.y*1600.)/640.,-aPosition.z*q/400.,q);
  vProject=aProject;vNormal=aNormal;vRestNormal=aRestNormal;
}`;
const meshFragment=`
precision highp float;
uniform sampler2D uImage;
uniform sampler2D uLeftField;
uniform sampler2D uRightField;
uniform float uSide;
uniform float uClay;
varying vec3 vProject;
varying vec3 vNormal;
varying vec3 vRestNormal;
void main(){
  vec2 uv=vProject.xy/vProject.z;
  float alpha=uSide>.5?texture2D(uRightField,uv).a:texture2D(uLeftField,uv).a;
  if(alpha<.002)discard;
  vec3 light=normalize(vec3(-.25,-.4,.88));
  float illumination=.75+.25*max(0.,dot(normalize(vNormal),light));
  float rest=.75+.25*max(0.,dot(normalize(vRestNormal),light));
  float ratio=clamp(illumination/rest,.94,1.06);
  vec3 photo=texture2D(uImage,uv).rgb*ratio;
  vec3 clay=mix(vec3(.56,.71,.66),vec3(.77,.62,.48),uSide)*illumination;
  gl_FragColor=vec4(mix(photo,clay,uClay),alpha);
}`;

export class Renderer {
  constructor(canvas,image){
    this.canvas=canvas;this.showSurface=false;
    const gl=canvas.getContext('webgl',{alpha:false,antialias:true,depth:true,stencil:false,
      preserveDrawingBuffer:false,powerPreference:'low-power'});
    if(!gl)throw new Error('WebGL is unavailable');this.gl=gl;this.textures=[];
    const compile=(type,source)=>{
      const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);
      if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(shader));return shader;
    };
    const program=(vSource,fSource)=>{
      const p=gl.createProgram(),v=compile(gl.VERTEX_SHADER,vSource),f=compile(gl.FRAGMENT_SHADER,fSource);
      gl.attachShader(p,v);gl.attachShader(p,f);gl.linkProgram(p);gl.deleteShader(v);gl.deleteShader(f);
      if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p));return p;
    };
    this.base=program(baseVertex,baseFragment);this.mesh=program(meshVertex,meshFragment);
    this.quad=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.quad);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
    this.surfaces=[createSurface(0),createSurface(1)].map(s=>{
      s.vbo=gl.createBuffer();s.ibo=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,s.vbo);
      gl.bufferData(gl.ARRAY_BUFFER,s.vertices,gl.DYNAMIC_DRAW);gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,s.ibo);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,s.indices,gl.STATIC_DRAW);return s;
    });
    [image,makeField(0),makeField(1)].forEach((data,unit)=>{
      gl.activeTexture(gl.TEXTURE0+unit);const texture=gl.createTexture();this.textures.push(texture);
      gl.bindTexture(gl.TEXTURE_2D,texture);
      for(const [key,value] of [[gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE],[gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE],
        [gl.TEXTURE_MIN_FILTER,gl.LINEAR],[gl.TEXTURE_MAG_FILTER,gl.LINEAR]])gl.texParameteri(gl.TEXTURE_2D,key,value);
      if(unit===0)gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,data);
      else gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,W,H,0,gl.RGBA,gl.UNSIGNED_BYTE,data);
    });
    for(const p of [this.base,this.mesh]){
      gl.useProgram(p);for(const [name,i] of [['uImage',0],['uLeftField',1],['uRightField',2]])
        gl.uniform1i(gl.getUniformLocation(p,name),i);
    }
    this.side=gl.getUniformLocation(this.mesh,'uSide');this.clay=gl.getUniformLocation(this.mesh,'uClay');
  }
  resize(){
    const rect=this.canvas.getBoundingClientRect();
    this.canvas.width=Math.max(1,Math.min(W,Math.round(rect.width*Math.min(devicePixelRatio||1,2))));
    this.canvas.height=Math.round(this.canvas.width*H/W);
    this.gl.viewport(0,0,this.canvas.width,this.canvas.height);
  }
  attributes(program,fields,stride){
    const gl=this.gl;
    // Attribute locations differ between programs; disable stale mesh inputs.
    for(let i=0;i<4;i++)gl.disableVertexAttribArray(i);
    for(const [name,size,offset] of fields){
      const a=gl.getAttribLocation(program,name);if(a<0)continue;
      gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,size,gl.FLOAT,false,stride,offset);
    }
  }
  draw(bodies){
    const gl=this.gl;gl.depthMask(true);gl.clearDepth(1);gl.clear(gl.DEPTH_BUFFER_BIT);
    gl.disable(gl.DEPTH_TEST);gl.disable(gl.BLEND);gl.useProgram(this.base);
    gl.bindBuffer(gl.ARRAY_BUFFER,this.quad);this.attributes(this.base,[['aPosition',2,0]],0);
    gl.drawArrays(gl.TRIANGLES,0,6);
    gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.useProgram(this.mesh);
    gl.uniform1f(this.clay,this.showSurface?1:0);
    for(let side=0;side<2;side++){
      const s=this.surfaces[side],b=bodies[side],pose=[b.x,b.y,b.sx,b.sy,b.z];
      const changed=!s.lastPose||pose.some((v,i)=>v!==s.lastPose[i]);
      if(changed){updateSurface(s,b);s.lastPose=pose;}
      gl.uniform1f(this.side,side);
      gl.bindBuffer(gl.ARRAY_BUFFER,s.vbo);if(changed)gl.bufferSubData(gl.ARRAY_BUFFER,0,s.vertices);
      this.attributes(this.mesh,[['aPosition',3,0],['aProject',3,12],['aNormal',3,24],['aRestNormal',3,36]],48);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,s.ibo);gl.drawElements(gl.TRIANGLES,s.indices.length,gl.UNSIGNED_SHORT,0);
    }
    gl.disable(gl.DEPTH_TEST);gl.disable(gl.BLEND);
  }
  dispose(){
    const gl=this.gl;this.textures.forEach(t=>gl.deleteTexture(t));gl.deleteBuffer(this.quad);
    for(const s of this.surfaces){gl.deleteBuffer(s.vbo);gl.deleteBuffer(s.ibo);}
    gl.deleteProgram(this.base);gl.deleteProgram(this.mesh);
  }
}
