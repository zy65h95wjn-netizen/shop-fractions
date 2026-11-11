# Peach Physics v0.0.7 — Aurelia Frost

Release: https://zy65h95wjn-netizen.github.io/shop-fractions/peach-physics/v7/

Frozen comparison: https://zy65h95wjn-netizen.github.io/shop-fractions/peach-physics/v6-2-3/

## Character expansion

Built directly from v6-2-3, not v6-2-4. The discreet switch cycles Winter Ember → Midnight Yule → Aurelia Frost and briefly shows the selected name. The character registry supplies the count, next character, preload list, dimensions, and saved active-character lookup.

The attached 756×1280 JPEG is retained byte-for-byte as `assets/aurelia-frost.jpg` (approximately 250 KiB). No generation, resizing, recompression, retouching, or anatomy/clothing edits were used. Both embedded original WebP portraits are also byte-identical to v6-2-3; `tests/artwork-sha256.json` records all three hashes.

Aurelia uses native source coordinates, six independent spring locations, and two separately measured convex skin contours. The supports stop inside the fur/garment boundary, outer contours, center separation, and lower creases. A 25-source-pixel inward feather anchors the surrounding scene and thighs. Her fragment-shader path integrates the spatially varying spring field through these masks in six increments. A 35% broad carrier and 65% Gaussian response retain interior variation; the traveling wave is added after the main displacement limit (18 pixels before smooth compression toward 24). This applies only to Aurelia.

Aurelia's linked movement uses an independent scale of 0.45 and impulse gain of 6.5. The existing bounded spring integrator, gestures, presets, waves and optional sound remain in use. Winter and Midnight retain their previous calibration and rendering paths, including Midnight's accepted left mask and ripple behavior. No existing version files are changed.

Native aspect ratio and the existing top-safe portrait anchor preserve the complete head and hat, with the existing blurred photo background treatment. Canvas fallback supports all three characters; Aurelia's fallback uses the same fixed skin supports. Like the baseline fallback, its crop-based deformation approximates the WebGL renderer and does not reproduce its full spatial field.

## Preferences and offline use

Each character has separate bounce, softness, settling, linked movement, preset and sound preferences under `peach-physics-v007-profile-*`. Active selection uses `peach-physics-v007-active`. When no v7 value exists, import checks v6-2-3 first, then preserves the v6-2-2 / v6-2-1 / v6-2 / v6 and older Ember migration chain. Older profiles are never written. v6-2-4 is not the baseline for this release.

The isolated `peach-physics-v007-r1` service-worker cache includes the original Aurelia JPEG. No old-version caches are removed. Offline reload and switching through all three characters passed Chromium testing.

## Validation

Desktop Chromium 156.0.8078.79, Playwright 1.62.1, SwiftShader WebGL, device scale factor 2. These are browser simulations, **not physical-iPhone validation**.

- The unchanged baseline suite passed **216 assertions**, and its deformation test passed before implementation.
- `tests/browser.cjs`: **218 assertions passed** against v6-2-3. Complete spring/follower/impact/wave trajectories match for both existing characters, both sides, slap/kick/drag/flick, and linking 0/50/100. Both sides' rendered slap response matches. Existing boundary, multi-touch, preset, persistence, migration, stress and settling tests pass.
- `tests/aurelia.cjs`: **604 assertions passed** at 375×667, 390×844, 430×932 and 440×956. All three characters load and initialize WebGL, accept CDP two-touch gestures and taps, and switch in Canvas fallback at every size. Full per-character settings, active selection, presets, toasts, position-dependent response, directional gestures, secondary oscillation and settling pass. Aurelia's cross-side response is zero at linking 0 and increases at 50 and 100 for every tested gesture and side.
- Existing characters' resting images and slap/flick frames at 50, 117 and 250 ms are pixel-identical to v6-2-3 at all four sizes, including linked movement at 50.
- Four extreme directions for each Aurelia side at every size leave sampled garment, center seam, opposite side, lower thighs, stockings, face and scenery patches **pixel-identical to rest**. Active interior patches move.
- Final shader texture-coordinate checks cover both Aurelia supports, a moderate pose and four maximum-displacement poses per side. All ten sampled fields have positive orientation: minimum determinant **0.2254**, with no sampled folds. Outside-support displacement is below **0.002 source pixels** (encoding precision), and paired interior samples differ. These are bounded sampled checks, not a proof for every possible gesture.
- `tests/deformation.cjs`: Midnight's full measured fields, including extreme poses, are identical to v6-2-3. Its measured strong-motion traveling ripple remains **2.3248 source pixels**.
- `tests/artwork.cjs`: all original portrait hashes match. Application and service-worker JavaScript syntax checks pass. Tested pages have no uncaught errors or WebGL errors.

Actual rendered rest, impact, 117 ms movement and 500 ms settling screenshots were captured for both Aurelia sides at every size, plus all eight extreme poses. The 375-pixel phase comparison and 390-pixel extreme comparison were visually inspected. Selected contact sheets are in `tests/captures/`; all full-resolution frames are generated under `/tmp/peach-v7-tests` when running the suite. Raw metrics are alongside the scripts. Screenshot comparisons assess boundary stability and framing, not a subjective guarantee of realism.

To reproduce, serve the repository root on port 8000, with Playwright and Chromium available:

```sh
node peach-physics/v7/tests/browser.cjs
node peach-physics/v7/tests/deformation.cjs
node peach-physics/v7/tests/aurelia.cjs
node peach-physics/v7/tests/artwork.cjs
```

`CHROMIUM` overrides `/usr/bin/chromium`. Test-only controls and texture-coordinate encoding are injected into local browser responses, never shipped in application code.

## Remaining real-iPhone verification

Compare v7 with v6-2-3 in actual iPhone Safari: Aurelia's motion quality and lower/inner boundary appearance during strong gestures, touch feel, Safari frame pacing, safe-area framing, audible sound, and Home Screen/offline behavior. Desktop checks do not establish hardware performance or physical-iPhone approval.
