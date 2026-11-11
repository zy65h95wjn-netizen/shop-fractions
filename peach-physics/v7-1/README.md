# Peach Physics v0.0.7.1 — Aurelia's right skin fold

Release: https://zy65h95wjn-netizen.github.io/shop-fractions/peach-physics/v7-1/

Previous release: https://zy65h95wjn-netizen.github.io/shop-fractions/peach-physics/v7/

Frozen original-character reference: https://zy65h95wjn-netizen.github.io/shop-fractions/peach-physics/v6-2-3/

## Feedback and change

The user highlighted Aurelia's lower screen-right skin fold and asked for that area to behave differently. v7 treated the skin above the crease like the central region, with only a boundary feather. This patch gives that band a distinct directional and delayed response.

The change is confined to Aurelia's right visual deformation. In the original 756×1280 image coordinates, the fold follows a curved crease near y=1014, with a smooth transition over the 60-pixel band from 72 to 12 pixels above it. Motion is resolved along and across that curve: sideways sliding retains more freedom, downward motion is restrained as the fold closes, and upward motion has more room to open it. Existing viscoelastic follow-through adds a small delayed settling response. The fixed skin support still excludes the thigh below, centerline, garment and scenery. No support boundary is expanded.

The central right region and the entire left-side renderer remain unchanged. No spring integration, interaction, linked-movement calibration, preset, wave timing, audio, or portrait framing is changed. This is a localized visual approximation of the fold, not a biomechanical simulation. The Canvas fallback softens the same fold band within its existing approximate crop renderer; it does not reproduce the WebGL renderer's full directional response.

All three source portraits are byte-identical to v7, including the supplied Aurelia JPEG. All existing versions, including v7 and v6-2-3, remain unchanged.

## Preferences and offline cache

The new `peach-physics-v0071-*` keys import v7's active character and individual profiles first, then preserve the existing older migration chain. v7 profiles are never written. The independent `peach-physics-v0071-r1` cache includes Aurelia's original image and does not remove earlier caches. Offline reload and all-character switching pass.

## Validation

Chromium 156 with Playwright 1.62.1 and SwiftShader, device scale factor 2. Viewports: 375×667, 390×844, 430×932, 440×956. These are desktop browser tests, not physical-iPhone validation.

- `tests/browser.cjs`: **218 assertions passed**. Existing characters' simulation, rendering, gestures, boundaries, presets, persistence and settling remain valid against v6-2-3.
- `tests/aurelia.cjs`: **604 assertions passed**. All-character loading, genuine CDP multi-touch, settings, WebGL, Canvas fallback and offline switching pass. Extreme poses preserve sampled garment, centerline, thigh, scenery and opposite-side pixels. Sampled full texture fields remain unfolded.
- `tests/fold.cjs`: **454 assertions passed**. All three characters' complete simulated trajectories are identical to v7 for both sides, slap/kick/drag/flick and linking 0/50/100. Aurelia's left-only rendered response is pixel-identical at all four sizes. Her right upper-center texture displacement also matches v7. v7's third-character selection and full profile import without modifying the old profile.
- `tests/deformation.cjs`: Midnight's measured texture fields and traveling ripple remain identical to the frozen v6-2-3 reference.
- `tests/artwork.cjs`: all three original hashes match. Application and service-worker JavaScript pass syntax checks. No uncaught page or WebGL errors in the tested cases.

At the fold sample (520,982), with controlled 10-source-pixel spring displacement and no secondary response, the 440×956 final rendered texture-coordinate measurements are:

| Motion | v7 | v7-1 |
| --- | ---: | ---: |
| Downward | 9.54 px | 4.28 px |
| Upward (magnitude) | 9.54 px | 6.39 px |
| Sideways (magnitude) | 9.54 px | 8.14 px |

The upper-center sample is unchanged. With only a 6-pixel delayed follower displacement, the fold sample changes from 2.10 to 3.85 pixels, demonstrating a distinct settling response instead of simply damping the entire region. The strong-motion traveling wave still contributes 0.85 pixels at the tested fold wavefront.

Eleven controlled fields at each viewport cover opening, compression, sliding, delayed response, waves, and four extreme directions with signed follow-through. The minimum sampled texture-map determinant in the focused fold checks is **0.2567**, with no sampled folds. Thigh, inner thigh, seam, garment and opposite-side sample displacement stays below 0.01 source pixels (encoding precision). These finite tests do not guarantee every possible gesture.

Matched v7/v7-1 frames were captured at impact, 117, 250 and 500 ms at every size. The 375-pixel close-up comparison and a 390-pixel extreme pose were visually inspected. `tests/captures/fold-comparison.png` contains the close-up comparison; full-resolution screenshots are generated in `/tmp/peach-v7-1-tests`. Raw metrics are alongside the test scripts.

Run against a repository-root HTTP server on port 8000:

```sh
node peach-physics/v7-1/tests/browser.cjs
node peach-physics/v7-1/tests/deformation.cjs
node peach-physics/v7-1/tests/aurelia.cjs
node peach-physics/v7-1/tests/fold.cjs
node peach-physics/v7-1/tests/artwork.cjs
```

`CHROMIUM` overrides `/usr/bin/chromium`. All test controls and texture-coordinate encoding are injected only into local test responses.

## Remaining verification

Compare the highlighted fold with v7 on the user's real iPhone: whether compression, opening and delayed settling look natural during taps and strong drags, and whether Safari remains smooth. Physical-device touch feel, sound and Home Screen behavior remain device checks.
