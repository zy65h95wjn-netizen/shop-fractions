# Resting Beast frontend integration candidate

Review only. No production merge or deployment was performed.

## Inputs and scope

Live repository/PR inspection confirmed all three PRs open and unmerged. The integration branch starts at current main `f64a4c0ebd565e0f2d1eb818b44213f4d4920a25` and merges these exact heads, in this order:

1. PR #12, `b3bad45dd658571f5b8cff0b231000f0298d7566` — frontend reliability.
2. PR #11, `f5df19cbdab313947fb3a82a3074812eec3bdf37` — History Explorer.

Branch: `integration/resting-beast-frontend-rc`. Original PR branches are unchanged. PR #13 (`6c6f4ca6db4e0eb86d428e663d219b5f822657db` when inspected) is excluded. No SQL, backend source, Edge Function, database, permission, credential, importer, service worker, workflow, or other-app changes. Tests use synthetic fixtures and intercepted transport only; no private health data or real credentials were used.

## Conflict decisions and resulting behavior

- `app-iron-v11.js`: retained PR #12's single centralized `lockDashboard()` and manual lock binding. The older inline lock body from PR #11 was discarded. Manual lock and confirmed rejection clear the actual History model, latest reading, table, graph pixels, and accessible measurement values. Kept `PulseHistory.render(state)` on successful render.
- `tests/visual_review.py`: reconciled four conflict regions. Kept PR #12's exact protection of calculation/payload/form/AutoFill sources and existing theme; added PR #11's expected History IDs, four native buttons, 44px minimum target rules, script hook and isolated navigation contracts. The former assertion that the only app changes are two History hooks is superseded by the combined reliability work.
- HTML/CSS merged without textual conflict. The shared sticky refresh alert remains outside every protected page and the History section. It is available on Today, Trends, Context, and History. Transient failures retain cached measurements with Stale status; confirmed key rejection locks the matching session.
- Fixed the accessible-name regression: Trends keeps its static chart instruction label during lock. Measurement-bearing `aria-valuetext`/`aria-valuenow`, dynamic sparkline label, chart pixels and selected values are erased. Reauthentication repopulates inspection values while the static Trends name remains intact, even with an empty response.
- Added the valid `last_completed_day: '2026-10-14'` marker to the History fixture. Step-date validation and midnight/resume behavior are unchanged.
- Reliability harness now loads the real `history-v1.js`; the former History stub was removed from the regression suite. Both feature suites execute the actual combined application files.

All four independently tappable values, preserved value IDs/formatting, native button semantics, 7/30/90 ranges, newest-first table, chronological graph, gap handling, precision, Back scroll/focus, navigation isolation, refresh generations, dialog/session generations, and five logging payloads remain covered.

## Executed verification

| Command | Result |
| --- | --- |
| `node pulse/tests/history_helpers.js` | PASS: four metrics × three ranges, NY midnight/DST/leap day, missing/invalid values and precision |
| `node pulse/tests/history_integration.js` | PASS: actual combined HTML/scripts in modeled DOM/canvas at 320/390/430px; all metrics/ranges, graph/list date/value agreement, refresh, Back/focus, navigation, forms, lock/pending read |
| `node pulse/tests/frontend_reliability.js` | PASS: seven scenario groups, including actual History rejection and cached-error behavior; successful reauthentication; pending reads/writes and old-session isolation; NY midnight/DST/resume; dialog cancel/save races; static Trends accessible name after rejection/manual lock and re-unlock, populated and empty states; five logging payloads and AutoFill markup |
| `node pulse/tests/rhr_spark_labels.js` | PASS: labels/dates/precision/missing and empty states at modeled 320/390/430px |
| `python3 pulse/tests/install_contract.py` | PASS: manifest/icons/install metadata/CSP/safe areas |
| `python3 pulse/tests/visual_review.py --static-only` | PASS: reconciled source/HTML/form/navigation/theme contracts |
| JS syntax checks for all `pulse/*.js` and `pulse/tests/*.js`; Python test compilation | PASS |
| `git diff --check`; scope diff against main | PASS |

Reproduction requires Node, Python and Pillow. Browser scripts additionally require Playwright. The runtime's existing Playwright package can be selected with `NODE_PATH="$CODEX_PRIMARY_RUNTIME_NODE_MODULES"`.

## Browser attempts and release gate

Attempted the supplied real-browser suites targeting 320px, 390px and 430px using the already installed Playwright package:

- `NODE_PATH="$CODEX_PRIMARY_RUNTIME_NODE_MODULES" node pulse/tests/reliability_browser.js chromium` — exit 2, missing Chromium executable.
- Same command with `webkit` — exit 2, missing WebKit executable.
- `NODE_PATH="$CODEX_PRIMARY_RUNTIME_NODE_MODULES" node pulse/tests/history_browser.js` — launch failed, missing Chromium executable.

No viewport assertions or screenshots ran. Browser setup stopped after the local executable checks/launch attempts; no downloads, package installations, escalation, or permission bypass. The reliability browser suite has also been extended for actual History alerts/rejection and lock/re-unlock chart labels; its assertions remain unexecuted.

**Production approval remains blocked on real-browser/device acceptance.** No known remaining frontend defect was found by the executed checks, but modeled widths are not CSS layout evidence. Still unverified: actual 320/390/430 overflow and touch targets; sticky alert placement; browser accessibility tree/announcements; native dialog timing; iPhone Safari/Home Screen scrolling, gestures, BFCache and midnight resume; Apple Passwords/Face ID. Live authentication and writes were intentionally not exercised.

Before release, run both browser suites with approved installed browsers, then check Safari and the installed iPhone app using the History review checklist. PR #13's independent backend findings are outside this candidate and are not resolved or certified here.

## Rollback

Before release: close this integration PR; production stays at its existing main commit. Do not merge the source PRs separately on top of this combined candidate.

If a later separately authorized release merges this candidate, revert its integration PR merge commit using `git revert -m 1 <integration-PR-merge-SHA>` (or revert the squash commit without `-m` if squash-merged), review that rollback PR, then release through the normal approval process. No database, Edge Function, or data migration rollback is needed for this frontend change. Do not revert PR #13 as part of this rollback.
