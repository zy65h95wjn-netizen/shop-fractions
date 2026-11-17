// Screen-left only. Coordinates are in Midnight's 941 × 1671 source portrait.
// Distances to the fur hem and lower fold fade the flow over intact skin.
function midnightSeamWeight(x, y) {
 const offset = x - 321;
 const hem = 996 + offset * offset * (offset < 0 ? .0051 : .0042);
 const hemSlope = 2 * offset * (offset < 0 ? .0051 : .0042);
 const belowHem = (y - hem) / Math.hypot(1, hemSlope);
 const fold = 1293 - .00136 * (x - 314) ** 2;
 const aboveFold = (fold - y) / Math.hypot(1, .00272 * (x - 314));
 return leftSkinWeight(x, y) * boundarySmooth(6, 91, belowHem) * boundarySmooth(6, 76, aboveFold);
}

// Canvas uses the same fixed sampling field as WebGL. Sampling the source
// once avoids the double edge from compositing a shifted patch over the trim.
let midnightPatch;
function drawMidnightLeft(sc) {
 const x0=148, y0=984, w=320, h=416;
 if (!midnightPatch) {
  const layer=document.createElement('canvas');
  layer.width=w; layer.height=h;
  const context=layer.getContext('2d');
  context.drawImage(img,x0,y0,w,h,0,0,w,h);
  const photo=context.getImageData(0,0,w,h);
  const weights=new Float32Array(w*h);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++)weights[y*w+x]=midnightSeamWeight(x0+x+.5,y0+y+.5);
  midnightPatch={layer,context,photo,weights,frame:context.createImageData(w,h)};
 }
 const {layer,context,photo,weights,frame}=midnightPatch;
 const center=nodes[1], follow=followers[0];
 const dx=.8*(center.dx+follow.dx*.35), dy=.8*(center.dy+follow.dy*.35);
 if(Math.abs(dx)+Math.abs(dy)<.05)return;
 frame.data.fill(0);
 for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
  const index=y*w+x;
  if(!weights[index])continue;
  let sx=x,sy=y;
  for(let step=0;step<4;step++){
   const ix=Math.floor(sx),iy=Math.floor(sy),fx=sx-ix,fy=sy-iy,k=iy*w+ix;
   const weight=(1-fy)*((1-fx)*weights[k]+fx*weights[k+1])+fy*((1-fx)*weights[k+w]+fx*weights[k+w+1]);
   sx-=dx*weight/4;sy-=dy*weight/4;
  }
  const ix=Math.floor(sx),iy=Math.floor(sy),fx=sx-ix,fy=sy-iy;
  const src=4*(iy*w+ix),dst=4*index;
  for(let c=0;c<3;c++){
   const k=src+c;
   frame.data[dst+c]=(1-fy)*((1-fx)*photo.data[k]+fx*photo.data[k+4])+fy*((1-fx)*photo.data[k+4*w]+fx*photo.data[k+4*w+4]);
  }
  frame.data[dst+3]=255;
 }
 context.putImageData(frame,0,0);
 ctx2.drawImage(layer,(ox+x0*drawW/W)*sc,(oy+y0*drawH/H)*sc,w*drawW/W*sc,h*drawH/H*sc);
}
