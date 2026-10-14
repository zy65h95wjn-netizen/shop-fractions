# Pulse Protocol (MVP)

This isolated directory hosts a mobile-first dashboard at `/shop-fractions/pulse/`. It does **not** change the `/island/` app. This is a provisional location until a dedicated GitHub repo is created.

## What works

- Reads existing Apple Health-derived heart rate, resting HR, HRV (SDNN) and daily averages from the active `cass-health-lab` Supabase project.
- Appends dated TRT protocol, medication, nicotine, caffeine, and optional blood pressure changes. Last-known context carries forward until another event replaces it.
- Displays historical events without assigning medical causation. Timezone for charts is America/New_York.
- Stores the private access credential **only** in the browser's local storage. The static GitHub code includes only a publishable Supabase key, which is not a secret.
- No manual entry for watch metrics; no requirement to wear a watch overnight.

## Not connected yet

- Blood oxygen: the current upstream Health exporter/database accepts heart rate, RHR, HRV, and steps; oxygen needs a *separate, tested ingest change*. The UI accurately reports it as unavailable.
- BP can be manually entered; current automatic BP import is not yet configured.

## Privacy / backend

- Data lives in `cass-health-lab`; **never** commit raw health data or the access key.
- The Supabase tables are not directly selectable by anonymous clients. The `pulse_read` / `pulse_write` RPCs use a high-entropy key checked server-side against a SHA-256 digest in a non-exposed schema.
- Supabase's security linter flags anonymous security-definer functions; this is an intentional **key-gated** API design, not a publicly readable table. Review if migrating to first-party authenticated user accounts.
- Access key has read/write capabilities; treat it like a password. To rotate it, replace the SHA-256 digest in `pulse_private.access_keys` and issue a new private key.

## Implementation status

- Live Supabase heart data and SQL read/write RPC tested with a temporary test credential. Test event and key were cleaned up.
- GitHub files committed. GitHub Pages deployment, browser REST/CORS, and true iPhone end-to-end use **not yet independently confirmed**.
- Personal health history and prior medications were **not** copied into the source repository or auto-created as entries.

## Future improvements

- Move to dedicated `pulse-protocol` repository.
- Add oxygen from the Health exporter after confirming source format and permission.
- Consider Supabase Auth instead of a device-persisted access token before wider use.
- Compare trend windows before/after event changes without claiming causation.
