CREATE OR REPLACE FUNCTION public.cass_ingest_health_export(data jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'cass_private', 'extensions'
 SET "TimeZone" TO 'UTC'
AS $function$
declare
  headers jsonb := coalesce(nullif(current_setting('request.headers', true), '')::jsonb, '{}'::jsonb);
  token text := headers ->> 'x-cass-health-token';
  metric_obj jsonb;
  sample_obj jsonb;
  metric_name text;
  db_metric text;
  units_text text;
  canonical_unit text;
  start_text text;
  end_text text;
  source_text text;
  context_text text;
  start_ts timestamptz;
  end_ts timestamptz;
  sample_value numeric;
  stable_hash text;
  processed_count integer := 0;
  metrics_count integer := 0;
  step_day date;
  seen_step_days date[] := '{}'::date[];
begin
  if cass_private.health_token_valid(token) is distinct from true then
    raise insufficient_privilege using message = 'invalid health ingest token';
  end if;

  if data is null or jsonb_typeof(data) <> 'object' then
    raise exception 'invalid payload';
  end if;
  if octet_length(data::text) > 5242880 then
    raise exception 'payload too large';
  end if;
  if jsonb_typeof(data -> 'metrics') is distinct from 'array' then
    raise exception 'metrics must be an array';
  end if;

  for metric_obj in select value from jsonb_array_elements(data -> 'metrics') loop
    metrics_count := metrics_count + 1;
    if metrics_count > 10 then raise exception 'too many metric groups'; end if;
    metric_name := metric_obj ->> 'name';
    units_text := metric_obj ->> 'units';
    case metric_name
      when 'step_count' then db_metric := 'step_count'; canonical_unit := 'count';
      when 'heart_rate' then db_metric := 'heart_rate'; canonical_unit := 'bpm';
      when 'heart_rate_variability' then db_metric := 'hrv_sdnn'; canonical_unit := 'ms';
      when 'resting_heart_rate' then db_metric := 'resting_heart_rate'; canonical_unit := 'bpm';
      when 'blood_oxygen_saturation' then db_metric := 'blood_oxygen_saturation'; canonical_unit := '%';
      else raise exception 'unsupported metric: %', coalesce(metric_name, '<null>');
    end case;
    if db_metric in ('heart_rate','resting_heart_rate') and units_text <> 'count/min' then
      raise exception 'unexpected heart-rate unit: %', coalesce(units_text, '<null>');
    end if;
    if db_metric = 'hrv_sdnn' and units_text <> 'ms' then
      raise exception 'unexpected HRV unit: %', coalesce(units_text, '<null>');
    end if;
    if db_metric = 'blood_oxygen_saturation' and coalesce(lower(btrim(units_text)),'') not in ('%','percent','percentage','pct') then
      raise exception 'unexpected oxygen unit: %', coalesce(units_text, '<null>');
    end if;
    if db_metric = 'step_count' then
      if units_text is distinct from 'count' then raise exception 'unexpected step unit'; end if;
      if headers ->> 'x-cass-step-aggregation' is distinct from 'daily-total' then
        raise exception 'steps require daily summarized export';
      end if;
    end if;
    if jsonb_typeof(metric_obj -> 'data') is distinct from 'array' then raise exception 'metric data must be an array'; end if;

    for sample_obj in select value from jsonb_array_elements(metric_obj -> 'data') loop
      processed_count := processed_count + 1;
      if processed_count > 25000 then raise exception 'too many samples'; end if;
      start_text := coalesce(sample_obj ->> 'start', sample_obj ->> 'date');
      end_text := sample_obj ->> 'end';
      source_text := nullif(sample_obj ->> 'source', '');
      context_text := nullif(sample_obj ->> 'context', '');
      if start_text is null then raise exception 'sample missing start/date'; end if;
      start_ts := start_text::timestamptz;
      end_ts := case when end_text is null or end_text = '' then null else end_text::timestamptz end;
      if end_ts is not null and end_ts < start_ts then raise exception 'sample end precedes start'; end if;
      if sample_obj ? 'qty' then sample_value := (sample_obj ->> 'qty')::numeric;
      elsif sample_obj ? 'Avg' then sample_value := (sample_obj ->> 'Avg')::numeric;
      else raise exception 'sample missing value'; end if;
      step_day := null;
      if db_metric = 'step_count' then
        -- Never total overlapping raw Watch/iPhone samples here. Accept one exported day summary.
        if jsonb_typeof(sample_obj -> 'qty') is distinct from 'number'
           or sample_value is null or sample_value < 0 or sample_value > 200000
           or sample_value <> trunc(sample_value) then
          raise exception 'steps require an integer daily total between 0 and 200000';
        end if;
        if start_text !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}[ T]00:00:00([.]0+)?[ ]?(Z|[+-][0-9]{2}:?[0-9]{2})$'
           or sample_obj ->> 'date' is distinct from start_text
           or nullif(sample_obj ->> 'start', '') is not null
           or end_ts is not null then
          raise exception 'steps require a local-midnight date with explicit UTC offset, not raw intervals';
        end if;
        step_day := left(start_text, 10)::date;
        if step_day = any(seen_step_days) then
          raise exception 'multiple step totals for one day in a request';
        end if;
        seen_step_days := array_append(seen_step_days, step_day);
      elsif db_metric = 'blood_oxygen_saturation' then
        if sample_value <= 0 or sample_value > 100 then
          raise exception 'oxygen saturation out of range';
        end if;
        -- Normalize fractional HealthKit oxygen values to percent once.
        if sample_value <= 1 then sample_value := sample_value * 100; end if;
      elsif sample_value <= 0 or sample_value > 5000 then
        raise exception 'sample value out of range';
      end if;

      stable_hash := encode(
        extensions.digest(
          convert_to(db_metric || '|' || coalesce(source_text, '') || '|' || start_ts::text || '|' || coalesce(end_ts::text, ''), 'UTF8'),
          'sha256'
        ), 'hex'
      );

      if db_metric = 'step_count' then
        stable_hash := encode(extensions.digest(
          convert_to('step_count|daily|' || to_char(step_day, 'YYYY-MM-DD'), 'UTF8'), 'sha256'), 'hex');
      end if;

      insert into public.health_samples(sample_hash, metric, start_at, end_at, value, unit, source_name, device_name, context, local_date)
      values (stable_hash, db_metric, start_ts, end_ts, sample_value, canonical_unit, source_text, null, context_text, step_day)
      on conflict (sample_hash) do update
      set end_at = excluded.end_at,
          value = excluded.value,
          unit = excluded.unit,
          source_name = excluded.source_name,
          device_name = excluded.device_name,
          context = excluded.context,
          ingested_at = now();
    end loop;
  end loop;
  return jsonb_build_object('ok', true, 'processed', processed_count);
end;
$function$

