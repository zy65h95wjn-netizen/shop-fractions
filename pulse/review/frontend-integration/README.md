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

## Actual browser acceptance and remaining release gate (2026-10-15)

The earlier local/Codex attempts were unable to launch native browsers and produced no viewport results. A subsequent GitHub-hosted, test-only acceptance run overcame those environment blockers. The original hosted attempt ([run 38780413387](https://github.com/zy65h95wjn-netizen/shop-fractions/actions/runs/38780413387)) produced failed assertions in Trends keyboard access, post-unlock Trends ARIA state, and WebKit Back focus. Investigation showed the tests inspected asynchronous focus/redraw immediately. The application already schedules these transitions on animation frames; browser acceptance now explicitly waits for the DOM state, then independently exercises keyboard Home/End and focus restoration. **No production application, CSS, or backend source was modified to fix these test failures.**

**PASS:** [GitHub Actions acceptance run 38781821579](https://github.com/zy65h95wjn-netizen/shop-fractions/actions/runs/38781821579), completed successfully on 2026-10-15. The QA branch started from this integration candidate's exact application source commit `1f079c128d3e91bcb6e1958153dfa51065bb5a99`. The run enforced that changes relative to that baseline were limited to the acceptance workflow and the two browser test scripts; it tested **unchanged candidate application code** with synthetic responses and blocked all unrecognized external requests. The reviewed browser script corrections were subsequently copied into this integration PR.

| Actual browser | History Explorer | Frontend reliability | Viewports |
| --- | --- | --- | --- |
| Chromium (Playwright 1.62.1) | PASS | PASS | 320, 390, 430px |
| WebKit (Playwright 1.62.1; **not** physical iPhone Safari) | PASS | PASS | 320, 390, 430px |

Acceptance covered actual CSS width/overflow and 44px targets; all four metric buttons and native keyboard activation; 7/30/90-day ranges, newest-first daily table and chronological chart date/value agreement; refresh, focus/scroll restoration, page navigation, missing-data states, locking and stale response isolation; error banners, save races, reauthentication, chart ARIA values, midnight resume and Apple Passwords AutoFill markup. Both browsers reported all six viewport-specific history and all six viewport-specific reliability test scenarios as passed. Representative WebKit screenshots for Today/History at 320/390/430px were visually inspected and showed no obvious clipping or overlap; this is not a claim of exhaustive pixel comparison or physical-device validation.

- [Chromium logs and synthetic screenshots](https://github.com/zy65h95wjn-netizen/shop-fractions/actions/runs/38781821579/artifacts/11995333391)
- [WebKit logs and synthetic screenshots](https://github.com/zy65h95wjn-netizen/shop-fractions/actions/runs/38781821579/artifacts/11995293658)
- QA workflow is on separate draft PR #15 and is **not** a proposed production workflow/deployment change.

**Remaining release gate:** Physical iPhone Safari and installed Home Screen acceptance were not run. Verify tapping each value, horizontal chart dragging versus vertical scrolling, 7/30/90 controls, Back/scroll/focus, 3-page navigation, lock/re-unlock with actual Apple Passwords AutoFill, stale alerts, refresh after sleep/new New York day, and safe-area/keyboard behavior. Real private-key authentication and write operations were not exercised by hosted tests. Browser-level green does not certify actual iPhone gesture handling or end-to-end production flows.

**Release recommendation: HOLD pending the physical iPhone acceptance and explicit release approval.** Do not merge/deploy as a side effect of acceptance. PR #13's independent backend integrity work is excluded and not certified here.

## Rollback

Before release: close this integration PR; production stays at its existing main commit. Do not merge the source PRs separately on top of this combined candidate.

If a later separately authorized release merges this candidate, revert its integration PR merge commit using `git revert -m 1 <integration-PR-merge-SHA>` (or revert the squash commit without `-m` if squash-merged), review that rollback PR, then release through the normal approval process. No database, Edge Function, or data migration rollback is needed for this frontend change. Do not revert PR #13 as part of this rollback.
