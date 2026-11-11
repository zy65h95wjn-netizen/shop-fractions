# Peach Physics v0.0.4.1 — Screen-right physics polish

Small surgical update preserving the v0.0.4 picture, layout, preset controls, optional slap sound and the entire screen-left spring setup.

- Narrowed the **screen-right** deformation region slightly and moved its lowest spring point upward.
- Screen-right only: 12% less initial slap and flick impulse, 11% higher spring damping.
- Screen-right secondary oscillation is reduced and damps sooner.
- Added a soft taper to the right edge and lower region, preventing over-pulling toward the thigh.
- Canvas fallback is also slightly tighter on the right.
- Versioned alongside the validated v0.0.4 release; does not modify prior version folders.

Technical note: This is 2D image deformation, not physical 3D soft-body simulation. Smartphone WebGL appearance requires a real-device check.