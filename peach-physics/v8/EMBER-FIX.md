# R14 — Winter Ember left boundary correction

Baseline: `2adb9257532ac3b17e39aeea815a23f5fb7f85ce` (R14 auto2).

Lance reported an unnatural pull on Winter Ember's screen-left cheek in an iPhone recording. The older elliptical rendering region crossed the curved garment edge and extended into the lower fold. The crease guard only applied during dragging, so automatic motion could also pull these areas.

This correction gives Ember's screen-left side a portrait-specific skin envelope following the clothing edge, outer silhouette, inner crease and lower fold. WebGL uses six short backward sampling steps through that envelope. Canvas masks both source and destination skin areas. The resting image is unchanged; the central area retains visible movement. The right-side-only rendering, all four other characters, original artwork, spring trajectories, gestures, motion-controller values, presets, profiles and audio are preserved.

Only the rendering correction is promoted from the local comparison. The offline comparison shell, replay controls and experimental files are not part of the application update. No new character or Blender work is included.

## Delivery

Cache: `peach-physics-v008-r14-ember1`. The motion script stays `motion.js?v=r14-auto2` because its bytes have not changed. The existing cache-scoped network-first fallback and atomic resource installation are retained. All five characters remain available offline; saved Auto Off and per-character settings are retained.

## Evidence

The local candidate passed 120 matched motion scenarios across five characters, three presets, four interactions and both renderers. All 192 sampled other-character frames and 10 resting frames matched exactly. Another eight Ember right-only frames matched; 24 Canvas clothing/lower-fold samples stayed unchanged. In 20 WebGL boundary cases, sampled garment displacement fell from as much as 29.81 source pixels to encoding precision (at most 0.0014 pixels). The minimum sampled Jacobian was 0.205, with no sampled folds. These are sampled checks, not a proof for every possible input.

`tests/ember-boundary.json` preserves those candidate results with explicit provenance. `tests/ember-source.cjs` verifies that the actual application is byte-identical to that validated candidate apart from its release title, that motion.js and the manifest are unchanged, that the service worker changes only its cache revision, and that all five portrait hashes pass. `tests/ember-boundary.cjs` can rerun the comparisons against the baseline commit.

`tests/ember-upgrade.cjs` checks the actual R14 auto2-to-Ember upgrade in WebGL and forced Canvas. It delays an asset to verify installation is atomic, injects stale old-cache HTML, and verifies exact corrected HTML offline, all five characters and profiles, saved Auto On/Off, fresh defaults, the saved Shake preference, and Santa audio/laugh behavior. The activation wait uses a synchronous controller-state predicate, avoiding the historical async-polling problem.

Physical iPhone Safari performance and the preferred visual feel still require device review. This is a targeted 2D rendering calibration, not a replacement physics engine.

Run with the existing Node/Playwright/Chromium environment:

```sh
node peach-physics/v8/tests/ember-source.cjs
node peach-physics/v8/tests/ember-upgrade.cjs
# Optional full comparison rerun; requires the repository-root localhost:8000 server:
node peach-physics/v8/tests/ember-boundary.cjs
```

The previous commit remains the rollback reference. A rollback should use a fresh cache revision, retaining the cache-scoped fallback.
