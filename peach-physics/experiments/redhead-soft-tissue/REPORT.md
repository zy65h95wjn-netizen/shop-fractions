# Redhead soft-tissue prototype — findings

**Acceptance answer: No. This experiment does not demonstrate that this character is a visibly better platform than Holly under the same general 2D image-warp constraints. B is not clearly better than A overall.**

B gives a more localized contact response and less uniform movement across the skin. In the captured phases, that difference is subtle. It does not convincingly create additional volume, weight or a new silhouette. This is a useful isolated test, not a candidate for promotion to the live character selector.

## What changed

- New standalone page under `peach-physics/experiments/redhead-soft-tissue/`, based on live r10 commit `4673895`.
- Original attached JPEG copied byte for byte; no generation, retouching, re-encoding or replacement artwork. Full-portrait framing is available; upper-body framing only changes the viewport.
- Independent left/right pointers, taps, repeated taps, directional flicks, drags and spring recovery. A shared simulation sends identical input and state to both views.
- A/B buttons, simultaneous comparison, renderer selection, reset, optional contour guides and a repeatable 15-second sequence.
- Both renderers use the same sampled inverse displacement field. WebGL samples the original texture with a 16-bit displacement map; Canvas bilinearly samples the original JPEG pixels and composites at source resolution before scaling. Canvas is also the automatic fallback.

## The control and experiment

**A — baseline:** adapted r10 Holly three-node-per-side spring blend, including its 65% center / 35% local field, pressure term, lagging follower, soft displacement cap and six-step fixed-envelope backtrace. Spring constants use Holly's natural preset. Nodes and masks are calibrated to this portrait. Cross-side transfer is zero in both modes to isolate left/right behavior.

**B — experimental:** the same spring state and input, with a 22% center / 78% local blend, narrower contact compression, a delayed surrounding radial expansion and a small load-dependent lateral response. This is a bounded 2D approximation, not a volume-conserving tissue solver.

Both modes pin the garment, fur, hair and the central boundary; motion tapers over a 17-source-pixel inward support band. This intentionally conservative support differs from live Holly's moving structured-fabric treatment. A is a current-style control calibrated for this image, not a pixel-identical port of every Holly garment effect. Consequently the Holly comparison is qualitative, not a controlled character-swap benchmark.

## Rendered appearance

| Test | Observation |
| --- | --- |
| Light taps | Small, restrained recovery in both. B's contact compression is more local, but the visual improvement is slight. |
| Repeated taps | B varies the local texture motion more. Neither gains convincing new volume; stationary highlights remain a limitation. |
| Upward flick | Visible rebound with protected hair and trim. Stronger displacement still reads partly as skin texture sliding inside a fixed outline. |
| Inward / outward drags | The most revealing weakness: freckles compress or spread near the contact and support band. B redistributes that strain but does not eliminate it. |
| Simultaneous contacts | Left and right respond independently. Neither entire chest nor garment translates as one patch. |
| Settling | Damped recovery, with exact resting pixels restored in the checked full-portrait render. |

No obvious fur-edge break, detached patch, hard compositing seam or background movement appeared in the inspected captured phases. The remaining distortion is principally **local skin-texture stretching near contact and the pinned lower/inner boundaries**. The fixed cleavage, baked-in shading and unmoving fur restrict apparent depth. Bilinear resampling slightly softens moving fine detail. The same limitations appear in Canvas and WebGL; their raster sampling produces minor pixel differences.

The redhead's exposed skin and visible freckles help reveal localized strain. Her overlapping hair also reduces the safe moving area, and the ornate garment makes leakage especially conspicuous. The read-only Holly r10 reference still has a credible supported response. The redhead does not show a clear visual advantage sufficient to recommend replacing or promoting her over Holly.

## Validation and evidence

- [WebGL A/B motion](evidence/webgl-ab.mp4) and [Canvas A/B motion](evidence/canvas-ab.mp4): actual browser screenshots encoded at 24 frames per simulated second, with identical deterministic inputs. Each covers all requested gestures and recovery.
- [A/B sampled frames](evidence/comparison.jpg), [Canvas sampled frames](evidence/canvas-comparison.jpg), and [unchanged Holly r10 reference phases](evidence/holly-reference.jpg).
- [Sequence results](evidence/results.json): renderer selection, pointer routing/cancellation, bounded displacement, positive sampled map Jacobian, settling and mobile layout checks.
- [Additional rendered validation](evidence/validation.json): trusted Chromium two-touch input; automatic Canvas fallback on unavailable/lost WebGL; **zero changed protected-region pixels** in the checked full-portrait drag (RGB difference threshold greater than 1); **zero differing channels after settling**, in both renderers.
- Original-file SHA-256 matches the attachment: `c8b9ec5fbc7a84e94b0f8618341b67a99d5587c35a548103c360e2ea706532d6`.

Visual judgment is based on captured rendered phase sequences, alongside the provided motion recordings. Validation used desktop Chromium with software WebGL and mobile viewport/touch emulation; no physical iPhone, Safari or real-device frame-rate validation was performed. Fixed-time recordings demonstrate motion, not sustained rendering performance. The protected-pixel check covers its recorded drag; it is not a proof for every possible browser or gesture.

## Scope and disposition

Only this experiment directory was added. Live r10, Holly, Santa, other characters, production selectors and deployment configuration remain unchanged. The experimental branch is pushed normally, and an immutable-commit static preview can be served through rawcdn.githack.com without deploying to production.

Stop at this prototype. The result does not justify additional tuning or production integration on the present evidence.
