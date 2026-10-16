CREATE OR REPLACE FUNCTION public.pulse_write(p_key text, p_kind text, p_effective_at timestamp with time zone, p_data jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare out_id uuid; lev text;
begin
if p_key is null or length(p_key) < 35 or length(p_key) > 200 or not exists (
select 1 from pulse_private.access_keys where key_sha256=encode(extensions.digest(convert_to(p_key,'UTF8'),'sha256'),'hex'))
then raise exception 'Invalid access key' using errcode='28000'; end if;
if p_kind not in ('trt','medication','nicotine','caffeine','bp') or p_effective_at is null
or p_effective_at > now()+interval '1 day' or p_effective_at < '2000-01-01'::timestamptz
or jsonb_typeof(p_data)<>'object' or length(p_data::text)>3000
then raise exception 'Invalid event' using errcode='22023'; end if;
if p_kind='trt' then
if jsonb_typeof(p_data->'dose_mg')<>'number' or (p_data->>'dose_mg')::numeric <= 0
or (p_data->>'dose_mg')::numeric > 1000 or jsonb_typeof(p_data->'interval_days')<>'number'
or (p_data->>'interval_days')::numeric <= 0 or (p_data->>'interval_days')::numeric > 90
or p_data->>'route' not in ('IM','SubQ') then raise exception 'Invalid TRT protocol' using errcode='22023'; end if;
elsif p_kind='medication' then
if length(btrim(coalesce(p_data->>'name',''))) not between 1 and 120
or p_data->>'status' not in ('active','stopped')
or length(coalesce(p_data->>'dose',''))>120 or length(coalesce(p_data->>'frequency',''))>160
then raise exception 'Invalid medication' using errcode='22023'; end if;
elsif p_kind in ('nicotine','caffeine') then
lev:=p_data->>'level';
if lev is null or lev not in ('none','low','moderate','high')
or length(coalesce(p_data->>'notes',''))>240
then raise exception 'Invalid exposure' using errcode='22023'; end if;
elsif p_kind='bp' then
if jsonb_typeof(p_data->'systolic')<>'number' or jsonb_typeof(p_data->'diastolic')<>'number'
or (p_data->>'systolic')::numeric not between 30 and 350
or (p_data->>'diastolic')::numeric not between 20 and 250
or (p_data ? 'pulse' and (jsonb_typeof(p_data->'pulse')<>'number'
or (p_data->>'pulse')::numeric not between 20 and 300))
then raise exception 'Invalid blood pressure' using errcode='22023'; end if;
end if;
insert into pulse_private.events(kind,effective_at,data) values(p_kind,p_effective_at,p_data) returning id into out_id;
return out_id;
end $function$

