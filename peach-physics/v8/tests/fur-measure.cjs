// Shared fur-trim measurement: a fur label traced from the photograph replaces the photo
// texture, the real renderer draws it, and the trim width is measured normal to the trim at
// fixed material positions. Used by holly-fur.cjs and holly-fabric.cjs.
const hook=`window.__fur={
 mask:()=>Array.from(hollyMaskPixels),
 // Fur label traced from the loaded photograph; independent of the runtime mask.
 label:()=>{
  const c=document.createElement('canvas');c.width=720;c.height=1280;const g=c.getContext('2d');g.drawImage(img,0,0);
  const d=g.getImageData(0,0,720,1280).data,x0=255,x1=505,y0=315,y1=405,W0=x1-x0,H0=y1-y0,raw=new Uint8Array(W0*H0);
  for(let y=0;y<H0;y++)for(let x=0;x<W0;x++){const i=((y+y0)*720+x+x0)*4,mx=Math.max(d[i],d[i+1],d[i+2]),mn=Math.min(d[i],d[i+1],d[i+2]);raw[y*W0+x]=(mx-mn)/Math.max(mx,1)<.27&&mx>105?1:0;}
  const morph=(a,keep)=>{const b=new Uint8Array(a.length);for(let y=0;y<H0;y++)for(let x=0;x<W0;x++){let v=keep;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const yy=y+dy,xx=x+dx;const q=yy<0||xx<0||yy>=H0||xx>=W0?0:a[yy*W0+xx];if(q!==keep)v=1-keep;}b[y*W0+x]=v;}return b;};
  const open=morph(morph(raw,1),0),lab=new Int32Array(open.length),sizes=[0];
  for(let i=0;i<open.length;i++)if(open[i]&&!lab[i]){const id=sizes.length,stack=[i];lab[i]=id;let n=0;
   while(stack.length){const j=stack.pop();n++;const x=j%W0,y=(j-x)/W0;for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const xx=x+dx,yy=y+dy,k=yy*W0+xx;if(xx>=0&&yy>=0&&xx<W0&&yy<H0&&open[k]&&!lab[k]){lab[k]=id;stack.push(k);}}}sizes.push(n);}
  const top=new Array(W0).fill(null),bottom=new Array(W0).fill(null);
  for(let x=0;x<W0;x++)for(let y=0;y<H0;y++){const id=lab[y*W0+x];if(id&&sizes[id]>800){if(top[x]===null)top[x]=y;bottom[x]=y;}}
  // Columns are filled between the outer edges; a 21-column median closes the dark shadow fold
  // inside the left outer trim without moving either traced edge outward.
  const med=(arr,x)=>{const v=[];for(let k=x-10;k<=x+10;k++)if(k>=0&&k<W0&&arr[k]!==null)v.push(arr[k]);v.sort((a,b)=>a-b);return v.length?v[v.length>>1]:null;};
  const T=top.map((v,x)=>v===null?null:Math.min(v,med(top,x))),B=bottom.map((v,x)=>v===null?null:Math.max(v,med(bottom,x)));
  const rgba=new Uint8Array(720*1280*4);
  for(let y=0;y<1280;y++)for(let x=0;x<720;x++){const i=(y*720+x)*4,xx=x-x0,yy=y-y0;rgba[i+1]=Math.max(0,Math.min(255,x-240));rgba[i+3]=255;
   if(xx>=0&&xx<W0&&T[xx]!==null&&yy>=T[xx]&&yy<=B[xx])rgba[i]=255;}
  window.__furLabel=rgba;return {top:T.map(v=>v===null?null:v+y0),bottom:B.map(v=>v===null?null:v+y0),x0};
 },
 // Render the label through the active renderer; returns it on the source crop grid [x0..x1) x [y0..y1).
 draw:(x0,y0,x1,y1)=>{
  const L=window.__furLabel,w=x1-x0,h=y1-y0,res=new Uint8Array(w*h*2);
  if(gl){
   gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,720,1280,0,gl.RGBA,gl.UNSIGNED_BYTE,L);
   render();const dpr=canvas.width/innerWidth,sx=x=>(ox+x/W*drawW)*dpr,sy=y=>(oy+y/H*drawH)*dpr;
   const X0=Math.floor(sx(x0))-2,Y0=Math.floor(sy(y0))-2,X1=Math.ceil(sx(x1))+2,Y1=Math.ceil(sy(y1))+2,RW=X1-X0,RH=Y1-Y0,p=new Uint8Array(RW*RH*4);
   gl.readPixels(X0,canvas.height-Y1,RW,RH,gl.RGBA,gl.UNSIGNED_BYTE,p);
   const at=(X,Y,k)=>p[((RH-1-Y)*RW+X)*4+k];
   for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const fx=sx(x0+x+.5)-.5-X0,fy=sy(y0+y+.5)-.5-Y0,ix=Math.floor(fx),iy=Math.floor(fy),ax=fx-ix,ay=fy-iy;
    for(let k=0;k<2;k++)res[(y*w+x)*2+k]=Math.round((at(ix,iy,k)*(1-ax)+at(ix+1,iy,k)*ax)*(1-ay)+(at(ix,iy+1,k)*(1-ax)+at(ix+1,iy+1,k)*ax)*ay);
   }
   gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);render();
  }else{
   // At rest the Canvas renderer skips its moving layer; clear it so stale motion is never read.
   hollyLayer.getContext('2d').clearRect(0,0,hollyLayer.width,hollyLayer.height);
   const saved=hollySource;hollySource=new Uint8ClampedArray(L);render();hollySource=saved;
   const [cx,cy,cw,ch]=HOLLY_CROP,layer=hollyLayer.getContext('2d').getImageData(0,0,cw,ch).data;
   for(let y=0;y<h;y++)for(let x=0;x<w;x++){const X=x0+x-cx,Y=y0+y-cy,j=(Y*cw+X)*4,moving=layer[j+3]>0,i=((y0+y)*720+x0+x)*4;
    res[(y*w+x)*2]=moving?layer[j]:L[i];res[(y*w+x)*2+1]=moving?layer[j+1]:L[i+1];}
   render();
  }
  return Array.from(res);
 }
};
`;

// Material positions (source x) along each trim, kept away from the attached tips.
const MAT=[[286,296,306,316,326,336,346,352],[408,416,426,436,446,456,466,474]];
// Mid-cup: at least ~24 source px from both trim tips and inside the right guard's plateau.
const MID=[[296,306,316,326,336],[426,436,446]];const GRID=[255,320,500,410];
function measure(res){
 const [x0,y0,x1,y1]=GRID,w=x1-x0,h=y1-y0,out=[[],[]];
 for(const side of [0,1]){
  const cols=[];
  for(let x=side?394:258;x<=(side?494:368);x+=2){
   let top=null,bottom=null,prev=0,sum=0;const X=x-x0;
   for(let y=0;y<h;y++){const v=res[(y*w+X)*2]/255;sum+=v;if(y>0){if(top===null&&prev<.5&&v>=.5)top=y0+y-1+(.5-prev)/(v-prev);if(prev>=.5&&v<.5)bottom=y0+y-1+(prev-.5)/(prev-v);}prev=v;}
   if(top===null||bottom===null){cols.push(null);continue;}
   const m=Math.round((top+bottom)/2)-y0;cols.push({x,top,bottom,vertical:sum,source:res[(m*w+X)*2+1]+240});
  }
  for(let k=3;k<cols.length-3;k++){const a=cols[k-3],c=cols[k],b=cols[k+3];if(!a||!b||!c)continue;
   const slope=((b.top+b.bottom)-(a.top+a.bottom))/2/(b.x-a.x);c.normal=c.vertical/Math.sqrt(1+slope*slope);}
  out[side]=MAT[side].map(xm=>{for(let k=0;k<cols.length-1;k++){const a=cols[k],b=cols[k+1];
   if(a&&b&&a.normal!==undefined&&b.normal!==undefined&&(a.source-xm)*(b.source-xm)<=0&&a.source!==b.source){const t=(xm-a.source)/(b.source-a.source);return {normal:a.normal+(b.normal-a.normal)*t,top:a.top+(b.top-a.top)*t,x:a.x+(b.x-a.x)*t};}}
   return null;});
 }
 return out;
}
const draw=p=>p.evaluate(g=>__fur.draw(...g),GRID);
const ratio=(m,rest)=>m.map((side,s)=>side.map((c,j)=>c?c.normal/rest[s][j].normal:null));
module.exports={hook,MAT,MID,GRID,measure,draw,ratio};
