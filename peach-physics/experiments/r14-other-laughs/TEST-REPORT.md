# R14.2 combined voice preview — validation

**Ready for iPhone listening review. No production promotion.** Lance approved the six candidate excerpts in the earlier audition checkpoint. This build assigns them to the three characters and retains Holly's approved two recordings. Character pairings and real-device output still need final listening approval.

Production/main baseline: `2adb9257532ac3b17e39aeea815a23f5fb7f85ce`, re-checked after candidate approval. Holly source: `5441324244eb2e28ffc115f8cf0d34f1ff2c5d21`. Tests used Chromium, software WebGL and forced Canvas. No physical iPhone was available.

| Suite | Result | Scope |
| --- | --- | --- |
| `tests/elf-audio.cjs` | 432 checks passed | Three new elves × both renderers: trusted native touch taps, independent alternating Test controls, complete output capture, rapid-tap/release/shake cooldowns, flick and slow release, denied/granted simulated motion permission, weak/invalid/strong readings, Auto silent, mute/reset/switch/hidden/blur/pagehide, suspend/resume, saved profiles |
| `tests/audio.cjs` | 96 checks passed | Approved Holly in both renderers: both takes and endings, original tap/Test cursors and reaction behavior, cancellation, context recovery, Auto silent and saved preference |
| `tests/loading.cjs [character]` | 208 checks passed (52 per elf) | Both recordings per character: first tap during loading, stale/failed/corrupt loads, retries, expiry, pending cancellation, delayed/rejected/interrupted resume and closed-context recovery |
| `tests/cross-character.cjs` | 96 checks passed | Both renderers: a pending download or resume from each elf cannot play over the next character, create a queue or interrupt its active laugh |
| `tests/preservation.cjs` | 248 checks passed | All five characters × both renderers: 180 manual and 20 motion trajectories identical to main, 26 identical rendered frames, preserved image/calibration/motion sources and Holly framing at 375×667, 390×844 and 430×932 |
| `tests/offline.cjs` | 162 checks passed | Upgrade from approved Holly: all eight recorded elf takes offline, native offline taps for the three new elves, all five characters and saved profiles, atomic install, old-worker stale-cache race, current-cache-only reads, production/Santa storage and cache isolation |
| `tests/offline.cjs checkpoint` | 162 checks passed | Same coverage upgrading the actual audition checkpoint (`331d1e5`), including new profile module cache invalidation |
| `tests/preview.cjs` | 148 checks passed | Visible character selector, both Test takes for every elf online/offline in both renderers, saved Sound, unchanged Santa controls, Test-button fit at three iPhone-like sizes and final screenshots |
| `tests/elf-identity.py` | 12 output comparisons passed | Each of six takes captured from native taps in both renderers matches the decoded source and expected runtime fades; full-file and ending correlations approximately 1.0 |
| `tests/graph-identity.py` | 8 output comparisons passed | Holly's two takes from taps and Test in both renderers; full-file and ending correlations above 0.99995 |
| Production `v8/tests/motion-unit.cjs` | 56 checks passed | Existing R14 motion controller coverage |

Machine-readable results and actual captured WAVs are in `tests/`. `elf-audio.json` includes decoded durations, output peaks/RMS and hashes for every native-tap recording. The six approved source excerpts are byte-identical to audition commit `331d1e5`; every fetched WAV matches its documented SHA-256. `approved-holly-identity.json` records the unchanged Holly engine, recordings and portrait hashes. `motion.js` is byte-identical to main.

Native touch tests use Chromium's input dispatch, producing trusted touch/pointer events, with deterministic clocks for cooldown and motion checks. Browser AudioWorklet capture records actual PCM after playback gain. No output clipping, silence, missing endings or premature cutoff was detected. The long Ember take runs through all 3.15 seconds despite the 2.6-second tap cooldown; the active-source gate blocks overlapping input.

The motion suite compares main and preview with Sound off to isolate physical behavior. Audio suites separately cover interaction routing and cancellation. The offline fixtures simulate old workers and an incomplete new-asset download, then resurrect an obsolete cache to prove that stale content is never read. They preserve independent production and Santa preview cache/storage sentinels. Device-motion events and permission responses are simulated.

Historical audition captures and `candidate-identity.json` remain as evidence for the original six approved excerpts. The current integrated-character results are `elf-audio.json` and `elf-identity.json`; the new per-character loading and two offline reports replace the initial partial-checkpoint reports.

## Reproduce

Serve the repository root on `http://127.0.0.1:8000` (for example, `python -m http.server 8000 --bind 127.0.0.1`). Requires Playwright, Chromium at `/usr/bin/chromium`, Sharp and Python NumPy.

```sh
node peach-physics/experiments/r14-other-laughs/tests/elf-audio.cjs
node peach-physics/experiments/r14-other-laughs/tests/audio.cjs
for character in holly ember midnight aurelia; do
  node peach-physics/experiments/r14-other-laughs/tests/loading.cjs "$character"
done
node peach-physics/experiments/r14-other-laughs/tests/cross-character.cjs
node peach-physics/experiments/r14-other-laughs/tests/preservation.cjs
node peach-physics/experiments/r14-other-laughs/tests/offline.cjs
node peach-physics/experiments/r14-other-laughs/tests/offline.cjs checkpoint
python peach-physics/experiments/r14-other-laughs/tests/elf-identity.py
python peach-physics/experiments/r14-other-laughs/tests/graph-identity.py
node peach-physics/experiments/r14-other-laughs/tests/preview.cjs
node peach-physics/v8/tests/motion-unit.cjs
```

Set `R142_PREVIEW_URL` to the commit-pinned HTTPS `index.html?character=ember` to run the preview smoke test against hosted bytes. This checks the visible selector, both Test takes for every elf, saved Sound settings and offline playback in both renderers. Local execution additionally checks Test-button fit at three iPhone-like sizes and saves settings/portrait screenshots.

## Known limits

- The environment cannot independently hear audio. Lance approved the candidate takes; character pairings, perceived volume, naturalness and personal voice preferences require final listening in context.
- Actual iPhone Safari/PWA speaker output, silent-switch routing, interruptions and sensor behavior require device testing. Browser PCM capture and simulated motion permission do not prove those hardware behaviors.
- Sound defaults off for fresh character profiles. Existing saved Sound values are respected; loading or Auto Jiggle never activates playback.
- No changes were made to production, approved Holly or the separate approved Santa voice branch. Santa's recorded preview is not silently merged into this build.
