# Fireside public preview

A separate, user-authorized phone preview of the tested Fireside prototype.

[Open Fireside preview 5](https://zy65h95wjn-netizen.github.io/shop-fractions/peach-physics/previews/fireside/?v=5)

The original supplied portrait and Blender spring-rig response are embedded in a single HTML file. Tap, hold, drag, flick, Auto, and the Blender/live-springs comparison are available. Preferences are session-only. No production profiles or service worker are used.

The actual Peaches application remains at /peach-physics/v8/ and is unchanged by this preview. This is a 2D prototype using a Blender-baked spring response, not a reconstructed 3D character or cloth simulation.

Validation before publication: WebGL and Canvas stability, settling, two-pointer interactions, 16 protected-region poses and 144 fixed pixel probes, original JPEG byte identity, and operation with no external requests. Physical iPhone Safari feel/performance still requires review.

## Preview 2 — screen-left inner boundary

Added a curved, gradual support boundary inside the screen-left deformation mask. This anchors the upper center-crease shadow that previously pulled into a sharp notch. Both renderers use the same mask; the artwork, spring trajectories, motion strength, right-side mask, and controls are unchanged.

Validation: all 12 stability cases, 16 protected-region poses, and both-renderer multitouch checks pass. Eight targeted before/after poses reproduce movement in the old inner-shadow band and show zero changed probe pixels in the corrected band, while retaining motion at the center of the left region. No browser errors. Chromium checks do not establish physical iPhone Safari behavior.

## Preview 3 — drag-release polish

After a drag, each side briefly uses slightly lighter damping for the first rebound, then stronger damping for the trailing oscillations. This release adjustment lasts 1.2 seconds and clears on a fresh grab, kick, or reset. The existing flick velocity and displacement limits remain in place. The approved preview-2 artwork, deformation masks, diagonal hold behavior, Blender bake, and default tap/Auto responses are preserved.

Validation: `node peach-physics/previews/fireside/tests/release.cjs` passed 24 before/after release comparisons, 36 unchanged tap/Auto/cancel comparisons, and 12 bounded flick/settling cases. Each release comparison checks unchanged held motion and independent sides, a slightly fuller first rebound, and smaller trailing oscillations. Existing checks also passed 12 stability cases, 16 protected poses, both-renderer multitouch, eight inner-crease regression cases, and original artwork identity with no external requests or browser errors. These are Chromium results; iPhone feel remains subject to user review.

## Preview 4 — screen-left lift

The screen-left side eases into the top of its travel. A small bounce gets a light adjustment and a strong upward pull gets more support. The movement fades before the white fur tips and loose hair on each side. Both sides also hold their displayed position when caught mid-bounce.

The lift check tracks skin texture on the actual portrait in WebGL and Canvas. On a Playful tap, the screen-left side dropped 27 portrait pixels and rebounded 16 pixels, down from 26 in preview 3. The right side dropped 27 and rebounded 26 in both versions. On a sustained upward drag, screen-left travel went from 34 to 19 pixels. The checks also cover diagonal travel, Auto, the Bounce button, Blender and live springs, and fixed points on the trim and inner crease.

Run `node peach-physics/previews/fireside/tests/lift.cjs` and `node peach-physics/previews/fireside/tests/release.cjs` from the repository root.

## Preview 5 — downward pulls and thigh shake

As either side presses into the cup, the skin slows over a wider area above the white trim. The support engages progressively with downward travel. On the hardest straight pull, eight displayed pixels beside the trim previously squeezed together 32 source pixels on the left and 34 on the right. The same strip now covers 19 and 18 pixels respectively. The Playful upward rebound still measures 16 portrait pixels on the left and 26 on the right.

Tap or drag the screen-right thigh just above the striped stocking. Its spring moves the skin and stocking together, settles after release, and gives a smaller shake during Bounce and Auto. The foreground arm, skirt trim, garter bow and blanket anchor the movement.

`node peach-physics/previews/fireside/tests/contact.cjs` measures straight and diagonal pulls with a coordinate ruler and checks the thigh through touch, Bounce, Auto and multitouch. The contact, lift and release checks run in Chromium. Contact and lift exercise both WebGL and Canvas at a phone viewport.
