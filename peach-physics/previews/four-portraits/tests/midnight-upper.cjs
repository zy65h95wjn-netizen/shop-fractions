// Run against a repository-root server using the same PEACH_TEST_URL as the v8 suites.
const { chromium, assert, base } = require('../../../v8/tests/harness.cjs');

async function checkUpperEdge(browser, renderer) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 2,
    isMobile: true, hasTouch: true, serviceWorkers: 'block',
  });
  try {
    if (renderer === 'canvas') await context.addInitScript(() => {
      const native = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (kind, ...args) {
        return /webgl/i.test(kind) ? null : native.call(this, kind, ...args);
      };
    });
    const page = await context.newPage();
    await page.goto(base + '/peach-physics/previews/four-portraits/?portrait=midnight');
    await page.waitForFunction(() => document.querySelector('.loading').hidden);
    await page.locator('button[data-mode="study"]').click();
    await page.locator('#zoom').click();
    const frame = page.frame({ name: 'study' });
    const actual = await frame.evaluate(() => study.snapshot().renderer);
    assert.equal(actual, renderer);

    const measurements = await frame.evaluate(() => {
      const canvas = document.getElementById('game');
      const strip = document.createElement('canvas');
      strip.width = 675;
      strip.height = 210;
      const paint = strip.getContext('2d', { willReadFrequently: true });
      // Sample the crest, inner slope, outer slope, and tip. The last span
      // follows the whole inner arc so a local hook cannot hide in a median.
      const spans = [[305, 395, 255, 425, 370], [598, 523, 679, 487]];
      const widths = [33, 15, 15, 15, 81];
      const step = n => { for (let i = 0; i < n; i++) study.tick(1 / 120); };
      const median = a => a.sort((a, b) => a - b)[Math.floor(a.length / 2)];

      function heights(side, state) {
        const f = state.framing;
        const sx = canvas.width / state.size[0], sy = canvas.height / state.size[1];
        const w = f.width / state.image[0], h = f.height / state.image[1];
        study.draw();
        paint.drawImage(canvas, (f.x + 135 * w) * sx, (f.y + 900 * h) * sy,
          strip.width * w * sx, strip.height * h * sy, 0, 0, strip.width, strip.height);
        const pixels = paint.getImageData(0, 0, strip.width, strip.height).data;
        // Scan upward from the warmer skin into the pale trim. Compare the same
        // columns before and during the gesture, accounting for the two different arcs.
        return spans[side].map((start, j) => Array.from({ length: widths[j] }, (_, col) => {
          const x = start + col - 135;
          for (let y = strip.height - 1; y > 0; y--) {
            const k = 4 * (strip.width * y + x);
            if (pixels[k + 2] > .56 * pixels[k]) return y;
          }
          throw Error('Upper trim missing in source column ' + (x + 135));
        }));
      }

      const pulls = [
        { points: [[321, 1054], [614, 1048]], dx: 0, dy: 150 },
        { points: [[283, 1147], [601, 1146]], dx: 85, dy: -138 },
        { points: [[374, 1065], [561, 1059]], dx: 115, dy: 225 },
      ];
      return pulls.map(({ points, dx, dy }) => points.map(([x, y], side) => {
        study.cancel();
        study.reset();
        study.auto(false);
        study.view(0, 0);
        study.draw();
        const state = study.snapshot(), f = state.framing;
        const rect = canvas.getBoundingClientRect();
        const before = heights(side, state);
        const pointer = (type, px, py) => canvas.dispatchEvent(new PointerEvent(type, {
          pointerId: 12, pointerType: 'touch', bubbles: true, cancelable: true,
          clientX: rect.left + f.x + px * f.width / state.image[0],
          clientY: rect.top + f.y + py * f.height / state.image[1],
        }));
        pointer('pointerdown', x, y);
        for (let i = 1; i <= 6; i++) {
          step(4);
          pointer('pointermove', x + (side ? dx : -dx) * i / 6, y + dy * i / 6);
        }
        step(32);
        const touch = study.snapshot().activePointers[0];
        if (touch?.side !== side || !touch.grabbed) throw Error('Gesture missed its target');
        const held = heights(side, state);
        study.cancel();
        const travel = held.slice(0, 4).map((line, j) => median(line.map((height, i) => height - before[j][i])));
        if (side === 1) return { travel };
        const arc = held[4];
        let deepest = 0, rise = 0;
        for (let i = 0; i <= arc.length - 7; i++) {
          const height = arc.slice(i, i + 7).reduce((a, b) => a + b) / 7;
          deepest = Math.max(deepest, height);
          rise = Math.max(rise, deepest - height);
        }
        return { travel, rise };
      }));
    });
    const [down, diagonal, outward] = measurements;
    const leftCrest = down[0].travel[0], rightCrest = down[1].travel[0];
    assert(leftCrest >= 4 && leftCrest < rightCrest * .72, renderer + ' supported trim still gives at the crest');
    assert(rightCrest >= (renderer === 'webgl' ? 22 : 10), renderer + ' right reference retains its travel');
    for (const [left] of [down, outward]) {
      assert(Math.abs(left.travel[3]) <= 4, renderer + ' inner tip stays with the seam');
      assert(left.rise <= 3.5, renderer + ' inner arc stays smooth under a one-sided pull');
    }
    if (renderer === 'webgl') assert(diagonal[0].travel[0] < -2, 'the left upper edge follows an upward diagonal');
    console.log(renderer, 'upper-edge travel in source pixels', JSON.stringify(measurements));
  } finally {
    await context.close();
  }
}

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
    args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  try {
    for (const renderer of ['webgl', 'canvas']) await checkUpperEdge(browser, renderer);
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
