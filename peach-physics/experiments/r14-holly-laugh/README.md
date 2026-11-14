# Holly laugh — R14.1 isolated review preview

Implements the audio interaction portion of [issue #20](https://github.com/zy65h95wjn-netizen/shop-fractions/issues/20) on the approved R14 portrait. **Human listening/naturalness approval remains open.** This environment cannot listen to audio; it has verified source provenance, licensing, waveform levels, decoding and actual browser output, but cannot honestly certify the best-sounding candidate. The included mvVoiceActing recording is provisional for listening review.

Production/main was freshly verified at `2adb9257532ac3b17e39aeea815a23f5fb7f85ce` before creating `experiment/r14-holly-laugh`. Every tracked production file is unchanged. No merge, release, Pages deployment, or production promotion is included. The separate recorded Santa preview `c5ef60e19a11cd3f5212b7a05940995b608a58fa` is untouched; current production Santa behavior is preserved.

## Review on iPhone

Open this commit's `index.html?character=holly` through the commit-pinned raw.githack URL supplied with the delivery. If the host shows an interstitial, choose **Open the page**. Review in a normal Safari tab; there is no need to replace an installed PWA.

1. Open the gear, turn **Sound: On**, then press **Test Holly Laugh**. The Sound switch unlocks/prepares audio without consuming the first tap reaction.
2. Close settings and tap an interaction region. Try a deliberate flick and a slower drag/release after the cooldown.
3. Enable **Shake to Jiggle**, grant motion permission, and try an energetic physical movement. Allow 12 seconds between shake laughs.
4. Leave **Auto Jiggle** on: it must stay silent. Mute, reset, switch characters, background Safari and return. No canceled laugh should return later; use Test/touch to reactivate after interruption.
5. Judge whether the voice, trim, level and pace feel natural. Real iPhone speaker output, silent-switch/audio routing, sensor sensitivity and subjective naturalness remain unverified here.

The existing preview profile defaults to Sound Off and Auto On. Preview storage and service-worker caches have their own namespace, so reviewing cannot migrate or overwrite production settings. Existing per-character profile logic and the R14 one-time Auto-on migration are unchanged inside that namespace.

## Tap cutoff correction

The user identified the cutoff on **normal taps**. The first preview imposed a 1.10-second tap stop even though Test Holly Laugh played the 1.76-second recording. Taps now play that same complete recording to EOF. The recording bytes, pitch, level and Test button performance are unchanged. Canceling a later touch no longer stops an earlier laugh already playing; pending loads still cancel, and mute/reset/switch/background behavior remains immediate.

## Audio behavior

- A tap plays the complete 1.76-second recording, matching Test Holly Laugh. Tap cooldown: 2.6 seconds from playback start.
- A deliberate flick or drag/release plays the full 1.76-second clip. Common release cooldown: 4.2 seconds.
- Physical shake observes the existing accepted sensor sample path after warmup and explicit audio activation. It requires sustained filtered acceleration above 5 m/s² and force above 1.9, then applies a 12-second shake cooldown in addition to the common cooldown. It does not change any sensor calibration or solver values.
- Auto uses `tick()` and has no path into the laugh trigger.
- One active or pending request maximum. No event queue, looping, random acceptance, synthesized voice, pitch shifting or speech.
- Test Holly Laugh plays without touching physics and bypasses reaction cooldown when idle; it cannot overlap another laugh.
- Mute, switch, reset, graphics loss, blur, hide and pagehide cancel both playback and pending work. Pointer cancellation clears pending work but lets an earlier accepted laugh finish. Reset/pointer cancellation retain an already-running audio activation for future fresh input. Background/switch/interruption require fresh activation before sensor audio.
- Slow loading never produces an unbounded delayed laugh: a request older than two seconds is dropped with a tap-again message. Fetches time out at eight seconds; failed downloads/decodes can be retried. Initial ordinary playback is preloaded and decoded during the explicit Sound gesture.

## Recording and preservation

See [CREDITS.md](CREDITS.md) and [machine-readable provenance](assets/audio/provenance.json) for source URLs, CC0 evidence, edits and hashes. The original public preview bytes are retained alongside the final WAV. Nothing is fetched from Freesound at runtime.

Holly's PNG is byte-identical to approved R14:

`f7267c4f7624ea17d2215251e0bdf63d3e1cbc59bb33e3b9bcaca7f81b486a58`

The source portraits, character calibration definitions, masks, spring solver, rendering paths, original non-Holly sounds and `motion.js` are unchanged. This preserves Holly's ×1.10 rendered gain, current fullscreen framing and the increased Auto strength for Midnight, Aurelia and Holly.

## Validation

See [TEST-REPORT.md](TEST-REPORT.md), executable checks and JSON results in `tests/`. Tests use Chromium with SwiftShader WebGL and a forced Canvas fallback. Sensor permission/readings and Safari-like `interrupted` state are explicit fixtures, not real-device evidence. Browser graph WAV captures establish actual audible-signal generation, not speaker playback or human naturalness.

From repository root, with Node/Playwright, Chromium and a repository-root server on `127.0.0.1:8000`:

```sh
node peach-physics/experiments/r14-holly-laugh/tests/preservation.cjs
node peach-physics/experiments/r14-holly-laugh/tests/audio.cjs
python peach-physics/experiments/r14-holly-laugh/tests/graph-identity.py
node peach-physics/experiments/r14-holly-laugh/tests/loading.cjs
node peach-physics/experiments/r14-holly-laugh/tests/offline.cjs
node peach-physics/v8/tests/motion-unit.cjs
```

No production recommendation is made until human audition and iPhone approval complete the remaining gates.
