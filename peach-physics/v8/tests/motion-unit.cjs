const assert=require('node:assert/strict'),fs=require('node:fs');const {MotionInput,calibration}=require('../motion.js');
let checks=0;const ok=(v,msg)=>{assert(v,msg);checks++};
function rig(id='ember'){let busy=false,character=id;const nodes=Array.from({length:6},()=>({vx:0,vy:0}));let seed=123;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);const m=new MotionInput({character:()=>character,nodes:()=>nodes,busy:()=>busy,random});return {m,nodes,setBusy:v=>busy=v,setCharacter:v=>character=v};}
function drive(r,x,y,angle=0,rate=60,seconds=.4,gravity=false){for(let i=0;i<Math.round(rate*seconds);i++){r.m.sample(gravity?{accelerationIncludingGravity:{x,y}}:{acceleration:{x,y}},i*1000/rate,angle);for(let n=0;n<120/rate;n++)r.m.tick(1/120);}return r.nodes[1];}
const rows=[];
for(const id of Object.keys(calibration)){
 let r=rig(id);r.m.setShake(true);let n=drive(r,1,0,0,60,.10);ok(n.vx<0&&n.vy===0,id+' inertial X');const strong=Math.abs(n.vx);
 r=rig(id);r.m.setShake(true);n=drive(r,.5,0,0,60,.10);ok(Math.abs(n.vx)<strong,id+' proportional');
 r=rig(id);r.m.setShake(true);n=drive(r,0,6);ok(n.vy>0&&n.vx===0,id+' screen Y');
 r=rig(id);r.m.setShake(true);n=drive(r,6,0,90);ok(n.vy<0&&Math.abs(n.vx)<1e-8,id+' landscape');
 r=rig(id);r.m.setShake(true);n=drive(r,.04,.03);ok(n.vx===0&&n.vy===0,id+' noise rejection');
 r=rig(id);r.m.setShake(true);n=drive(r,0,9.81,0,60,2,true);ok(n.vx===0&&n.vy===0,id+' gravity removal');
 r=rig(id);r.m.setShake(true);drive(r,6,0);for(let i=0;i<120;i++)r.m.tick(1/120);const v=r.nodes[1].vx;for(let i=0;i<120;i++)r.m.tick(1/120);ok(r.nodes[1].vx===v,id+' stale sensors stop');
 r=rig(id);r.m.setAuto(true);for(let i=0;i<120*90;i++)r.m.tick(1/120);ok(r.m.counts.autoSteps===120*90,id+' continuous auto');ok(Math.abs(r.nodes[1].vx)<=calibration[id].limit,id+' velocity budget');rows.push({id,autoSteps:r.m.counts.autoSteps,strongShakeVelocity:strong});
}
let r=rig();r.m.setShake(true);r.m.setAuto(true);r.setBusy(true);drive(r,12,12,0,60,2);for(let i=0;i<2400;i++)r.m.tick(1/120);ok(r.nodes.every(n=>n.vx===0&&n.vy===0),'touch excludes both inputs');r.setBusy(false);for(let i=0;i<120;i++)r.m.tick(1/120);ok(r.nodes.every(n=>n.vx===0&&n.vy===0),'post-touch quiet period');r.m.setVisible(false);for(let i=0;i<2400;i++)r.m.tick(1/120);ok(r.m.counts.autoSteps===0,'hidden suspension');r.m.setVisible(true);for(let i=0;i<120;i++)r.m.tick(1/120);ok(r.m.counts.autoSteps===0,'no catch-up pulse');
r=rig();r.m.setShake(true);drive(r,20,0,0,60,2);ok(r.m.counts.shakeSteps<120*1.9,'sustained shake cooldown');r.setCharacter('holly');r.m.tick(1/120);ok(r.m.force.every(v=>v===0),'switch clears sensor history');
r=rig();r.m.setShake(true);r.m.sample({acceleration:{x:NaN,y:Infinity}},0);r.m.tick(1/120);ok(r.nodes.every(n=>Number.isFinite(n.vx)&&n.vx===0),'invalid sensor rejected');
// Phone-depth shakes must work too; gravity-only depth must not drift.
r=rig();r.m.setShake(true);for(let i=0;i<24;i++){r.m.sample({acceleration:{x:0,y:0,z:6}},i*1000/60);r.m.tick(1/60);}ok(r.nodes[1].vy<0,'depth-only shake creates bounded screen-plane movement');
r=rig();r.m.setShake(true);for(let i=0;i<180;i++){r.m.sample({accelerationIncludingGravity:{x:0,y:0,z:9.81}},i*1000/60);r.m.tick(1/60);}ok(r.nodes.every(n=>n.vx===0&&n.vy===0),'depth gravity removal');
r=rig();r.m.setAuto(true);for(let i=0;i<120;i++)r.m.tick(1/120);ok(r.m.counts.autoSteps===120,'continuous auto starts once eligible');
const velocity=[];for(const rate of [30,60,120]){r=rig();r.m.setShake(true);velocity.push(Math.abs(drive(r,.5,0,0,rate,.2).vx));}ok(Math.max(...velocity)/Math.min(...velocity)<1.2,'event rate tolerance');
fs.writeFileSync(__dirname+'/motion-unit.json',JSON.stringify({checks,rows,eventRateVelocities:velocity},null,2));console.log(checks+' motion unit checks passed');
