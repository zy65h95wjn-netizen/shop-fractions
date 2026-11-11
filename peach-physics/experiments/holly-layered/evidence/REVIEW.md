# Holly layered prototype: review evidence

This branch transfers the existing prototype from commit `14a46799cf901e7f205d531de824d86d1cfbfb79`. The transfer adds native-resolution review images and this index; it does not revise the implementation, physics, original artwork or findings, and does not deploy anything.

**Not visually accepted.** Pink hatching marks missing source pixels. Read the [findings and source-art requirements](../FINDINGS.md) before evaluating the motion. The [prototype README](../README.md) explains local preview and reproduction.

## Native-resolution stills

The following contact sheets paste original capture pixels at **1:1, with no resizing**. Each column is r5, r6 or the layered prototype; rows are impact, peak, rebound and settled. The 390×844 CSS-pixel viewport was captured at DPR 2. The crop is `(195, 535)–(683, 872)` in the original 780×1688 capture. Download or open the raw PNG to inspect at native scale; GitHub may shrink its inline preview.

| Backend | Left-side sequence | Right-side sequence | Entire right-peak frame |
| --- | --- | --- | --- |
| WebGL | [Native contact sheet](native/webgl-left-contact-sheet.png) | [Native contact sheet](native/webgl-right-contact-sheet.png) | [780×1688 PNG](native/webgl-right-peak-full.png) |
| Canvas | [Native contact sheet](native/canvas-left-contact-sheet.png) | [Native contact sheet](native/canvas-right-contact-sheet.png) | [780×1688 PNG](native/canvas-right-peak-full.png) |

The two whole-frame PNGs are byte-for-byte copies of the existing captures. [The manifest](native/manifest.json) records dimensions, byte counts, SHA-256 hashes and capture provenance. Each PNG is below 2.3 MB; all six together are about 9.8 MB. The full raw capture archive and incomplete test output are not included in the transfer.

## Existing motion and measurement evidence

- Videos: [WebGL MP4](comparison-webgl.mp4) · [Canvas MP4](comparison-canvas.mp4), about 0.26 MB each.
- Overview phase sheets: [WebGL](phases-webgl.png) · [Canvas](phases-canvas.png). Additional sheets cover 375, 390, 430 and 440 CSS-pixel widths.
- [Deformation-field visualization](field.png) · [field vectors and uncovered-area measurements](field.json).
- [Motion states and phase timings](states.json) · [validation and performance measurements](metrics.json) · [backend parity](backend-parity.json) · [original-artwork provenance](provenance.json).

The existing measured right-side peak exposes roughly 920 source pixels, with a maximum horizontal uncovered run of 21 source pixels in that pose. Those are diagnostics of missing information, not visual acceptance. The existing 108 trajectory comparisons and exact resting-pixel comparisons remain unchanged; no new motion experiment was run for this transfer.
