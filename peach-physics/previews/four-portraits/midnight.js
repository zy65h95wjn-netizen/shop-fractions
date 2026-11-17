// Screen-left only. Coordinates are in Midnight's 941 × 1671 source portrait.
// Trace the hem in source pixels. Across the lower fold, borrow the right
// side’s falloff in normalized region coordinates, then guard the left silhouette.
const midnightLeftCrop = [148, 920, 320, 480];
function midnightSeamWeight(x, y, downwardTrim = null) {
 const offset = x - 321;
 const hem = 996 + offset * offset * (offset < 0 ? .0051 : .0042);
 const hemSlope = 2 * offset * (offset < 0 ? .0051 : .0042);
 const belowHem = (y - hem) / Math.hypot(1, hemSlope);
 const fold = 1293 - .00136 * (x - 314) ** 2;
 const aboveFold = (fold - y) / Math.hypot(1, .00272 * (x - 314));
 const fur = boundarySmooth(6, 91, belowHem);
 const previous = leftSkinWeight(x, y) * fur * boundarySmooth(6, 76, aboveFold);
 // The white trim and the skin at its edge form one surface. Transfer motion
 // smoothly through the trim, feathering to zero at the waist and silhouette.
 const upperBlend = (1 - boundarySmooth(58, 103, belowHem)) * (1 - boundarySmooth(1100, 1150, y));
 if (upperBlend > 0) {
  const height = 1100 - y;
  const outerX = 194 + .39 * height + .0010 * height * height;
  const anchors = boundarySmooth(3, 23, x - outerX) * boundarySmooth(3, 40, 458 - x);
  const radius = Math.hypot((x - 330) / 205, (y - 1156) / 267);
  const rightEdge = 1 - boundarySmooth(.48, .98, radius);
  // In Canvas a downward pull opens the middle of the right arch. Its
  // corners and upward recoil stay more tightly supported.
  const center = 1 - boundarySmooth(30, 83, Math.abs(offset));
  const give = center * (downwardTrim ?? 0);
  const upper = anchors * (downwardTrim === null
   ? rightEdge * boundarySmooth(927, 1006, y - 6) * boundarySmooth(-78, -20, belowHem)
   : boundarySmooth(-3 - 54 * give, 27 - 30 * give, belowHem));
  return previous + upperBlend * (upper - previous);
 }
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
 const [x0,y0,w,h]=midnightLeftCrop;
 if (!midnightPatch) {
  const layer=document.createElement('canvas');
  layer.width=w; layer.height=h;
  const context=layer.getContext('2d');
  context.drawImage(img,x0,y0,w,h,0,0,w,h);
  const photo=context.getImageData(0,0,w,h);
  const supported=new Float32Array(w*h);
  const extra=new Float32Array(w*(1150-y0));
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
   const k=y*w+x, px=x0+x+.5, py=y0+y+.5;
   supported[k]=midnightSeamWeight(px,py,0);
   if(k<extra.length)extra[k]=midnightSeamWeight(px,py,1)-supported[k];
  }
  midnightPatch={layer,context,photo,supported,extra,weights:supported.slice(),give:0,frame:context.createImageData(w,h)};
 }
 const {layer,context,photo,weights,frame}=midnightPatch;
 const center=nodes[1], follow=followers[0];
 const dx=.8*(center.dx+follow.dx*.35), dy=.8*(center.dy+follow.dy*.35);
 if(Math.abs(dx)+Math.abs(dy)<.05)return;
 const give=boundarySmooth(0,10,dy);
 if(give!==midnightPatch.give){
  const {supported,extra}=midnightPatch;
  for(let i=0;i<extra.length;i++)weights[i]=supported[i]+give*extra[i];
  midnightPatch.give=give;
 }
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
