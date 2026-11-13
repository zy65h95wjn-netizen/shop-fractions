import {mkdirSync,writeFileSync} from 'node:fs';
import {createSurface,updateSurface} from '../dist/surface.js';
import {makeField} from '../dist/layers.js';
import {Physics} from '../dist/physics.js';
const dir='/tmp/surface-3d-qa';mkdirSync(dir,{recursive:true});
const surfaces=[createSurface(0),createSurface(1)];
for(let i=0;i<2;i++){
  writeFileSync(`${dir}/field-${i}.rgba`,makeField(i));
  writeFileSync(`${dir}/indices-${i}.bin`,Buffer.from(surfaces[i].indices.buffer));
}
const frames=[];
function save(name,bodies,clay=false){
  for(let i=0;i<2;i++){
    updateSurface(surfaces[i],bodies[i]);
    writeFileSync(`${dir}/${name}-${i}.bin`,Buffer.from(surfaces[i].vertices.buffer));
  }
  frames.push({name,bodies:structuredClone(bodies),clay});
}
const p=new Physics();save('idle',p.bodies);save('clay',p.bodies,true);
p.impulse(1);
for(let frame=0;frame<36;frame++){
  p.advance(1/24);save(`bounce-${String(frame).padStart(2,'0')}`,p.bodies);
}
p.reset();Object.assign(p.bodies[1],{x:-14,y:10,sx:-7,sy:5,z:8});save('right-inward',p.bodies);
p.reset();Object.assign(p.bodies[1],{x:5,y:-14,sx:3,sy:-7,z:6});save('right-outward',p.bodies);
p.reset();Object.assign(p.bodies[1],{x:0,y:22,sx:0,sy:22,z:3.3});save('right-down',p.bodies);
p.reset();Object.assign(p.bodies[1],{x:0,y:-22,sx:0,sy:-22,z:3.3});save('right-up',p.bodies);
p.reset();Object.assign(p.bodies[0],{x:8,y:-12,sx:4,sy:-6,z:4});
Object.assign(p.bodies[1],{x:-10,y:14,sx:-5,sy:7,z:-4});save('opposed',p.bodies);
writeFileSync(`${dir}/frames.json`,JSON.stringify({frames,counts:surfaces.map(s=>s.indices.length)},null,2));
console.log(`Exported ${frames.length} poses; ${surfaces.map(s=>s.vertices.length/12).join(' + ')} vertices.`);
