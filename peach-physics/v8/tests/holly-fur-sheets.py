"""Compose review images from holly-fur-captures.cjs output (requires Pillow).

usage: python3 holly-fur-sheets.py <capture dir> <destination dir>
Crops are native rendered pixels from the 390x844 viewport at device scale 2 (1:1),
except the close-up sheet, which enlarges 1:1 crops 2x with nearest-neighbour sampling.
Every image is kept below 700 KiB.
"""
import json, os, sys
from PIL import Image, ImageDraw

src, dst = sys.argv[1], sys.argv[2]
os.makedirs(dst, exist_ok=True)
m = json.load(open(os.path.join(src, 'manifest.json')))
f = m['framing']; dpr = m['viewport']['deviceScaleFactor']
VERSIONS = [('r8', 'r8'), ('r9', 'r9 (live)'), ('current', 'r9.1')]
BG, FG = (18, 20, 19), (240, 236, 228)


def box(x0, y0, x1, y1):
    """Source-pixel rectangle -> screen-pixel crop box."""
    sx = lambda x: round((f['x'] + x / 720 * f['width']) * dpr)
    sy = lambda y: round((f['y'] + y / 1280 * f['height']) * dpr)
    return (sx(x0), sy(y0), sx(x1), sy(y1))


CUP = {0: box(250, 300, 374, 420), 1: box(388, 300, 502, 420)}
FUR = {0: box(256, 322, 372, 402), 1: box(392, 322, 500, 402)}
BOTH = box(252, 318, 502, 412)
img = lambda name: Image.open(os.path.join(src, name)).convert('RGB')


def grid(cells, cols, labels_top, labels_left, gap=4, left=118, top=22):
    cw = max(c.width for c in cells); ch = max(c.height for c in cells); rows = len(cells) // cols
    sheet = Image.new('RGB', (left + cols * (cw + gap), top + rows * (ch + gap)), BG)
    d = ImageDraw.Draw(sheet)
    for i, t in enumerate(labels_top):
        d.text((left + i * (cw + gap) + 3, 5), t, fill=FG)
    for r, t in enumerate(labels_left):
        for k, line in enumerate(t.split('\n')):
            d.text((4, top + r * (ch + gap) + ch // 2 - 6 + 12 * k), line, fill=FG)
    for i, c in enumerate(cells):
        sheet.paste(c, (left + (i % cols) * (cw + gap), top + (i // cols) * (ch + gap)))
    return sheet


def save(im, name, quality=90):
    path = os.path.join(dst, name)
    while True:
        im.save(path, quality=quality, optimize=True) if name.endswith('.jpg') else im.save(path, optimize=True)
        if os.path.getsize(path) < 700 * 1024 or not name.endswith('.jpg'):
            break
        quality -= 4
    print(name, im.size, os.path.getsize(path) // 1024, 'KiB')


STATES = ['rest', 'natural-peak', 'natural-rebound', 'chaos-peak', 'large-down', 'large-up', 'large-up-plus-x']
# 1. Native 1:1 still comparisons, both renderers.
for backend in ['webgl', 'canvas']:
    for side in [0, 1]:
        cells = [img(f"{backend}-{v}-{'LR'[side]}-{s}.png").crop(CUP[side]) for s in STATES for v, _ in VERSIONS]
        save(grid(cells, 3, [t for _, t in VERSIONS], [s.replace('-', ' ') for s in STATES]),
             f"{backend}-{'left' if side == 0 else 'right'}.jpg")
# 2. Close-ups of the trim at peak and extremes, 2x nearest, WebGL.
cells = []
rows = []
for side in [0, 1]:
    for s in ['natural-peak', 'chaos-peak', 'large-down', 'large-up', 'large-up-plus-x']:
        rows.append(f"{'left' if side == 0 else 'right'}\n{s.replace('-', ' ')}")
        for v, _ in VERSIONS:
            c = img(f"webgl-{v}-{'LR'[side]}-{s}.png").crop(FUR[side])
            cells.append(c.resize((c.width * 2, c.height * 2), Image.NEAREST))
save(grid(cells, 3, [t + ' (2x nearest)' for _, t in VERSIONS], rows), 'closeups-2x.jpg', quality=88)
# 3. Temporal strip: natural slap, every 3rd capture (1/20 s), WebGL, native 1:1.
frames = [0, 3, 6, 9, 12, 15, 18, 24, 30, 36]
cells, rows = [], []
for side in [0, 1]:
    for v, t in VERSIONS:
        rows.append(f"{t}\n{'left' if side == 0 else 'right'} tap")
        cells += [img(f"motion-{v}-natural-{'LR'[side]}-{k:02d}.png").crop(FUR[side]) for k in frames]
save(grid(cells, len(frames), [f"{k / 60:.2f} s" for k in frames], rows), 'temporal-natural.jpg')
# 4. Continuous motion: 1:1 crops of both cups, versions stacked, 30 fps playback of 60 fps captures (0.5x speed).
for preset in ['natural', 'chaos']:
    out = []
    for side in [0, 1]:
        for k in range(48):
            panels = [img(f"motion-{v}-{preset}-{'LR'[side]}-{k:02d}.png").crop(BOTH) for v, _ in VERSIONS]
            w, h = panels[0].size
            fr = Image.new('RGB', (w + 70, 3 * h + 8), BG); d = ImageDraw.Draw(fr)
            for i, (p, (_, t)) in enumerate(zip(panels, VERSIONS)):
                fr.paste(p, (70, i * (h + 4))); d.text((4, i * (h + 4) + h // 2 - 6), t, fill=FG)
            d.text((4, 4), f"{preset}\n{'left' if side == 0 else 'right'}\n0.5x", fill=FG)
            out.append(fr)
    # Animated WebP keeps every captured frame within the size limit (GIF cannot).
    path = os.path.join(dst, f'motion-{preset}.webp')
    for quality in range(82, 30, -6):
        out[0].save(path, save_all=True, append_images=out[1:], duration=33, loop=0, quality=quality, method=6)
        if os.path.getsize(path) < 700 * 1024:
            break
    print(f'motion-{preset}.webp', out[0].size, len(out), 'frames', os.path.getsize(path) // 1024, 'KiB', 'q', quality)
