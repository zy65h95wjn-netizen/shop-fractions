# R14.2 with Santa — validation

**Santa's approved recorded “Ho ho ho” is integrated into the combined preview. Production remains unchanged.** The four-elf baseline is `c81515488ebb06c2daa0b41fdf65c0499ee3f9e3`; Santa's approved source is `c5ef60e19a11cd3f5212b7a05940995b608a58fa`. Production/main remains `2adb9257532ac3b17e39aeea815a23f5fb7f85ce`.

The Santa voice block, MP3 and CC0 asset credit are copied from the approved source. The original source branch is untouched. Integration connects Santa to the current audio context, settings and shared cancellation paths. Elf engines, profiles, all eight elf WAVs, portraits, motion controller and calibration are unchanged.

## Current merge validation

| Suite | Result | Scope |
| --- | --- | --- |
| `tests/santa-voice.cjs` | Both renderers passed | Native belly taps, actual MediaRecorder output, complete 1.5-second phrase at natural speed, repeated-tap gate, Test control, mute, switching and no synthetic voice replacement |
| `tests/santa-voice-state.cjs` | 23 checks passed | Approved fetch/decode races, single pending request, retries, buffer reuse, explicit cancellation, mute and independent Test control |
| `tests/santa-lifecycle.cjs` | 28 checks passed | Actual PCM output, full ending after animation completion, mute/reset/hide/blur/pagehide/switch, context suspension and closed-context recovery, silent Auto with Belly laugh enabled |
| `tests/santa-switch.cjs` | 48 checks passed | Both renderers: late downloads and resumes from Santa or Holly cannot play into the other character or overlap/queue |
| `tests/santa-motion.cjs` | 8 cases / 24 frames matched | Santa's original three visual impulses, their timing and all sampled spring states remain identical to main, including repeated taps and Sound/Belly laugh combinations |
| `tests/elf-audio.cjs` | 432 checks passed | Three new elves × both renderers: trusted native touches, alternating complete taps/Test controls, cooldowns, flick/release, simulated motion permission/readings, Auto silent, cancellation, recovery and saved profiles |
| `tests/audio.cjs` | 96 checks passed | Holly's two takes, original tap/Test cursors, full endings, reactions, lifecycle, context recovery and saved preference in both renderers |
| `tests/preservation.cjs` | 248 checks passed | Five characters × both renderers: 180 manual and 20 motion trajectories, 26 identical frames, source/portrait/calibration preservation; Holly framing at 375×667, 390×844 and 430×932; approved Santa voice-block identity |
| `tests/offline.cjs` | 168 checks passed | Upgrade from the approved four-elf preview: all nine recordings offline, native offline taps, custom profiles, delayed Santa MP3 installation, current-cache-only fallback, old-worker cache race, production/Santa source-preview cache and storage isolation |
| `tests/preview.cjs` | 154 checks passed | Visible five-character selector, all nine Test recordings online/offline, saved Sound, both renderers, elf Test-button fit at three iPhone-like sizes and screenshots |
| `tests/santa-identity.py` | 2 comparisons passed | Actual Santa output matches the browser-decoded approved recording through its ending; source/tail correlation approximately 1.0 |
| `tests/elf-identity.py` | 12 comparisons passed | Every new elf take captured from native taps in both renderers matches its decoded source and runtime fades through the ending |
| `tests/graph-identity.py` | 8 comparisons passed | Holly's two takes from taps/Test in both renderers; full-file and ending correlations above 0.99995 |
| Production `v8/tests/motion-unit.cjs` | 56 checks passed | Existing R14 motion controller coverage |

Santa's MP3 SHA-256 is `c0874443e5e562fe5431c5cfb10880a18a2a1b888a73c1630a12e1be299d0e7b`. All eight elf WAVs are byte-identical to the approved four-elf preview. Holly's engine, recordings and portrait also match her approved `5441324` source. `motion.js` is byte-identical to production.

Machine-readable results, WAV captures, Santa MediaRecorder captures and screenshots are in `tests/`. Browser AudioWorklet capture records actual PCM; all tested output was non-silent, without digital clipping, missing endings or premature cutoff. Santa's approved recording is not pitch-shifted or synthesized. His short original tap sound remains part of the approved belly-tap behavior; the laugh itself is the human recording.

The source/physics suite compares main and preview with Sound off. The separate Santa motion suite enables his animation and compares exact spring traces and rendered frames. Physical sensor events and permission responses are simulated. State tests also cover failed fetch/decode explicitly; cross-character tests exercise actual asynchronous browser races.

The upgrade fixture delays the new Santa asset until the prior controller is confirmed active, then recreates the retired cache after activation. Offline fallback continues to use the complete current cache. All profiles and production/source-preview cache sentinels survive. The new cache version is `peach-preview-r142-other-laughs-v3`.

## Retained earlier evidence

The earlier four-elf build passed 208 per-character loading/recovery checks, 96 elf-to-elf late-load/resume checks, and two 162-check upgrades from approved Holly and the audition checkpoint. Their reports remain for provenance. The current merge reruns the interaction/output suites and adds Santa-specific state, switching and upgrade coverage above. Historical audition captures document the exact approved excerpts.

## Reproduce

Serve the repository root on `http://127.0.0.1:8000`. Requires Playwright, Chromium at `/usr/bin/chromium`, Sharp and Python NumPy.

```sh
node peach-physics/experiments/r14-other-laughs/tests/santa-voice-state.cjs
node peach-physics/experiments/r14-other-laughs/tests/santa-voice.cjs
node peach-physics/experiments/r14-other-laughs/tests/santa-lifecycle.cjs
node peach-physics/experiments/r14-other-laughs/tests/santa-switch.cjs
node peach-physics/experiments/r14-other-laughs/tests/santa-motion.cjs
node peach-physics/experiments/r14-other-laughs/tests/audio.cjs
node peach-physics/experiments/r14-other-laughs/tests/elf-audio.cjs
node peach-physics/experiments/r14-other-laughs/tests/preservation.cjs
node peach-physics/experiments/r14-other-laughs/tests/offline.cjs
node peach-physics/experiments/r14-other-laughs/tests/preview.cjs
python peach-physics/experiments/r14-other-laughs/tests/santa-identity.py
python peach-physics/experiments/r14-other-laughs/tests/elf-identity.py
python peach-physics/experiments/r14-other-laughs/tests/graph-identity.py
node peach-physics/v8/tests/motion-unit.cjs
```

Set `R142_PREVIEW_URL` to the commit-pinned HTTPS app URL to run the hosted smoke test. Queries support all five characters, including `?character=santa`. This verifies the visible selector and all recordings online/offline in both renderers.

## Limits

The performances were previously approved by Lance; this environment cannot independently hear audio. PCM and source identity checks verify what plays, not subjective speaker quality. Actual iPhone Safari/PWA speaker output, silent-switch routing, interruptions and physical sensor behavior remain device review items. Sound stays off for fresh profiles and saved preferences are respected. Auto Jiggle never activates a voice. No production promotion is included.
