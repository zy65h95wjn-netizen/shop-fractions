import {W,H,OUTLINES,CENTERS,matte,clamp} from './layers.js';
import {inverse} from './surface.js';
export const WIDTH=W,HEIGHT=H;
export const DEFAULTS=Object.freeze({bounce:55,softness:55,settling:60});
export const REGIONS=OUTLINES.map((outline,i)=>({name:i===0?'left':'right',
  center:CENTERS[i],outline,limit:i===0?16:22}));
export function hitTest(x,y,bodies){
  // Pick the visible foreground layer, including while it is rebounding over
  // the neighboring layer. Pointer ownership stays fixed after the grab.
  for(const side of [1,0]){
    const source=bodies?inverse(x,y,side,bodies[side]):[x,y];
    if(matte(...source,side)>.5)return side;
  }
  return -1;
}

function horizontalScale(x,side) {
  return side===1 ? (x>0 ? 0.30 : 0.8) : (x<0 ? 0.35 : 0.8);
}
function limitVector(x, y, limit, side) {
  const n = Math.hypot(x/horizontalScale(x,side), y);
  const scale = n > limit ? limit/n : 1;
  return [x*scale, y*scale];
}

function softTarget(x, y, limit, side) {
  const n = Math.hypot(x/horizontalScale(x,side), y);
  const scale = n > 0 ? limit*Math.tanh(n/limit)/n : 1;
  return [x*scale, y*scale];
}

function makeBody() {
  return { x:0, y:0, vx:0, vy:0, z:0, vz:0, sx:0, sy:0, svx:0, svy:0,
    tx:0, ty:0, pointer:null, sleeping:true };
}

export class Physics {
  constructor(settings = {}) {
    this.settings = { ...DEFAULTS };
    for (const [key,value] of Object.entries(settings)) this.set(key,value);
    this.bodies = [makeBody(), makeBody()];
    this.pointers = new Map();
    this.accumulator = 0;
  }
  reset() {
    this.bodies = [makeBody(), makeBody()];
    this.pointers.clear();
    this.accumulator = 0;
  }
  set(name, value) {
    if (Object.hasOwn(DEFAULTS,name) && Number.isFinite(value)) this.settings[name] = clamp(value, 0, 100);
  }
  down(id, x, y, time) {
    const side = hitTest(x, y, this.bodies);
    if (side < 0 || this.bodies[side].pointer !== null) return -1;
    const b = this.bodies[side];
    this.pointers.set(id, { side, x, y, time, last:time, moved:0,
      ox:b.x, oy:b.y, lastX:b.x, lastY:b.y, vx:0, vy:0 });
    b.pointer = id; b.tx=b.x; b.ty=b.y; b.sleeping=false;
    return side;
  }
  move(id, x, y, time) {
    const p = this.pointers.get(id);
    if (!p) return;
    const b = this.bodies[p.side];
    const gain = 0.75 + this.settings.softness*0.006;
    const [tx,ty] = softTarget(p.ox+(x-p.x)*gain, p.oy+(y-p.y)*gain, REGIONS[p.side].limit,p.side);
    const dt = clamp((time-p.last)/1000, 1/240, 0.08);
    const mix = 1-Math.exp(-dt/0.035);
    p.vx += ((tx-p.lastX)/dt-p.vx)*mix;
    p.vy += ((ty-p.lastY)/dt-p.vy)*mix;
    p.lastX=tx; p.lastY=ty; p.last=time;
    p.moved=Math.max(p.moved, Math.hypot(x-p.x, y-p.y));
    b.tx=tx; b.ty=ty;
  }
  up(id, time, cancelled=false) {
    const p=this.pointers.get(id);
    if (!p) return;
    const b=this.bodies[p.side];
    b.pointer=null;
    this.pointers.delete(id);
    if (cancelled) { b.vx=0; b.vy=0; return; }
    if (p.moved < 9 && time-p.time < 350) this.impulse(p.side);
    else if (time-p.last < 100) {
      // Velocity is measured after the soft travel limit: large swipes cannot
      // inject unbounded energy or change the opposite body's state.
      const gain=0.35+this.settings.bounce*0.005;
      b.vx += clamp(p.vx*gain, -320, 320);
      b.vy += clamp(p.vy*gain, -380, 380);
    }
  }
  impulse(side) {
    const b=this.bodies[side];
    if (!b || b.pointer !== null) return;
    b.vy -= 85 + this.settings.bounce*1.55;
    b.vz += 32+this.settings.bounce*.35;
    b.vx += side === 0 ? -12 : 12;
    b.sleeping=false;
  }
  advance(elapsed) {
    // Fixed-step integration is consistent at 30, 60, and 120 Hz. Discard
    // excess time after suspension instead of trying to catch up in one frame.
    this.accumulator += clamp(elapsed, 0, 1/15);
    const step=1/240;
    while (this.accumulator >= step) { this.step(step); this.accumulator -= step; }
  }
  step(dt) {
    const {bounce,softness,settling}=this.settings;
    const omega=19-softness*0.085;
    const damping=clamp(0.50+settling*0.006-bounce*0.0045, 0.18, 1.15);
    const stiffness=omega*omega;
    this.bodies.forEach((b,i)=>{
      const held=b.pointer !== null;
      const k=held ? 1500 : stiffness;
      const drag=held ? 62 : 2*damping*omega;
      const targetX=held ? b.tx : 0, targetY=held ? b.ty : 0;
      b.vx += (k*(targetX-b.x)-drag*b.vx)*dt;
      b.vy += (k*(targetY-b.y)-drag*b.vy)*dt;
      b.x += b.vx*dt; b.y += b.vy*dt;
      const limit=REGIONS[i].limit;
      const [lx,ly]=limitVector(b.x,b.y,limit,i);
      if (lx !== b.x || ly !== b.y) {
        // Remove only outward velocity at the elliptical travel boundary.
        const scaleX=horizontalScale(lx,i);
        const nx=lx/(scaleX*scaleX), ny=ly;
        const outward=(b.vx*nx+b.vy*ny)/(nx*nx+ny*ny);
        if (outward>0) { b.vx-=outward*nx; b.vy-=outward*ny; }
        b.x=lx; b.y=ly;
      }
      // A separate, critically damped follower gives subtle peripheral lag.
      b.svx += (225*(b.x-b.sx)-27*b.svx)*dt;
      b.svy += (225*(b.y-b.sy)-27*b.svy)*dt;
      b.sx += b.svx*dt; b.sy += b.svy*dt;
      [b.sx,b.sy]=limitVector(b.sx,b.sy,limit,i);
      const depthTarget=held?Math.hypot(b.tx,b.ty)*.15:0;
      b.vz+=(stiffness*1.2*(depthTarget-b.z)-2*.72*omega*b.vz)*dt;
      b.z+=b.vz*dt;
      const depthLimit=i===0?8:12;
      if(Math.abs(b.z)>depthLimit){b.z=Math.sign(b.z)*depthLimit;b.vz=0;}
      const quiet=Math.abs(b.z)<.008 && Math.abs(b.vz)<.035 && Math.max(Math.abs(b.x),Math.abs(b.y),Math.abs(b.sx),Math.abs(b.sy))<0.008 &&
        Math.max(Math.abs(b.vx),Math.abs(b.vy),Math.abs(b.svx),Math.abs(b.svy))<0.035;
      if (!held && quiet) {
        Object.assign(b,makeBody());
      } else b.sleeping=false;
    });
  }
  get active() { return this.bodies.some(b=>!b.sleeping); }
}

