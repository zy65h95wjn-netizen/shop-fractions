// The canvas covers the painted glass body in its original artwork coordinates.
window.MoonlitJar = (() => {
  const W = 286, H = 338;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const sprites = new Map();
  const glow = document.createElement('canvas');
  glow.width = glow.height = 64;
  const brush = glow.getContext('2d');
  const gradient = brush.createRadialGradient(32,32,0,32,32,32);
  for (const [at,color] of [[0,'#fff9dd'],[.13,'#fff1af'],[.27,'#ffcb72'],[.46,'#ffa54484'],[.73,'#ff923137'],[1,'#ff812000']])
    gradient.addColorStop(at,color);
  brush.fillStyle = gradient; brush.fillRect(0,0,64,64);
  let surface, canvas, ctx, observer, frame = 0, visible = false, time = 0, last = 0, total = 197;
  let walls = [], data = [];
  function randomFor(id) {
    let seed = 2166136261;
    for (const char of id) seed = Math.imul(seed ^ char.charCodeAt(0),16777619);
    return () => ((seed = (Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  }
  function create(id,slot) {
    const rnd = randomFor(id);
    const u=(slot*.61803398875+.11+rnd()*.055)%1, v=rnd();
    const depth=.64+rnd()*.36;
    const route=[], pace=.72+rnd()*.85;
    let period=0;
    for(let i=0, count=9+Math.floor(rnd()*5); i<count; i++){
      const duration=(2.3+rnd()*3.4)*pace;
      const hold=rnd()<.26 ? .45+rnd()*1.3 : 0;
      route.push({x:2*rnd()-1,y:2*rnd()-1,start:period,hold,duration});
      period+=hold+duration;
    }
    // Shared tangents keep turns continuous. A hovering wisp slows to rest.
    route.forEach((a,i)=>{
      const prev=route[(i+route.length-1)%route.length], next=route[(i+1)%route.length];
      const scale=a.hold ? 0 : 1.25/(prev.duration+a.duration);
      a.vx=(next.x-prev.x)*scale; a.vy=(next.y-prev.y)*scale;
    });
    return {id,slot,u,v,depth,route,period,offset:rnd()*period,
      reach:.72+rnd()*.48,arrival:-10,reacted:-10,bump:0};
  }
  function point(p,t,fill) {
    const freedom=(1-fill)**1.8, route=p.route;
    const clock=((t+p.offset)%p.period+p.period)%p.period;
    let i=0;
    while(i+1<route.length && route[i+1].start<=clock) i++;
    const a=route[i], b=route[(i+1)%route.length];
    const u=Math.max(0,(clock-a.start-a.hold)/a.duration), v=1-u;
    const blend=u*u*(3-2*u), out=u*v*v*a.duration, into=-u*u*v*a.duration;
    const dx=a.x+(b.x-a.x)*blend+a.vx*out+b.vx*into;
    const dy=a.y+(b.y-a.y)*blend+a.vy*out+b.vy*into;
    const height=Math.min(.98,(p.slot+.4+.6*p.v)/Math.max(1,total));
    const baseY=286-height*231-freedom*(58+p.v*35);
    const baseX=143+(p.u-.5)*158*(p.slot===0 ? 1-freedom : 1);
    const roomX=Math.min(baseX-26,260-baseX);
    const roomY=Math.min(baseY-46,303-baseY);
    let x=baseX+dx*Math.min(roomX,(10+freedom*(p.slot===0?89:61))*p.reach);
    const y=baseY+dy*Math.min(roomY,(13+freedom*65)*p.reach);
    const r=t-p.reacted, enter=t-p.arrival;
    if(r>=0 && r<1.3) x+= p.bump*Math.sin(r*Math.PI/1.3)*(1-r/1.3);
    const entryMix=enter>=0 && enter<1.15 ? (1-enter/1.15)**2 : 0;
    return {x:Math.max(26,Math.min(260,x*(1-entryMix)+143*entryMix)),y:Math.max(46,Math.min(303,y*(1-entryMix)+48*entryMix))};
  }
  function draw() {
    if(!ctx) return;
    ctx.clearRect(0,0,W,H);
    const n=data.length, fill=Math.min(1,n/Math.max(1,total));
    const energy=[0,0], weightedY=[0,0];
    for(const p of data){
      const t=reduced.matches ? 0 : time;
      const pos=point(p,t,fill);
      const size=(12+17*(1-Math.min(n/65,1)))*p.depth;
      if(!reduced.matches){
        // Curve a tapering ribbon along the actual recent path of the wisp.
        if(n<36 || p.slot%11===0){
          const span=.65+.5*(1-fill), segments=7;
          for(let j=segments;j>0;j--){
            const a=point(p,t-span*j/segments,fill);
            const b=point(p,t-span*(j-1)/segments,fill);
            ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);
            ctx.lineCap='round';ctx.lineWidth=(1-j/(segments+1))*size*.30+.35;
            ctx.strokeStyle='#ffc47c';ctx.globalAlpha=(1-j/(segments+1))*.52;ctx.stroke();
          }
        }
        for(let i=3;i>=1;i--){
          const past=point(p,t-i*.115,fill), tailSize=size*(.95-i*.13);
          ctx.globalAlpha=.24-i*.045;
          ctx.drawImage(glow,past.x-tailSize,past.y-tailSize,2*tailSize,2*tailSize);
        }
      }
      ctx.globalAlpha=Math.min(1,p.depth*1.06);
      ctx.drawImage(glow,pos.x-size,pos.y-size,2*size,2*size);
      for(let side=0;side<2;side++){
        const distance=Math.abs(pos.x-(side?260:26));
        const intensity=Math.exp(-distance/39)*p.depth;
        energy[side]+=intensity; weightedY[side]+=intensity*pos.y;
      }
    }
    ctx.globalAlpha=1;
    walls.forEach((wall,side)=>{
      const amount=energy[side], y=amount?weightedY[side]/amount:H/2;
      wall.style.opacity=String(Math.min(.94,1-Math.exp(-amount*2.1)));
      wall.style.setProperty('--lit-y',(100*y/H).toFixed(1)+'%');
      wall.style.setProperty('--spread',(18+fill*35).toFixed(1)+'%');
    });
  }
  function tick(now){
    frame=0;
    if(!visible || document.hidden || reduced.matches || !data.length) return;
    if(!last || now-last>=32){
      if(last) time+=Math.min(.08,(now-last)/1000);
      last=now; draw();
    }
    frame=requestAnimationFrame(tick);
  }
  function resume(){
    cancelAnimationFrame(frame); frame=0; last=0;
    if(surface && visible && !document.hidden){ draw(); if(!reduced.matches && data.length) frame=requestAnimationFrame(tick); }
  }
  function sync(el,ids,cap,arrival) {
    if(el!==surface) {
      observer?.disconnect(); surface=el; canvas=el?.querySelector('canvas'); ctx=canvas?.getContext('2d');
      walls=el?Array.from(el.querySelectorAll('.jar-glass')):[];
      visible=!!el;
      if(el && 'IntersectionObserver' in window){
        observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;resume();}); observer.observe(el);
      }
    }
    if(!el){resume();return;}
    total=cap||197;
    const keys=new Set(ids);
    for(const id of sprites.keys()) if(!keys.has(id)) sprites.delete(id);
    let occupied=new Set(Array.from(sprites.values(),p=>p.slot)), slot=0;
    data=ids.map(id=>{
      if(!sprites.has(id)){while(occupied.has(slot))slot++; sprites.set(id,create(id,slot));occupied.add(slot++);}
      return sprites.get(id);
    });
    if(arrival && sprites.has(arrival) && !reduced.matches){
      const p=sprites.get(arrival), fill=Math.min(1,data.length/total);
      const end=point(p,time,fill); p.arrival=time;
      const nearby=data.filter(o=>o!==p).map(o=>({o,pt:point(o,time,fill)}))
        .sort((a,b)=>Math.hypot(a.pt.x-end.x,a.pt.y-end.y)-Math.hypot(b.pt.x-end.x,b.pt.y-end.y)).slice(0,2);
      for(const {o,pt} of nearby){o.reacted=time;o.bump=pt.x<end.x?-18:18;}
    }
    draw();resume();
  }
  document.addEventListener('visibilitychange',resume);
  reduced.addEventListener('change',resume);
  return {sync};
})();
