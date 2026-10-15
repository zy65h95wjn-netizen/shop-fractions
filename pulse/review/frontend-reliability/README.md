# Resting Beast frontend reliability corrections

Base: current `main`, `f64a4c0ebd565e0f2d1eb818b44213f4d4920a25`.
Separate branch: `fix/resting-beast-frontend-reliability`.
History reference (read only): PR #11, `f5df19cbdab313947fb3a82a3074812eec3bdf37`.

## Corrections

1. **Confirmed credential rejection:** the corrected reader recognizes only HTTP 401 + `key_mismatch` as a rejected private key. The existing write RPC recognizes HTTP 401/403 + SQLSTATE `28000`. Network failures, unreadable responses, generic 401s, and 5xx responses do not invalidate the credential. One shared lock routine removes the session credential, invalidates all earlier reads/writes, hides protected pages, dismisses and clears the editor, empties measurement/context/event/Compare data, clears chart pixels/accessibility values, and invokes the optional History clear hook. A reauthentication alert appears at login. Session identity and refresh ordering use separate generations: a normal refresh cannot invalidate a save, and an old session's completion cannot affect a new login. A confirmed rejection from a superseded read still locks its matching session. Password input metadata and byte-for-byte credential handling are unchanged.
2. **Visible refresh failures:** the existing single `error` node is now a shared, sticky, atomic alert above every protected page. Cached data remains available during transient failures, `status` changes to `Stale`, and the alert explicitly identifies previously loaded data. Only a successful validated refresh updates the existing last-refreshed timestamp and clears the failure. No duplicate page-local alert. Confirmed rejection always takes the lock path.
3. **Dated steps:** both slots are displayed only if `steps.last_completed_day` equals the previous America/New_York calendar date. A valid zero stays zero; missing counts stay missing. Missing/stale/unexpected date markers withhold both counts and visibly request refresh. Yesterday's partial current-day count is never promoted into a completed-day count. The visible app checks for calendar rollover each second; visibility, pageshow (including BFCache), and focus revalidate labels synchronously before refreshing. Calendar dates are shifted at UTC noon, avoiding fixed-24-hour assumptions around New York DST.
4. **Save-session ownership:** opening, closing, native cancellation, type changes, and submission advance dialog generations. Only a callback belonging to the same authenticated session and current editor can close it, show its error, or change its Save button. A queued native `close` event cannot invalidate a reopened dialog. An earlier successful write remains committed: a shared status notice reports it, and the timeline refreshes without changing the new form. An obsolete failed request reports that its outcome was not confirmed outside the new dialog; it never inserts an old error into that dialog. Lock/rejection makes all earlier callbacks inert. Existing five logging payloads and effective-time conversion remain unchanged.

## Step contract and failure behavior

The checked-in backend `stepSummary` already returns:

- `today`: integer >= 0 or null, for the New York day immediately after `last_completed_day`.
- `yesterday`: integer >= 0 or null, for exactly `last_completed_day`.
- `last_completed_day`: ISO `YYYY-MM-DD`, computed as yesterday in America/New_York independently of record availability.

This is sufficient; no backend changes are required. The frontend does **not** infer the slots' dates from request/receipt time, roll cached counts forward, or invent totals. The deployed response was not accessed. If it differs from this checked-in contract, the UI withholds counts with the explicit verification message. Minimum required backend contract: the above date marker and slot relationship (or explicit calendar date for each slot), in America/New_York. Existing aggregation, importer deduplication, and RHR correction are untouched.

## Executed verification

Synthetic data and mocked transport only. No health-service or private-key requests.

| Command | Result |
| --- | --- |
| `node pulse/tests/frontend_reliability.js` | PASS: six scenario groups below |
| `node pulse/tests/rhr_spark_labels.js` | PASS: exact labels, dates, decimals, missing/empty states at modeled 320/390/430 widths |
| `python pulse/tests/install_contract.py` | PASS: manifest, icons, Apple metadata, CSP, safe-area contracts |
| `python pulse/tests/visual_review.py --static-only` | PASS: unchanged health calculations, logging schemas/forms/AutoFill, Compare/navigation, CSP, existing theme/assets |
| `node --check` for app, harness, regression and browser scripts | PASS |
| `git diff --check` | PASS |
| `node pulse/tests/reliability_browser.js chromium` | UNVERIFIED: exit 2 at launch; browser executable absent |
| `node pulse/tests/reliability_browser.js webkit` | UNVERIFIED: exit 2 at launch; browser executable absent |

Regression groups exercise actual frontend JS and HTML in a modeled DOM/canvas:

- Valid login -> explicit rejection on Today, Trends, Context, and the optional History interface; clearing protected display, dialog fields and session credential; successful reauthentication.
- Network/503/500/unconfirmed-401 failures preserve credential and measurements, shared alert, stale status, subsequent successful recovery.
- Pending refresh -> manual lock -> delayed success; superseded-read rejection; old-session rejection after new login.
- New York midnight; spring/fall DST overnight suspension; visibility/pageshow/focus resume; valid zero, null, missing/stale marker, and delayed response from the prior day.
- Save -> cancel -> reopen -> earlier success/failure/rejection; delayed native close; native cancellation; earlier callback during a newer pending save; locked-session completion; harmless refresh while save is pending.
- All five logging payloads; existing Trends keyboard/native-range inspection; login and Apple Passwords markup; accessible alert roles.

The modeled DOM is adapted from the read-only PR #11 test harness, with a controllable clock, queued independent reads/writes, DOM value coercion, and dialog-open flags. It does **not** prove native layout, accessibility announcements, touch gestures, or Safari behavior.

## Browser/device limitation

Playwright JS is installed; neither Chromium nor WebKit binaries are present. A browser download was time-boxed to 60 seconds. The CDN returned an invalid/truncated ZIP (`End of central directory record signature not found`); timeout exit 124. Setup stopped. No system-package installs, escalation, or permission bypass was attempted. Both browser acceptance launches were attempted and stopped before any viewport assertions ran. The supplied suite targets 320px, 390px and 430px and intercepts all external traffic.

Unverified: actual CSS layout/sticky error placement at those widths, browser accessibility announcements, native dialog event timing, iPhone Safari and installed Home Screen resume/BFCache/timer behavior, Apple Passwords/Face ID interaction, and native touch/chart behavior. No new screenshots are claimed. Run the browser suite in an environment with approved installed browsers, then check these behaviors on iPhone before release approval.

## Eventual PR #11 integration

PR #11's branch was never modified. Read-only three-way file merges against the reference commit found:

- `app-iron-v11.js`: one conflict, at the Lock button handler. Keep this branch's `lockDashboard()` handler and the optional `window.PulseHistory?.clear()` call already inside it. Do not restore PR #11's earlier inline lock body. Retain PR #11's successful `window.PulseHistory?.render(state)` render hook. Both explicit rejection and manual lock must clear the Explorer.
- `index.html` and `nightshift-iron-v8.css`: no textual conflicts. Keep the shared feedback outside all `.app-page` sections so it also remains visible with History active; no extra History-local error message is needed.
- `tests/visual_review.py`: four conflict regions. Combine the four-fix source/contract protection here with PR #11's additive History ID/button/script and navigation expectations. PR #11's assertion that app changes consist only of History render/lock hooks is deliberately superseded by this assignment.
- Add `last_completed_day: '2026-10-14'` to PR #11's synthetic step fixture; undated counts now intentionally fail visibly.
- Rerun both regression suites after integration. The History compatibility check here exercises its optional API contract, not the fully combined feature. Actual combined browser/device validation remains required.

## Scope and rollback

Changes are limited to `pulse/` frontend files, tests and this review note. No database, Edge Function, credentials, policies, importer, service worker, workflow, other application, or production branch changed. No real health measurements/private keys were accessed or committed. No new dependency or CSP permission. No merge or deployment performed. This PR is for independent review; normal revert of its commit restores the prior frontend if a later authorized release needs rollback.
