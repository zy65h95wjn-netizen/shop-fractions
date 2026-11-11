# Peach Physics v0.0.6.2.4 — clothing-line transitions

New: https://zy65h95wjn-netizen.github.io/shop-fractions/peach-physics/v6-2-4/

Comparison / rollback: https://zy65h95wjn-netizen.github.io/shop-fractions/peach-physics/v6-2-3/

## Requested refinement

The user approved Midnight's left cheek in v6-2-3 and requested motion continuing into the clothing line. The right clothing-to-cheek transition should be firmer, while still moving less than the cheek. This authorizes a localized change to that right transition; the accepted main cheek response is preserved.

## Changes

- Move only the five upper left contour vertices into the lower fur trim, by 17–26 source pixels. Keep the existing feather, central spring weighting, ripple, visual limit, outer/lower contour and thigh exclusions. Expand the cached mask crop upward to include the trim without clipping it. The original full-resolution artwork is unchanged.
- Apply a local gain along Midnight's curved right fur-to-skin line. The trim retains 62% of its previous displacement, blending smoothly back to 100% by 48 source pixels below the fitted line. The existing mesh interpolates this transition. This affects only the rendered upper transition, including its contact and wave components; spring points, geometry elsewhere, force, damping and simulation trajectories are unchanged.
- Update the approximate Canvas fallback masks to include the same left extension and right firmness. It remains a reduced-graphics approximation.

Winter Ember, all original image bytes, photographic lighting, framing, head/hat visibility, presets, gestures, audio, linked-movement calibration and spring simulation are preserved. No depth treatment is added.

## Verification

Tests use Chromium 156 and SwiftShader WebGL. They are browser tests, not physical iPhone verification. The left extension was checked independently before introducing the right transition.

`tests/browser.cjs`: **250 assertions passed**. Coverage includes 375×667, 390×844, 430×932 and 440×956 viewports at device scale factor 2:

- Both characters load and switch, with pixel-identical resting images and unchanged framing.
- Exact old/new simulation trajectories for both characters, both sides, slap/kick/drag/flick and linked movement 0/50/100, including secondary followers and traveling waves.
- Winter Ember's whole rendered response is identical for controlled left and right slaps. Midnight's approved central left and right cheek patches are pixel-identical during their respective controlled slaps.
- Four extreme left poses per viewport move the lower trim and cheek, while sampled upper/lateral scenery, upper garment, stockings, right side, lower thigh and inner thigh stay unchanged.
- Two simultaneous CDP touches, releasing one while retaining the other, tap/slap, three presets, per-character settings, audio preference persistence, old-profile protection, monotonic linking, settling and 30 Chaos slaps.
- Canvas fallback loading and switching, and no uncaught JavaScript or WebGL errors in the tested scenarios.

`tests/deformation.cjs` measures actual final shader texture displacement at 440×956. For a controlled 10-source-pixel downward displacement of the three springs on the tested side:

| Sample | v6-2-3 | v6-2-4 |
| --- | ---: | ---: |
| Left clothing line (320,997) | 0.38 px | 8.51 px |
| Left lower trim (320,984) | less than 0.01 px | 5.00 px |
| Left inner clothing line (402,1030) | less than 0.01 px | 5.28 px |
| Left center (300,1145) | 12.10 px | 12.10 px |
| Left lower crease (310,1290) | 8.38 px | 8.38 px |
| Right clothing line (605,993) | 6.65 px | 4.55 px |
| Right lower trim (605,977) | 3.82 px | 2.37 px |
| Right inner clothing line (525,1018) | 5.22 px | 3.43 px |
| Right outer clothing line (675,1012) | 5.27 px | 3.47 px |
| Right skin transition (605,1020) | 9.83 px | 8.95 px |
| Right center (605,1140) | 11.92 px | 11.92 px |

The targeted test also checks unchanged approved cheek samples across seven poses per side, including four maximum-displacement stress directions. All 14 fields have positive sampled texture-map orientation: no sampled folds. These checks cover the stated poses and sample locations, not every possible gesture.

WebGL context loss/restoration recreated the mask and resumed motion with no GL error. Both embedded WebP images are byte-identical to v6-2-3, and application/service-worker JavaScript passed syntax checks.

An isolated 90-frame active-animation sample measured 33.4 ms median for both versions, with p95 66.7 ms in v6-2-3 and 83.4 ms in v6-2-4. Reversing the comparison order measured 33.4 ms median / 83.3 ms p95 for v6-2-4 and 49.9 ms median / 83.4 ms p95 for v6-2-3. There is no consistent version slowdown across these software-rendered samples. They do not establish Safari smoothness or hardware frame rate; actual iPhone performance remains unverified.

Matched slap frames were captured at 50, 117 and 250 ms for both sides; old/new clothing-line crops at 117 ms were visually reviewed. Screenshots are generated outside the application payload in `/tmp/peach-v6-2-4-tests`.

Serve the repository root on port 8000 with Playwright and Chromium installed, then run:

```
node peach-physics/v6-2-4/tests/browser.cjs
node peach-physics/v6-2-4/tests/deformation.cjs
```

`CHROMIUM` can override `/usr/bin/chromium`. Test instrumentation is injected into local responses, never added to the production application. Raw results are included beside the scripts.

## Isolation and real-device validation

Only `peach-physics/v6-2-4/` is added. Previous URLs and files remain untouched. Preferences and the `peach-physics-v00624-r1` cache are independent. A new profile imports from v6-2-3, then earlier releases if needed, without writing their settings.

The remaining test is the user's iPhone comparison of the two clothing transitions, subjective firmness and Safari smoothness. Home Screen behavior and audible sound quality remain real-device checks. Stop after publication and await feedback.
