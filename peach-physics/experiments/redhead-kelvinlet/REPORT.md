# True 2D Kelvinlet experiment — result

**A convincing advantage over strength-matched A+ is not demonstrated. Do not promote B.** The implementation is a genuine 2D affine Kelvinlet and it produces the intended planar compression and lateral expansion. Those facts do not establish better apparent 3D mass in this photograph. The fixed silhouette, baked lighting and pinned garment transition still dominate the result; stronger taps produce visible texture strain in all three methods.

The 8/10 practical visual-preference standard is **not established**. Ten randomized, matched A+/B trials are available in the page, but no human blind votes have been collected or fabricated. My independent assessment from the rendered sequences is that B's more directional contact response is not a clear overall improvement over A+. This assessment is provisional: automated playback checks and inspection of sampled animation sequences are not a substitute for a human watching and scoring the actual animation.

## What was built

- Standalone A / A+ / B page with synchronized pairs, three-way viewing, individual iPhone-compatible focus view, full portrait and contact-detail framing.
- Genuine 2D Equation 26 affine-load field, verified against the derivative of Equation 25 and the supplement's pinch expression. Three-scale cancellation handles the long-range tail. [Full equations and code references](METHOD.md).
- The original A field and spring engine are imported unchanged from starting commit `0e9f3a1`. B preserves the original bulk spring blend. One simulation supplies every method.
- A+ changes only its local pressure multiplier; its strength is fitted to B after the fixed-mask backtrace, relative to a common bulk-only map.
- Immutable-source WebGL and Canvas sampling, the original skin masks, independent left/right interaction, exact rest restoration, and a deterministic 22-second sequence.
- Eight motion recordings: synchronized three-way recordings plus A, A+, B crops for each renderer. [Playback page](evidence.html).

Only `peach-physics/experiments/redhead-kelvinlet/` was added. Main, the original experiment, live r10, Holly, Santa, other characters, production selectors and deployment configuration were not changed. The existing JPEG remains byte-for-byte identical: SHA-256 `c8b9ec5fbc7a84e94b0f8618341b67a99d5587c35a548103c360e2ea706532d6`.

## Correctness and experimental control

| Check | Result |
| --- | --- |
| Eq.26 versus numerical derivative of the 2D Eq.25 kernel | Maximum absolute component error 6.06×10⁻¹¹ |
| Independent supplement Eq.14 pinch expression | Zero discrepancy at tested points |
| Normalized compound center gradient | diag(+1,−1), maximum error 3.66×10⁻⁹ |
| Three-scale cancellation | Weight sum ~−1.11×10⁻¹⁶; weighted ε² sum ~−1.14×10⁻¹³ |
| Far-field affine decay | Observed log₂ decay ratio approaches 4.976, consistent with O(r⁻⁵) |
| Original A field identity | Zero difference from original `Physics.field('A')` in sampled sequence frames |
| Spring/contact trajectory identity | Exact equality at all 2,640 fixed integration steps |
| Left/right interaction | Trusted Chromium simultaneous touch passed; second same-side contact ignored |

The affine pinch has zero displacement at its exact center, so “strength” cannot be matched by tip displacement alone. We use RMS pressure-induced inverse displacement in a 14px contact disk. A+'s fitted pressure gains ranged **2.424–2.599×** A, without changing timing, damping, bulk state or pressure sign.

On an independent offset sampling lattice after final guard/interpolation, the absolute relative RMS matching error averaged **0.513%**, with a **2.281% maximum**, considering active targets above 0.02px. No gain bound was reached. Directional residuals remain and are stored in [measurements.json](evidence/measurements.json): A+ is isotropic pressure, B is a directional pinch. Matching magnitude does not imply matching direction, peak displacement, support area or strain.

## Compression, expansion, gradients and strain

The final masked hold response was checked on both sides. At an 8px horizontal offset, B moved neighboring skin about **1.71px outward**; at an 8px vertical offset it moved about **1.71px inward**. At the left contact center, measured forward principal stretches were approximately **0.792× and 1.367×**. This confirms planar compression and expansion in the actual composed map. It is not volume preservation; even planar area is not preserved exactly by this finite composition.

Over the deterministic sequence, the measured maximum displacements were **15.70px (A), 16.02px (A+), 15.89px (B)**. Final inverse-map gradients include the mask, source-coordinate backtrace, interpolation, contour guard and WebGL map encoding. Refining the worst stronger-tap interval to 120 Hz and 1px spatial spacing produced:

| Final-map measurement | A | A+ | B |
| --- | ---: | ---: | ---: |
| Minimum det(inverse gradient) | 0.2936 | 0.3012 | 0.2863 |
| Minimum forward principal stretch | 0.3181× | 0.3118× | 0.3216× |
| Maximum forward principal stretch | 3.4883× | 3.4079× | 3.5784× |
| Maximum absolute symmetric forward shear, sequence sampling | 0.9574 | 0.9419 | 0.9707 |

**No sampled foldovers occurred, but excessive local strain is a failure, including for B.** It appears in a narrow pinned support band during the stronger tap. The total-velocity cap and a candidate guard prevent new methods from materially worsening baseline strain; no guard fallback occurred in the recorded sequence. They do not eliminate the original baseline's absolute strain problem. Repairing that bulk composition would break the instruction to preserve A exactly. The experiment therefore does not claim that the “prevent excessive strain” objective has been achieved merely because determinants remain positive.

[Composed-field figure](evidence/field-quality.png) · [Refined measurements](evidence/refined.json) · [Hold probes](evidence/local-response.json).

## Rendered appearance and protection

The recordings cover light and stronger taps, sustained hold/release, repeated contact, inward/outward drags, upward/downward flicks, simultaneous touches and complete recovery. B's hold produces a more directional local deformation than A+. It does not create new shading, actual depth or a changing silhouette. During stronger impulses, the freckles and skin shading still stretch within a stationary outline; the narrow skin-to-fur transition remains the weak point. This is a negative visual result, not an improvement justified by larger motion.

Protected-region pixel tests used three drag locations, including one near the inner/lower boundary, at a 390×844 viewport with DPR 2:

- **Canvas:** zero changed protected channels, including the checked near-boundary region.
- **WebGL:** maximum protected-channel delta **1/255**, with zero pixels exceeding a delta of 1. This is a raster/quantization tolerance, not a claim of byte-exact protected pixels during motion.
- **All three methods, both renderers:** exact resting pixels restored after settling; no differing channels.
- The captured hair, fur, corset, lacing, center boundary and scenery remain stable within those limits. No detached patch or hard compositing seam was identified in the inspected sequences.

WebGL and Canvas use the same field but different raster filtering. Across aligned captured portrait frames, worst whole-portrait RGB mean absolute difference was **0.2195/255**. Worst motion-residual RGB RMSE, after subtracting each renderer's resting image, was **0.2094/255**. Fine-detail differences remain; they are not pixel-identical renderers. [Consistency data](evidence/consistency.json).

## Performance

An uncontended real-time run used headless Linux Chromium with **SwiftShader software WebGL**, with no screenshots during timing. These are environment findings, **not physical iPhone or Safari measurements**:

| View | WebGL observed fps | Canvas observed fps |
| --- | ---: | ---: |
| 390×844, DPR 2, one method | 39.0 | 12.0 |
| 390×844, DPR 2, paired methods | 37.8 | 10.9 |
| 1440×1080, DPR 1, three methods | 32.5 | 7.6 |

Canvas is functional but too slow in this environment for a natural real-time feel. At low frame rates the inherited 65ms accumulator cap also loses wall-clock simulation time: the desktop Canvas run advanced ~1.575 simulated seconds in ~3.555 wall seconds. WebGL also showed frame-time variability. The recordings use fixed simulation time and must not be presented as proof of this runtime speed.

All methods are computed for matching and safeguards even in single view, adding CPU work. This experiment does not optimize that away or introduce a different solver. WebGL unavailable/context-loss fallback was tested. [Detailed performance](evidence/performance.json).

## Evaluation limit and disposition

The page implements balanced randomized left/right assignments, ten matched clips, replay, “No preference,” locked voting during playback and a JSON vote export. No actual preference result is asserted. A real observer must watch the animation to establish the requested 8/10 result; numerical strain, image differences, frame sheets and synthetic UI interaction cannot supply those votes.

This is one fixed-parameter test, not a search over Kelvinlet radii, Poisson ratios or force orientations. A different design might improve a different image, but this experiment supplies no evidence for replacing the existing warp. The correct 2D formulation gives a real local elasticity effect while the photographic composition still limits convincing apparent mass. **Stop here; do not promote or keep tuning without new visual evidence.**
