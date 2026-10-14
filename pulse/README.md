# Pulse Protocol (MVP)

This isolated directory hosts a mobile-first dashboard at `/shop-fractions/pulse/`. It does **not** change the `/island/` app. This is a provisional location until a dedicated GitHub repo is created.

## What works

- Reads Apple Health-derived heart rate, resting HR, HRV (SDNN), and blood oxygen saturation (SpO₂, when available) with daily averages from the active `cass-health-lab` Supabase project.
- Appends dated TRT protocol, medication, nicotine, caffeine, and optional blood pressure changes. Last-known context carries forward until another event replaces it.
- Displays historical events without assigning medical causation. Timezone for charts is America/New_York.
- Keeps the private access credential **only** in this browser tab's session storage (not persistent), because GitHub Pages project paths share a browser origin with other apps. The static GitHub code includes only a publishable Supabase key, which is not a secret.
- No manual entry for watch metrics; no requirement to wear a watch overnight.

## Not connected yet

- **Blood oxygen source activation:** the database and existing importer now accept `blood_oxygen_saturation` in `%`, `percent`, `percentage`, or `pct` (normalizing HealthKit fractions 0..1 into 0..100%). The dashboard shows an empty value until a genuine sample arrives. In Health Auto Export, enable **Blood Oxygen Saturation** for the existing REST API automation and authorize its Health access. Do not alter the existing destination, headers, or other selected metrics. If the data format differs, check the payload before changing the importer.
- BP can be manually entered; current automatic BP import is not yet configured.

## Privacy / backend

- Data lives in `cass-health-lab`; **never** commit raw health data or the access key.
- The Supabase tables are not directly selectable by anonymous clients. The `pulse_read` / `pulse_write` RPCs use a high-entropy key checked server-side against a SHA-256 digest in a non-exposed schema.
- Supabase's security linter flags anonymous security-definer functions; this is an intentional **key-gated** API design, not a publicly readable table. Review if migrating to first-party authenticated user accounts.
- Access key has read/write capabilities; treat it like a password. To rotate it, replace the SHA-256 digest in `pulse_private.access_keys` and issue a new private key.

## Implementation status

- Live Supabase heart data and SQL read/write RPC tested with a temporary test credential. Existing data remains intact. SpO₂ database constraint, importer mapping, unit normalization and read RPC have been migrated; the first real on-device oxygen export is still unverified.
- GitHub files committed. GitHub Pages deployment, browser REST/CORS, and true iPhone end-to-end use **not yet independently confirmed**.
- Personal health history and prior medications were **not** copied into the source repository or auto-created as entries.

## Future improvements

- Move to dedicated `pulse-protocol` repository.
- Add oxygen from the Health exporter after confirming source format and permission.
- Move to a dedicated web origin and Supabase Auth for persistent signed-in sessions before wider use.
- Compare trend windows before/after event changes without claiming causation.
