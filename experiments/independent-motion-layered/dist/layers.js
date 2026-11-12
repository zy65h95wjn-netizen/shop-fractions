// Source-space layer mattes and geometry. No opposite spring is referenced.
export const W=756,H=1280;
export const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
export const smooth=v=>{v=clamp(v);return v*v*(3-2*v);};
export const crease=y=>284+0.004*(y-882)**2;
export const OUTLINES=[
  [[190,805],[220,790],[254,789],[279,797],[307,804],[296,834],
   [285,866],[280,894],[284,922],[297,950],[315,970],[279,980],
   [239,983],[200,979],[173,968],[153,948],[142,919],[140,890],
   [146,858],[162,829]],
  [[308,803],[342,785],[378,783],[407,785],[426,777],[444,785],
   [474,792],[498,798],[523,796],[541,815],[554,841],[573,861],
   [585,881],[591,915],[589,949],[579,975],[553,993],[506,1001],
   [457,1005],[410,1002],[369,993],[337,979],[314,960],[299,935],
   [287,909],[280,884],[286,857],[296,829]]
];
export const CENTERS=[[220,890],[340,895]];

export function distanceToOutline(x,y,points) {
  let inside=false,d=Infinity;
  for(let i=0,j=points.length-1;i<points.length;j=i++) {
    const [ax,ay]=points[j],[bx,by]=points[i],dx=bx-ax,dy=by-ay;
    if((ay>y)!==(by>y) && x<(bx-ax)*(y-ay)/(by-ay)+ax)inside=!inside;
    const t=clamp(((x-ax)*dx+(y-ay)*dy)/(dx*dx+dy*dy));
    d=Math.min(d,Math.hypot(x-ax-t*dx,y-ay-t*dy));
  }
  return inside?d:-d;
}
export function matte(x,y,side) {
  return smooth((distanceToOutline(x,y,OUTLINES[side])+0.65)/1.3);
}

// Source coefficients are uploaded once in a field texture. The inner edge
// intentionally has substantial weight: it is a free cutout boundary, not a
// shared mesh edge. Top/bottom and outer contours fade toward their anchors.
export function coefficients(x,y,side) {
  const vertical=smooth((y-795)/70)*smooth((1020-y)/85);
  const c=crease(y);
  const center=side===1?c+30:c-35;
  const spread=side===1?120:87;
  const focus=Math.exp(-(((x-center)/spread)**2));
  const w=vertical*focus;
  return [w,w*clamp((y-890)/120,-1,1),w*clamp((x-center)/120,-1,1)];
}
export function offset(x,y,side,body) {
  const [w,wy,wx]=coefficients(x,y,side);
  const d=[w*body.x+.08*wy*(body.sx-body.x)+.04*wx*body.y,
    w*body.y+.08*wy*(body.sy-body.y)-.03*wx*body.x];
  const contact=1-smooth((Math.abs(x-crease(y))-8)/40);
  const tangent=crease(y+d[1])-crease(y);
  const normal=d[0]-tangent;
  d[0]-=contact*(side===1?Math.max(normal,0):Math.min(normal,0));
  return d;
}
export function forward(x,y,side,body) {
  const [dx,dy]=offset(x,y,side,body);return [x+dx,y+dy];
}
export function inverse(x,y,side,body) {
  let sx=x,sy=y;
  for(let i=0;i<16;i++) {
    const [dx,dy]=offset(sx,sy,side,body);sx=x-dx;sy=y-dy;
  }
  return [sx,sy];
}

// RGBA mattes and coefficients are derived from coordinates, never repainted
// source art. Float values fit in signed 8-bit channels with explicit decoding.
export function makeField(side) {
  const data=new Uint8Array(W*H*4);
  for(let y=745;y<1055;y++)for(let x=105;x<625;x++) {
    const [w,wy,wx]=coefficients(x+.5,y+.5,side),i=(y*W+x)*4;
    data[i]=Math.round(w*255);data[i+1]=Math.round(((w?wy/w:0)*.5+.5)*255);
    data[i+2]=Math.round(((w?wx/w:0)*.5+.5)*255);data[i+3]=Math.round(matte(x+.5,y+.5,side)*255);
  }
  return data;
}
