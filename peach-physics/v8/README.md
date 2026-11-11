# Peach Physics v0.0.8 — Holly Heartbreaker

Release: https://zy65h95wjn-netizen.github.io/shop-fractions/peach-physics/v8/

Rollback: https://zy65h95wjn-netizen.github.io/shop-fractions/peach-physics/v7-1/

Holly is the fourth selectable adult elf and the first front-facing calibration. The existing selector, name notification, touch capture, fixed-step spring solver, sound option, controls and offline delivery are retained. Only `peach-physics/v8/` is added; prior releases and unrelated applications are unchanged.

## Artwork and support boundaries

The supplied 720×1280 JPEG is copied byte-for-byte into `assets/holly-heartbreaker.jpg`. The attached file has no visible upper-left arrow to remove. No regeneration, retouching, anatomical changes, or image stretching was performed. Its SHA-256 is `0ad0a1cad2273d038b1953587ecfd43857897f7627c91d8f2a02a989ffe2ba97`. All three existing portraits retain their original hashes.

Coordinates below are original-image pixels; left/right mean screen left/right. Independent supports are defined by `HOLLY_CONTOURS`. The left support lies within x=243–404, y=406–557; the right within x=421–567, y=418–560. The irregular lower boundaries follow the diagonal fur neckline from inside the skin. The center gap, upper torso, shoulders, hair, arms, corset, lacing and background have zero support weight. Each polygon uses an 18-pixel smooth feather. Touch picking uses the same skin support instead of accepting clothing or background touches in a rear-facing ellipse.

The six spring centers are (332,436), (337,478), (371,529) and (476,444), (481,484), (451,531). Weighted spring displacements form a spatial field; the lower centers follow the neckline geometry instead of mirroring the upper centers. The shader transports texture coordinates through the fixed envelope in six short steps. Its smooth displacement limiter stays below 10 source pixels even at extreme simulation poses. Supported garment edges stay fixed instead of traveling with a rectangular patch.

Holly's Canvas fallback uses bilinear texture remapping through the same envelope and spatial field. It preserves the source photo and bounded movement without changing the three existing fallback paths. WebGL remains the preferred mobile renderer.

## Independent physics

The original integrator, gesture handling and spring topology are reused. Holly alone uses a nominal frequency of `3.8 − .014 × softness` Hz, damping ratio `.22 + .0032 × settling`, and left/right stiffness multipliers .94/1.06. Her tap/flick impulse gain is .46 of the shared base, drag gain .52, and secondary horizontal/vertical rendering gains .22/.30. Contact compression is local to the touch point; release gives restrained spring rebound and damped follow-through.

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

The `peach-physics-v008-*` settings import v7-1 first and retain the earlier migration chain. Each character has a separate saved profile. No earlier profile is written. `peach-physics-v008-r1` precaches the page, both external original portraits, manifest and local icon. Earlier releases' caches are not removed. All runtime assets are inside v8; there are no services or paid dependencies.

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
```

Tests require Playwright and Chromium (`CHROMIUM` overrides `/usr/bin/chromium`). Hooks and texture-coordinate encoding are injected only into test responses, never shipped in the app. Metrics and screenshots are generated in `/tmp/peach-v8-tests`; `PEACH_TEST_OUTPUT` overrides that path. The legacy deformation script expects port 8000; the other browser suites also accept `PEACH_TEST_URL`.

Validation used Chromium 156.0.8078.79, Playwright 1.62.1 and SwiftShader, at device scale factor 2. Viewports: 375×667, 390×844, 430×932 and 440×956. The original v7-1 suite was run successfully before validating v8.

- `browser.cjs`: **218 assertions passed**.
- `aurelia.cjs`: **606 assertions passed**, including the extended four-character cycle/offline checks.
- `fold.cjs`: **454 assertions passed**; Aurelia's calibrated directional fold is preserved.
- `holly.cjs`: **962 assertions passed**. This includes exact v7-1 trajectories for all three existing characters, both sides, four input types and links 0/50/100, plus pixel-identical resting and matched slap/flick frames at all four sizes.
- `holly-stress.cjs`: **32 assertions passed**. Eighty repeated alternating inputs per preset/link combination remain bounded and fully settle. Both Canvas sides preserve all sampled outside-support pixels exactly.
- `deformation.cjs`: Midnight's full measured fields and traveling ripple match v6-2-3 exactly.
- `artwork.cjs`: all four original hashes match; HTML scripts and service worker pass JavaScript syntax checks.

Holly's 32 extreme WebGL fields have minimum sampled texture-map determinant **0.5111** (positive: no sampled folds), maximum sampled travel **8.03 source pixels**, and outside-support displacement below **0.01 source pixels** (encoding precision). Sampled fur, lacing, corset, hair, arms, upper torso, centerline, scenery and the inactive side remain pixel-identical. These finite samples do not prove every possible input.

Both sides were captured at rest, contact, measured peak, rebound, secondary motion and fully settled, plus extreme poses. All settled frames equal the resting canvas exactly. The six-phase comparison for both sides was visually inspected, along with full portrait framing and extreme WebGL/Canvas frames. `tests/captures/holly-phases.png` records the inspected close-up comparison. Raw metrics accompany the test scripts. All four characters load and switch offline; independent profiles and v7-1 migration pass; no uncaught page or WebGL errors occurred in the tested cases.

Canvas measurement warms readback before comparing images because Chromium can switch from GPU to CPU resampling after repeated `getImageData` calls. Its motion overlay is transparent outside the active skin support, preserving the base image. Desktop fallback timing is not an iPhone performance measurement.

## Physical-iPhone verification still required

These checks use desktop Chromium at iPhone-sized viewports, not a real iPhone. Verify Safari touch feel, single/two-finger input, perceived bounce and linked response, frame rate, device safe areas, optional audio after a user gesture, and Home Screen offline reopening on the actual device. In particular, compare Holly's restrained movement with the desired feel and confirm Canvas fallback speed if WebGL is unavailable. This is a controlled visual approximation, not a biomechanical simulation.
