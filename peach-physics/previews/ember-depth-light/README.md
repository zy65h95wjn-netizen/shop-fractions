# Winter Ember 2.5D depth test — isolated, test only

The same experiment as `previews/midnight-depth-light/`, applied to Winter Ember: keep the approved portrait and the production r14 motion, and add light that changes as the shape moves plus a small parallax.

It is derived from production `peach-physics/v8/` at main `6108a9d`. Nothing in `v8/`, the approved portraits or other previews is modified.

## Pages

- **`index.html` — side-by-side test.** Left: the current production look. Right: 2.5D. One touch on either picture drives both, and both run from one shared clock, so the springs are in the same state on both sides and only the rendering differs. Controls: Side by side / Current / 2.5D, Bounce both, Auto, Closer look, 2.5D strength, Feel, Reset.
- **`frame.html` — the engine on its own, full screen.** The production Winter Ember page with a **2.5D** chip at the top left that cycles Off, Subtle, Medium, Strong. `?depth=0`…`3` selects a level by link.

The left pane is this same engine with depth Off.

## What is different from production

- **Depth lighting.** Each side has a rounded depth shape under the moving area. The shader adds only the change in light when the springs lean that shape, so at rest nothing is added. The change is soft-limited to 5%, 9% or 14% (Subtle, Medium, Strong); shade tints warm and light tints pale.
- **Parallax.** Skin nearer the viewer travels slightly farther than skin at the base. It scales the movement production already applies, so stationary pixels stay stationary.
- **Winter Ember only.** Character switching is removed. Her portrait stays embedded in the page exactly as in production (SHA-256 of the embedded image `37abbe30132c88c9fa6950e96dd639eeb86d547fdd316a311c02cb11653dce07`); the other embedded portrait is dropped.
- **Isolated.** Its own saved settings (`peach-physics-preview-emberdepth-*`, `peach-preview-emberdepth-motion-options-v1`); production profiles are never read or written. No service worker.

Springs, presets, gestures, grab-and-hold, Shake/Auto, sound and her boundaries are the production code, unchanged. Depth lighting runs in the WebGL renderer only.

It reads how far production moved each pixel directly, so it needs no character-specific masks. Tuning lives in `build.py`: `DEPTH_LEVELS`, `FORM_DEPTH`, the dome centres and radii in `formSurface`, and `light` (warm key light from the upper left).

## Rebuild

```sh
python3 peach-physics/previews/ember-depth-light/build.py .
```

`index.html` is hand-written and not generated.

## Checks

Run a server at the repository root on port 8765, then:

```sh
node peach-physics/previews/ember-depth-light/verify-compare.cjs peach-physics/previews/ember-depth-light/tests
node peach-physics/previews/ember-depth-light/verify.cjs peach-physics/previews/ember-depth-light/tests
```

`verify-compare.cjs` (`tests/compare-results.json`): both engines hold identical spring state under Auto, during a real drag-and-hold, after release, after a tap on the other picture and after Bounce; with Auto off and the springs settled the two pictures are pixel-identical; no page errors.

`verify.cjs` compares the engine with production Winter Ember at rest and in held poses. Its results are added in `tests/results.json` when recorded.

These checks use desktop Chromium with software WebGL at an iPhone 13 viewport. They do not establish frame rate, appearance or feel on a physical iPhone.
