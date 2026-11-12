# True 2D Kelvinlet controlled comparison

Starting point: `0e9f3a1fa532ff29c70948bd58120e7d53bf5505`.
Branch: `experiment/redhead-kelvinlet-a-plus-b`.

This directory adds an isolated research page. It imports the unchanged original spring engine, masks and JPEG from `../redhead-soft-tissue/`. Keep that sibling directory when serving or copying the experiment. No existing files, characters, live selectors, service workers or deployment configuration are changed.

Serve the repository root and open `/peach-physics/experiments/redhead-kelvinlet/index.html`. It needs no build or runtime dependencies. A, A+, B, paired comparisons and all-three viewing are available. Individual focus view works without relying on iOS's Fullscreen API. The framing selector includes a contact-detail crop; cropping changes the viewport only.

Use `?view=A`, `?view=A%2B`, `?view=B`, `?view=pair` or `?view=all`; use `&renderer=canvas` to force Canvas. WebGL failure automatically falls back to Canvas. Changing methods does not change the common simulation. Renderer changes reset playback. Each side accepts one pointer; a second same-side pointer is ignored. Left/right simultaneous contacts remain independent.

The original attached JPEG is reused byte-for-byte, SHA-256:
`c8b9ec5fbc7a84e94b0f8618341b67a99d5587c35a548103c360e2ea706532d6`.

- [Equation and code references](METHOD.md)
- [Findings, measurements and limitations](REPORT.md)
- [Motion recordings and comparison frames](evidence.html)

## Reproduce

Tools for validation only: Node, Playwright, Chromium, Python/Pillow/NumPy for comparison sheets, and ffmpeg. Serve the repository root on localhost:8000. Browser tests accept `PEACH_TEST_URL` for another repository-root URL.

```sh
node peach-physics/experiments/redhead-kelvinlet/tests/math.mjs
node peach-physics/experiments/redhead-kelvinlet/tests/measure.mjs
node peach-physics/experiments/redhead-kelvinlet/tests/refine.mjs
node peach-physics/experiments/redhead-kelvinlet/tests/local.mjs
node peach-physics/experiments/redhead-kelvinlet/tests/browser.cjs /tmp/kelvinlet-evidence
node peach-physics/experiments/redhead-kelvinlet/tests/validation.cjs /tmp/kelvinlet-evidence
node peach-physics/experiments/redhead-kelvinlet/tests/performance.cjs /tmp/kelvinlet-evidence
```

Run performance separately from capture/other CPU-heavy tasks. `RECORD_VIDEO=0` skips encoding when rerunning browser checks. The page exposes `window.kelvinLab` for deterministic input and capture. `sequence.js` is shared by the page and measurements.

The optional blind interface randomizes ten A+/B pairs with balanced left/right assignment. It prevents voting until each clip finishes, permits a tie, reveals methods only after completion, and exports actual votes as JSON. No votes or 8/10 result are fabricated by tests. This is a single-observer practical comparison, not statistical evidence. Nothing is uploaded or persisted.

Public preview is served from an immutable experimental commit via `rawcdn.githack.com`; the host may show “Open the page” on first visit. This is not a deployment to the production Peaches app. A local server uses the same source.
