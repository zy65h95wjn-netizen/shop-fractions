# Peach Physics v0.0.6.2.1 — Midnight left-side follow-up

New release: https://zy65h95wjn-netizen.github.io/shop-fractions/peach-physics/v6-2-1/

Previous release / comparison: https://zy65h95wjn-netizen.github.io/shop-fractions/peach-physics/v6-2/

## Problem and correction

Actual iPhone feedback on v6-2 described Midnight's left side as a small moving patch stretching against stationary surrounding skin, while the right-side motion was accepted.

The v6-2 shader multiplied its new anatomical contour by the old elliptical envelope. Gaussian spring weights were also summed without normalization, concentrating displacement in the center. The resulting field could protect scenery while still looking like a disconnected patch. The previous tests checked containment and spring trajectories, but did not measure how evenly motion was distributed through the skin.

This release changes only Midnight's left WebGL deformation field:

- Use the existing anatomical contour as the single boundary mask, removing the extra ellipse/seam/center narrowing inside it. The contour itself remains unchanged and already excludes those protected boundaries.
- Normalize the existing three spring weights to blend their displacement across the interior. Their different phases and delayed secondary motion remain intact. A shared 10-pixel spring displacement now produces about 10.8–11.5 pixels of motion at five interior samples; v6-2 produced about 3.8–12.4 pixels at those same points.
- Widen the transition into the stationary boundary when the local displacement is large. This limits texture strain at extreme motion. It leaves spring amplitudes, forces, damping, node positions and transfer unchanged.

The source artwork, photographic lighting, framing, Midnight's right-side shader path, Winter Ember, and the v6-2 linked-movement calibration are unchanged. No depth treatment was added. Canvas fallback remains the v6-2 implementation; this visual correction targets the WebGL renderer used in these tests.

This is a candidate correction for iPhone validation, not a claim that the subjective issue is definitively resolved. Clothing and scenery remain anchored, so the outer silhouette is deliberately not translated as a separate cutout.

## Verification

Tests ran in Chromium 156 with SwiftShader WebGL. They do not establish Safari/iPhone visual quality or sustained mobile frame rate.

`tests/browser.cjs`: 152 assertions passed at 375×667, 390×844, 430×932 and 440×956, device scale factor 2.

- Both characters load and switch; resting canvases are pixel-identical to v6-2.
- Both sides of both characters have identical simulation trajectories to v6-2 for slap, kick, drag and flick at transfer 0/50/100, including follower/contact/wave state.
- Right-only rendered response at 50 ms with linking disabled is pixel-identical to v6-2 for both characters.
- Four bounded extreme left displacements at each size leave sampled background, clothing and right-side patches unchanged, while the inner skin still moves.
- Two simultaneous CDP touches, continued movement after lifting one finger, tap/slap, three presets, per-character settings, reload persistence, sound preference and v6-2 preference protection passed.
- Thirty live Chaos slaps at transfer 100 remain bounded; secondary motion and settling pass. No uncaught errors or WebGL errors. Canvas fallback still loads and switches.

`tests/deformation.cjs`: the actual interpolated WebGL UV displacement is encoded into a diagnostic framebuffer; this is not a separate JavaScript implementation of the deformation. At 440×956 it checks coherent interior translation, broader participation, and positive local texture-map orientation for four maximum-displacement directions with simultaneous follower/contact/wave contributions. The candidate's minimum sampled determinant was approximately 0.31–0.38 under those extreme poses; v6-2 reached approximately -0.17 in one direction, indicating a local texture fold. These are sampled stress cases, not a mathematical proof for every possible gesture.

A 90-frame active-animation sample at 390×844 had the same approximately 33.3 ms median and 66.7 ms p95 frame intervals in both versions. That is a software-rendering comparison, not a mobile 60 fps result.

Matched natural-slap screenshots at 50, 117 and 250 ms and maximum-displacement screenshots were captured and reviewed locally. Automated artifacts default to `/tmp/peach-v6-2-1-tests`. The screenshots were not added to the application payload.

To reproduce, serve the repository root on port 8000, install/use Playwright with Chromium, and run:

```
node peach-physics/v6-2-1/tests/browser.cjs
node peach-physics/v6-2-1/tests/deformation.cjs
```

Set `CHROMIUM` to override `/usr/bin/chromium`. Raw results are checked in beside the tests. Browser test hooks are injected only into intercepted test responses, never into the published HTML.

## Isolation and remaining device checks

Only `peach-physics/v6-2-1/` is added. Earlier releases remain intact. New preference keys and the `peach-physics-v00621-r1` service-worker cache are separate. Existing v6-2 preferences are read when no new profile exists, with older v6 preferences as a fallback; no older profiles are written. The approved slider calibration is preserved.

Still needed: actual iPhone comparison of the left-side feel, Safari GPU rendering/performance, optional audio playback quality, and Home Screen/offline behavior. Stop after publication and wait for device feedback.
