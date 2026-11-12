import {GW,GH,ROI,GRID,sample} from '../redhead-soft-tissue/physics.js';
import {guard} from './render.js';
const [X,Y,W,H]=ROI;
export function guardAt(x,y){
 const gx=Math.max(0,Math.min(W-1.00001,x-X-.5)),gy=Math.max(0,Math.min(H-1.00001,y-Y-.5));const ix=Math.floor(gx),iy=Math.floor(gy),fx=gx-ix,fy=gy-iy,k=iy*W+ix;
 if(x<X||y<Y||x>=X+W||y>=Y+H)return 0;
 return ((guard[k]*(1-fx)+guard[k+1]*fx)*(1-fy)+(guard[k+W]*(1-fx)+guard[k+W+1]*fx)*fy)/255;
}
export function offset(field,x,y,quantize=false){
 // WebGL RGBA map is encoded at 1/1024 px; Canvas uses float field directly.
 const g=guardAt(x,y);return [sample(field,x,y,2,0)*g,sample(field,x,y,2,1)*g];
}
export function quantized(field){return Float32Array.from(field,v=>Math.round(v*1024)/1024);}
export function gradient(field,x,y,h=.5){
 const xp=offset(field,x+h,y),xm=offset(field,x-h,y),yp=offset(field,x,y+h),ym=offset(field,x,y-h);
 return [1+(xp[0]-xm[0])/(2*h),(yp[0]-ym[0])/(2*h),(xp[1]-xm[1])/(2*h),1+(yp[1]-ym[1])/(2*h)];
}
export function invariants(J){
 const [a,b,c,d]=J,det=a*d-b*c,tr=a*a+b*b+c*c+d*d,disc=Math.sqrt(Math.max(0,tr*tr-4*det*det));
 const lo=Math.sqrt(Math.max(0,(tr-disc)/2)),hi=Math.sqrt(Math.max(0,(tr+disc)/2));
 // J is the inverse sampling map. Forward stretches are reciprocals; forward
 // symmetric shear is measured on inverse(J)-I, not mislabeled texture strain.
 return {det,lo,hi,forwardMin:hi?1/hi:Infinity,forwardMax:lo?1/lo:Infinity,shear:det?Math.abs((b+c)/(2*det)):Infinity};
}
export function measure(field,spacing=2){
 let minDet=Infinity,maxDet=-Infinity,minStretch=Infinity,maxStretch=0,maxShear=0,maxDisplacement=0;
 for(let y=Y+.5;y<Y+H-1;y+=spacing)for(let x=X+.5;x<X+W-1;x+=spacing){const v=offset(field,x,y),q=invariants(gradient(field,x,y));maxDisplacement=Math.max(maxDisplacement,Math.hypot(...v));minDet=Math.min(minDet,q.det);maxDet=Math.max(maxDet,q.det);minStretch=Math.min(minStretch,q.forwardMin);maxStretch=Math.max(maxStretch,q.forwardMax);maxShear=Math.max(maxShear,q.shear);}
 return {minDet,maxDet,minStretch,maxStretch,maxShear,maxDisplacement};
}
