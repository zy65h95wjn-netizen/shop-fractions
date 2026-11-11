# Peach Physics v0.0.8 r4 — Holly Heartbreaker

Release: https://zy65h95wjn-netizen.github.io/shop-fractions/peach-physics/v8/

Rollback: https://zy65h95wjn-netizen.github.io/shop-fractions/peach-physics/v7-1/

Holly is the fourth selectable adult elf and the first front-facing calibration. The existing selector, name notification, touch capture, fixed-step spring solver, sound option, controls and offline delivery are retained. Changes are confined to `peach-physics/v8/`; prior releases and unrelated applications are unchanged.

## r4: visible movement and rebound

Earlier revisions mostly moved skin texture inside a fixed outline. Increasing their impulse did not produce convincing visible movement, and Holly's damping stopped the rebound too quickly. r4 lets the attached fur neckline and soft upper corset cups travel with each side. The lower corset, central lacing, centerline, hair, arms and scenery remain anchored. A slower spring and lighter damping allow a visible rebound and secondary motion. The original photograph and resting proportions are unchanged.

The green-marked touch zones introduced in r3 remain active. Existing characters retain their accepted physics and rendering exactly. Saved settings are retained; the settings panel identifies this release as **r4**.

## Artwork, touch targets and movement boundaries

The supplied 720×1280 JPEG is copied byte-for-byte into `assets/holly-heartbreaker.jpg`. The supplied file has no visible upper-left arrow to remove. No regeneration, retouching, anatomical changes, or image stretching was performed. Its SHA-256 is `0ad0a1cad2273d038b1953587ecfd43857897f7627c91d8f2a02a989ffe2ba97`. All three existing portraits retain their original hashes.

All calibration coordinates use original-image pixels; left/right mean screen left/right. Three separate definitions serve different purposes:

- `HOLLY_CONTOURS` retains direct exposed-skin input, within x=243–404, y=406–557 on the left and x=421–567, y=418–560 on the right.
- `HOLLY_MOTION_CONTOURS` defines spatial deformation through the skin, attached fur and soft upper cup. Its outer polygon bounds are x=218–407, y=402–635 on the left and x=418–600, y=408–639 on the right. A 32-pixel smooth feather blends motion into fixed boundaries. Additional weights pin the central lacing below y=590 and the left hair boundary. The effective region is smaller than these bounding boxes; the central gap stays fixed.
- `HOLLY_TOUCH_CONTOURS` retains the user's green-marked control areas independently of deformation. The marked crop aligns approximately as `marked = source × 1.78 − [596,472]`. The right trace covers x=442–695, y=468–765. Because the left outline is cropped, its matching target mirrors the right around x=400. These added targets accept input over clothing, arm and outer areas without moving those pixels.

A touch outside the original skin target maps to that side's calibrated chest center. A constant source-coordinate offset persists through the gesture, preserving drag direction, flick velocity and independent multi-touch. Contact rings remain under the actual finger. Moving upper cups also accept touch. Central lacing, skirt and unmarked background remain outside the added targets.

## Holly's independent physics

The established integrator, spring topology, bounded motion and gesture handling are reused. Holly alone uses:

- Nominal frequency `3.0 − .012 × softness` Hz and damping ratio `.12 + .0022 × settling`.
- Left/right stiffness multipliers .94/1.06, so timing is not exactly mirrored.
- Tap/flick impulse gain `.65 + .009 × bounce`, drag gain .95, and secondary horizontal/vertical rendering gains .50/.80.
- A field combining 65% central-spring motion with 35% normalized local spring weighting. The smooth spatial envelope and local contact compression keep this a deformation field rather than a translated image patch.
- Unattenuated field travel up to 16 source pixels, then a smooth limit approaching 24 pixels. Node bounds remain ±26 horizontally and ±30 vertically. Six short texture-coordinate transport steps keep the moving fur attached and blend into supported areas.

The six spring centers remain (332,436), (337,478), (371,529) and (476,444), (481,484), (451,531). Holly's Canvas fallback uses bilinear texture remapping through the same envelope and field. The three existing characters' fallback paths are unchanged.

Linked movement is zero at 0. At 50 and 100, a passive spring between the central nodes uses stiffness `.35 × local spring stiffness × slider/100`. The opposite side responds as displacement develops; no instantaneous cross-side tap or drag impulse is injected. This replaces the previous delayed-follower feedback, which could sustain motion with the softer, less-damped calibration. Secondary followers still contribute local follow-through. Repeated-input tests confirm complete settling at every tested link setting.

Tap strength uses available pointer pressure plus a small contact-duration contribution. iPhone Safari may report a fixed touch pressure; this does not claim force sensing. Flick strength uses measured pointer velocity. Separate pointer captures allow simultaneous input on both sides.

| Holly preset | Bounce | Softness | Settling |
| --- | ---: | ---: | ---: |
| Natural | 55 | 58 | 60 |
| Playful | 74 | 72 | 46 |
| Chaos | 92 | 84 | 32 |

Linked movement defaults to 50 and persists across preset changes. Higher Settling damps motion faster. Preset values are unchanged from r1. All three other characters retain their settings, spring behavior, masks, wave behavior, framing and Aurelia's directional skin fold.

## Framing, preferences and offline use

Holly is fitted without horizontal cropping or stretching and anchored below the portrait top-safe area. On shorter screens, the bottom of the stockings can extend below the viewport; her complete source face and hat remain in frame. The original portrait itself reaches the top of the hat.

The `peach-physics-v008-*` settings import v7-1 first and retain the earlier migration chain. Each character has a separate saved profile. No earlier-version profile is written. `peach-physics-v008-r4` precaches the page, both external original portraits, manifest and local icon. Obsolete v8 caches are replaced; earlier-release caches remain. Runtime assets are inside v8, with no services or paid dependencies.

## Validation

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
node peach-physics/v8/tests/holly-volume.cjs
```

Tests require Playwright and Chromium (`CHROMIUM` overrides `/usr/bin/chromium`). Hooks and encoded texture-coordinate fields are injected only into test responses. Outputs go to `/tmp/peach-v8-tests` (`PEACH_TEST_OUTPUT` overrides it). The legacy deformation script expects port 8000; other suites also accept `PEACH_TEST_URL`. Historical comparison scripts require the repository's r1/r2/r3 commits locally.

r4 validation used Chromium 156.0.8078.79, Playwright 1.62.1 and SwiftShader at device scale factor 2. Viewports: 375×667, 390×844, 430×932 and 440×956.

- `holly.cjs`: **962 assertions passed**, including exact trajectories and rendered-frame comparisons for all three established characters against v7-1; both Holly regions, tap strength, drag/flick, link 0/50/100, simultaneous touch, presets, saved profiles, framing, Canvas and offline switching.
- `holly-stress.cjs`: **50 assertions passed**. Eighty alternating inputs for each preset/link combination, all sliders at 100, and bounce/softness at 100 with settling at 0 remain bounded and fully settle. Both Canvas sides preserve sampled pixels outside their movement regions exactly.
- `touch-zones.cjs`: **387 assertions passed**. Green-zone mapping, off-target rejection, equivalent center/zone gestures, real two-finger input, saved settings and offline use pass in WebGL and Canvas at all four sizes. Established characters remain identical to r2. Gesture-coordinate equivalence uses a 1e-9 conversion tolerance; legacy trajectories and rendered frames compare exactly.
- `holly-volume.cjs`: **38 assertions passed**. Actual rendered fur and upper-cup travel, rebound and motion beyond 400 ms pass on both sides for Natural, Chaos and all sliders at 100. The test compares with r3, whose sampled fur pixels stayed fixed.
- `holly-amplitude.cjs`: **25 assertions passed**, comparing rendered skin travel against the first v8 revision for both sides across four profiles.
- Original-artwork hashes and JavaScript syntax checks pass.

Holly's 32 extreme WebGL fields have minimum sampled texture-map determinant **0.2029** (positive: no sampled folds), maximum sampled travel **23.90 source pixels**, and outside-support displacement below **0.01 source pixels** (encoding precision). Sampled lower corset, lacing, hair, arms, upper torso, centerline, scenery and inactive side remain pixel-identical. Active fur and skin move. These finite samples do not prove every possible input.

At a 390×844 viewport, sampled neckline travel for a Natural single-side tap reaches approximately 9.8 CSS pixels and rebounds 3.6–4.0 pixels in the other direction. Chaos reaches approximately 11.5 pixels and rebounds 7.7–8.6 pixels. These measurements use linked movement 0 to isolate each side. They measure a visible garment feature, not just internal spring displacement.

Both sides were captured at rest, contact, peak, rebound, secondary motion and complete rest at all four viewport sizes. Settled frames equal resting canvas pixels exactly. The six-phase sheet and extreme WebGL/Canvas frames were visually inspected. `tests/captures/holly-phases.png` records the current phase comparison; `tests/captures/holly-r4-motion.gif` shows r3/r4 Natural motion side by side. Raw metrics accompany the scripts. No uncaught browser or WebGL errors occurred in tested cases.

The original v7-1 suite passed before v8 implementation. Archived r1 suites include browser (218 assertions), Aurelia (606), fold (454), and Midnight's complete deformation/ripple comparison against v6-2-3. The r4 Holly and touch-zone suites recheck the three existing characters against their accepted baselines. `holly-max-comparison.png` is historical r1/r2 evidence; current acceptance uses the r4 phase sheet and visible-volume comparison.

Canvas readback is warmed before image comparisons because Chromium can change GPU/CPU resampling after repeated `getImageData` calls. Its overlay is transparent outside the active movement envelope. Desktop fallback timing is not an iPhone performance measurement.

## Physical-iPhone verification still required

These are desktop Chromium tests at iPhone-sized viewports, not physical iPhone verification. Check Safari touch feel, perceived rebound, single/two-finger input, linked response, frame rate, safe areas, optional sound after a user gesture, and Home Screen offline reopening on the actual device. Check Canvas fallback speed if WebGL is unavailable. This is a controlled visual approximation, not a biomechanical simulation.
