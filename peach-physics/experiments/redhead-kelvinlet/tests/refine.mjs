import {Comparison,modes} from '../model.js';
import {Playback} from '../sequence.js';
import {measure,quantized} from '../quality.js';
import {writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const model=new Comparison(),play=new Playback(model),frames=[];
for(let i=0;i<600;i++){play.step(1/120);if(play.time<2.03||play.time>2.34)continue;const f=model.fields();frames.push({time:play.time,modes:Object.fromEntries(modes.map(m=>[m,measure(quantized(f[m]),1)])),safety:model.safety});}
const result={sampling:'Every 1/120s around the worst stronger-tap interval, 1 source-pixel spatial spacing, encoded WebGL map + exact guard, centered .5px finite differences.',frames,extrema:Object.fromEntries(modes.map(m=>[m,{minDet:Math.min(...frames.map(f=>f.modes[m].minDet)),maxStretch:Math.max(...frames.map(f=>f.modes[m].maxStretch)),minStretch:Math.min(...frames.map(f=>f.modes[m].minStretch))}]))};
for(const m of modes)assert(result.extrema[m].minDet>0,'sampled field must remain orientation-preserving');writeFileSync(process.argv[2]||'/tmp/kelvinlet-refined.json',JSON.stringify(result,null,2));console.log(result.extrema);
