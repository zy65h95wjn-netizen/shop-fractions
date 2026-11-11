# Peach Physics v0.0.8 r3 — Holly Heartbreaker

Release: https://zy65h95wjn-netizen.github.io/shop-fractions/peach-physics/v8/

Rollback: https://zy65h95wjn-netizen.github.io/shop-fractions/peach-physics/v7-1/

Holly is the fourth selectable adult elf and the first front-facing calibration. The existing selector, name notification, touch capture, fixed-step spring solver, sound option, controls and offline delivery are retained. Only `peach-physics/v8/` is added; prior releases and unrelated applications are unchanged.

## r3: green-marked touch zones

The user's annotated crop now defines additional touch targets independently of the deformation masks. The photograph texture aligns with the original source by approximately `marked = source × 1.78 − [596,472]`. The screen-right outline is traced in `HOLLY_RIGHT_TOUCH` (source x=442–695, y=468–765). Because the left outline is cropped, its matching target mirrors the right around the corset axis x=400 (x=105–358). Existing exposed-skin targets remain active. The marked clothing/arm/outer areas accept input; their pixels do not deform.

A touch starting in an added target maps to that side's calibrated chest center. A constant source-coordinate offset is retained for the full pointer gesture, preserving direction, velocity, capture, independent simultaneous input, and full-strength response. Contact rings stay under the actual finger. The center lacing, skirt and unmarked background remain outside the added targets. No artwork, rendering mask, spring calibration, preset or other character changes in r3.

Run `node peach-physics/v8/tests/touch-zones.cjs` for r3-specific validation: **419 assertions passed**, with no uncaught page or WebGL errors. All four original artwork hashes and script syntax checks also pass. It compares all four characters' established trajectories and extreme rendered frames directly with r2, then checks points across the new zones, off-target rejection, equivalent center-tap/drag/flick responses, real two-finger input, preferences and offline use in WebGL and Canvas. Gesture-coordinate equivalence uses a 1e-9 numeric tolerance for floating-point conversion; legacy trajectories and rendered frames are compared exactly. The r2 evidence below remains archived unchanged.

## Artwork and support boundaries

The supplied 720×1280 JPEG is copied byte-for-byte into `assets/holly-heartbreaker.jpg`. The attached file has no visible upper-left arrow to remove. No regeneration, retouching, anatomical changes, or image stretching was performed. Its SHA-256 is `0ad0a1cad2273d038b1953587ecfd43857897f7627c91d8f2a02a989ffe2ba97`. All three existing portraits retain their original hashes.

Coordinates below are original-image pixels; left/right mean screen left/right. Independent supports are defined by `HOLLY_CONTOURS`. The left support lies within x=243–404, y=406–557; the right within x=421–567, y=418–560. The irregular lower boundaries follow the diagonal fur neckline from inside the skin. The center gap, upper torso, shoulders, hair, arms, corset, lacing and background have zero support weight. Each polygon uses an 24-pixel smooth feather. Direct skin picking uses this skin support. The separate r3 input contours add the green-marked control areas without expanding either deformation envelope.

The six spring centers are (332,436), (337,478), (371,529) and (476,444), (481,484), (451,531). Weighted spring displacements form a spatial field; the lower centers follow the neckline geometry instead of mirroring the upper centers. The shader transports texture coordinates through the fixed envelope in six short steps. Small motion is preserved without attenuation. Above 12 source pixels, a smooth limiter approaches a 18-source-pixel ceiling. This r2 change fixes the barely visible response reported at maximum settings. Supported garment edges stay fixed instead of traveling with a rectangular patch.

Holly's Canvas fallback uses bilinear texture remapping through the same envelope and spatial field. It preserves the source photo and bounded movement without changing the three existing fallback paths. WebGL remains the preferred mobile renderer.

## Independent physics

The original integrator, gesture handling and spring topology are reused. Holly alone uses a nominal frequency of `3.8 − .014 × softness` Hz, damping ratio `.22 + .0032 × settling`, and left/right stiffness multipliers .94/1.06. Her tap/flick impulse gain is `.65 + .009 × bounce` (1.55 at maximum), drag gain .95, and secondary horizontal/vertical rendering gains .45/.65. This replaces r1’s .46 tap/flick gain, .52 drag gain and .22/.30 secondary gains. Her support boundaries, spring solver, linked calibration and preset values are unchanged. The feather widens from 18 to 24 source pixels to blend the stronger movement into fixed clothing without sharp texture compression. Contact compression is local to the touch point; release gives restrained spring rebound and damped follow-through.

Tap strength uses available pointer pressure plus a small contact-duration contribution. iPhone Safari may report a fixed touch pressure: this is not a claim of force sensing. Flick strength uses measured pointer velocity. Separate pointer captures allow both sides to respond simultaneously.

Linked movement is zero at 0. At 50 and 100, a cross spring (`.7 × spring stiffness × slider/100`) responds to four times the opposite side's delayed follower, with a restoring term. The follower itself tracks .28 of the local displacement; the closed-loop displacement gain remains below unity. Holly receives no instantaneous cross-side tap or drag impulse. Transfer grows with the slider while the sides retain separate timing.

| Holly preset | Bounce | Softness | Settling |
| --- | ---: | ---: | ---: |
| Natural | 55 | 58 | 60 |
| Playful | 74 | 72 | 46 |
| Chaos | 92 | 84 | 32 |

Linked movement defaults to 50 and is preserved across preset changes. Existing characters' preset values, physics, masks, wave behavior, framing and Aurelia's directional fold remain unchanged.

## Framing, preferences and offline use

Holly is fitted without horizontal cropping or stretching and anchored below the portrait top-safe area. On shorter screens, the bottom of the stockings can extend below the viewport; her complete source face and hat remain in frame. The source portrait itself already reaches the top of the hat.

The `peach-physics-v008-*` settings import v7-1 first and retain the earlier migration chain. Each character has a separate saved profile. No earlier profile is written. `peach-physics-v008-r3` precaches the page, both external original portraits, manifest and local icon. The obsolete v8 r1/r2 caches are replaced; earlier-version caches are not removed. All runtime assets are inside v8; there are no services or paid dependencies.

## Reproducing validation

Serve the repository root on port 8000, then run:

```sh
node peach-physics/v8/tests/artwork.cjs
node peach-physics/v8/tests/browser.cjs
node peach-physics/v8/tests/deformation.cjs
node peach-physics/v8/tests/aurelia.cjs
node peach-physics/v8/tests/fold.cjs
node peach-physics/v8/tests/holly.cjs
node peach-physics/v8/tests/holly-stress.cjs
node peach-physics/v8/tests/holly-amplitude.cjs
node peach-physics/v8/tests/touch-zones.cjs
```

Tests require Playwright and Chromium (`CHROMIUM` overrides `/usr/bin/chromium`). Hooks and texture-coordinate encoding are injected only into test responses, never shipped in the app. Metrics and screenshots are generated in `/tmp/peach-v8-tests`; `PEACH_TEST_OUTPUT` overrides that path. The legacy deformation script expects port 8000; the other browser suites also accept `PEACH_TEST_URL`.

Validation used Chromium 156.0.8078.79, Playwright 1.62.1 and SwiftShader, at device scale factor 2. Viewports: 375×667, 390×844, 430×932 and 440×956. The original v7-1 suite was run successfully before validating v8 r1. The browser (218), Aurelia (606), fold (454) and Midnight deformation results below are retained from r1. For r2, Holly’s complete regression suite, repeated-input/Canvas stress suite, original-artwork hashes and syntax checks were rerun; the new amplitude test compares actual rendered displacement with the published r1 commit. The Holly suite independently rechecks all three existing characters against v7-1 at all four sizes. The r2 suites total 1,037 assertions (962 + 50 + 25).

- `browser.cjs`: **218 assertions passed**.
- `aurelia.cjs`: **606 assertions passed**, including the extended four-character cycle/offline checks.
- `fold.cjs`: **454 assertions passed**; Aurelia's calibrated directional fold is preserved.
- `holly.cjs`: **962 assertions passed**. This includes exact v7-1 trajectories for all three existing characters, both sides, four input types and links 0/50/100, plus pixel-identical resting and matched slap/flick frames at all four sizes.
- `holly-stress.cjs`: **50 assertions passed**. Eighty repeated alternating inputs per preset/link combination, plus all sliders at 100 and bounce/softness at 100 with settling at 0, remain bounded and fully settle. Both Canvas sides preserve all sampled outside-support pixels exactly.
- `holly-amplitude.cjs`: **25 assertions passed**. Both sides show a substantially stronger rendered tap at Natural, Chaos, all sliders at 100, and maximum bounce/softness with settling at 0. This test reads the actual texture-coordinate field and compares it with the first published v8 commit (`48d063b`).
- `deformation.cjs`: Midnight's full measured fields and traveling ripple match v6-2-3 exactly.
- `artwork.cjs`: all four original hashes match; HTML scripts and service worker pass JavaScript syntax checks.

Holly's 32 extreme WebGL fields have minimum sampled texture-map determinant **0.1554** (positive: no sampled folds), maximum sampled travel **17.98 source pixels**, and outside-support displacement below **0.01 source pixels** (encoding precision). Sampled fur, lacing, corset, hair, arms, upper torso, centerline, scenery and the inactive side remain pixel-identical. These finite samples do not prove every possible input.

Both sides were captured at rest, contact, measured peak, rebound, secondary motion and fully settled, plus extreme poses. All settled frames equal the resting canvas exactly. The six-phase comparison for both sides was visually inspected, along with full portrait framing and extreme WebGL/Canvas frames. `tests/captures/holly-phases.png` records the inspected close-up comparison. `tests/captures/holly-max-comparison.png` compares r1 and r2 at all sliders set to 100. Peak rendered-displacement measurements are in `tests/holly-amplitude.json`. Higher Settling means faster damping; Chaos or lower Settling gives a longer rebound. Raw metrics accompany the test scripts. All four characters load and switch offline; independent profiles and v7-1 migration pass; no uncaught page or WebGL errors occurred in the tested cases.

Canvas measurement warms readback before comparing images because Chromium can switch from GPU to CPU resampling after repeated `getImageData` calls. Its motion overlay is transparent outside the active skin support, preserving the base image. Desktop fallback timing is not an iPhone performance measurement.

## Physical-iPhone verification still required

These checks use desktop Chromium at iPhone-sized viewports, not a real iPhone. Verify Safari touch feel, single/two-finger input, perceived bounce and linked response, frame rate, device safe areas, optional audio after a user gesture, and Home Screen offline reopening on the actual device. In particular, compare Holly's restrained movement with the desired feel and confirm Canvas fallback speed if WebGL is unavailable. This is a controlled visual approximation, not a biomechanical simulation.
