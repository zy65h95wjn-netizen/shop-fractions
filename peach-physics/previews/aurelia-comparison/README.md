# Aurelia Frost comparison — preview 3

Open https://zy65h95wjn-netizen.github.io/shop-fractions/peach-physics/previews/aurelia-comparison/

The left pane uses Aurelia's approved v8 six-node physics. The right uses the same engine and calibrated deformation boundaries, with additional follow-through sampled from a Blender spring rig and a brief drag-release damping adjustment. This is a 2D artwork experiment, not a reconstructed 3D character or cloth simulation. The supplied Aurelia JPEG is embedded byte for byte.

Both panes receive the same source-coordinate tap, drag, flick, or cancellation and share one fixed 1/120-second clock. They start with the existing Playful preset, linked movement 50, silent Auto on, and matching horizontal inward/outward Auto. Natural and Chaos are also available. “Peaches” and “Blender” enlarge one pane; “Closer look” changes framing equally in both panes without stretching the artwork.

This preview uses private copies of the v8 runtime bundled in `index.html`. It makes no external resource requests and does not read or write production profiles. There is no service worker: a saved HTML file runs offline, while reopening the hosted URL after closing the page still requires connectivity unless the browser retains it. The production `/peach-physics/v8/` app and Fireside preview are unchanged.

## Blender source and build

`bake_blender.py` creates two supported Bullet rigid-body springs, samples their evaluated displacement after release, normalizes the curves, and fades the final 0.3 seconds. The local `.blend` output can be regenerated; it is not needed for browser playback. `blender-response.json` records the raw samples and the normalized response. The browser applies an additional decay envelope to the baked follow-through and retains Aurelia's existing displacement limits and masks. Dragging retains her original touch calibration; the experiment briefly adjusts release damping to favor the first rebound and reduce the tail.

From the repository root:

```sh
blender -b --python peach-physics/previews/aurelia-comparison/bake_blender.py
python peach-physics/previews/aurelia-comparison/build.py
node peach-physics/previews/aurelia-comparison/verify.cjs
node peach-physics/previews/aurelia-comparison/verify-baseline.cjs
node peach-physics/previews/aurelia-comparison/verify-clap.cjs
```

The build reads `v8/index.html`, `v8/motion.js`, and `v8/assets/aurelia-frost.jpg`. It bundles the frame adapter and shell into a single HTML file. `build-info.json` records the source and original artwork hashes. Tests require Node, Playwright, and Chromium at `/usr/bin/chromium`.

## Validation

- 36 exact manual Bounce state comparisons against the actual v8 solver across all three presets. Auto intentionally uses the shared clap input in preview 2.
- 18 unchanged manual bounce/tap/drag cases against preview 2, across both panes and all three presets.
- Six 20-second Auto cases: zero vertical node/follower/render-offset motion, inward and outward travel, opposing paired directions, bounded displacement, and settling after Auto is disabled.
- WebGL and forced Canvas: six 15-second stability cases, bounded experimental offsets, settling after Auto stops, and eight extreme protected-region poses. Equal node poses render identically in both panes.
- Real browser taps and drags mirror to both engines, including two-finger diagonal holds and release/cancel cleanup.
- Exact original artwork bytes, zero persistent storage reads/writes, zero external resource requests, and zero browser errors in the offline test.
- Phone layout at 390×844, individual-pane views, close-up, and no horizontal overflow.

Canvas pixel probes use a stable CPU readback context to prevent Chromium switching image resamplers during repeated screenshots.

These are automated Chromium checks; physical iPhone Safari performance and the preferred feel remain for Lance to review.

## Preview 2 — inward/outward Auto

Both panes now share one smooth horizontal Auto drive with opposite signs on the left and right. The existing motion controller still supplies activation fade, timing, and touch interruption. The Blender pane adds synchronized, mirrored horizontal baked pulses with no vertical component. Manual taps, drags, Bounce, and their release behavior are unchanged. The artwork, calibrated masks, and production v8 files are unchanged.

Before manual input, Auto alone produces exactly zero vertical offsets. Vertical movement from a user's tap or drag still settles naturally; Auto does not snap it away.

## Preview 3 — reference-paced clap

The supplied short phone recording shows a stronger closing/rebound rhythm at approximately two cycles per second. Auto now uses that pace, with a second harmonic to sharpen the closing beat. Drive amplitude compensates for the existing preset stiffness so all three presets keep visible travel. The Blender Auto pulses run at the same half-second cadence with reduced pulse strength, adding follow-through without overpowering the common movement.

Both sides remain horizontally opposed, with no vertical Auto input. The existing node travel and velocity limits, calibrated boundaries, manual gestures, presets, and release behavior are preserved. The glass experiment is unchanged. This matches the reference's approximate rhythm and feel rather than copying the other character's calibration.

Updated verification checks 34–38 inward crossings over an 18-second steady interval, more than 10 source pixels of travel in each direction, zero vertical Auto offsets, bounded motion and return to rest. Across all presets, measured center-node/render-offset extrema were approximately −17 to −18 and +18 to +20 source pixels. Eighteen manual comparisons against preview 2 and 36 Bounce snapshots against v8 remain exact.
