# Holly: artwork compatibility findings

**The problem is both artwork and calibration, not front-facing orientation alone.** The current portrait is still a useful identity/composition source, but this review does not establish it as an acceptable untouched texture for the requested coordinated skin/fur/cup movement. No calibration-only fix passed visual review. A localized costume/hair revision is the smallest next proposal; its sufficiency remains unverified because no edited image was returned by the image tool.

## Why the established characters are easier

The [portrait overview](evidence/portrait-context.jpg), source-support overlays and independently captured motion sheets show the following differences. Each established character uses her own unchanged Natural preset; these are visual studies, not an assertion that all characters share identical parameters.

| Character | Geometry and surrounding art | Why the existing deformation reads more coherently |
| --- | --- | --- |
| Winter Ember | Broad, relatively uniform skin regions below the garment. Long hair ends well above the active region. Garment hem and stocking boundaries sit at the support transitions. | Most visible deformation is inside skin; it does not have to carry a fur neckline and boned cup across foreground hair. The broad, low-detail surfaces tolerate the feathered warp. |
| Midnight Yule | Hair remains on the upper torso, away from the moving regions. The left traced support excludes upper fur; the right elliptical field includes some upper fur and garment. | This is a useful example of fur participating in the established warp. It joins a broad, simple skin region without Holly's foreground-hair/arm/cup junction. The moving trim is not inherently incompatible with the engine. |
| Aurelia Frost | The braid is above the moving regions. Both supports follow exposed-skin contours; upper fur and thigh stay outside. The right lower crease has a direction-aware constraint. | Its transition into a real crease gives the restrained lower edge a visible anatomical reason. Skin texture is continuous across the deforming interior, without lacing or cup boning crossing the transition. |
| Holly Heartbreaker | Smaller upper-torso regions. White fur crosses from skin into a detailed green cup, ends beside hair/arm, and joins lower corset seams. Long copper strands lie directly beside and over the left boundary; the right has little clearance at the shoulder/cup edge. | A single warp must move several visibly different materials together while keeping neighboring hair/arms still. Fur tips, gold seams and cup contours make a disagreement in motion conspicuous. |

The earlier characters' successful illusion is primarily local skin deformation with supported boundaries. Some garment/trim participates, especially Midnight's right upper edge; it is not true that every accepted clothing pixel is pinned. That success still should not be generalized into a promise that any free silhouette and attached garment can move independently of a detailed photographic neighbor.

The renderers also are not literally identical across every character/backend. WebGL uses the established mesh/texture remapping with character-specific supports; Midnight's left side and Aurelia use integrated masks. Older characters' Canvas fallback uses masked crop sampling, while Holly already has spatial remapping. This experiment reuses Holly's existing renderer, which belongs to that established single-image approach. It adds no layered rig or animation engine.

Front/rear orientation is not a mathematical restriction in the renderer. The issue is what lies on either side of the support transition. A front-facing design with clear hair placement, soft upper cups and a stationary fabric support band could fit this approach. That is a design inference, not a validated new portrait.

## Calibration trial and observed result

All additions live in this directory. Original r5 and r6 are compared with one conservative `simple` trial:

- Remove r6's separately traced outer guard, including its asymmetric right-side restriction.
- Extend the existing outer support planes by 18 original-image pixels, keeping the existing 20/32-pixel feathers and lower/central attachment.
- Increase only the mask's storage rectangle from 440×288 at (192,384) to 496×336 at (160,352), so the expanded contour retains a zero border and cannot leak through texture clamping.
- Retain the exact original velocity calculation, six-step texture remap, spring trajectories, gains, presets and gestures. Hit testing retains the original weight function.

This is the simplest trial in this review, **not a viable accepted correction**. The [four temporal comparisons](evidence/README.md) use the same recorded Holly states: impact, loading at 0.067 s, peak at 0.100 s, return at 0.200 s, rebound at 0.308 s left / 0.292 s right, and settled at 8 s. Both sides are exercised independently on WebGL and Canvas.

| Observation | Assessment |
| --- | --- |
| Left peak/loading | r5 retains a nearly fixed outer region. r6 and the contour trial move more fur, but the outer upper tip becomes pointed/stretched where the moving trim meets the constrained upper boundary. Broadening the trial also carries nearby hair. |
| Right peak/loading | r6's outer trim is visibly more restrained than its interior. Releasing the support increases travel, but the corner still has an unnatural concentrated pull and neighboring hair/arm samples now move. |
| Rebound, both sides | The contour trial lets more of the cup move, but its lower curve/boning still bends against the fixed lower corset. Filling space or reducing hair overlap alone would not establish a believable attachment. |
| Holes and seams | This whole-photo remap does not show the earlier layered prototype's pink holes. Instead it deforms photographic neighbors to maintain coverage. Absence of a hole is not a pass. |
| Rest | The contour trial is pixel-identical to r6 at rest on both backends. Reset returns to the initial image exactly. |
| WebGL versus Canvas | The same characteristic boundary and garment failures occur in both. Backend parity does not rescue the artwork/support mismatch. |

The source-support overlays make the tradeoff visible: [r6](evidence/geometry-holly.jpg) fades through the free edge; the [trial](evidence/geometry-holly-trial.jpg) extends over neighboring material. There is no place to move an arbitrary single-image boundary without either deforming the other side of it or changing the source composition/representation. This mission stops at the composition option.

## Measurements that support, but do not replace, visual review

The following are **CPU inverse-map diagnostics at the fixed captured peak**, in original-image pixels. They are not optical-flow tracking or the earlier GPU perimeter measurements. Values at an outside feature describe sampling movement, not a physical object translation.

| Sample | r5 | r6 | Contour trial |
| --- | ---: | ---: | ---: |
| Left interior (337,477) | 19.05 | 19.05 | 19.05 |
| Right interior (481,484) | 18.72 | 18.72 | 18.72 |
| Left fur sample (227,500) | 0.04 | 18.52 | 19.37 |
| Right fur sample (597,520) | 17.13 | 3.03 | 19.08 |
| Adjacent left hair sample (213,526) | 0.00 | 0.00 | 19.41 |
| Adjacent right feature (613,520) | 0.06 | 0.00 | 18.81 |

The unchanged interior travel shows the trial did not obtain its result by reducing motion. The adjacent-feature values explain why simply broadening the mask is insufficient. No test rewards reduced perimeter movement.

At peak, the trial changes all 488 selected left-side adjacent source samples and 648/662 right-side samples in WebGL (652/662 right in Canvas); r6 changes none in those same boxes. These boxes were selected on the photograph in the existing boundary suite. Pixel-change counts alone cannot distinguish physical occlusion from warping; the photographic comparisons and the single-image sampling path are necessary context. Keeping all those pixels fixed would also not prove natural fur movement.

Other checks:

- 108 exact trajectory comparisons: three presets × two sides × three link settings × tap/drag/flick × direct/green targets. The contour trial matches r6 unrounded states in every case.
- 24 exact rendered-capture comparisons confirm Winter, Midnight and Aurelia are unchanged by the optional Holly calibration, across both backends and both peak/rebound sides.
- Five protected source blocks match the release byte-for-byte: solver/loop, Holly velocity, Canvas remapping, gesture/impulse handlers and preset values.
- All four original portrait hashes match. Holly SHA-256 remains `0ad0a1cad2273d038b1953587ecfd43857897f7627c91d8f2a02a989ffe2ba97`.
- Six exact reset checks, zero browser exceptions, and 24 decoded review images below 700 KiB. The largest is 682,028 bytes. Motion comparison crops are never resized.

## Original-portrait decision and minimal art proposal

**Retain the original portrait as the approved source and identity reference. Do not ship the contour trial.** It remains usable for the current contained-motion approximation; this evidence does not make that approximation acceptable for the requested coordinated silhouette/garment movement.

The minimum proposed revision is one localized edit of the same front-facing portrait: sweep lower hair behind the shoulders, move the outer fur/cup ends into a plain green support panel with approximately 35–45 source pixels of initial design clearance, and give the upper cup a continuous believable attachment to the lower bodice. Preserve face, body proportions, camera, outfit identity and background. Removing hair alone would leave the right arm/cup boundary and lower seam problem. See [ARTWORK_SPEC.md](ARTWORK_SPEC.md) for exact areas and evaluation requirements.

That clearance is a starting art specification derived from the existing approximately 19-pixel natural excursion and support falloff, **not a proven minimum or a pass threshold**. A localized retouch may be sufficient; a completely new pose or a new renderer has not been justified.

One image-edit request was made with the original portrait, these identity constraints and the proposed costume/hair changes. The image editor rejected the output with `moderation_blocked` in its sexual category and returned no artifact. No alternate generated image, manual substitute or purported revised-art result is presented. Therefore this review **cannot establish whether the proposed modest artwork changes succeed**. The exact specification is the deliverable for that blocked portion. No additional architecture was attempted.

## Scope and remaining review

Only this new experimental directory changes. The latest layered experiment and all earlier evidence are preserved. Original artwork, main, published v8, earlier releases, other characters, springs, linked movement, presets and gestures remain untouched. No deployment or public preview is made.

The trial adds no texture units, layers, integration steps or draw passes. Its larger mask adds 159,744 decoded RGBA bytes (about 156 KiB), and the Holly Canvas crop covers about 31.5% more pixels. Performance optimization is deferred because visual feasibility failed. The earlier reconstruction's plates and renderers are not loaded.

Cass should judge the four Holly temporal sheets and the lossless extrema, especially fur-tip attachment, cup shape, neighboring hair/arms and rebound into the lower corset. The missing revised-art experiment and physical-iPhone Safari review remain outstanding. Desktop Chromium captures and automated preservation checks cannot establish visual approval.
