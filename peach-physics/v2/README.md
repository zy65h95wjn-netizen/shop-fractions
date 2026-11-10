# Peach Physics — Experiment 02

Independent, portrait-mode Christmas elf experiment at `/peach-physics/v2/`.

**Version 0.0.2** uses a single approved redhead Christmas elf image, six coupled spring nodes, two independently responsive regions, fixed-step spring/damping simulation, touch/flick controls, a full-screen cover crop, and a hidden settings drawer.

The scene uses a WebGL mesh-based UV warp when supported, with a canvas-based reduced-effects fallback. No trackers, ads, remote dependencies, or accounts. All artwork is embedded in the standalone HTML document. The existing `/peach-physics/` v0.0.1 remains unchanged.

Source note: Single-view image deformation is physics-inspired, not accurate 3D soft-body mechanics. WebGL path requires real-device acceptance; the current browser sandbox only permits Canvas fallback.

## Revision 2 (same v0.0.2 URL)

- Restores the **Controls** button after the panel is hidden; the controls drawer no longer intercepts touches while closed.
- Tracks two independent simultaneous finger pointers, including one-finger lift while the other remains active.
- Reframes the photo with a safe top margin, near-full-width portrait view and blurred continuation, so the character's head clears the iPhone top status area.
- Leaves all spring equations and current tuning unchanged. Dynamic frame coordinates are recalculated together with the touch map.
- Tested in Canvas fallback at 390x844, 430x932 and 440x956 mobile-sized viewports. WebGL on physical iPhone remains a user test.
