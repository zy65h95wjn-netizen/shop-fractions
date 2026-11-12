# Independent Motion — Layered Study

A separate first proof of independently moving portrait cutouts. It preserves the existing fixed-crease experiment and all Peaches application files.

Layered preview: https://independent-motion-layered.trpn5cp2s5.chatgpt.site

Original comparison: https://independent-cheek-physics.trpn5cp2s5.chatgpt.site

## What changed

The renderer now composites a stationary backing plate and two independent foreground layers instead of deforming one connected photograph mesh. Each foreground samples the original portrait through its own alpha matte and inverse deformation map. Inner-edge displacement remains substantial at the cutout boundary. Each spring and its input ownership remain independent.

The right layer has fixed foreground priority. It can cover part of the stationary left layer; the underlying left geometry and source texture do not move with it. This is changing visibility through occlusion, not cross-side deformation. Pointer picking and displayed touch outlines follow the moving layers, including re-grabs during rebound.

The backing extends nearby source pixels beneath the original crease and lower fold, with restrained shading in concealed areas. It is procedural texture continuation, not artist-painted reconstruction of hidden anatomy. Sideways separation is constrained to reduce exposure of this approximation: the left outward horizontal limit is 5.6 source pixels and the right is 6.6; vertical and inward travel remain greater. Source-cutout edges still taper near clothing and the lower anchors.

The original JPEG is untouched. Its SHA-256 remains:

`0ce4ef21d3cb04a83d86ba6ba426fcf909c2a092ff69348e8e22f6b8aaa19017`

## Local use

```sh
python3 -m http.server 8080 --directory dist
```

The deployable static files are in `dist/`. There are no runtime dependencies, CDNs, analytics, or remote API calls. The app uses WebGL 1 and browser pointer events. An unsupported renderer leaves the original photograph visible with a message. No autoplay; Stop motion returns immediately to the original image.

## Validation

```sh
node tests/layers.test.mjs
node tests/export-fields.mjs
python3 tests/offscreen.py
```

The first command runs 11 numerical tests. The offscreen check requires Linux Mesa EGL and Pillow. It compiles and renders the **actual application shader source** without a browser. Results and frames are written under `/tmp/layered-qa/`. See [TESTING.md](TESTING.md).

## Limits

This is the first layered proof, with a fixed view and fixed anatomical drawing order. It does not simulate volume, contact pressure, or a 3D character. Revealed backing can show repeated or mismatched texture, particularly under unusually large separating motions. Exact artwork fidelity is validated at rest; moving pixels are resampled by the renderer.

Safari integration, physical iPhone touch response, frame rate, and natural-looking motion are unverified. Offscreen endpoint frames were inspected and the conspicuous backing strip seen under a strong outward pull was reduced through texture-continuation changes and constrained separation. That is not a substitute for judging the interactive result on an iPhone.

The source work is isolated under `experiments/independent-motion-layered/` in the requested repository. The existing preview remains available, and the character is not integrated into Peaches.
