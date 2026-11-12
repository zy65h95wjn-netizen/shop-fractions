import {centers} from '../redhead-soft-tissue/physics.js';
export const duration=22;
export const phases=[{t:0,label:'Rest'},{t:.4,label:'Light tap'},{t:2,label:'Stronger tap'},{t:3.8,label:'Hold and release'},{t:6.5,label:'Repeated contact'},{t:8.5,label:'Inward drag'},{t:10.5,label:'Outward drag'},{t:12.4,label:'Upward flick'},{t:14,label:'Downward flick'},{t:16,label:'Simultaneous touches'},{t:17.2,label:'Complete recovery'}];
export function sequence(){
 const events=[];const add=(t,kind,id,x,y,amplitude)=>events.push({t,kind,id,x,y,amplitude});
 const tap=(t,s,strong=false)=>{const [x,y]=centers[s];add(t,'down',s,x,y);add(t+.08,'up',s,x,y);if(strong)add(t+.08,'impulse',s,x,y,.65);};
 tap(.4,0);tap(2,1,true);add(3.8,'down',0,...centers[0]);add(5.3,'up',0,...centers[0]);for(let i=0;i<4;i++)tap(6.5+i*.24,1);
 const drag=(t,s,dx,dy,span)=>{const [x,y]=centers[s];add(t,'down',s,x,y);for(let i=1;i<=12;i++)add(t+i*span/12,'move',s,x+dx*i/12,y+dy*i/12);add(t+span+.025,'up',s,x+dx,y+dy);};
 drag(8.5,0,37,0,.7);drag(10.5,1,40,0,.7);drag(12.4,0,0,-50,.15);drag(14,1,0,50,.15);drag(16,0,-28,-25,.5);drag(16,1,25,25,.5);
 return events.sort((a,b)=>a.t-b.t);
}
export class Playback{
 constructor(model){this.model=model;this.start();}
 start(){this.model.reset();this.events=sequence();this.index=0;this.time=0;}
 step(dt){this.time+=dt;while(this.index<this.events.length&&this.events[this.index].t<=this.time+1e-9){const e=this.events[this.index++],m=this.model;if(e.kind==='down')m.down(e.id,e.x,e.y);else if(e.kind==='move')m.move(e.id,e.x,e.y);else if(e.kind==='up')m.up(e.id);else m.impulse(e.id,e.x,e.y,e.amplitude);}this.model.step(dt);}
 get label(){return phases.filter(p=>p.t<=this.time).at(-1).label;}
}
