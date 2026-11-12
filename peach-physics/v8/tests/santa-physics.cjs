// Source-independent numerical checks; this does NOT replace photograph review.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
function between(a,b){return html.slice(html.indexOf(a),html.indexOf(b));}
const character=between("{id:'santa'",'\n];');
const code=`
const c=${character};
const W=1024,H=1280,clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const currentCharacter=()=>c,isSanta=()=>true,isHolly=()=>false,advanceSantaLaugh=()=>{};
const model={bounce:60,softness:62,settle:62,transfer:50};
const nodes=c.nodes.map(n=>({...n,dx:0,dy:0,vx:0,vy:0}));
const followers=[0,1].map(()=>({dx:0,dy:0,vx:0,vy:0}));
const impacts=c.impactCenters.map(([x,y])=>({x:x/W,y:y/H,v:0,contact:0,target:0}));
const waves=[0,1].map(()=>({age:1,strength:0}));
const connections=[[0,1],[1,2],[0,2],[3,4],[4,5],[3,5]];
${between('const SANTA_CONTOUR=', 'let santaMaskPixels=')}
${between('function insideTouchContour(', 'function touchAnchor(')}
${between('function santaWeight(', 'function buildSantaMask(')}
${between('function santaVelocity(x,y)', 'function initSantaFallback(')}
${between('function santaImpulse(', '// Original synthesized')}
${between('function startWave(', 'function updatePress(')}
${between('function step(dt)', 'function loop(')}
function reset(){for(const n of nodes)n.dx=n.dy=n.vx=n.vy=0;for(const f of followers)f.dx=f.dy=f.vx=f.vy=0;for(const p of impacts)p.v=p.contact=p.target=0;for(const w of waves){w.age=1;w.strength=0;}}
function flow(x,y){const v=santaVelocity(x,y);let sx=x,sy=y;for(let i=0;i<6;i++){const w=santaWeight(sx,sy);sx-=v[0]*w/6;sy-=v[1]*w/6;}return [sx,sy];}
this.api={model,nodes,followers,impacts,waves,reset,step,flow,velocity:santaVelocity,weight:santaWeight,impulse:santaImpulse};
`;
const context=vm.createContext({});vm.runInContext(code,context);const a=context.api;
let checks=0;function ok(v,s){assert.ok(v,s);checks++;}
const report={presets:[],stress:[]};
for(const [name,bounce,softness,settle] of [['natural',60,62,62],['playful',80,76,44],['chaos',98,90,28]]){
 a.reset();Object.assign(a.model,{bounce,softness,settle});a.impulse(0,355,790,1,0,0,false,true);
 const trace=[];for(let i=0;i<2400;i++){a.step(1/120);trace.push({time:(i+1)/120,dy:a.velocity(410,820)[1]});}
 const peak=trace.reduce((x,y)=>x.dy>y.dy?x:y),rebound=trace.filter(p=>p.time>peak.time).reduce((x,y)=>x.dy<y.dy?x:y);
 ok(peak.dy>15&&peak.dy<49,`${name} broad excursion`);ok(peak.time>.12,`${name} delayed mass peak`);ok(rebound.dy< -2,`${name} rebound`);
 ok(a.nodes.every(n=>n.dx===0&&n.dy===0),`${name} returns to rest`);report.presets.push({name,peak,rebound});
}
for(const [dx,dy] of [[58,66],[-58,66],[58,-66],[-58,-66]]){
 a.reset();for(const n of a.nodes){n.dx=dx;n.dy=dy;}
 let minDet=Infinity,maxTravel=0;
 for(let y=520;y<1030;y+=5)for(let x=165;x<780;x+=5){
  const q=a.flow(x,y),b=a.flow(x+.5,y),c=a.flow(x,y+.5),det=((b[0]-q[0])*(c[1]-q[1])-(b[1]-q[1])*(c[0]-q[0]))/.25;
  minDet=Math.min(minDet,det);maxTravel=Math.max(maxTravel,Math.hypot(q[0]-x,q[1]-y));
 }
 ok(minDet>.15,'positive Jacobian in extreme pose');ok(maxTravel<49,'bounded flow');report.stress.push({dx,dy,minDet,maxTravel});
}
for(const [x,y] of [[140,780],[750,880],[530,400],[480,1075],[120,350]])ok(a.weight(x,y)===0,'protected feature outside mask');
for(const transfer of [0,50,100]){
 a.reset();Object.assign(a.model,{bounce:100,softness:100,settle:0,transfer});
 for(let i=0;i<3600;i++){if(i%24===0)a.impulse(i%2,355,790,1,1100,-1100,true,true);a.step(1/120);ok(a.nodes.every(n=>Number.isFinite(n.dx+n.dy)&&Math.abs(n.dx)<=58&&Math.abs(n.dy)<=66),'repeated inputs bounded');}
 for(let i=0;i<7200;i++)a.step(1/120);ok(a.nodes.every(n=>n.dx===0&&n.dy===0),'extreme settings eventually settle');
}
report.checks=checks;console.log(JSON.stringify(report,null,2));
const out=process.env.PEACH_TEST_OUTPUT||'/tmp/peach-v8-tests';fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'santa-physics.json'),JSON.stringify(report,null,2));
