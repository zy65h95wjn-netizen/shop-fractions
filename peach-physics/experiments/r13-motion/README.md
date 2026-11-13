# R13.1 motion experiment

**Experimental only. Do not promote until Lance approves it on his iPhone.** Baseline R12: `76cc6f11cff4cf77bd3d6e1eb34880246b23e9e7`. All implementation, copied original artwork and new evidence live in this directory; production remains byte-unchanged.

Open the updated `index.html` directly in Safari over HTTPS on the iPhone, open the gear panel, and enable either optional switch. Both are off on a fresh visit. Switch characters with the existing portrait button. Touch gestures always take priority.

- **Shake to Jiggle:** tap the switch and allow the iOS motion prompt. Movement is inertial and directional in the screen plane; forward/back shaking adds a smaller vertical response. Disabling it removes the sensor listener. Permission denial, exceptions, missing APIs, insecure contexts and missing readings produce explanatory status messages; Auto remains usable.
- **Auto Jiggle:** starts shortly after enabling (typically within two seconds when untouched), then produces occasional small directional impulses, with independently randomized intervals, side, strength and secondary movement. It does not call slap, contact, sound or laugh routines.
- Preferences are global across characters in `peach-r13-motion-options-v1`, separate from physics profiles. Auto restores when previously enabled. A saved Shake preference requires another explicit enable gesture on a new page visit; browser permission is not assumed or requested on load.
- Physics profiles retain their R12 semantics. The preview can read existing production values but writes only under `r13-preview:`. No live profile is overwritten.

The five original portraits, framing, solver, calibration, grab-and-hold, boundary guards and audio functions are retained. The standalone experiment registers no service worker and requires a connection to load. R14 sound work is not included.

[Read-only review](REVIEW.md) · [Rendered comparisons](evidence.html) · [Results and limitations](REPORT.md)

## Reproduce

Node, Playwright/Chromium, Python, and ffmpeg are validation tools only. Runtime has no package dependency. Browser test fixtures supply HTML and the approved assets without serving the entire repository.

```
python peach-physics/experiments/r13-motion/build.py
node peach-physics/experiments/r13-motion/tests/unit.cjs
node peach-physics/experiments/r13-motion/tests/browser.cjs
node peach-physics/experiments/r13-motion/tests/ui.cjs
node peach-physics/experiments/r13-motion/tests/visibility.cjs
node peach-physics/experiments/r13-motion/tests/record.cjs
node peach-physics/v8/tests/grab-hold-release.cjs
```

The last command is the existing R12 production/offline regression suite and uses a loopback-only, app-scoped server. Frame intermediates are written under `/tmp/r13-*`; final recordings and results are in `evidence/`.
