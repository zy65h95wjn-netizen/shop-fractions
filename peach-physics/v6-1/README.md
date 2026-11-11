# Peach Physics v0.0.6.1 — Midnight Yule calibration

Surgical follow-up to the tested, preserved public v0.0.6. Published as a new standalone GitHub Pages path.

## Requested corrections

- **Brunette only:** The portrait is zoomed 12% toward the subject while keeping the elf's full hat and face clear of the phone's top status area, removing the oversized dark band at the bottom.
- **Brunette screen-left side:** Slightly tightened image-space deformation region, modestly raised lower spring point, 10% gentler touch/slap/drag impulse, and 6% more spring damping. Right-side geometry, input amplitude, and spring damping are preserved.
- **Linked movement:** The original v0.0.6 passed only a near-invisible tap impulse to the opposite side. Brunette linked motion now combines visible but bounded impact transfer with a moderate continuous cross-center spring and subtle drag transfer. At slider 0, sides remain independent. The redhead's linked physics are not changed.
- All artwork, clothing texture, character switching, saved per-character profiles, presets, audio, full-screen UI, and offline cache behavior are retained.

## Verification

- All 60 browser assertions passed at 390×844, 430×932, 440×956, and 512×1112.
- Stress checked 30 consecutive slaps under Chaos with transfer 100: no uncaught errors or uncontrolled displacements. Reset and switching to the original redhead were successful.
- Verified exact embedded JPEG/WebP source strings for both portraits remained unchanged.
- Browser tests used Canvas fallback. Final WebGL deformation, actual iPhone appearance and offline behavior require device confirmation.

Published as a separate folder for safe before/after comparison. Version v0.0.6 remains untouched.
