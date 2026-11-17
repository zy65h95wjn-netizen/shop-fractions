# Holly — isolated 3D form study 01

Open: https://zy65h95wjn-netizen.github.io/shop-fractions/peach-physics/previews/holly-3d/

This is the first real 3D Holly prototype, intended to review shape, rotation, interaction, and phone compatibility. It is a rough stylized form study, **not a finished likeness of the approved portrait**. The face, hair, hands, clothing details, unseen surfaces, and proportions need further art work before any production decision. The original portrait is available unchanged through Reference. No production Peaches or earlier comparison files are modified.

## What is implemented

- Blender-built geometry: 23,034 vertices and 43,477 triangles. Solid depth, modeled ears, face features, hair, hat, corset, skirt, stockings, and approximate lower legs/boots.
- Browser rendering with locally vendored Three.js 0.160.1 (MIT license included), WebGL 2 with WebGL 1 support, adjustable viewing angle and framing. Static geometry is batched to keep drawing operations low.
- Two independent three-dimensional spring responses, integrated at 1/120 second. Skin vertex weights taper to zero inside the reference's calibrated regions; clothing remains fixed. Vertex normals update with deformation.
- Tap, hold, drag, release, two-finger capture, bounded displacement, Auto, Bounce, camera rotation, and front-view reset. Sound is absent and no production saved profiles are read or written.
- A service worker scoped to this preview caches its code, model, renderer, and unchanged reference portrait. Once the cache completes, offline reload works. It deletes only old `peaches-holly-3d-` caches.

The first photographic projection test produced unacceptable artifacts. Projection UVs and weights are retained in the exported mesh for research, but the shipped renderer deliberately uses clean colored materials. It does not claim that a photo wrapped around basic volumes is a finished human reconstruction. This prototype is a custom interactive mesh deformation rig, not a full volumetric soft-body or cloth-collision solver. Aurelia and glass compression are later work.

## Build

```sh
blender -b --python peach-physics/previews/holly-3d/build_model.py
```

The script writes `holly.bin` and `holly.json` here, and saves editable Blender source locally at `peach-physics/experiments/holly-3d/Holly-3D-study.blend`. The Blender file includes the modeled geometry and named soft-region vertex groups. The web renderer needs only the exported buffer and metadata.

The vertex buffer stores 13 little-endian floats per vertex: position, normal, reference UV, base color, unused photographic weight, and motion weight. Each part's indexed triangles use uint32 indices. `holly.json` records byte offsets, counts, Blender version, and the unchanged reference-image SHA256. Source Blender coordinates are converted from Z-up to browser Y-up during export.

## Verification

Run a repository-root server at port 8123, then:

```sh
node peach-physics/previews/holly-3d/verify-motion.cjs
node peach-physics/previews/holly-3d/verify.cjs
```

Requires Node, Playwright and `/usr/bin/chromium`. Tests cover WebGL 2 and forced WebGL 1; 30 simulated seconds of bounded finite Auto motion; settling after Auto stops; exact fixed positions at zero-weight vertices; independent left/right response; real browser tap/drag; simultaneous captures and cancellation; camera controls; reference display; and an actual offline reload with the service worker. Visual front, quarter, and reverse captures are inspected separately.

Chromium tests do not establish physical iPhone Safari frame rate or visual approval. This study stays separate until Lance reviews both the appearance and the feel on his phone.
