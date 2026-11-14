# R14.1 Holly laugh validation

Baseline: `2adb9257532ac3b17e39aeea815a23f5fb7f85ce`. Tested 2026-11-14 on Linux Chromium, with SwiftShader WebGL and forced Canvas fallback. Production/main and the approved Santa voice preview are untouched.

## Completed technical checks

| Suite | Result | Evidence |
| --- | --- | --- |
| R14 preservation | 248 assertions passed | [preservation.json](tests/preservation.json) |
| Browser audio and interaction lifecycle | 80 assertions passed | [audio.json](tests/audio.json) |
| Initial loading, cancellation and recovery | 41 assertions passed | [loading.json](tests/loading.json) |
| Offline and service-worker upgrade | 78 assertions passed | [offline.json](tests/offline.json) |
| Existing motion unit suite | 56 checks passed | `peach-physics/v8/tests/motion-unit.cjs` |
| Recorded output identity | Complete Test and tap captures match the source and its ending | [graph-identity.json](tests/graph-identity.json) |

Preservation covers 180 tap/drag/flick trajectories across five characters, both renderers, both sides and transfer 0/50/100, plus 20 Auto/Shake trajectories. All match current R14 exactly with Sound Off. Twenty motion frames and six Holly rest frames match the baseline byte-for-byte after rendering. iPhone-like 375×667, 390×844 and 430×932 framing is identical. Source checks cover character definitions, masks, solver/rendering blocks, original slap/Santa sound code, portraits and the complete motion module.

Holly artwork SHA-256 remains `f7267c4f7624ea17d2215251e0bdf63d3e1cbc59bb33e3b9bcaca7f81b486a58`. Screenshots: [WebGL](tests/holly-webgl.png), [Canvas](tests/holly-canvas.png).

The user reported normal taps cutting out. The original 1.10-second runtime cutoff is removed; all reactions play the unchanged 1.76-second file to EOF. Audio tests exercise explicit Sound activation, Test Holly Laugh with no physics effects, first tap, slow drag release, flick release, rapid taps and cooldowns. Accepted energetic synthetic physical samples trigger sparingly; invalid/gentle samples do not. Thirty simulated seconds of Auto stay silent. Recorded graph output peaks at approximately 0.43584 (−7.2 dBFS), with no clipping and substantial nonzero signal. Output after mute/reset/switch/hide/blur/pagehide is zero. The actual output recordings are [WebGL Test](tests/webgl-laugh.wav), [WebGL tap](tests/webgl-tap.wav), [Canvas Test](tests/canvas-laugh.wav) and [Canvas tap](tests/canvas-tap.wav). Capture uses an AudioWorklet on the audio thread so rapid test events do not drop samples from a main-thread recorder. Each capture is compared against the complete source and separately against its 1.15–1.70-second ending. This specifically guards against the previous 1.10-second tap truncation. An unrelated canceled touch during playback must also let the existing laugh finish.

Delayed-load tests cancel pending playback on mute, reset, switch, hide, blur, pagehide and pointer cancellation; no stale clip returns after decoding. A first real pointer tap during loading plays once when decoding finishes. Requests older than two seconds are dropped. Failed download/decode retries succeed. Safari-like interrupted state, rejected and late resume, real context suspension, and closed-context recreation are covered. Native iPhone behavior is not inferred from those fixtures.

Offline tests install the actual first preview from `2143e6c4f973859ab2f331678a43ee4fc3af395a` under the isolated preview scope, gate the new audio download, and verify the previous controller survives until the complete new cache is installed. A resurrected v1 cache is ignored after the v2 upgrade, and the offline audio module is verified byte-for-byte to contain the complete tap playback fix. All five characters and saved custom profiles load offline; the new WAV's fetched SHA matches the local file. Fresh Auto On, one-time R14 Auto migration, later Auto Off/On choices, saved Shake requiring fresh permission, Sound persistence, other characters' original sounds and current Santa behavior pass. Production and separate-preview cache/profile sentinels survive unchanged.

## Open gates and practical limits

- **Final listening approval remains open.** The user reviewed the first preview and identified the cutoff on normal taps. This revision retains the exact recording and restores the missing end of tap playback. The environment cannot listen to audio, so naturalness and iPhone output remain subject to the user's review. This report does not claim the whole issue's quality gates are complete.
- **Actual iPhone Safari speaker playback, audio routing and physical sensor sensitivity remain unverified.** Browser waveform capture is not a speaker test. Synthetic motion permission/readings and interrupted-state fixtures are labeled as such.
- A very slow initial load drops a reaction after two seconds instead of playing it late; Test/tap can retry once ready.
- Raw.githack may display an initial “Open the page” interstitial. The delivered URL is pinned to the exact experiment commit.

Recommendation: ready for **iPhone listening review** of the isolated candidate. Keep production unchanged until the voice choice and real-device behavior are approved.
