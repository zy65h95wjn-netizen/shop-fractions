# Santa's approved “Ho ho ho” in R14.2

This build integrates the approved Santa recorded-voice preview from `c5ef60e19a11cd3f5212b7a05940995b608a58fa` into the existing four-elf R14.2 preview. Lance explicitly requested this merge. Production and the original Santa/Holly preview branches remain unchanged.

The 1.5-second, 18,764-byte MP3 is copied byte-for-byte from the approved Santa commit. SHA-256: `c0874443e5e562fe5431c5cfb10880a18a2a1b888a73c1630a12e1be299d0e7b`. The [CC0 asset credit](assets/santa-ho-ho-ho.LICENSE.md) is copied with it. No new performance, processing, pitch change or synthetic voice replaces the approved recording.

The complete Santa voice block, including load/decode/retry, single-source gating, full-phrase playback and the original three animation impulses, is byte-identical to the approved implementation. Its integration uses the current R14.2 audio context and settings. Shared cancellation now also stops Santa immediately on switching, mute, reset, hide, blur, pagehide or graphics loss. A Santa-specific context watcher cancels an interrupted phrase so resuming the context cannot replay it. Late fetch/decode/resume callbacks cannot play into a different character.

Select Santa, open Settings and enable **Sound**. This previews the approved phrase once, matching the approved Santa implementation. **Test Santa laugh** works with **Belly laugh** off and produces no physics impulse. Enable **Belly laugh** for his existing tap/bounce reaction and three visual pulses. The phrase plays once at natural speed; repeated taps cannot overlap it. Auto Jiggle stays silent. All per-character sound/physics settings remain independent.

The eight elf WAVs and Santa MP3 are local, with an atomic `peach-preview-r142-other-laughs-v3` cache. The upgrade test delays the new MP3 and proves the previous controller stays active until installation completes; offline fallback reads only the current cache even if an old worker recreates a retired cache.

Validation includes native belly taps and MediaRecorder captures in WebGL/Canvas, actual PCM/source identity through the phrase ending, cancellation and context recovery, late Santa↔Holly loads/resumes, all nine recordings offline, four-elf voice regressions, and exact Santa animation/frame comparisons. See [TEST-REPORT.md](TEST-REPORT.md).

The original user-approved recording is retained. Automated browser output verification does not establish physical iPhone speaker, silent-switch or sensor behavior; the combined preview remains available for device review.
