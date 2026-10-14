'use strict';
// Only a public Supabase key is shipped. The private Pulse key never enters GitHub.
const URL='https://wosfukbzxrykwarxobfw.supabase.co/rest/v1/rpc/';
const PUBLIC_KEY='sb_publishable_jkbf7B7azIjxRZHwvQ_vGw_aGi8hcHf';
const el=id=>document.getElementById(id), storage='pulse_protocol_key_v1';
let secret=sessionStorage.getItem(storage)||'', state=null, busy=false;
let chartSelection=null, chartViewport=null, chartDragging=false, chartActiveTouch=null;
const kinds={trt:'TRT',medication:'Medication',nicotine:'Nicotine',caffeine:'Caffeine',bp:'Blood pressure'};
const unit={heart_rate:'bpm',resting_heart_rate:'bpm',hrv_sdnn:'ms',blood_oxygen_saturation:'%'};
const fields={
trt:'<label for="dose">Dose (mg per injection)</label><input id="dose" type="number" min=".01" max="1000" step=".01" required placeholder="40"><label for="interval">Interval (days)</label><input id="interval" type="number" min=".01" max="90" step=".01" required placeholder="3"><label for="route">Route</label><select id="route"><option>IM</option><option>SubQ</option></select>',
medication:'<label for="name">Medication name</label><input id="name" required maxlength="120"><label for="med-status">Status</label><select id="med-status"><option value="active">Active / changed</option><option value="stopped">Stopped</option></select><label for="med-dose">Dose and units</label><input id="med-dose" maxlength="120" placeholder="80 mg"><label for="frequency">Frequency</label><input id="frequency" maxlength="160" placeholder="Once daily">',
nicotine:'<label for="level">Usual nicotine use</label><select id="level"><option value="high">High</option><option value="moderate">Moderate</option><option value="low">Low</option><option value="none">None</option></select><label for="notes">Optional context</label><input id="notes" maxlength="240" placeholder="e.g. about 5 pouches/day">',
caffeine:'<label for="level">Usual caffeine use</label><select id="level"><option value="high">High</option><option value="moderate">Moderate</option><option value="low">Low</option><option value="none">None</option></select><label for="notes">Optional context</label><input id="notes" maxlength="240" placeholder="e.g. one coffee daily">',
bp:'<label for="sys">Systolic (mmHg)</label><input id="sys" type="number" min="30" max="350" required><label for="dia">Diastolic (mmHg)</label><input id="dia" type="number" min="20" max="250" required><label for="pulse">Pulse (optional)</label><input id="pulse" type="number" min="20" max="300">'
};
function txt(id,v){el(id).textContent=v;}
function stamp(t){if(!t)return 'No measurement';let d=new Date(t);return isNaN(d.getTime())?'Unknown date':d.toLocaleString('en-US',{timeZone:'America/New_York',month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'});}
function localShift(s,n){const d=new Date(s+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);}
function nyDay(t){let parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(t));let map={};for(let part of parts)map[part.type]=part.value;return map.year+'-'+map.month+'-'+map.day;}
function visible(v){el('connect').hidden=v;el('app').hidden=!v;el('refresh').disabled=!v;txt('status',v?'Protected':'Locked');}
async function rpc(method,data){let r=await fetch(URL+method,{method:'POST',cache:'no-store',headers:{apikey:PUBLIC_KEY,'content-type':'application/json'},body:JSON.stringify(data)});let payload;try{payload=await r.json();}catch{throw Error('Unexpected server response '+r.status);}if(!r.ok){if(payload?.code==='28000'||r.status===401||r.status===403)throw Error('Invalid or expired private key.');throw Error(payload?.message||'Server error '+r.status);}return payload;}
async function refresh(){if(!secret||busy)return;busy=true;txt('error','');txt('status','Syncing…');try{let response=await rpc('pulse_read',{p_key:secret,p_days:90});if(!Array.isArray(response.daily)||!Array.isArray(response.events))throw Error('Unexpected dashboard format.');state=response;sessionStorage.setItem(storage,secret);visible(true);render();txt('updated','Last refreshed '+stamp(new Date().toISOString()));}catch(e){if(!state){visible(false);txt('login-error',e.message);}else{visible(true);txt('error','Refresh failed: '+e.message);}}finally{busy=false;el('refresh').disabled=!secret;}}
function showMetric(metric,id){let m=state.latest?.[metric];let n=el(id);n.textContent=m?(metric==='blood_oxygen_saturation'?Number(Number(m.value).toFixed(1)).toString():String(Math.round(Number(m.value)))):'—';if(m){let span=document.createElement('span');span.className='unit';span.textContent=unit[metric];n.append(span);}txt(id+'-at',m?'Measured '+stamp(m.at):'No readings yet');}
function summary(e){let d=e.data||{};if(e.kind==='trt')return d.dose_mg+' mg '+(d.route||'')+' every '+d.interval_days+' day'+(Number(d.interval_days)===1?'':'s');if(e.kind==='medication')return d.name+' · '+(d.status==='stopped'?'Stopped':[d.dose,d.frequency].filter(Boolean).join(' · '));if(e.kind==='bp')return d.systolic+'/'+d.diastolic+' mmHg'+(d.pulse?' · pulse '+d.pulse:'');return (d.level||'Unknown').replace(/^./,x=>x.toUpperCase())+(d.notes?' · '+d.notes:'');}
function active(kind){return state.events.find(e=>e.kind===kind&&new Date(e.effective_at)<=new Date());}
function renderContext(){for(let kind of ['trt','nicotine','caffeine','bp']){let e=active(kind);txt('active-'+kind,e?summary(e):kind==='bp'?'No reading':'Not logged');txt('date-'+kind,e?(kind==='bp'?'Measured ':'Effective ')+stamp(e.effective_at):kind==='bp'?'No measurements required':'No baseline set');}
let med=new Map();for(let e of state.events){if(e.kind!=='medication'||new Date(e.effective_at)>new Date())continue;let name=(e.data?.name||'').trim().toLowerCase();if(name&&!med.has(name))med.set(name,e);}let box=el('med-list');box.replaceChildren();let count=0;for(let e of med.values()){if(e.data?.status==='stopped')continue;count++;let row=document.createElement('div'),b=document.createElement('strong'),span=document.createElement('span');row.className='med';b.textContent=e.data.name;span.textContent=[e.data.dose,e.data.frequency].filter(Boolean).join(' · ');row.append(b,span);box.append(row);}if(!count)box.textContent='No active medications logged.';}
function renderHistory(){let box=el('history');box.replaceChildren();txt('history-count',state.events.length+' entries');if(!state.events.length){box.textContent='Nothing logged yet. Only log meaningful changes.';return;}for(let e of state.events.slice(0,35)){let row=document.createElement('div'),b=document.createElement('strong'),small=document.createElement('small');row.className='event';b.textContent=(kinds[e.kind]||e.kind)+' · '+summary(e);small.textContent=stamp(e.effective_at);row.append(b,small);box.append(row);}}
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
const inspectionDay=el('chart-day'),inspectionValue=el('chart-reading');
if(selected){
  let date=new Date(selected.day+'T12:00:00Z').toLocaleDateString('en-US',{timeZone:'UTC',month:'short',day:'numeric',year:'numeric'});
  inspectionDay.textContent=date+' · daily average';
  inspectionValue.textContent=selected.value===null||!Number.isFinite(selected.value)?'No reading':selected.value.toFixed(1)+' '+unit[metric];
}else{
  inspectionDay.textContent='Tap or drag to inspect daily averages';
  inspectionValue.textContent=good.length?'':'No measurements';
}
c.setAttribute('aria-valuemin','1');
c.setAttribute('aria-valuemax',String(data.length));
c.setAttribute('aria-valuenow',String(Math.max(1,selectionIndex+1)));
c.setAttribute('aria-valuetext',(selected?inspectionDay.textContent+': '+inspectionValue.textContent:'No recorded data'));
if(!good.length){ctx.fillStyle='#9fb3bf';ctx.font='13px sans-serif';ctx.fillText('No measurements for this period',28,H/2);return;}let values=good.map(d=>d.value),min=Math.min(...values),max=Math.max(...values),pad=Math.max((max-min)*.2,metric==='hrv_sdnn'?4:2);min=Math.max(0,min-pad);max+=pad;let x=i=>left+(right-left)*i/Math.max(1,data.length-1),y=v=>bottom-(v-min)/(max-min)*(bottom-top);ctx.font='11px sans-serif';ctx.textAlign='right';for(let i=0;i<4;i++){let n=min+(max-min)*i/3,yy=y(n);ctx.strokeStyle='#293d48';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(left,yy);ctx.lineTo(right,yy);ctx.stroke();ctx.fillStyle='#8ea5ae';ctx.fillText(String(Math.round(n)),left-8,yy+4);}ctx.textAlign='left';ctx.fillText(data[0]?.day?.slice(5)||'',left,H-8);ctx.textAlign='right';ctx.fillText(data[data.length-1]?.day?.slice(5)||'',right,H-8);
ctx.strokeStyle='#7dd0c2';ctx.lineWidth=2.5;ctx.lineJoin='round';ctx.beginPath();let drawing=false;data.forEach((d,i)=>{if(d.value===null||!Number.isFinite(d.value)){drawing=false;return;}if(!drawing)ctx.moveTo(x(i),y(d.value));else ctx.lineTo(x(i),y(d.value));drawing=true;});ctx.stroke();ctx.fillStyle='#9ce5d4';data.forEach((d,i)=>{if(d.value===null||!Number.isFinite(d.value))return;ctx.beginPath();ctx.arc(x(i),y(d.value),2,0,Math.PI*2);ctx.fill();});
for(let e of state.events){if(e.kind==='bp')continue;let day=nyDay(e.effective_at),i=data.findIndex(d=>d.day===day);if(i<0)continue;ctx.strokeStyle='#d5ad6b';ctx.setLineDash([4,5]);ctx.beginPath();ctx.moveTo(x(i),top);ctx.lineTo(x(i),bottom);ctx.stroke();ctx.setLineDash([]);}
if(selected){
  const px=x(selectionIndex);
  ctx.strokeStyle='#e7e7df';
  ctx.lineWidth=1.2;
  ctx.setLineDash([3,4]);
  ctx.beginPath();ctx.moveTo(px,top);ctx.lineTo(px,bottom);ctx.stroke();ctx.setLineDash([]);
  if(selected.value!==null&&Number.isFinite(selected.value)){
    ctx.beginPath();ctx.arc(px,y(selected.value),6.5,0,Math.PI*2);
    ctx.fillStyle='#13242b';ctx.fill();
    ctx.lineWidth=2.6;ctx.strokeStyle='#faf3df';ctx.stroke();
  }
}}
function render(){showMetric('heart_rate','hr');showMetric('resting_heart_rate','rhr');showMetric('hrv_sdnn','hrv');showMetric('blood_oxygen_saturation','spo2');renderContext();renderHistory();chart();window.PulseCompare?.render(state);}
function openDialog(kind){el('kind').value=kind||'trt';el('fields').innerHTML=fields[el('kind').value];let d=new Date(Date.now()-new Date().getTimezoneOffset()*60000);el('when').value=d.toISOString().slice(0,16);txt('save-error','');el('dlg').showModal();}
function payload(kind){let get=id=>el(id)?.value?.trim()||'';switch(kind){case'trt':return {dose_mg:Number(get('dose')),interval_days:Number(get('interval')),route:get('route')};case'medication':return {name:get('name'),status:get('med-status'),dose:get('med-dose'),frequency:get('frequency')};case'nicotine':case'caffeine':return {level:get('level'),notes:get('notes')};case'bp':return Object.assign({systolic:Number(get('sys')),diastolic:Number(get('dia'))},get('pulse')?{pulse:Number(get('pulse'))}:{})}}
el('login').addEventListener('submit',async e=>{e.preventDefault();secret=el('key').value.trim();txt('login-error','');await refresh();if(state)el('key').value='';});
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
});window.addEventListener('resize',()=>{if(state&&!el('app').hidden)chart();});
el('lock').addEventListener('click',()=>{sessionStorage.removeItem(storage);secret='';state=null;visible(false);el('key').value='';});
el('add').addEventListener('click',()=>openDialog('trt'));el('add-med').addEventListener('click',()=>openDialog('medication'));el('cancel').addEventListener('click',()=>el('dlg').close());el('cancel2').addEventListener('click',()=>el('dlg').close());el('kind').addEventListener('change',()=>{el('fields').innerHTML=fields[el('kind').value];});
el('event-form').addEventListener('submit',async e=>{e.preventDefault();let btn=el('save');btn.disabled=true;txt('save-error','');try{let dt=new Date(el('when').value);if(isNaN(dt.getTime()))throw Error('Invalid effective date');let kind=el('kind').value;await rpc('pulse_write',{p_key:secret,p_kind:kind,p_effective_at:dt.toISOString(),p_data:payload(kind)});el('dlg').close();await refresh();}catch(err){txt('save-error',err.message||String(err));}finally{btn.disabled=false;}});
if(secret)refresh();else visible(false);
setInterval(()=>{if(secret&&!document.hidden)refresh();},300000);
