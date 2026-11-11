# Holly layered rendering feasibility experiment

**Not a release candidate.** The silhouette can move as a connected material, but a single flattened JPEG cannot supply the newly uncovered surfaces. Pink hatching makes that missing information explicit. See [FINDINGS.md](FINDINGS.md) for the verdict and source-art requirements.

Based on `ddf3456cc937c7f84f0b022f76f6824e59c2d079` (v8 r6). All additions are in this directory. No production files, original portraits, spring settings, presets, gesture mappings, or earlier characters/releases are changed.

## Preview

From the repository root:

```sh
python -m http.server 8000 --bind 0.0.0.0
```

Open `http://localhost:8000/peach-physics/experiments/holly-layered/`. The landing page links the interactive WebGL/Canvas experiments, original r4/r5/r6 renderers, videos, phase sheets and field visualization. On an iPhone on the same network, substitute the serving computer's LAN IP for `localhost`. This is a local preview, not a deployed public iPhone link.

The runners are generated from immutable Git revisions, with an isolated preference namespace, Holly initially selected, no service worker registration, no production manifest, and a narrow renderer adapter. The complete original input/simulation code is retained. Other characters route through the original renderer.

## Reproduce

Requires Node, Playwright, Chromium, Python with Pillow, and FFmpeg. Generated runners and compact evidence are included; rebuilding runners requires the repository's Git history.

```sh
node peach-physics/experiments/holly-layered/build.cjs
node peach-physics/experiments/holly-layered/tests/compare.cjs
python peach-physics/experiments/holly-layered/tests/make-evidence.py
python peach-physics/experiments/holly-layered/tests/parity.py
node peach-physics/experiments/holly-layered/tests/review.cjs
node peach-physics/v8/tests/artwork.cjs
```

`CHROMIUM` overrides `/usr/bin/chromium`; `PEACH_TEST_URL` overrides the localhost origin. Raw lossless captures are generated under `evidence/raw/` and excluded from Git because of their size. The committed MP4s, phase sheets, state sequence, field data and metrics are sufficient to review the result. Test runs require several minutes, particularly for the legacy Canvas renderer.

## Implementation map

- `build.cjs`: read-only extraction of r4/r5/r6, plus isolated shell changes.
- `adapter.js`: renderer dispatch and explicit lab-only deterministic review API.
- `renderer.js`: two moving material groups, smooth flow, foreground ownership, missing-source compositor, shared WebGL/Canvas mapping.
- `bootstrap.js`: opt-in Canvas fallback selection.
- `tests/compare.cjs`: input/state equivalence, fixed-time rendering, rest, field, fixed-feature and cost checks. No reduced-perimeter success condition.
- `tests/make-evidence.py`: assembles captured frames and field diagrams; never changes portrait assets.

## Rollback

Nothing is wired into production. Remove `peach-physics/experiments/holly-layered/` or revert the experiment commit. No migration or service-worker cleanup is needed. Lab preference keys begin `holly-layer-lab-`; original `peach-physics-*` settings are not written.
