import {Physics,ROI,GRID,GW,GH,masks,sample} from '../redhead-soft-tissue/physics.js';
import {pinch,parameters} from './kelvinlet.js';
import {measure} from './quality.js';
export * from '../redhead-soft-tissue/physics.js';
export const modes=['A','A+','B'];
const active=[];
for(let j=0;j<GH;j++)for(let i=0;i<GW;i++){const k=j*GW+i,s=masks[0][k]>0?0:masks[1][k]>0?1:-1;if(s>=0)active.push({k,s,x:ROI[0]+i*GRID,y:ROI[1]+j*GRID});}
export {active};
// Extends only the read-only deformation field. Constructor, input handlers,
// contact/rebound states, all springs, integration and timing are inherited.
export class Comparison extends Physics{
 constructor(){super();this.match=[1,1];this.safety=1;this.cache=null;}
 velocity(x,y,s,mode='A',factor=1){
  if(mode==='A')return super.velocity(x,y,s,'A');
  let dx=0,dy=0,sum=0;
  for(let j=0;j<3;j++){const n=this.nodes[s*3+j],w=Math.exp(-1.75*(((x-n.x)/n.rx)**2+((y-n.y)/n.ry)**2));dx+=n.dx*w;dy+=n.dy*w;sum+=w;}
  const c=this.nodes[s*3+1],f=this.followers[s],p=this.impacts[s],hx=x-p.x,hy=y-p.y;
  dx=c.dx*.65+dx*.35/Math.max(sum,.0001)+f.dx*.5;
  dy=c.dy*.65+dy*.35/Math.max(sum,.0001)+f.dy*.8;
  if(mode==='A+'){
   const pressure=Math.exp(-2.6*((hx/64)**2+(hy/56)**2))*(p.v*.08-p.contact*.09)*factor;
   dx+=hx*pressure;dy+=hy*pressure;
  }else if(mode==='B'){
   // Same signed load history as A: .08*v - .09*contact, factored by -.09.
   // No added spring, delayed bulge oscillator, or change to bulk motion.
   const q=p.contact-(8/9)*p.v,v=pinch(hx,hy,parameters.strain*q*factor);dx+=v[0];dy+=v[1];
  }
  const len=Math.hypot(dx,dy),gain=len>16?(16+8*(1-Math.exp(-(len-16)/8)))/len:1;
  return [dx*gain,dy*gain];
 }
 mapPoint(x,y,s,mode,factor=1){
  const [vx,vy]=this.velocity(x,y,s,mode,factor);let sx=x,sy=y;
  for(let k=0;k<6;k++){const m=sample(masks[s],sx,sy)/6;sx-=vx*m;sy-=vy*m;}
  return [sx-x,sy-y];
 }
 rawField(mode,factors=[1,1]){
  if(mode==='A')return super.field('A');
  const out=new Float32Array(GW*GH*2);
  for(const {k,s,x,y} of active){const p=this.mapPoint(x,y,s,mode,factors[s]);out[k*2]=p[0];out[k*2+1]=p[1];}return out;
 }
 // Strength is measured after masking/backtracing, as RMS of the extra inverse
 // displacement relative to the SAME zero-pressure bulk map. The matching set
 // uses lattice vertices within a 14px contact disk (all have guard=1 unless at
 // a support rim). Final renderer interpolation errors are measured separately.
 fields(){
  const A=this.rawField('A'),bulk=this.rawField('bulk'),B=this.rawField('B');
  const matches=[];
  for(let s=0;s<2;s++){
   const p=this.impacts[s],points=active.filter(v=>v.s===s&&(v.x-p.x)**2+(v.y-p.y)**2<=parameters.contactRadius**2);
   const rms=field=>Math.sqrt(points.reduce((sum,v)=>sum+(field[v.k*2]-bulk[v.k*2])**2+(field[v.k*2+1]-bulk[v.k*2+1])**2,0)/Math.max(1,points.length));
   const target=rms(B),base=rms(A);
   const candidateRms=f=>Math.sqrt(points.reduce((sum,v)=>{const q=this.mapPoint(v.x,v.y,s,'A+',f);return sum+(q[0]-bulk[v.k*2])**2+(q[1]-bulk[v.k*2+1])**2;},0)/Math.max(1,points.length));
   let lo=1,hi=8;
   if(target>base+1e-8){for(let n=0;n<15;n++){const mid=(lo+hi)/2;if(candidateRms(mid)<target)lo=mid;else hi=mid;}}else hi=1;
   const gain=(lo+hi)/2;matches.push({side:s,gain,target,base,achieved:candidateRms(gain),points:points.length,limited:target<base-1e-5||gain>7.99});
  }
  const AP=this.rawField('A+',matches.map(m=>m.gain));
  // Final-composition guard, never a change to the baseline or spring engine.
  // Do not let a new contact method introduce folding or materially worsen
  // inherited support-band strain. Baseline strain itself is reported, not hidden.
  const qa=measure(A,4),qp=measure(AP,4),qb=measure(B,4);
  const unsafe=q=>q.minDet<.20||q.maxStretch>Math.max(2.25,qa.maxStretch*1.10)||q.minStretch<Math.min(.45,qa.minStretch*.9)||q.maxShear>Math.max(.65,qa.maxShear*1.10);
  this.safety={fallback:unsafe(qp)||unsafe(qb),baselineStrain:qa.maxStretch>2.25||qa.minStretch<.45,baseline:qa};
  this.match=matches;this.cache=this.safety.fallback?{A,'A+':A,B:A,bulk}:{A,'A+':AP,B,bulk};return this.cache;
 }
}
