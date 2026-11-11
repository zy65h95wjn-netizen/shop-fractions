# Peach Physics v0.0.6.2.3 — left-side ripple and thigh boundary

New: https://zy65h95wjn-netizen.github.io/shop-fractions/peach-physics/v6-2-3/

Comparison / rollback: https://zy65h95wjn-netizen.github.io/shop-fractions/peach-physics/v6-2-2/

## Report and cause

Actual iPhone feedback on v6-2-2 described a left cheek with little central ripple, an outer edge that seemed held, and unwanted pulling below the cheek and into the inner thigh. The accepted right cheek remained the reference.

The previous left support extended too far below the crease. Normalizing the three spring weights made the center translate almost uniformly, and compressing the wave together with the main movement suppressed the ripple during stronger displacement. These were left-side rendering choices, not problems with the user's description.

## Changes

Only Midnight's left visual deformation changes. The lower and inner support boundary now stops around the cheek crease, with a short feathered transition. The lower and inner thigh are excluded. The upper and outer contour positions are retained.

The left response combines a 35% broad carrier with 65% of the original Gaussian spring weighting used by the accepted right-side renderer. This keeps the rim participating while restoring variation through the center. The traveling wave is added after the main movement's soft limit so a strong displacement does not flatten the ripple. Ordinary main displacement up to 24 source pixels is uncompressed, with larger excursions approaching 32 pixels smoothly; previously these values were 18 and 22. The existing four-step pixel flow and cached mask still provide the boundary transition. No spring amplitudes, damping, force, coupling, gesture handling or wave timing are changed.

Midnight's right-side rendering, Winter Ember, linked-movement calibration, original photo bytes, lighting, resolution and portrait framing are preserved. This patch adds no depth effect. The earlier investigation found that the perceived depth difference was primarily photographic; a convincing cosmetic improvement remains unresolved.

## Verification

Tests used Chromium 156 with SwiftShader WebGL, not a physical iPhone. The shortened boundary was tested independently before changing the internal response; the complete suite then passed again with both changes.

`tests/browser.cjs`: **216 assertions passed** across 375×667, 390×844, 430×932 and 440×956 viewports, device scale factor 2.

- Both characters load and switch. Resting canvas images match v6-2-2 exactly.
- Both sides' simulated slap, kick, drag and flick trajectories match v6-2-2 at linked movement 0/50/100, including secondary followers and waves. The existing Midnight slider calibration is preserved.
- Right-only rendered motion at 50 ms and linking zero is pixel-identical to v6-2-2 for both characters.
- Four extreme left poses at every size leave sampled scenery, garment, stockings, right side, lower thigh and inner thigh patches unchanged. Skin and lower-crease patches still move.
- Two simultaneous CDP touches remain independent; lifting one preserves the other. Presets, settings/audio preference persistence, old-profile protection, switching, settling and a 30-slap Chaos stress test pass.
- No WebGL errors occur in the tested poses. Canvas fallback loads and switches without uncaught errors; its deformation remains an approximation of WebGL rendering.

`tests/deformation.cjs` measures actual final fragment-shader texture coordinates at 440×956. With all three left springs displaced downward by 10 source pixels:

| Source-image sample | v6-2-2 motion | v6-2-3 motion |
| --- | ---: | ---: |
| Center (300,1145) | 11.50 px | 12.10 px |
| Inside center, toward the seam (365,1145) | 11.50 px | 9.03 px |
| Outer rim (183,1200) | 11.09 px | 7.93 px |
| Inner rim (435,1205) | 11.33 px | 5.48 px |
| Lower crease (310,1290) | 11.50 px | 8.38 px |
| Upper rim (315,1020) | 10.65 px | 9.12 px |
| Below cheek (310,1350) | 4.68 px | less than 0.01 px |
| Inner thigh (445,1320) | 1.73 px | less than 0.01 px |

The two interior samples now differ instead of translating as a flat patch. The four rim samples retain motion. With a controlled 25-pixel main displacement, switching a wave on adds 2.32 pixels at the sampled wavefront, versus 0.12 pixels previously. This measures preservation of the traveling ripple, not a subjective realism score.

All seven tested fields have positive sampled texture-map orientation, including four maximum-displacement stress directions: no sampled folds. The lowest determinant in the new stress poses is approximately 0.116. These checks cover the stated poses and locations; they are not a guarantee for every possible gesture.

Matched slap frames at 50, 117 and 250 ms were captured; the 117 ms pair was visually compared. Screenshots remain outside the application payload in `/tmp/peach-v6-2-3-tests`. Original embedded WebP bytes were verified identical and application/service-worker JavaScript passed syntax checks.

Isolated 90-frame active-animation samples showed order-sensitive software-renderer timing. Running v6-2-2 first gave medians of 33.4/49.9 ms for old/new; reversing the order gave 33.4/49.9 ms for new/old. The p95 values ranged from 66.7 to 83.3 ms. There is no consistent version difference in these samples. They do not establish smooth Safari performance or a hardware frame rate.

Serve the repository root on port 8000 with Playwright and Chromium available, then run:

```
node peach-physics/v6-2-3/tests/browser.cjs
node peach-physics/v6-2-3/tests/deformation.cjs
```

`CHROMIUM` can override `/usr/bin/chromium`. Test instrumentation is injected into local responses and is not shipped in the application. Raw results are beside the scripts.

## Release isolation and remaining validation

Only `peach-physics/v6-2-3/` is added. All older URLs and files remain unchanged. Preferences and the `peach-physics-v00623-r1` cache are independent. Preferences import from v6-2-2, then v6-2-1, v6-2 and v6 when no new profile exists; old profiles are never written.

The remaining test is the user's actual iPhone comparison: whether the center ripple and outer response now look natural, whether the shortened boundary stops the reported pulling, and whether Safari stays smooth. Home Screen behavior and audible sound quality also remain real-device checks. Stop after publication and await feedback.
