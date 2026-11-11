# Holly source-layer reconstruction: findings

## Decision

**Do not accept this as the visual fix.** Local deterministic cloning can provide photographic coverage where the earlier renderer showed pink gaps. It does not establish a believable skin/hair/fur junction or a naturally attached cup throughout motion. The committed images deliberately retain the remaining defects.

This is a bounded source-repair experiment on `55fdcd55bd74b33345c4b2fb6e2a1f1379041319`, not a release. A convincing result from this flattened photograph alone has **not** been demonstrated. Better authored layers are required before claiming success; even those layers may reveal that the existing 2D garment mapping needs separate future work. No tighter movement mask, reduced perimeter travel or changed spring setting is used to hide that limitation.

## Matched visual assessment

The [review index](evidence/README.md) contains eight lossless before/after pairs, sixteen individual PNG crops and four compact temporal sheets. Both backends use the same original recorded left/right inputs and states, at 390×844 CSS pixels, DPR 2. Peak is 0.100 s; rebound is 37/120 s on the left and 35/120 s on the right. Temporal rows include impact, loading, peak, return, exact rebound and the actual recorded 8-second settled state. Reset is tested separately.

| Pose | What the reconstruction changes | Remaining visible failure |
| --- | --- | --- |
| Left peak | Supplies skin beneath the stationary upper hair and backing at the moving fur edge. | A conspicuous pale wedge/ribbon runs into the hair above the fur. The inferred skin texture and estimated hair/fur alpha do not form a believable junction. |
| Right peak | Replaces the triangular missing-coverage area beside the shoulder/upper garment. | A pale projecting wedge remains at the outer upper fur corner. Edge color and depth ordering at the hair/skin/fur transition are still artificial. |
| Left rebound | Supplies backing behind the receding outer cup and lower seam. | A narrow dark/gold edge and texture discontinuity follow the outer/lower cup. Its contour and apparent attachment to the fixed bodice remain strained. |
| Right rebound | Covers the diagnostic strip beside and below the cup. | The inferred arm/hair backing, cup boundary and fixed lower garment do not read as a clean continuous seam; an edge fringe/contour mismatch remains. |

The same characteristic failures are visible in WebGL and Canvas. This is not evidence of a backend-specific clipping bug. There is no exposed pink diagnostic hole in the repaired photographic views, but a filled pixel is not proof that the correct hidden material or occlusion was reconstructed. Matte halos, seams, texture strain and disconnected garment motion still fail the intended visual criteria.

The temporal sheets expose the defects between the extrema as well. Review the hair/fur junction, fur-tip continuity, outer cup shape, underwire/lower seam and fixed adjacent hair/arm through the whole cycle. An attractive rest frame or positive field determinant cannot substitute for that assessment.

## Reconstruction performed

All work is confined to the new `reconstruction/` directory. The untouched 720×1280 JPEG supplies a 496×336 source region at `(160,352)`. The generated files preserve that registration.

1. Separate left/right material mattes use traced outline and cup-seam guides with local color projection in a narrow uncertain boundary band. Photographed fur tips extend beyond the smooth guide and are included explicitly. These are estimated JPEG mattes, **not recovered ground-truth alpha**.
2. Skin extends approximately 36 source pixels under stationary upper hair. Donors come from observed skin on the same side, constrained above the fur. Donor formulas and guides are retained in [build_art.py](build_art.py) and [provenance.json](assets/provenance.json).
3. Separate backing plates reconstruct only a roughly 28-pixel corridor under receding edges. Outer donors come from adjacent hair/arm pixels; lower-seam donors come from bodice texture below the photographed cup. They are photographic clones, not verified hidden surfaces.
4. Garment/fur color padding removes some baked-in background color from moving translucent texels. Upper-cup ownership ends at a traced seam; the lower bodice stays in the stationary plate. The skin, fur and upper cup on each side still share the **unchanged** coordinate field.
5. A separate upper-hair foreground matte preserves stationary overlap. Arms and hair behind the moving silhouette remain stationary in source coordinates and can be covered by it. The estimated fine boundary does not prove correct strand-by-strand foreground ownership.
6. Moving RGB is premultiplied before filtering. WebGL and Canvas composite the difference between the warped material and its resting material over the original photograph, using the inferred backing to replace changing coverage.

The rest-relative composition preserves the original at zero movement. It also retains any residual mismatch among the original flattened pixel, matte, material and backing. That residual can become a stationary halo or doubled-looking edge during movement. Premultiplication prevents one class of filtering fringe; it cannot recover the missing foreground/background colors or solve a wrong matte.

The source-layer atlas and inferred-region map explicitly identify the invented pixels. There is no full-frame repaint, generated-image model, spring adjustment, displacement reduction or portrait overwrite. Rebuilding the assets twice reproduced all twelve generated asset files byte-for-byte.

## What the evidence verifies

- The eight before/after left/right peak/rebound **Float32 field pairs are byte-identical** across both backends. Recorded node states also match exactly. The new renderer inherits `updateFields` and `map` from the original class.
- Resting before/after captures have **zero changed channels** on both backends. Returning to reset reproduces each renderer's own initial PNG bytes exactly.
- Nine selected stationary source locations, sampled in each of eight posed images, have zero channel changes. They cover surrounding hair, arm, background and lower clothing outside the swept boundary. This is a limited check, not a certificate for every boundary strand.
- Both requested backends ran with no browser exceptions. Native crops reproduce the captured pixels exactly; no resize is applied. All 29 review images decode successfully and remain under 700 KiB.
- The original JPEG SHA-256 remains `0ad0a1cad2273d038b1953587ecfd43857897f7627c91d8f2a02a989ffe2ba97`. Existing tracked files, earlier evidence and releases are unchanged.

The existing motion diagnostics are preserved, including the following values in source-pixel coordinates. These are inverse-field measurements over the sampled region, **not garment-specific visual acceptance scores**.

| Pose | Maximum sampled travel | Minimum determinant | Inverse-map stretch range |
| --- | ---: | ---: | ---: |
| Left peak | 19.465 px | 0.6406 | 0.594–1.606 |
| Right peak | 19.141 px | 0.6217 | 0.595–1.604 |
| Left rebound | 7.570 px | 0.7789 | 0.778–1.229 |
| Right rebound | 7.800 px | 0.7705 | 0.769–1.236 |

Positive determinants exclude the sampled folds; substantial local scale changes remain. Replacing the backing does not remove those changes. `missingBacking:false` in the new renderer's diagnostics means a backing texture is present, alongside `backingIsInferred:true`; it is deliberately **not** a passing assessment of its content.

## Missing source information and precise art request

A flattened JPEG records one mixed color at each hair or fur edge. It does not record strand opacity, clean strand color and the hidden color behind it separately. Sampling a neighboring strand or skin patch cannot uniquely recover those values. It also cannot supply the hidden side of the cup, its underwire thickness, or changes in contact shadow and folds as the cup moves.

The next viable source package should be registered to this exact composition, preferably at higher resolution, with at least 32–36 original-pixel overlap around moving edges:

| Required layer | Where and why |
| --- | --- |
| Clean left/right skin underlap | Under the upper hair: approximately left x=236–326, y=380–470; right x=500–580, y=380–480. Needs continuous skin tone, texture and shape beneath the hair and up to the fur junction, without cloned fur. |
| Separate foreground hair with true alpha | The same upper overlap plus strands crossing the outer fur/cup. Distinguish strands in front of the skin/cup from hair behind it; provide clean strand colors independent of the photographed background. |
| Clean stationary torso/arm/hair backing | Swept corridors around the left free edge, approximately x=200–280, y=450–640, and right edge x=520–630, y=460–640. Needs the actual arm boundary, hidden hair continuation and small scenery openings, without the old fur/cup silhouette baked in. |
| Separate left/right fur trims | Decontaminated RGB and fractional alpha, including individual tip coverage and an inner underlap where fur meets skin and cup. Exact fine alpha cannot be extracted uniquely from this JPEG. |
| Left/right upper cups plus fixed bodice underlap | Continuous side-panel and underwire texture across the traced lower seams (roughly y=550–630), with overlap behind a lifted cup and clear attachment guides toward the central fastening. Include actual seam thickness and shadow ownership. |
| Pose/depth reference for the garment | Neutral, matched peak and rebound artwork, or a depth/normal and seam guide, showing how cup volume, folds and contact shadows should change. A single static texture cannot validate the remaining apparent flattening/stretching. |

A skilled repaint can make a plausible approximation; it cannot be described as recovery of the original hidden pixels. The present deterministic reconstruction is insufficient. If an authored package still shows unacceptable cup strain under the preserved field, garment deformation/attachment must be evaluated as a distinct follow-up instead of hiding it with narrower mattes.

## Scope, cost and remaining validation

Original artwork, springs, timing, stiffness, damping, presets, gesture gains, direct/green targeting, linked coupling, other characters, `main`, published v8 and earlier releases remain untouched. The earlier experimental renderer and all its evidence are preserved. No release or preview is deployed.

The new runner loads four 496×336 PNGs totaling **475,588 bytes**: ownership, backing and two premultiplied materials. Their decoded CPU arrays occupy about **2.54 MiB** in addition to the inherited renderer's allocations. WebGL adds three RGBA textures (about **1.91 MiB**) and replaces the existing matte texture, using seven texture units in total. Browser decode buffers, framebuffers, the retained original renderer and temporary canvases add further memory. The flow grids and spring state are unchanged.

Canvas still performs per-pixel bilinear composition on the CPU. The matched run recorded roughly 21–49 ms of WebGL submission/CPU work and 103–125 ms of Canvas work for the four after poses on this desktop. These sparse, capture-session timings are not a controlled performance benchmark, completed GPU timings, iPhone fps or a claim of improvement. The prototype remains too costly to assume smooth phone playback.

Physical iPhone Safari, real multitouch/linked interaction, sustained frame time, thermals and GPU/context behavior have not been checked for this repair. Cass's visual review is still needed, but the known wedges and cup-edge defects already prevent acceptance. The experiment stops with this evidence and the explicit source-art request.
