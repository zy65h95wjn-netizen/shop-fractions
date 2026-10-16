CREATE OR REPLACE FUNCTION public.pulse_read(p_key text, p_days integer DEFAULT 30)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare outdata jsonb;
begin
if p_key is null or length(p_key) < 35 or length(p_key) > 200 or not exists (
select 1 from pulse_private.access_keys where key_sha256=encode(extensions.digest(convert_to(p_key,'UTF8'),'sha256'),'hex'))
then raise exception 'Invalid access key' using errcode='28000'; end if;
if p_days not in (7,30,90) then raise exception 'Invalid range' using errcode='22023'; end if;
select jsonb_build_object(
'latest',coalesce((select jsonb_object_agg(metric,jsonb_build_object('value',value,'at',start_at,'unit',unit)) from (
select distinct on(metric) metric,value,start_at,unit from public.health_samples
where metric in ('heart_rate','resting_heart_rate','hrv_sdnn','blood_oxygen_saturation') order by metric,start_at desc
) latest),'{}'::jsonb),
'daily',coalesce((select jsonb_agg(to_jsonb(d) order by d.day) from (
select (start_at at time zone 'America/New_York')::date as day,
round(avg(value) filter(where metric='heart_rate'),1) as heart_rate,
round(avg(value) filter(where metric='resting_heart_rate'),1) as resting_heart_rate,
round(avg(value) filter(where metric='hrv_sdnn'),1) as hrv_sdnn,
round(avg(value) filter(where metric='blood_oxygen_saturation'),1) as blood_oxygen_saturation
from public.health_samples where metric in ('heart_rate','resting_heart_rate','hrv_sdnn','blood_oxygen_saturation')
and start_at >= now()-make_interval(days=>p_days) group by 1 order by 1
) d),'[]'::jsonb),
'events',coalesce((select jsonb_agg(to_jsonb(e) order by effective_at desc,created_at desc) from
(select id,kind,effective_at,data,created_at from pulse_private.events
order by effective_at desc,created_at desc limit 500) e),'[]'::jsonb),
'synced_at',now()) into outdata;
return outdata;
end $function$

