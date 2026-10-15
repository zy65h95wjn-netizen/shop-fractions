// Local-only regression for the seven-day RHR canvas, no health-service requests.
// Run: node pulse/tests/rhr_spark_labels.js
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'..','app-iron-v11.js'),'utf8');
const func=source.slice(source.indexOf('function renderTodayRhr(){'),source.indexOf('\n\nfunction render()'));
assert.ok(func.startsWith('function renderTodayRhr(){'));
const execute=new Function('state','el','nyDay','localShift','devicePixelRatio',func+';renderTodayRhr();');
const localShift=(day,delta)=>{
  const d=new Date(day+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+delta);
  return d.toISOString().slice(0,10);
};
function check(width,values){
  const ink=[];
  const ctx={
    font:'',fillStyle:'',strokeStyle:'',textAlign:'',textBaseline:'',
    setTransform(){},clearRect(){},beginPath(){},moveTo(){},lineTo(){},
    stroke(){},arc(){},fill(){},
    fillText(text,x,y){ink.push({text:String(text),x,y,font:this.font});}
  };
  const attrs={},canvas={getContext:()=>ctx,getBoundingClientRect:()=>({width,height:146}),
    setAttribute:(name,value)=>{attrs[name]=value;}};
  const els={'today-rhr-spark':canvas,'today-rhr-caption':{},'today-rhr-delta':{}};
  const daily=values.map((v,i)=>({day:localShift('2026-10-15',i-7),resting_heart_rate:v}));
  execute({daily},id=>els[id],()=> '2026-10-15',localShift,3);
  const dateLabels=ink.filter(x=>/^\d{1,2}\/\d{1,2}$/.test(x.text));
  const pointLabels=ink.filter(x=>x.font==='600 11px system-ui').map(x=>x.text);
  assert.deepEqual(dateLabels.map(x=>x.text),['10/8','10/9','10/10','10/11','10/12','10/13','10/14']);
  assert.ok(ink.every(x=>x.x>=0&&x.x<=width&&x.y>=0&&x.y<=146),'all text in canvas');
  assert.ok(attrs['aria-label'].includes('2026-10-14:'),'full dates available to assistive tech');
  assert.equal(pointLabels.length,values.filter(v=>v!==null&&v!==undefined).length);
  return {ink,pointLabels,attrs,els};
}
for(const w of [320,390,430]){
  const a=check(w,[82,84,78,91,87,85,90]);
  assert.deepEqual(a.pointLabels,['82','84','78','91','87','85','90']);
  assert.equal(a.els['today-rhr-delta'].textContent,'7/7 days');
  assert.ok(a.attrs['aria-label'].includes('2026-10-08: 82.0 bpm'));
  const b=check(w,[82,null,78,91,87,85,90]);
  assert.equal(b.pointLabels.length,6);
  assert.ok(b.ink.some(x=>x.text==='—'),'missing day is visibly marked');
  assert.ok(b.attrs['aria-label'].includes('2026-10-09: no reading'));
  assert.equal(b.els['today-rhr-delta'].textContent,'6/7 days');
  const c=check(w,[null,null,null,null,null,null,null]);
  assert.equal(c.pointLabels.length,0);
  assert.ok(c.ink.some(x=>x.text.includes('No completed-day RHR')));
}
assert.deepEqual(check(390,[87.4,87.5,85.1,82,84,86,90]).pointLabels,
  ['87.4','87.5','85.1','82','84','86','90']);
console.log('PASS: 7 numeric labels, 7 local dates, 320/390/430px, decimals, missing days, empty state, aria values');
