# Peach Physics v0.0.6.2

Standalone release based on v6-1. All older releases remain unchanged.

- New: https://zy65h95wjn-netizen.github.io/shop-fractions/peach-physics/v6-2/
- Comparison / rollback: https://zy65h95wjn-netizen.github.io/shop-fractions/peach-physics/v6-1/

## Investigation and changes

### A. Artwork and depth

Winter Ember's source has closer foreground composition, pronounced warm rim light around the hair/body, stronger light-to-shadow modeling, and a softer, less detailed background. Midnight Yule's source shows more of the environment, with brighter, more legible architecture, and dark hair that blends into portions of the scene. These photographic differences explain most of the perceived depth difference.

### B. Rendering and compositing

Both use the same single opaque photo texture, linear filtering, mesh renderer, blurred photo-derived margin fill, and top/bottom canvas feather. There is no foreground segmentation, depth map, dynamic lighting, or separate subject layer. Midnight's existing 1.12 portrait zoom and top-safe anchor are the relevant framing difference; they are preserved. The v5 reference uses the same basic photo/mesh approach for Ember.

No cosmetic depth effect is shipped. A convincing background-only treatment would need reliable subject boundaries through fine hair, fur, ears, and hat. A coarse mask, broad vignette, or parallax layer would risk changing lighting or introducing artificial separation. This release does **not** claim improved static photographic depth. Both embedded source images remain byte-identical, with no resampling, cropping changes, or altered proportions. This is an intentional unresolved objective under the realism-first requirement.

### C. Spring simulation and linked movement

Midnight's old transfer came from three paths: a 7.5× character impulse multiplier in linkedImpulse (used by press, slap, kick and flick), a cross-center spring, and drag velocity transfer. All three now use one half-scale slider mapping. New 100 is mathematically old 50; new 50 is old 25; zero disables every intentional cross-side path. Existing timing, asymmetry, secondary followers, spring parameters, amplitude limits, and waves remain intact.

Ember's transfer mapping and physics are unchanged. Midnight's direct right-side input, node positions, radii, damping, and deformation mask are unchanged. Its response to energy arriving from the other side changes only as required by the new linked slider calibration.

### D. Deformation boundaries

The old left ellipse extends as far as x=93 in original image coordinates near the middle, while the visible skin contour is nearer x=155–180 there. The horizontal seam gate also begins admitting displacement at y≈927, above parts of the curved fur/shorts boundary. Broad node falloff, secondary displacement, contact compression and waves all use that same leaking envelope. The neighboring right envelope is not the cause of the outer-left scenery distortion.

An inset 16-point convex contour now multiplies only Midnight's left envelope, with a 48-source-pixel smooth feather. It follows the curved clothing edge, outer silhouette and lower crease, and gates **all** displacement contributions together. The original mesh density, left spring points, left amplitudes, damping and internal spring coupling are retained. Interior displacement stays expressive; skin boundaries and neighboring scenery stay anchored. Canvas fallback receives the same contour and rebuilds it on switching characters.

## Preferences and rollback

v6-2 writes its own `peach-physics-v0062-*` preferences and service-worker cache. It reads existing v6 profiles when no v6-2 profile exists, retaining numeric slider values, presets and sound preference. Thus an imported Midnight 50 intentionally feels weaker. No writes go to old preference keys. Existing v6/v6-1 URLs, files, artwork and caches are preserved. Use the comparison URL for immediate rollback.

## Verification

The reproducible Playwright suite is in `tests/browser.cjs`. Serve the repository root with `python -m http.server 8000`, then run `node peach-physics/v6-2/tests/browser.cjs` with Playwright available and Chromium at `/usr/bin/chromium` (or set `CHROMIUM`). Artifacts default to `/tmp/peach-v6-2-tests`; `PEACH_TEST_URL` and `PEACH_TEST_OUTPUT` can override server/artifact locations.

Tests use Chromium 156 with SwiftShader **WebGL**, not just Canvas fallback. Deterministic test hooks are injected into local HTTP responses; they are not added to the shipped application. Separate live interaction checks use the unmodified page.

- 109 assertions passed at 375×667, 390×844 and 430×932 with device pixel ratio 2.
- Both characters load and switch; resting canvas pixels are identical to baseline.
- Ember trajectories match baseline for slap, kick, drag and flick at 0/50/100. Midnight trajectories match baseline at half the slider value across the same gestures, including all nodes, followers, contact and wave state.
- Right-only rendered motion at 50 ms and transfer zero is pixel-identical to baseline.
- Four maximum-displacement directions at all three sizes: sampled outer-left background, clothing and right-side patches have zero changed pixels in the new version; the same background/clothing patches visibly move in the baseline. Inner skin samples retain substantial movement. This is sampled boundary evidence, not a proof for every possible touch position.
- Captured and visually reviewed before/after motion screenshots. Approved zoom, full head/hat and source lighting remain intact.
- Real Chromium CDP two-touch input: both pointers active, first release retains second pointer, remaining pointer can continue dragging, both release cleanly. This is browser touch emulation, not an iPhone.
- Tap/slap, three presets, sound preference, per-character settings, reload persistence, old-profile protection, delayed secondary response and settling checked.
- Slider drag-transfer peaks rise monotonically at 0/25/50/75/100: approximately 0 / 0.59 / 1.17 / 1.74 / 2.30 source pixels in the opposite center node in the controlled gesture.
- Thirty live Chaos slaps at transfer 100 stay within existing displacement limits. No uncaught JavaScript errors or WebGL errors. Canvas fallback starts and switches correctly.
- Active-animation sampling over 90 frames at 390×844: both versions had approximately 33.3 ms median and 66.7 ms p95 frame intervals in SwiftShader. No measured regression; this software environment does not demonstrate 60 fps mobile performance.
- Original artwork strings verified identical; git diff confirms no changes outside the new release directory.

Actual Safari/iPhone GPU behavior, sustained mobile frame rate, audio playback quality, Home Screen installation, offline startup and subjective feel still require device validation. Software WebGL does not establish physical iPhone performance. Stop here after publishing and await iPhone feedback.
