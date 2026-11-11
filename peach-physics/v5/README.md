# Peach Physics — Christmas Elf, v0.0.5

A standalone, free, touch-first mobile web app. The full-screen redhead elf artwork and garment/edge deformation masks are unchanged from v0.0.4.2. The earlier versions remain published at their existing URLs.

## What's new

- Contact is modeled separately from rebound: a held touch gently compresses the image; releasing a quick tap triggers the established sharper slap impulse.
- A bounded, damped traveling wave emanates from the contact point through the same existing WebGL garment masks. It fades quickly and doesn't shift clothing seams.
- Tap response now varies subtly by vertical and horizontal contact position, without changing the overall approved spring tuning.
- **Linked movement** slider: 0 = independent, 50 = the original v0.0.4.2 cross-cheek transfer, 100 = twice that transfer. It persists independently of Natural/Playful/Chaos presets. Defaults to 50.
- Optional tap sound remains muted by default; finger-specific simultaneous touch, directional flick, reset, and portrait framing remain.
- Canvas fallback offers a smaller compression effect; improved traveling-wave visualization requires WebGL.

## Verification

Source image preserved byte-for-byte. Fixed-step simulation remains 120 Hz with bounded velocities/displacements. Offline cache is separately scoped to v0.0.5.

54/54 automated mobile-sized Chromium browser assertions passed at 390x844, 430x932, and 440x956, including press-hold, tap-to-slap, wave decay, two-pointer release, linked transfer at 0 and 50, controls toggling, persistent settings, and no JavaScript runtime exceptions. The test browser ran the Canvas fallback; actual iPhone WebGL appearance, sound, and offline reopening remain unverified until real-device testing.

This is physics-inspired 2D image deformation, not a true 3D soft-body simulation.
