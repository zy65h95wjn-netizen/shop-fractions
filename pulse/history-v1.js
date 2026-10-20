(function(root){
  'use strict';
  // Presentation only: never derive daily readings from latest/raw samples.
  const metrics={
    resting_heart_rate:{name:'Resting heart rate',unit:'bpm',daily:'Latest daily Watch estimate'},
    heart_rate:{name:'Heart rate',unit:'bpm',daily:'Daily average'},
    hrv_sdnn:{name:'HRV / SDNN',unit:'ms',daily:'Daily average'},
    blood_oxygen_saturation:{name:'Blood oxygen / SpO₂',unit:'%',daily:'Daily average'},
    step_count:{name:'Steps',unit:'steps',daily:'Imported daily total'}
  };
  function valueOf(raw){
    if((typeof raw!=='number' && typeof raw!=='string') || String(raw).trim()==='')return null;
    const n=Number(raw);
    return Number.isFinite(n)?n:null;
  }
  function validDay(day){
    return typeof day==='string' && /^\d{4}-\d{2}-\d{2}$/.test(day) &&
      Number.isFinite(Date.parse(day+'T12:00:00Z')) &&
      new Date(day+'T12:00:00Z').toISOString().slice(0,10)===day;
  }
  function shiftDay(day,n){
    const date=new Date(day+'T12:00:00Z');
    date.setUTCDate(date.getUTCDate()+n);
    return date.toISOString().slice(0,10);
  }
  function eastDay(date){
    const parts=new Intl.DateTimeFormat('en-US',{
      timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'
    }).formatToParts(new Date(date));
    const p=Object.fromEntries(parts.map(part=>[part.type,part.value]));
    return p.year+'-'+p.month+'-'+p.day;
  }
  function series(daily,metric,days,today){
    if(!Object.hasOwn(metrics,metric)||![7,30,90].includes(days)||!validDay(today))return [];
    const byDay=new Map((Array.isArray(daily)?daily:[])
      .filter(row=>row && validDay(row.day)).map(row=>[row.day,row]));
    return Array.from({length:days},(_,i)=>{
      const day=shiftDay(today,i-days+1);
      return {day,value:valueOf(byDay.get(day)?.[metric])};
    });
  }
  // Keep the supplied precision; chart inspection and list use this same text.
  const reading=(value,unit)=>value===null?'No reading':String(value)+' '+unit;
  const dateLabel=day=>new Date(day+'T12:00:00Z').toLocaleDateString('en-US',{
    timeZone:'UTC',month:'short',day:'numeric',year:'numeric'
  });
  if(typeof module!=='undefined'&&module.exports)module.exports={metrics,valueOf,validDay,shiftDay,eastDay,series,reading};
  if(!root?.document)return;
  const el=id=>document.getElementById(id);
  const view=el('history-explorer'),app=el('app'),todayPage=el('overview'),canvas=el('history-chart');
  let dashboard=null,metric=null,days=30,points=[],selectedDay=null,returnY=0,opener=null;
  let plot=null,dragging=false,touch=null,restoreFrame=null;
  const isOpen=()=>!view.hidden;
  function cancelRestore(){
    if(restoreFrame!==null)root.cancelAnimationFrame(restoreFrame);
    restoreFrame=null;
  }
  function close(restore=true){
    cancelRestore();
    if(!isOpen())return;
    view.hidden=true;todayPage.hidden=false;dragging=false;touch=null;
    if(restore && !app.hidden){
      const y=returnY,button=opener;
      restoreFrame=root.requestAnimationFrame(()=>{
        restoreFrame=null;
        if(app.hidden||isOpen())return;
        button?.focus({preventScroll:true});
        root.scrollTo({top:y,behavior:'instant'});
        root.dispatchEvent(new Event('resize'));
      });
    }
    opener=null;
  }
  function clear(){
    close(false);cancelRestore();
    dashboard=null;metric=null;points=[];plot=null;selectedDay=null;days=30;returnY=0;opener=null;
    for(const id of ['history-latest-value','history-latest-at','history-day','history-reading','history-period','history-coverage','history-empty'])el(id).textContent='';
    el('history-values').replaceChildren();
    canvas.getContext('2d').clearRect(0,0,canvas.width,canvas.height);
    canvas.removeAttribute('aria-valuetext');
    el('history-scrubber').removeAttribute('aria-valuetext');
  }
  function inspect(index){
    if(!points[index])return;
    selectedDay=points[index].day;
    draw();
  }
  function inspectAt(clientX){
    if(!plot)return;
    const x=clientX-canvas.getBoundingClientRect().left;
    inspect(Math.round(Math.max(0,Math.min(1,(x-plot.left)/(plot.right-plot.left)))*(points.length-1)));
  }
  function draw(){
    if(!isOpen()||app.hidden||!metric)return;
    const spec=metrics[metric],index=points.findIndex(p=>p.day===selectedDay),point=points[index];
    if(!point)return;
    el('history-day').textContent=dateLabel(point.day)+' · '+spec.daily.toLowerCase();
    el('history-reading').textContent=reading(point.value,spec.unit);
    const scrub=el('history-scrubber');
    scrub.max=String(points.length-1);scrub.value=String(index);
    canvas.setAttribute('aria-valuemax',String(points.length));
    canvas.setAttribute('aria-valuenow',String(index+1));
    const description=el('history-day').textContent+': '+reading(point.value,spec.unit);
    canvas.setAttribute('aria-valuetext',description);
    scrub.setAttribute('aria-valuetext',description);
    const ctx=canvas.getContext('2d'),rect=canvas.getBoundingClientRect();
    if(!rect.width)return;
    const W=rect.width,H=rect.height,ratio=Math.min(root.devicePixelRatio||1,3);
    canvas.width=Math.round(W*ratio);canvas.height=Math.round(H*ratio);
    ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,W,H);
    const left=40,right=W-12,top=15,bottom=H-30;
    plot={left,right};
    const good=points.filter(p=>p.value!==null);
    if(!good.length)return; // Accessible empty-state text lives outside canvas.
    const values=good.map(p=>p.value),lo=Math.min(...values),hi=Math.max(...values);
    const pad=Math.max((hi-lo)*.2,spec.unit==='%'?.5:2),min=lo-pad,max=hi+pad;
    const x=i=>left+(right-left)*i/(points.length-1);
    const y=v=>bottom-(v-min)/(max-min)*(bottom-top);
    ctx.font='11px system-ui';ctx.textAlign='right';ctx.lineWidth=1;
    for(let i=0;i<4;i++){
      const v=min+(max-min)*i/3,yy=y(v);
      ctx.strokeStyle='#a7804d52';ctx.beginPath();ctx.moveTo(left,yy);ctx.lineTo(right,yy);ctx.stroke();
      ctx.fillStyle='#bdb5aa';ctx.fillText(String(Number(v.toFixed(1))),left-7,yy+4);
    }
    ctx.textAlign='left';ctx.fillText(points[0].day.slice(5),left,H-8);
    ctx.textAlign='right';ctx.fillText(points[points.length-1].day.slice(5),right,H-8);
    ctx.strokeStyle='#e5b878';ctx.lineWidth=2;ctx.lineJoin='round';ctx.beginPath();
    let connected=false;
    points.forEach((p,i)=>{
      if(p.value===null){connected=false;return;}
      if(connected)ctx.lineTo(x(i),y(p.value));else ctx.moveTo(x(i),y(p.value));
      connected=true;
    });
    ctx.stroke();ctx.fillStyle='#f7e6c9';
    points.forEach((p,i)=>{
      if(p.value===null)return;
      ctx.beginPath();ctx.arc(x(i),y(p.value),2.5,0,Math.PI*2);ctx.fill();
    });
    ctx.strokeStyle='#fff1d8';ctx.lineWidth=1;ctx.setLineDash([3,4]);
    ctx.beginPath();ctx.moveTo(x(index),top);ctx.lineTo(x(index),bottom);ctx.stroke();ctx.setLineDash([]);
    if(point.value!==null){
      ctx.beginPath();ctx.arc(x(index),y(point.value),6,0,Math.PI*2);
      ctx.fillStyle='#101113';ctx.fill();ctx.lineWidth=2;ctx.stroke();
    }
  }
  function render(data){
    dashboard=data;
    if(!isOpen()||app.hidden||!metric)return;
    const spec=metrics[metric];
    el('history-title').textContent=spec.name;
    el('history-unit').textContent='Value ('+spec.unit+')';
    // latest is the protected dashboard's actual latest reading, not a daily mean.
    const isSteps=metric==='step_count';
    const latest=isSteps?null:data.latest?.[metric];
    const latestValue=isSteps?valueOf(data.steps?.today):valueOf(latest?.value);
    el('history-latest-label').textContent=isSteps?'TODAY · SO FAR':metric==='resting_heart_rate'?'LATEST REVISED WATCH ESTIMATE':'LATEST READING';
    el('history-latest-value').textContent=reading(latestValue,spec.unit);
    const at=typeof latest?.at==='string'?new Date(latest.at):null;
    el('history-latest-at').textContent=isSteps?(latestValue===null?'Today has not synced yet · not zero':'Last synced daily total · may be incomplete'):
      latestValue===null?'No latest reading available. Daily history may still be available.':
      at && Number.isFinite(at.getTime())?
        (metric==='resting_heart_rate'?'Updated ':'Measured ')+at.toLocaleString('en-US',{
          timeZone:'America/New_York',month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'
        })+' · New York time':'Reading time unavailable';
    const today=eastDay(new Date());
    const verifiedSteps=data.steps?.last_completed_day===shiftDay(today,-1);
    const stepDays=verifiedSteps && Array.isArray(data.steps?.history)?data.steps.history:[];
    points=isSteps?Array.from({length:days},(_,i)=>{
      const day=shiftDay(today,i-days+1);
      const item=stepDays.find(x=>x?.day===day);
      const value=valueOf(item?.value);
      return {day,value:value!==null && Number.isInteger(value) && value>=0?value:null};
    }):series(data.daily,metric,days,today);
    const good=points.filter(p=>p.value!==null);
    if(!points.some(p=>p.day===selectedDay))selectedDay=(good[good.length-1]||points[points.length-1]).day;
    for(const button of view.querySelectorAll('[data-history-days]'))button.setAttribute('aria-pressed',String(Number(button.dataset.historyDays)===days));
    el('history-period').textContent=dateLabel(points[0].day)+' – '+dateLabel(points[points.length-1].day);
    el('history-coverage').textContent=good.length+'/'+days+' days recorded · '+(days-good.length)+' missing';
    el('history-semantics').textContent=isSteps?
      'Imported daily step totals by New York calendar day. Today is partial; missing days are not zero.':metric==='resting_heart_rate'?
      'Each day uses the latest revised Watch estimate supplied by the corrected dashboard.':
      'Daily averages from the dashboard, not individual raw measurements. The latest reading above is separate.';
    el('history-list-caption').textContent=spec.daily+' · newest first · today at top';
    el('history-empty').hidden=good.length>0;
    canvas.hidden=good.length===0;
    el('history-empty').textContent=good.length?'':'No daily readings recorded in this '+days+'-day range. Try another range or refresh after your next sync.';
    const body=el('history-values'),fragment=document.createDocumentFragment();
    // Reverse only the list copy; the chart and scrubber remain chronological.
    for(const point of points.slice().reverse()){
      const row=document.createElement('tr'),date=document.createElement('th'),value=document.createElement('td');
      date.scope='row';date.textContent=dateLabel(point.day);
      value.textContent=reading(point.value,spec.unit);row.dataset.day=point.day;
      if(point.value===null)row.className='history-missing';
      row.append(date,value);fragment.append(row);
    }
    body.replaceChildren(fragment);draw();
  }
  for(const button of document.querySelectorAll('[data-history-metric]'))button.addEventListener('click',()=>{
    if(app.hidden||!dashboard||!Object.hasOwn(metrics,button.dataset.historyMetric))return;
    cancelRestore();opener=button;returnY=root.scrollY;metric=button.dataset.historyMetric;days=30;selectedDay=null;
    todayPage.hidden=true;view.hidden=false;
    render(dashboard);root.scrollTo({top:0,behavior:'instant'});
    el('history-title').focus({preventScroll:true});
  });
  el('history-back').addEventListener('click',()=>close());
  el('history-lock').addEventListener('click',()=>el('lock').click());
  app.addEventListener('restingbeast:pagechange',()=>close(false));
  for(const button of view.querySelectorAll('[data-history-days]'))button.addEventListener('click',()=>{
    days=Number(button.dataset.historyDays);render(dashboard);
  });
  el('history-scrubber').addEventListener('input',event=>inspect(Number(event.target.value)));
  canvas.addEventListener('keydown',event=>{
    const index=points.findIndex(p=>p.day===selectedDay);
    const next={ArrowLeft:Math.max(0,index-1),ArrowRight:Math.min(points.length-1,index+1),Home:0,End:points.length-1}[event.key];
    if(next===undefined)return;
    event.preventDefault();inspect(next);
  });
  // Vertical drags scroll the iPhone page; horizontal drags inspect the chart.
  canvas.addEventListener('touchstart',event=>{
    touch=null;
    if(event.touches.length!==1)return;
    const t=event.touches[0];touch={id:t.identifier,x:t.clientX,y:t.clientY,axis:null};
    inspectAt(t.clientX);
  },{passive:true});
  canvas.addEventListener('touchmove',event=>{
    if(!touch)return;
    if(event.touches.length!==1){touch=null;return;}
    const t=Array.from(event.touches).find(t=>t.identifier===touch.id);
    if(!t)return;
    const dx=t.clientX-touch.x,dy=t.clientY-touch.y;
    if(!touch.axis && Math.max(Math.abs(dx),Math.abs(dy))>=8)touch.axis=Math.abs(dx)>Math.abs(dy)?'x':'y';
    if(touch.axis!=='x')return;
    if(event.cancelable)event.preventDefault();
    inspectAt(t.clientX);
  },{passive:false});
  for(const name of ['touchend','touchcancel'])canvas.addEventListener(name,()=>{touch=null;},{passive:true});
  canvas.addEventListener('pointerdown',event=>{
    if(event.pointerType==='touch'||event.button!==0)return;
    dragging=true;canvas.setPointerCapture?.(event.pointerId);inspectAt(event.clientX);
  });
  canvas.addEventListener('pointermove',event=>{if(dragging&&event.pointerType!=='touch')inspectAt(event.clientX);});
  for(const name of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(name,()=>{dragging=false;});
  root.addEventListener('resize',draw);
  root.PulseHistory={render,clear,close,isOpen};
})(typeof window!=='undefined'?window:null);
