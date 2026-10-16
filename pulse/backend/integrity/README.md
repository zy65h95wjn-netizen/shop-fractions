# Resting Beast backend integrity correction package

**Review only. No migration, function deployment, production write, credential change, or permission change was performed.**

Based on production main `f64a4c0ebd565e0f2d1eb818b44213f4d4920a25`. Independent branch: `fix/resting-beast-backend-integrity`. PR #11 and the separate frontend correction branch are untouched.

## Evidence and root causes

Read-only inspection on 2026-10-15 retrieved the deployed importer and writer definitions, the relevant schema, constraints, indexes, owners/ACLs, column grants, and corrected Edge Function version 4. The deployed Edge source matched main (ignoring a terminal newline). A final read-only fingerprint check confirmed all three database function definitions remained unchanged.

1. **Confirmed calendar mismatch path:** the importer requires a literal midnight and explicit offset, but does not check that the offset is New York's offset for that midnight. It hashes/stores the literal date in `local_date`; the endpoint instead derives its step date from `start_at`. A UTC-midnight payload is therefore accepted under one date and displayed under the previous New York date. The existing table check does not compare these two fields. This behavior is reproduced with synthetic data before applying the proposals locally.
2. **Confirmed write validation bypass:** comparisons such as `jsonb_typeof(p_data->'dose_mg') <> 'number'` and `route NOT IN (...)` yield SQL NULL for absent fields. A PL/pgSQL IF does not reject a NULL condition. An empty TRT or BP object, or a medication with no status, can pass the old guard. The isolated tests reproduce these actual function behaviors, then verify rejection by the replacement.
3. **Confirmed unconditional overwrite, unconfirmed real-world stale delivery:** the importer identifies a step row by calendar day and always updates its value on conflict. Neither its persisted schema nor the current contract retains a source snapshot revision. A delayed older request would win if it arrived last. No historical out-of-order incident or cause of a particular count is claimed.

The `baseline/` SQL files are definition-only snapshots for comparison, isolated tests and emergency rollback. They contain no credentials or health records. `pulse_read.sql` is an unchanged reference, not a proposed migration.

## Authoritative daily-step contract

- `local_date` is the authoritative New York calendar date, taken from the literal date of an accepted daily-total sample.
- The current payload/header contract is unchanged: `step_count`, `count`, numeric integer `qty` from 0 through 200000, `x-cass-step-aggregation: daily-total`, one date per request, no raw start/end interval.
- A date must encode literal 00:00:00, with an explicit offset, and its instant must equal `local_date::timestamp AT TIME ZONE 'America/New_York'`. This checks the date, time and date-specific offset together.
- Summer midnight uses -0400; winter uses -0500. At midnight on the spring change day the offset is still -0500; at midnight on the fall change day it is still -0400. The following midnights use the new offsets. ISO and existing space-separated offset formats remain accepted, including zero fractional seconds.
- UTC midnight, missing offsets, wrong seasonal offsets, non-midnight times and invalid calendar dates are rejected. Never fix these by moving an exported total to another date: a different aggregation boundary may represent a different set of measurements.
- Today remains an imported **partial-day** total. Yesterday is the imported summary for the prior **completed calendar day**. Missing days stay NULL; actual zero stays zero. The seven-day compatibility mean includes only present prior-day totals, including zero, and excludes today. A completed calendar day is not proof that an export is final or covers the full day.
- Source configuration must actually export cumulative day totals from New York midnight. A `Since Last Sync` interval must not be mislabeled a full-day total. This cannot be inferred from `date` and `qty` alone. No exporter settings were changed.

## Exact proposed changes

| File | Behavior |
| --- | --- |
| `supabase/migrations/20261015161011_pulse_write_null_safe.sql` | Replace only `pulse_write`; explicitly reject SQL NULL kinds/data and missing/null/wrong-type required fields. Check types before numeric casts; retain existing bounds, allowed values and insertion logic. |
| `supabase/migrations/20261015161202_step_ny_calendar_contract.sql` | Add the New York midnight equality check to the importer and a table CHECK constraint. Abort if existing rows violate it. No record updates or deletes. Bounded lock/statement timeouts. |
| `supabase/migrations/20261015161254_step_date_read_dependency.sql` | Propose only `SELECT(local_date)` for the existing service role. No public/anonymous access or table-wide grant. This is required because that column was absent from the inspected service-role grants. |
| `../pulse-dashboard-corrected/index.ts` | Read, filter, order and group steps by validated `local_date`; reject contradictory/malformed records. Retain key-first authorization, all response fields, latest revised RHR selection and other daily aggregations. |

Both function replacements preserve signatures, parameter names, return types, SECURITY DEFINER, search_path, importer UTC setting, ownership and existing EXECUTE ACLs. They do not DROP functions or introduce a callable helper. Fingerprint preconditions abort if deployed definitions have changed since inspection.

Required event fields: TRT `dose_mg`, `interval_days`, `route`; BP `systolic`, `diastolic`; medication `name`, `status`; nicotine/caffeine `level`. BP `pulse` is optional but must be numeric when present; explicit JSON null was already invalid. Optional medication dose/frequency and exposure notes accept absent, empty-string and JSON-null values as before; objects, arrays, numbers and booleans are now rejected. Optional text length limits remain unchanged. Extra properties are retained. No new physiological relationship or integer-only restriction is imposed on BP/TRT numbers.

## Automatic pipeline compatibility and existing records

Valid New York daily exports retain their current body, headers, units, hashes and upsert semantics. No freshness fields are newly required. Heart metric paths are unchanged, including `qty`/`Avg`, source omission and fractional oxygen normalization. No frontend payload change is required.

Read-only aggregate/date-metadata inspection found **zero stored step-date contract violations**, including no missing local dates, wrong New York dates or non-midnight instants. No personal measurement values were retrieved. No existing-record remediation is proposed or included. The migration repeats its own check and stops if the situation changes.

Historical manual events are never rewritten by this package. Future invalid writes are rejected. No claim is made that every historical event has been retrospectively validated.

One invalid step sample rejects its entire RPC transaction, including other metrics in a mixed request, as existing validation failures already do. Exporters that aggregate in another timezone are intentionally incompatible with the fixed New York contract. Fixed-timezone behavior during travel is not verified; do not assume changing an offset label fixes aggregation.

## Freshness: recommendation only, no implementation

Official Health Auto Export documentation describes sample `date`, `qty` and optional `source`. The date is the sample/group date, not documented as the generation time of that day's current snapshot. REST automation headers include automation identity, aggregation/period and a session ID; none is documented as an ordered snapshot revision. Custom static headers cannot supply a changing measurement revision. No trustworthy ordering signal was demonstrated in this assignment, and the importer does not retain original request bodies/headers for retrospective inspection.

Therefore this PR deliberately preserves last-arrival overwrite behavior and **does not resolve stale export ordering**. Ingestion time orders arrival only. Taking MAX(total) would corrupt legitimate downward corrections. Freezing prior days would prevent corrected totals.

Smallest safe versioned extension, contingent on exporter support:

1. Use one authenticated authoritative snapshot producer (or a stable source identity if multiple producers are allowed). It must serialize snapshot acquisition and assign a persisted, strictly increasing per-day `snapshot_revision` to each new immutable snapshot. Retries reuse that revision. A receiver cannot manufacture this information on arrival.
2. Persist that revision beside each daily total and compare atomically in ON CONFLICT: greater replaces, smaller is stale, equal identical is an idempotent retry, equal conflicting content is an error. Greater revisions may lower the count, including to zero.
3. Bootstrap existing rows with a separately approved producer handshake/fresh snapshot; never infer their revision from `ingested_at`. Define producer reset/identity changes and any legacy-payload transition before rollout. If completeness must be asserted, add explicit verified coverage/finality metadata separately.

A captured-at timestamp is an alternative only after its semantics, clock behavior and retry stability are verified. A request ID, HTTP send time or proxy receipt time is insufficient. Required next evidence: an actual producer-supported revision mechanism or developer confirmation plus redacted payload/header metadata. No user action is needed to review this PR; this is a blocker only to implementing freshness enforcement.

## Tests executed

From the repository root:

```sh
cd pulse/backend/integrity/tests
npm ci --ignore-scripts
npm test
```

The locked dev dependencies are test-only. PGlite runs PostgreSQL and pgcrypto in a disposable in-memory WASM database; the runner takes no database URL and never accesses Supabase. It executes the actual baseline and proposed SQL definitions, not a JavaScript rewrite. The external ingest-token helper is an explicitly synthetic stub. All fixture keys and records are synthetic.

- 191 PostgreSQL assertions passed: baseline defect reproductions; invalid JSON containers; missing/JSON-null fields; incorrect types; required/optional fields; numeric/string bounds; valid boundaries; auth-before-validation; anonymous access restrictions; exact preservation of function ACL/owner/configuration; summer/winter/transition midnights; invalid UTC midnight and offsets; atomic duplicate rejection; zero totals; downward correction; narrow date grant and denied unrelated columns; unchanged heart import paths; full local rollback retaining records.
- 77 mocked Edge assertions passed: authorization before privileged reads; auth error classification; local-date query contract; midnight and DST boundaries; missing versus zero; current partial excluded from completed-day average; malformed/duplicate rows fail closed; revised RHR greatest end_at and hash tie-break; other metrics/events and response shape unchanged.
- Existing `python3 pulse/tests/install_contract.py` and `node pulse/tests/rhr_spark_labels.js` passed.
- `git diff --check` passed.

Execution runtime: Node 24.19.0; PGlite 0.5.10 / PostgreSQL 18.6; TypeScript 5.9.3. Production reports PostgreSQL 17.6. The SQL uses existing PostgreSQL features, but a native PostgreSQL 17.6 / Supabase staging execution and Deno deployment smoke test remain pre-deployment checks. A native local PostgreSQL install was unavailable under the environment's process permissions; no permission bypass was attempted. No real phone export, live authenticated write or production rejection test was performed.

## Safe deployment order — requires a separate deployment decision

1. Reconcile current main and all backend proposals against fresh deployed definitions, owners, ACLs and column grants. Export definition/ACL backups securely. Repeat the date-only check below. Run isolated tests and then an isolated PostgreSQL 17.6/Supabase check. Do not merge or deploy as part of this assignment.
2. Independently approve/apply the writer migration. It has no dependency on the step reader or PR #11.
3. Approve/apply the step-calendar migration. It aborts on definition drift or inconsistent stored dates, and makes no data corrections. Its CHECK scans the table and takes a schema lock; the lock timeout is 5 seconds and statement timeout 30 seconds. Use a quiet window; abort and reschedule on contention.
4. Approve/apply the date-column read dependency. Record whether this grant was already present; never broaden it to table-level SELECT.
5. Only then deploy the corrected Edge source. Keep existing secrets, JWT configuration, CORS and key-validation order. Deploying it before the column grant will fail closed with 503. No GitHub Pages frontend deployment is required by this package.
6. Perform separately authorized staging/integration checks of valid exports and protected reads. Compare aggregate semantics and permissions; do not test invalid payloads against production.

If the record preflight ever finds violations: **stop**. Obtain a fresh authoritative daily export for affected literal dates and adjacent New York dates, investigate aggregation timezone/coverage, and prepare an explicit, backed-up, row-specific remediation diff under separate approval. Do not change `local_date`, hashes, dates or totals based only on a timestamp conversion. No blanket UPDATE is supplied.

## Practical rollback

Prefer reverting only the Edge deployment first, using `index.ts` from the recorded main commit. It needs only the pre-existing columns and continues to work with the stricter SQL. Retain the validation fixes unless they are the demonstrated cause.

If SQL rollback is separately approved: use `rollback.psql` from this directory as an owner-capable operator, after rechecking that no later function changes would be overwritten. It restores the two captured definitions with CREATE OR REPLACE, drops only the added calendar constraint, and revokes only the date-column grant introduced by this package. Skip the revoke if that access predates the package or has acquired another approved dependency. Function ownership and ACLs remain intact; no tables/records are removed. This rollback reopens the old validation defects, so it is an emergency recovery path, not the preferred response to malformed exports.

The isolated suite rehearses these operations and verifies that sample and event counts are retained. Rollback of the Edge/SQL does not require reimporting or restoring health data.

## Integration with parallel work

PR #11 consumes the existing dashboard response; fields and heart calculations are unchanged, so no History Explorer code change is expected. The separate frontend correction branch may touch this Edge file's authentication section. Integrate by preserving both changes and rerunning this suite; do not overwrite its key_mismatch/error-classification work with an old whole-file copy. Neither branch was modified here.

## Primary references checked

- [Health Auto Export metric JSON](https://help.healthyapps.dev/en/health-auto-export/export-format/health-metrics/) — date/quantity/source semantics.
- [REST automation](https://help.healthyapps.dev/en/health-auto-export/automations/rest-api/) — headers, date range, aggregation and batching. No ordered revision guarantee is documented.
- [JSON envelope/date format](https://help.healthyapps.dev/en/health-auto-export/export-format/) — offset-bearing dates.
- [PostgreSQL 17 CREATE FUNCTION](https://www.postgresql.org/docs/17/sql-createfunction.html) — CREATE OR REPLACE retains function ownership/permissions.
- [PostgreSQL 17 date/time](https://www.postgresql.org/docs/17/functions-datetime.html) — explicit AT TIME ZONE conversion.
- [Supabase testing](https://supabase.com/docs/guides/local-development/testing/overview) and [breaking-change index](https://supabase.com/changelog?types=breaking-change). No new table or client library is introduced; permission changes are explicit proposals.
