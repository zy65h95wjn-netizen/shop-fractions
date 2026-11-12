# Layered proof validation

## Completed

`node tests/layers.test.mjs`: **12 passed**.

- JPEG checksum matches the supplied unmarked portrait exactly.
- The previously anchored right inner edge has substantial displacement.
- Taps, drags, releases, and crossed two-finger paths preserve independent spring state and opposite-layer geometry.
- Grabbing a moving foreground edge selects its visible layer instead of the original region behind it.
- Sideways separation remains within its conservative asymmetric bounds.
- All eight slider extremes remain bounded and settle to exact rest.
- Mattes exclude representative clothing, hair, stocking, and background locations.
- The inner response exceeds the outer response.
- The actual byte-quantized, bilinearly sampled shader fields preserve positive local area in the sampled extremes: minimum Jacobian **0.499639**. Maximum inverse-map sampling error was **0.022392 source pixels** after sixteen iterations.
- Idle layer mappings leave source coordinates exactly unchanged.

`node tests/export-fields.mjs && python3 tests/offscreen.py`: **passed**.

This runs the actual application's GLSL in a Mesa EGL context without starting a browser. The idle frame and inward/outward/opposed endpoint frames were rendered. The idle frame, inward endpoint, and constrained outward endpoint were visually inspected.

At the source resolution, decoded idle rendering matches the decoded original photograph exactly: maximum channel difference **0**. During the tested right-only inward/outward poses, the left-core rectangle, upper background, and stockings have maximum channel difference **0**. See `graphics-results.json` for bounded sample regions and values.

These pixel checks concern the recorded rectangles, not a claim that all left pixels remain visible. The right foreground layer can occlude the left layer while leaving its underlying geometry unchanged.

JavaScript syntax checks passed for the app, physics, layer definitions, and renderer.

## Still required

Browser-control tools are unavailable in this managed environment. No browser or preview server was started. EGL rendering verifies shader compilation and static compositing, not browser integration, HTML layout, iOS WebGL behavior, interactive latency, or frame rate.

Open the layered preview on an actual iPhone and check:

1. Right-only and left-only taps and flicks. Confirm the other side's texture remains stationary as overlap changes.
2. Strong inward, outward, upward, and downward drags. Look for backing texture bands, double crease lines, and matte edges.
3. Two-finger interaction, crossing paths, releasing in either order, and grabbing a rebounding edge.
4. Stop motion, Original view, Reset, orientation changes, app switching, and scrolling outside the touch zones.
5. Compare the moving inner edge with revision 6 using the page's comparison link.

Judge the backing and overlap visually before treating this as a polished result for sharing.

Revision 2: contact-edge regression verifies sliding with no separating normal displacement on each independent layer. EGL frames and unchanged-region pixel checks pass after the correction. The outward endpoint was inspected at 3× magnification; the central doubled edge is reduced. Physical iPhone review and lower-fold edge refinement remain open.
