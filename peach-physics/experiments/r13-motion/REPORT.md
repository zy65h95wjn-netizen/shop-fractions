# R13.3 results and promotion recommendation

**Recommendation: iPhone trial only. Do not promote until Lance approves.** Lance found R13.2 better and requested a little more Auto movement and less phone shaking. R13.3 increases Auto acceleration by 25%, lowers Shake's dead zone to 0.08 m/s², and multiplies small-input sensitivity by 1.5 while retaining the same maximum force. Physical sensor feel and battery cost still require iPhone confirmation.

## What changed

Auto now continuously applies a small, smoothly varying force to the existing springs. It no longer schedules isolated pulses separated by several seconds. Each side has two independent phases, with slightly different frequencies. The primary rate changes toward a random target over time, so the sides do not bounce in lockstep or repeat a short fixed loop. A 0.7 s fade introduces the motion gently. This replaces the original occasional-impulse requirement at Lance's explicit request.

Shake uses a 0.08 m/s² dead zone, down from 0.12, and a 1.5× sensitivity factor for small acceleration. The effective input magnitude is `2.2 * tanh((magnitude - 0.08) * 1.5 / 2.2)` above the dead zone. This is approximately proportional near rest and smoothly saturates during vigorous shaking. Small movements become much more responsive without scaling large shakes by the same factor. Linear-sensor warmup is 0.05 s; gravity-fallback warmup remains 0.5 s. The existing 0.035 s low-pass filter, 16 ms sample limit, 0.18 s stale-reading cutoff, and 0.65 s sustained-input/0.18 s cooldown remain.

X/Y readings are rotated into screen coordinates and negated for inertia. Z acceleration contributes 0.65-weighted vertical movement. Gravity fallback estimates and removes gravity on all three axes over 0.6 s. Depth projection is an approximation for a 2D image, not depth deformation.

Only optional-input gains changed:

| Character | Shake gain | Auto acceleration | Auto base frequency (Hz) | Input velocity ceiling |
|---|---:|---:|---:|---:|
| Winter Ember | 2200 | 1375 | 1.15 | 240 |
| Midnight Yule | 2100 | 1312.5 | 1.12 | 230 |
| Aurelia Frost | 1700 | 1062.5 | 1.10 | 210 |
| Holly Heartbreaker | 500 | 218.75 | 0.85 | 110 |
| Santa Claus | 500 | 287.5 | 0.65 | 210 |

Units are source pixels and seconds. Shake gain converts m/s² to source-pixel acceleration. Auto's value is now acceleration, not the impulse velocity used in earlier revisions. The velocity ceiling never truncates an existing gesture velocity already above it. R12's bounds remain authoritative.

## Preservation and lifecycle

The R12 solver, rendering, masks, spring parameters, presets, artwork, framing, grab-and-hold and audio functions remain unchanged. No optional effect calls audio, slap, contact, bounceBoth or laugh routines. Both effects default off. Settings persist separately from physics profiles; Shake still requires an explicit user gesture on each visit, with iOS permission requested directly from that gesture.

Both effects yield during touch, loading and WebGL loss, and for 1.2 s after touch/release/reset/switch. Auto resumes with a fresh smooth fade. Hidden/pagehide suspends input and removes the sensor listener. Returning delivers no accumulated impulses. Auto uses the existing 120 Hz solver loop, without a timer or extra animation loop. No per-frame UI changes occur.

Enabling an effect closes settings to reveal the artwork. Active switches are highlighted. A notice distinguishes receiving sensor data from permission granted without readings. Unsupported, denied, exception, insecure-context and feature-policy paths leave Shake inactive; Auto remains usable.

## Measurements and validation

Gentle shake test: a 0.8 m/s² sinusoid at 1.6 Hz, with each axis tested separately, Natural preset. Peak spring displacement expressed in CSS pixels at the unchanged 390×844 framing:

| Character | R13.2 X/Y | R13.3 X/Y | R13.3 forward/back |
|---|---:|---:|---:|
| Ember | 1.96 | 3.03 | 1.91 |
| Midnight | 2.10 | 3.22 | 2.04 |
| Aurelia | 2.11 | 3.26 | 2.05 |
| Holly | 3.67 | 5.77 | 3.56 |
| Santa | 3.11 | 4.94 | 3.02 |

These are spring-node measurements after source-to-screen scaling, before mask attenuation, not optical flow or physical iPhone measurements.

Auto ran for 30 seconds per case. After startup, every half-second window contained motion above 1 CSS pixel/second in both R13.2 and R13.3. R13.3 peak displacement was 25% larger in every matched case. Natural peak Auto displacement was 1.75/1.82/1.86/1.79/3.41 CSS pixels for Ember/Midnight/Aurelia/Holly/Santa. Across all three presets, the largest peak was Santa Chaos at 6.28 CSS pixels. This confirms continuous modest spring motion, not a human realism score.

Completed checks:

- **56 controller checks:** direction, proportional small-input response, noise/gravity rejection, orientation, stale readings, continuous Auto, input budgets, touch/hidden exclusion and cooldown.
- **60 before/after cases:** five characters × three presets × two renderers × R13.2/R13.3. All new cases maintain continuous Auto and respond more strongly to gentle X/Y/Z input. See `evidence/continuous.json`.
- **90 R12 regression comparisons:** five characters × three presets × kick/drag/flick × WebGL/Canvas. With optional effects off, spring traces and rendered frames match R12 exactly.
- **10 synthetic-motion cases:** all five characters in both renderers, visible rendered changes, touch priority and pixel-exact return to rest. Stronger ±6 m/s² input remains subject to the original boundaries; it can reach those bounds.
- Permission denied/error/unsupported paths, direct-gesture permission, saved settings, hidden suspension, blocked storage, keyboard controls and listener removal pass. Real-animation-loop tests exercise touch activation, continuous Auto, the no-reading notice and gentle depth events.
- The existing R12 promotion/offline suite previously passed 50 checks. Production files remain unchanged in this revision.

The prior R13.2 desktop JS-only batch of 100,000 controller ticks plus 50,000 synthetic samples took 79 ms. This excludes rendering, GPU, hardware sensors and battery drain and is not an iPhone performance result.

## Recordings and remaining limits

`evidence.html` contains actual side-by-side rendered recordings: R12/off at rest on the left, R13.3 on the right. Gentle synthetic shake occurs early, and continuous Auto starts at 3 s. Five WebGL recordings cover all characters; Canvas recordings cover Ember and Santa. All five Canvas characters are tested. The captures are deterministic 20 fps frames from a 120 Hz simulation, not real-time performance recordings. Representative peak frames and raw measurements are included.

Sensor availability varies by browser even after permission is granted. Gravity fallback can confuse slow tilt with translation. The lower threshold may reveal more hand tremor, which requires real-phone evaluation. Z movement is approximated vertically. Original WebGL/Canvas sampling differences and texture/silhouette limitations remain. Preview hosting is online-only; no service worker is installed.

Keep R13 experimental until Lance confirms gentle Shake, continuous Auto, touch/release, background/resume and character switching on his iPhone. Main and live R12 are untouched. R14 sound work remains out of scope.
