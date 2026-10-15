# History Explorer — Phase 1 review

Base: current `main` at `f64a4c0ebd565e0f2d1eb818b44213f4d4920a25` (inspected 2026-10-15).
Branch: `feature/resting-beast-history-explorer`. Review only; do not merge or deploy as part of this task.

## Behavior

Today has four independent, labeled History buttons: resting HR, heart rate, HRV / SDNN, and blood oxygen / SpO₂. Each opens a temporary detail view inside the protected app. The existing three-link dock stays intact; selecting a dock page dismisses the detail view. The Today Back button restores the opener's focus and the prior scroll position. History does not add a URL route or browser-history entry, so reloads use the existing page navigation.

The explorer shows the metric and unit, the dashboard's latest reading with its New York timestamp, a daily graph, 7/30/90-day controls, an accessible range input, keyboard inspection, and an oldest-first table. Every calendar date in the selected range appears; missing values say “No reading.” Plot lines stop at missing dates. A fully empty range has an explicit message. Horizontal chart drags inspect values; vertical drags are allowed to scroll the page. Swipes inside the detail view cannot accidentally switch the underlying page.

The selected range and inspection date survive normal live refreshes. A lock button delegates to the existing dashboard lock, which now also clears this feature's state, table, latest reading, canvas, and accessible value text. Pending Back restoration is canceled by page changes and locking. Existing auth-generation checks still reject late responses after lock.

## Data and security boundaries

- Uses only the existing successful corrected-dashboard response already held in memory. No new requests, browser persistence, export, telemetry, third-party libraries, images, or CSP changes.
- `state.latest` supplies the latest reading. It is deliberately separate from the graph/table's daily values. It is not replaced with the last daily average when unavailable. Latest readings may be outside the selected window; their timestamps remain visible.
- `state.daily` supplies daily values unchanged. RHR remains the corrected latest revised Watch estimate per America/New_York day. HR, HRV, and SpO₂ remain daily averages and are labeled accordingly. This frontend does not recompute aggregates or select RHR revisions itself.
- All windows end on today's New York calendar date and include today, whose value may change during syncing. Date arithmetic uses calendar dates across DST. Values are not carried forward, interpolated over gaps, or zero-filled. Numeric precision is retained in list/inspection text.
- The existing app script has only two optional hooks: pass successful render data to History, and clear History on lock. Navigation has only a detail-dismiss event and a swipe exclusion. Source contracts verify that the rest of those files is byte-for-byte unchanged from the base.
- No backend files, SQL, Edge Functions, credentials, auth/AutoFill logic, import/export systems, step calculations, logging logic, other apps, service workers, or deployment workflows were modified. All fixtures and requests in tests are synthetic; no real private key or health measurements were accessed or committed.

## Executed verification

| Check | Result |
| --- | --- |
| Pure helpers: four metrics × 7/30/90, NY midnight, DST and leap day, precision, missing/invalid data, no mutation | PASS |
| Actual HTML/scripts in a modeled DOM/canvas at 320px, 390px, 430px | PASS |
| Every selected chart value equals its corresponding daily-table value; line segments break at gaps | PASS |
| Latest versus daily values, live refresh preserving range/date, Back/focus, dock navigation, page swipes, history swipe isolation | PASS in modeled integration |
| Lock clears history; stale in-flight response cannot unlock app or history | PASS in modeled integration |
| Existing Trends keyboard/native range scrub, all logging dialogs, synthetic BP write, step totals untouched | PASS in modeled integration |
| Existing seven-day RHR sparkline labels at 320/390/430, missing data and decimals | PASS |
| Installation/manifest/icons/safe areas/CSP and additive source/HTML/form contracts | PASS |
| JavaScript syntax and `git diff --check` | PASS |
| Real browser CSS layout at 320/390/430; Chromium/WebKit; screenshots | BLOCKED: browser binaries unavailable |
| Physical iPhone Safari/Home Screen, actual touch/scroll arbitration, browser chrome, keyboard and safe-area behavior | NOT RUN |

The modeled integration runs the repository's actual `index.html`, `history-v1.js`, `app-iron-v11.js`, `compare.js`, and `pages-v1.js` in Node with a minimal DOM/event/canvas implementation and intercepted fetch responses. It checks behavior and paint commands, **not CSS layout, a native browser engine, or physical touch gestures**. It is supplemental evidence, not a substitute for browser acceptance.

Browser setup was time-boxed: Playwright was available, but Chromium/WebKit binaries were absent. The Playwright browser-download command failed because it received an invalid/truncated archive; the system package fallback failed with `setgroups`/`seteuid` permission errors. No permission controls were bypassed. The browser acceptance command was attempted and stopped at `browserType.launch: Executable doesn't exist`. No current before/after screenshots were produced; older theme screenshots elsewhere in `pulse/review/` are not evidence for this feature.

## Reproduce

From the repository root (Node and Python with Pillow):

```sh
node pulse/tests/history_helpers.js
node pulse/tests/history_integration.js
node pulse/tests/rhr_spark_labels.js
python3 pulse/tests/install_contract.py
python3 pulse/tests/visual_review.py --static-only
git diff --check
```

With Playwright and its browsers already available in the review environment:

```sh
node pulse/tests/history_browser.js
HISTORY_BROWSER=webkit node pulse/tests/history_browser.js
```

The browser suite intercepts **all** non-local requests, uses a fixed date and synthetic data only, checks actual 320/390/430 layouts and 44px targets, all metric/range/table values, keyboard inspection, refresh, Back scroll/focus, dock, existing dialogs, empty data, lock, and console errors. It captures baseline Today from the base commit plus current Today, each History view, and empty states with a “SYNTHETIC QA DATA” banner. Outputs default to `/tmp/resting-beast-history-review`; use `HISTORY_REVIEW_OUTPUT` to choose another path and `HISTORY_BROWSER_PATH` for an existing browser executable. **This suite was syntax-checked but could not execute browser assertions here.**

The existing broader visual suite remains available with Python Playwright and Chromium:

```sh
python3 pulse/tests/visual_review.py --chromium /path/to/chromium --output /tmp/iron-citadel-review
```

Before approving a merge, run real-browser layout/overflow checks and review the generated before/after captures. On iPhone Safari and the installed app, verify horizontal chart scrubbing, vertical scrolling starting on/off the chart, the native date slider, Back at multiple Today scroll positions, page swipes, lock, and normal forms. Screen readers should announce selected dates/values and each range button's pressed state.

## Limitations and rollback

Only the protected dashboard's existing 90-day daily history is available; older or absent readings cannot be recovered by the frontend. This view does not show individual raw sample history. The temporary view has no deep link and does not reopen after a reload. Live service authentication, live writes, Apple Passwords/Face ID, native Safari gestures, and Home Screen behavior were intentionally not exercised with real credentials.

The unexecuted browser/device checks above are the remaining review limitation. No known calculation or credential changes were introduced. Close the PR to leave production as it is. If a later separately authorized merge needs rollback, revert the feature commit; no database or importer rollback is involved.
