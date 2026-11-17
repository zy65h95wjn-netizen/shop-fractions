// Checks for the isolated Midnight Yule depth-lighting engine against unchanged production v8.
const { chromium, devices } = require('playwright');
const fs = require('fs');
const OUT = process.argv[2]; fs.mkdirSync(OUT, { recursive: true });
const BASE = 'http://127.0.0.1:8765/peach-physics/';
const PREVIEW = BASE + 'previews/midnight-depth-light/frame.html?match=0', PROD = BASE + 'v8/';
const results = {};

async function open(browser, url) {
  const ctx = await browser.newContext({ ...devices['iPhone 13'], deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.errors = [];
  page.on('pageerror', e => page.errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') page.errors.push(m.text()); });
  page.on('requestfailed', r => page.errors.push('request failed ' + r.url()));
  page.on('response', r => { if (r.status() >= 400) page.errors.push(r.status() + ' ' + r.url()); });
  // Auto Jiggle off in both so frames are comparable; each page uses its own key.
  await page.addInitScript(() => {
    const off = JSON.stringify({ version: 1, autoDefault: 'holly-fullscreen-v1', shake: false, auto: false });
    localStorage.setItem('peach-r13-motion-options-v1', off);
    localStorage.setItem('peach-preview-midnightdepth-motion-options-v1', off);
    localStorage.setItem('peach-physics-v008-active', 'midnight'); // production opens on Midnight Yule
  });
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__peachPhysicsDebug && window.__peachPhysicsDebug.snapshot().frames > 10);
  await page.waitForTimeout(400);
  page.cdp = await ctx.newCDPSession(page);
  return page;
}
const snap = page => page.evaluate(() => window.__peachPhysicsDebug.snapshot());
async function pixels(page) {
  return page.evaluate(() => new Promise(r => requestAnimationFrame(() => {
    const c = document.getElementById('game'), t = document.createElement('canvas'); t.width = c.width; t.height = c.height;
    const x = t.getContext('2d'); x.drawImage(c, 0, 0); r({ w: c.width, h: c.height, data: Array.from(x.getImageData(0, 0, c.width, c.height).data) });
  })));
}
function diff(a, b, tol = 0) {
  let n = 0, minx = 1e9, miny = 1e9, maxx = -1, maxy = -1, max = 0;
  for (let i = 0; i < a.data.length; i += 4) {
    const d = Math.max(Math.abs(a.data[i] - b.data[i]), Math.abs(a.data[i + 1] - b.data[i + 1]), Math.abs(a.data[i + 2] - b.data[i + 2]));
    if (d > tol) { n++; max = Math.max(max, d); const k = i / 4, x = k % a.w, y = (k / a.w) | 0; minx = Math.min(minx, x); maxx = Math.max(maxx, x); miny = Math.min(miny, y); maxy = Math.max(maxy, y); }
  }
  return { changed: n, maxDelta: max, bbox: n ? [minx, miny, maxx, maxy] : null };
}
async function toPage(page, sx, sy) {
  const s = await snap(page), box = await page.locator('#game').boundingBox();
  return { x: box.x + s.framing.x + sx / s.image[0] * s.framing.width, y: box.y + s.framing.y + sy / s.image[1] * s.framing.height };
}
async function toSource(page, bbox) { // device px bbox -> source px
  const s = await snap(page), k = s.size[0] / (await page.evaluate(() => document.getElementById('game').width));
  const f = (x, y) => [Math.round((x * k - s.framing.x) / s.framing.width * s.image[0]), Math.round((y * k - s.framing.y) / s.framing.height * s.image[1])];
  return [...f(bbox[0], bbox[1]), ...f(bbox[2], bbox[3])];
}
async function hold(page, side, dx, dy) { // grab a side and hold a deterministic pose
  const c = side ? [605, 1150] : [285, 1153], a = await toPage(page, ...c);
  const t = (type, x, y) => page.cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
  await t('touchStart', a.x, a.y);
  for (let k = 1; k <= 12; k++) { await t('touchMove', a.x + dx * k / 12, a.y + dy * k / 12); await page.waitForTimeout(20); }
  await page.waitForTimeout(1500); // followers settle
  return () => t('touchEnd');
}
const shot = (page, name) => page.screenshot({ path: `${OUT}/${name}.png`, clip: { x: 0, y: 250, width: 390, height: 300 } });

(async () => {
  const browser = await chromium.launch();
  const prod = await open(browser, PROD), prev = await open(browser, PREVIEW);
  const sp = await snap(prod), sv = await snap(prev);
  results.renderer = { production: sp.renderer, preview: sv.renderer };
  results.character = { production: sp.character, preview: sv.character };
  results.sameFraming = JSON.stringify(sp.framing) === JSON.stringify(sv.framing);
  results.sameCalibration = JSON.stringify(sp.regions) === JSON.stringify(sv.regions) && JSON.stringify(sp.model) === JSON.stringify(sv.model);

  // 1) At rest: preview (default Medium) must equal production exactly.
  const restProd = await pixels(prod), restPrev = await pixels(prev);
  results.defaultLevel = await prev.evaluate(() => window.__depthDebug.name());
  results.restPreviewVsProduction = diff(restProd, restPrev);
  await prev.screenshot({ path: `${OUT}/preview-full.png` });

  // 2) Held pose, depth Off: preview must equal production exactly.
  for (const [label, side, dx, dy] of [['left-down-out', 0, -35, 60], ['right-up', 1, 20, -70]]) {
    await prev.evaluate(() => window.__depthDebug.set(0));
    const r1 = await hold(prod, side, dx, dy), r2 = await hold(prev, side, dx, dy);
    const nodesMatch = JSON.stringify((await snap(prod)).nodes) === JSON.stringify((await snap(prev)).nodes);
    const hp = await pixels(prod), hv0 = await pixels(prev);
    const out = { nodesMatch, heldNodes: (await snap(prev)).nodes, offVsProduction: diff(hp, hv0) };
    await shot(prev, `${label}-0-off`);
    // 3) Same pose with depth on: differences must stay inside the moving support.
    for (const level of [1, 2, 3]) {
      await prev.evaluate(l => window.__depthDebug.set(l), level);
      await prev.waitForTimeout(120);
      const hv = await pixels(prev), d = diff(hv0, hv, 1);
      out['level' + level] = { ...d, bboxSource: d.bbox ? await toSource(prev, d.bbox) : null };
      await shot(prev, `${label}-${level}-${['off', 'subtle', 'medium', 'strong'][level]}`);
    }
    // difference of the moved frame vs rest must stay inside her moving area too
    const dm = diff(restPrev, await pixels(prev), 1);
    out.strongVsRest = { ...dm, bboxSource: dm.bbox ? await toSource(prev, dm.bbox) : null };
    await r1(); await r2();
    await prod.waitForTimeout(2500); await prev.waitForTimeout(500);
    results[label] = out;
  }
  // 4) After release and settling at Strong, the portrait returns exactly.
  await prev.waitForFunction(() => { const s = window.__peachPhysicsDebug.snapshot(); return s.nodes.every(n => !n.dx && !n.dy) && s.followers.every(f => !f.dx && !f.dy) && s.impacts.every(p => !p.contact && p.v < .0002) && s.waves.every(w => !w.strength); }, null, { timeout: 15000 });
  await prev.waitForTimeout(300);
  results.restAfterMotionStrong = diff(restProd, await pixels(prev));

  // 5) Controls: chip cycles and persists; switching is locked to Midnight Yule.
  await prev.evaluate(() => window.__depthDebug.set(2));
  await prev.click('#depthChip'); const afterChip = await prev.evaluate(() => [window.__depthDebug.name(), document.getElementById('depthChip').textContent, localStorage.getItem('peach-physics-preview-midnightdepth-depth')]);
  await prev.evaluate(() => window.__peachPhysicsDebug.switchCharacter('ember')); await prev.waitForTimeout(300);
  results.controls = { afterChip, stillMidnight: (await snap(prev)).character === 'midnight', characterButtonVisible: await prev.locator('#character').isVisible() };
  results.storageKeys = await prev.evaluate(() => Object.keys(localStorage).sort());
  results.serviceWorkers = await prev.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length);

  // 6) Tap motion strip at Medium for visual review, and a rough frame-time reading.
  await prev.evaluate(() => window.__depthDebug.set(2));
  const p = await toPage(prev, 285, 1153);
  await prev.touchscreen.tap(p.x, p.y);
  for (let k = 0; k < 6; k++) { await prev.waitForTimeout(70); await shot(prev, `tap-medium-${k}`); }
  results.errors = { production: prod.errors, preview: prev.errors };
  console.log(JSON.stringify(results, null, 1));
  fs.writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 1));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
