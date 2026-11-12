# Winter Ember isolated comparison

Serve the repository root with a static HTTP server, then open this directory's index.html. No build, third-party runtime dependency, service worker or production deployment is needed. See REPORT.md for failed acceptance gates; this is not a completed cross-renderer validation.

Validation requires Node, Playwright, Chromium, Python/Pillow/NumPy and ffmpeg. With the repository served on localhost:8000:

```
node peach-physics/experiments/winter-ember-kelvinlet/tests/math.mjs
node peach-physics/experiments/winter-ember-kelvinlet/tests/validate.cjs
node peach-physics/experiments/winter-ember-kelvinlet/tests/pixels.cjs
```

The test API is window.emberLab in engine.html. The original pointer handlers remain available. All implementation and evidence stays inside this directory. Nothing registers with or writes to live Peaches.
