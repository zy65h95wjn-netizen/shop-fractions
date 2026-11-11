// Inserted inside the frozen release closure. No solver or input edits.
const labParams=new URLSearchParams(location.search);
const labLayered=labParams.get('mode')==='layered';
const labLegacyRender=render;
const labRenderer=labLayered?new HollyLayers(canvas,()=>({img,cssW,cssH,ox,oy,drawW,drawH,fallback,velocity:hollyVelocity,key:JSON.stringify([nodes.map(n=>[n.dx,n.dy]),followers,impacts])}),labParams):null;
render=function(){
 if(needSize)resize();
 if(labRenderer&&isHolly()&&labRenderer.ready){labRenderer.render();return;}
 if(labRenderer)labRenderer.hide();
 labLegacyRender();
};
// Deliberately visible test/review API, confined to the isolated experiment.
window.__hollyLab={
 reset,step,render,model,nodes,followers,impacts,slap,impulse,chooseCharacter,
 raw:()=>JSON.parse(JSON.stringify({nodes,followers,impacts,waves})),
 renderer:labRenderer,
 setState:s=>{for(const key of ['nodes','followers','impacts']){const target={nodes,followers,impacts}[key];s[key].forEach((v,i)=>Object.assign(target[i],v));}render();},
 tap:(side=0)=>{const [x,y]=currentCharacter().impactCenters[side];slap(side,x,y,{sx:ox+x/720*drawW,sy:oy+y/1280*drawH});},
 pose:(x,y,side)=>{reset();for(const n of nodes)if(n.side===side){n.dx=x;n.dy=y;}render();},
 capture:()=>{render();return (labRenderer&&isHolly()&&labRenderer.ready?labRenderer.canvas:canvas).toDataURL();},
 ready:()=>!!img&&(!labRenderer||labRenderer.ready),
 info:()=>({layered:labLayered,backend:labRenderer?.backend|| (fallback?'canvas':'webgl'),error:labRenderer?.error||null})
};
