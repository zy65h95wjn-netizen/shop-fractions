-- PROPOSAL ONLY. Required BEFORE deploying the local_date endpoint reader.
-- Date metadata only; does not grant table-wide or anonymous access.
BEGIN;
GRANT SELECT (local_date) ON public.health_samples TO service_role;
COMMIT;
