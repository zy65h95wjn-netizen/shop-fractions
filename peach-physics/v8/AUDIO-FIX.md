# R13 audio playback repair 2

Repairs audio activation after the report of silence on the iPhone. It does not add R14 sounds or change sound design, volume, artwork or motion tuning. Santa gains the missing belly-tap trigger for his existing optional laugh animation. Prior production: `48eb1ae26a7ee7071b15ea27b79ce33c98de1242`.

The old code only resumed `suspended` AudioContexts. In a reproducible interrupted-state test, it scheduled the slap's two sources while the context remained `interrupted` and never called `resume()`. Turning sound on also only changed a preference; it did not activate playback or play a confirmation. The exact physical-device cause cannot be established remotely.

The repair:

- Activates audio directly from Sound, Test sound and accepted touch gestures.
- Selects `navigator.audioSession.type = 'playback'` when available, with a guarded fallback for browsers without that API.
- Resumes non-running contexts and waits for successful resume before scheduling short sounds; recreates closed contexts.
- Cancels pending playback when sound is turned off, the character changes, or the page becomes hidden.
- Plays the existing slap as confirmation when sound is enabled and adds a Test sound button for an already enabled character.
- Shows a retry message if the audio API is unavailable or resume fails.
- Makes Santa's belly taps start the existing three-beat laugh when Belly laugh is On. Sound Off still mutes it, and repeated taps during an active laugh do not restart the laugh sequence.
- Keeps sound off by default and retains independent per-character preferences. Shake and Auto remain silent.

The original slap and Santa sound generation, envelopes, gains and filters are unchanged. Native OfflineAudioContext comparisons at 48 kHz produce sample-identical output against R13: maximum sample difference is zero. The slap has nonzero peak 0.13787 and RMS 0.00743; Santa has peak 0.04807 and RMS 0.00331 over the 0.5-second capture. These demonstrate a valid unchanged signal, not physical iPhone audibility.

Validation:

```
node peach-physics/v8/tests/santa-laugh-trigger.cjs
node peach-physics/v8/tests/audio-state.cjs
node peach-physics/v8/tests/audio-browser.cjs
node peach-physics/v8/tests/audio-motion-regression.cjs
node peach-physics/v8/tests/audio-release.cjs
```

The 18 state checks reproduce the interrupted-context failure and verify running/suspended/interrupted/closed contexts, blocked routing APIs, resume rejection, absent Web Audio, sound-off behavior, cancellation and hidden-page handling. Browser tests cover enable confirmation, Test sound, actual touch gestures, keyboard operation without bounce, Santa's laugh and native waveform equality in WebGL and Canvas.

The Santa trigger test reproduces the prior missing laugh with both Sound and Belly laugh enabled. It compares the fixed tap against the exact existing tap plus existing laugh sequence: raw motion and rendered frames match in both backends, including repeated taps, mute and disabled-laugh cases.

The motion regression retains full-state/frame comparisons: 90 against R12 with optional motion disabled, 90 against approved R13.3 with motion enabled, and 30 reset contracts. The full non-audio runtime is required to match the approved implementation after explicitly normalizing only the audio helper, wrappers, controls, diagnostics and the requested Santa laugh trigger. `motion.js` remains byte-identical to the approved experiment.

The service-worker cache advances to `peach-physics-v008-r13-audio2`, retaining all eight resources. The 139 upgrade checks start with actual R13, deliberately delays precaching, then verifies offline use, saved profiles and Test sound activation in both renderers. Results accompany each script as JSON.

No physical Safari or iPhone speaker result is claimed. After the installed app or Safari tab receives the update, the settings label reads `r13 · audio fix 2`. Enabling Sound should play a confirmation; Test sound retries playback without changing the physics. Browser status can confirm that audio started, but cannot measure the speaker, output route or device volume.
