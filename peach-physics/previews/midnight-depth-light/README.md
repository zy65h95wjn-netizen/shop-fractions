# Midnight Yule 2.5D depth test — isolated, test only

The same experiment as `previews/holly-depth-light/`, applied to Midnight Yule: keep the approved portrait and the production r14 motion, and add light that changes as the shape moves plus a small parallax.

It is derived from production `peach-physics/v8/` at main `6108a9d`. Nothing in `v8/`, the approved portraits or other previews is modified.

## Pages

- **`index.html` — side-by-side test.** Left: the current production look. Right: 2.5D. One touch on either picture drives both, and both run from one shared clock, so the springs are in the same state on both sides and only the rendering differs. Controls: Side by side / Current / 2.5D, Bounce both, Auto, Closer look, 2.5D strength, Feel, Reset.
- **`frame.html` — the engine on its own, full screen.** The production Midnight Yule page with a **2.5D** chip at the top left that cycles Off, Subtle, Medium, Strong. `?depth=0`…`3` selects a level by link.

The left pane is this same engine with depth Off.

## What is different from production

- **Depth lighting.** Each side has a rounded depth shape under the moving area. The shader adds only the change in light when the springs lean that shape, so at rest nothing is added. The change is soft-limited to 5%, 9% or 14% (Subtle, Medium, Strong); shade tints warm and light tints pale.
- **Parallax.** Skin nearer the viewer travels slightly farther than skin at the base. It scales the movement production already applies, so stationary pixels stay stationary.
- **Midnight Yule only.** Character switching is removed. Her portrait stays embedded in the page exactly as in production (SHA-256 of the embedded image `5585e5751573c20873a2ff4abd189d79cc30302b0bea89bd1501bc25f5223d15`); the other embedded portrait is dropped.
- **Isolated.** Its own saved settings (`peach-physics-preview-midnightdepth-*`, `peach-preview-midnightdepth-motion-options-v1`); production profiles are never read or written. No service worker.

Springs, presets, gestures, grab-and-hold, Shake/Auto, sound and her boundaries are the production code, unchanged. Depth lighting runs in the WebGL renderer only.

Unlike Holly's version, this one reads how far production moved each pixel directly, so it needs no character-specific masks. Tuning lives in `build.py`: `DEPTH_LEVELS`, `FORM_DEPTH`, the dome centres and radii in `formSurface`, and `light` (warm key light from the left).

## Rebuild

```sh
python3 peach-physics/previews/midnight-depth-light/build.py .
```

`index.html` is hand-written and not generated.

## Checks

Run a server at the repository root on port 8765, then:

```sh
node peach-physics/previews/midnight-depth-light/verify-compare.cjs peach-physics/previews/midnight-depth-light/tests
node peach-physics/previews/midnight-depth-light/verify.cjs peach-physics/previews/midnight-depth-light/tests
```

`verify-compare.cjs` (`tests/compare-results.json`): both engines hold identical spring state under Auto, during a real drag-and-hold, after release, after a tap on the other picture and after Bounce; with Auto off and the springs settled the two pictures are pixel-identical; no page errors.

`verify.cjs` (`tests/results.json`): at rest the engine is pixel-identical to production Midnight Yule; in two held poses the engine at Off is pixel-identical to production with identical spring state; with depth on, changed pixels stay within her moving area (source x 165–782, y 938–1331 at Strong); after release and settling at Strong the portrait returns exactly; no service worker; no page errors.

These checks use desktop Chromium with software WebGL at an iPhone 13 viewport. They do not establish frame rate, appearance or feel on a physical iPhone.

## Left side matches right — test option

Phone review: the screen-right cheek pulls down further than the left and takes the fabric with it, and that was preferred. Production gives Midnight Yule's screen-left side its own traced skin mask that keeps clothing, the lower crease and inner thigh still, 10% weaker taps and drags, and 6% more damping. With **Match left side** on, the 2.5D picture renders the left side through the same path as the right and uses the same strength and damping.

On in the 2.5D picture by default; the Current picture never changes. Because the left springs are stronger with the option on, the two pictures are no longer in identical spring state while it is on (in the recorded hold the left centre node travelled 30 source pixels instead of 27.4). `frame.html?match=0` keeps production behaviour; the panel has **Left side: matches right / current**. The rendering part is WebGL only. Switching it in the side-by-side page resets both pictures. Production is unchanged.

`tests/compare-match-hold.png` shows the left cheek held with the option on. `tests/results.json` was recorded with the option off (`?match=0`).

### Version 2 — mirrored shape

Phone review of the first version: the left cheeks were not pulling correctly. Measuring the moved pixels showed why: the left side's original oval did not fit the cheek the way the right side's does. On Midnight Yule it spilled past the hip and dragged the background; on Winter Ember it stopped short of the centre crease and bent the lower fold into a hook. With the option on, the left side is now weighed with the right side's own profile, mirrored about the centre crease and scaled to the left cheek's width (the centre crease is taken at source x 466 and the right cheek is 1.03 times the width of the left). These two numbers were read from the portrait by eye and are the first things to adjust if the left still looks off.
