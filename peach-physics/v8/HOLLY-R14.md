# R14 — approved full-screen Holly, Auto Jiggle on, +10% Holly motion

The user approved the full-screen portrait at `07bfc168072e537984b469fb358bf315a781b8c2` and explicitly requested production promotion, Auto Jiggle enabled, and 10% more jiggle. This release starts from current production/main `34673b618540e015d9db0745e560e415cc2d8cca` and preserves the R13 motion solver, audio activation repairs, Santa belly-tap laugh, other characters, and independent profiles.

## What ships

- The approved 754×1280 cleaned portrait, source-space calibration and full-screen portrait framing. Fourth slot and name remain Holly Heartbreaker. Portrait cover fit has no blurred top/bottom bands or stretching; landscape retains the approved contained composition.
- Holly's rendered displacement vector is multiplied by **1.10** in both WebGL and Canvas, including the garment carrier. This increases taps, drag/flick, shake and auto motion without changing spring trajectories, frequency, damping, presets or timing. Its existing soft maximum scales from 24 to 26.4 source pixels. Other characters' displacement and calibration are unchanged.
- Auto Jiggle is enabled on fresh installs and once on upgrade, including an older saved Off setting, as requested. The existing options record gains `autoDefault: "holly-fullscreen-v1"`. Subsequent On/Off choices persist normally. The saved Shake preference is preserved and still requires user activation/permission; sound is not enabled automatically.
- Normal production preference keys, manifest, sharing and worker scope are used. Preview keys are never imported. Existing per-character custom settings and selected character survive upgrade.
- No Holly voice work or other audio changes.

## Artwork integrity

`assets/holly-heartbreaker.png` SHA-256:

`f7267c4f7624ea17d2215251e0bdf63d3e1cbc59bb33e3b9bcaca7f81b486a58`

It is byte-identical to the approved preview. The authoritative attached JPEG's SHA-256 was `a8d269daecffe934aaa345727aa132bdeb070cb4a9747e936b451530a8ba1ea1`. Only the 1,827-pixel arrow/background patch was repaired; decoded source pixels outside it were unchanged. The previous JPEG is retained as a historical asset but is no longer loaded or precached. All other character artwork is unchanged.

[Approved framing and calibration evidence](https://raw.githack.com/zy65h95wjn-netizen/shop-fractions/07bfc168072e537984b469fb358bf315a781b8c2/peach-physics/experiments/holly-replacement/review.html)

## Offline upgrade correction

Cache: `peach-physics-v008-r14-holly`, containing the same eight resource roles with the new Holly PNG.

The first upgrade test exposed a pre-existing race: a retired worker's in-flight fetch can recreate its old cache after activation deletes it. The global `caches.match` fallback could then select the old HTML during offline reload. R14 keeps network-first behavior but reads offline responses only from its own completed cache. The test explicitly recreates stale old HTML after activation and verifies that the new release still loads offline. Other application/release caches remain untouched.

## Validation

- `tests/artwork.cjs`: all five approved artwork hashes verified.
- `tests/motion-unit.cjs`: 56 existing motion checks passed.
- `tests/holly-release-regression.cjs`: 48 exact non-Holly trajectory/render comparisons; 72 Holly cases preserve approved spring trajectories across all presets, both sides, tap, drag, flick, bounce, shake and auto; 48 displacement samples verify exact ×1.10 gain. Approved Holly framing matches exactly. Audio, Santa, spring integrator and R13 motion-controller core are source-identical to production.
- `tests/holly-release-capture.cjs`: strong poses in both renderers stay inside the support crop (96,774 WebGL / 97,154 Canvas changed-pixel observations; zero outside). Reset restores the exact resting canvas. [WebGL motion](tests/captures/holly-r14/webgl-tap-motion.webp), [Canvas motion](tests/captures/holly-r14/canvas-tap-motion.webp), [regions](tests/captures/holly-r14/regions.jpg).
- `tests/holly-release-upgrade.cjs`: real service-worker upgrade in both renderers on a secure localhost origin, with the new image deliberately delayed to verify atomic installation. Offline reload and all-five-character switching, every custom profile, Auto-on migration/fresh defaults, subsequent saved Off/On, preserved Shake preference, and Santa sound activation/belly laugh all passed. Stale retired-cache responses are explicitly injected. No browser errors.

Desktop Chromium/SwiftShader and forced Canvas are automated coverage, not a physical-iPhone performance or audio-route measurement. The full-screen composition was user-approved on iPhone; the additional 10% motion change still benefits from hands-on review. Production URL: https://zy65h95wjn-netizen.github.io/shop-fractions/peach-physics/v8/?character=holly

Rollback baseline: `34673b618540e015d9db0745e560e415cc2d8cca`. If a rollback is needed, use a new cache revision rather than reusing an old cache name; retain the cache-scoped offline fallback.
