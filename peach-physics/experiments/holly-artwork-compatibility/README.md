# Holly artwork compatibility review

**No accepted visual fix.** Holly's boundary conflict comes from both her artwork and the r5/r6 calibration. A simple contour trial frees the fur but also moves adjacent hair/arm pixels. A revised-art edit was attempted once; the image editor rejected it and returned no candidate. The proposed minimal art revision is therefore untested.

- [Findings and decision](FINDINGS.md)
- [Specific front-facing artwork recommendation](ARTWORK_SPEC.md)
- [Visual review index: all direct raw image URLs and byte sizes](evidence/README.md)

The 24 review images include four six-phase Holly comparisons, eight lossless peak/rebound comparisons, six motion studies of the established characters, five source-support overlays and a portrait overview. Every review image is below 700 KiB. Motion crops and geometry crops retain native pixels; only the composition overview is resized.

This directory is isolated from reference `b7b5a2ba1c3784a8d9b5f9423405e6de8d954f2b`. It uses the original r5/r6 single-photograph renderers. It does not load the previous layered renderer or reconstruction. No portrait was altered, no release changed, and no preview deployed.

## Implementation

`build.py` reads immutable r5/r6 Git sources and creates two small runners. The embedded Winter/Midnight images are externalized as byte-identical WebP copies. Original Aurelia/Holly images remain read-only references. Preferences are isolated and service-worker registration is disabled.

`adapter.js` exposes deterministic review controls. The `simple` variant changes only Holly's support weight and its mask storage rectangle: remove the r6 outer guard, extend the existing outer support planes by 18 source pixels, retain the original feather widths, lower attachment and central lacing. Input keeps the original weight function. The velocity calculation, six-step remapping, spring solver, presets and gesture handling remain unchanged.

The generated `index.html` accepts `?variant=r6` or `?variant=simple`, plus `&backend=canvas` to select the existing fallback. `r5.html` is the original comparison. Other characters remain available through the original selector.

## Reproduce locally

Requires the historical Git objects, Python with Pillow/NumPy, Node with Playwright, and Chromium at `/usr/bin/chromium`. From the repository root:

```sh
python peach-physics/experiments/holly-artwork-compatibility/build.py
python peach-physics/experiments/holly-artwork-compatibility/tests/verify_source.py
python peach-physics/experiments/holly-artwork-compatibility/tests/serve.py
```

The server copies an explicit public-file whitelist into a temporary directory and binds only `127.0.0.1:8000`. Open:

```text
http://127.0.0.1:8000/peach-physics/experiments/holly-artwork-compatibility/index.html?variant=simple
```

In another terminal:

```sh
node peach-physics/experiments/holly-artwork-compatibility/tests/capture.cjs
node peach-physics/experiments/holly-artwork-compatibility/tests/verify.cjs
python peach-physics/experiments/holly-artwork-compatibility/tests/make_evidence.py
```

Full captures and mask arrays are regenerated in ignored `evidence/raw/`. All committed compact evidence is derived from those captures. Restart the temporary server after rebuilding a runner.

Rollback consists of reverting this directory's addition. No production wiring, service-worker update, migration or deployment needs undoing.
