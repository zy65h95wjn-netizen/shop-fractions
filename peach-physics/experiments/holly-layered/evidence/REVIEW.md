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

## Connector-sized supplemental stills

These additional assets preserve commit `051dcb7ab1ccc87073e09e7762e60629151141e9` and all existing evidence. They reuse its original captured frames; no implementation, animation, physics, or source portrait was changed. Every file below is smaller than **700 KiB (716,800 bytes)**.

The four JPEG sheets have labeled r5/r6/layered columns and six temporal rows: impact (0 s), loading (0.067 s), peak (0.100 s), return (0.200 s), rebound (left 0.308 s / right 0.292 s), and settled (8 s). Intermediate rows come from existing movie captures 002 and 006. Each 266×337 source crop is pasted at native **1:1**, with no resizing; sheets are 798×2278 pixels. JPEG quality is **93, 4:4:4** (no chroma subsampling). JPEG encoding is lossy; use the PNG close-ups for exact edge colors.

Crop rectangles in the original 780×1688 DPR-2 captures are left `(195, 535)–(461, 872)` and right `(431, 535)–(697, 872)`. Identical crops are applied to all three renderer columns. The separate 266×337 RGBA PNG close-ups preserve the original crop pixels **exactly**, including pink gap diagnostics; no palette reduction or retouching is used.

| Backend | Left contact sheet | Right contact sheet |
| --- | --- | --- |
| WebGL | [JPEG](compact/webgl-left-contact-sheet.jpg) — 692,942 bytes | [JPEG](compact/webgl-right-contact-sheet.jpg) — 642,550 bytes |
| Canvas | [JPEG](compact/canvas-left-contact-sheet.jpg) — 690,858 bytes | [JPEG](compact/canvas-right-contact-sheet.jpg) — 639,372 bytes |

| Backend / side | Layered peak (lossless) | Layered rebound (lossless) |
| --- | --- | --- |
| WebGL / left | [PNG](compact/webgl-layered-left-peak.png) — 154,369 bytes | [PNG](compact/webgl-layered-left-rebound.png) — 156,920 bytes |
| WebGL / right | [PNG](compact/webgl-layered-right-peak.png) — 141,575 bytes | [PNG](compact/webgl-layered-right-rebound.png) — 144,525 bytes |
| Canvas / left | [PNG](compact/canvas-layered-left-peak.png) — 162,714 bytes | [PNG](compact/canvas-layered-left-rebound.png) — 163,518 bytes |
| Canvas / right | [PNG](compact/canvas-layered-right-peak.png) — 149,365 bytes | [PNG](compact/canvas-layered-right-rebound.png) — 150,948 bytes |
