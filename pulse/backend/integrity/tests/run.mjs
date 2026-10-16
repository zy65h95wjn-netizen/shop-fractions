import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
const root = new URL('../', import.meta.url);
const read = p => readFile(new URL(p, root), 'utf8');
const db = new PGlite({ extensions: { pgcrypto } }); // In-memory only. No connection string.
let checks = 0;
function check(actual, expected, label) { assert.deepEqual(actual, expected, label); checks++; }
const scalar = async (sql, args=[]) => Object.values((await db.query(sql,args)).rows[0])[0];
async function rejects(call, code, label) {
  let error;
  try { await call(); } catch (e) { error=e; }
  assert.ok(error, label + ': expected rejection');
  if (code) assert.equal(error.code, code, label);
  checks++;
}
const key = 'synthetic-key-'.repeat(4), at='2026-01-01T12:00:00Z';
const write = (kind,data,when=at,k=key) => db.query(
  'select public.pulse_write($1,$2,$3::timestamptz,$4::jsonb)',[k,kind,when,JSON.stringify(data)]);
const headers = {
  'x-cass-health-token':'synthetic-ingest-token', 'x-cass-step-aggregation':'daily-total'
};
const setHeaders = h => db.query("select set_config('request.headers',$1,false)",[JSON.stringify(h)]);
const ingest = metrics => db.query('select public.cass_ingest_health_export($1::jsonb)',[JSON.stringify({metrics})]);
const steps = (date,qty=100) => ({name:'step_count',units:'count',data:[{date,qty}]});
const count = table => scalar('select count(*)::integer from '+table);
const meta = () => db.query(`select p.proname, p.proacl::text, r.rolname, p.prosecdef, p.proconfig
  from pg_proc p join pg_roles r on r.oid=p.proowner
  where p.oid in ('public.pulse_write(text,text,timestamptz,jsonb)'::regprocedure,
    'public.cass_ingest_health_export(jsonb)'::regprocedure) order by p.proname`);
try {
  await db.exec(await read('tests/schema.sql'));
  for (const file of ['pulse_write','cass_ingest_health_export','pulse_read'])
    await db.exec((await read('baseline/'+file+'.sql')).trim()+';');
  await db.exec(`revoke all on function public.pulse_write(text,text,timestamptz,jsonb) from public;
    grant execute on function public.pulse_write(text,text,timestamptz,jsonb) to anon,authenticated;
    alter function public.cass_ingest_health_export(jsonb) owner to cass_health_ingest;
    revoke all on function public.cass_ingest_health_export(jsonb) from public;
    grant execute on function public.cass_ingest_health_export(jsonb) to anon;`);
  const beforeMeta = (await meta()).rows;
  // Reproduce the actual deployed NULL-validation bugs in the isolated database.
  await write('trt',{}); await write('bp',{});
  await write('medication',{name:'Synthetic'});
  check(await count('pulse_private.events'),3,'baseline permits missing required properties');
  await db.exec('delete from pulse_private.events');
  await setHeaders(headers);
  await ingest([steps('2026-07-01T00:00:00Z')]);
  check(await scalar("select count(*)::integer from health_samples where local_date <> (start_at at time zone 'America/New_York')::date"),1,'baseline reproduces date disagreement');

  const migrations = (await readdir(new URL('supabase/migrations/',root))).sort();
  const migration = async name => read('supabase/migrations/'+migrations.find(f=>f.endsWith(name+'.sql')));
  await db.exec(await migration('pulse_write_null_safe'));
  // The proposal must abort rather than silently repair a legacy row.
  const stepMigration = await migration('step_ny_calendar_contract');
  await rejects(()=>db.exec(stepMigration),'P0001','preflight rejects inconsistent legacy rows');
  await db.exec('rollback'); // expected failed transaction, isolated only
  check(await count('health_samples'),1,'preflight preserved legacy row');
  await db.exec('delete from health_samples'); // synthetic fixture cleanup, never production
  await db.exec(stepMigration);
  check((await meta()).rows,beforeMeta,'function owner, grants, security mode and search_path unchanged');

  const valid = {
    trt:{dose_mg:40,interval_days:3,route:'IM'},
    bp:{systolic:120,diastolic:80},
    medication:{name:'Synthetic',status:'active'},
    nicotine:{level:'none'},caffeine:{level:'low'}
  };
  for(const [kind,data] of Object.entries(valid)) {
    await write(kind,data);
    for(const bad of [{},null,[],true,123,'text'])
      await rejects(()=>write(kind,bad),'22023',kind+' invalid JSON container');
    for(const field of Object.keys(data)) {
      const missing={...data}; delete missing[field];
      await rejects(()=>write(kind,missing),'22023',kind+' missing '+field);
      for(const value of [null,{},[],true,...(typeof data[field]==='number'?['40']: [42])])
        await rejects(()=>write(kind,{...data,[field]:value}),'22023',kind+' type '+field);
    }
  }
  for(const kind of [null,'unknown',''])
    await rejects(()=>write(kind,{}),'22023','invalid kind');
  await rejects(()=>db.query('select public.pulse_write($1,$2,$3,$4)',[key,'bp',at,null]),'22023','SQL NULL data');
  for(const when of [null,'1999-12-31T23:59:59Z','infinity','-infinity','2999-01-01T00:00:00Z'])
    await rejects(()=>write('bp',valid.bp,when),'22023','invalid effective time '+String(when));
  await write('bp',valid.bp,'2000-01-01T00:00:00Z');
  for(const k of [null,'short','x'.repeat(201),'x'.repeat(40)])
    await rejects(()=>write('trt',{},at,k),'28000','auth precedes validation');
  for(const [field,lo,hi] of [['dose_mg',0,1000],['interval_days',0,90]]) {
    for(const n of [lo,-1,hi+0.1,1e100])
      await rejects(()=>write('trt',{...valid.trt,[field]:n}),'22023','TRT numeric bounds');
    for(const n of [0.1,hi]) await write('trt',{...valid.trt,[field]:n,route:'SubQ'});
  }
  await rejects(()=>write('trt',{...valid.trt,route:'oral'}),'22023','TRT route');
  for(const [field,lo,hi] of [['systolic',30,350],['diastolic',20,250],['pulse',20,300]]) {
    for(const n of [lo-0.1,hi+0.1])
      await rejects(()=>write('bp',{...valid.bp,[field]:n}),'22023','BP numeric bounds');
    for(const n of [lo,hi]) await write('bp',{...valid.bp,[field]:n});
  }
  for(const pulse of [null,'60',[],{},true])
    await rejects(()=>write('bp',{...valid.bp,pulse}),'22023','optional BP pulse type');
  await write('bp',{systolic:120.5,diastolic:80.5}); // fractional numbers remain valid
  for(const status of ['active','stopped']) await write('medication',{...valid.medication,status});
  for(const name of ['', '   ', 'x'.repeat(121)])
    await rejects(()=>write('medication',{...valid.medication,name}),'22023','medication name bounds');
  await write('medication',{name:'x'.repeat(120),status:'active'});
  await rejects(()=>write('medication',{...valid.medication,status:'pending'}),'22023','medication status');
  for(const [kind,field,max] of [['medication','dose',120],['medication','frequency',160],['nicotine','notes',240],['caffeine','notes',240]]) {
    for(const value of [null,'','x'.repeat(max)]) await write(kind,{...valid[kind],[field]:value});
    for(const value of [true,{},[],42,'x'.repeat(max+1)])
      await rejects(()=>write(kind,{...valid[kind],[field]:value}),'22023','optional text type and length');
  }
  for(const kind of ['nicotine','caffeine']) {
    for(const level of ['none','low','moderate','high']) await write(kind,{level});
    await rejects(()=>write(kind,{level:'extreme'}),'22023','exposure allowed values');
  }
  await rejects(()=>write('bp',{...valid.bp,extra:'x'.repeat(3000)}),'22023','payload size');
  await db.exec('set role anon');
  await write('bp',valid.bp);
  await rejects(()=>write('bp',valid.bp,at,'x'.repeat(40)),'28000','anon still needs private key');
  await rejects(()=>db.query('select * from pulse_private.events'),'42501','events not directly accessible to anon');
  await db.exec('reset role');
  const eventCount=await count('pulse_private.events');
  await rejects(()=>write('bp',{}),'22023','invalid payload inserts nothing');
  check(await count('pulse_private.events'),eventCount,'events preserved');

  const dates = [
    '2026-01-15 00:00:00 -0500', '2026-07-15 00:00:00 -0400',
    '2026-03-08T00:00:00-05:00', '2026-03-09T00:00:00-04:00',
    '2026-11-01T00:00:00-04:00', '2026-11-02T00:00:00-05:00',
    '2026-07-16T00:00:00.000-04:00'
  ];
  for (const date of dates) await ingest([steps(date,0)]);
  check(await count('health_samples'),dates.length,'summer winter DST and zero accepted');
  check(await scalar("select count(*)::integer from health_samples where value=0"),dates.length,'zero stored as zero');
  for(const date of [
    '2026-07-15T00:00:00Z','2026-01-15T00:00:00+00:00',
    '2026-07-15T00:00:00-05:00','2026-01-15T00:00:00-04:00',
    '2026-03-08T00:00:00-04:00','2026-11-01T00:00:00-05:00',
    '2026-07-15T00:00:00','2026-07-15','2026-07-15T04:00:00Z',
    '2026-07-15T00:00:01-04:00','2026-07-15T00:00:00.001-04:00',
    '2026-02-30T00:00:00-05:00'
  ]) await rejects(()=>ingest([steps(date)]),null,'invalid NY midnight '+date);
  for(const qty of [-1,0.5,200001,null,'100',{},true])
    await rejects(()=>ingest([steps(dates[0],qty)]),null,'invalid step quantity');
  await ingest([steps(dates[0],200000)]); await ingest([steps(dates[0],150)]);
  check(await scalar("select value::integer from health_samples where local_date='2026-01-15'"),150,'legitimate downward correction remains possible');
  await rejects(()=>ingest([steps('2026-02-01T00:00:00-05:00'),steps('2026-02-01 00:00:00 -0500')]),null,'duplicate day rejects entire request');
  check(await scalar("select count(*)::integer from health_samples where local_date='2026-02-01'"),0,'failed request atomic');
  await rejects(()=>ingest([{...steps(dates[0]),data:[{date:dates[0],start:dates[0],qty:3}]}]),null,'raw intervals rejected');
  await setHeaders({'x-cass-health-token':'synthetic-ingest-token'});
  await rejects(()=>ingest([steps(dates[0])]),null,'daily-total header required');
  await setHeaders({});
  await rejects(()=>ingest([]),'42501','ingest auth retained');
  await setHeaders(headers);
  // Constraint protects direct writers too, without adding a new public helper.
  await rejects(()=>db.exec("update health_samples set start_at=start_at+interval '1 hour' where metric='step_count'"),'23514','table calendar constraint');
  await db.exec('set role service_role');
  await rejects(()=>db.query('select local_date from health_samples'),'42501','date reader requires narrow grant');
  await db.exec('reset role');
  await db.exec(await migration('step_date_read_dependency'));
  await db.exec('set role service_role');
  await db.query('select local_date,start_at,value from health_samples');
  await rejects(()=>db.query('select source_name from health_samples'),'42501','no broad grant');
  await db.exec('reset role; set role anon');
  await rejects(()=>db.query('select local_date from health_samples'),'42501','anonymous table access stays denied');
  await db.exec('reset role');

  // Heart importer path stays unchanged: qty/Avg, source and null-source,
  // revised RHR end_at identities and one-time fractional SpO2 normalization.
  await ingest([
    {name:'heart_rate',units:'count/min',data:[{date:at,Avg:60},{date:'2026-01-01T13:00:00Z',Avg:80}]},
    {name:'resting_heart_rate',units:'count/min',data:[
      {start:at,end:'2026-01-01T13:00:00Z',qty:65,source:'Synthetic'},
      {start:at,end:'2026-01-01T14:00:00Z',qty:55,source:'Synthetic'}]},
    {name:'heart_rate_variability',units:'ms',data:[{date:at,qty:40}]},
    {name:'blood_oxygen_saturation',units:'%',data:[{date:at,qty:0.98}]}
  ]);
  check(await scalar("select count(*)::integer from health_samples where metric='resting_heart_rate'"),2,'RHR revisions not collapsed');
  check(await scalar("select avg(value)::integer from health_samples where metric='heart_rate'"),70,'arithmetic heart mean retained');
  check(await scalar("select value::integer from health_samples where metric='blood_oxygen_saturation'"),98,'oxygen normalization unchanged');
  check(await count('pulse_private.events'),eventCount,'imports preserve all events');
  // Review-package rollback rehearsal, entirely in the disposable database.
  const sampleCount=await count('health_samples');
  await db.exec('begin');
  for (const file of ['pulse_write','cass_ingest_health_export'])
    await db.exec((await read('baseline/'+file+'.sql')).trim()+';');
  await db.exec(`alter table health_samples drop constraint health_samples_step_ny_midnight_check;
    revoke select(local_date) on health_samples from service_role; commit;`);
  check((await meta()).rows,beforeMeta,'rollback preserves original function metadata');
  check(await count('health_samples'),sampleCount,'rollback retains health samples');
  check(await count('pulse_private.events'),eventCount,'rollback retains logged events');
  console.log('PASS '+checks+' isolated PostgreSQL assertions; '+await scalar('select version()'));
} finally { await db.close(); }
