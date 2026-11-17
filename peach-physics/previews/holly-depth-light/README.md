# Holly 2.5D depth test — isolated, test only

A separate test of Holly Heartbreaker that keeps the approved portrait and the production r14 motion, and adds depth cues on top: light that changes as the shape moves, and a small parallax.

It is derived from production `peach-physics/v8/` at main `0f10bfe` (v8 is unchanged at `6108a9d`). Nothing in `v8/`, the approved portraits or other previews is modified.

This is a separate experiment from `previews/holly-25d/`, which changes the viewing angle with a relief mesh. This one keeps the camera fixed and changes the light instead.

## Pages

- **`index.html` — side-by-side test.** Left: the current production look. Right: 2.5D. One touch on either picture drives both, and both run from one shared clock, so the springs are in the same state on both sides at every moment and only the rendering differs. Controls: Side by side / Current / 2.5D, Bounce both, Auto, Closer look, 2.5D strength, Feel, Reset.
- **`frame.html` — the engine on its own, full screen.** The production Holly page with a **2.5D** chip at the top left that cycles Off, Subtle, Medium, Strong. `?depth=0`…`3` selects a level by link.

The left pane is this same engine with depth Off. The checks below show that picture is pixel-identical to production Holly at rest and in held poses.

## What is different from production

- **Depth lighting.** Each side has a rounded depth shape (a dome) under the moving area. The photograph already contains the resting light, so the shader adds only the *change* in light when the springs lean that shape: the side facing the motion steepens, the trailing side flattens, and shading and highlight follow. At rest the change is zero.
- **Parallax.** Skin nearer the viewer travels slightly farther than skin at the base. It uses the same fixed supports as production, so stationary pixels stay stationary.
- **Holly only.** Character switching is removed and the two embedded portraits are dropped, so the engine page is about 112 kB instead of 1 MB.
- **Isolated.** Its own saved settings (`peach-physics-preview-holly25d-*`, `peach-preview-holly25d-motion-options-v1`); production profiles are never read or written. No service worker. The side-by-side page saves nothing of its own.

Springs, presets, gestures, grab-and-hold, Shake/Auto, sound, framing and the garment handling are the production code, unchanged. The portrait is the approved file, SHA-256 `f7267c4f7624ea17d2215251e0bdf63d3e1cbc59bb33e3b9bcaca7f81b486a58`.

Depth lighting runs in the WebGL renderer only. In reduced graphics mode (Canvas) the control is disabled and the page behaves like production.

In the side-by-side page, Auto Jiggle uses a fixed random sequence in both engines so the two sides match; the motion itself is the production Auto.

## Tuning

All of it is in the fragment shader and one table in `frame.html` (generated; change `build.py` to keep it reproducible):

- `DEPTH_LEVELS`: `[largest light change, highlight, parallax]` per level. The light change is soft-limited: it approaches that fraction and never exceeds it.
- `HOLLY_DEPTH`: how deep the dome is, in source pixels.
- `hollySurface`: dome centres and radii in source pixels.
- `light`: direction of the portrait's key light (upper left, in front).

## Rebuild

```sh
python3 peach-physics/previews/holly-depth-light/build.py .
```

The script reads production `v8/` and writes `frame.html`, `motion.js`, the manifest, icon and portrait copy. It fails if any expected production line has changed, rather than producing a partial page. `index.html` is hand-written and not generated.

## Checks

Run a server at the repository root on port 8765, then:

```sh
node peach-physics/previews/holly-depth-light/verify.cjs peach-physics/previews/holly-depth-light/tests
node peach-physics/previews/holly-depth-light/verify-compare.cjs peach-physics/previews/holly-depth-light/tests
```

Requires Node and Playwright with Chromium.

`verify.cjs` (engine against production, `tests/results.json`):

- At rest, the engine at its default level is pixel-identical to production Holly.
- In two held poses, the engine at Off is pixel-identical to production. The two pages are timed separately; in the recorded run the two-decimal spring snapshot matched in one pose and differed in the other while the pixels matched exactly, and a separate repeat of that pose matched at 1.5, 2 and 3.5 seconds.
- With depth on, every changed pixel stays inside Holly's moving support area.
- After release and settling at Strong, the portrait returns exactly.
- The chip cycles and saves its level; the page stays on Holly; no service worker is registered; no page errors or failed requests.

`verify-compare.cjs` (side-by-side page, `tests/compare-results.json`):

- Both engines hold identical spring state under Auto, during a real drag-and-hold on the left picture, after release, after a tap on the right picture, and after Bounce.
- With Auto off and the springs settled, the two pictures are pixel-identical.
- During a hold the pictures differ, which is the depth effect.
- Controls change both engines; no horizontal overflow at 390 px; no page errors.

`tests/zoom-sheet.png` shows one held two-finger pose at Off, Medium and Strong (version 2).

## Version 2 — softer light

First phone review: pulling a side to the right left a visible shadow, and the skin tone appeared to change colour. Version 2 soft-limits the light change to 5%, 9% or 14% (Subtle, Medium, Strong), tints shade warm and light pale instead of grey, no longer removes the photograph's own highlights, and narrows how far the shape may lean. Off, the resting picture and the springs are unchanged.

`tests/results.json` was recorded with version 1 levels; its changed-pixel counts for depth levels predate this change. `tests/compare-results.json` and `tests/zoom-sheet.png` are from version 2.

These checks use desktop Chromium with software WebGL at an iPhone 13 viewport. They do not establish frame rate, appearance or feel on a physical iPhone; that needs review on the phone.
