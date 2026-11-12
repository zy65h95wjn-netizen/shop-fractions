import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {Physics,REGIONS,hitTest} from '../dist/physics.js';
import {W,H,OUTLINES,matte,coefficients,makeField,crease,smooth,lowerJoin} from '../dist/layers.js';

import {forward,inverse,createSurface,updateSurface,project,restPoint} from '../dist/surface.js';
const close=(a,b)=>assert.ok(Math.hypot(a[0]-b[0],a[1]-b[1])<.0001);
const advance=(p,t)=>{for(let i=0;i<t*60;i++)p.advance(1/60);};
const rest=b=>{for(const key of ['x','y','sx','sy','vx','vy','svx','svy','z','vz'])assert.equal(b[key],0);};

test('the source portrait remains byte-for-byte identical',()=>{
  const hash=createHash('sha256').update(readFileSync(new URL('../dist/assets/portrait-original.jpg',import.meta.url))).digest('hex');
  assert.equal(hash,'0ce4ef21d3cb04a83d86ba6ba426fcf909c2a092ff69348e8e22f6b8aaa19017');
});
test('the formerly anchored inner edge now has independent travel',()=>{
  const b={x:7,y:12,sx:7,sy:12};
  for(const [x,y] of [[288,866],[283,895]]) {
    const p=forward(x,y,1,b);
    assert.ok(Math.hypot(p[0]-x,p[1]-y)>8);
  }
  const p=forward(340,890,1,{x:0,y:0,sx:0,sy:0});
  close(p,[340,890]);
});
test('taps, drags and release keep the opposite spring and its geometry still',()=>{
  for(const side of [0,1]) {
    const p=new Physics(),[x,y]=REGIONS[side].center;
    p.down(1,x,y,0);
    for(let n=1;n<=90;n++) {
      p.move(1,x+180*Math.sin(n*.2),y+100*Math.cos(n*.2),n*16);p.advance(1/60);
      rest(p.bodies[1-side]);
      for(const q of OUTLINES[1-side])close(forward(...q,1-side,p.bodies[1-side]),q);
    }
    p.up(1,1450);advance(p,5);rest(p.bodies[1-side]);
  }
});
test('two fingers maintain separate ownership and safely cancel',()=>{
  const p=new Physics();
  assert.equal(p.down(1,...REGIONS[0].center,0),0);assert.equal(p.down(2,...REGIONS[1].center,0),1);
  p.move(1,600,920,60);p.move(2,100,850,60);advance(p,.2);
  assert.ok(p.bodies[0].x>0);assert.ok(p.bodies[1].x<0);
  p.up(1,200,true);assert.equal(p.bodies[1].pointer,2);p.up(2,210,true);advance(p,10);
  rest(p.bodies[0]);rest(p.bodies[1]);assert.equal(p.pointers.size,0);
});
test('a moving foreground edge can be grabbed without selecting the layer behind it',()=>{
  const p=new Physics();Object.assign(p.bodies[1],{x:-14,y:0,sx:-14,sy:0});
  const point=forward(286,895,1,p.bodies[1]);
  assert.equal(hitTest(...point),0,'this destination was originally on the left');
  assert.equal(p.down(4,...point,100),1,'the visible foreground belongs to the right');
  rest(p.bodies[0]);
});
test('sideways separation has conservative asymmetric travel bounds',()=>{
  for(const side of [0,1]){
    const p=new Physics(),[x,y]=REGIONS[side].center;
    p.down(1,x,y,0);p.move(1,x+(side===1?10000:-10000),y,20);advance(p,.5);
    assert.ok(Math.abs(p.bodies[side].x)<=REGIONS[side].limit*(side===1?.30:.35)+1e-8);
  }
});
test('each contact edge slides along the crease without separating from it',()=>{
  for(const side of [0,1])for(const y of [840,870,900,930,960])for(const dy of [-18,18]){
    const x=crease(y),b={x:side===1?6:-5,y:dy,sx:0,sy:0};
    const q=forward(x,y,side,b),normal=q[0]-crease(q[1]);
    assert.ok(side===1?normal<=1e-8:normal>=-1e-8);
    if(y<=900)assert.ok(Math.abs(q[1]-y)>2,'upper contact sliding stays available');
  }
});
test('all control extremes stay bounded and eventually return to exact rest',()=>{
  for(const bounce of [0,100])for(const softness of [0,100])for(const settling of [0,100]) {
    const p=new Physics({bounce,softness,settling});
    for(let side=0;side<2;side++)p.down(side,...REGIONS[side].center,0);
    for(let i=1;i<180;i++) {
      for(let side=0;side<2;side++)p.move(side,300+2000*Math.sin(i+side),900+2000*Math.cos(i+side),i*16);
      p.advance(1/60);
      p.bodies.forEach((b,side)=>assert.ok(Math.hypot(b.x/.8,b.y)<=REGIONS[side].limit+1e-8));
    }
    p.up(0,2900);p.up(1,2900);advance(p,20);rest(p.bodies[0]);rest(p.bodies[1]);
  }
});
test('layer mattes exclude clothing, hair, stockings and background',()=>{
  const points=[[200,600],[400,700],[200,770],[530,775],[90,890],[630,920],[220,1050],[420,1100],[300,1190]];
  for(const p of points)for(const side of [0,1])assert.equal(matte(...p,side),0);
});
test('the free inner edge has more response than the outer region',()=>{
  assert.ok(coefficients(300,890,1)[0]>.85);
  assert.ok(coefficients(300,890,1)[0]>3*coefficients(500,890,1)[0]);
});


test('lower attachments remain closed under maximum displacement and depth',()=>{
  for(const side of [0,1])for(let x=side===0?173:337;x<(side===0?300:579);x+=3){
    const y=lowerJoin(x,side)-1;
    for(const sign of [-1,1])close(forward(x,y,side,{x:sign*16,y:sign*22,sx:-sign*16,sy:-sign*22,z:sign*12}),[x,y]);
  }
});
test('the rendered XYZ meshes preserve source projection at rest',()=>{
  for(const side of [0,1]){
    const s=createSurface(side);let minZ=Infinity,maxZ=-Infinity;
    for(let i=0;i<s.sources.length/2;i++){
      close(project(s.positions.subarray(i*3,i*3+3)),Array.from(s.sources.subarray(i*2,i*2+2)));
      minZ=Math.min(minZ,s.positions[i*3+2]);maxZ=Math.max(maxZ,s.positions[i*3+2]);
    }
    assert.ok(maxZ-minZ>40,'surface has actual curvature in depth');
  }
});
test('stress poses do not invert mesh triangles or break pointer inversion',()=>{
  let minRatio=Infinity,maxError=0;
  for(const side of [0,1]){
    const s=createSurface(side);
    for(let angle=0;angle<24;angle++)for(const z of [-12,12]){
      const t=angle*Math.PI/12,r=REGIONS[side].limit;
      const b={x:.8*r*Math.cos(t),y:r*Math.sin(t),sx:-.8*r*Math.cos(t),sy:-r*Math.sin(t),z};
      updateSurface(s,b);
      for(let k=0;k<s.indices.length;k+=3){
        const ids=Array.from(s.indices.subarray(k,k+3));
        const points=ids.map(i=>project(s.positions.subarray(i*3,i*3+3)));
        const source=ids.map(i=>Array.from(s.sources.subarray(i*2,i*2+2)));
        const area=p=>(p[1][0]-p[0][0])*(p[2][1]-p[0][1])-(p[1][1]-p[0][1])*(p[2][0]-p[0][0]);
        minRatio=Math.min(minRatio,area(points)/area(source));
      }
      for(let y=810;y<980;y+=20)for(let x=150;x<590;x+=20){
        if(matte(x,y,side)<.5)continue;
        const q=forward(x,y,side,b),back=inverse(...q,side,b);
        maxError=Math.max(maxError,Math.hypot(back[0]-x,back[1]-y));
      }
    }
  }
  console.log({minimumTriangleAreaRatio:minRatio,maximumPointerError:maxError});
  assert.ok(minRatio>.3);assert.ok(maxError<.08);
});
