# R14.2 — implementation and audition checkpoint

**Partial work. New character voices are not assigned.** [Issue #21](https://github.com/zy65h95wjn-netizen/shop-fractions/issues/21) requires: “Each recording must be listened to before choosing its character.” This execution environment cannot hear audio. Candidate metadata, waveform analysis and browser capture cannot establish naturalness, distinct performers or the requested voice personalities. The listening question remains pending; no character mapping has been inferred from filenames or pitch measurements.

Open **`audition.html`** on the commit-pinned HTTPS preview to hear two candidate excerpts each from C-V, SpliceSound and moxobna, alongside Holly's approved recordings. Each button cycles two complete takes. There is no automatic playback, queue or overlap. Listen to both takes from each source, then identify which fits Winter Ember, Midnight Yule and Aurelia Frost, or reject unsuitable candidates. These files are review candidates, not approved final selections.

`index.html?character=holly` contains the implemented R14.2 foundation and approved Holly. Queries also accept `ember`, `midnight`, `aurelia` and `santa`. Until the listening gate is completed, the three new elves retain their current production sound behavior. This checkpoint does **not** claim to deliver their requested new laughs.

## Implemented safely

- Fresh main was checked immediately before branching: `2adb9257532ac3b17e39aeea815a23f5fb7f85ce`. Its production app tree matched approved Holly's baseline exactly, so there was no integration conflict.
- New branch: `experiment/r14-other-laughs`. All work is in this new experiment directory. Production, the approved Holly branch and separate Santa voice preview are untouched.
- Ported Holly's approved audio engine and both recordings from `5441324244eb2e28ffc115f8cf0d34f1ff2c5d21` byte-for-byte. Her first-tap behavior, alternating tap/Test cursors, full endings, cooldowns, reactions and cancellation policy remain in the unchanged engine.
- Added `ElfVoiceBank`, a thin coordinator with independent character state and a shared eligibility gate. It configures additional unstarted players without changing the engine. Only Holly is registered in `voice-profiles.js` pending the new voice decisions.
- Existing physics, portraits, masks, rendering and `motion.js` are unchanged. Auto Jiggle remains silent. Production Santa retains its existing implementation; the separately approved recorded Santa preview `c5ef60e19a11cd3f5212b7a05940995b608a58fa` was not merged or modified.
- New preview storage/cache namespaces preserve the current profile logic without touching production settings. The service worker atomically caches the foundation and audition assets and reads only its current cache.

## Remaining quality gates

1. Human listening: confirm three recognizably distinct natural adult voices and acceptable complete takes; select the character mapping and reject/revise unsuitable excerpts.
2. Register the approved new voice pairs and run character-specific native tap, flick/release, permitted/unpermitted physical shake, lifecycle and audio output tests for all three new characters.
3. Verify the final combined commit-pinned preview on iPhone. Browser output and synthetic sensor tests do not prove iPhone speaker/routing/sensor behavior.

No production promotion is authorized or included. This is an honest partial result at the required listening gate, not a completed R14.2 release.

See [CREDITS.md](CREDITS.md), [VOICE-CANDIDATES.json](VOICE-CANDIDATES.json), [HOLLY-CREDITS.md](HOLLY-CREDITS.md) and [TEST-REPORT.md](TEST-REPORT.md).
