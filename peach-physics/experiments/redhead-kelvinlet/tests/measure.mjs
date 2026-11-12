import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {Comparison,Physics,modes,GW,GH,ROI,GRID} from '../model.js';
import {Playback,duration} from '../sequence.js';
import {measure,offset,quantized} from '../quality.js';
const model=new Comparison(),reference=new Physics(),play=new Playback(model),refPlay=new Playback(reference),frames=[];
let baselineError=0,trajectoryError=0;
const metrics=Object.fromEntries(modes.map(m=>[m,{minDet:Infinity,maxDet:0,minStretch:Infinity,maxStretch:0,maxShear:0,maxDisplacement:0}]));
for(let i=0;i<duration*120;i++){
 play.step(1/120);refPlay.step(1/120);
 assert.deepEqual(model.snapshot(),reference.snapshot(),'spring/contact trajectories unchanged');
 if(i%6)continue;
 const start=performance.now(),fields=model.fields(),fieldMs=performance.now()-start,original=reference.field('A');
 fields.A.forEach((v,k)=>baselineError=Math.max(baselineError,Math.abs(v-original[k])));
 const quality={};for(const m of modes){quality[m]=measure(quantized(fields[m]),2);for(const key of Object.keys(metrics[m]))metrics[m][key]=key.startsWith('min')?Math.min(metrics[m][key],quality[m][key]):Math.max(metrics[m][key],quality[m][key]);}
 const matching=model.match.map(match=>{
  const p=model.impacts[match.side];let aa=0,bb=0,vv=0,n=0;
  for(let y=p.y-14+.5;y<=p.y+14;y+=2)for(let x=p.x-14+.5;x<=p.x+14;x+=2){if((x-p.x)**2+(y-p.y)**2>14**2)continue;const a=offset(fields['A+'],x,y),b=offset(fields.B,x,y),bulk=offset(fields.bulk,x,y);aa+=(a[0]-bulk[0])**2+(a[1]-bulk[1])**2;bb+=(b[0]-bulk[0])**2+(b[1]-bulk[1])**2;vv+=(a[0]-b[0])**2+(a[1]-b[1])**2;n++;}
  const actual=Math.sqrt(aa/n),target=Math.sqrt(bb/n);return {...match,renderedTarget:target,renderedActual:actual,relativeError:target>.02?(actual-target)/target:null,vectorRms:Math.sqrt(vv/n)};
 });
 frames.push({time:play.time,label:play.label,fieldMs,safety:model.safety,quality,matching});
}
assert.equal(baselineError,0);assert(model.nodes.every(n=>n.dx===0&&n.dy===0));
const matches=frames.flatMap(f=>f.matching).filter(m=>m.relativeError!==null),errors=matches.map(m=>Math.abs(m.relativeError));
const result={baselineError,trajectoryError,trajectoryChecks:duration*120,metrics,matching:{maxRelativeError:Math.max(...errors),meanRelativeError:errors.reduce((a,b)=>a+b,0)/errors.length,limitedFrames:matches.filter(m=>m.limited).length,gainRange:[Math.min(...matches.map(m=>m.gain)),Math.max(...matches.map(m=>m.gain))]},frames};
writeFileSync(process.argv[2]||'/tmp/kelvinlet-measurements.json',JSON.stringify(result,null,2));console.log(JSON.stringify({...result,frames:frames.length},null,2));
