// Run with the repository-root server used by the v8 suites. A marker texture
// measures the final rendered movement, including the Blender response and masks.
const { execFileSync } = require('node:child_process');
const { chromium, assert, base, root } = require('../../../v8/tests/harness.cjs');
const preview = 'peach-physics/previews/four-portraits';
const previous = execFileSync('git', ['show', 'c78c81e:' + preview + '/engine.html'], { cwd: root });
const points = [[270, 903], [513, 909], [270, 754], [399, 815], [520, 1040]];

async function trace(browser, renderer, older) {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 }, deviceScaleFactor: 2,
    isMobile: true, hasTouch: true, serviceWorkers: 'block',
  });
  try {
    if (renderer === 'canvas') await ctx.addInitScript(() => {
      const native = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...args) {
        return /webgl/i.test(type) ? null : native.call(this, type, ...args);
      };
    });
    const page = await ctx.newPage();
    const png = await page.evaluate(points => {
      const c = document.createElement('canvas');
      c.width = 756; c.height = 1280;
      const g = c.getContext('2d');
      g.fillRect(0, 0, c.width, c.height);
      g.fillStyle = 'white';
      for (const [x, y] of points) g.fillRect(x - 3, y - 3, 6, 6);
      return c.toDataURL().split(',')[1];
    }, points);
    await page.route('**/assets/aurelia-frost.jpg', r => r.fulfill({ contentType: 'image/png', body: Buffer.from(png, 'base64') }));
    if (older) await page.route('**/engine.html?*', r => r.fulfill({ contentType: 'text/html', body: previous }));
    await page.goto(base + '/' + preview + '/?portrait=aurelia&view=study');
    await page.waitForFunction(() => document.querySelector('.loading').hidden);
    const result = {};
    for (const name of ['study', 'reference']) {
      const frame = page.frame({ name });
      assert.equal(await frame.evaluate(() => study.snapshot().renderer), renderer);
      result[name] = await frame.evaluate(points => {
        study.cancel(); study.reset(); study.close(true); study.view(0, 0); study.draw();
        const game = document.getElementById('game'), state = study.snapshot();
        const f = state.framing, rect = game.getBoundingClientRect();
        const w = f.width / state.image[0], h = f.height / state.image[1];
        const sx = game.width / state.size[0], sy = game.height / state.size[1];
        const cropX = 216, cropY = 709;
        const strip = document.createElement('canvas');
        strip.width = 352; strip.height = 375;
        const g = strip.getContext('2d', { willReadFrequently: true });
        function positions() {
          study.draw();
          g.drawImage(game, (f.x + w * cropX) * sx, (f.y + h * cropY) * sy,
            strip.width * w * sx, strip.height * h * sy, 0, 0, strip.width, strip.height);
          const pixels = g.getImageData(0, 0, strip.width, strip.height).data;
          return points.map(([cx, cy], index) => {
            const radius = index < 2 ? 38 : 10;
            let mass = 0, dx = 0, dy = 0;
            for (let y = -radius; y <= radius; y++) for (let x = -radius; x <= radius; x++) {
              const value = pixels[4 * ((cy - cropY + y) * strip.width + cx - cropX + x)];
              mass += value; dx += value * x; dy += value * y;
            }
            if (!mass) throw Error('Marker missing at ' + cx + ', ' + cy);
            return [dx / mass, dy / mass];
          });
        }
        const rest = positions();
        function displacement() {
          return positions().map(([x, y], i) => [x - rest[i][0], y - rest[i][1]]);
        }
        let clock = 2000;
        Object.defineProperty(performance, 'now', { configurable: true, value: () => clock });
        function advance(ticks) {
          for (let i = 0; i < ticks; i++) { study.tick(1 / 120); clock += 1000 / 120; }
        }
        const runs = {};
        for (const kind of ['leftTap', 'rightTap', 'bounce', 'auto']) {
          study.cancel(); study.reset(); study.view(0, 0);
          if (kind === 'auto') { study.auto(true); advance(120); }
          else if (kind === 'bounce') study.exercise('bounce');
          else {
            const [x, y] = points[kind === 'leftTap' ? 0 : 1];
            const pointer = type => game.dispatchEvent(new PointerEvent(type, {
              pointerType: 'touch', pointerId: 8, bubbles: true, cancelable: true,
              clientX: rect.left + f.x + w * x, clientY: rect.top + f.y + h * y,
            }));
            pointer('pointerdown'); advance(8); pointer('pointerup');
          }
          const samples = [];
          for (let i = 0; i < (kind === 'auto' ? 45 : 24); i++) {
            advance(4); samples.push(displacement());
          }
          study.auto(false); advance(600);
          if (displacement().flat().some(n => Math.abs(n) > .15)) throw Error(kind + ' did not settle');
          runs[kind] = samples;
        }
        return runs;
      }, points);
    }
    return result;
  } finally { await ctx.close(); }
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
    args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  try {
    for (const renderer of ['webgl', 'canvas']) {
      const before = await trace(browser, renderer, true);
      const after = await trace(browser, renderer, false);
      assert.deepEqual(after.reference, before.reference, renderer + ' reference motion');
      for (const [kind, samples] of Object.entries(after.study)) {
        const sides = kind === 'leftTap' ? [0] : kind === 'rightTap' ? [1] : [0, 1];
        for (const side of sides) {
          const axis = kind === 'auto' ? 0 : 1;
          const old = before.study[kind].map(s => s[side][axis]);
          const next = samples.map(s => s[side][axis]);
          const span = a => Math.max(...a) - Math.min(...a);
          const ratio = span(next) / span(old);
          assert(ratio > 1.17 && ratio < 1.33, renderer + ' ' + kind + ' side ' + side + ' gain ' + ratio);
          assert(next.every((v, i) => Math.abs(v - 1.25 * old[i]) < 1.0), renderer + ' timing and rebound');
          console.log(renderer, kind, side, span(old).toFixed(1), '→', span(next).toFixed(1), 'source pixels');
        }
        assert(samples.every(s => s.slice(2).flat().every(n => Math.abs(n) < .1)), renderer + ' protected edges');
        if (kind === 'auto') {
          assert(samples.every(s => Math.abs(s[0][1]) < .3 && Math.abs(s[1][1]) < .3), 'horizontal Auto');
          assert(samples.filter(s => s[0][0] * s[1][0] < 0).length > samples.length * .9, 'opposed Auto');
        }
      }
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
