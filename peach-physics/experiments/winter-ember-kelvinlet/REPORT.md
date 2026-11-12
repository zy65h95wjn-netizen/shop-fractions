# Winter Ember: Kelvinlet comparison — acceptance failed

**A visibly more convincing effect than strength-matched r11 has not been established. Do not promote this experiment.** The contact close-ups show a localized directional reshape, but do not establish convincing added tissue volume. The unchanged image envelope constrains the outer silhouette. More pressure would amplify texture deformation without resolving that limitation. No human preference result is available.

This is a WebGL research comparison with known incomplete acceptance requirements, not a validated cross-renderer replacement. Canvas A is preserved; Canvas A+/B are not implemented. The preview disables comparison on Canvas. Consequently the full requested validation gate fails, independently of the positive mathematical results. Real iPhone Safari performance and Lance's preference remain untested.

## Provenance and controls

Baseline: `d2a1fa1686aa1dda3cb1553872f0ad126138b873`, `peach-physics/v8/index.html`, r11. The root peach-physics/index.html is an older implementation and was not used. `engine.html` is an isolated copy with only Ember selectable, no persistent preferences and no service worker. Original spring integration, followers, impulses, release handling, presets, source-space geometry and mask formulas remain intact. No production file is changed.

Artwork is the exact embedded 941×1671 WebP; SHA-256 `37abbe30132c88c9fa6950e96dd639eeb86d547fdd316a311c02cb11653dce07`. See `evidence/provenance.json` for byte identity and core function equality checks. Other characters are unavailable in the standalone page.

Kelvinlet mathematics is copied byte-for-byte from commit `3451a2373fbb88935a302ba282562368fae4b6e6`, redhead-kelvinlet/kelvinlet.js. The 2D regularized Green tensor is differentiated and contracted with a traceless affine force, compounded at three scales. The Ember field evaluates `2 * pinch(dx/2, dy/2, .35 * load)`: effective epsilon 56 source pixels. Load is the unchanged signed r11 contact history, `contact - 1.375 * rebound`. No spring or new oscillator drives B. Bulk and traveling wave terms are unchanged.

A is the original WebGL vertex deformation. A+ multiplies only its local radial pressure term. Its scalar gain matches B's masked RMS displacement at actual r11 mesh vertices within 28 source pixels of contact. B replaces only that pressure term. Matching is recomputed for viewport framing. This matches displacement magnitude, not direction; B's opposing principal strains are the variable under investigation. No added movement outside that contact field, safety fallback or enlarged mask is used.

## Measurements

The test matrix covers Natural, Playful, Chaos; linkage 0 and 50; tap, repeated impacts, inward/outward drags, upward/downward flick input and simultaneous two-side contact. Inputs run through original pointer handlers except repeated impulses, which use the original impulse routine. Automated event timing is synthetic and does not reproduce every physical-device gesture cadence. Modes are evaluated on the same simulation state.

Representative held contact: A RMS 2.930 px; B 4.029 px; A+ 4.029 px, gain 1.375. All sampled matrix cases had an achievable upward-only match. Matching is at mesh vertices, not a claim of exact raster-space matching after interpolation.

Worst sampled values over the matrix (source-space inverse sampling map, before mesh interpolation):

| Metric | A | A+ | B |
|---|---:|---:|---:|
| Minimum determinant | .766 | .750 | .768 |
| Minimum principal stretch | .763 | .745 | .746 |
| Maximum principal stretch | 1.246 | 1.272 | 1.307 |
| Maximum normalized column shear | .307 | .322 | .300 |
| Maximum displacement in x=375–405 crease band, px | 6.85 | 6.92 | 6.65 |

Positive determinants are not a realism verdict. B has measurable neighboring expansion and localized compression, but also a larger maximum principal stretch than A+. Crease displacement includes original bulk movement, and this simple band does not certify anatomical stability along the entire crease. Rounded shape retention and texture quality still require visual judgment.

Zero linkage: maximum untouched-side spring displacement was exactly zero for the one-side cases. Linked cases are included separately in the raw matrix. At 30 seconds after release, raw rendered Canvas readback of the WebGL surface returned pixel-for-pixel to its resting render in all three modes. This compares the original image rendered with identical framing/resampling, not encoded WebP bytes to PNG bytes.

The representative Chaos two-contact pixel test changed zero pixels in the sampled upper protected band (rows 0–434), lower band (700 onward), and hand rectangle (x≥355, rows 510–639), at 390×844. These rectangular probes do not constitute exhaustive semantic segmentation of every hair, clothing, hand or background pixel. Full protected-region certification is outstanding.

## Visual evidence and limitations

`evidence.html` contains actual rendered motion and close-ups. A, A+, B use the same source artwork, framing and input timeline. Recordings are deterministic 120 Hz simulation sampled at 30 fps; they are not real-time performance recordings. Close-ups are presented A, A+, B from left to right.

The stationary image envelope limits silhouette change. The original 62×112 screen mesh also smooths the local strain; this is retained to keep the baseline intact. Contact deformation can read as an image warp rather than convincing volume. Increasing strain or moving the boundary would introduce additional variables and is not justified by the present evidence.

The preview offers ten balanced, randomized sequential X/Y A+/B comparisons. Votes unlock after both clips finish; either method or no preference is available, with JSON export. Nothing is uploaded. No votes are supplied or invented. It is a single-observer informal comparison, not a statistical trial. Changing the preset mid-pair should be avoided; physical-device usability still needs review.

Browser measurements use desktop Chromium with software WebGL at a 390×844 viewport. See performance.json for CPU submission timing only; it excludes full GPU presentation latency and is not an iPhone performance claim. Canvas consistency fails because its original crop-based renderer lacks the added contact field. The absence of a Canvas comparison and actual-device performance evidence means this delivery does not satisfy the complete mission acceptance checklist.

**Decision: stop; no production change.** The available evidence does not support claiming a visible realism advantage. This is not proof that every possible Kelvinlet formulation would fail.
