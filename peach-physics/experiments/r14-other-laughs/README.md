# R14.2 — four elf voices for iPhone review

This isolated preview implements [issue #21](https://github.com/zy65h95wjn-netizen/shop-fractions/issues/21): Winter Ember, Midnight Yule and Aurelia Frost each have two recorded human laugh excerpts, alongside Holly's approved two-laugh implementation. Production has not been changed. Santa retains its shipping behavior; its separate approved human-voice preview remains separate.

Lance approved the candidate excerpts in the audition checkpoint (`331d1e5`) by replying “i like them.” The same audio bytes are now paired with characters as follows. The pairings are implementation choices for final listening review, not a claim of separate character-by-character approval.

| Character | Recording source | Take 1 | Take 2 |
| --- | --- | --- | --- |
| Winter Ember | C-V, Freesound 556251 | 1.675 s | 3.150 s |
| Midnight Yule | SpliceSound, Freesound 218310 | 1.430 s | 1.700 s |
| Aurelia Frost | moxobna, Freesound 102211 | 1.560 s | 2.770 s |
| Holly Heartbreaker | Approved R14.1 recordings | 1.760 s | 2.080 s |

## Listen on iPhone

Open the commit-pinned HTTPS `index.html?character=ember`. If the hosting service shows its external-content notice, select **Open the page**. Use the upper-left character button to cycle Ember → Midnight → Aurelia → Holly → Santa.

For each elf, open Settings, turn **Sound: On**, then tap **Test [Name] Laugh** twice, allowing each take to finish. The test control cycles its own two takes and does not move the character. Close Settings to try taps and deliberate flick/drag releases. **Auto Jiggle is silent**, even with Sound enabled. Shake reactions require explicitly granting motion access and sufficiently energetic physical readings.

Fresh profiles start with Sound off. Existing saved settings are retained per character. URL queries support `ember`, `midnight`, `aurelia`, `holly` and `santa`. `audition.html` remains available for source comparison; the combined app is the review entry point.

## Behavior and preservation

- Fresh main was verified at `2adb9257532ac3b17e39aeea815a23f5fb7f85ce`, including a re-check after candidate approval. The approved Holly preview's production app tree matched main, so no newer production changes were lost.
- Branch: `experiment/r14-other-laughs`. All changes are confined to this experiment directory. The approved Holly and separate Santa branches are untouched.
- Holly's `holly-audio.js`, both WAVs and portrait are byte-identical to `5441324244eb2e28ffc115f8cf0d34f1ff2c5d21`. Her playback logic is unchanged. The new characters use independent instances of that same engine through `ElfVoiceBank`; a shared eligibility check prevents multiple active or pending elf sources.
- Accepted taps alternate complete takes with a 2.6-second cooldown. A longer recording finishes even if the cooldown expires during playback. Blocked, failed or cancelled requests never advance the sequence. Test controls have independent cursors.
- Deliberate flick/drag-release reactions use the first take and a 4.2-second cooldown. Physical-shake reactions require accepted sensor readings, sustained energy, prior audio activation and a 12-second shake cooldown. Auto runs through a separate motion path and never requests audio.
- Mute, reset, switch, hide, blur and pagehide cancel playback immediately. Unrelated touches do not truncate an accepted laugh. Failed/expired loads and late context resumes cannot queue stale playback. Existing iOS gesture activation and recovery logic are retained.
- R14 physics, calibration, images, framing, masks, profiles and `motion.js` are unchanged. All five characters' motion traces and rendered frames match main. The separate Santa recorded-voice preview `c5ef60e19a11cd3f5212b7a05940995b608a58fa` is not merged.
- Preview storage uses `peach-preview-r142-other-laughs-`; the service-worker cache is `peach-preview-r142-other-laughs-v2`. All eight elf WAVs are local and atomically precached. Only this release's cache is read on network failure, protecting against a late old-worker write.

## Evidence and review limits

See [TEST-REPORT.md](TEST-REPORT.md) for WebGL/Canvas, native touch, audio capture, motion, lifecycle, profile and offline results. Tests include upgrades from both approved Holly and the audition checkpoint. Source pages, CC0 licenses, original preview hashes, extraction windows, transforms and exact final hashes are documented in [CREDITS.md](CREDITS.md), [VOICE-CANDIDATES.json](VOICE-CANDIDATES.json) and [HOLLY-CREDITS.md](HOLLY-CREDITS.md).

The environment cannot independently hear audio; Lance supplied candidate listening approval. Browser capture verifies PCM playback and complete file endings, not subjective voice fit or real iPhone speaker output. Character pairings, perceived volume, device audio routing/interruption recovery and physical shake feel still need iPhone review. This preview is ready for that review; no production promotion is authorized or included.
