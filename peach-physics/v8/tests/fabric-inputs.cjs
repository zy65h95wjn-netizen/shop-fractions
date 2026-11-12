// Shared A/B inputs for holly-fabric.cjs and holly-fabric-captures.cjs.
// Inputs. Pointer gestures use the real input path; poses use the existing node bounds.
const OUTER=[[294,383],[460,386]];// green outer-cup touch targets (holly-approved.cjs)
const STATES=[];
for(const side of [0,1]){
 const S=side?'R':'L',inward=side?-1:1;
 STATES.push({name:`${S} natural tap peak`,side,preset:'natural',tap:true,steps:12});
 STATES.push({name:`${S} natural tap rebound`,side,preset:'natural',tap:true,steps:side?35:37});
 STATES.push({name:`${S} playful tap peak`,side,preset:'playful',tap:true,steps:12});
 STATES.push({name:`${S} chaos tap peak`,side,preset:'chaos',tap:true,steps:12});
 STATES.push({name:`${S} chaos tap rebound`,side,preset:'chaos',tap:true,steps:36});
 STATES.push({name:`${S} strong flick down`,side,preset:'natural',flick:[0,70],at:'center'});
 STATES.push({name:`${S} strong flick up`,side,preset:'natural',flick:[0,-70],at:'center'});
 STATES.push({name:`${S} chaos flick up`,side,preset:'chaos',flick:[0,-70],at:'center'});
 STATES.push({name:`${S} drag inward-up from outer cup`,side,preset:'natural',drag:[45*inward,-55],at:'outer'});
 STATES.push({name:`${S} node-bound inward-up`,side,pose:[26*inward,-30]});
 STATES.push({name:`${S} node-bound outward-down`,side,pose:[-26*inward,30]});
}
STATES.push({name:'both chaos tap peak, link 50',side:2,preset:'chaos',both:true,steps:13,link:50});
async function drive(p,s){return p.evaluate(({s,OUTER})=>{
 document.querySelector(`[data-preset="${s.preset||'natural'}"]`).click();__test.reset();__test.model.transfer=s.link||0;
 if(s.pose){__test.forcePose(s.pose[0],s.pose[1],s.side);return 'pose';}
 if(s.both){__test.gesture('slap',0);__test.gesture('slap',1);for(let i=0;i<s.steps;i++)__test.step(1/120);return 'both';}
 if(s.tap){__test.gesture('slap',s.side);for(let i=0;i<s.steps;i++)__test.step(1/120);return 'tap';}
 const c=document.querySelector('#game'),f=__peachPhysicsDebug.snapshot().framing;
 const [x,y]=s.at==='outer'?OUTER[s.side]:__test.currentCharacter().impactCenters[s.side],X=f.x+x/720*f.width,Y=f.y+y/1280*f.height;
 const fire=(type,dx=0,dy=0)=>c.dispatchEvent(new PointerEvent(type,{pointerId:21,pointerType:'touch',clientX:X+dx,clientY:Y+dy,bubbles:true}));
 const [dx,dy]=s.flick||s.drag;
 fire('pointerdown');for(let k=1;k<=4;k++){window.testClock+=12;fire('pointermove',dx*k/4,dy*k/4);__test.step(1/120);}
 if(s.flick){window.testClock+=8;fire('pointerup',dx,dy);}
 // Hold the frame of largest displacement of the driven side within 0.5 s.
 let best=0,frame=0;
 for(let i=1;i<=60;i++){__test.step(1/120);const n=__test.nodes[s.side*3+1],m=Math.hypot(n.dx,n.dy);if(m>best){best=m;frame=i;}}
 return {frame,best};
},{s,OUTER});}
// Replays a pointer state deterministically to its peak frame.
async function drivePeak(p,s){const r=await drive(p,s);
 if(typeof r!=='object')return r;
 await p.evaluate(({s,frame,OUTER})=>{
  document.querySelector(`[data-preset="${s.preset||'natural'}"]`).click();__test.reset();__test.model.transfer=s.link||0;
  const c=document.querySelector('#game'),f=__peachPhysicsDebug.snapshot().framing;
  const [x,y]=s.at==='outer'?OUTER[s.side]:__test.currentCharacter().impactCenters[s.side],X=f.x+x/720*f.width,Y=f.y+y/1280*f.height;
  const fire=(type,dx=0,dy=0)=>c.dispatchEvent(new PointerEvent(type,{pointerId:21,pointerType:'touch',clientX:X+dx,clientY:Y+dy,bubbles:true}));
  const [dx,dy]=s.flick||s.drag;
  fire('pointerdown');for(let k=1;k<=4;k++){window.testClock+=12;fire('pointermove',dx*k/4,dy*k/4);__test.step(1/120);}
  if(s.flick){window.testClock+=8;fire('pointerup',dx,dy);}
  for(let i=1;i<=frame;i++)__test.step(1/120);
 },{s,frame:r.frame,OUTER});
 return r;
}

module.exports={OUTER,STATES,drive,drivePeak};
