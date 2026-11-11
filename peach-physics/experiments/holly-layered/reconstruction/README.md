# Holly: localized source-layer reconstruction

**Experimental, not visually accepted.** Deterministic source cloning covers the diagnostic gaps, but the peak hair/fur junctions and rebound cup edges remain visibly artificial. See [FINDINGS.md](FINDINGS.md) and the [review index](evidence/README.md). No release or public preview was deployed.

This folder adds a separate runner to baseline `55fdcd55bd74b33345c4b2fb6e2a1f1379041319`. The earlier prototype, all earlier evidence, original portraits, spring/input code and deformation field are preserved. The runner inherits the baseline field; only source materials, ownership mattes, backing and compositing differ.

## Review

- [Lossless before/after peak and rebound pairs, individual PNG crops, and compact temporal sheets](evidence/README.md)
- [Source-layer atlas](evidence/source-layer-atlas.jpg)
- [Deterministic donor rules, coordinates and source hash](assets/provenance.json)
- [Matched field/state checks](evidence/matched.json), [rest and stationary-pixel checks](evidence/image-validation.json), [image sizes and SHA-256 hashes](evidence/assets.json)
- [Preserved baseline deformation-field diagram](../evidence/field.png)

All 29 review images are below 700 KiB. PNG crops are lossless; JPEG temporal sheets use quality 93, 4:4:4 chroma. Captured crop pixels are never resized. The baseline pink diagnostics remain in the **before** column. The **after** column shows inferred photographic coverage; its lack of pink is not a visual pass.

## Files

`build_art.py` creates separate left/right backing, skin underlap and garment edge-padding images, two premultiplied moving materials, a stationary foreground matte, a combined backing plate and an inferred-region map. All reconstruction uses deterministic samples of the original JPEG. No image-generation model is used.

`renderer.js` subclasses the preserved renderer and retains its exact flow calculation, integration, sampling and state inputs. The new WebGL fragment program and Canvas compositor share the same rest-relative source-layer composition. `build_page.py` makes `index.html` from the preserved runner with only the new script, base URL, opt-in mode, isolated preferences and review label changed.

`tests/matched.cjs` replays the existing recorded states in Chromium. `tests/make_evidence.py` produces the committed image crops and index. Full captures are reproducible under `evidence/raw/`, which is ignored to keep the repository small.

## Local reproduction

Requirements: Python with Pillow, NumPy and SciPy; Node with Playwright; Chromium at `/usr/bin/chromium`. Captured with Node 24.22.1, Pillow 13.0.0, NumPy 2.3.5 and SciPy 1.17.0. No dependencies or production configuration were changed.

From the repository root:

```sh
python peach-physics/experiments/holly-layered/reconstruction/build_art.py
python peach-physics/experiments/holly-layered/reconstruction/build_page.py
python peach-physics/experiments/holly-layered/reconstruction/tests/serve.py
```

The server copies only the required public runner and image files into a temporary directory and listens on `127.0.0.1:8000`. It does not serve the repository or publish a preview. Open:

```text
http://127.0.0.1:8000/peach-physics/experiments/holly-layered/reconstruction/index.html?backend=webgl
http://127.0.0.1:8000/peach-physics/experiments/holly-layered/reconstruction/index.html?backend=canvas
```

In another terminal, run:

```sh
node peach-physics/experiments/holly-layered/reconstruction/tests/matched.cjs
python peach-physics/experiments/holly-layered/reconstruction/tests/make_evidence.py
```

Rebuild/restart the temporary server after changing an asset. The captures use a 390×844 CSS viewport, DPR 2, exact recorded poses and disabled animation scheduling. They are controlled desktop comparisons, not physical-iPhone validation.

## Rollback

Nothing outside this new directory is changed or wired into production. Reverting this addition, or removing this directory, restores the previous experiment and preserves its evidence. There is no deployment, service-worker update or migration to undo.
