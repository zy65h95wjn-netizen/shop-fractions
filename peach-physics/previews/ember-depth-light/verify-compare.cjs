// Checks for the side-by-side test page: one touch and one clock drive both engines.
const { chromium, devices } = require('playwright');
const fs = require('fs');
const OUT = process.argv[2]; fs.mkdirSync(OUT, { recursive: true });
const URL = 'http://127.0.0.1:8765/peach-physics/previews/ember-depth-light/';
const results = {};
(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 13'], deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('response', r => { if (r.status() >= 400) errors.push(r.status() + ' ' + r.url()); });
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__depthComparison && window.__depthComparison.ready(), null, { timeout: 30000 });
  const raw = () => page.evaluate(() => window.__depthComparison.apis().map(a => JSON.stringify(a.raw())));
  const info = () => page.evaluate(() => window.__depthComparison.apis().map(a => { const s = a.snapshot(); return { renderer: s.renderer, character: s.character, gesture: s.lastGesture, slaps: s.slapCount, flicks: s.flickCount, pointers: s.activePointers.length, depth: a.snapshot && window.__depthComparison.apis().indexOf(a) }; }));
  const levels = () => page.evaluate(() => [...document.querySelectorAll('iframe')].map(f => f.contentWindow.__depthDebug.name()));
  const paneDiff = () => page.evaluate(() => new Promise(done => requestAnimationFrame(() => {
    const grab = f => { const c = f.contentDocument.getElementById('game'), t = document.createElement('canvas'); t.width = c.width; t.height = c.height; const x = t.getContext('2d'); x.drawImage(c, 0, 0); return x.getImageData(0, 0, c.width, c.height); };
    const [a, b] = [...document.querySelectorAll('iframe')].map(grab); let n = 0, max = 0;
    for (let i = 0; i < a.data.length; i += 4) { const d = Math.max(Math.abs(a.data[i] - b.data[i]), Math.abs(a.data[i + 1] - b.data[i + 1]), Math.abs(a.data[i + 2] - b.data[i + 2])); if (d > 1) { n++; max = Math.max(max, d); } }
    done({ changed: n, maxDelta: max, size: [a.width, a.height] });
  })));
  results.levels = await levels();
  results.renderers = (await info()).map(i => i.renderer + ':' + i.character);
  await page.waitForTimeout(2500); // Auto Jiggle running
  let r = await raw(); results.autoStatesIdentical = r[0] === r[1]; results.autoMoving = JSON.parse(r[0]).nodes.some(n => n.dx || n.dy);
  await page.screenshot({ path: `${OUT}/compare-auto.png` });

  // Auto off, settle, then the two pictures must match exactly at rest.
  await page.click('#auto');
  await page.waitForFunction(() => window.__depthComparison.apis().every(a => { const s = a.raw(); return s.nodes.every(n => !n.dx && !n.dy) && s.followers.every(f => !f.dx && !f.dy) && s.waves.every(w => !w.strength) && s.impacts.every(p => !p.contact && p.v < .0002); }), null, { timeout: 20000 });
  await page.waitForTimeout(200);
  results.restPaneDifference = await paneDiff();

  // Real touch on the LEFT pane: drag and hold, then release.
  const cdp = await ctx.newCDPSession(page);
  const box = await page.locator('iframe').first().boundingBox();
  const a = { x: box.x + box.width * 0.31, y: box.y + box.height * 0.6 };
  const t = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
  await t('touchStart', a.x, a.y);
  for (let k = 1; k <= 10; k++) { await t('touchMove', a.x - 2 * k, a.y + 5 * k); await page.waitForTimeout(20); }
  await page.waitForTimeout(1200);
  r = await raw(); const held = JSON.parse(r[0]);
  results.hold = { statesIdentical: r[0] === r[1], moved: held.nodes.map(n => [+n.dx.toFixed(1), +n.dy.toFixed(1)]), paneDifference: await paneDiff(), pointers: (await info()).map(i => i.pointers) };
  await page.screenshot({ path: `${OUT}/compare-hold.png` });
  await t('touchEnd');
  await page.waitForTimeout(150);
  r = await raw(); results.afterRelease = { statesIdentical: r[0] === r[1], gestures: (await info()).map(i => i.gesture) };

  // Tap on the RIGHT pane mirrors to the left as well.
  const box2 = await page.locator('iframe').nth(1).boundingBox();
  await page.waitForTimeout(1500);
  await page.touchscreen.tap(box2.x + box2.width * 0.69, box2.y + box2.height * 0.6);
  await page.waitForTimeout(120);
  r = await raw(); results.tapOnRight = { statesIdentical: r[0] === r[1], gestures: (await info()).map(i => i.gesture), slaps: (await info()).map(i => i.slaps) };
  await page.screenshot({ path: `${OUT}/compare-tap.png` });

  // Controls.
  await page.selectOption('#depth', '3'); await page.selectOption('#preset', 'chaos'); await page.click('#bounce'); await page.waitForTimeout(200);
  r = await raw(); results.controls = { levels: await levels(), bounceStatesIdentical: r[0] === r[1], preset: await page.evaluate(() => window.__depthComparison.apis().map(a => a.snapshot().preset)) };
  await page.click('#closeup'); await page.waitForTimeout(300); await page.screenshot({ path: `${OUT}/compare-full-portrait.png` });
  results.controls.closeupPressed = await page.getAttribute('#closeup', 'aria-pressed');
  await page.click('button[data-view=depth]'); await page.waitForTimeout(300); await page.screenshot({ path: `${OUT}/compare-single.png` });
  results.layout = await page.evaluate(() => ({ horizontalOverflow: document.documentElement.scrollWidth > innerWidth, pageHeight: document.documentElement.scrollHeight, viewport: [innerWidth, innerHeight] }));
  results.storageKeys = await page.evaluate(() => Object.keys(localStorage).sort());
  results.errors = errors;
  console.log(JSON.stringify(results, null, 1));
  fs.writeFileSync(`${OUT}/compare-results.json`, JSON.stringify(results, null, 1));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
