import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {Physics,REGIONS,weightsAt,displace,createMesh,hitTest} from '../dist/physics.js';

const advance=(physics,seconds,hz=60)=>{for(let i=0;i<seconds*hz;i++)physics.advance(1/hz);};
const rest=b=>{for(const k of ['x','y','vx','vy','sx','sy','svx','svy'])assert.equal(b[k],0,k);};

test('original JPEG is byte-for-byte identical to the supplied attachment',()=>{
  const hash=createHash('sha256').update(readFileSync(new URL('../dist/assets/portrait-original.jpg',import.meta.url))).digest('hex');
  assert.equal(hash,'0ce4ef21d3cb04a83d86ba6ba426fcf909c2a092ff69348e8e22f6b8aaa19017');
});
test('tap, drag, and flick on either side never transfer motion at zero link',()=>{
  for(const side of [0,1]) {
    const p=new Physics(),[x,y]=REGIONS[side].center;
    assert.equal(p.settings.linked,0);
    assert.equal(p.down(7,x,y,0),side);p.up(7,80);
    for(let f=0;f<150;f++){p.advance(1/60);rest(p.bodies[1-side]);}
    assert.equal(p.down(8,x,y,3000),side);
    for(let f=1;f<21;f++) {p.move(8,x+f*30,y+f*20,3000+f*16);p.advance(1/60);rest(p.bodies[1-side]);}
    p.up(8,3322);
    for(let f=0;f<240;f++){p.advance(1/60);rest(p.bodies[1-side]);}
  }
});
test('two fingers retain separate ownership even when their paths cross',()=>{
  const p=new Physics();
  assert.equal(p.down(1,220,889,0),0);assert.equal(p.down(2,433,890,0),1);
  assert.equal(p.down(3,220,889,1),-1);
  p.move(1,600,910,60);p.move(2,100,850,60);advance(p,0.3);
  assert.ok(p.bodies[0].x>0);assert.ok(p.bodies[1].x<0);
  assert.ok(p.bodies[0].y>0);assert.ok(p.bodies[1].y<0);
  p.up(1,70);assert.equal(p.bodies[1].pointer,2);
  p.up(2,75,true);assert.equal(p.pointers.size,0);advance(p,10);rest(p.bodies[0]);rest(p.bodies[1]);
});
test('cancellation, reset, and a long background gap cannot leave a held region',()=>{
  const p=new Physics();p.down(4,220,889,0);p.move(4,2000,-2000,20);p.advance(10);
  p.up(4,30,true);advance(p,10);rest(p.bodies[0]);
  p.down(5,433,890,400);p.reset();assert.equal(p.pointers.size,0);assert.equal(p.active,false);
});
test('linking is opt-in and can produce measurable opposite-side response',()=>{
  const p=new Physics({linked:40});p.impulse(0);advance(p,0.3);
  assert.ok(Math.hypot(p.bodies[1].x,p.bodies[1].y)>0.05);
});
test('all slider extremes remain finite and bounded under repeated strong swipes, then settle',()=>{
  for(const bounce of [0,100])for(const softness of [0,100])for(const settling of [0,100])for(const linked of [0,60]) {
    const p=new Physics({bounce,softness,settling,linked});
    p.down(1,220,889,0);p.down(2,433,890,0);
    for(let f=1;f<=180;f++) {
      p.move(1,220+2000*Math.sin(f),889+2000*Math.cos(f),f*16);
      p.move(2,433-2000*Math.cos(f),890-2000*Math.sin(f),f*16);
      p.advance(f%3===0?1/30:1/120);
      p.bodies.forEach((b,i)=>{
        for(const k of ['x','y','vx','vy','sx','sy'])assert.ok(Number.isFinite(b[k]));
        assert.ok(Math.hypot(b.x/.8,b.y)<=REGIONS[i].limit+1e-8);
        assert.ok(Math.hypot(b.sx/.8,b.sy)<=REGIONS[i].limit+1e-8);
      });
    }
    p.up(1,2881);p.up(2,2881);advance(p,20);
    rest(p.bodies[0]);rest(p.bodies[1]);assert.equal(p.active,false);
  }
});
test('30, 60 and 120 Hz give equivalent spring trajectories',()=>{
  const states=[30,60,120].map(hz=>{const p=new Physics();p.impulse(1);advance(p,0.5,hz);return p.bodies[1];});
  for(const s of states)for(const key of ['x','y','vx','vy','sx','sy'])assert.ok(Math.abs(s[key]-states[0][key])<1e-9);
});
test('masks never overlap; clothing, thighs, stockings, hair, background, and crease are fixed',()=>{
  for(let y=760;y<1010;y+=3)for(let x=130;x<610;x+=3)
    assert.ok(weightsAt(x,y,0)[0]*weightsAt(x,y,1)[0]===0);
  const p=new Physics();Object.assign(p.bodies[0],{x:8,y:-12,sx:-8,sy:12});Object.assign(p.bodies[1],{x:-12,y:16,sx:12,sy:-16});
  const fixed=[[320,540],[400,750],[215,770],[530,780],[220,1030],[420,1050],
    [220,1150],[420,1190],[90,880],[630,910],[220,600],[450,300],
    [306,805],[294,837],[285,873],[286,900],[294,932],[310,958]];
  for(const [x,y] of fixed)assert.deepEqual(displace(x,y,p.bodies),[x,y],`${x},${y}`);
  assert.equal(hitTest(30,500),-1);
});
test('annotated red inner/lower area leads yellow, and green has the least motion',()=>{
  const samples={
    red:[[350,860],[355,900],[385,940],[410,965]],
    yellow:[[450,850],[460,890],[470,925]],
    green:[[545,890],[550,920]]
  };
  const means=Object.fromEntries(Object.entries(samples).map(([name,points])=>
    [name,points.reduce((sum,[x,y])=>sum+weightsAt(x,y,1)[0],0)/points.length]));
  assert.ok(means.red>1.4*means.yellow);
  assert.ok(means.yellow>2.5*means.green);
  assert.ok(weightsAt(410,965,1)[0]>0.75,'the lower red wrap should participate');
  console.log('Mean sampled response weights:',means);
});
test('connected mesh keeps positive triangle areas at extreme opposed deformations',()=>{
  const {vertices,indices}=createMesh(),count=vertices.length/8;
  assert.ok(count<65536);
  const output=new Float64Array(count*2);
  let minimum=Infinity,maximum=0;
  for(let mode=0;mode<4;mode++)for(let step=0;step<32;step++) {
    const angle=step*Math.PI/16;
    const states=REGIONS.map((r,i)=>{
      const a=angle+(i?Math.PI/2*mode:0),scale=mode===3 && i===0?0:1;
      return {x:Math.cos(a)*r.limit*.8*scale,y:Math.sin(a)*r.limit*scale};
    });
    for(let n=0;n<count;n++) {
      const o=n*8;let x=vertices[o],y=vertices[o+1];
      for(let side=0;side<2;side++) {
        const k=o+2+side*3,[w,wy,wx]=vertices.subarray(k,k+3),b=states[side];
        // Follower deliberately at the opposite travel limit (worst case).
        x+=w*b.x+0.16*wy*(-2*b.x)+0.08*wx*b.y;
        y+=w*b.y+0.16*wy*(-2*b.y)-0.055*wx*b.x;
      }
      output[n*2]=x;output[n*2+1]=y;
    }
    for(let n=0;n<indices.length;n+=3) {
      const a=indices[n],b=indices[n+1],c=indices[n+2];
      const area=(output[b*2]-output[a*2])*(output[c*2+1]-output[a*2+1])-(output[b*2+1]-output[a*2+1])*(output[c*2]-output[a*2]);
      const base=(vertices[b*8]-vertices[a*8])*(vertices[c*8+1]-vertices[a*8+1])-(vertices[b*8+1]-vertices[a*8+1])*(vertices[c*8]-vertices[a*8]);
      minimum=Math.min(minimum,area/base);maximum=Math.max(maximum,area/base);
    }
  }
  console.log(`Triangle area ratio across 128 extreme configurations: ${minimum.toFixed(4)} to ${maximum.toFixed(4)}`);
  assert.ok(minimum>0.30,`Unsafe minimum area ratio: ${minimum}`);
  assert.ok(maximum<2.1,`Excessive maximum area ratio: ${maximum}`);
});
