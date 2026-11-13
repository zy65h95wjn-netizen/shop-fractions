# Holly portrait replacement — isolated review build

Base: production/main `34673b618540e015d9db0745e560e415cc2d8cca` (Santa belly-tap laugh, R13 motion and audio repair 2). Live production HTML was fetched and matched the baseline byte-for-byte during implementation. Branch: `experiment/holly-portrait-2026-11-13`.

**No production promotion.** All new files are under this experiment directory; `peach-physics/v8/` and every existing tracked file remain unchanged. Open `index.html?character=holly` to start in Holly's existing fourth slot. [Review gallery](review.html).

## Portrait provenance

The user's attached `1-Photo-1.jpg` is the sole source, 754×1280.

- Original SHA-256: `a8d269daecffe934aaa345727aa132bdeb070cb4a9747e936b451530a8ba1ea1`
- Integrated file: `assets/holly-heartbreaker.png`
- Final SHA-256: `f7267c4f7624ea17d2215251e0bdf63d3e1cbc59bb33e3b9bcaca7f81b486a58`

Only 1,827 pixels in the upper-left arrow/background patch changed. A deterministic local Poisson blend copies nearby background texture (offset −20,+55) into an elliptical mask centered at (56,27), radii (28,21). It does not generate or reinterpret the character. The lossless PNG preserves every decoded source pixel outside that patch exactly. No crop, resize, color adjustment, outfit, expression, anatomy or lighting change was made to the integrated artwork. Repair was inspected at full portrait size and 5× detail. `tests/clean-portrait.cjs` reproduces the repair from the attachment; `tests/artwork-results.json` records the hash and outside-mask equality check. PNG costs about 2.3 MiB; no lossy derivative is used in the app.

## Holly-only calibration

| Item | Replacement calibration |
| --- | --- |
| Interaction centers | Left (323,474), right (495,477), in original source pixels |
| Region radii | Left (85,76), right (80,77) |
| Spring nodes | Left (315,432), (323,474), (355,529); right (488,434), (495,477), (457,532), with new source-space influence radii |
| Split / side midpoint | .534–.553 / .544 |
| Vertical bounds | .303, .327, .464, .500 |
| Support texture | Crop (216,380,384,256); all skin, motion, touch and outer-edge contours retraced |
| Garment anchors | (320,536), (498,539); both fur lines independently retraced |
| Lower support | Fade begins y=558 over 28 px; lacing guards at x=388/439 with 20/22 px transitions |
| Framing | Aspect-preserving width fit with 12 px side clearance, head-safe top anchor, source y=1120 above bottom controls; landscape contains full image |

Strong Fabric B's existing architecture remains: independent skin channels and one supported garment vector per side. Canvas and WebGL use the same new dimensions, crop, split and anchors. The polygon/outer-edge masks provide the taper, so the generic taper pair remains `[0,0]` intentionally. Solver, spring timing, damping, presets, amplitude limits, gesture handling and R13 motion module are unchanged. The motion module remains byte-identical. No other character calibration or artwork changed; no Holly voice work.

## Isolation and preservation

The preview has its own manifest scope, cache prefix and preference namespace. Its worker cannot delete the production cache. R13 motion preferences use the existing storage adapter option to avoid writing the production motion key. Character profiles retain their independent behavior within the preview; existing production profiles are neither imported nor modified. Share links stay on the preview. Runtime files and assets are self-contained for offline use.

## Validation

- 180 Holly cases across WebGL/Canvas, Natural/Playful/Chaos, both sides, link 0/50/100: tap, drag, flick, synthetic shake and continuous auto-jiggle. Each moves, remains finite and resets to zero.
- 48 exact baseline comparisons: four non-Holly characters × six input kinds × two renderers. Spring traces and rendered frames match current production exactly.
- Actual pointer events on skin and garment targets on both sides: correct side, slow hold, release and cleared capture. Independent Holly profile survives character switching and reload; production-key sentinel remains untouched.
- Ten framing checks: both renderers at 375×667, 390×844, 430×932, 440×956, and 844×390. Face and meaningful upper thighs remain visible.
- Stress poses on both sides: 52,372 WebGL / 52,624 Canvas changed-pixel observations, **zero changes outside the support crop**, and exact resting canvas after reset.
- Real HTTPS service-worker install, offline reload and all-five-character switching passed in both renderers. Custom profile and auto-jiggle setting survive offline reload. Existing production cache and preferences survive preview installation. Fetched portrait hash matches the integrated file.
- Offline Web Audio reaches `running`; Santa's existing optional laugh starts and toggles off. Audio activation, Santa laugh functions and spring integrator were additionally checked source-identical to main.
- No browser errors in the suites. No app regression failures. An initial test-only hook typo (`hitRegion` instead of `pickSide`) was corrected before the suite ran.

Machine-readable results and reproducible tests are in `tests/`. Tests use the repository's existing Playwright harness, Chromium and sharp; no shipped test hooks. Serve the repository on localhost:8000 for `validate.cjs` and `capture.cjs`. `offline.cjs` expects the repository on local HTTPS port 8443. `package-evidence.cjs` compresses screenshots for the review gallery; it never touches the integrated PNG.

## Review recommendation / limitations

Ready for **iPhone review**, not production promotion. Review actual Safari touch feel, sensor permission/shake response, audio route and sustained Canvas frame rate on device. Automated checks use desktop Chromium with SwiftShader and forced Canvas, not iOS Safari or physical sensors. Offline installation works under tested HTTPS; CDN caching and iPhone Add to Home Screen should still be checked on the review URL. This remains a bounded 2-D photograph warp, not a cloth/volume simulation. Motion is visually subtler at the wider framing than at the old extreme zoom. No known functional regression was found.
