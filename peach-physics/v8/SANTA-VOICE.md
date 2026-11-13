# Santa “Ho ho ho” preview

The previous three sawtooth tones were audible but did not sound like a laugh. This replaces them with a licensed human voice recording saying **“Ho, ho, ho!”**, played once at its original pitch and speed. The 1.5-second MP3 is 18.8 kB. Source, CC0 license and exact edit are documented in [the asset credit](assets/santa-ho-ho-ho.LICENSE.md).

Use Santa's **Sound** and **Belly laugh** controls, then tap his belly. **Test Santa laugh** previews the voice without moving him and works even with the optional animation off. The other four characters retain their existing slap audio. Sound remains off by default and preferences stay per-character.

The voice loads on selecting Santa, decodes only after an audio gesture, and reuses the decoded buffer. Repeated taps cannot overlap the phrase. Mute, Reset motion, Belly laugh Off, hiding the page and changing characters cancel current and pending playback. Load/decode failures offer a visible retry through Test Santa laugh. The local MP3 is the ninth service-worker precache resource; no speech service is used at runtime.

The original three visual spring impulses and their timing remain unchanged, so animation timing is approximate to the actor's syllables. The controller in `motion.js` remains byte-identical to approved R13.3. Artwork, physics calibration, grab-and-hold and Auto/Shake behavior are unchanged.

Validation:

```sh
node peach-physics/v8/tests/audio-state.cjs
node peach-physics/v8/tests/santa-voice-state.cjs
node peach-physics/v8/tests/santa-voice.cjs
node peach-physics/v8/tests/audio-browser.cjs
node peach-physics/v8/tests/santa-laugh-trigger.cjs
node peach-physics/v8/tests/audio-motion-regression.cjs
node peach-physics/v8/tests/audio-release.cjs
```

`santa-voice-evidence/` contains actual MediaRecorder output from the native browser audio graph during belly taps in WebGL and Canvas. Independent Whisper small.en transcription runs with no text prompt. The browser tests assert non-silent decoded samples, original playback speed, one phrase per sequence, no synthetic voice oscillators, mute and character isolation. State tests cover cancellation during fetch and decode, failure/retry and decoded-buffer reuse. Existing slap PCM equality and full motion/frame comparisons remain in place.

Results: 18 activation checks, 23 voice state checks, 149 offline upgrade checks, 90 R12 motion comparisons, 90 approved R13.3 motion comparisons and 30 reset contracts pass. All eight Santa laugh physics/frame cases match the existing tap-plus-laugh sequence exactly. The four other characters pass native audio/touch checks in both renderers; their slap PCM difference is zero. Both browser-output recordings independently transcribe to **“Ho, ho, ho!”** Their left-channel peaks are 0.936 and RMS levels 0.156, with no clipping or silence. The transcripts and recording hashes are committed alongside the recordings. Reproduce speech recognition with `tests/verify-santa-speech.py` and an optional model-cache argument.

This is a separate preview branch based on production `34673b6`; it does not promote a new production release. Physical iPhone speaker output and voice preference remain for Lance's review. A browser recording and transcript establish the actual emitted phrase, not approval of its performance on his device.
