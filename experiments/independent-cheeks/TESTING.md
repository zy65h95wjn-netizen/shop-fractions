# Validation record

## Completed automated checks

Command: `node tests/physics.test.mjs` — **12 tests passed**.

- Original JPEG SHA-256 matches the supplied attachment exactly.
- Left-only and right-only taps, drags, and flicks leave all position and velocity components of the other spring at exactly zero.
- Opposed simultaneous pointer paths retain independent ownership, including crossing the crease and releasing one pointer before the other.
- Pointer cancellation, reset, and a long time gap do not leave a stuck interaction.
- Obsolete linking settings are ignored and cannot re-enable coupling.
- All 8 extreme combinations of Bounce, Softness, and Settling stay finite and within travel bounds under repeated strong swipes; they settle to exact rest within the tested 20-second window.
- 30, 60, and 120 Hz updates produce matching trajectories with the fixed-step integrator.
- Representative background, hair, clothing, thigh, and stocking coordinates have exactly zero displacement. The crease stays fixed. Both deformation fields are exactly zero at sampled points throughout the opposite region, and no GPU mesh triangle shares both supports or has an active corner inside the opposite region.
- Representative response samples follow red > yellow > green, with mean weights 1.0755 / 0.6239 / 0.1467. The lower red wrap participates; all samples retain smooth boundary falloff. These are sampled displacement weights, not percentages of total motion energy.
- All 53,928 connected mesh triangles maintain positive area in 128 extreme configurations, including secondary followers opposed to their primary springs. Minimum area ratio **0.3377**; maximum **1.6686** relative to rest. This establishes no triangle flips in those samples, not absence of perceptible stretching in every possible state.

JavaScript syntax checks passed for the app and renderer. These checks do not compile the GLSL shader or validate a real browser's input event routing.

## Not completed

No `cua_repl.js` / browser-control tool was exposed. The managed Sites workflow explicitly forbids launching an alternative browser-control route in that situation. No browser preview server was started. The hosted preview can be used for the remaining checks.

Visual review, Safari/iOS testing, touch latency, real refresh rate, pixel-level rendering comparisons, and WebGL context recovery are unverified. No physical iPhone was available.

## Physical iPhone acceptance checklist

Open the public preview in Safari. Confirm the status reads “Strictly independent · v6”, then Reset.

1. Tap and flick the screen-right region. Watch the entire left region, including its inner edge, and the center crease: all should stay still. Repeat on screen left.
2. Hold one side, then tap/drag the other with a second finger. Release in both orders. Cross fingers over the center without switching ownership.
3. Swipe rapidly up, down, diagonally, and beyond the image. Confirm saturation is smooth, pointer release is not stuck, and no fold, tear, or new center seam appears.
4. Compare against View original. Inspect the skirt trim, outer contours, lower folds, thighs, stocking tops, hair, and snowy background. Pay particular attention to the deliberately anchored outer silhouette.
5. Test all slider extremes; verify lingering motion eventually settles without drift. The opposite region must remain still throughout. Linking is no longer available.
6. Switch apps mid-drag, rotate the phone, scroll outside the regions, and return. Confirm normal page scrolling, cleared pointers, and an undistorted original at rest.
7. Check iPhone SE / narrow widths, a modern notched iPhone, and landscape. Confirm controls remain reachable, text readable, and finger response acceptable at the device's refresh rate.

Record device model, iOS/Safari version, settings, and which steps pass before treating the natural-looking-motion objective as validated.
