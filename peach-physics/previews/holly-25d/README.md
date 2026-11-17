# Holly 2.5D preview 01

An isolated photographic depth experiment for Holly Heartbreaker. The approved
portrait remains the visible character. Original, 2.5D and side-by-side views
share the same production spring simulation and synchronized inputs.

Public preview:
https://zy65h95wjn-netizen.github.io/shop-fractions/peach-physics/previews/holly-25d/?v=1

## Try it

- Start with **Depth sway**, or drag the scenery to change the viewing angle.
- Tap, hold, drag and release Holly using the existing gesture targets.
- **Front** returns to the exact original projection while keeping motion active.
- **Side by side** mirrors input to both views; **Closer look** matches the crop.
- **Auto on/off** controls the existing R14 automatic movement.
- After **Ready offline** appears, this preview can reload without a connection.

## Implementation and limits

`build.py` generates `engine.html` from production v8. It preserves the existing
six-node solver, 1/120-second integration, Auto controller, Holly calibration,
Strong Fabric B masks and 1.10 motion gain. Both frames use identical seeded
input and a shared parent clock. Storage is private and nonpersistent; no saved
production profile is read or written. Sound remains off.

`frame-hook.js` adds a shallow relief attribute to the existing WebGL 1 mesh and
a bounded off-axis projection. Broad authored silhouettes approximate depth;
small local depth changes follow the existing nodes/contact state. The original
fragment shader still samples the approved PNG with the existing support masks.
There is no second image resampling pass, generated portrait or external API.
Front projection is exactly the original renderer. Touch coordinates are mapped
back through the depth projection before both frames receive the same input.

This is a photographic depth illusion, with a deliberately narrow viewing range.
Depth is approximate, not a scan or recovered anatomy. It cannot reveal unseen
sides of the character or provide physical glass compression. This preview was
implemented in the existing WebGL renderer, not built in Blender.

Without WebGL, the established Canvas renderer still provides original motion;
depth controls are disabled and the preview identifies reduced graphics mode.
The service worker owns only this preview's scope/cache prefix and caches the
already-public original PNG. Production and other previews are unchanged.

## Verification run November 17, 2026

With a repository-root HTTP server on port 8123:

```sh
python peach-physics/previews/holly-25d/build.py
node peach-physics/previews/holly-25d/verify.cjs
```

Current run using Playwright/Chromium:

- 144 exact simulation snapshots match unmodified v8, covering Natural, Playful
  and Chaos presets with manual Bounce and Auto.
- Zero pixel differences between original and front-projected preview, in both
  WebGL and forced Canvas fallback.
- Extreme-angle projection stayed invertible (sampled minimum Jacobian 0.503);
  maximum tested touch inversion error was 0.032 source pixels.
- Browser taps, drag/hold/release, settling, view controls and closer framing pass.
- Offline reload, source artwork loading and Bounce pass without network.
- No page errors. Original production source, motion controller and portrait
  byte hashes match the starting commit, `0f10bfe1dbff5da4be32a119d7e4c20ffa19de11`.

Test screenshots/results are written to `/tmp/holly-25d`. Physical iPhone Safari
performance and the perceived depth effect still require Lance's review.
