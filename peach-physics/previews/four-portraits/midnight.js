// Screen-left only. Coordinates are in Midnight's 941 × 1671 source portrait.
// Trace the hem in source pixels. Across the lower fold, borrow the right
// side’s falloff in normalized region coordinates, then guard the left silhouette.
function midnightSeamWeight(x, y) {
 const offset = x - 321;
 const hem = 996 + offset * offset * (offset < 0 ? .0051 : .0042);
 const hemSlope = 2 * offset * (offset < 0 ? .0051 : .0042);
 const belowHem = (y - hem) / Math.hypot(1, hemSlope);
 const fold = 1293 - .00136 * (x - 314) ** 2;
 const aboveFold = (fold - y) / Math.hypot(1, .00272 * (x - 314));
 const fur = boundarySmooth(6, 91, belowHem);
 const previous = leftSkinWeight(x, y) * fur * boundarySmooth(6, 76, aboveFold);
 const blend = boundarySmooth(fold - 122, fold - 55, y) * boundarySmooth(91, 105, belowHem);
 if (blend === 0) return previous;

 const [left, right] = regions;
 const qx = (left.x - x) / left.rx, qy = (y - left.y) / left.ry;
 const rightY = (right.y + qy * right.ry) / H;
 const bounds = currentCharacter().bounds, taper = currentCharacter().taper;
 const rightEdge = 1 - boundarySmooth(.48, .98, Math.hypot(qx, qy));
 const thigh = 1 - boundarySmooth(bounds[2], bounds[3], rightY);
 const outside = boundarySmooth(.55, .97, qx);
 const rightSupport = rightEdge * thigh * (1 - taper[0] * boundarySmooth(.69, .81, rightY) * outside)
   * (1 - taper[1] * outside);

 // Fade onto the upper thigh across the crease. Keep the scenery, center
 // gap and stockings anchored, including the inside edge near the other leg.
 const outerEdge = 157 + .0024 * Math.max(0, y - 1240) ** 2;
 const leftOutline = boundarySmooth(5, 53, x - outerEdge);
 const centerGap = boundarySmooth(4, 53, 457 - x);
 // A left held pose travels farther through the backward sampler than the
 // corresponding right pose. Tune this band at the fold, away from the fur.
 const lower = .93 * rightSupport * leftOutline * centerGap * (1 - boundarySmooth(1360, 1394, y));
 return previous + blend * (lower - previous);
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
   // Match the right Canvas carrier (.97 gain) after the left input's
   // .90 gain. Retain the accepted motion through both support bands.
   const gain=1+(.97/.90-1)*boundarySmooth(.62,.98,weight);
   sx-=dx*weight*gain/4;sy-=dy*weight*gain/4;
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
