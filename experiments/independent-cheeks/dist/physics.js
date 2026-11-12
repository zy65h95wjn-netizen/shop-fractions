// Coordinates always use the unmodified 756 × 1280 source photograph.
export const WIDTH = 756;
export const HEIGHT = 1280;
export const DEFAULTS = Object.freeze({ bounce: 55, softness: 55, settling: 60, linked: 0 });
export const REGIONS = [
  {
    name: 'left', center: [220, 889], radius: [78, 101], limit: 16, feather: 45,
    // Inset from the skirt, outer silhouette, center crease, and lower fold.
    outline: [[190,811],[218,794],[252,792],[274,797],[299,806],[291,833],
      [282,864],[279,895],[283,923],[294,950],[306,966],[278,977],
      [238,980],[200,976],[174,965],[155,946],[145,919],[143,890],
      [149,858],[165,831]]
  },
  {
    // Broader response toward the annotated inner/lower curve; retain a
    // stationary crease and a smooth transition above the unaffected thigh.
    name: 'right', center: [375, 890], radius: [148, 120], limit: 22, feather: 76,
    // Red leads along the inner mass and wraps under it. Yellow follows;
    // the outer green area has the weakest response. These overlapping smooth
    // fields are weights, not image layers, so there are no color-band seams.
    response: { innerX: 340, innerWidth: 95, lower: [420, 965],
      lowerRadius: [105, 55], base: 0.22, innerGain: 1.25, lowerGain: 1.05, cap: 1.55 },
    outline: [[316,805],[344,788],[378,786],[407,788],[426,780],[444,788],
      [474,795],[498,801],[523,799],[538,816],[551,842],[570,862],
      [582,882],[588,915],[586,948],[576,975],[550,994],[505,1003],
      [457,1007],[410,1005],[369,996],[337,980],[313,957],[299,930],
      [289,904],[288,877],[295,849],[304,825]]
  }
];

export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const smooth = x => { x = clamp(x, 0, 1); return x*x*(3 - 2*x); };

export function signedDistance(x, y, polygon) {
  let inside = false, distance = Infinity;
  for (let i=0, j=polygon.length-1; i<polygon.length; j=i++) {
    const [ax, ay] = polygon[j], [bx, by] = polygon[i];
    if ((ay > y) !== (by > y) && x < (bx-ax)*(y-ay)/(by-ay)+ax) inside = !inside;
    const dx = bx-ax, dy = by-ay;
    const t = clamp(((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy), 0, 1);
    distance = Math.min(distance, Math.hypot(x-ax-t*dx, y-ay-t*dy));
  }
  return inside ? distance : -distance;
}

export function weightsAt(x, y, side) {
  const r = REGIONS[side];
  let w = smooth(signedDistance(x, y, r.outline)/r.feather);
  if (r.response) {
    const f = r.response;
    const inner = Math.exp(-(((x-f.innerX)/f.innerWidth)**2));
    const lower = Math.exp(-(((x-f.lower[0])/f.lowerRadius[0])**2 + ((y-f.lower[1])/f.lowerRadius[1])**2));
    const weighted = w*(f.base+f.innerGain*inner+f.lowerGain*lower);
    w = f.cap*Math.tanh(weighted/f.cap);
  }
  return [w, w*clamp((y-r.center[1])/r.radius[1], -1, 1),
    w*clamp((x-r.center[0])/r.radius[0], -1, 1)];
}

export function hitTest(x, y) {
  return REGIONS.findIndex(r => signedDistance(x, y, r.outline) > 0);
}

function limitVector(x, y, limit) {
  const n = Math.hypot(x/0.8, y);
  const scale = n > limit ? limit/n : 1;
  return [x*scale, y*scale];
}

function softTarget(x, y, limit) {
  const n = Math.hypot(x/0.8, y);
  const scale = n > 0 ? limit*Math.tanh(n/limit)/n : 1;
  return [x*scale, y*scale];
}

function makeBody() {
  return { x:0, y:0, vx:0, vy:0, sx:0, sy:0, svx:0, svy:0,
    tx:0, ty:0, pointer:null, sleeping:true };
}

export class Physics {
  constructor(settings = {}) {
    this.settings = { ...DEFAULTS, ...settings };
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
    if (name in DEFAULTS && Number.isFinite(value)) this.settings[name] = clamp(value, 0, name === 'linked' ? 60 : 100);
  }
  down(id, x, y, time) {
    const side = hitTest(x, y);
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
    const [tx,ty] = softTarget(p.ox+(x-p.x)*gain, p.oy+(y-p.y)*gain, REGIONS[p.side].limit);
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
    const {bounce,softness,settling,linked}=this.settings;
    const omega=19-softness*0.085;
    const damping=clamp(0.50+settling*0.006-bounce*0.0045, 0.18, 1.15);
    const stiffness=omega*omega;
    // The coupling coefficient is exactly zero at the default setting.
    const coupling=stiffness*(linked/100)*0.65;
    const before=this.bodies.map(b=>({x:b.x,y:b.y}));
    this.bodies.forEach((b,i)=>{
      const held=b.pointer !== null;
      const k=held ? 1500 : stiffness;
      const drag=held ? 62 : 2*damping*omega;
      const targetX=held ? b.tx : 0, targetY=held ? b.ty : 0;
      const other=before[1-i], self=before[i];
      b.vx += (k*(targetX-b.x)-drag*b.vx+coupling*(other.x-self.x))*dt;
      b.vy += (k*(targetY-b.y)-drag*b.vy+coupling*(other.y-self.y))*dt;
      b.x += b.vx*dt; b.y += b.vy*dt;
      const limit=REGIONS[i].limit;
      const [lx,ly]=limitVector(b.x,b.y,limit);
      if (lx !== b.x || ly !== b.y) {
        // Remove only outward velocity at the elliptical travel boundary.
        const nx=lx/(0.8*0.8), ny=ly;
        const outward=(b.vx*nx+b.vy*ny)/(nx*nx+ny*ny);
        if (outward>0) { b.vx-=outward*nx; b.vy-=outward*ny; }
        b.x=lx; b.y=ly;
      }
      // A separate, critically damped follower gives subtle peripheral lag.
      b.svx += (225*(b.x-b.sx)-27*b.svx)*dt;
      b.svy += (225*(b.y-b.sy)-27*b.svy)*dt;
      b.sx += b.svx*dt; b.sy += b.svy*dt;
      [b.sx,b.sy]=limitVector(b.sx,b.sy,limit);
      const quiet=Math.max(Math.abs(b.x),Math.abs(b.y),Math.abs(b.sx),Math.abs(b.sy))<0.008 &&
        Math.max(Math.abs(b.vx),Math.abs(b.vy),Math.abs(b.svx),Math.abs(b.svy))<0.035;
      if (!held && quiet && (coupling===0 || Math.hypot(other.x,other.y)<0.008)) {
        Object.assign(b,makeBody());
      } else b.sleeping=false;
    });
  }
  get active() { return this.bodies.some(b=>!b.sleeping); }
}

// Shared with the GPU formula; tests check the full connected mesh at extreme
// legal positions, including deliberately opposed secondary motion.
export function displace(x,y,bodies) {
  let dx=0,dy=0;
  for(let i=0;i<2;i++) {
    const [w,wy,wx]=weightsAt(x,y,i), b=bodies[i];
    dx+=w*b.x+0.16*wy*(b.sx-b.x)+0.08*wx*b.y;
    dy+=w*b.y+0.16*wy*(b.sy-b.y)-0.055*wx*b.x;
  }
  return [x+dx,y+dy];
}

export function createMesh() {
  const columns=126, rows=214;
  const vertices=new Float32Array((columns+1)*(rows+1)*8);
  const indices=new Uint16Array(columns*rows*6);
  let v=0,t=0;
  for(let y=0;y<=rows;y++) for(let x=0;x<=columns;x++) {
    const px=x*WIDTH/columns, py=y*HEIGHT/rows;
    vertices.set([px,py,...weightsAt(px,py,0),...weightsAt(px,py,1)],v); v+=8;
    if(x<columns && y<rows) {
      const a=y*(columns+1)+x,b=a+1,c=a+columns+1,d=c+1;
      indices.set([a,b,c,b,d,c],t); t+=6;
    }
  }
  return {vertices,indices,columns,rows};
}
