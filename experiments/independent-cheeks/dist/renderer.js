import {WIDTH,HEIGHT,createMesh} from './physics.js';

const vertexSource=`
attribute vec2 aPosition;
attribute vec3 aLeft;
attribute vec3 aRight;
uniform vec4 uLeft;
uniform vec4 uRight;
varying vec2 vUV;
vec2 offset(vec3 w,vec4 b) {
  return vec2(w.x*b.x+0.16*w.y*(b.z-b.x)+0.08*w.z*b.y,
              w.x*b.y+0.16*w.y*(b.w-b.y)-0.055*w.z*b.x);
}
void main() {
  vUV=aPosition/vec2(756.0,1280.0);
  vec2 p=aPosition+offset(aLeft,uLeft)+offset(aRight,uRight);
  gl_Position=vec4(p.x/378.0-1.0,1.0-p.y/640.0,0.0,1.0);
}`;
const fragmentSource=`
precision highp float;
uniform sampler2D uImage;
varying vec2 vUV;
void main() { gl_FragColor=texture2D(uImage,vUV); }
`;

export class Renderer {
  constructor(canvas, image) {
    this.canvas=canvas;
    const gl=canvas.getContext('webgl',{alpha:false,antialias:false,depth:false,
      stencil:false,preserveDrawingBuffer:false,powerPreference:'low-power'});
    if(!gl) throw new Error('This browser could not start WebGL. The original image is still available.');
    this.gl=gl;
    const compile=(type,source)=>{
      const shader=gl.createShader(type);
      gl.shaderSource(shader,source); gl.compileShader(shader);
      if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
      return shader;
    };
    const vs=compile(gl.VERTEX_SHADER,vertexSource),fs=compile(gl.FRAGMENT_SHADER,fragmentSource);
    const program=gl.createProgram(); gl.attachShader(program,vs); gl.attachShader(program,fs);
    gl.linkProgram(program);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
    gl.deleteShader(vs); gl.deleteShader(fs); gl.useProgram(program);
    const mesh=createMesh();
    const vertices=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,vertices);
    gl.bufferData(gl.ARRAY_BUFFER,mesh.vertices,gl.STATIC_DRAW);
    for(const [name,count,offset] of [['aPosition',2,0],['aLeft',3,8],['aRight',3,20]]) {
      const location=gl.getAttribLocation(program,name);
      gl.enableVertexAttribArray(location); gl.vertexAttribPointer(location,count,gl.FLOAT,false,32,offset);
    }
    const indices=gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,indices);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,mesh.indices,gl.STATIC_DRAW);
    this.count=mesh.indices.length;
    this.left=gl.getUniformLocation(program,'uLeft'); this.right=gl.getUniformLocation(program,'uRight');
    gl.activeTexture(gl.TEXTURE0);
    this.texture=gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D,this.texture);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
    gl.uniform1i(gl.getUniformLocation(program,'uImage'),0);
    this.buffers=[vertices,indices]; this.program=program;
  }
  resize() {
    const rect=this.canvas.getBoundingClientRect();
    // Native image resolution is the useful upper limit; avoid 3× phone overdraw.
    const width=Math.max(1,Math.min(WIDTH,Math.round(rect.width*Math.min(devicePixelRatio||1,2))));
    const height=Math.round(width*HEIGHT/WIDTH);
    if(this.canvas.width!==width || this.canvas.height!==height) {
      this.canvas.width=width; this.canvas.height=height;
      this.gl.viewport(0,0,width,height);
    }
  }
  draw(bodies) {
    const gl=this.gl;
    const [l,r]=bodies;
    gl.uniform4f(this.left,l.x,l.y,l.sx,l.sy);
    gl.uniform4f(this.right,r.x,r.y,r.sx,r.sy);
    gl.drawElements(gl.TRIANGLES,this.count,gl.UNSIGNED_SHORT,0);
  }
  dispose() {
    for(const buffer of this.buffers) this.gl.deleteBuffer(buffer);
    this.gl.deleteTexture(this.texture); this.gl.deleteProgram(this.program);
  }
}
