// Inserted only in isolated review runners. No new rendering architecture.
const artParams=new URLSearchParams(location.search);
const artVariant='__BASELINE__'==='r5'?'r5':(artParams.get('variant')==='simple'?'simple':'r6');
const artInputWeight=hollyMotionWeight;
if(artVariant==='simple'){
 // One bounded calibration trial: release the r6 outer guard and put the
 // feather 18 source pixels beyond its existing outer support planes.
 // Interior gain, velocity, six-step remap, lower lacing and springs stay intact.
 hollyMotionWeight=function(side,x,y){
  const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
  const edge=smooth(Math.min(...hollyMotionPlanes[side].map(([nx,ny,c],i)=>{
   const outer=(side===0&&i>=9&&i<=17)||(side===1&&i>=2&&i<=9);
   return (nx*x+ny*y+c+(outer?18:0))/(outer?20:32);
  })));
  const low=smooth((y-560)/30);
  const lace=side===0?smooth((374-x)/20):smooth((x-440)/24);
  return edge*(1-low*(1-lace));
 };
}
window.__artLab={
 reset,step,render,model,nodes,followers,impacts,waves,chooseCharacter,
 raw:()=>JSON.parse(JSON.stringify({nodes,followers,impacts,waves})),
 setState:s=>{for(const key of ['nodes','followers','impacts','waves'])s[key].forEach((v,i)=>Object.assign({nodes,followers,impacts,waves}[key][i],v));render();},
 tap:(side=0)=>{const [x,y]=currentCharacter().impactCenters[side];slap(side,x,y,{sx:ox+x/W*drawW,sy:oy+y/H*drawH});},
 capture:()=>{render();return canvas.toDataURL();},
 ready:()=>!!img&&!characterSwitchPending,
 info:()=>({variant:artVariant,backend:fallback?'canvas':'webgl',character:currentCharacter().id,width:W,height:H,framing:{x:ox,y:oy,width:drawW,height:drawH},calibration:currentCharacter(),crop:HOLLY_CROP}),
 inputSide:(x,y)=>pickSide(x,y),
 mask:()=>{
  const c=currentCharacter();
  const box=c.id==='holly'?[160,352,496,336]:c.id==='aurelia'?[100,750,556,300]:c.id==='midnight'?[80,930,760,500]:[45,850,840,570];
  const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
  const weight=(side,x,y)=>{
   if(c.id==='holly')return hollyMotionWeight(side,x,y);
   if(c.id==='aurelia')return aureliaSkinWeight(side,x,y);
   if(c.id==='midnight'&&side===0)return leftSkinWeight(x,y);
   const z=regions[side],qx=(x-z.x)/z.rx,qy=(y-z.y)/z.ry;
   const mix=smooth(c.split[0],c.split[1],x/W);
   const taper=side===1?(1-c.taper[0]*smooth(.69,.81,y/H))*(1-c.taper[1]*smooth(.55,.97,qx)):1;
   return (1-smooth(.48,.98,Math.hypot(qx,qy)))*smooth(c.bounds[0],c.bounds[1],y/H)*(1-smooth(c.bounds[2],c.bounds[3],y/H))*taper*(side===0?1-mix:mix);
  };
  const pixels=[];
  for(let y=0;y<box[3];y++)for(let x=0;x<box[2];x++)pixels.push(Math.round(255*Math.max(weight(0,x+box[0]+.5,y+box[1]+.5),weight(1,x+box[0]+.5,y+box[1]+.5))));
  return {box,pixels};
 },
 // Diagnostic sampling of the existing six-step Canvas map; not a new renderer.
 points:points=>points.map(([x,y,side])=>{
  const [cx,cy,w,h]=HOLLY_CROP;
  const weight=(x,y)=>{
   x=clamp(x-cx-.5,0,w-1.001);y=clamp(y-cy-.5,0,h-1.001);
   const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,i=(iy*w+ix)*4+side;
   return ((hollyMaskPixels[i]*(1-fx)+hollyMaskPixels[i+4]*fx)*(1-fy)+(hollyMaskPixels[i+w*4]*(1-fx)+hollyMaskPixels[i+w*4+4]*fx)*fy)/255;
  };
  let sx=x,sy=y;const v=hollyVelocity(x,y,side);
  for(let k=0;k<6;k++){const a=weight(sx,sy)/6;sx-=v[0]*a;sy-=v[1]*a;}
  return {x,y,side,dx:x-sx,dy:y-sy,weight:hollyMotionWeight(side,x,y)};
 })
};
