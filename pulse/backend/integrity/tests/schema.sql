-- SYNTHETIC ISOLATED FIXTURE ONLY. Never run against a connected project.
SET TIME ZONE 'UTC';
CREATE ROLE anon;
CREATE ROLE authenticated;
CREATE ROLE service_role BYPASSRLS;
CREATE ROLE cass_health_ingest;
CREATE SCHEMA extensions;
CREATE EXTENSION pgcrypto WITH SCHEMA extensions;
CREATE SCHEMA pulse_private;
CREATE SCHEMA cass_private;
CREATE TABLE pulse_private.access_keys(key_sha256 text PRIMARY KEY);
CREATE TABLE pulse_private.events(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK(kind IN ('trt','medication','nicotine','caffeine','bp')),
  effective_at timestamptz NOT NULL, data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.health_samples(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), sample_hash text NOT NULL UNIQUE,
  metric text NOT NULL CHECK(metric IN ('heart_rate','resting_heart_rate','hrv_sdnn','step_count','blood_oxygen_saturation')),
  start_at timestamptz NOT NULL, end_at timestamptz, value numeric NOT NULL, unit text NOT NULL,
  source_name text, device_name text, ingested_at timestamptz NOT NULL DEFAULT now(),
  context text, local_date date,
  CONSTRAINT health_samples_oxygen_units_check CHECK (
    metric <> 'blood_oxygen_saturation' OR (unit='%' AND value>0 AND value<=100 AND local_date IS NULL)),
  CONSTRAINT health_samples_step_daily_check CHECK (
    (metric <> 'step_count' AND local_date IS NULL) OR
    (metric='step_count' AND local_date IS NOT NULL AND unit='count' AND value>=0 AND value<=200000
     AND value=trunc(value) AND end_at IS NULL AND
     sample_hash=encode(extensions.digest(convert_to('step_count|daily|' ||
       to_char(local_date::timestamptz,'YYYY-MM-DD'),'UTF8'),'sha256'),'hex')))
);
CREATE UNIQUE INDEX health_samples_step_daily_unique ON public.health_samples(local_date) WHERE metric='step_count';
ALTER TABLE public.health_samples ENABLE ROW LEVEL SECURITY;
GRANT USAGE ON SCHEMA public, extensions, cass_private TO cass_health_ingest;
GRANT SELECT, INSERT, UPDATE ON public.health_samples TO cass_health_ingest;
CREATE POLICY fixture_ingest ON public.health_samples TO cass_health_ingest USING (true) WITH CHECK (true);
-- Only the external token validator is a stub; no real key or token is used.
CREATE FUNCTION cass_private.health_token_valid(token text) RETURNS boolean
LANGUAGE sql AS $$ SELECT token = 'synthetic-ingest-token' $$;
GRANT SELECT (metric,start_at,end_at,value,sample_hash) ON public.health_samples TO service_role;
INSERT INTO pulse_private.access_keys VALUES (
  encode(extensions.digest(convert_to(repeat('synthetic-key-',4),'UTF8'),'sha256'),'hex')
);
