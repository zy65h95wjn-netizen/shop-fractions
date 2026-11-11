# Peach Physics v0.0.6.2.2 — motion region guided by iPhone annotation

New: https://zy65h95wjn-netizen.github.io/shop-fractions/peach-physics/v6-2-2/

Comparison / rollback: https://zy65h95wjn-netizen.github.io/shop-fractions/peach-physics/v6-2-1/

## What the annotation clarified

The user marked the moving center in red and the intended whole cheek region in green. The outer rim and lower crease were missing from the previous moving region. v6-2-1 redistributed motion within its existing contour but kept those areas nearly stationary; its amplitude-dependent feather made the active area smaller during stronger motion. That did not address the annotated target.

## Change

Only Midnight's left deformation presentation is recalibrated. The fixed support boundary now lies outside the intended green moving region. The lower crease is part of the moving area, with the transition carried through the adjoining upper thigh before the stockings. The outer silhouette and clothing remain protected. The hand-drawn annotation guides the region; it is not claimed to be an exact pixel registration of the screenshot.

The shader retains normalized blending of the three existing left springs. It applies their motion through a fixed envelope in four small steps at the pixel level, preventing the coarse mesh from leaking movement into clothing or folding near the newly active rim. The active region no longer shrinks with stronger input. A 320×416 single-channel cached mask covers only the support crop, avoiding repeated polygon arithmetic per pixel. It does not resample or blur the artwork.

Ordinary visual excursions up to 18 source pixels are uncompressed. Larger left excursions approach a 22-pixel limit smoothly to control strain at the expanded boundary. This is a visual limit: spring positions, input gains, velocities, damping, coupling and timing are unchanged. The broader moving area, not a global reduction in spring amplitudes, is the main correction. Canvas fallback's left crop and mask are expanded too; its existing reduced-graphics rendering remains an approximation.

Midnight's accepted right-side shader response, Winter Ember, linked-movement calibration, image bytes, photographic lighting, and portrait framing are preserved. No depth effect or new artwork is introduced.

## Verification

Testing used Chromium 156 and SwiftShader WebGL, not a physical iPhone.

`tests/browser.cjs`: **184 assertions passed** at 375×667, 390×844, 430×932 and 440×956, device scale factor 2.

- Both characters load/switch. Resting images match v6-2-1 exactly.
- Both sides' simulation trajectories match v6-2-1 for slap, kick, drag and flick at linked movement 0/50/100, including secondary followers and waves.
- Right-only rendered motion at 50 ms and linking zero is pixel-identical to the accepted baseline for both characters.
- Four extreme left poses at each size leave sampled scenery, clothing, stockings and right-side patches unchanged. The newly checked lower-crease patch moves in every pose.
- Two genuine CDP touch inputs remain independent; releasing one preserves the other. Tap/slap, presets, settings/audio preference persistence, old-profile protection, switching, settling, secondary motion and a 30-slap Chaos stress test pass.
- WebGL context loss/restoration recreates the mask texture and resumes motion without GL errors.
- Canvas fallback loads and switches without uncaught errors. It is not equivalent to the WebGL flow renderer.

`tests/deformation.cjs` measures the actual final shader texture coordinates, including fragment-stage masking, at 440×956. For a controlled 10-pixel downward displacement of all three springs:

| Source-image sample | v6-2-1 motion | v6-2-2 motion |
| --- | ---: | ---: |
| Center (300,1145) | 11.50 px | 11.50 px |
| Outer rim (183,1200) | 1.48 px | about 11.10 px |
| Inner rim (435,1205) | 0.77 px | about 11.35 px |
| Lower crease (310,1290) | 0.02 px | 11.50 px |
| Upper rim (315,1020) | 2.07 px | about 10.65 px |

The four maximum-displacement stress directions also pass the positive texture-map orientation check: no sampled folds. This is measured evidence for those poses and sample locations, not a mathematical guarantee for all gestures.

Matched slap frames at 50, 117 and 250 ms were captured and visually compared, including the lower crease. Artifacts are generated in `/tmp/peach-v6-2-2-tests` rather than added to the application payload. An isolated 90-frame active-animation sample measured approximately 33.3 ms median / 66.7 ms p95 in v6-2-1, and 33.4 ms median / 83.4 ms p95 in v6-2-2. Median cost was similar, with a worse slow-frame tail in software rendering; actual Safari/iPhone performance remains unverified.

Serve the repository root on port 8000 with Playwright and Chromium available, then run:

```
node peach-physics/v6-2-2/tests/browser.cjs
node peach-physics/v6-2-2/tests/deformation.cjs
```

`CHROMIUM` can override `/usr/bin/chromium`. Test-only instrumentation is injected into local responses and is not shipped in the application. Raw results are included beside the scripts.

## Release isolation

Only `peach-physics/v6-2-2/` is added. v6-2-1 and all earlier URLs remain unchanged. New preferences and the `peach-physics-v00622-r1` cache are independent. Preferences import from v6-2-1, then v6-2, then v6 if no new profile exists; old profiles are never written. The linked slider keeps its v6-2 calibration.

The next step is an actual iPhone comparison of the annotated region, smoothness and subjective appearance. Home Screen/offline behavior and audio playback quality still need real-device validation. Stop after publication and await feedback.
