# Peach Physics v0.0.4.2 — coupled bounce refinement

Goal: preserve the approved, sharper garment-edge behavior from v0.0.4.1 and restore the livelier, more organic motion preferred from v0.0.4.

Changes are limited to spring response:
- Restore the right-side main spring damping and secondary follow-through from v0.0.4.
- Increase touch, slap, and flick impulse by ~6% relative to the original v0.0.4; relax overall damping by ~3%.
- **Preserve** the small cross-side force transfer on both ordinary impulses and quick slaps. Opposite cheek response is deliberate, weaker than the activated side.
- Retain v0.0.4.1's right-side clothing mask, feather, lower-point geometry, image, crop, and interface.
- Restore most of the right-side Canvas fallback motion inside the established mask.
- Keep Natural/Playful/Chaos presets, 2-finger controls, optional sound and existing preference key (v004).

Testing: JavaScript syntax checks and Chromium touch emulation at 390×844, 430×932, and 440×956 passed in Canvas fallback, including verified small cross-side response, two-finger taps, tap-to-slap, flicking, controls, and unchanged embedded image. iPhone WebGL look/feel requires user acceptance.

All earlier public versions remain available at their prior URLs.
