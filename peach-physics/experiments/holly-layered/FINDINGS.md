# Holly rendering reconstruction: findings and stop decision

## Verdict

**Do not replace published v8.** This is a working layered feasibility experiment, not an accepted visual fix. It demonstrates that the existing spring state can drive skin, attached fur and upper cup together without fixing the free perimeter. It also makes the missing image information visible. The pink strips are deliberate diagnostics and fail the no-holes acceptance criterion.

A convincing approximation may be possible with authored reconstruction. The original JPEG alone cannot recover the true hidden surfaces or produce a clean, moving silhouette while simultaneously preserving every surrounding photographic detail. This is an image-information limitation, not a reason to tighten the mask. No amount of spring tuning would recover those pixels.

## Investigation

Inspected the untouched 720×1280 JPEG, r4 (`f582612`), r5 (`8eb02d3`), r6 (`ddf3456`), their skin/motion/touch masks, CPU/GL deformation paths, historical phase sheets and edge-test logic. The r5 change extends the right motion envelope; r6 adds traced outer guards, a two-source-pixel stationary inner border and asymmetric inward feathering. `holly-edge.cjs` explicitly rewards right perimeter travel below 60% of r5. That is containment evidence, not natural-deformation evidence.

The established measurements — left outer travel below 0.1 → 10.2 CSS px and right outer travel 9.0 → 1.4 CSS px — are feature-specific results from the earlier suite. This experiment does not reinterpret reduced movement as improvement or use those reductions as a pass condition.

Skin input, upper-cup input, and the user's green targets are separate from the visual matte. Green targets map to the corresponding spring center with a constant gesture offset. The experiment keeps that entire mapping, pointer capture, contact feedback and multi-pointer logic intact.

## What changed

Only this isolated directory was added. Three generated runners retain the original releases, plus a renderer dispatch adapter. The layered mode is opt-in on the r6 runner. It uses:

1. The unchanged photograph as the resting composition and source texture.
2. A moving left material group and a moving right material group. Each contains visible skin, attached fur and upper cup, sharing one coordinate map. This prevents an internal skin/fur seam; it is not yet a six-layer, artist-authored skin/fur/garment rig.
3. A separate stationary foreground ownership mask above the fur for the upper hair. Arms and loose hair behind the cup remain stationary in texture coordinates but may be occluded by an advancing silhouette. Occlusion is not background deformation.
4. An explicit missing-source compositor. Old silhouette coverage uncovered by the new silhouette becomes pink hatching. It never reuses the old fur border as a backing plate and never stretches neighboring hair or arm pixels into the gap.

The flow takes the existing `hollyVelocity` result, including its existing central/local blend, followers, contact response and 24-source-pixel soft limit. A C2-continuous attachment field ramps from the neck at y=374–446, toward the lower corset at y=550–658, and into the center fastening over 42 pixels. The outer material outline is **not** a zero-motion boundary. Eight midpoint integration steps are sampled on a four-source-pixel grid. WebGL decodes two packed 16-bit displacement textures; Canvas bilinearly samples the same CPU maps. All positions are in original-image coordinates.

The field is spatially varying, not rigid patch translation. It still introduces 2D strain, especially near support transitions; a positive determinant only excludes sampled folds, not unnatural stretching or flattening. That distinction is retained in the assessment.

## What remained untouched

- Original Holly JPEG SHA-256: `0ad0a1cad2273d038b1953587ecfd43857897f7627c91d8f2a02a989ffe2ba97`.
- All other original portrait bytes and every existing repository file.
- Fixed-step solver, timing, stiffness, damping, presets, spring-node limits, gesture gains, linked coupling and saved production settings.
- Winter Ember, Midnight Yule, Aurelia Frost, published v8 and all earlier releases.

The lab uses its own preferences, registers no service worker, and links to no production install manifest. No Santa, Auto Jiggle or unrelated feature was added.

## Missing source information and required artwork

The JPEG stores a single composited color at each fur tip and hair strand. It contains neither a clean alpha nor the background color that contributed to a mixed edge pixel. Moving the composite color carries a fringe of its old background. Likewise, a newly exposed region has no recorded backing surface.

Approximate source corridors needing authored coverage:

| Corridor | Original coordinates | Missing information |
| --- | --- | --- |
| Left hair/skin overlap | x=236–326, y=380–470 | Skin beneath stationary hair, strand opacity and hidden hair continuation |
| Left free fur/cup silhouette | x=208–261, y=470–622 | Hair/arm and small scenery gaps behind fur/cup; subpixel fur alpha |
| Right hair/skin overlap | x=500–577, y=380–476 | Skin beneath hair, exact strand ownership and underlap |
| Right free fur/cup silhouette | x=519–607, y=476–628 | Arm/hair behind cup, fur-tip matte and previously hidden cup-side texture |
| Cup-to-bodice support | y≈550–658, excluding center fastening | Garment attachment and texture below a moving raised cup; changing fold/shadow information |

Provide a registered layered source at the same composition (preferably higher resolution): clean backing/torso plate; left/right skin with at least 32 original-pixel underlap; fur with unassociated alpha and decontaminated edge colors; upper cups with seam/attachment guides; foreground hair/arm mattes; and fixed lower clothing. The 32-pixel margin covers the existing <24-pixel motion with registration/filtering allowance. The plate is needed only in the swept, uncovered regions, not as a replacement for the full original portrait.

Lighting, volume revealed by rotation, and changing contact shadows are also absent. A depth/normal guide or a short neutral/offset source sequence would support larger convincing motion. A layered repaint can be plausible; it cannot be verified as the original hidden anatomy, garment or scenery.

A backing-plate image-generation attempt was rejected by the image tool's safety filter. No generated plate was returned, no alternative image-generation route was attempted, and no artwork was silently invented. The working experiment therefore exposes the missing regions explicitly. The hand-traced matte remains provisional: fine fur and hair can still carry photographic fringe. A few stationary-pixel samples cannot establish that every strand is cleanly separated.

## Evidence and assessment

See [the lab page](index.html), [WebGL video](evidence/comparison-webgl.mp4), [Canvas video](evidence/comparison-canvas.mp4), [WebGL phases](evidence/phases-webgl.png), [Canvas phases](evidence/phases-canvas.png), [field diagram](evidence/field.png), [recorded states](evidence/states.json), and [raw metrics](evidence/metrics.json).

The three columns receive identical unrounded spring states at identical sizes: 375×667, 390×844, 430×932, and 440×956 CSS px, DPR 2. Natural preset, linked movement 0, independent left/right taps. Impact is t=0 immediately after the original slap operation. Peak is the largest central-node vertical displacement in the first 0.75 seconds; rebound is the largest opposite displacement thereafter within 1.5 seconds. Settled is t=8 seconds. The videos run the first 1.5 seconds at 30 fps, with labeled rest/settled holds; capture wall time is not playback time. Viewport-specific sheets are also included.

| Criterion | Result / human review still required |
| --- | --- |
| Shared skin/fur/cup motion | One continuous map per side removes the intentional fixed outer border. Peak/rebound frames show edge travel. Judge shape, fur attachment and lower-cup strain in motion; not approved. |
| Free silhouette without holes or fringes | **Fail / blocked on source art.** Pink strips identify newly uncovered pixels; provisional JPEG mattes cannot guarantee clean fur/hair tips. |
| Stationary adjacent features | Selected hair, arm, background and fixed-clothing features outside the swept silhouette remain fixed. Fine boundary hairs still need authored separation and human inspection. |
| Resting composition | Compare original-release and prototype pixels, plus exact reset, at all four sizes on both backends. See measured results below. |
| Independent/linked behavior | Exact state comparisons cover direct/green tap, drag and flick, both sides, Natural/Playful/Chaos, link 0/50/100. Opposite side stays at rest for link 0 and responds for 50/100. Synthetic simultaneous pointer capture checked; physical touch remains untested. |
| Stretching / flattening | Field determinants and singular values are reported, not treated as proof of natural shape. The 2D approximation still changes local texture scale at support transitions. |

No test requires reduced perimeter movement. Visual acceptance must examine the entire motion cycle and both sides, not just static extreme poses or unaffected pixel boxes.

## Resource implications and physical iPhone

This feasibility implementation prioritizes inspection and shared coordinates over production efficiency. The r6 renderer remains allocated, while an overlay canvas owns the experimental renderer. Static image/matte data and field grids are cached; identical resting states skip the experimental draw. There is no per-frame image loading, readback of the live GPU framebuffer, or allocation of a new full portrait texture.

The extra decoded source uses about 3.52 MiB; the matte about 0.64 MiB; CPU flow/velocity/packing arrays about 0.28 MiB. WebGL adds another original-photo texture, matte texture, two ~42 KiB field textures and a ~138 KiB mesh. At 390×844 DPR 2, each RGBA framebuffer or full Canvas cache is about 5.02 MiB. Total memory exceeds these lower bounds because browser backing stores, the original renderer, GPU buffers and temporary Canvas crops coexist. Generated HTML runners also duplicate the two earlier embedded portraits, about 1 MiB per runner, for baseline isolation.

Measured render timings below are desktop synchronous JavaScript/Canvas work and GL submission, excluding screenshot readback and full GPU completion. They are not iPhone fps measurements. A production integration should share one context, reuse Canvas work buffers, and move the field evaluation to an appropriate GPU path; none of that is required to establish the current missing-art limitation.

Still required on physical iPhone: Safari GPU/backend behavior, sustained frame time and thermals, real two-finger capture, pressure conventions, safe areas, interruption/context recovery and perceived attachment/rebound. This experiment intentionally has no offline installation flow. Human visual approval and a valid backing/matte package must precede any publication as v8.

## Measured results

<!-- RESULTS -->

- Chromium **156.0.8078.79**, Linux SwiftShader, device scale factor 2.
- **108 exact unrounded trajectory comparisons**: 3 presets × 2 sides × 3 link values × 3 gesture types × direct/green targets. No browser exceptions. Link behavior and synthetic simultaneous capture also pass.
- **Resting pixels match r6 exactly**: zero changed channels on both backends at all four sizes. All r5/r6/layered reset captures return exactly to their own resting image.
- **112 sampled fields**, including natural contact/peak/rebound and four extreme direction poses on each side at every size/backend. Minimum inverse-map determinant **0.4877**; maximum sampled travel **23.59 source px**. Inverse-map singular values range **0.439–2.222** over this matrix. No sampled folds were found, but those extreme strains are substantial and are **not a natural-deformation pass**.
- All **56 corresponding WebGL/Canvas field pairs match exactly**. The 390-wide phase crops differ by about 0.40–0.43 mean 8-bit channel units; the 99th percentile is 3. Pixel parity is not exact: high-contrast pink stripe boundaries can differ by up to 180 channel units from subpixel thresholding. See [backend parity data](evidence/backend-parity.json). These diagnostic differences are not photographic reconstruction.
- Right-side Natural peak exposes approximately **920 source pixels** with missing coverage above 0.5 alpha; the widest horizontal uncovered run in that pose is **21 source px** (about 11.4 CSS px at 390-wide framing). This is one pose, not an upper bound over every gesture.
- Both peak samples occur at **0.100 s**. First opposite extrema are **0.308 s left** and **0.292 s right**. Complete-rest captures use **8 s**.

| Backend / renderer | Median render work | p95 | Maximum |
| --- | ---: | ---: | ---: |
| WebGL r5 | <1 ms | 1 ms | 3 ms |
| WebGL r6 | <1 ms | 1 ms | 1 ms |
| WebGL layered | 19 ms | 24 ms | 27 ms |
| Canvas r5 | 14 ms | 20 ms | 24 ms |
| Canvas r6 | 14 ms | 20 ms | 34 ms |
| Canvas layered | 90 ms | 103 ms | 120 ms |

Each timing row samples 92 changing-state renders at 390×844 DPR 2. Clock resolution is 1 ms; zero means below that resolution. GL numbers are submission/CPU work, not completed GPU frame times. **The prototype is too costly to assume smooth physical-iPhone playback**, especially Canvas. The lab's identical-state cache avoids idle recomputation but does not solve active-frame cost.

The final Canvas run contains 421 assertions including the shared input checks. The completed WebGL matrix was retained after a Canvas-only sampling correction; `metrics.json` records that provenance. Matching the original WebGL UV mesh and the original Canvas cache sampling eliminated initial rest-sampling discrepancies without changing any physics.

Final delivery checks additionally cover unchanged solver/input/velocity source blocks, production preference isolation, dispatch back to all three legacy character renderers, redraw after simulated WebGL context loss/restoration, and working local review links. These desktop checks do not substitute for physical-iPhone testing.
