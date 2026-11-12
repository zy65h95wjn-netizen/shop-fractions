"""Compose fabric A/B review images from holly-fabric-captures.cjs output (requires Pillow).

usage: python3 holly-fabric-sheets.py <capture dir> <destination dir>
Columns are A (r9.1) and B (strong fabric support) at identical spring states. Crops are native
rendered pixels (390x844 viewport, device scale 2) unless marked 2x (nearest-neighbour).
Every file stays below 700 KiB.
"""
import json, os, sys
from PIL import Image, ImageDraw

src, dst = sys.argv[1], sys.argv[2]
os.makedirs(dst, exist_ok=True)
m = json.load(open(os.path.join(src, 'manifest.json')))
f = m['framing']; dpr = m['viewport']['deviceScaleFactor']
BG, FG = (18, 20, 19), (240, 236, 228)
COLS = [('A', 'A: r9.1'), ('B', 'B: strong fabric')]


def box(x0, y0, x1, y1):
    sx = lambda x: round((f['x'] + x / 720 * f['width']) * dpr)
    sy = lambda y: round((f['y'] + y / 1280 * f['height']) * dpr)
    return (sx(x0), sy(y0), sx(x1), sy(y1))


CUP = {'L': box(250, 296, 374, 420), 'R': box(388, 296, 502, 420)}
FUR = {'L': box(256, 318, 372, 402), 'R': box(392, 318, 500, 402)}
BOTH = box(252, 290, 506, 418)
img = lambda name: Image.open(os.path.join(src, name)).convert('RGB')


def grid(cells, cols, top_labels, left_labels, gap=4, left=150, top=22):
    cw = max(c.width for c in cells); ch = max(c.height for c in cells); rows = len(cells) // cols
    sheet = Image.new('RGB', (left + cols * (cw + gap), top + rows * (ch + gap)), BG); d = ImageDraw.Draw(sheet)
    for i, t in enumerate(top_labels):
        d.text((left + i * (cw + gap) + 3, 5), t, fill=FG)
    for r, t in enumerate(left_labels):
        for k, line in enumerate(t.split('\n')):
            d.text((4, top + r * (ch + gap) + ch // 2 - 6 + 12 * k), line, fill=FG)
    for i, c in enumerate(cells):
        sheet.paste(c, (left + (i % cols) * (cw + gap), top + (i // cols) * (ch + gap)))
    return sheet


def save(im, name, quality=90):
    path = os.path.join(dst, name)
    while True:
        im.save(path, quality=quality, optimize=True)
        if os.path.getsize(path) < 700 * 1024:
            break
        quality -= 4
    print(name, im.size, os.path.getsize(path) // 1024, 'KiB')


STATES = ['natural-tap-peak', 'natural-tap-rebound', 'chaos-tap-peak', 'strong-flick-down', 'strong-flick-up',
          'drag-inward-up-from-outer-cup', 'node-bound-inward-up']
# 1. Native 1:1 stills, A | B, both renderers, both sides side by side.
for backend in ['webgl', 'canvas']:
    cells, rows = [], ['rest'] + [s.replace('-', ' ') for s in STATES]
    for s in ['rest'] + STATES:
        for side in 'LR':
            for v, _ in COLS:
                name = f'{backend}-{v}-rest.png' if s == 'rest' else f'{backend}-{v}-{side}-{s}.png'
                cells.append(img(name).crop(CUP[side]))
    labels = [f'left {t}' for _, t in COLS] + [f'right {t}' for _, t in COLS]
    save(grid(cells, 4, labels, [r.replace(' from outer cup', '\nfrom outer cup') for r in rows]), f'{backend}-ab.jpg')
# 2. 2x close-ups of the trim, WebGL.
cells, rows = [], []
for side in 'LR':
    for s in ['natural-tap-peak', 'chaos-tap-peak', 'strong-flick-up', 'drag-inward-up-from-outer-cup']:
        rows.append(f"{'left' if side == 'L' else 'right'}\n{s.replace('-', ' ').replace(' from outer cup', '')}")
        for v, _ in COLS:
            c = img(f'webgl-{v}-{side}-{s}.png').crop(FUR[side]); cells.append(c.resize((c.width * 2, c.height * 2), Image.NEAREST))
save(grid(cells, 2, [t + ' (2x nearest)' for _, t in COLS], rows), 'closeups-2x.jpg', quality=88)
# 3. Temporal strip: natural tap, every 3rd 1/60 s capture.
frames = [0, 3, 6, 9, 12, 15, 18, 24, 30, 36]
cells, rows = [], []
for side in 'LR':
    for v, t in COLS:
        rows.append(f"{t}\n{'left' if side == 'L' else 'right'} tap")
        cells += [img(f'motion-webgl-{v}-natural-tap-{side}-{k:02d}.png').crop(FUR[side]) for k in frames]
save(grid(cells, len(frames), [f'{k / 60:.2f} s' for k in frames], rows, left=130), 'temporal-natural-tap.jpg')
# 4. Motion: A | B side by side, both cups, 30 fps playback of 60 fps captures (0.5x speed).
seqs = [('webgl', 'natural-tap'), ('webgl', 'chaos-tap'), ('webgl', 'flick-up'), ('webgl', 'drag-inward-up'), ('canvas', 'natural-tap')]
for backend, label in seqs:
    out = []
    for side in 'LR':
        for k in range(48):
            panels = [img(f'motion-{backend}-{v}-{label}-{side}-{k:02d}.png').crop(BOTH) for v, _ in COLS]
            w, h = panels[0].size
            fr = Image.new('RGB', (2 * w + 4, h + 18), BG); d = ImageDraw.Draw(fr)
            for i, (p, (_, t)) in enumerate(zip(panels, COLS)):
                fr.paste(p, (i * (w + 4), 18)); d.text((i * (w + 4) + 3, 3), t, fill=FG)
            d.text((w - 150, 3), f"{backend} {label} {'left' if side == 'L' else 'right'} 0.5x", fill=FG)
            out.append(fr)
    path = os.path.join(dst, f'motion-{backend}-{label}.webp')
    for quality in range(80, 20, -6):
        out[0].save(path, save_all=True, append_images=out[1:], duration=33, loop=0, quality=quality, method=6)
        if os.path.getsize(path) < 700 * 1024:
            break
    print(os.path.basename(path), out[0].size, len(out), 'frames', os.path.getsize(path) // 1024, 'KiB q', quality)
