import {Comparison,ROI,contours} from '../model.js';
import {Playback} from '../sequence.js';
import {gradient,invariants,offset} from '../quality.js';
import {writeFileSync} from 'node:fs';
const model=new Comparison(),play=new Playback(model),plots=[];
for(let i=0;i<540;i++){play.step(1/120);if(i!==258&&i!==539)continue;const fields=model.fields();for(const mode of ['A+','B']){const points=[];for(let y=ROI[1];y<=ROI[1]+ROI[3];y+=4)for(let x=ROI[0];x<=ROI[0]+ROI[2];x+=4){const d=offset(fields[mode],x,y),q=invariants(gradient(fields[mode],x,y));points.push({x,y,dx:-d[0],dy:-d[1],stretch:q.forwardMax,det:q.det});}plots.push({mode,time:play.time,points});}}
writeFileSync('/tmp/kelvinlet-plot.json',JSON.stringify({plots,contours}));
