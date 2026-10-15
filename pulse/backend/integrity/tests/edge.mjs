import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
const source = await readFile(new URL('../../pulse-dashboard-corrected/index.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(source+'\nglobalThis.helpers={stepSummary,dayInNY,validStepTotal};',{
  compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None},reportDiagnostics:true
});
assert.equal(compiled.diagnostics.length,0,'TypeScript transpilation');
let checks=0;
const check=(a,b,label)=>{assert.deepEqual(JSON.parse(JSON.stringify(a)),b,label);checks++;};
const row=(local_date,start_at,value)=>({local_date,start_at,value});
const nov1=row('2026-11-01','2026-11-01T04:00:00Z',1200);
const nov2=row('2026-11-02','2026-11-02T05:00:00Z',0);
const base={daily:[
  {day:'2026-11-01',heart_rate:75,resting_heart_rate:60,hrv_sdnn:40,blood_oxygen_saturation:98},
  {day:'2026-11-02',heart_rate:77,resting_heart_rate:63,hrv_sdnn:42,blood_oxygen_saturation:97}
],events:[{kind:'trt',data:{dose_mg:40}}],latest:{heart_rate:{value:77}}};
const resting=[
  {start_at:'2026-11-01T04:00:00Z',end_at:'2026-11-01T18:00:00Z',value:55,sample_hash:'a'},
  {start_at:'2026-11-01T04:00:00Z',end_at:'2026-11-01T13:00:00Z',value:65,sample_hash:'b'},
  {start_at:'2026-11-02T05:00:00Z',end_at:'2026-11-02T06:00:00Z',value:54,sample_hash:'c'}
];
function setup({stepRows=[nov2,nov1],authStatus=200,authBody=base,stepStatus=200,noSecret=false,restingRows=resting}={}){
  let handler; const requests=[];
  class Clock extends Date{
    constructor(...args){super(...(args.length?args:['2026-11-02T12:00:00Z']));}
    static now(){return Date.parse('2026-11-02T12:00:00Z');}
  }
  const context=vm.createContext({Date:Clock,Intl,URL,Response,Request,console,
    Deno:{env:{get:name=>name==='SUPABASE_SERVICE_ROLE_KEY'?(noSecret?undefined:'synthetic-server-key'):undefined},
      serve:fn=>{handler=fn;}},
    fetch:async (url,options)=>{
      const u=new URL(url);requests.push({u,options});
      if(u.pathname.endsWith('/rpc/pulse_read'))return new Response(JSON.stringify(authBody),{status:authStatus});
      if(u.searchParams.get('metric')==='eq.resting_heart_rate')return new Response(JSON.stringify(restingRows));
      if(u.searchParams.get('metric')==='eq.step_count')return new Response(JSON.stringify(stepRows),{status:stepStatus});
      throw Error('Unexpected network request');
    }});
  vm.runInContext(compiled.outputText,context);
  return {requests,helpers:context.helpers,invoke: async (payload={p_key:'synthetic-key-'.repeat(4),p_days:90},options={})=>{
    const r=await handler(new Request('https://synthetic.invalid/',{method:'POST',
      headers:{origin:'https://zy65h95wjn-netizen.github.io','content-type':'application/json',...options.headers},
      body:JSON.stringify(payload)}));return {status:r.status,body:await r.json(),headers:r.headers};
  }};
}
const main=setup(), result=await main.invoke();
check(result.status,200,'authorized success');
check(result.body.steps,{today:0,yesterday:1200,average_7d:1200,days_present:1,last_completed_day:'2026-11-01'},'zero and completed day semantics');
check(result.body.daily.map(d=>d.resting_heart_rate),[55,54],'greatest end_at RHR revision');
check(result.body.latest.resting_heart_rate,{value:54,unit:'bpm',at:'2026-11-02T06:00:00Z'},'latest RHR');
check(result.body.daily.map(({resting_heart_rate,...d})=>d),
  base.daily.map(({resting_heart_rate,...d})=>d),'all other daily arithmetic unchanged');
check(result.body.events,base.events,'TRT events unchanged');
check(result.body.latest.heart_rate,base.latest.heart_rate,'latest other heart data unchanged');
check(result.body.resting_hr_method,'latest_end_at_per_local_day','RHR method contract');
check(result.headers.get('cache-control'),'no-store, private','no health response caching');
check(main.requests[0].u.pathname.endsWith('/rpc/pulse_read'),true,'auth precedes privileged reads');
const request=main.requests.find(r=>r.u.searchParams.get('metric')==='eq.step_count').u;
check(request.searchParams.get('select'),'local_date,start_at,value','date metadata selected');
check(request.searchParams.get('local_date'),'gte.2026-10-23','calendar cutoff');
check(request.searchParams.get('and'),'(local_date.lte.2026-11-02)','exclude future dates');
check(request.searchParams.get('order'),'local_date.desc','calendar ordering');
const h=main.helpers;
check(h.dayInNY('2026-07-01T03:59:59Z'),'2026-06-30','summer before NY midnight');
check(h.dayInNY('2026-07-01T04:00:00Z'),'2026-07-01','summer NY midnight');
check(h.dayInNY('2026-01-01T04:59:59Z'),'2025-12-31','winter before NY midnight');
check(h.dayInNY('2026-01-01T05:00:00Z'),'2026-01-01','winter NY midnight');
check(h.stepSummary([nov1],'2026-11-02').today,null,'missing today never falls back');
check(h.stepSummary([nov2],'2026-11-02').yesterday,null,'missing yesterday not zero');
check(h.stepSummary([],'2026-11-02'),{today:null,yesterday:null,average_7d:null,days_present:0,last_completed_day:'2026-11-01'},'all missing');
check(h.stepSummary([nov2,nov1,row('2026-10-31','2026-10-31T04:00:00Z',0)],'2026-11-02').average_7d,600,'completed zero counts in mean; current partial excluded');
for(const r of [
  row('2026-03-08','2026-03-08T05:00:00Z',5),
  row('2026-03-09','2026-03-09T04:00:00Z','5'),
  row('2026-11-01','2026-11-01T04:00:00Z',200000),
  row('2026-11-02','2026-11-02T05:00:00Z',0)
])check(h.validStepTotal(r),true,'DST midnight accepted');
for(const bad of [
  {...nov1,local_date:null},{...nov1,local_date:undefined},{...nov1,local_date:'2026-02-30'},
  {...nov1,start_at:'2026-11-01T00:00:00Z'}, {...nov1,start_at:'2026-11-01T05:00:00Z'},
  {...nov1,start_at:'2026-11-01T04:00:00.001Z'},
  {...nov1,local_date:'2026-10-31'},
  ...[null,'',' ',true,{},-1,0.1,200001].map(value=>({...nov1,value}))
]){
  check(h.validStepTotal(bad),false,'invalid stored row fails closed');
  check((await setup({stepRows:[bad]}).invoke()).status,503,'endpoint rejects invalid stored row');
}
check((await setup({stepRows:[nov1,nov1]}).invoke()).status,503,'duplicate local date fails closed');
check((await setup({stepStatus:403}).invoke()).status,503,'missing grant fails closed');
for(const [authStatus,authBody,status] of [
  [401,{code:'28000'},401],[403,{code:'28000'},401],
  [401,{code:'PGRST301'},503],[403,{code:'42501'},503],
  [500,{error:'temporary'},503],[200,{},503]
]){
  const app=setup({authStatus,authBody}),r=await app.invoke();
  check(r.status,status,'auth error classification');
  check(app.requests.length,1,'failed auth cannot read samples');
  if(status===401)check(r.body.code,'key_mismatch','private key rejection contract');
}
const locked=setup({noSecret:true});
check((await locked.invoke()).status,503,'missing server credential');
check(locked.requests.length,0,'no requests without server credential');
const short=setup();
check((await short.invoke({p_key:'short',p_days:90})).status,400,'request validation');
check(short.requests.length,0,'invalid request makes no reads');
check((await setup({restingRows:[...resting,{...resting[0],value:50,sample_hash:'z'}]}).invoke()).body.daily[0].resting_heart_rate,50,'stable RHR hash tie break retained');
console.log('PASS '+checks+' mocked Edge Function assertions; no network or real credentials');
