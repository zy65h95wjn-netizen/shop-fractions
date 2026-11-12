# Peach Physics v0.0.8 r9 — Holly upper cup/fur support

This branch adds localized support to Holly's upper outer green cup and attached white fur band, based on r8 (`eea6067`). The approved photograph remains in the fourth slot, and r8 framing is unchanged. Winter Ember, Midnight Yule and Aurelia Frost are unchanged. This branch has not been deployed.

The supplied JPEG is copied exactly: **720×1280, 296,910 bytes**, SHA-256 `b5af2ccfa267b2ea8b4a6fa4b98aa2935e7f2b4e869d279f93d99fb9e5964349`. No retouching, regeneration, cropping or recompression was performed. The previous fourth portrait remains recoverable from Git history.

Holly's portrait-mode scale remains **1.4× r7**, retaining the same r8 top anchor and visible source head/hat. Portrait and landscape framing code is byte-for-byte unchanged from r8.

The existing shared mask retains r8's broad garment support. A small additional multiplier follows the curved fur/upper-cup band: it eases in over the first 12 source pixels below the existing neckline, is strongest 12–24 pixels below it, and fades back to r8 support by 48 pixels. It also tapers inward toward the top lacing. At its strongest it retains 65% of the r8 field weight; the band is not pinned. No extra attenuation is applied above that curve. Skin, lower-cup and central-lacing reference rectangles retain exactly their r8 mask values.

Both renderers consume the same mask. Spring/node locations, trajectories, presets, gains, linked movement, input targets, original outer boundaries and rendering architecture remain unchanged. The r9 cache updates the app shell; the unchanged portrait keeps its r7 asset URL.

## Preview

No build step is needed. From the repository root:

```sh
python -m http.server 8000 --bind 127.0.0.1 --directory peach-physics/v8
```

Open http://127.0.0.1:8000/ and cycle the character selector to Holly (fourth). Tap or drag either side; the existing Link control still controls coupled movement. Offline installation requires HTTPS, as before.

## Checks and limitations

With the **repository root** served on port 8000, run:

```sh
node peach-physics/v8/tests/artwork.cjs
node peach-physics/v8/tests/holly-approved.cjs
node peach-physics/v8/tests/holly-band.cjs
```

The browser tests require Playwright, Chromium and the r6 (`ddf3456cc937c7f84f0b022f76f6824e59c2d079`) and r8 (`eea60679ddad1a5cb39701e1f73fe8872ccb7e60`) baseline commits in local Git history. `CHROMIUM`, `PEACH_TEST_URL` and `PEACH_TEST_OUTPUT` override the browser, server and output paths. Both WebGL and Canvas are checked at 375×667 and 390×844: four-slot selection, unchanged framing, independent taps and cup touches, drag/flick, linked motion, exact return to rest and offline loading. The first three characters retain exact render output and unrounded trajectories. PNG captures and JSON measurements are saved to the test output directory.

Validation passed all four artwork hashes, **138 installation/regression checks** and **83 localized-band comparison checks**, with no browser errors. The comparisons include 12 exact moving renders for the first three characters, 36 exact Holly gesture/link trajectories, unchanged rest output, and preserved exposed-skin field samples through peak, rebound and both large poses.

## Visual review

Both review JPEGs are below 700 KiB. Crops preserve native rendered pixels at an identical 390×844 viewport and r8 zoom. Columns are r8 before and r9 after. Rows show rest, left/right impact, peak and rebound, followed by large downward/upward poses. Settled output is byte-identical to rest. Large poses use the existing node bounds, not a new gesture gain.

- [WebGL upper-band comparison](tests/captures/holly-r9/webgl.jpg).
- [Canvas upper-band comparison](tests/captures/holly-r9/canvas.jpg).
- [Source-pixel measurements and sample coordinates](tests/captures/holly-r9/measurements.json).

At the sampled Natural peak, left/right skin-center travel stays at 19.13/18.83 source pixels. Mid-fur travel changes from 11.20/11.03 to 9.18/8.92; upper-cup band travel changes from 9.10/3.87 to 6.00/2.42. Outer-fur samples change from 11.45/2.66 to 7.33/1.65. These are individual texture-coordinate samples, not whole-region or physical-stiffness measurements. r8's existing left/right outer-boundary asymmetry is retained; the added support rule is symmetric and produces similar relative reductions.

Visual inspection of both renderers shows a modest firmness improvement, most apparent at large downward poses, without new holes, detached trim, seams or a sharp compression crease in these captures. Skin shape remains visibly mobile. Large upward poses still stretch fur fibers, particularly on the right, and retain a tight inner bend near the lacing. This remains the existing two-dimensional photo deformation; static comparisons do not establish fully natural motion. Physical-iPhone touch feel, frame rate and offline Home Screen behavior remain unverified.

The [r8 comparisons](tests/captures/holly-r8/) and `holly-support.cjs` remain historical evidence for r8. The older Holly tests and captures below use the previous portrait's coordinates. Use `holly-approved.cjs` and `holly-band.cjs` for this branch.

<details>
<summary>Historical r6 documentation — previous portrait and calibration</summary>

# Peach Physics v0.0.8 r6 — Holly Heartbreaker

Release: https://zy65h95wjn-netizen.github.io/shop-fractions/peach-physics/v8/

Rollback: https://zy65h95wjn-netizen.github.io/shop-fractions/peach-physics/v7-1/

Holly is the fourth adult elf and the first front-facing calibration. The established spring solver, gesture capture, four-character selector, controls, sound option, saved profiles and offline delivery are retained. Changes stay inside `peach-physics/v8/`; earlier releases and unrelated applications are untouched.

## r6: responsive left cup, supported right edge

The left outer fur had remained restricted by a fixed hair boundary that also covered part of the garment. On the right, r5's expanded region reached into the narrow strip of hair and scenery beside the cup. The previous distant boundary samples missed that strip.

r6 calibrates the two contours separately. The left upper outer fur and cup have more movement. The right becomes progressively firmer toward its outside edge while retaining the interior response. Photo-traced outer boundaries protect immediately adjacent pixels, with a two-source-pixel stationary border inside the outline. Falloff extends inward over 20 pixels on the left and 32 on the right. Distance to the complete traced polyline stays continuous at its corners.

The Canvas fallback also caches Holly's static photo at the viewport resolution. Drawing this cache 1:1 keeps its background sampling identical when the moving overlay is added or removed. This change applies only to Holly. It does not alter WebGL or the other three fallback renderers.

There are no changes to spring timing, damping, presets, linked movement, impulse gains, artwork or saved settings. The settings panel and offline cache identify the release as **r6**. The green touch targets remain active.

## Original artwork and image coordinates

The supplied 720×1280 JPEG remains byte-for-byte unchanged at `assets/holly-heartbreaker.jpg`. Its SHA-256 is `0ad0a1cad2273d038b1953587ecfd43857897f7627c91d8f2a02a989ffe2ba97`. No visible upper-left arrow was present in the supplied file. No regeneration, retouching, anatomical changes or stretching was performed. All three existing portrait hashes are also unchanged.

Coordinates below are original-image pixels. Left and right refer to the screen:

- `HOLLY_CONTOURS` retains direct exposed-skin input, within x=243–404, y=406–557 on the left and x=421–567, y=418–560 on the right.
- `HOLLY_MOTION_CONTOURS` supplies the broad deformation envelope for skin, attached fur and soft upper cups. Its polygon bounds are x=204–407, y=402–641 on the left and x=418–616, y=408–644 on the right. Its outer arcs use a 20-pixel feather; other edges use 32. The separately traced `HOLLY_OUTER_EDGES` restrict movement further and make the right perimeter firmer. Lower central lacing, the center gap and supported lower corset remain pinned. Polygon bounding boxes alone do not describe the active region.
- `HOLLY_TOUCH_CONTOURS` retains the user's earlier green-marked control areas independently of deformation. The marked crop aligns approximately as `marked = source × 1.78 − [596,472]`. The right trace covers x=442–695, y=468–765. Because the left annotation was cropped, the left control area mirrors the right around x=400. These areas accept input without moving the arm or background under the finger.

A touch outside the original skin target maps to the corresponding chest center. A constant source-coordinate offset persists for the gesture, preserving drag direction, flick velocity and independent multi-touch. Contact rings stay under the finger. Moving upper cups also accept touch. Central lacing, skirt and unmarked background remain outside the added targets.

## Holly's independent physics

The established fixed-step integrator, spring topology and gesture handling are reused. Holly's values remain those introduced in r4:

- Nominal frequency `3.0 − .012 × softness` Hz and damping ratio `.12 + .0022 × settling`.
- Left/right stiffness multipliers .94/1.06, avoiding exactly mirrored timing.
- Tap/flick impulse gain `.65 + .009 × bounce`, drag gain .95, and secondary horizontal/vertical gains .50/.80.
- A field combining 65% central-spring motion with 35% normalized local spring weighting. Spatially varying support and local contact compression deform the photograph rather than translate a rectangular patch.
- Unattenuated field travel up to 16 source pixels, then a smooth limit approaching 24. Node bounds remain ±26 horizontally and ±30 vertically. Texture coordinates travel through the bounded envelope in six small steps.

Spring centers remain (332,436), (337,478), (371,529) and (476,444), (481,484), (451,531). Canvas uses bilinear texture remapping through the same envelope and spatial field.

Linked movement is zero at 0. At 50 and 100, a passive spring between the central nodes uses stiffness `.35 × local spring stiffness × slider/100`. The opposite side responds as displacement develops, with no instantaneous cross-side tap or drag impulse. Local secondary followers provide follow-through. Repeated-input tests cover all three link settings, including minimum damping.

Tap strength uses available pointer pressure and a small contact-duration contribution. Safari may provide a fixed touch pressure; this is not force sensing. Flicks use measured pointer velocity. Separate pointer captures allow simultaneous input on both sides.

| Holly preset | Bounce | Softness | Settling |
| --- | ---: | ---: | ---: |
| Natural | 55 | 58 | 60 |
| Playful | 74 | 72 | 46 |
| Chaos | 92 | 84 | 32 |

Linked movement defaults to 50 and persists across preset changes. Higher Settling damps motion faster. Preset values are unchanged from the initial v8 release. Winter Ember, Midnight Yule and Aurelia Frost retain their accepted settings, trajectories, masks, waves, framing and directional fold behavior.

## Framing, preferences and offline use

Holly is fitted without horizontal cropping or stretching and anchored below the portrait top-safe area. Her full source face and hat remain visible; the original photo itself reaches the top of the hat. On shorter screens the bottom of the stockings can extend below the viewport.

The `peach-physics-v008-*` settings import v7-1 first and retain the earlier migration chain. Each character has an independent saved profile. Earlier-version profiles are never written. `peach-physics-v008-r6` precaches the page, both external original portraits, manifest and local icon. Obsolete v8 caches are replaced while earlier releases' caches remain. Runtime assets are self-contained, with no services or paid dependencies.

## Validation

Serve the repository root on port 8000, then run the current regression suites:

```sh
node peach-physics/v8/tests/artwork.cjs
node peach-physics/v8/tests/browser.cjs
node peach-physics/v8/tests/deformation.cjs
node peach-physics/v8/tests/aurelia.cjs
node peach-physics/v8/tests/fold.cjs
node peach-physics/v8/tests/holly.cjs
node peach-physics/v8/tests/holly-stress.cjs
node peach-physics/v8/tests/touch-zones.cjs
node peach-physics/v8/tests/holly-edge.cjs
```

Tests require Playwright and Chromium (`CHROMIUM` overrides `/usr/bin/chromium`). Test hooks and encoded texture-coordinate fields are injected only into test responses. Output goes to `/tmp/peach-v8-tests`, overridable by `PEACH_TEST_OUTPUT`. The legacy deformation script expects port 8000; other suites accept `PEACH_TEST_URL`. Historical comparisons require the relevant repository commits locally.

Validation uses Chromium 156.0.8078.79, Playwright 1.62.1 and SwiftShader at device scale factor 2. Viewports are 375×667, 390×844, 430×932 and 440×956.

- `holly.cjs`: **962 assertions passed**, including 276 exact legacy trajectory/render comparisons against v7-1. Its **686 Holly checks were repeated after the final contour adjustment**, including gestures, link 0/50/100, framing, presets, saved profiles, all four viewports, Canvas, offline switching and absence of browser/WebGL errors. The final subset is recorded in `holly-final.json`.
- `holly-stress.cjs`: **50 assertions passed** for repeated alternating impulses, all presets and extreme settings, complete settling, bounded motion and Canvas isolation.
- `touch-zones.cjs`: **387 assertions passed** for the green targets, equivalent gestures, real simultaneous touch, both renderers, all four sizes, persistence and offline behavior.
- `holly-edge.cjs`: **119 assertions passed** for the corrected left/right response, photograph-based adjacent pixel samples and unchanged spring trajectories against r5.
- All four original artwork hashes and app/service-worker syntax checks pass.

The edge test's fixed reference rectangles come from the photograph, independently of the runtime mask. They cover immediately adjacent hair, arm and scenery on both sides. It first reproduces the right-side pixel changes in r5, then requires exact stationary pixels in r6 for all four extreme directions, all four viewport sizes, and both WebGL and Canvas. It separately measures improved left-edge travel, reduced right-perimeter travel, preserved interior movement and exact r5 spring trajectories.

Across 32 extreme WebGL fields, minimum sampled texture-map determinant is **0.1424** (positive: no sampled folds), maximum sampled travel is **23.90 source pixels**, and outside-support travel is below **0.01 source pixels** (encoding precision). The independently selected adjacent pixel rectangles remain exactly unchanged. Finite samples do not prove every possible input.

With a Natural isolated-side tap at 390×844, left outer fur sample (227,500) moves approximately **10.2 CSS pixels**, compared with less than 0.1 in r5. Right outer sample (597,520) moves approximately **1.4 CSS pixels**, compared with 9.0 in r5. The inner chest samples retain the same peak travel on both sides. These are texture-coordinate measurements at specific visible features, not physical force measurements.

Both sides are captured at rest, contact, peak, rebound, secondary motion and complete rest at all four viewport sizes. Settled frames equal the resting canvas exactly. The six-phase sheet and extreme poses are inspected visually. `tests/captures/holly-phases.png` records the current phases; `tests/captures/holly-r6-boundaries.gif` compares r5/r6 with separate left- and right-side taps. Raw metrics accompany the tests. Desktop rendering time is not an iPhone performance measurement.

Archived validation includes the original v7-1 suite and v8 r1 browser (218 assertions), Aurelia (606), fold (454), and Midnight's complete deformation/ripple comparison against v6-2-3. r4's `holly-volume.json` (38 assertions) and `holly-amplitude.json` (25) document the earlier response increase; their scripts remain available for historical comparison. The r4/r5 GIFs and r1/r2 maximum-motion image are historical artifacts. Current acceptance uses both r6 boundaries and the adjacent scene samples.

## Physical-iPhone verification still required

These are desktop Chromium checks at iPhone-sized viewports. Safari touch feel, perceived rebound and edge firmness, single/two-finger gestures, frame rate, safe areas, sound activation and Home Screen offline reopening still need checking on a physical iPhone. Check Canvas speed if WebGL is unavailable. This is a controlled visual approximation, not a biomechanical simulation.

</details>
