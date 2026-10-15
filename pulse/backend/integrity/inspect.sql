-- READ ONLY. No measurement values, source names, credentials or event content.
SELECT count(*) AS step_rows,
       count(*) FILTER (WHERE local_date IS NULL) AS missing_dates,
       count(*) FILTER (WHERE local_date IS DISTINCT FROM
         (start_at AT TIME ZONE 'America/New_York')::date) AS wrong_dates,
       count(*) FILTER (WHERE start_at IS DISTINCT FROM
         (local_date::timestamp AT TIME ZONE 'America/New_York')) AS wrong_midnights
FROM public.health_samples WHERE metric='step_count';

SELECT p.oid::regprocedure::text AS signature,
       md5(pg_get_functiondef(p.oid)) AS definition_md5,
       pg_get_userbyid(p.proowner) AS owner, p.proacl, p.proconfig
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public'
  AND p.proname IN ('cass_ingest_health_export','pulse_write','pulse_read');

SELECT grantee,column_name,privilege_type FROM information_schema.column_privileges
WHERE table_schema='public' AND table_name='health_samples' AND grantee='service_role';
