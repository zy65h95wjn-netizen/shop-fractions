# Holly bounce study 01

An isolated comparison addressing the pinned-edge stretching Lance noticed in
the first 2.5D preview. The reference and experiment share Holly's original
portrait, camera framing, gestures, spring trajectories and Auto input. The
experiment changes how those spring displacements deform the photograph.

Preview:
https://zy65h95wjn-netizen.github.io/shop-fractions/peach-physics/previews/holly-bounce/?v=1

Choose **Side by side**, then **Bounce** or tap/drag either portrait. Use
**Closer look** to inspect the response. **Current** retains the production
deformation; **Softer bounce** is the experimental rendering. Auto starts on.
The view stays straight on so camera sway does not affect the comparison.

## What changes

- A broader upper skin envelope gives the motion a longer transition into its
  attachments. The original outer silhouette guards and lacing exclusion remain.
- A shared displacement from the three nodes on each side coordinates motion
  through the region, with restrained roll and a small opposing-axis shape
  adjustment. These are visual approximations, not a volumetric simulation.
- Local contact indentation and delayed follower contribution are gentler.
- Strong Fabric B's garment mask channel and shared garment displacement remain
  unchanged. The 1.10 rendered-motion gain and existing displacement limit remain.

The artwork bytes, core spring solver, fixed 1/120-second integration, presets,
Auto drive and touch targets are unchanged. Both WebGL 1 and Canvas implement
the same experimental field. Profiles here use a nonpersistent private store;
the production app and the earlier 2.5D preview are untouched. Sound stays off.

This still deforms one photograph within protected boundaries. It does not add
unseen anatomy, a full 3D rig or physical volume conservation. Whether the change
looks nicer requires Lance's review on his iPhone; the test name is not approval.

## Build and verification

`build.py` generates the private `engine.html` from production v8 and the preview
hook. Source/artwork hashes are recorded in `build-info.json`.

With a repository-root HTTP server on port 8123:

```sh
python peach-physics/previews/holly-bounce/build.py
node peach-physics/previews/holly-bounce/verify.cjs
```

Verified November 17, 2026 using Playwright/Chromium:

- 144 exact state comparisons against production v8 across all three presets,
  manual Bounce and Auto. Both panes retain the original simulation.
- Zero resting-image pixel differences in WebGL and forced Canvas fallback.
- Zero pixel changes outside the deformation crop during four extreme diagonal
  poses; face, surrounding arms and scenery stay stationary.
- Original garment mask channel unchanged byte for byte. Crop-border weights
  remain zero to prevent texture-clamping artifacts outside the moving region.
- 20,144 skin-channel samples change; 5,330 upper-region samples gain support.
- Browser tap, drag/hold/release, independent multitouch, cancellation, settling,
  controls and offline reload pass. No page or WebGL errors.

Screenshots and results stay under `/tmp/holly-bounce`. These checks establish
desktop-browser behavior, not physical iPhone Safari performance or aesthetic
approval. No new dependencies or external services are required. The service
worker uses only this preview's scope and cache prefix.
