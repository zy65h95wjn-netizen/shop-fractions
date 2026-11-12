# Independent Cheek Physics — standalone prototype

A dependency-free, touch-first experiment using the supplied, unmodified 756 × 1280 portrait. It is a separate static site; no Peaches application code, artwork catalog, navigation, manifest, or service worker is changed.

Public preview: https://independent-cheek-physics.trpn5cp2s5.chatgpt.site

## Run locally

From this directory:

```sh
python3 -m http.server 8080 --directory dist
```

Open `http://localhost:8080`. ES modules need an HTTP server; opening `index.html` as a `file:` URL is not supported. Deployment consists solely of `dist/`; there are no CDN, analytics, font, runtime-package, or API dependencies.

```sh
node tests/physics.test.mjs
```

## Implementation

- Two separate 2D springs with independent secondary followers and pointer ownership. Screen coordinates determine side names. One finger per side can interact simultaneously; a captured pointer never changes sides when crossing the crease.
- Cross-side coupling is exactly zero by default. The optional Linked movement slider adds symmetric spring coupling; its percentage is coupling strength, not a guarantee of an exact displacement ratio.
- A single connected, 27,305-vertex WebGL mesh samples the original JPEG. Smooth, nonoverlapping contour masks affect each side. There are no separate cheek cutouts, center seam, whole-image translations, or regenerated pixels.
- Inset contour masks taper displacement to zero across 45 / 58 source pixels. The natural center crease, skirt, lower folds, thighs, stockings, hair, and background remain anchored. Local strain and a damped follower supply restrained secondary motion.
- Elliptical travel bounds (16 / 22 source pixels), soft target saturation, bounded release velocity, and 240 Hz fixed-step integration constrain strong swipes. Settling stops animation completely and restores the original `<img>`.
- Pointer capture, coalesced samples, cancellation, focus loss, visibility changes, resizing, and WebGL context loss are handled. Only touch polygons suppress native touch scrolling. Controls and test buttons are keyboard accessible. No autoplay; an immediate Stop motion control is always available.
- Bounce changes impulse and rebound damping. Softness changes spring frequency and drag response. Settling changes damping. Reset restores all four settings and stops motion.

The source JPEG is copied without resizing, recompressing, repainting, cropping, or metadata removal. SHA-256:

`0ce4ef21d3cb04a83d86ba6ba426fcf909c2a092ff69348e8e22f6b8aaa19017`

## Validation and limits

See [TESTING.md](TESTING.md) for automated results and the physical iPhone checklist.

- The original white-line annotation was not attached. The right inner/lower boundary has since been extended using the supplied yellow-line screenshot; the other boundaries remain inferred from the portrait.
- This is 2D image deformation, not a volumetric body simulation. The outer silhouette intentionally remains anchored to preserve the original background. Large inputs saturate. It does not establish that freely moving silhouettes can preserve the background or fully natural contours from one photograph.
- No browser-control tool (`cua_repl.js`) was exposed in the managed environment. Browser rendering, mobile layout, Safari behavior, and visual motion have **not** been verified. Physical iPhone testing remains required; automated spring and mesh tests do not substitute for it.
- A browser without WebGL shows the original image and an availability message. WebGL interpolation can differ slightly from the browser's image resampling while moving; at rest, the original `<img>` is used.

This experiment stops at the standalone preview. It does not add the character to Peaches.
