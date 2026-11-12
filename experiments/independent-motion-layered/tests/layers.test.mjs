import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {Physics,REGIONS,hitTest} from '../dist/physics.js';
import {W,H,OUTLINES,matte,coefficients,forward,inverse,makeField} from '../dist/layers.js';

const advance=(p,t)=>{for(let i=0;i<t*60;i++)p.advance(1/60);};
const rest=b=>{for(const key of ['x','y','sx','sy','vx','vy','svx','svy'])assert.equal(b[key],0);};

test('the source portrait remains byte-for-byte identical',()=>{
  const hash=createHash('sha256').update(readFileSync(new URL('../dist/assets/portrait-original.jpg',import.meta.url))).digest('hex');
  assert.equal(hash,'0ce4ef21d3cb04a83d86ba6ba426fcf909c2a092ff69348e8e22f6b8aaa19017');
});
test('the formerly anchored inner edge now has independent travel',()=>{
  const b={x:7,y:12,sx:7,sy:12};
  for(const [x,y] of [[288,866],[283,895],[288,919],[300,945]]) {
    const p=forward(x,y,1,b);
    assert.ok(Math.hypot(p[0]-x,p[1]-y)>8);
  }
  const p=forward(340,890,1,{x:0,y:0,sx:0,sy:0});
  assert.deepEqual(p,[340,890]);
});
test('taps, drags and release keep the opposite spring and its geometry still',()=>{
  for(const side of [0,1]) {
    const p=new Physics(),[x,y]=REGIONS[side].center;
    p.down(1,x,y,0);
    for(let n=1;n<=90;n++) {
      p.move(1,x+180*Math.sin(n*.2),y+100*Math.cos(n*.2),n*16);p.advance(1/60);
      rest(p.bodies[1-side]);
      for(const q of OUTLINES[1-side])assert.deepEqual(forward(...q,1-side,p.bodies[1-side]),q);
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

// Reproduce WebGL's bilinear field sampling and channel decoding, including
// byte quantization. These tests cover the actual iterative shader algorithm.
const fields=[makeField(0),makeField(1)];
function sample(x,y,side) {
  const px=x-.5,py=y-.5,ix=Math.floor(px),iy=Math.floor(py),fx=px-ix,fy=py-iy;
  const out=[0,0,0,0],data=fields[side];
  for(let dy=0;dy<=1;dy++)for(let dx=0;dx<=1;dx++) {
    const sx=Math.max(0,Math.min(W-1,ix+dx)),sy=Math.max(0,Math.min(H-1,iy+dy));
    const weight=(dx?fx:1-fx)*(dy?fy:1-fy),i=(sy*W+sx)*4;
    for(let k=0;k<4;k++)out[k]+=data[i+k]/255*weight;
  }
  return out;
}
function gpuOffset(x,y,side,b) {
  const [w,g,blue]=sample(x,y,side),wy=w*(g*2-1),wx=w*(blue*2-1);
  return [w*b.x+.08*wy*(b.sx-b.x)+.04*wx*b.y,w*b.y+.08*wy*(b.sy-b.y)-.03*wx*b.x];
}
test('quantized layer fields invert without folds or material sampling drift',()=>{
  let minimum=Infinity,maxResidual=0;
  for(const side of [0,1])for(let angle=0;angle<32;angle++) {
    const t=angle*Math.PI/16,r=REGIONS[side].limit;
    const b={x:.8*r*Math.cos(t),y:r*Math.sin(t),sx:-.8*r*Math.cos(t),sy:-r*Math.sin(t)};
    for(let y=800;y<1010;y+=10)for(let x=145;x<600;x+=12) {
      if(matte(x,y,side)<.5)continue;
      const o=gpuOffset(x,y,side,b),ox=gpuOffset(x+.5,y,side,b),oy=gpuOffset(x,y+.5,side,b);
      const jac=(1+(ox[0]-o[0])*2)*(1+(oy[1]-o[1])*2)-(oy[0]-o[0])*2*(ox[1]-o[1])*2;
      minimum=Math.min(minimum,jac);
      const dest=[x+o[0],y+o[1]];let sx=dest[0],sy=dest[1];
      for(let i=0;i<12;i++){const d=gpuOffset(sx,sy,side,b);sx=dest[0]-d[0];sy=dest[1]-d[1];}
      maxResidual=Math.max(maxResidual,Math.hypot(sx-x,sy-y));
    }
  }
  console.log({minimumJacobian:minimum,maxInverseErrorPixels:maxResidual});
  assert.ok(minimum>.35,'each independent cutout must keep positive area');
  assert.ok(maxResidual<.08,'inverse map should sample within .08 source pixel');
});
test('idle layer coordinates stay exactly at their source positions',()=>{
  const b={x:0,y:0,sx:0,sy:0};
  for(const side of [0,1])for(let y=780;y<1010;y+=3)for(let x=140;x<600;x+=3) {
    assert.deepEqual(inverse(x,y,side,b),[x,y]);
  }
});
