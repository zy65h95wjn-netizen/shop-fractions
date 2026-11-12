// Rendering-only constraints. Springs and pointer targets are not modified.
const dragBoundaryEnabled=new URLSearchParams(location.search).get('boundaries')!=='off';
const dragBoundary=[0,0];
function advanceDragBoundary(dt){
 for(let side=0;side<2;side++){
  const active=dragBoundaryEnabled&&[...pointers.values()].some(p=>p.side===side&&p.travel>8);
  dragBoundary[side]=active?Math.min(1,dragBoundary[side]+dt*18):Math.max(0,dragBoundary[side]-dt*4);
 }
}
function boundarySmooth(a,b,x){const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);}
function emberCrease(y){const t=clamp((y-1060)/170,0,1);return 365+67*t*t+7*(1-boundarySmooth(1005,1060,y));}
function emberSupport(side,x,y){return boundarySmooth(5,70,side?x-emberCrease(y):emberCrease(y)-x);}
function midnightSupport(x,y){const crease=1300-.0012*(x-285)**2;return 1-boundarySmooth(crease-65,crease,y);}
function aureliaDragWeight(side,x,y){
 const distance=Math.min(...aureliaPlanes[side].map(([nx,ny,c])=>nx*x+ny*y+c));
 const feather=boundarySmooth(0,60,distance);
 return feather*(side===0?boundarySmooth(835,915,y):1);
}
function makeDragMasks(mask,side){
 const [sx,sy,sw,sh]=fallbackRect(side),w=mask.width,h=mask.height;
 const dragMask=document.createElement('canvas'),supportMask=document.createElement('canvas'),mixedMask=document.createElement('canvas'),workMask=document.createElement('canvas');
 for(const c of [dragMask,supportMask,mixedMask,workMask]){c.width=w;c.height=h;}
 const pixels=mask.getContext('2d').getImageData(0,0,w,h),support=supportMask.getContext('2d').createImageData(w,h),id=currentCharacter().id;
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const px=sx+(x+.5)*sw/w,py=sy+(y+.5)*sh/h,at=(y*w+x)*4;let factor=1;
  if(id==='ember')factor=emberSupport(side,px,py);
  else if(id==='midnight'&&side===0)factor=midnightSupport(px,py);
  else if(id==='aurelia'){const original=aureliaSkinWeight(side,px,py);factor=original?Math.min(1,aureliaDragWeight(side,px,py)/original):0;}
  pixels.data[at+3]*=factor;support.data[at+3]=Math.round(255*factor);
 }
 dragMask.getContext('2d').putImageData(pixels,0,0);supportMask.getContext('2d').putImageData(support,0,0);
 return {dragMask,supportMask,mixedMask,workMask};
}
function fallbackDragMask(backup,side,shiftX,shiftY){
 const amount=dragBoundary[side];if(!amount)return backup.mask;
 const {mask,dragMask,supportMask,mixedMask,workMask}=backup;
 const work=workMask.getContext('2d');work.globalCompositeOperation='copy';work.drawImage(dragMask,0,0);
 if(currentCharacter().id==='ember'){
  const [, ,sw,sh]=fallbackRect(side);work.globalCompositeOperation='destination-in';
  work.drawImage(supportMask,shiftX*mask.width/sw,shiftY*mask.height/sh);
 }
 const mix=mixedMask.getContext('2d');mix.globalCompositeOperation='copy';mix.globalAlpha=1-amount;mix.drawImage(mask,0,0);
 mix.globalCompositeOperation='lighter';mix.globalAlpha=amount;mix.drawImage(workMask,0,0);mix.globalAlpha=1;
 return mixedMask;
}
