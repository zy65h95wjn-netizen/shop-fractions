import {W,H,coefficients,crease,smooth,clamp} from './layers.js';
export const CAMERA=1600,CX=378,CY=900;
export const SHAPES=[
  {center:[220,890],radii:[87,115],depth:66,base:52,bounds:[130,770,320,1006]},
  {center:[430,890],radii:[158,128],depth:104,base:103,bounds:[274,768,602,1020]}
];
export function restPoint(x,y,side){
  const s=SHAPES[side],nx=(x-s.center[0])/s.radii[0],ny=(y-s.center[1])/s.radii[1];
  const z=s.base+s.depth*Math.sqrt(Math.max(.035,1-nx*nx-ny*ny));
  const f=(CAMERA-z)/CAMERA;
  return [(x-CX)*f,(y-CY)*f,z];
}
export function project(p){
  const f=CAMERA/(CAMERA-p[2]);return [CX+p[0]*f,CY+p[1]*f];
}
export function deformPoint(x,y,side,b,rest=restPoint(x,y,side),weights=coefficients(x,y,side)){
  const [w,wy,wx]=weights,f=(CAMERA-rest[2])/CAMERA;
  const dx=w*b.x+.08*wy*(b.sx-b.x);
  const dy=w*b.y+.08*wy*(b.sy-b.y)-.03*wx*b.x;
  // Separate depth spring plus delayed redistribution supplies real surface
  // curvature changes; perspective and normals are computed from these XYZs.
  const dz=w*((b.z||0)+.15*(b.sy-b.y));
  const p=[rest[0]+dx*f,rest[1]+dy*f,rest[2]+dz];
  const screen=project(p),contact=1-smooth((Math.abs(x-crease(y))-8)/40);
  // Keep horizontal input in screen coordinates: neither vertical travel nor
  // depth changes should steer a downward drag sideways. Restrain outward
  // horizontal travel at the original contact band, without following the
  // curved crease at the displaced height (which introduced lateral drift).
  screen[0]=x+dx-contact*(side===1?Math.max(dx,0):Math.min(dx,0));
  p[0]=(screen[0]-CX)*(CAMERA-p[2])/CAMERA;
  return p;
}
export function forward(x,y,side,body){return project(deformPoint(x,y,side,body));}
export function inverse(x,y,side,body){
  let sx=x,sy=y;
  for(let i=0;i<20;i++){
    const q=forward(sx,sy,side,body);sx+=x-q[0];sy+=y-q[1];
  }
  return [sx,sy];
}
function normals(positions,columns,rows){
  const result=new Float32Array(positions.length),stride=columns+1;
  for(let iy=0;iy<=rows;iy++)for(let ix=0;ix<=columns;ix++){
    const n=iy*stride+ix,a=(iy*stride+Math.max(0,ix-1))*3,b=(iy*stride+Math.min(columns,ix+1))*3;
    const c=(Math.max(0,iy-1)*stride+ix)*3,d=(Math.min(rows,iy+1)*stride+ix)*3;
    const ax=positions[b]-positions[a],ay=positions[b+1]-positions[a+1],az=positions[b+2]-positions[a+2];
    const bx=positions[d]-positions[c],by=positions[d+1]-positions[c+1],bz=positions[d+2]-positions[c+2];
    const nx=ay*bz-az*by,ny=az*bx-ax*bz,nz=ax*by-ay*bx,length=Math.hypot(nx,ny,nz)||1;
    result.set([nx/length,ny/length,nz/length],n*3);
  }
  return result;
}
export function createSurface(side){
  const [x0,y0,x1,y1]=SHAPES[side].bounds;
  const columns=Math.ceil((x1-x0)/4),rows=Math.ceil((y1-y0)/4),count=(columns+1)*(rows+1);
  const sources=new Float32Array(count*2),rest=new Float32Array(count*3),weights=new Float32Array(count*3);
  const vertices=new Float32Array(count*12),indices=new Uint16Array(columns*rows*6);
  let i=0,j=0;
  for(let y=0;y<=rows;y++)for(let x=0;x<=columns;x++,i++){
    const px=x0+(x1-x0)*x/columns,py=y0+(y1-y0)*y/rows,p=restPoint(px,py,side);
    sources.set([px,py],i*2);rest.set(p,i*3);weights.set(coefficients(px,py,side),i*3);
    const q=CAMERA-p[2];vertices.set([px/W*q,py/H*q,q],i*12+3);
    if(x<columns&&y<rows){const a=y*(columns+1)+x,b=a+1,c=a+columns+1,d=c+1;indices.set([a,b,c,b,d,c],j);j+=6;}
  }
  const restNormals=normals(rest,columns,rows);
  const surface={side,columns,rows,sources,rest,weights,vertices,indices,restNormals,positions:new Float32Array(rest.length)};
  updateSurface(surface,{x:0,y:0,sx:0,sy:0,z:0});
  return surface;
}
export function updateSurface(s,body){
  const n=s.sources.length/2;
  for(let i=0;i<n;i++)s.positions.set(deformPoint(s.sources[i*2],s.sources[i*2+1],s.side,body,
    s.rest.subarray(i*3,i*3+3),s.weights.subarray(i*3,i*3+3)),i*3);
  const currentNormals=normals(s.positions,s.columns,s.rows);
  for(let i=0;i<n;i++){
    s.vertices.set(s.positions.subarray(i*3,i*3+3),i*12);
    s.vertices.set(currentNormals.subarray(i*3,i*3+3),i*12+6);
    s.vertices.set(s.restNormals.subarray(i*3,i*3+3),i*12+9);
  }
}
