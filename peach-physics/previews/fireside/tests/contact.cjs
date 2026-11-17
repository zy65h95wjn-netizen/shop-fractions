// Follow a portrait-coordinate ruler through the same touch handlers and samplers as the artwork.
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const file = 'peach-physics/previews/fireside/index.html';
const previous = execFileSync('git', ['show', '4fcedd2:' + file], { cwd: __dirname, maxBuffer: 2e6, encoding: 'utf8' });
const current = readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');

function makeRuler() {
  const c = document.createElement('canvas');
  c.width = 961; c.height = 1280;
  const ctx = c.getContext('2d'), pixels = ctx.createImageData(c.width, c.height);
  for (let y = 0; y < c.height; y++) {
    for (let x = 0; x < c.width; x++) {
      const i = 4 * (y * c.width + x);
      pixels.data[i] = (x + 96) % 256;
      pixels.data[i + 1] = (y + 32) % 256;
      pixels.data[i + 2] = (x + y) % 31;
      pixels.data[i + 3] = 255;
    }
  }
  ctx.putImageData(pixels, 0, 0);
  return c.toDataURL();
}

function inspect() {
  const app = window.__fireside, c = document.querySelector('#portrait'), rect = c.getBoundingClientRect();
  const probe = document.createElement('canvas');
  probe.width = 961; probe.height = 1280;
  const ctx = probe.getContext('2d', { willReadFrequently: true });
  function frame() {
    app.draw();
    ctx.drawImage(c, 0, 0, 961, 1280);
    return ctx.getImageData(0, 0, 961, 1280).data;
  }
  const index = (x, y) => (y * 961 + x) * 4;
  const step = n => { for (let i = 0; i < n; i++) app.step(1 / 120); };
  function touch(type, [x, y], id = 1) {
    c.dispatchEvent(new PointerEvent(type, {
      pointerId: id, pointerType: 'touch', bubbles: true,
      clientX: rect.left + x * rect.width / 961, clientY: rect.top + y * rect.height / 1280
    }));
  }
  const cups = [
    [[550,642], [570,657], [590,669], [610,679], [630,695]],
    [[700,714], [718,712], [735,707], [755,699], [775,689]]
  ];
  const options = { mode: 'blender', auto: false, linked: false, preset: 'playful' };
  app.configure(options);
  const rest = frame(), contact = [];
  for (const [side, points] of cups.entries()) {
    const [cx, cy] = app.centers[side];
    const poses = [];
    for (const dx of [0, -36, 36]) {
      app.reset();
      touch('pointerdown', [cx, cy]);
      touch('pointermove', [cx + dx, cy + 64]);
      step(100);
      if (app.state().holds !== 1) throw Error('Downward drag lost its hold');
      const pixels = frame();
      let maximum = 0;
      // How many vertical source pixels are squeezed into eight displayed pixels next to the fur?
      for (const [x, lip] of points) {
        for (let y = lip - 62; y <= lip - 12; y += 2) {
          const lo = index(x, y - 4) + 1, hi = index(x, y + 4) + 1;
          maximum = Math.max(maximum, pixels[hi] - pixels[lo]);
        }
      }
      poses.push(maximum);
      touch('pointercancel', [cx + dx, cy + 64]);
    }
    contact.push(poses);
  }

  const thigh = [517, 975], stocking = [516, 1033];
  const anchors = [[420,978], [515,939], [583,998], [590,1042], [534,1122], [138,913], ...app.centers];
  const movement = (pixels, [x, y]) => rest[index(x, y)] - pixels[index(x, y)];
  const stationary = (pixels, points) => points.every(([x,y]) => {
    const i = index(x,y);
    return [0,1,2].every(channel => rest[i+channel] === pixels[i+channel]);
  });
  app.configure(options);
  touch('pointerdown', thigh);
  const thighHeld = app.state().holds;
  touch('pointerup', thigh);
  const tap = [];
  for (const ticks of [9, 11, 11, 15, 20, 200]) {
    step(ticks); const pixels = frame();
    if (!stationary(pixels, anchors)) throw Error('A thigh tap moved an anchored detail');
    tap.push([movement(pixels, thigh), movement(pixels, stocking)]);
  }
  app.reset();
  touch('pointerdown', thigh, 2); touch('pointerdown', app.centers[0], 3);
  touch('pointermove', [thigh[0]-50,thigh[1]+20], 2);
  step(70);
  const drag = movement(frame(), thigh), twoHolds = app.state().holds;
  touch('pointercancel', thigh, 2); touch('pointercancel', app.centers[0], 3);
  const solo = {};
  for (const mode of ['blender','springs']) {
    app.configure({ ...options, mode });
    document.querySelector('#bounce').click(); step(10);
    const bounce = movement(frame(), thigh);
    app.configure({ ...options, mode, auto: true }); step(104);
    const auto = movement(frame(), thigh);
    document.querySelector('#auto').click(); step(360);
    solo[mode] = [bounce, auto, movement(frame(), thigh)];
  }
  return { contact, tap, thighHeld, twoHolds, drag, solo };
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
    args: ['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
  try {
    const maker = await browser.newPage(), ruler = await maker.evaluate(makeRuler);
    await maker.close();
    for (const renderer of ['webgl','canvas']) {
      const measurements = [];
      for (const html of [previous, current]) {
        const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.addInitScript(fallback => {
          window.requestAnimationFrame = () => 0;
          if (fallback) {
            const getContext = HTMLCanvasElement.prototype.getContext;
            HTMLCanvasElement.prototype.getContext = function (name, ...args) {
              return name === 'webgl' ? null : getContext.call(this, name, ...args);
            };
          }
        }, renderer === 'canvas');
        await page.route('http://localhost/fireside', route => route.fulfill({ contentType: 'text/html',
          body: html.replace(/data:image\/jpeg;base64,[A-Za-z0-9+/=]+/, ruler) }));
        await page.goto('http://localhost/fireside');
        await page.waitForFunction(() => window.__fireside?.ready(), null, { polling: 50 });
        assert.equal(await page.evaluate(() => __fireside.state().renderer), renderer);
        measurements.push(await page.evaluate(inspect));
        assert.deepEqual(errors, []);
        await page.close();
      }
      const [old, next] = measurements;
      console.log(renderer, JSON.stringify({ previousContact: old.contact, ...next }));
      for (let side = 0; side < 2; side++) {
        next.contact[side].forEach((n, i) => {
          assert(n < old.contact[side][i] * .75, 'less compression on side ' + side + ', pull ' + i);
          assert(n <= 20, 'eight display pixels retain a readable strip of texture');
        });
      }
      assert.equal(old.thighHeld, 0); assert.equal(next.thighHeld, 1); assert.equal(next.twoHolds, 2);
      assert(next.drag < -8, 'drag follows touch');
      for (const region of [0,1]) {
        assert(next.tap[0][region] >= 8, 'thigh and stocking respond');
        assert(next.tap.some(p => p[region] <= -2), 'lateral rebound');
        assert.equal(next.tap.at(-1)[region], 0, 'settles');
      }
      for (const [bounce, auto, stopped] of Object.values(next.solo)) {
        assert(bounce >= 6 && auto >= 3, 'Bounce and Auto drive the thigh');
        assert.equal(stopped, 0, 'Auto off settles');
      }
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
