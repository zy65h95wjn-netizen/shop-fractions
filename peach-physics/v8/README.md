# Peach Physics v0.0.8 r9.1 — fabric-support A/B experiment (diagnostic, not deployed)

Built on r9.1 (`5c9b9d2`). Main and the live r9 app are unchanged. **A is the default and renders exactly as r9.1**, pixel for pixel. **B is switched on with `?fabric=strong`**: for example `.../peach-physics/v8/?fabric=strong`, which also works offline. The settings panel title then ends in "· fabric B".

Spring solver, presets, timing, damping, impulse gains, gestures, linked movement, framing, the portrait and the other three characters are unchanged in both modes.

## The question

Lance saw almost no difference between r9 and r9.1 on his iPhone. The hypothesis under test: a clearly firmer garment (green upper cups plus fur trim) against freely moving skin is the missing ingredient. B is a deliberate exaggeration to make that testable. It is not a production setting.

## What B changes

In A, every pixel moves by its own local spring displacement × a mask weight. The cups and trim therefore get a smoothly varying displacement, so the clothing stretches like the skin, only less.

B splits the field in two:

1. **Garment block.** The trim and the green cup below it leave the skin channel. They move only by one shared vector per side: the spring field sampled at the middle of the trim (left (318,368), right (440,372)), at level 0.3. One vector for the whole block means no internal stretch or squash: the garment translates as a piece. This is not a scale factor on the old field, whose spatial variation is exactly what deformed the fabric.
2. **Skin hand-off.** Exposed skin keeps its own field. Over the 24 px of skin just above the trim it hands over to the garment vector, so the skin slides, bulges and lifts against the trim edge.
3. **Corset seam and hair guards.** Toward pixels that r8 holds stationary (lower corset, lacing, hair, arm, scenery), the garment fades out over 16 px, and never faster than distance/8. Inside the trim that fade is read at the trim centerline, so it cannot squeeze the trim across its width. Nothing that was stationary moves.

Implementation:

- **Mask:** blue channel of the existing mask texture (A leaves it zero).
- **WebGL:** two varyings and one extra term in the existing 6-step warp.
- **Canvas:** the same in a separate per-pixel routine.
- **Isolation:** all of it sits behind `HOLLY_FABRIC`, so A's shaders and Canvas loop are the r9.1 code.

B was tested at garment levels 0.3 and 0.2. At 0.2 the trim barely moved (about 3 px at Natural peak) and began to look stuck, so 0.3 was kept and no further tuning was done.

## Results (`tests/holly-fabric.cjs`, 390x844 @2x)

Inputs are identical in A and B and use the real gesture paths:

- Natural, Playful and Chaos taps and rebounds
- strong flicks up and down
- drags inward and upward from the green outer-cup targets
- node-bound inward-up and outward-down corners
- both sides at once
- 0.75 s Natural and Chaos tap trajectories

**Trim width.** The fur label is rendered through the real WebGL and Canvas renderers, and the worst width change from rest is taken over all states and frames.

| WebGL / Canvas | A (r9.1) | B |
| --- | ---: | ---: |
| Mid-cup worst | 16 / 17% | **9 / 8%** |
| Mean of 16 positions | 16 / 17% | **10 / 11%** |
| Max (right outer tip at the pinned perimeter) | 32 / 34% | 34 / 36% |

Left mid-cup is within 2–4% in B. Positions near the pinned tips are not improved.

**GPU field, source px.** Strain is the largest principal stretch or squash of the warp, averaged over the region.

| State | Skin center A / B | Trim travel A / B | Trim strain A / B | Cup strain A / B |
| --- | ---: | ---: | ---: | ---: |
| L Natural tap peak | 19.1 / 19.1 | 9.6 / 5.0 | 14% / 5% | 28% / 18% |
| L Chaos tap peak | 23.1 / 23.1 | 12.1 / 6.3 | 18% / 6% | 32% / 21% |
| L strong flick up | 11.3 / 10.5 | 5.8 / 3.1 | 9% / 4% | 42% / 18% |
| L Chaos flick up | 16.6 / 14.6 | 8.8 / 4.6 | 14% / 6% | 79% / 31% |
| L node-bound inward-up | 22.0 / 18.4 | 12.3 / 6.5 | 30% / 13% | 169% / 49% |
| R Natural tap peak | 18.8 / 18.8 | 5.4 / 4.2 | 11% / 6% | 28% / 24% |
| R Chaos tap peak | 23.1 / 23.1 | 7.1 / 5.5 | 16% / 8% | 37% / 30% |
| R node-bound inward-up | 20.7 / 18.6 | 7.0 / 5.2 | 25% / 25% | 149% / 59% |

All 23 states are in [`measurements.json`](tests/captures/holly-fabric-ab/measurements.json).

**Costs and new distortion in B:**

- **Garment travel:** about half of A's on the left (5 vs 10 px at Natural peak) and about 25% less on the right, where A's trim already moved less. The garment still moves visibly and coherently; it is not frozen.
- **Skin on upward motion:** skin-center travel is identical to A on every peak and downward move. On upward motion it is lower: −5% on Natural rebound, −8% to −13% on upward flicks, −16% at the node-bound inward-up corner. The backward warp samples the skin center from 15–20 px lower, inside the new hand-off band. Upper skin (y=315) is unchanged everywhere. Fixing this needs a steeper band, which means more skin strain, so it was not pursued.
- **Skin just above the trim** now carries the extra strain: 95th-percentile strain 42–106% across gesture states, highest on Chaos upward flicks (A: 33–129%, highest on the right Chaos rebound). It reads as tissue pressing over or lifting off the trim. The minimum Jacobian is equal to or above A in every state, so there are no folds.
- **Right outer tip and node-bound inward-up:** B does not improve the trim there (25% in both). The block has to fade out next to the pinned perimeter.
- **Mask build:** one-time, about 160 ms (A about 195 ms, desktop Node).

## Visual evidence (`tests/captures/holly-fabric-ab/`, all < 700 KiB)

- [`webgl-ab.jpg`](tests/captures/holly-fabric-ab/webgl-ab.jpg) and [`canvas-ab.jpg`](tests/captures/holly-fabric-ab/canvas-ab.jpg): native 1:1 crops, both cups, A | B. Rows: rest, Natural peak and rebound, Chaos peak, strong flick down and up, inward-up drag from the outer cup, node-bound inward-up.
- [`closeups-2x.jpg`](tests/captures/holly-fabric-ab/closeups-2x.jpg): the trim at 2x nearest-neighbour.
- [`temporal-natural-tap.jpg`](tests/captures/holly-fabric-ab/temporal-natural-tap.jpg): 0–0.6 s strip.
- Full motion, A | B side by side, every 1/60 s capture played at 0.5x:
  - [Natural tap](tests/captures/holly-fabric-ab/motion-webgl-natural-tap.webp)
  - [Chaos tap](tests/captures/holly-fabric-ab/motion-webgl-chaos-tap.webp)
  - [flick up](tests/captures/holly-fabric-ab/motion-webgl-flick-up.webp)
  - [inward-up drag](tests/captures/holly-fabric-ab/motion-webgl-drag-inward-up.webp)
  - [Canvas Natural tap](tests/captures/holly-fabric-ab/motion-canvas-natural-tap.webp)

What the images show:

- **B, Chaos taps and upward flicks.** The trim stays an even band near its line, and the green cup keeps its shape. In A the cup visibly stretches tall or smears like rubber, most clearly on upward flicks and inward-up drags.
- **B, skin above the trim** visibly rolls over or lifts away from it.
- **Ordinary Natural taps.** The difference is real but smaller: in B the trim travels about 4 CSS px less on screen, and the skin slides further over it. Whether that is "immediately recognizable" on a phone has to be judged on the device.
- **No new seams, detached fur, holes or background motion** were seen in either renderer.

## Checks

| Suite | Result |
| --- | --- |
| `holly-fabric.cjs` | A/B suite: A = r9.1 pixel-exact in motion; B rest/settle exact; B springs and other characters exact; shape, skin, strain and fold assertions |
| `holly-fur.cjs` | r9.1 suite, unchanged results in A, 174 checks |
| `holly-approved.cjs` | 138 checks; the offline cache is now `peach-physics-v008-r9-1-fabric-ab` |
| `holly-band.cjs` | r9 history, 83 checks |
| `artwork.cjs` | 4 portrait hashes |

Captures: `holly-fabric-captures.cjs`, then `python3 tests/holly-fabric-sheets.py <PEACH_TEST_OUTPUT>/fabric-captures <dest>`.

**Not verified:** how B feels on a physical iPhone, Safari rendering and frame rate.

<details>
<summary>r9.1 documentation (fur-shape correction)</summary>

## Peach Physics v0.0.8 r9.1 — Holly fur trim keeps its shape

Experimental branch from r9 (`8e4fcbb`). **Not deployed**: main and the live app stay on r9. Spring solver, timing, damping, presets, gestures, linked movement, input targets, framing and zoom are unchanged. Only Holly's mask builder changed. The approved portrait is byte-identical. Winter Ember, Midnight Yule and Aurelia Frost render exactly as in r9.

## What was wrong

Holly's renderer warps the photo: each pixel moves by the spring field × a fixed mask weight, so the mask is the only "material stiffness" there is. A band keeps its shape only if every point across its width gets the same displacement.

- **r8:** the white trim sat where the support weight was falling fastest. The neckline ramp ends inside the trim. Below it, the cup's falloff toward the stationary corset, lacing and outer hair guards cuts through the trim's lower half. At x=340 the weight drops from .74 to .38 across the trim's 17 px. The trim's top edge travelled about twice as far as its bottom edge, so it stretched and squashed: up to ±40% at mid-cup in r8.
- **r9:** added a band attenuation keyed to the approximate curve `379 − .004(x − 380)²`, which runs partly inside the trim. It lowered travel but put a new, steeper gradient inside the trim, so the distortion got worse (up to ±63% at mid-cup).

## The change

`buildHollyMask` now starts from r8's weights (r9's band term is removed) and adds one localized adjustment:

1. **`HOLLY_FUR`** traces the photographed trim edges as `[x, top, bottom]`, 10 points left and 9 right. The traced edges were checked against a colour segmentation of the photo.
2. **Flat plateau.** Across the trim (plus 2 px above and 6 px below) the weight is constant along the trim's normal. The trim therefore moves as one piece, and only its length along the band can change. The plateau level varies smoothly along the trim. It is r8's support at 40% depth, capped at r8's support at the lower edge **+ .12**. That bound keeps the cup below from absorbing a much larger step than in r8, which makes the trim firmer where the cup has little room: beside the lacing and the right perimeter.
3. **Transitions move out of the trim:** into the skin above (16 px, kept short so exposed skin keeps its r8 response) and the green cup below (26 px). They fade out over the last 10 px of each trim tip.
4. **Guards stay exact.** Every pixel that r8 holds stationary (hair, arm, scenery, lacing, lower corset) stays exactly 0. Near that boundary, raised weights are capped at distance/22 px, about r8's own slope at the hair guards, so the cup is not pinched against the stationary edge.

Both renderers use the same mask. The extra mask build is one-time per character load: about 240 ms vs r8's 150 ms in desktop Node; iPhone timing not measured.

**Right perimeter (r6's 32 px feather)** was investigated. Reducing it to 24 or 20 px gives the right outer trim more support. It also pushes more strain into the narrow cup strip beside the hair (minimum Jacobian 0.06–0.10, versus 0.17 in r8) without improving the trim. The r6 value is kept, and the plateau rule handles the right side.

## Results — fur shape (`tests/holly-fur.cjs`)

A fur label is traced from the photograph inside the page, independently of the runtime mask. It replaces the photo texture and is drawn by the **actual WebGL shader and the actual Canvas remap**. Trim width is then measured normal to the trim at 16 fixed material positions. The test covers 27 states (Natural/Playful/Chaos taps, flick, drag, link 100, both sides tapped, and all four node-bound corners per side) and 45-frame trajectories of Natural and Chaos taps per side. Values are the worst absolute width change from rest, in %. Mid-cup = L296–336 and R426–446, at least ~24 px from both tips and inside the right guard's plateau.

| Worst change (WebGL / Canvas) | r8 | r9 (live) | **r9.1** |
| --- | ---: | ---: | ---: |
| Mid-cup, Natural (stills + 0.75 s trajectories) | 34 / 35 | 35 / 36 | **8 / 10** |
| Mid-cup, Playful | 41 / 40 | 39 / 39 | **9 / 12** |
| Mid-cup, Chaos (stills + trajectories) | 41 / 43 | 47 / 49 | **14 / 15** |
| Mid-cup, flick / drag | 19 / 21 | 22 / 24 | **8 / 9** |
| Mid-cup, link 100 passive side | 9 / 10 | 13 / 14 | **3 / 7** |
| Mid-cup, node-bound extremes | 47 / 49 | 63 / 62 | **15 / 16** |
| All 16 positions, mean of worst | 50 / 51 | 62 / 63 | **18 / 19** |
| All 16 positions, max | 94 / 96 | 175 / 177 | **35 / 36** |

Against the ±10% evaluation target:

- **Met:** Natural at mid-cup.
- **Near:** Playful and the flick/drag/linked cases.
- **Not met:**
  - Chaos and the node-bound corners reach 14–16% at mid-cup.
  - Positions near the attached tips reach 20–36% (L286 outer tip, L346/352 and R408/416 at the lacing, R466/474 at the pinned right perimeter). A tip fixed to stationary lacing or to the outer edge must shear when the cup moves 20+ px, and the shear thins the band locally.

All 16 positions improve on both r8 and r9 in both renderers. WebGL and Canvas agree within 0.058 (width ratio). Per-position and per-category values are in [`measurements.json`](tests/captures/holly-r9-1/measurements.json).

## Results — travel, skin, folds (GPU field)

| Natural tap peak, source px | r8 | r9 | r9.1 |
| --- | ---: | ---: | ---: |
| Skin center L / R | 19.13 / 18.83 | 19.13 / 18.83 | 19.13 / 18.83 |
| Skin at y=345, just above trim, L / R | 19.12 / 18.80 | same | 18.98 / 18.80 |
| Mean trim travel L / R | 10.8 / 7.2 | 9.7 / 6.3 | 9.5 / 5.4 |

- **Skin:** exposed-skin upper and center travel is identical to r8 in every tap, Chaos, flick and drag state. At the forced upward node-bound corners it is up to 6% lower (skin center 20.7 vs 22.0 px at right large-up), because the backward warp's sample path crosses the new skin transition. The skin just above the outer trim moves less than in r8, by design: the transition now lives there. At the right outer point it is 12.6 vs 13.5 px at Natural peak, and 7.3 vs 12.9 at the right large-up corner.
- **Trim travel:** about 12% lower on the left and 25% lower on the right than r8's trim average. r8's average included a top edge that over-travelled. The right loss sits mostly at the pinned outer end; the trim still moves 5–12 px at Natural peak and is not frozen.
- **Folds:** minimum Jacobian of the moving field is 0.149 or more in every tested state, so nothing folds. At the four upward node-bound corners it is 0.15–0.23, versus r8's 0.34–0.41: the cup below the trim stretches more there. Every other state matches r8's value.

## Visual evidence (all < 700 KiB)

Identical spring states and r9 framing, 390×844 @2x, columns r8 | r9 | r9.1. Crops are native rendered pixels (1:1) unless marked.

- [WebGL left](tests/captures/holly-r9-1/webgl-left.jpg) · [WebGL right](tests/captures/holly-r9-1/webgl-right.jpg) · [Canvas left](tests/captures/holly-r9-1/canvas-left.jpg) · [Canvas right](tests/captures/holly-r9-1/canvas-right.jpg): rest, Natural peak and rebound, Chaos peak, and three node-bound corners.
- [2x close-ups of the trim](tests/captures/holly-r9-1/closeups-2x.jpg) (nearest-neighbour).
- [Temporal strip, Natural tap, 0–0.6 s](tests/captures/holly-r9-1/temporal-natural.jpg).
- Continuous motion, animated WebP at 0.5× speed (60 fps captures, all frames): [Natural](tests/captures/holly-r9-1/motion-natural.webp) · [Chaos](tests/captures/holly-r9-1/motion-chaos.webp).

What the images show:

- **Improved:** at peak and in Chaos, r9.1's trim keeps an even width where r8/r9 thin it mid-cup. At the right large-up corner r8/r9 bloat the trim into a thick lump; r9.1 keeps a band. Trim and cups stay connected, with no seams, holes or background motion.

**Known remaining defects:**

1. Left inward-up node-bound corner (`large-up-plus-x`): faint diagonal streaking where the cup's outer rim meets the hair. r8 stretches that area smoothly. Capping at distance/28 instead of /22 removes it, but costs left mid-cup shape (L296 to about 24%), so it was not done.
2. Right large-up: the outer end of the trim still widens next to the pinned perimeter.
3. Trim tips by the lacing still shear at large travel.

## Checks

Serve the repository root on port 8000, then run:

```sh
node peach-physics/v8/tests/artwork.cjs          # 4 portrait hashes
node peach-physics/v8/tests/holly-approved.cjs   # 138 checks: slots, framing, gestures, links, offline (r9.1 cache)
node peach-physics/v8/tests/holly-fur.cjs        # 169 checks: trim shape, skin, travel, folds, r9 equality
node peach-physics/v8/tests/holly-band.cjs       # 83 checks: historical r9-vs-r8 evidence (reads r9 from git)
node peach-physics/v8/tests/holly-fur-captures.cjs && python3 peach-physics/v8/tests/holly-fur-sheets.py <PEACH_TEST_OUTPUT>/fur-captures <dest>
```

`holly-fur.cjs` also asserts the following:

- Only the mask builder differs from r9, apart from the release labels.
- No pixel that is stationary in r8 moves. Corset and lacing weights equal r8's exactly.
- Holly's slap/drag/flick trajectories at link 0/50/100 are exact to r9 in both renderers.
- Rest and settled renders and framing are exact to r9 at 375×667, 390×844 and 430×932.
- The other three characters render exactly as in r9, at rest and moving.
- There are no browser or WebGL errors.

All suites pass with Chromium + SwiftShader; requirements are as below. The cache is `peach-physics-v008-r9-1`.

**Not verified:** physical-iPhone touch feel, frame rate, Safari rendering and the mask build time on device. This is still a 2-D warp of one photograph, not a cloth simulation.

</details>

<details>
<summary>Previous r9 documentation</summary>

# Peach Physics v0.0.8 r9 — Holly upper cup/fur support (superseded by r9.1)

This branch adds localized support to Holly's upper outer green cup and attached white fur band, based on r8 (`eea6067`). The approved photograph remains in the fourth slot, and r8 framing is unchanged. Winter Ember, Midnight Yule and Aurelia Frost are unchanged. r9 was deployed to main (`8e4fcbb`).

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

</details>

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
