import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {Comparison,centers} from '../model.js';
import {gradient,invariants,offset,quantized} from '../quality.js';
import {pinch,parameters} from '../kelvinlet.js';
const m=new Comparison(),result={};
for(const side of [0,1]){
 m.reset();const [x,y]=centers[side];m.down(9,x,y);for(let i=0;i<480;i++)m.step(1/120);const fields=m.fields();const q=m.impacts[side].contact-(8/9)*m.impacts[side].v;
 const probes=[[0,0],[8,0],[-8,0],[0,8],[0,-8],[14,0],[0,14],[28,0],[0,28]].map(([dx,dy])=>{
  const u=pinch(dx,dy,parameters.strain*q),inverseOffset=offset(fields.B,x+dx,y+dy);return {relative:[dx,dy],analyticalForward:u,renderedForwardAtOutput:inverseOffset.map(v=>-v),gradient:gradient(fields.B,x+dx,y+dy),...invariants(gradient(fields.B,x+dx,y+dy))};
 });
 assert(probes[1].renderedForwardAtOutput[0]>0);assert(probes[2].renderedForwardAtOutput[0]<0);assert(probes[3].renderedForwardAtOutput[1]<0);assert(probes[4].renderedForwardAtOutput[1]>0);
 result[side]={q,probes,matching:m.match[side],safety:m.safety};
}
writeFileSync(process.argv[2]||'/tmp/kelvinlet-local.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
