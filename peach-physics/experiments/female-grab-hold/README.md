# Grab and hold — all four female characters

Standalone review preview based on production r11 (`d2a1fa1686aa1dda3cb1553872f0ad126138b873`). Winter Ember, Midnight Yule, Aurelia Frost and Holly Heartbreaker now support slow pulls that remain held while the finger stays down. Release resumes each character's existing spring response. Santa retains his original interaction.

Open `index.html`, use the original character-switch button to cycle characters, then pull slowly and pause with your finger down. One finger can hold each side. The settings panel includes **Grab and hold: on/off**; `?hold=off` also opens the original interaction. The option is disabled for Santa.

This separate preview uses the original five-character r11 artwork, framing, masks and renderers. It does not copy Kelvinlets, the Ember-only crease guard or the comparison close-up onto other characters. The earlier Winter Ember A/A+/B page remains available unchanged. Production files, production preferences, service workers, deployment configuration and live Peaches are untouched. Preview preferences use a separate storage prefix and there is no service worker.

## Interaction

After eight source pixels of accumulated drag travel, the selected side's three nodes follow fixed targets calculated from pointer-down offsets and total pointer displacement. A stationary finger maintains those targets instead of allowing springs to pull back between pointer events. The original drag multiplier (.17), per-node Gaussian weights and displacement limits (26 px horizontal, 30 px vertical) are retained. Holly's .95 drag tuning, Midnight's left-side .90 tuning and Holly's existing mapped touch anchors are preserved. Followers still settle naturally. Existing linked effects remain active; zero linkage is independent.

Releasing the pointer removes the hold constraint. A paused hold returns through the original spring integration; a deliberate flick keeps the existing release impulse. Short taps that never become grabs retain their original handling. An extra same-side pointer is ignored while grab-and-hold is enabled. Cancellation, lost capture, blur, reset and character switching clear holds through the existing cleanup paths.

## Validation

Desktop Chromium with SwiftShader, iPhone-size viewport (390×844, DPR 2); both WebGL and forced Canvas:

- 48 holds: four characters × Natural/Playful/Chaos × left/right × two renderers. Slow two-second pulls held for five seconds with **zero held-node drift**, zero untouched-side displacement at linkage zero, visible deformation, and pixel-exact return to rest after release.
- 30 baseline comparisons: all five characters × three presets × two renderers. Free-bounce trajectories and rendered frames matched the unmodified production source exactly. Rest frames also matched for every character.
- Santa's sustained drag state and rendered output matched production in both renderers; grab-and-hold remained disabled.
- Eight lifecycle cases: each woman in both renderers. Independent simultaneous holds, ignored duplicate same-side touch, one-side cancellation, lost capture, blur and character switching passed.
- Artwork bytes, WebGL shader/mesh implementation and Canvas/render routines match r11 (see provenance.json).

No physical iPhone performance claim is made. These are functional and regression checks, not a new Kelvinlet realism comparison. The original renderer's existing silhouette and texture-warp limitations remain.

Evidence: `evidence/browser.json`, `evidence/lifecycle.json`, `evidence/provenance.json`.

## Reproduce

Run from repository root with Node, Playwright and Chromium installed, serving the repository at localhost:8000:

```
python peach-physics/experiments/female-grab-hold/build.py
node peach-physics/experiments/female-grab-hold/tests/browser.cjs
node peach-physics/experiments/female-grab-hold/tests/lifecycle.cjs
```

The browser checks reuse the existing read-only test harness from v8/tests. Test hooks are injected into browser responses and are not shipped in the preview.
