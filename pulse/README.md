# Resting Beast — v1.0

## Beast’s Crest and Home Screen installation

The approved 1254×1254 crest is proportionally downsampled with Lanczos into opaque RGB PNGs, with no crop, added artwork, transparency or baked-in corners: `beasts-crest-1024.png` (master), `apple-touch-icon.png` (180), `icon-192.png` and `icon-512.png`. Icons retain the full composition; iOS applies its own mask. Web manifest icons use `purpose: any` rather than claiming Android maskable safe-zone compatibility.

`manifest.webmanifest` resolves its `id`, `start_url` and `scope` to `/shop-fractions/pulse/`. The app name is Resting Beast, display is standalone, theme is `#100d0b`, and launch background matches the existing CSS `#090a0c`. Apple standalone/title/status-bar metadata uses the existing viewport-fit and safe-area CSS. Only `manifest-src 'self'` is added to CSP; all existing directives remain intact.

The shared `/shop-fractions/sw.js` controls nested apps when already registered and uses network-first caching with offline fallback for their files. It is unchanged. No worker is added or registered by this release; fresh installations require a connection for dashboard assets/data. Existing scripts, CSS, corrected RHR method, authentication and backend are unchanged.

Verification: `python3 pulse/tests/install_contract.py`, `node pulse/tests/rhr_spark_labels.js`, and `python3 pulse/tests/visual_review.py --chromium <installed-chromium>` (Pillow, Playwright and browser required). Browser fixtures intercept backend requests; no real health service is contacted. The visual regression retains its original assertions and permits exactly the local-manifest CSP addition.

Verification in this release environment: installation contract, seven-day RHR regression and the existing visual suite’s static checks passed. A temporary Playwright dependency was available, but its Chromium download returned an invalid archive, so the full local visual/browser suite could not run. No dependency was added to the repository. Real-device checks remain outstanding.

### iPhone installation / replacing an older icon safely

1. Keep your existing private access key available in its secure location. The key is held only in sessionStorage and may need re-entry in the new Home Screen app; never place it in a URL.
2. Keep the old shortcut for now. In Safari open `https://zy65h95wjn-netizen.github.io/shop-fractions/pulse/` and reload online.
3. Open Safari’s More menu if needed, tap Share, then Add to Home Screen. Keep Open as Web App enabled, confirm Resting Beast and the lion crest, and tap Add.
4. Launch the new lion icon, enter your existing key if prompted, and confirm your saved history is visible before removing the old shortcut. Saved health/context events are server-backed; replacing a shortcut does not delete those records.
5. Only then touch and hold the obsolete icon, choose Remove App or Delete Bookmark (the label depends on the old shortcut type), and confirm deletion of that old item. If only Remove from Home Screen is offered, it hides rather than deletes the installed app. Do not clear Safari History/Website Data, reset app storage, or delete anything inside the dashboard.

No physical iPhone or Android installation is implied by automated browser checks. Final iOS icon masking, status-bar appearance and Home indicator clearance require real-device confirmation. To roll back only this release, revert its merge commit; no database restore or service-worker change is needed.

## Seven-day resting HR readability (Oct 15, 2026)

The Today chart now draws **each recorded day's resting-HR value (bpm) above its point**, a numeric vertical scale, and local month/day labels along the bottom. Its accessible label lists all seven completed New York calendar days and their actual readings or "no reading" when missing. The canvas is taller to keep dates and values legible on narrow phones. Missing readings never become zero, and missing days still break the trend line.

The daily RHR data source, latest-revision-per-local-day calculation, comparison with the prior week, auth, import and edit behavior are unchanged. CSS is `nightshift-iron-v8.css` and frontend code is `app-iron-v11.js`; v7 and v10 remain available for rollback. No backend or database changes. Recheck actual Safari layout on the target iPhone.

Regression commands: `node pulse/tests/rhr_spark_labels.js` and the existing `python3 pulse/tests/visual_review.py --chromium /usr/bin/chromium` (with browser dependencies installed).

## Iron Citadel reconstruction (v7, visual review)

The active page now uses `nightshift-iron-v7.css`, a consolidated stylesheet for the current Today, Trends, Context, login, and dialog markup. Local, original scenery replaces the 270×172 painting: the detailed fortress is 1536×1024, with a retained 768×512 derivative. The app requests only the optimized 1536px source at every viewport, avoiding duplicate responsive-image downloads. The full composition is preserved rather than enlarged with `cover`. Panel bevels, steel grain, chamfers, restrained ember lighting, SVG icons, typography, touch targets, form sizing, and dock clearance share one visual treatment.

The application scripts, health calculations, auth/session handling, chart interactions, form constraints, page ownership, and CSP remain unchanged. No backend resources were modified, and no production deployment was performed.

See [visual review, screenshots, verification limits, and rollback](review/README.md). To undo only this reconstruction, revert its commit; retain `app-iron-v10.js` and the corrected resting-HR pipeline.

Resting Beast (previously Pulse Protocol) is a mobile-first dashboard hosted at `/shop-fractions/pulse/`. It does **not** change the `/island/` app. This is a provisional location until a dedicated GitHub repo is created.

The public URL, repository path, access keys and Supabase integration are intentionally unchanged by the rename.

## Iron Citadel real-device visual refinement
A genuine 7:56 PM iPhone Safari screenshot established that the v5 castle SVG rendered correctly but looked flat compared with the approved painterly Iron Citadel reference. The v6 correction:
- Replaces the vector scenery used by the active stylesheet with `pulse/assets/iron-citadel-painting.webp`, cropped to contain only scenery (no fake UI or readings).
- Keeps the art hosted locally under the site's existing image CSP.
- Tightens the mobile hero, improves text/unit legibility, and separates the bpm/ms/% unit sizes from live numeric values.
- Leaves the previously deployed SVG, stylesheet and script in the repo for rollback; the active app continues using `app-iron-v10.js`.
- Adds print-only positioning so the dock does not overlap exported PDF footers.
No changes to Health data, credential checks, importer, RHR method, step semantics, user history, or chart interactivity.

## Iron Citadel design (Oct 14, 2026)
The chosen theme uses an original local, standalone fortress SVG in `pulse/assets/iron-citadel-scene.svg`, a fully themed stylesheet `pulse/nightshift-iron-v5.css`, and a color-only chart version `pulse/app-iron-v10.js`.

- The castle, crimson banners, atmospheric stone and ember lighting are scenery. No measurements or UI controls are baked into imagery.
- Live values, forms, swipe navigation, chart scrubbing, TRT timeline and saved history remain normal HTML/JavaScript interactions.
- Today, Trends, Context, login, dialogs and bottom navigation share the theme.
- The source CSP permits only same-origin image assets and retains the original Supabase connection restriction. Reduced-motion behavior is respected.
- To return to the immediately preceding Nightshift look without backend/data changes, restore the previous references to `nightshift-v4.css` and `app-today-v9.js` and remove the new scenic header elements.
- Screenshot rendering and Safari Home Screen behavior still require testing on the target iPhone after deployment.

## Today snapshot (step totals)
- Heart rate and resting HR appear in a shared card with their original distinct calculations.
- The step summary uses the existing `step_count` importer records (one complete daily total per New York day, already deduplicated upstream). The key-gated corrected dashboard function returns only the current day's synced total and the **previous completed day’s** imported total.
- When today's step total has not yet been exported, Today displays an unknown/awaiting-sync state rather than yesterday's count or zero. A missing previous-day total is also displayed as unavailable, never zero.
- This dashboard update does not change the Apple Health Auto Export schedule or how step totals are created. To populate a live partial-day total, the exporter must send a current-day daily summary, which has not been verified.
- Today also provides a seven-completed-day resting HR sparkline from final daily Watch estimates and current logged TRT protocol. These are visual comparisons, not evidence of causation.

## What works

- Reads Apple Health-derived heart rate, resting HR, HRV (SDNN), and SpO₂ from `cass-health-lab`. **Resting HR is the latest revised estimate for each New York calendar day (greatest `end_at`), never the mean of that day's revised records.** Other metrics retain their existing aggregation.
- Appends dated TRT protocol, medication, nicotine, caffeine, and optional blood pressure changes. Last-known context carries forward until another event replaces it.
- Each context card has a **Set/Update** control. When a prior setting exists, its values prefill the change form; the effective date defaults to now. Current medications have **Update** and **Log stop** actions. Each action opens a form and writes only after explicit Save; no health or medication baselines are assumed or auto-inserted.
- Displays historical events and **Changes & Trends** comparisons without assigning medical causation. Timezone for charts is America/New_York. The recent-trend view needs no manual events; the around-change view compares data before and after an effective date. The code fetches up to 90 days of daily measurements; the chart can display 7, 30 or 90 days independently.
- The historical chart supports iPhone finger-drag/tap scrubbing (or arrow keys) to inspect the plotted **daily average** and date. A missing day is explicitly shown as **No reading**. This intentionally does not expose or request individual raw measurements.
- Keeps the private access credential **only** in this browser tab's session storage (not persistent), because GitHub Pages project paths share a browser origin with other apps. The static GitHub code includes only a publishable Supabase key, which is not a secret.
- No manual entry for watch metrics; no requirement to wear a watch overnight.

## Not connected yet

- Blood oxygen ingestion is live and was confirmed with real Apple Health readings on October 14, 2026. The UI never substitutes synthetic samples when data are missing.
- BP can be manually entered; current automatic BP import is not yet configured.

## Privacy / backend

- Data lives in `cass-health-lab`; **never** commit raw health data or the access key.
- The Supabase tables are not directly selectable by anonymous clients. `pulse_read` / `pulse_write` validate a high-entropy private key server-side. The new `pulse-dashboard-corrected` Edge Function checks the **same** key by calling `pulse_read` *before* its service-role reads. The service role has only column-level SELECT access to the resting-HR fields it needs. The Edge Function never logs or returns raw sample rows or server secrets.
- Supabase's security linter flags anonymous security-definer functions; this is an intentional **key-gated** API design, not a publicly readable table. Review if migrating to first-party authenticated user accounts.
- Access key has read/write capabilities; treat it like a password. To rotate it, replace the SHA-256 digest in `pulse_private.access_keys` and issue a new private key.

## Implementation status

- Live Supabase heart and SpO₂ data have been verified, and the existing protected SQL read/write interface is unchanged. The change-comparison engine was checked for missing-day exclusion, New York date arithmetic across DST, future events, incomplete after-windows, and insufficient oxygen coverage.
- GitHub Pages and iPhone chart scrubbing were independently confirmed by the user. The v0.5 corrected-dashboard code passed a mocked success/failure test; **on-device verification of the Edge Function remains pending**. An unavailable corrected endpoint fails closed instead of showing old resting-HR averages.
- Personal health history and prior medications were **not** copied into the source repository or auto-created as entries.

## Future improvements

- Move to dedicated `pulse-protocol` repository.
- Consider widening available health history beyond 90 days if comparisons with older events become important; do not backfill records from memory without the user's confirmation.
- Move to a dedicated web origin and Supabase Auth for persistent signed-in sessions before wider use.
- Improve baseline/onboarding only if real use shows a need. Avoid automatic medical advice, out-of-context alarms, or pretend causal claims.

## Rollback (no database data changes required)

- Repoint the Pulse page script from `app-rhr-v5.js` to `app-context-v4.js` **only for emergency app recovery**, recognizing that this restores the inaccurate resting-HR means. Prefer disabling resting-HR panels if temporarily reverting.
- The original `pulse_read` and Health Auto Export importer were not modified by this update. A database-level correction can replace the extra Edge read path later; revoke its service-role grants then if no longer needed.
