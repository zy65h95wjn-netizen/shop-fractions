# Independent motion: 3D surface proof

Public preview: https://independent-motion-3d.trpn5cp2s5.chatgpt.site

Separate experiment. No Peaches application files are required or modified. Earlier layered preview remains available for comparison.

## Implementation

Two shallow curved XYZ meshes, a fixed perspective camera, and projective photograph coordinates. Vertex normals change with deformation; relative lighting is limited to preserve the photograph’s baked appearance. A depth buffer resolves overlap. This is a 3D surface approximation, not a full volumetric or anatomical soft-body simulation.

Each side has independent planar and depth springs, peripheral lag, separate touch ownership, and no cross-side state transfer. A stationary crease guide restrains outward gaps; lower attachments taper to zero displacement. A moving right surface can visually cover the left without moving its geometry. The depth ordering is designed for this fixed view; hit testing gives the right surface priority in overlaps.

Touch uses Pointer Events, capture, coalesced samples where available, and a fixed 240 Hz simulation step. Large swipes have bounded energy and travel. Rendering stops at rest; the untouched JPEG is shown then. No autoplay. Original, Stop, and context-loss fallback remain available. Idle geometry is cached during motion on the opposite side.

The original 756×1280 JPEG is byte-identical (SHA256 `0ce4ef21d3cb04a83d86ba6ba426fcf909c2a092ff69348e8e22f6b8aaa19017`). Rendered proof assets do not replace or modify it.

## Validation

- `npm test`: 13 tests cover artwork integrity, independence, two-finger ownership/cancellation, moving-region picking, conservative travel/contact constraints, settling at all control extremes, protected regions, attached lower folds, projection and triangle orientation.
- Stress sweep: minimum projected triangle area ratio 0.4777; maximum analytical pointer inverse error 0.0034 source pixels. This bounds foldovers in the tested poses, not all possible visual artifacts.
- `npm run proof`: exports 41 poses and renders the actual app GLSL through Mesa EGL. Needs Node, Python/Pillow, and libEGL; no browser or server is launched. Output is under `/tmp/surface-3d-qa`.
- Rest render matches decoded original pixel-for-pixel. Sampled stationary left interior, upper surroundings and stocking rectangles remain pixel-identical in right inward/outward stress poses. Results saved in `tests/graphics-results.json`.
- Inspected full-frame and crease/lower-fold crops of rest, bounce, inward/outward and opposed poses. No large open lower-fold strips observed in these samples. Small edge and texture artifacts remain possible.
- `dist/proof/right-bounce.mp4` contains the short 24 fps rendered sequence. It demonstrates the model, not measured iPhone frame rate.

## Reproduce video

After `npm run proof`:

```sh
ffmpeg -framerate 24 -i /tmp/surface-3d-qa/bounce-%02d.png -vf 'tpad=start_duration=0.5:stop_duration=0.75:start_mode=clone:stop_mode=clone' -c:v libx264 -crf 20 -pix_fmt yuv420p -movflags +faststart dist/proof/right-bounce.mp4
```

## Limits and next review

The photograph does not contain hidden skin geometry or texture. A narrow backing approximation samples nearby original pixels; it can reveal repeated texture when uncovered. Fixed crease constraints and lower attachments limit travel, and overlap is not full collision/contact solving. Source lighting is baked in, so new lighting remains restrained. Large motion or camera rotation would require better reconstructed geometry and hidden surfaces.

No real iPhone or Safari/browser integration test was available in this session. Offscreen shader and numerical tests cannot establish finger feel, battery usage or browser performance. Review Test right, Test left, opposing two-finger drags, strong swipes, cancellation and settling on the target iPhone before calling this final.
