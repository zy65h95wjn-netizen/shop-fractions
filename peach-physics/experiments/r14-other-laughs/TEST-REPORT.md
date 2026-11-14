# R14.2 audition checkpoint — validation

**Status: partial implementation; character selection is blocked on listening.** These results validate the shared playback foundation, unchanged Holly and the six unassigned audition excerpts. They do not establish three suitable voice personalities, natural excerpt boundaries or completed new-character interaction coverage.

Baseline: production/main `2adb9257532ac3b17e39aeea815a23f5fb7f85ce`. Approved Holly integration: `5441324244eb2e28ffc115f8cf0d34f1ff2c5d21`. Tested on 2026-11-14 with Chromium, software WebGL and forced Canvas. No physical iPhone was available.

| Suite | Result | Scope |
| --- | --- | --- |
| `tests/audio.cjs` | 96 checks passed | Holly in WebGL and Canvas: first tap, full playback, alternating independent tap/Test cursors, rapid taps and cooldowns, flick/slow-release reactions, simulated physical shake, Auto silent, cancellation, context recovery and saved sound preference |
| `tests/loading.cjs` | 52 checks passed | Pending and failed loads of both Holly recordings, cancellation, retries, delayed/rejected/interrupted resume and closed-context recovery |
| `tests/preservation.cjs` | 248 checks passed | Five characters, both renderers: 180 manual and 20 motion trajectories identical to main; 26 rendered-frame comparisons; unchanged portrait/calibration/motion source; iPhone-like 375×667, 390×844 and 430×932 framing |
| `tests/offline.cjs` | 98 checks passed | Both renderers: all five characters and custom profiles offline, both Holly recordings, all six audition excerpts, atomic cache upgrade, resurrected stale-cache race, current-cache-only reads, independent production/Santa cache and storage sentinels |
| `tests/candidates.cjs` | 33 checks passed | Six neutral candidate files: exact source hashes, actual AudioWorklet-captured browser output, nonzero output without digital output clipping, playback through file end, one active source, switch/stop cancellation |
| `tests/graph-identity.py` | 8 output comparisons passed | Both Holly recordings, tap and Test, both renderers; source and ending correlations above 0.99995 |
| `tests/candidate-identity.py` | 6 output comparisons passed | All audition excerpts match browser-decoded reference PCM and expected playback gain/fades, including endings |
| Production `v8/tests/motion-unit.cjs` | 56 checks passed | Existing R14 motion controller unit coverage |

Machine-readable results, screenshots and captured WAVs are in `tests/`. `approved-holly-identity.json` records the byte-identical engine, recordings and portrait hashes. Main's physics and rendering were compared with sound disabled to isolate motion preservation; the audio suites separately exercise playback and cancellation.

The offline upgrade fixture serves approved Holly under this experiment's namespace to exercise migration without touching its real branch or cache. Device motion events and permission responses are simulated. Browser audio graph capture establishes actual PCM output, not audible quality on a speaker. The source pages explicitly declare CC0 and the downloaded preview hashes and edit windows are in `VOICE-CANDIDATES.json`.

## Reproduce

From the repository root, serve the repository on `http://127.0.0.1:8000` (for example, `python -m http.server 8000 --bind 127.0.0.1`). With Playwright, Chromium at `/usr/bin/chromium`, Sharp and Python NumPy installed, run:

```sh
node peach-physics/experiments/r14-other-laughs/tests/audio.cjs
node peach-physics/experiments/r14-other-laughs/tests/loading.cjs
node peach-physics/experiments/r14-other-laughs/tests/preservation.cjs
node peach-physics/experiments/r14-other-laughs/tests/offline.cjs
node peach-physics/experiments/r14-other-laughs/tests/candidates.cjs
python peach-physics/experiments/r14-other-laughs/tests/graph-identity.py
python peach-physics/experiments/r14-other-laughs/tests/candidate-identity.py
node peach-physics/v8/tests/motion-unit.cjs
```

## Remaining work and limits

- Issue #21 says each recording must be listened to before choosing its character. This environment cannot hear audio. None of the three new character assignments has been made; uploader identity and waveform measurements cannot substitute for that gate.
- Human review must establish three recognizably different natural adult voices, two acceptable takes per performer, intact laugh phrases, balanced perceived volume and no audible distortion or unwanted material. Playback through the entire WAV does not prove its excerpt boundaries are musically or vocally natural.
- After selection, register the new pairs and run each character's native tap, flick/release, physical-shake, mute/lifecycle, cross-character cancellation, profile and offline tests. Those three characters currently retain production sound behavior.
- Real iPhone Safari/PWA speaker output, silent-switch routing, interruption recovery and physical sensor behavior remain device review items.
- This checkpoint is ready for candidate listening only. It is not the requested completed four-voice R14.2 release and is not ready for production promotion.
