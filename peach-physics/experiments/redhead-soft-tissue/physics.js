// Isolated adaptation of r10 (4673895), v8/index.html: step, impulse,
// followers, hollyVelocity. Source coordinates are always original JPEG pixels.
export const W=756,H=1280,ROI=[240,390,336,168],GRID=2;
export const contours=[
 [[287,418],[327,400],[365,407],[395,435],[410,474],[415,516],[407,540],[390,522],[360,501],[330,482],[299,469],[277,455]],
 [[430,436],[465,416],[500,424],[531,447],[551,473],[529,479],[501,494],[473,513],[445,537],[430,545],[422,520],[421,475]]
];
export const centers=[[351,462],[480,467]];
export const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const smooth=x=>{x=clamp(x,0,1);return x*x*(3-2*x);};
// Distance to a hand-traced closed contour. Unlike half-plane clipping, this
// supports concave boundaries and gives a smooth inward-only support margin.
export function mask(x,y,side){
 const p=contours[side];let inside=false,d=Infinity;
 for(let i=0,j=p.length-1;i<p.length;j=i++){
  const [ax,ay]=p[j],[bx,by]=p[i],dx=bx-ax,dy=by-ay;
  if((ay>y)!==(by>y)&&x<(bx-ax)*(y-ay)/(by-ay)+ax)inside=!inside;
  const t=clamp(((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy),0,1);
  d=Math.min(d,Math.hypot(x-ax-t*dx,y-ay-t*dy));
 }
 return inside?smooth(d/17):0;
}
export const GW=ROI[2]/GRID+1,GH=ROI[3]/GRID+1;
export const masks=[new Float32Array(GW*GH),new Float32Array(GW*GH)];
for(let j=0;j<GH;j++)for(let i=0;i<GW;i++)for(let s=0;s<2;s++)masks[s][j*GW+i]=mask(ROI[0]+i*GRID,ROI[1]+j*GRID,s);
export function sample(a,x,y,stride=1,channel=0){
 const gx=clamp((x-ROI[0])/GRID,0,GW-1.00001),gy=clamp((y-ROI[1])/GRID,0,GH-1.00001);
 const ix=Math.floor(gx),iy=Math.floor(gy),fx=gx-ix,fy=gy-iy,k=(iy*GW+ix)*stride+channel;
 return (a[k]*(1-fx)+a[k+stride]*fx)*(1-fy)+(a[k+GW*stride]*(1-fx)+a[k+(GW+1)*stride]*fx)*fy;
}
export class Physics{
 constructor(){
  this.nodes=[{side:0,x:345,y:429,rx:48,ry:31},{side:0,x:351,y:464,rx:53,ry:40},{side:0,x:388,y:512,rx:29,ry:27},{side:1,x:475,y:438,rx:42,ry:30},{side:1,x:481,y:470,rx:47,ry:39},{side:1,x:447,y:518,rx:29,ry:26}];
  this.reset();
 }
 reset(){
  this.nodes.forEach(n=>Object.assign(n,{dx:0,dy:0,vx:0,vy:0}));
  this.followers=[0,1].map(()=>({dx:0,dy:0,vx:0,vy:0}));
  this.impacts=centers.map(([x,y])=>({x,y,v:0,contact:0,target:0,bulge:0,bv:0}));
  this.pointers=new Map();this.time=0;this.lastGesture='rest';
 }
 pick(x,y){const w=masks.map(a=>sample(a,x,y));return Math.max(...w)>.1?(w[0]>w[1]?0:1):-1;}
 down(id,x,y){
  const side=this.pick(x,y);if(side<0||[...this.pointers.values()].some(p=>p.side===side))return false;
  this.pointers.set(id,{side,x,y,start:this.time,last:this.time,travel:0,vx:0,vy:0});
  Object.assign(this.impacts[side],{x,y,target:.77});this.impulse(side,x,y,.15);return true;
 }
 move(id,x,y){
  const p=this.pointers.get(id);if(!p)return;
  const dt=clamp(this.time-p.last,.012,.065),dx=x-p.x,dy=y-p.y;
  p.travel+=Math.hypot(dx,dy);p.vx=clamp(p.vx*.55+dx/dt*.45,-1100,1100);p.vy=clamp(p.vy*.55+dy/dt*.45,-1100,1100);
  for(const n of this.nodes.filter(n=>n.side===p.side)){
   const q=((x-n.x)/n.rx)**2+((y-n.y)/n.ry)**2,w=.2+.8*Math.exp(-q*1.4);
   n.dx=clamp(n.dx+dx*.17*w*.95,-26,26);n.dy=clamp(n.dy+dy*.17*w*.95,-30,30);
   n.vx=clamp(n.vx+dx/dt*.055*w*.95,-600,600);n.vy=clamp(n.vy+dy/dt*.055*w*.95,-600,600);
  }
  // Freeze contact at the last valid skin point when a captured pointer leaves.
  if(this.pick(x,y)===p.side)Object.assign(this.impacts[p.side],{x,y});
  Object.assign(p,{x,y,last:this.time});this.lastGesture='drag';
 }
 up(id,cancel=false){
  const p=this.pointers.get(id);if(!p)return;
  const speed=Math.hypot(p.vx,p.vy),hit=this.impacts[p.side];
  if(!cancel&&p.travel<12&&this.time-p.start<.4){this.impulse(p.side,hit.x,hit.y,.7);this.lastGesture='tap';}
  else if(!cancel&&p.travel>25&&speed>175&&this.time-p.last<.135){this.impulse(p.side,hit.x,hit.y,clamp(speed/900,.32,.9),p.vx,p.vy,true);this.lastGesture='flick';}
  else this.lastGesture=cancel?'cancelled':'release';
  hit.target=0;this.pointers.delete(id);
 }
 cancel(){for(const id of this.pointers.keys())this.up(id,true);}
 impulse(side,x,y,amplitude=1,vx=0,vy=0,flick=false){
  const power=(.43+55*.011)*amplitude*1.06*(.65+55*.009);
  const px=flick?clamp(vx*.35,-320,320):(side?48:-48),py=flick?clamp(vy*.35,-350,350):185;
  this.nodes.forEach((n,i)=>{if(n.side!==side)return;const w=(.22+.78*Math.exp(-1.1*(((x-n.x)/n.rx)**2+((y-n.y)/n.ry)**2)))*(i%3===2?.88:1);n.vx=clamp(n.vx+px*power*w,-560,560);n.vy=clamp(n.vy+py*power*w,-600,600);});
  Object.assign(this.impacts[side],{x,y,v:clamp(this.impacts[side].v+power*(flick?.3:.62),0,1.2)});
 }
 step(dt){
  this.time+=dt;const omega=2*Math.PI*(3-58*.012),k=omega*omega,damping=2*omega*(.12+60*.0022)*.97;
  const f=this.nodes.map(n=>({x:-k*(n.side===0?.94:1.06)*n.dx-damping*n.vx,y:-k*(n.side===0?.94:1.06)*n.dy-damping*n.vy}));
  for(const [a,b] of [[0,1],[1,2],[0,2],[3,4],[4,5],[3,5]]){const x=(this.nodes[b].dx-this.nodes[a].dx)*k*.145,y=(this.nodes[b].dy-this.nodes[a].dy)*k*.145;f[a].x+=x;f[b].x-=x;f[a].y+=y;f[b].y-=y;}
  // Transfer is deliberately zero in BOTH modes so left/right independence
  // and the spatial-field comparison are not confounded by linked motion.
  this.nodes.forEach((n,i)=>{const inertia=i%3===2?.86:1;n.vx+=f[i].x*dt*inertia;n.vy+=f[i].y*dt*inertia;n.dx=clamp(n.dx+n.vx*dt,-26,26);n.dy=clamp(n.dy+n.vy*dt,-30,30);if(Math.abs(n.dx)>=26)n.vx*=.55;if(Math.abs(n.dy)>=30)n.vy*=.55;for(const a of ['x','y'])if(Math.abs(n['d'+a])<.012&&Math.abs(n['v'+a])<.06)n['d'+a]=n['v'+a]=0;});
  this.followers.forEach((f,s)=>{const c=this.nodes[s*3+1],l=this.nodes[s*3+2],w=2*Math.PI*(s===0?2.38:2.46),d=2*w*(.32+60*.003);for(const a of ['x','y']){const t=(c['d'+a]*.57+l['d'+a]*.43)*.28;f['v'+a]+=(w*w*(t-f['d'+a])-d*f['v'+a])*dt;f['d'+a]=clamp(f['d'+a]+f['v'+a]*dt,-10,10);if(Math.abs(f['d'+a])<.008&&Math.abs(f['v'+a])<.04)f['d'+a]=f['v'+a]=0;}});
  this.impacts.forEach(p=>{p.v*=Math.exp(-dt*15);p.contact+=(p.target-p.contact)*Math.min(1,dt*(p.target>p.contact?38:22));if(p.contact<.0002&&!p.target)p.contact=0;const t=p.contact*.65+p.v*.25;p.bv+=(150*(t-p.bulge)-19*p.bv)*dt;p.bulge+=p.bv*dt;if(Math.abs(p.bulge)<.0001&&Math.abs(p.bv)<.001)p.bulge=p.bv=0;});
 }
 velocity(x,y,side,mode){
  let dx=0,dy=0,sum=0;for(let j=0;j<3;j++){const n=this.nodes[side*3+j],w=Math.exp(-1.75*(((x-n.x)/n.rx)**2+((y-n.y)/n.ry)**2));dx+=n.dx*w;dy+=n.dy*w;sum+=w;}
  const c=this.nodes[side*3+1],f=this.followers[side],p=this.impacts[side],hx=x-p.x,hy=y-p.y;
  if(mode==='A'){
   dx=c.dx*.65+dx*.35/Math.max(sum,.0001)+f.dx*.5;dy=c.dy*.65+dy*.35/Math.max(sum,.0001)+f.dy*.8;
   const pressure=Math.exp(-2.6*((hx/64)**2+(hy/56)**2))*(p.v*.08-p.contact*.09);dx+=hx*pressure;dy+=hy*pressure;
  }else{
   // A smaller coherent component, more local spring variation. Radial
   // contraction at contact and a delayed surrounding expansion are separate.
   dx=c.dx*.22+dx*.78/Math.max(sum,.0001)+f.dx*.4;dy=c.dy*.22+dy*.78/Math.max(sum,.0001)+f.dy*.9;
   const r2=(hx/25)**2+(hy/23)**2;
   const compress=-.30*p.contact*Math.exp(-1.65*r2);
   const bulge=.12*p.bulge*r2*Math.exp(-.65*r2);
   dx+=hx*(compress+bulge);dy+=hy*(compress+bulge);
   // Small delayed lateral expansion during downward loading, zero at rest.
   const [cx,cy]=centers[side],load=clamp((c.dy-f.dy)/35,-.2,.3);
   dx+=(x-cx)*load*.09;dy-=(y-cy)*load*.045;
  }
  const len=Math.hypot(dx,dy),gain=len>16?(16+8*(1-Math.exp(-(len-16)/8)))/len:1;return [dx*gain,dy*gain];
 }
 field(mode){
  const out=new Float32Array(GW*GH*2);
  for(let j=0;j<GH;j++)for(let i=0;i<GW;i++){
   const n=j*GW+i,s=masks[0][n]>0?0:masks[1][n]>0?1:-1;if(s<0)continue;
   const x=ROI[0]+i*GRID,y=ROI[1]+j*GRID,[vx,vy]=this.velocity(x,y,s,mode);let sx=x,sy=y;
   // Same fixed-envelope backtrace used by Holly, six bounded increments.
   for(let k=0;k<6;k++){const m=sample(masks[s],sx,sy)/6;sx-=vx*m;sy-=vy*m;}
   out[n*2]=sx-x;out[n*2+1]=sy-y;
  }
  return out;
 }
 snapshot(){return JSON.parse(JSON.stringify({nodes:this.nodes,followers:this.followers,impacts:this.impacts,time:this.time,pointers:this.pointers.size,lastGesture:this.lastGesture}));}
}
