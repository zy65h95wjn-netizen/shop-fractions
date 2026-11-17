# Aurelia against glass — experiment 1

Open https://zy65h95wjn-netizen.github.io/shop-fractions/peach-physics/previews/aurelia-glass/

An isolated side-by-side comparison of Aurelia's current Blender/clap preview and a gentle glass-contact illusion. Both panes use the same original JPEG, calibrated physics, mirrored Auto input, and synchronized touches. Hold either portrait to increase pressure on the matching area; release to relax it. Choose Glass and Closer look for a larger view.

The glass side changes rendering only. It reduces displayed movement with pressure, applies a small outward spread and vertical compression inside the intersection of Aurelia's existing skin and grab-boundary masks, and adds a faint contact sheen and fixed glass reflection. Six backward sampling steps keep the additional deformation inside those boundaries. The source artwork is embedded byte for byte. This is a 2D impression of contact, not a 3D reconstruction or physical collision model.

The six-node solver and current clap input run unchanged behind the effect. Render-time node edits are restored immediately. The current Aurelia comparison, Fireside, production v8, and saved production profiles remain separate. There are no accounts, sound, external asset requests, or service-worker registration. A saved copy of the single HTML works offline; the hosted link needs connectivity when the browser has not retained it.

## Build and checks

```sh
python peach-physics/previews/aurelia-glass/build.py
node peach-physics/previews/aurelia-glass/verify.cjs
node peach-physics/previews/aurelia-glass/check-live.cjs
```

The builder reads production v8 and the existing `aurelia-comparison/blender-response.json`; it writes only inside this preview directory. Node checks require Playwright and `/usr/bin/chromium`.

Verified in WebGL and forced Canvas at a 390×844 phone viewport:

- Six pressure cases: zero effect at zero pressure, outward horizontal spread, inward vertical compression, and additional displacement below 10 source pixels.
- Six 12-second Auto stability cases across all presets, with identical underlying solver states in both panes and bounded finite motion.
- Rendered face, clothing, center-crease, thigh, and background probes unchanged as pressure increases. Glass reflection is a separate visual overlay.
- Holding increases pressure smoothly; cancellation clears the pointer and pressure returns to its resting value. Underlying movement settles.
- Exact embedded artwork bytes, no external requests or browser errors, individual-pane views, close-up, and no horizontal overflow.

Canvas pixel tests use a stable CPU readback context to avoid Chromium changing image resampling during repeated reads. Physical iPhone Safari performance and how convincing the illusion feels remain for user review.
