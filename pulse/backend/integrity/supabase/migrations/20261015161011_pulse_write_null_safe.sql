-- PROPOSAL ONLY. Never run against production during review.
BEGIN;
DO $preflight$
BEGIN
  IF md5(pg_get_functiondef('public.pulse_write(text,text,timestamptz,jsonb)'::regprocedure))
     <> '4ab1af997c3c01ddf618c1344614e35f' THEN
    RAISE EXCEPTION 'pulse_write changed since inspection; re-review before replacing';
  END IF;
END $preflight$;

CREATE OR REPLACE FUNCTION public.pulse_write(
  p_key text, p_kind text, p_effective_at timestamptz, p_data jsonb
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $function$
DECLARE out_id uuid; lev text;
BEGIN
-- Keep authentication first, unchanged.
if p_key is null or length(p_key) < 35 or length(p_key) > 200 or not exists (
select 1 from pulse_private.access_keys where key_sha256=encode(extensions.digest(convert_to(p_key,'UTF8'),'sha256'),'hex'))
then raise exception 'Invalid access key' using errcode='28000'; end if;

IF p_kind IS NULL OR p_kind NOT IN ('trt','medication','nicotine','caffeine','bp')
   OR p_effective_at IS NULL OR p_effective_at > now()+interval '1 day'
   OR p_effective_at < '2000-01-01'::timestamptz
   OR jsonb_typeof(p_data) IS DISTINCT FROM 'object' OR length(p_data::text)>3000 THEN
  RAISE EXCEPTION 'Invalid event' USING ERRCODE='22023';
END IF;

IF p_kind='trt' THEN
  -- Validate types before casting: do not depend on OR short-circuit order.
  IF jsonb_typeof(p_data->'dose_mg') IS DISTINCT FROM 'number'
     OR jsonb_typeof(p_data->'interval_days') IS DISTINCT FROM 'number'
     OR jsonb_typeof(p_data->'route') IS DISTINCT FROM 'string' THEN
    RAISE EXCEPTION 'Invalid TRT protocol' USING ERRCODE='22023';
  END IF;
  IF (p_data->>'dose_mg')::numeric <= 0 OR (p_data->>'dose_mg')::numeric > 1000
     OR (p_data->>'interval_days')::numeric <= 0 OR (p_data->>'interval_days')::numeric > 90
     OR p_data->>'route' NOT IN ('IM','SubQ') THEN
    RAISE EXCEPTION 'Invalid TRT protocol' USING ERRCODE='22023';
  END IF;
ELSIF p_kind='medication' THEN
  IF jsonb_typeof(p_data->'name') IS DISTINCT FROM 'string'
     OR jsonb_typeof(p_data->'status') IS DISTINCT FROM 'string'
     -- Optional text: absent and JSON null remain accepted; other types do not.
     OR (p_data ? 'dose' AND jsonb_typeof(p_data->'dose') NOT IN ('string','null'))
     OR (p_data ? 'frequency' AND jsonb_typeof(p_data->'frequency') NOT IN ('string','null'))
     OR length(btrim(coalesce(p_data->>'name',''))) NOT BETWEEN 1 AND 120
     OR (p_data->>'status' IN ('active','stopped')) IS NOT TRUE
     OR length(coalesce(p_data->>'dose',''))>120
     OR length(coalesce(p_data->>'frequency',''))>160 THEN
    RAISE EXCEPTION 'Invalid medication' USING ERRCODE='22023';
  END IF;
ELSIF p_kind IN ('nicotine','caffeine') THEN
  lev := p_data->>'level';
  IF jsonb_typeof(p_data->'level') IS DISTINCT FROM 'string'
     OR (lev IN ('none','low','moderate','high')) IS NOT TRUE
     OR (p_data ? 'notes' AND jsonb_typeof(p_data->'notes') NOT IN ('string','null'))
     OR length(coalesce(p_data->>'notes',''))>240 THEN
    RAISE EXCEPTION 'Invalid exposure' USING ERRCODE='22023';
  END IF;
ELSIF p_kind='bp' THEN
  IF jsonb_typeof(p_data->'systolic') IS DISTINCT FROM 'number'
     OR jsonb_typeof(p_data->'diastolic') IS DISTINCT FROM 'number'
     OR (p_data ? 'pulse' AND jsonb_typeof(p_data->'pulse') IS DISTINCT FROM 'number') THEN
    RAISE EXCEPTION 'Invalid blood pressure' USING ERRCODE='22023';
  END IF;
  IF (p_data->>'systolic')::numeric NOT BETWEEN 30 AND 350
     OR (p_data->>'diastolic')::numeric NOT BETWEEN 20 AND 250
     OR (p_data ? 'pulse' AND (p_data->>'pulse')::numeric NOT BETWEEN 20 AND 300) THEN
    RAISE EXCEPTION 'Invalid blood pressure' USING ERRCODE='22023';
  END IF;
END IF;
insert into pulse_private.events(kind,effective_at,data) values(p_kind,p_effective_at,p_data) returning id into out_id;
return out_id;
END $function$;
-- CREATE OR REPLACE preserves existing ownership and EXECUTE grants.
COMMIT;
