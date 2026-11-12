import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {coefficients,kernel2D,affine2D,compound,compoundAffine,unitPinchForce,parameters,pinch} from '../kelvinlet.js';
const out=process.argv[2]||'/tmp/kelvinlet-math.json';let derivativeError=0,pinchError=0,centerError=0;
// Independent derivative of Eq.25, not a restatement of the Eq.26 code.
for(const [x,y] of [[0,0],[2,7],[-17,11],[35,-9],[100,130]])for(const F of [[1,2,3,4],[1,0,0,-1],[0,-1,1,0],[2,0,0,2]])for(const epsilon of [2,28,33.88]){
 const h=epsilon*1e-4,dx=kernel2D(x+h,y,epsilon).map((v,i)=>(v-kernel2D(x-h,y,epsilon)[i])/(2*h)),dy=kernel2D(x,y+h,epsilon).map((v,i)=>(v-kernel2D(x,y-h,epsilon)[i])/(2*h));
 const expected=[dx[0]*F[0]+dy[0]*F[1]+dx[1]*F[2]+dy[1]*F[3],dx[2]*F[0]+dy[2]*F[1]+dx[3]*F[2]+dy[3]*F[3]],actual=affine2D(x,y,epsilon,F);
 derivativeError=Math.max(derivativeError,...actual.map((v,i)=>Math.abs(v-expected[i])));
}
// Independently evaluate supplement B Eq.14 for symmetric traceless F.
for(const [x,y] of [[0,0],[4,7],[-20,40],[100,100]]){const e=28,s=x*x+y*y+e*e,{a,b}=coefficients(),F=[2,3,3,-2],fr=[2*x+3*y,3*x-2*y],q=x*fr[0]+y*fr[1];const expected=fr.map((f,i)=>-2*a*(1/s+e*e/(s*s))*f+4*b*(f/s-q*[x,y][i]/(s*s)));const got=affine2D(x,y,e,F);pinchError=Math.max(pinchError,...got.map((v,i)=>Math.abs(v-expected[i])));}
const h=1e-3;const center=[(pinch(h,0,1)[0]-pinch(-h,0,1)[0])/(2*h),(pinch(0,h,1)[1]-pinch(0,-h,1)[1])/(2*h)];centerError=Math.max(Math.abs(center[0]-1),Math.abs(center[1]+1));
const moments=[compound.w.reduce((a,b)=>a+b,0),compound.w.reduce((a,w,i)=>a+w*compound.e[i]**2,0)];
const decay=[100,200,400,800].map(r=>({r,norm:Math.hypot(...compoundAffine(r,r*.37,unitPinchForce))}));
const slopes=decay.slice(1).map((d,i)=>Math.log2(decay[i].norm/d.norm));
assert(derivativeError<1e-8);assert(pinchError<1e-12);assert(centerError<1e-6);assert(Math.abs(moments[0])<1e-12&&Math.abs(moments[1])<1e-10);assert(slopes.at(-1)>4.8);
const result={formulation:'2D Eq.25 differentiated against Eq.26; supplement B Eq.14 and center Eq.15',derivativeError,pinchError,center,centerError,moments,decay,slopes,parameters,compound};writeFileSync(out,JSON.stringify(result,null,2));console.log(result);
