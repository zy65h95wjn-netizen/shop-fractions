# R13 results and promotion recommendation

**Recommendation: ready for Lance's iPhone trial; do not promote yet.** Synthetic and desktop-browser checks pass, but permission prompts, physical sensor axes/feel and battery cost have not been validated on an actual iPhone. No human preference or physical-device results are invented.

## Implementation

The R12 solver, renderers, masks, spring parameters, presets, touch/grab trajectories and audio functions are unchanged. `motion.js` adds optional node-velocity input immediately before the original 120 Hz solver step. It never calls audio, slap, bounceBoth, contact or laugh routines. Both features are off by default.

Shake uses gravity-free acceleration when available. If only accelerationIncludingGravity exists, a 0.6 s gravity estimate is subtracted. A 0.07 s low-pass filter suppresses high-frequency noise. Startup warmup is 0.1 s for linear acceleration and 0.5 s for the gravity fallback. Samples are processed at most once per 16 ms. A 1.2 m/s² dead zone and 14 m/s² effective-force cap bound the input. After 0.65 s of sustained excitation, a 0.18 s cooldown interrupts further driving. Readings older than 0.18 s cannot keep adding force; long gaps reset the filter. Rotation uses screen orientation (with the older iPhone window.orientation fallback). X/Y are projected to screen axes and negated for inertial movement. Depth-only Z movement is intentionally ignored by this 2D experiment.

Input calibration (new-input gains, not changes to R12 physics):

| Character | Acceleration gain | Auto base velocity | Added-input velocity ceiling |
|---|---:|---:|---:|
| Winter Ember | 210 | 55 | 210 |
| Midnight Yule | 195 | 50 | 200 |
| Aurelia Frost | 150 | 40 | 165 |
| Holly Heartbreaker | 36 | 14 | 65 |
| Santa Claus | 85 | 50 | 210 |

Units are source pixels and seconds: acceleration gain converts m/s² to source-pixel acceleration. The input ceiling never truncates an existing gesture velocity already above it. The original solver's bounds remain authoritative. Santa's slower belly dynamics produce more displacement with a lower acceleration gain; Holly's tighter source geometry uses smaller values.

Auto uses intervals uniformly sampled from 3.8–8.6 s, variable direction, 55–100% of its base velocity, and a smaller 10–25% secondary-side response with a direction offset. Existing node weights and coupling develop the motion. There is no auto interval timer or extra animation loop.

Both effects yield during gameplay touch, for 1.2 s after touch/release/reset/switch, and during character loading or WebGL loss. Hiding/pagehide removes the sensor listener and resets timing/filter history; returning does not deliver accumulated impulses. Auto schedules a fresh interval. Turning an effect off leaves existing springs to settle naturally.

Permission is requested directly inside the switch's click handler, before any timer or preceding await. Unsupported, denied and exception paths leave the sensor detached. A single 2.5 s watchdog reports absent readings; it is cancelled when readings arrive, when hidden, or when disabled. Settings failures are caught so blocked storage does not break the controls.

## Validation

- **53 controller checks:** direction, proportional response, orientation transform, threshold/noise rejection, gravity removal, stale readings, touch and post-touch exclusion, hidden suspension/no catch-up, character changes, sustained-shake cooldown, invalid values, rate tolerance and per-character budgets.
- **90 R12 regression cases:** five characters × three presets × kick/drag/flick × WebGL/Canvas. With both features off, spring traces and rendered frames match R12 exactly.
- **10 synthetic-motion cases:** all five characters in both renderers. Every case moved visibly in raw pixel comparison, yielded to touch, and returned pixel-exactly to rest. Spring-state response was the same across renderers.
- Permission denied, thrown permission errors and unsupported devices stay off without listeners. A permitted prompt was initiated while browser user activation was active. Saved Auto resumes; saved Shake does not request permission automatically. Physics-profile storage survives reload unchanged.
- Hidden-page checks stopped Auto and detached the motion listener. Separate UI checks cover storage denial, browsers without requestPermission, accessible switch state, Space-key activation without triggering R12’s bounce shortcut, and listener removal on disable.
- The existing **R12 promotion/offline suite passed 50 checks** for both WebGL and Canvas. Production files and release evidence remain unchanged.

Representative Natural synthetic shake: alternating X acceleration ±6 m/s² with Y=2 m/s². Maximum node displacement in source pixels:

| Ember | Midnight | Aurelia | Holly | Santa |
|---:|---:|---:|---:|---:|
| 5.71 | 5.30 | 4.15 | 2.38 | 13.65 |

These are controlled synthetic results, not measurements from a real phone. The recordings use a separate sinusoidal sequence, so their peaks differ.

Performance observation: a desktop Chromium batch of 100,000 controller ticks, with 50,000 synthetic samples, took 49 ms. This is a coarse JS-only measurement excluding rendering, sensor hardware, GPU scheduling and battery drain. Structural overhead is bounded: no listener while off/hidden, no extra animation loop, no auto interval, no per-frame DOM updates, and only one temporary no-readings watchdog. Physical iPhone profiling remains outstanding.

## Evidence and limits

`evidence.html` offers actual rendered side-by-side recordings: R12/off at rest on the left, R13 on the right. Five WebGL recordings cover every character; Canvas recordings cover Ember and Santa, while all five Canvas responses are tested numerically and by pixel comparison. Videos are deterministic 20 fps captures of a 120 Hz simulation, not real-time performance recordings. Synthetic shake occurs early, followed by a naturally scheduled Auto pulse; each recording uses the same seeded timing. Representative peak frames and raw measurement JSON are included.

Gravity-fallback filtering cannot perfectly distinguish slow tilt from translation. Sensor availability varies by browser and hardware even after permission is granted. Physical portrait/landscape direction must be confirmed on Lance's iPhone. Only screen-plane acceleration is used; moving straight toward/away from the screen will not drive the effect. R12's different WebGL and Canvas sampling architectures remain; matching spring trajectories does not imply pixel-identical backends. Existing texture/silhouette limitations are inherited.

Before promotion, Lance should try Shake and Auto separately on each character, in portrait and landscape, then check holding/releasing during motion and returning from another app. Tune only the new input gains if the response is too weak or too strong. Approval on the iPhone is still required; main and live R12 remain untouched.
