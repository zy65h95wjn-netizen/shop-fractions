# Redhead soft-tissue prototype

Isolated experiment based on the live r10 repository head `4673895`. All changes are within this directory. No production entry points, character lists, preferences, service workers or existing artwork are changed. No production deployment is needed.

Serve the repository root (`python3 -m http.server 8000`) and open `/peach-physics/experiments/redhead-soft-tissue/`. No dependencies or build step are required by the page. Use `?renderer=canvas` to force Canvas 2D, and `?view=A`, `?view=B` or `?view=split` for the initial comparison layout. WebGL failure or context loss switches to Canvas automatically.

The original JPEG is copied without re-encoding; SHA-256:

`c8b9ec5fbc7a84e94b0f8618341b67a99d5587c35a548103c360e2ea706532d6`

Choose A/B, side by side, upper-body or full-portrait framing. Any gesture on either panel drives the same simulation for both fields. The guided sequence is repeatable. Reset restores the original image exactly. Only one pointer per side is accepted; a second pointer on the same side is ignored. Independent left/right contacts are supported. Hiding the page or losing focus cancels contact; changing renderer resets the sequence. No motion starts automatically.

See [REPORT.md](REPORT.md) for the outcome and [evidence.html](evidence.html) for WebGL and Canvas motion recordings.

## Reproduce validation

Development tools: Node, Playwright, Chromium, ffmpeg, and the repository-root HTTP server above. No production dependency installation is required.

```sh
node peach-physics/experiments/redhead-soft-tissue/tests/browser.cjs /tmp/redhead-evidence
node peach-physics/experiments/redhead-soft-tissue/tests/validation.cjs /tmp/redhead-evidence
node peach-physics/experiments/redhead-soft-tissue/tests/reference.cjs /tmp/redhead-evidence
```

`RECORD_VIDEO=0` skips recording when rerunning sequence checks. `PEACH_TEST_URL` selects another repository-root server. The reference script injects test hooks into the browser response for unchanged Holly r10, never into the production source. Diagnostic `window.redheadLab` supports deterministic stepping and reset.

Publication is a normal push of the experimental branch. The public preview uses the immutable experimental commit through rawcdn.githack.com, rather than changing the repository's live Pages branch or deploying to production.
