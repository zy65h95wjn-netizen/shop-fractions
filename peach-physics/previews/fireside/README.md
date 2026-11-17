# Fireside public preview

A separate, user-authorized phone preview of the tested Fireside prototype.

Open: https://zy65h95wjn-netizen.github.io/shop-fractions/peach-physics/previews/fireside/

The original supplied portrait and Blender spring-rig response are embedded. The published prototype differs from the validated offline file only in its header label (preview rather than private playground). Tap, hold, drag, flick, Auto, and the Blender/live-springs comparison are available. Preferences are session-only. No production profiles or service worker are used.

The actual Peaches application remains at /peach-physics/v8/ and is unchanged by this preview. This is a 2D prototype using a Blender-baked spring response, not a reconstructed 3D character or cloth simulation.

Validation before publication: WebGL and Canvas stability, settling, two-pointer interactions, 16 protected-region poses and 144 fixed pixel probes, original JPEG byte identity, and operation with no external requests. Physical iPhone Safari feel/performance still requires review.

## Preview 2 — screen-left inner boundary

Added a curved, gradual support boundary inside the screen-left deformation mask. This anchors the upper center-crease shadow that previously pulled into a sharp notch. Both renderers use the same mask; the artwork, spring trajectories, motion strength, right-side mask, and controls are unchanged.

Validation: all 12 stability cases, 16 protected-region poses, and both-renderer multitouch checks pass. Eight targeted before/after poses reproduce movement in the old inner-shadow band and show zero changed probe pixels in the corrected band, while retaining motion at the center of the left region. No browser errors. Chromium checks do not establish physical iPhone Safari behavior.

## Preview 3 — drag-release polish

After a drag, each side briefly uses slightly lighter damping for the first rebound, then stronger damping for the trailing oscillations. This release adjustment lasts 1.2 seconds and clears on a fresh grab, kick, or reset. The existing flick velocity and displacement limits remain in place. The approved preview-2 artwork, deformation masks, diagonal hold behavior, Blender bake, and default tap/Auto responses are preserved.

Validation: `node peach-physics/previews/fireside/tests/release.cjs` passed 24 before/after release comparisons, 36 unchanged tap/Auto/cancel comparisons, and 12 bounded flick/settling cases. Each release comparison checks unchanged held motion and independent sides, a slightly fuller first rebound, and smaller trailing oscillations. Existing checks also passed 12 stability cases, 16 protected poses, both-renderer multitouch, eight inner-crease regression cases, and original artwork identity with no external requests or browser errors. These are Chromium results; iPhone feel remains subject to user review.
