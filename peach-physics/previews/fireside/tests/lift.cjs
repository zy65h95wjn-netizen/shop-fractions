// Track real portrait details through the preview's touch handlers and both renderers.
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const filename = 'peach-physics/previews/fireside/index.html';
const previous = execFileSync('git', ['show', '26f71aa:' + filename], {
  cwd: __dirname, encoding: 'utf8', maxBuffer: 2e6
});
const current = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf8');
const embeddedArtAndBake = html => html.split('\n').find(line => line.startsWith('const ART='));
assert(embeddedArtAndBake(previous)?.includes('BAKE='));
assert(embeddedArtAndBake(current) === embeddedArtAndBake(previous), 'original portrait and baked spring data');

function reviewPortrait() {
  const app = window.__fireside;
  const canvas = document.querySelector('#portrait');
  const rect = canvas.getBoundingClientRect();
  const crop = document.createElement('canvas');
  const [left, top] = [485, 480];
  crop.width = 350;
  crop.height = 260;
  const ctx = crop.getContext('2d', { willReadFrequently: true });
  function capture() {
    app.draw();
    ctx.drawImage(canvas, -left, -top, 961, 1280);
    return ctx.getImageData(0, 0, crop.width, crop.height).data;
  }
  const index = (x, y) => 4 * ((y - top) * crop.width + x - left);
  app.configure({ mode: 'blender', preset: 'playful', linked: false, auto: false });
  const rest = capture();
  // Compare small patches of skin texture at integer offsets in original portrait pixels.
  function track(frame, side, verticalOnly) {
    const [cx, cy] = app.centers[side];
    let bestError = Infinity, best;
    for (let dy = -36; dy <= 36; dy++) {
      for (let dx = verticalOnly ? 0 : -36; dx <= (verticalOnly ? 0 : 36); dx++) {
        let error = 0;
        const shift = 4 * (dy * crop.width + dx);
        for (let y = cy - 8; y <= cy + 8 && error < bestError; y += 2) {
          for (let x = cx - 8; x <= cx + 8; x += 2) {
            const i = index(x, y);
            error += Math.abs(frame[i + shift + 1] - rest[i + 1]);
          }
        }
        if (error < bestError) { bestError = error; best = [dx, dy]; }
      }
    }
    return best;
  }
  const anchors = [[590, 695], [753, 710], [679, 610], [819, 610], [495, 590]];
  const edges = {
    leftTrim: [[550, 640], [570, 656], [590, 667], [610, 677], [630, 693]],
    rightTrim: [[718, 710], [735, 705], [753, 698], [778, 686], [790, 671], [790, 674], [800, 662]],
    leftCurl: [[538, 554], [545, 570], [545, 581], [535, 599]],
    rightCurl: [[710, 537], [714, 540], [718, 541], [723, 542], [728, 543]]
  };
  const edgeChanges = { leftTrim: 0, rightTrim: 0, leftCurl: 0, rightCurl: 0 };
  function read(verticalOnly = false) {
    const frame = capture();
    for (const [x, y] of anchors) {
      for (let k = 0; k < 3; k++) {
        const i = index(x, y) + k;
        if (frame[i] !== rest[i]) throw Error('Protected pixel moved at ' + [x, y]);
      }
    }
    for (const [name, points] of Object.entries(edges)) {
      for (const [x, y] of points) {
        for (let channel = 0; channel < 3; channel++) {
          const i = index(x, y) + channel;
          edgeChanges[name] = Math.max(edgeChanges[name], Math.abs(frame[i] - rest[i]));
        }
      }
    }
    return app.centers.map((_, side) => track(frame, side, verticalOnly));
  }
  function touch(type, dx = 0, dy = 0) {
    for (const [side, [x, y]] of app.centers.entries()) {
      canvas.dispatchEvent(new PointerEvent(type, {
        pointerId: side + 1, pointerType: 'touch', bubbles: true,
        clientX: rect.left + (x + dx) * rect.width / 961,
        clientY: rect.top + (y + dy) * rect.height / 1280
      }));
    }
  }
  function advance(ticks) { for (let i = 0; i < ticks; i++) app.step(1 / 120); }
  const samples = {};
  for (const [name, dx, dy] of [['up', 0, -60], ['down', 0, 60], ['diagonal', 38, -38], ['sideways', 38, 0]]) {
    app.reset();
    touch('pointerdown');
    touch('pointermove', dx, dy);
    advance(120);
    samples[name] = read(dx === 0);
    touch('pointercancel', dx, dy);
  }
  for (const mode of ['blender', 'springs']) {
    app.configure({ mode, auto: false, linked: false, preset: 'playful' });
    touch('pointerdown');
    touch('pointerup');
    advance(mode === 'blender' ? 14 : 12);
    samples[mode + 'Drop'] = read();
    advance(24);
    samples[mode + 'Return'] = read();
    touch('pointerdown');
    samples[mode + 'Catch'] = read();
    advance(4);
    samples[mode + 'Hold'] = read();
    touch('pointercancel');
    app.configure({ mode, auto: false, linked: false });
    document.querySelector('#bounce').click();
    advance(mode === 'blender' ? 38 : 36);
    samples[mode + 'Bounce'] = read();
    app.configure({ mode, auto: true, linked: false });
    advance(mode === 'blender' ? 45 : 83);
    samples[mode + 'Auto'] = read();
    advance(54);
    samples[mode + 'AutoLater'] = read();
  }
  app.configure({ auto:false, linked:false });
  app.pose(1,34,0);
  const pulled=capture();
  let shadowChange=0;
  for(let y=608;y<=668;y+=3) {
    const seam=677-.0046*(y-635)**2;
    for(let x=Math.ceil(seam+10);x<=seam+23;x+=2)for(let k=0;k<3;k++){
      const i=index(x,y)+k;
      shadowChange=Math.max(shadowChange,Math.abs(pulled[i]-rest[i]));
    }
  }
  return { samples, edgeChanges, shadowChange };
}

async function run() {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
    args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
  });
  try {
    for (const renderer of ['webgl', 'canvas']) {
      const results = [];
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
        await page.route('http://localhost/fireside', route => route.fulfill({ contentType: 'text/html', body: html }));
        await page.goto('http://localhost/fireside');
        await page.waitForFunction(() => window.__fireside?.ready(), null, { polling: 50 });
        assert.equal(await page.evaluate(() => __fireside.state().renderer), renderer);
        results.push(await page.evaluate(reviewPortrait));
        assert.deepEqual(errors, []);
        await page.close();
      }
      const [before, after] = results.map(result => result.samples);
      for (const name of Object.keys(results[0].edgeChanges)) {
        assert(results[0].edgeChanges[name] > 1, name + ' moved in preview 3');
        assert.equal(results[1].edgeChanges[name], 0, name + ' stays attached');
      }
      for (const name of ['up', 'diagonal', 'blenderReturn', 'springsReturn', 'blenderBounce', 'springsBounce', 'blenderAuto', 'springsAuto']) {
        const [oldLeft, oldRight] = before[name], [left, right] = after[name];
        assert(oldLeft[1] < -3 && left[1] > oldLeft[1] && left[1] < -2, name + ' softer upward travel');
        assert(Math.abs(left[0] - oldLeft[0]) <= 2, name + ' lateral movement');
        if(name==='diagonal') {
          assert(right[0]>=oldRight[0]*.7 && Math.abs(right[1])>=Math.abs(oldRight[1])*.75, 'rightward diagonal stays responsive');
        }else{
          assert(Math.abs(right[0]-oldRight[0])<=1 && Math.abs(right[1]-oldRight[1])<=1,name+' right-side reference');
        }
      }
      assert(after.up[0][1] >= -20 && after.up[0][1] <= -17, 'left still responds to a full lift');
      assert(Math.abs(after.sideways[0][0]-before.sideways[0][0])<=2,'left lateral travel');
      assert(after.sideways[1][0]>=18 && after.sideways[1][0]<=before.sideways[1][0],'rightward travel inside the lit area');
      assert(results[0].shadowChange>8 && results[1].shadowChange<=1,'painted inner shadow retains its color on an outward pull');
      for (const name of ['down', 'blenderDrop', 'springsDrop']) {
        for (const side of [0, 1]) {
          const [x, y] = after[name][side], [oldX, oldY] = before[name][side];
          assert(y >= oldY * .5 && y < oldY, name + ' stays visible and yields into the cup');
          assert(Math.abs(x - oldX) <= 1, name + ' horizontal travel');
        }
      }
      for (const mode of ['blender', 'springs']) {
        const auto = mode + 'AutoLater';
        assert(Math.abs(after[auto][1][1]) > 2, mode + ' right side is active during Auto');
        assert.deepEqual(after[auto][1], before[auto][1], mode + ' right Auto motion');
        assert.deepEqual(after[mode + 'Catch'], after[mode + 'Return'], mode + ' catch at displayed pose');
        assert.deepEqual(after[mode + 'Hold'], after[mode + 'Return'], mode + ' hold at displayed pose');
      }
      console.log(renderer, 'maximum upward drag', before.up, '->', after.up,
        'Playful tap rebound', before.blenderReturn, '->', after.blenderReturn);
    }
  } finally { await browser.close(); }
}

run().catch(error => { console.error(error); process.exitCode = 1; });
