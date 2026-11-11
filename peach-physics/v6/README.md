# Peach Physics — Christmas Elves, v0.0.6

Adds a second Christmas elf to the original full-screen physics app, while **leaving v0.0.5 completely unchanged**.

## Characters

- **Winter Ember (1/2):** the original redheaded elf with exactly the v0.0.5 spring and mask settings.
- **Midnight Yule (2/2):** the user-supplied brunette holiday elf, with separately calibrated spring points, boundary fades, touch regions, clothing seam cutoff, and split axis.

The unobtrusive two-arrow switch icon in the upper left changes characters; the gear in the upper right still opens the physics settings. A brief toast confirms the selected character. The app remembers the last selected elf.

## Physics and persistence

- The v0.0.5 contact press, slap, traveling wave, spring constraints, linked force transfer, sound option, two-finger touches, presets, and fullscreen positioning are retained. No blanket change to the approved physics.
- Each character has independent slider/preset/audio preferences stored locally. Winter Ember imports existing v0.0.5 or v0.0.4 preferences when possible.
- Character switching swaps the image texture and WebGL shader calibration, clears motion state, and retains stable canvas and gesture handlers. Canvas fallback uses the active character's independently calibrated regions.
- Both portraits are embedded in the self-contained HTML; the service worker caches the page offline after its initial HTTPS load. No analytics, accounts, or remote assets. The shared Home Screen icon is inherited from the existing public app.

## Verification

- Source image of Winter Ember is byte-for-byte identical to the v0.0.5 embedded asset.
- New portrait was resized to the same 941×1671 coordinate system and WebP encoded at quality 92; the source user image is not modified.
- 54/54 browser tests passed across 390×844, 430×932 and 440×956, including both character renders, press/slap, paired taps, separate pointer release, switch-back, original calibrations, separate settings, persistent selection, and no JS runtime errors.
- The test browser renders in Canvas fallback; iPhone WebGL graphics, audible sound, offline reopen, and Home Screen launching require real-device validation.