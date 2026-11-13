# R13.1 results and promotion recommendation

**Recommendation: ready for Lance's iPhone trial; do not promote yet.** Synthetic and desktop-browser checks pass, but permission prompts, physical sensor axes/feel and battery cost have not been validated on an actual iPhone. No human preference or physical-device results are invented.

## Correction after the first iPhone report

Lance reported that neither feature worked. The original automated checks accepted any nonzero spring/pixel change, which did not establish visible movement. A matched Natural Auto pulse produced only 0.51–1.42 source pixels on the female characters (about 0.62–0.71 CSS pixels at the tested 390×844 framing, before mask attenuation). Its first pulse took 7.4 s in the deterministic case. Forward/back (Z-only) shakes produced no input at all. These are confirmed implementation shortcomings; they do not establish whether Lance's browser also withheld sensor readings.

R13.1 increases only optional-input gains, reduces shake filtering/deadzone, projects depth acceleration into screen vertical movement, and starts the first eligible Auto pulse after 0.45–0.80 s. The normal 1.2 s post-touch/loading grace still applies. Later Auto intervals remain 3.8–8.6 s. Enabling either effect closes the settings panel so the result is visible. Active toggles have a highlighted state. A status notice outside settings distinguishes receiving motion from permission granted with no sensor readings; the latter recommends opening directly in Safari. Feature-policy restrictions disable Shake without disabling Auto.

The matched revised Auto peaks are 4.66/4.40/3.62/2.75/4.93 source pixels for Ember/Midnight/Aurelia/Holly/Santa, versus 1.42/1.29/1.03/0.51/2.74 originally. First response is about 1.8 s including the grace period. These spring-node measurements are not optical-flow measurements or physical iPhone results. `evidence/visibility.json` records all 20 before/after cases across both renderers. Real-animation-loop tests also verify touch activation, panel dismissal, prompt Auto start, no-reading feedback, and dispatched depth-only sensor events.

## Implementation

The R12 solver, renderers, masks, spring parameters, presets, touch/grab trajectories and audio functions are unchanged. `motion.js` adds optional node-velocity input immediately before the original 120 Hz solver step. It never calls audio, slap, bounceBoth, contact or laugh routines. Both features are off by default.

Shake uses gravity-free acceleration when available. If only accelerationIncludingGravity exists, a 0.6 s gravity estimate is subtracted. A 0.035 s low-pass filter suppresses high-frequency noise. Startup warmup is 0.1 s for linear acceleration and 0.5 s for the gravity fallback. Samples are processed at most once per 16 ms. A 0.45 m/s² dead zone and 14 m/s² effective-force cap bound the input. After 0.65 s of sustained excitation, a 0.18 s cooldown interrupts further driving. Readings older than 0.18 s cannot keep adding force; long gaps reset the filter. Rotation uses screen orientation (with the older iPhone window.orientation fallback). X/Y are projected to screen axes and negated for inertial movement. Depth acceleration adds a 0.65-weighted vertical input before filtering and inertial sign reversal. This is an approximate 2D response, not depth deformation.

Input calibration (new-input gains, not changes to R12 physics):

| Character | Acceleration gain | Auto base velocity | Added-input velocity ceiling |
|---|---:|---:|---:|
| Winter Ember | 520 | 180 | 240 |
| Midnight Yule | 490 | 170 | 230 |
| Aurelia Frost | 390 | 140 | 210 |
| Holly Heartbreaker | 140 | 75 | 110 |
| Santa Claus | 140 | 90 | 210 |

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
| 20.05 | 18.89 | 15.46 | 11.91 | 27.45 |

These are controlled synthetic results, not measurements from a real phone. The recordings use a separate sinusoidal sequence, so their peaks differ.

Performance observation: a desktop Chromium batch of 100,000 controller ticks, with 50,000 synthetic samples, took 51 ms. This is a coarse JS-only measurement excluding rendering, sensor hardware, GPU scheduling and battery drain. Structural overhead is bounded: no listener while off/hidden, no extra animation loop, no auto interval, no per-frame DOM updates, and only one temporary no-readings watchdog. Physical iPhone profiling remains outstanding.

## Evidence and limits

`evidence.html` offers actual rendered side-by-side recordings: R12/off at rest on the left, R13 on the right. Five WebGL recordings cover every character; Canvas recordings cover Ember and Santa, while all five Canvas responses are tested numerically and by pixel comparison. Videos are deterministic 20 fps captures of a 120 Hz simulation, not real-time performance recordings. Synthetic shake occurs early, followed by a naturally scheduled Auto pulse; each recording uses the same seeded timing. Representative peak frames and raw measurement JSON are included.

Gravity-fallback filtering cannot perfectly distinguish slow tilt from translation. Sensor availability varies by browser and hardware even after permission is granted. Physical portrait/landscape direction must be confirmed on Lance's iPhone. Depth acceleration is approximated as vertical motion; real-phone direction and feel still need confirmation. R12's different WebGL and Canvas sampling architectures remain; matching spring trajectories does not imply pixel-identical backends. Existing texture/silhouette limitations are inherited.

Before promotion, Lance should try Shake and Auto separately on each character, in portrait and landscape, then check holding/releasing during motion and returning from another app. Tune only the new input gains if the response is too weak or too strong. Approval on the iPhone is still required; main and live R12 remain untouched.
