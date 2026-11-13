# Stronger Auto Jiggle for Midnight, Aurelia and Holly

Base production: `817a5649606bc9ec0e11ea2c2d60f66c0b25ec7a`.

The user requested stronger Auto Jiggle for Midnight Yule, Aurelia Frost and Holly Heartbreaker. This update increases only their autonomous drive by 50%:

| Character | Previous drive | New drive |
| --- | ---: | ---: |
| Midnight Yule | 1312.5 | 1968.75 |
| Aurelia Frost | 1062.5 | 1593.75 |
| Holly Heartbreaker | 218.75 | 328.125 |

Tempo, phase drift, ramp-in, touch priority, pause/resume behavior and velocity limits remain unchanged. Tap, hold, drag, flick, shake, audio, portraits, framing and per-character profiles are unchanged. Winter Ember and Santa retain their previous Auto Jiggle. Holly also retains her approved 1.10 rendered-motion gain.

The existing Auto On/Off preference and one-time R14 default migration are preserved; this update does not force a previously chosen Off setting back on. A new script URL (`motion.js?v=r14-auto2`) and cache (`peach-physics-v008-r14-auto2`) deliver the new calibration to warm browser caches and offline installs. The cache-scoped fallback repair remains intact.

## Validation

- `tests/motion-unit.cjs`: 56 existing input, suspension, timing and velocity-budget checks.
- `tests/auto-strength.cjs`: source checks allow only the three Auto values plus the script URL to change; before/after browser comparisons cover WebGL and forced Canvas. Natural, Playful and Chaos run for 30 simulated seconds per character. The three requested characters must show increased measured motion, finite state, and no contact with existing displacement bounds. Ember/Santa Auto and all five characters' tap, drag, flick and shake traces/renders must match exactly.
- `tests/auto-strength-upgrade.cjs`: upgrades the previous production service worker with a warm one-hour script cache and deliberately recreated stale retired HTML. Verifies the exact new motion script offline, all-five-character loading, unchanged individual profiles, preserved Auto On and later saved Off, fresh defaults, Shake preference and Santa audio/laugh in both renderers.

All checks passed: 18 stronger-Auto cases measured 1.499998–1.500006× RMS movement; 52 unchanged-motion comparisons matched exactly; both upgrade paths passed with no browser errors. Machine-readable results accompany both browser suites. Desktop Chromium/SwiftShader and forced Canvas do not substitute for physical-iPhone feel or performance review. Reopen the live app to receive the updated release.
