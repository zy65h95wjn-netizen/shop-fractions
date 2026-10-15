'use strict';
// Only a public Supabase key is shipped. The private Pulse key never enters GitHub.
const URL='https://wosfukbzxrykwarxobfw.supabase.co/rest/v1/rpc/';
const CORRECTED_READ='https://wosfukbzxrykwarxobfw.supabase.co/functions/v1/pulse-dashboard-corrected';
const PUBLIC_KEY='sb_publishable_jkbf7B7azIjxRZHwvQ_vGw_aGi8hcHf';
const el=id=>document.getElementById(id), storage='pulse_protocol_key_v1';
let secret=sessionStorage.getItem(storage)||'', state=null, authGeneration=0;
let chartSelection=null, chartViewport=null, chartDragging=false, chartActiveTouch=null;
const kinds={trt:'TRT',medication:'Medication',nicotine:'Nicotine',caffeine:'Caffeine',bp:'Blood pressure'};
const unit={heart_rate:'bpm',resting_heart_rate:'bpm',hrv_sdnn:'ms',blood_oxygen_saturation:'%'};
const fields={
trt:'<label for="dose">Dose (mg per injection)</label><input id="dose" type="number" min=".01" max="1000" step=".01" required placeholder="40"><label for="interval">Interval (days)</label><input id="interval" type="number" min=".01" max="90" step=".01" required placeholder="3"><label for="route">Route</label><select id="route" required><option value="" selected disabled>Choose route</option><option>IM</option><option>SubQ</option></select>',
medication:'<label for="name">Medication name</label><input id="name" required maxlength="120"><label for="med-status">Status</label><select id="med-status"><option value="active">Active / changed</option><option value="stopped">Stopped</option></select><label for="med-dose">Dose and units</label><input id="med-dose" maxlength="120" placeholder="80 mg"><label for="frequency">Frequency</label><input id="frequency" maxlength="160" placeholder="Once daily">',
nicotine:'<label for="level">Usual nicotine use</label><select id="level" required><option value="" selected disabled>Choose level</option><option value="high">High</option><option value="moderate">Moderate</option><option value="low">Low</option><option value="none">None</option></select><label for="notes">Optional context</label><input id="notes" maxlength="240" placeholder="e.g. about 5 pouches/day">',
caffeine:'<label for="level">Usual caffeine use</label><select id="level" required><option value="" selected disabled>Choose level</option><option value="high">High</option><option value="moderate">Moderate</option><option value="low">Low</option><option value="none">None</option></select><label for="notes">Optional context</label><input id="notes" maxlength="240" placeholder="e.g. one coffee daily">',
bp:'<label for="sys">Systolic (mmHg)</label><input id="sys" type="number" min="30" max="350" required><label for="dia">Diastolic (mmHg)</label><input id="dia" type="number" min="20" max="250" required><label for="pulse">Pulse (optional)</label><input id="pulse" type="number" min="20" max="300">'
};
function txt(id,v){el(id).textContent=v;}
function stamp(t){if(!t)return 'No measurement';let d=new Date(t);return isNaN(d.getTime())?'Unknown date':d.toLocaleString('en-US',{timeZone:'America/New_York',month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'});}
function localShift(s,n){const d=new Date(s+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);}
function nyDay(t){let parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(t));let map={};for(let part of parts)map[part.type]=part.value;return map.year+'-'+map.month+'-'+map.day;}
function visible(v){el('connect').hidden=v;el('app').hidden=!v;el('refresh').disabled=!v;txt('status',v?'Protected':'Locked');}
async function rpc(method,data){let r=await fetch(URL+method,{method:'POST',cache:'no-store',headers:{apikey:PUBLIC_KEY,'content-type':'application/json'},body:JSON.stringify(data)});let payload;try{payload=await r.json();}catch{throw Error('Unable to read server response ('+r.status+').');}if(!r.ok){if(payload?.code==='28000')throw Error('Private key does not match the current credential.');throw Error('Request unavailable: backend returned '+r.status+'. Your key has not been proven invalid.');}return payload;}
async function readCorrected(requestKey){
  const r=await fetch(CORRECTED_READ,{
    method:'POST',cache:'no-store',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({p_key:requestKey,p_days:90})
  });
  let value;
  try{value=await r.json();}catch{throw Error('Corrected dashboard returned an unreadable response.');}
  if(!r.ok){
    if(r.status===401 && value?.code==='key_mismatch')
      throw Error('The entered key does not match the current private credential. No changes have been made.');
    throw Error('Authentication service is unavailable ('+r.status+'). The private key has not been proven invalid.');
  }
  if(value?.resting_hr_method!=='latest_end_at_per_local_day'){
    throw Error('Resting-HR calculation could not be verified; dashboard data withheld.');
  }
  return value;
}
async function refresh(){
  if(!secret)return;
  const generation=++authGeneration,requestKey=secret;
  txt('error','');txt('status','Syncing…');
  try{
    const response=await readCorrected(requestKey);
    if(generation!==authGeneration || requestKey!==secret)return;
    if(!Array.isArray(response.daily)||!Array.isArray(response.events))throw Error('Unexpected dashboard format.');
    state=response;
    sessionStorage.setItem(storage,requestKey);
    visible(true);render();
    txt('updated','Last refreshed '+stamp(new Date().toISOString()));
  }catch(e){
    if(generation!==authGeneration)return;
    if(!state){visible(false);txt('login-error',e.message);}
    else{visible(true);txt('error','Refresh failed: '+e.message);}
  }finally{
    if(generation===authGeneration)el('refresh').disabled=!secret;
  }
}
function showMetric(metric,id){let m=state.latest?.[metric];let n=el(id);n.textContent=m?(metric==='blood_oxygen_saturation'?Number(Number(m.value).toFixed(1)).toString():String(Math.round(Number(m.value)))):'—';if(m){let span=document.createElement('span');span.className='unit';span.textContent=unit[metric];n.append(span);}txt(id+'-at',m?(metric==='resting_heart_rate'?'Updated ':'Measured ')+stamp(m.at):'No readings yet');}
function summary(e){let d=e.data||{};if(e.kind==='trt')return d.dose_mg+' mg '+(d.route||'')+' every '+d.interval_days+' day'+(Number(d.interval_days)===1?'':'s');if(e.kind==='medication')return d.name+' · '+(d.status==='stopped'?'Stopped':[d.dose,d.frequency].filter(Boolean).join(' · '));if(e.kind==='bp')return d.systolic+'/'+d.diastolic+' mmHg'+(d.pulse?' · pulse '+d.pulse:'');return (d.level||'Unknown').replace(/^./,x=>x.toUpperCase())+(d.notes?' · '+d.notes:'');}
function active(kind){return state.events.find(e=>e.kind===kind&&new Date(e.effective_at)<=new Date());}
function renderContext(){for(let kind of ['trt','nicotine','caffeine','bp']){let e=active(kind);txt('active-'+kind,e?summary(e):kind==='bp'?'No reading':'Not logged');txt('date-'+kind,e?(kind==='bp'?'Measured ':'Effective ')+stamp(e.effective_at):kind==='bp'?'No measurements required':'No baseline set');const action=el('edit-'+kind);if(action)action.textContent=kind==='bp'?'Record':e?'Update':'Set';}
let med=new Map();for(let e of state.events){if(e.kind!=='medication'||new Date(e.effective_at)>new Date())continue;let name=(e.data?.name||'').trim().toLowerCase();if(name&&!med.has(name))med.set(name,e);}let box=el('med-list');box.replaceChildren();let count=0;for(let e of med.values()){if(e.data?.status==='stopped')continue;count++;let row=document.createElement('div'),b=document.createElement('strong'),span=document.createElement('span');row.className='med';b.textContent=e.data.name;span.textContent=[e.data.dose,e.data.frequency].filter(Boolean).join(' · ');let details=document.createElement('div'),actions=document.createElement('div'),edit=document.createElement('button'),stop=document.createElement('button');
details.className='med-info';details.append(b,span);
actions.className='med-actions';
edit.className='secondary small-action';edit.type='button';edit.textContent='Update';edit.dataset.medId=e.id;edit.dataset.medAction='update';
stop.className='secondary small-action';stop.type='button';stop.textContent='Log stop';stop.dataset.medId=e.id;stop.dataset.medAction='stop';
actions.append(edit,stop);row.append(details,actions);box.append(row);}if(!count)box.textContent='No active medications logged.';}
function renderHistory(){let box=el('history');box.replaceChildren();txt('history-count',state.events.length+' entries');if(!state.events.length){box.textContent='Nothing logged yet. Only log meaningful changes.';return;}for(let e of state.events.slice(0,35)){let row=document.createElement('div'),b=document.createElement('strong'),small=document.createElement('small');row.className='event';b.textContent=(kinds[e.kind]||e.kind)+' · '+summary(e);small.textContent=stamp(e.effective_at);row.append(b,small);box.append(row);}}
// A protocol timeline is separate from the heart-rate Y axis: mg and bpm are
// not directly comparable. Only logged regimen changes are carried forward.
function trtEvents(){
  return state.events.filter(e=>e.kind==='trt' && e.data &&
    Number(e.data.dose_mg)>0 && Number(e.data.interval_days)>0 &&
    Number.isFinite(new Date(e.effective_at).getTime()) &&
    new Date(e.effective_at)<=new Date())
    .slice().sort((a,b)=>new Date(a.effective_at)-new Date(b.effective_at));
}
function regimenFor(day,history){
  let active=null;
  for(const event of history){
    if(nyDay(event.effective_at)<=day)active=event;
    else break;
  }
  return active;
}
function regimenLabel(e){
  if(!e)return 'No TRT baseline logged';
  const d=e.data,interval=Number(d.interval_days),dose=Number(d.dose_mg);
  const weekly=Math.round(dose*7/interval*10)/10;
  return dose+' mg '+(d.route||'')+' / '+interval+' days · ≈'+weekly+' mg/week scheduled';
}
function renderTrtTimeline(data,selected,selectionIndex){
  const rail=el('trt-rail'),reading=el('trt-reading'),detail=el('trt-details'),marker=el('trt-cursor');
  if(!rail||!reading||!detail||!marker)return;
  const history=trtEvents();
  const current=selected?regimenFor(selected.day,history):null;
  reading.textContent=selected?regimenLabel(current):'Choose a date';
  detail.textContent=!selected?'Slide the chart to inspect your TRT regimen on that date.':
    !current?'No earlier TRT protocol was recorded. Nothing has been assumed.':
    history.some(e=>nyDay(e.effective_at)===selected.day)?
      'TRT changed on this date. The day’s heart-rate readings may span both regimens.':
      'Protocol carried forward from '+stamp(current.effective_at)+'. No injections inferred.';
  rail.replaceChildren();
  const groups=[];
  for(const day of data){
    const event=regimenFor(day.day,history),key=event?(event.id||event.effective_at):'unlogged';
    const group=groups[groups.length-1];
    if(group && group.key===key)group.count++;
    else groups.push({key,count:1,event});
  }
  for(const group of groups){
    const segment=document.createElement('span');
    segment.className=group.event?'trt-segment is-logged':'trt-segment is-unlogged';
    segment.style.flexGrow=String(group.count);
    segment.title=group.event?regimenLabel(group.event):'No logged TRT baseline';
    rail.append(segment);
  }
  marker.style.left=(data.length>1 ? (100*Math.max(0,selectionIndex)/(data.length-1)) : 50)+'%';
  marker.hidden=selectionIndex<0;
  rail.setAttribute('aria-label','TRT protocol bands: '+groups.map(g=>g.count+' day(s) '+(g.event?regimenLabel(g.event):'unlogged')).join('; '));
  const compareButton=el('compare-trt');
  if(compareButton)compareButton.disabled=!history.length;
}
function inspectChartAt(clientX){
  if(!chartViewport)return;
  const rect=el('chart').getBoundingClientRect();
  const g=chartViewport;
  const relative=Math.max(0,Math.min(1,(clientX-rect.left-g.left)/(g.right-g.left)));
  const index=Math.round(relative*(g.data.length-1));
  chartSelection=g.data[index]?.day||null;
  chart();
}
function chart(){let c=el('chart'),ctx=c.getContext('2d'),bounds=c.getBoundingClientRect();if(!bounds.width)return;let ratio=Math.min(devicePixelRatio||1,3);c.width=bounds.width*ratio;c.height=bounds.height*ratio;ctx.setTransform(ratio,0,0,ratio,0,0);let W=bounds.width,H=bounds.height,metric=el('metric').value;let daysShown=Number(el('days').value);
let today=nyDay(new Date());
let byDate=new Map(state.daily.map(d=>[d.day,d]));
let data=Array.from({length:daysShown},(_,i)=>{
let day=localShift(today,i-daysShown+1);
let raw=byDate.get(day)?.[metric];
return {day,value:raw==null?null:Number(raw)};
});let good=data.filter(d=>d.value!==null&&Number.isFinite(d.value));ctx.clearRect(0,0,W,H);
let left=37,right=W-12,top=10,bottom=H-29;
chartViewport={left,right,data,metric};
if(!chartSelection || !data.some(d=>d.day===chartSelection)) chartSelection=good.length?good[good.length-1].day:null;
const selectionIndex=data.findIndex(d=>d.day===chartSelection);
const selected=selectionIndex>=0?data[selectionIndex]:null;
const nativeScrubber=el('chart-scrubber');
nativeScrubber.min='0';
nativeScrubber.max=String(Math.max(0,data.length-1));
nativeScrubber.value=String(Math.max(0,selectionIndex));
nativeScrubber.disabled=!data.length;
renderTrtTimeline(data,selected,selectionIndex);
const inspectionDay=el('chart-day'),inspectionValue=el('chart-reading');
if(selected){
  let date=new Date(selected.day+'T12:00:00Z').toLocaleDateString('en-US',{timeZone:'UTC',month:'short',day:'numeric',year:'numeric'});
  inspectionDay.textContent=date+(metric==='resting_heart_rate'?' · latest daily estimate':' · daily average');
  inspectionValue.textContent=selected.value===null||!Number.isFinite(selected.value)?'No reading':selected.value.toFixed(1)+' '+unit[metric];
}else{
  inspectionDay.textContent='Tap or drag to inspect daily averages';
  inspectionValue.textContent=good.length?'':'No measurements';
}
c.setAttribute('aria-valuemin','1');
c.setAttribute('aria-valuemax',String(data.length));
c.setAttribute('aria-valuenow',String(Math.max(1,selectionIndex+1)));
c.setAttribute('aria-valuetext',(selected?inspectionDay.textContent+': '+inspectionValue.textContent:'No recorded data'));
if(!good.length){ctx.fillStyle='#d5b89b';ctx.font='13px sans-serif';ctx.fillText('No measurements for this period',28,H/2);return;}let values=good.map(d=>d.value),min=Math.min(...values),max=Math.max(...values),pad=Math.max((max-min)*.2,metric==='hrv_sdnn'?4:2);min=Math.max(0,min-pad);max+=pad;let x=i=>left+(right-left)*i/Math.max(1,data.length-1),y=v=>bottom-(v-min)/(max-min)*(bottom-top);ctx.font='11px sans-serif';ctx.textAlign='right';for(let i=0;i<4;i++){let n=min+(max-min)*i/3,yy=y(n);ctx.strokeStyle='#46352c';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(left,yy);ctx.lineTo(right,yy);ctx.stroke();ctx.fillStyle='#d9b99a';ctx.fillText(String(Math.round(n)),left-8,yy+4);}ctx.textAlign='left';ctx.fillText(data[0]?.day?.slice(5)||'',left,H-8);ctx.textAlign='right';ctx.fillText(data[data.length-1]?.day?.slice(5)||'',right,H-8);
ctx.strokeStyle='#ffad53';ctx.lineWidth=2.5;ctx.lineJoin='round';ctx.beginPath();let drawing=false;data.forEach((d,i)=>{if(d.value===null||!Number.isFinite(d.value)){drawing=false;return;}if(!drawing)ctx.moveTo(x(i),y(d.value));else ctx.lineTo(x(i),y(d.value));drawing=true;});ctx.stroke();ctx.fillStyle='#ffe0a1';data.forEach((d,i)=>{if(d.value===null||!Number.isFinite(d.value))return;ctx.beginPath();ctx.arc(x(i),y(d.value),2,0,Math.PI*2);ctx.fill();});
for(let e of state.events){if(e.kind==='bp')continue;let day=nyDay(e.effective_at),i=data.findIndex(d=>d.day===day);if(i<0)continue;ctx.strokeStyle='#dd873c';ctx.setLineDash([4,5]);ctx.beginPath();ctx.moveTo(x(i),top);ctx.lineTo(x(i),bottom);ctx.stroke();ctx.setLineDash([]);}
if(selected){
  const px=x(selectionIndex);
  ctx.strokeStyle='#ffe5c7';
  ctx.lineWidth=1.2;
  ctx.setLineDash([3,4]);
  ctx.beginPath();ctx.moveTo(px,top);ctx.lineTo(px,bottom);ctx.stroke();ctx.setLineDash([]);
  if(selected.value!==null&&Number.isFinite(selected.value)){
    ctx.beginPath();ctx.arc(px,y(selected.value),6.5,0,Math.PI*2);
    ctx.fillStyle='#27160d';ctx.fill();
    ctx.lineWidth=2.6;ctx.strokeStyle='#fff7e7';ctx.stroke();
  }
}}

// The backend only returns authorized, importer-deduplicated daily totals.
// Today's count may not yet be exported; do not substitute yesterday's value.
function renderTodaySteps(){
  const data=state.steps;
  const current=data?.today,previous=data?.yesterday;
  const number=x=>Number(x).toLocaleString('en-US',{maximumFractionDigits:0});
  txt('steps-today',Number.isInteger(current)&&current>=0?number(current):'—');
  txt('steps-today-note',Number.isInteger(current)&&current>=0?
      'So far today · last synced total':'Today not synced yet · not zero');
  txt('steps-yesterday',Number.isInteger(previous)&&previous>=0?number(previous):'—');
  txt('steps-yesterday-note',Number.isInteger(previous)&&previous>=0?
      'Completed day · last synced total':'Yesterday has not synced yet');
}
function renderTodayTrt(){
  const entry=active('trt');
  if(!entry){txt('today-trt-regimen','Not logged');txt('today-trt-since','Set the baseline on Context.');return;}
  txt('today-trt-regimen',summary(entry));
  const date=nyDay(entry.effective_at),today=nyDay(new Date());
  const interval=Math.round((Date.parse(today+'T12:00:00Z')-Date.parse(date+'T12:00:00Z'))/86400000);
  txt('today-trt-since',Math.max(0,interval)+' calendar days since recorded change · association, not causation');
}
// A small RHR overview, still using final daily Watch estimates as supplied
// by the corrected dashboard—not preliminary revisions.
function renderTodayRhr(){
  const canvas=el('today-rhr-spark'),ctx=canvas.getContext('2d'),bounds=canvas.getBoundingClientRect();
  const today=nyDay(new Date());
  const byDate=new Map(state.daily.map(d=>[d.day,d.resting_heart_rate]));
  const week=Array.from({length:7},(_,i)=>({
    day:localShift(today,i-7),
    value:byDate.get(localShift(today,i-7))
  }));
  const prior=Array.from({length:7},(_,i)=>byDate.get(localShift(today,i-14)));
  const valid=a=>a.filter(x=>Number.isFinite(Number(x))&&x!==null&&x!==undefined).map(Number);
  const weekValues=valid(week.map(d=>d.value)),priorValues=valid(prior);
  const note=el('today-rhr-caption'),delta=el('today-rhr-delta');
  delta.textContent='Collecting history';
  if(weekValues.length===7 && priorValues.length===7){
    const average=a=>a.reduce((x,y)=>x+y,0)/a.length;
    const diff=average(weekValues)-average(priorValues);
    delta.textContent=(diff>0?'+':'')+diff.toFixed(1)+' bpm vs prior week';
  }else{
    delta.textContent=weekValues.length+'/7 days';
  }
  note.textContent='Completed days only · '+weekValues.length+'/7 measured'+
    (priorValues.length===7?' · previous week available':' · prior-week comparison pending');
  // Keep the canvas accessible: real calendar dates and exact measured values.
  canvas.setAttribute('aria-label','Resting heart rate during the seven completed New York calendar days: '+
    week.map(d=>d.day+': '+(d.value===null||d.value===undefined||!Number.isFinite(Number(d.value))?
      'no reading':Number(d.value).toFixed(1)+' bpm')).join('; '));
  if(!bounds.width)return;
  const ratio=Math.min(devicePixelRatio||1,3),W=bounds.width,H=bounds.height;
  canvas.width=Math.round(W*ratio);canvas.height=Math.round(H*ratio);
  ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,W,H);

  // Leave permanent space for Y-axis bpm, exact point values, and dates.
  // On a 320px phone all seven labels remain inside their own plot columns.
  const left=33,right=16,top=30,bottom=26;
  const plotWidth=Math.max(1,W-left-right),plotHeight=Math.max(1,H-top-bottom);
  const xAt=i=>left+plotWidth*i/6;
  const plot=week.map((d,i)=>({x:xAt(i),v:d.value,day:d.day,i}))
    .filter(d=>d.v!==null&&d.v!==undefined&&Number.isFinite(Number(d.v)));
  ctx.textBaseline='alphabetic';
  ctx.textAlign='center';
  ctx.font='10px system-ui';
  ctx.fillStyle='#d8baa0';
  for(let i=0;i<7;i++){
    const parts=week[i].day.split('-');
    ctx.fillText(Number(parts[1])+'/'+Number(parts[2]),xAt(i),H-6);
  }
  if(!plot.length){
    ctx.textAlign='left';ctx.fillStyle='#d9b18b';ctx.font='12px system-ui';
    ctx.fillText('No completed-day RHR readings yet',left,top+plotHeight/2);
    return;
  }
  const numbers=plot.map(d=>Number(d.v));
  const min=Math.floor((Math.min(...numbers)-3)/5)*5;
  const max=Math.max(min+5,Math.ceil((Math.max(...numbers)+3)/5)*5);
  const yAt=value=>top+(max-Number(value))/(max-min)*plotHeight;
  ctx.lineWidth=1;
  for(const fraction of [0,.5,1]){
    const gy=top+plotHeight*fraction;
    ctx.strokeStyle='rgba(243,172,94,.18)';
    ctx.beginPath();ctx.moveTo(left-3,gy);ctx.lineTo(W-right+2,gy);ctx.stroke();
    ctx.fillStyle='#ba9e83';ctx.textAlign='right';ctx.font='10px system-ui';
    ctx.fillText(String(Math.round(max-(max-min)*fraction)),left-8,gy+3);
  }
  // Connect observed consecutive calendar days only; missing dates break lines.
  ctx.strokeStyle='#ffaa4a';ctx.lineWidth=2.7;ctx.lineJoin='round';
  let started=false;
  for(let i=0;i<week.length;i++){
    const v=week[i].value;
    if(v===null||v===undefined||!Number.isFinite(Number(v))){started=false;continue;}
    const x=xAt(i);
    if(!started){ctx.beginPath();ctx.moveTo(x,yAt(v));started=true;}
    else ctx.lineTo(x,yAt(v));
    const next=week[i+1]?.value;
    if(i===6||next===null||next===undefined||!Number.isFinite(Number(next))){
      ctx.stroke();started=false;
    }
  }
  // Exact readings travel with the dots; dates and scale never rely on hover.
  ctx.textAlign='center';ctx.font='600 11px system-ui';
  for(const d of plot){
    const yy=yAt(d.v);
    ctx.fillStyle='#ffe1ad';
    ctx.beginPath();ctx.arc(d.x,yy,3.5,0,Math.PI*2);ctx.fill();
    const num=Number(d.v);
    const label=Number.isInteger(num)?String(num):num.toFixed(1);
    ctx.fillStyle='#fff1d8';
    ctx.fillText(label,d.x,Math.max(13,yy-11));
  }
  ctx.font='10px system-ui';ctx.fillStyle='#bba997';
  for(let i=0;i<7;i++){
    const v=week[i].value;
    if(v===null||v===undefined||!Number.isFinite(Number(v)))
      ctx.fillText('—',xAt(i),top+plotHeight/2);
  }
}

function render(){showMetric('heart_rate','hr');showMetric('resting_heart_rate','rhr');showMetric('hrv_sdnn','hrv');showMetric('blood_oxygen_saturation','spo2');renderTodaySteps();renderTodayTrt();renderTodayRhr();renderContext();renderHistory();chart();window.PulseCompare?.render(state);}
let editingMedicationId=null;
function populateFields(kind,entry,stop=false){
  el('fields').innerHTML=fields[kind];
  const d=entry?.data||{};
  if(kind==='trt'){
    if(d.dose_mg!=null)el('dose').value=d.dose_mg;
    if(d.interval_days!=null)el('interval').value=d.interval_days;
    if(d.route)el('route').value=d.route;
  }else if(kind==='medication'){
    editingMedicationId=entry?.id||null;
    if(entry){
      el('name').value=d.name||'';
      el('name').readOnly=true;
      el('name').title='To rename a medication, stop the old entry and add a new one.';
      el('med-dose').value=d.dose||'';
      el('frequency').value=d.frequency||'';
    }
    if(stop)el('med-status').value='stopped';
  }else if(kind==='nicotine'||kind==='caffeine'){
    if(d.level)el('level').value=d.level;
    if(d.notes)el('notes').value=d.notes;
  }
  const help=el('event-help');
  if(help)help.textContent=kind==='bp'?'Blood pressure is optional. This records one actual measurement; it does not carry forward.':
    entry?'Current values are prefilled for convenience. Save a new entry only when something changes. Previous history is preserved.':
    'Set this once; it stays in effect until you record a change. Adjust the effective date if it began earlier.';
}
function openDialog(kind,entry=null,stop=false){
  const target=kind||'trt';
  el('kind').value=target;
  editingMedicationId=null;
  let previous=entry;
  if(!previous && ['trt','nicotine','caffeine'].includes(target))previous=active(target);
  populateFields(target,previous,stop);
  const d=new Date(Date.now()-new Date().getTimezoneOffset()*60000);
  el('when').value=d.toISOString().slice(0,16);
  txt('save-error','');
  el('dlg').showModal();
}
function payload(kind){let get=id=>el(id)?.value?.trim()||'';switch(kind){case'trt':return {dose_mg:Number(get('dose')),interval_days:Number(get('interval')),route:get('route')};case'medication':return {name:get('name'),status:get('med-status'),dose:get('med-dose'),frequency:get('frequency')};case'nicotine':case'caffeine':return {level:get('level'),notes:get('notes')};case'bp':return Object.assign({systolic:Number(get('sys')),diastolic:Number(get('dia'))},get('pulse')?{pulse:Number(get('pulse'))}:{})}}
el('login').addEventListener('submit',async e=>{
  e.preventDefault();
  // Never normalize a credential before hashing: byte-for-byte equality matters.
  secret=el('key').value;
  txt('login-error','');
  await refresh();
  if(state)el('key').value='';
});
const keyCheck=el('key-check-button');
if(keyCheck)keyCheck.addEventListener('click',()=>{
  const candidate=el('key').value;
  const previous=sessionStorage.getItem(storage);
  const sameSession=previous===null?'No saved browser session':candidate===previous?'Matches saved browser session':'Differs from saved browser session';
  const printableASCII=/^[\x21-\x7e]*$/.test(candidate);
  const whitespaceChanged=candidate!==candidate.trim();
  txt('key-check-result','Local-only check: '+candidate.length+' characters; '+
    (printableASCII?'printable ASCII':'contains whitespace or non-ASCII characters')+'; '+
    (whitespaceChanged?'outer whitespace detected; ':'')+sameSession+
    '. This does not verify the server key. Nothing was transmitted or stored.');
});
const compareTrtButton=el('compare-trt');
if(compareTrtButton)compareTrtButton.addEventListener('click',()=>{
  if(!state)return;
  const history=trtEvents(),latest=history[history.length-1];
  if(!latest)return;
  el('compare-mode').value='change';
  window.PulseCompare?.render(state);
  el('compare-event').value=latest.id;
  window.PulseCompare?.render(state);
  el('patterns')?.scrollIntoView({behavior:'smooth',block:'start'});
});
el('today-trt-open').addEventListener('click',()=>window.RestingBeastPages?.showPage('trends'));
el('refresh').addEventListener('click',refresh);el('days').addEventListener('change',chart);
el('metric').addEventListener('change',()=>{chartSelection=null;chart();});
const chartCanvas=el('chart');
const chartScrubber=el('chart-scrubber');
chartScrubber.addEventListener('input',()=>{
  if(!chartViewport)return;
  const index=Number(chartScrubber.value);
  const day=chartViewport.data[index]?.day;
  if(!day)return;
  chartSelection=day;
  chart();
});
// Use native touch events on iOS. Safari can cancel pointermove when it takes over a
// canvas gesture to scroll; touchstart/touchmove with nonpassive listeners prevent that.
chartCanvas.addEventListener('touchstart',e=>{
  if(!chartViewport || e.touches.length!==1)return;
  const touch=e.changedTouches[0];
  if(!touch)return;
  chartActiveTouch=touch.identifier;
  if(e.cancelable)e.preventDefault();
  inspectChartAt(touch.clientX);
},{passive:false});
chartCanvas.addEventListener('touchmove',e=>{
  if(chartActiveTouch===null)return;
  let touch=null;
  for(const t of e.changedTouches){
    if(t.identifier===chartActiveTouch){touch=t;break;}
  }
  if(!touch)return;
  if(e.cancelable)e.preventDefault();
  inspectChartAt(touch.clientX);
},{passive:false});
function endChartTouch(e){
  if(chartActiveTouch===null)return;
  for(const t of e.changedTouches){
    if(t.identifier===chartActiveTouch){chartActiveTouch=null;break;}
  }
}
chartCanvas.addEventListener('touchend',endChartTouch);
chartCanvas.addEventListener('touchcancel',endChartTouch);
window.addEventListener('touchend',endChartTouch);
window.addEventListener('touchcancel',endChartTouch);
// Mouse and pen retain normal pointer interaction; touch is handled above once.
chartCanvas.addEventListener('pointerdown',e=>{
  if(e.pointerType==='touch' || (e.pointerType==='mouse'&&e.button!==0))return;
  chartDragging=true;
  if(chartCanvas.setPointerCapture)chartCanvas.setPointerCapture(e.pointerId);
  inspectChartAt(e.clientX);
});
chartCanvas.addEventListener('pointermove',e=>{
  if(e.pointerType==='touch')return;
  if(chartDragging)inspectChartAt(e.clientX);
});
for(const eventName of ['pointerup','pointercancel','lostpointercapture']){
  chartCanvas.addEventListener(eventName,()=>{chartDragging=false;});
}
chartCanvas.addEventListener('keydown',e=>{
  if(!chartViewport)return;
  const points=chartViewport.data,oldIndex=Math.max(0,points.findIndex(d=>d.day===chartSelection));
  let nextIndex;
  if(e.key==='ArrowLeft')nextIndex=Math.max(0,oldIndex-1);
  else if(e.key==='ArrowRight')nextIndex=Math.min(points.length-1,oldIndex+1);
  else if(e.key==='Home')nextIndex=0;
  else if(e.key==='End')nextIndex=points.length-1;
  else return;
  e.preventDefault();chartSelection=points[nextIndex].day;chart();
});window.addEventListener('resize',()=>{if(state&&!el('app').hidden){chart();renderTodayRhr();}});
el('lock').addEventListener('click',()=>{
  ++authGeneration; // An old in-flight fetch must never unlock this page again.
  sessionStorage.removeItem(storage);
  secret='';state=null;
  visible(false);el('key').value='';
  txt('login-error','');txt('key-check-result','');
});
el('add').addEventListener('click',()=>openDialog('trt'));
el('add-med').addEventListener('click',()=>openDialog('medication'));
for(const kind of ['trt','nicotine','caffeine','bp']){
  el('edit-'+kind).addEventListener('click',()=>openDialog(kind));
}
el('med-list').addEventListener('click',event=>{
  const btn=event.target.closest('button[data-med-id][data-med-action]');
  if(!btn||!state)return;
  const entry=state.events.find(e=>e.id===btn.dataset.medId&&e.kind==='medication');
  if(!entry||entry.data?.status==='stopped')return;
  openDialog('medication',entry,btn.dataset.medAction==='stop');
});
el('cancel').addEventListener('click',()=>el('dlg').close());
el('cancel2').addEventListener('click',()=>el('dlg').close());
el('kind').addEventListener('change',()=>{
  editingMedicationId=null;
  const k=el('kind').value;
  populateFields(k,['trt','nicotine','caffeine'].includes(k)?active(k):null);
});
el('event-form').addEventListener('submit',async e=>{e.preventDefault();let btn=el('save');btn.disabled=true;txt('save-error','');try{let dt=new Date(el('when').value);if(isNaN(dt.getTime()))throw Error('Invalid effective date');let kind=el('kind').value;await rpc('pulse_write',{p_key:secret,p_kind:kind,p_effective_at:dt.toISOString(),p_data:payload(kind)});el('dlg').close();editingMedicationId=null;await refresh();}catch(err){txt('save-error',err.message||String(err));}finally{btn.disabled=false;}});
if(secret)refresh();else visible(false);
setInterval(()=>{if(secret&&!document.hidden)refresh();},300000);
