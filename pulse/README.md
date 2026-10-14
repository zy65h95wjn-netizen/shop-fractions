# Pulse Protocol — v0.4

This isolated directory hosts a mobile-first dashboard at `/shop-fractions/pulse/`. It does **not** change the `/island/` app. This is a provisional location until a dedicated GitHub repo is created.

## What works

- Reads Apple Health-derived heart rate, resting HR, HRV (SDNN), and blood oxygen saturation (SpO₂, when available) with daily averages from the active `cass-health-lab` Supabase project.
- Appends dated TRT protocol, medication, nicotine, caffeine, and optional blood pressure changes. Last-known context carries forward until another event replaces it.
- Each context card has a **Set/Update** control. When a prior setting exists, its values prefill the change form; the effective date defaults to now. Current medications have **Update** and **Log stop** actions. Each action opens a form and writes only after explicit Save; no health or medication baselines are assumed or auto-inserted.
- Displays historical events and **Changes & Trends** comparisons without assigning medical causation. Timezone for charts is America/New_York. The recent-trend view needs no manual events; the around-change view compares data before and after an effective date. The code fetches up to 90 days of daily measurements; the chart can display 7, 30 or 90 days independently.
- The historical chart supports iPhone finger-drag/tap scrubbing (or arrow keys) to inspect the plotted **daily average** and date. A missing day is explicitly shown as **No reading**. This intentionally does not expose or request individual raw measurements.
- Keeps the private access credential **only** in this browser tab's session storage (not persistent), because GitHub Pages project paths share a browser origin with other apps. The static GitHub code includes only a publishable Supabase key, which is not a secret.
- No manual entry for watch metrics; no requirement to wear a watch overnight.

## Not connected yet

- Blood oxygen ingestion is now live and independently verified with nine genuine Apple Health readings delivered on October 14, 2026. The importer accepts percent and fractional HealthKit values. The UI never substitutes synthetic samples when data are missing.
- BP can be manually entered; current automatic BP import is not yet configured.

## Privacy / backend

- Data lives in `cass-health-lab`; **never** commit raw health data or the access key.
- The Supabase tables are not directly selectable by anonymous clients. The `pulse_read` / `pulse_write` RPCs use a high-entropy key checked server-side against a SHA-256 digest in a non-exposed schema.
- Supabase's security linter flags anonymous security-definer functions; this is an intentional **key-gated** API design, not a publicly readable table. Review if migrating to first-party authenticated user accounts.
- Access key has read/write capabilities; treat it like a password. To rotate it, replace the SHA-256 digest in `pulse_private.access_keys` and issue a new private key.

## Implementation status

- Live Supabase heart and SpO₂ data have been verified, and the existing protected SQL read/write interface is unchanged. The change-comparison engine was checked for missing-day exclusion, New York date arithmetic across DST, future events, incomplete after-windows, and insufficient oxygen coverage.
- GitHub Pages and browser access were confirmed by the user for the original app. The v0.3 comparison update has automated logic/markup tests but still needs an on-device visual check.
- Personal health history and prior medications were **not** copied into the source repository or auto-created as entries.

## Future improvements

- Move to dedicated `pulse-protocol` repository.
- Consider widening available health history beyond 90 days if comparisons with older events become important; do not backfill records from memory without the user's confirmation.
- Move to a dedicated web origin and Supabase Auth for persistent signed-in sessions before wider use.
- Improve baseline/onboarding only if real use shows a need. Avoid automatic medical advice, out-of-context alarms, or pretend causal claims.
