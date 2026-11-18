// Follow a portrait-coordinate ruler through the same touch handlers and samplers as the artwork.
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const file = 'peach-physics/previews/fireside/index.html';
const previous = execFileSync('git', ['show', '4fcedd2:' + file], { cwd: __dirname, maxBuffer: 2e6, encoding: 'utf8' });
const preview5 = execFileSync('git', ['show', 'ba09a21:' + file], { cwd: __dirname, maxBuffer: 2e6, encoding: 'utf8' });
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
  let clock = 1000;
  Object.defineProperty(performance, 'now', {value: () => clock});
  const step = n => { for (let i = 0; i < n; i++) { clock += 1000 / 120; app.step(1 / 120); } };
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

  const thigh = [124, 910], stocking = [134, 1029];
  const anchors = [[27,903], [167,820], [420,978], [517,975], [516,1033], [195,1124], ...app.centers];
  const movement = (pixels, [x, y], channel=0) => {
    const i=index(x,y)+channel;
    return (rest[i]-pixels[i]+384)%256-128;
  };
  const stationary = (pixels, points) => points.every(([x,y]) => {
    const i = index(x,y);
    return [0,1,2].every(channel => rest[i+channel] === pixels[i+channel]);
  });
  app.configure(options);
  touch('pointerdown', [517,975]);
  const farThighHeld=app.state().holds;
  touch('pointercancel', [517,975]);
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
  const shadow = [];
  for (const dy of [0, 12, -12]) {
    app.configure(options);
    touch('pointerdown', app.centers[1]); touch('pointermove',[805,628+dy]); step(80);
    const pixels = frame(), band = [[692,609],[698,617],[701,628],[699,648],[695,665],[689,680]];
    shadow.push({ band: Math.max(...band.flatMap(p=>[0,1].map(k=>Math.abs(movement(pixels,p,k))))),
      center: movement(pixels,app.centers[1]) });
  }
  app.configure(options);
  touch('pointerdown',app.centers[0]); touch('pointerup',app.centers[0]); step(38);
  const left = frame();
  const lift = points => points.map(p=>-movement(left,p,1));
  const map = { shoulder: lift([[575,548],[583,550],[590,558]]),
    lower: lift([[635,622],[642,637],[646,651],[644,659]]), fur: lift([[570,656],[590,667],[630,693]]) };
  const transfer = [];
  for (const mode of ['blender','springs']) for (const side of [0,1]) {
    const source = app.centers[side], other = 1-side, sign=side===0?1:-1;
    for (const linked of [false,true]) {
      app.configure({ ...options, mode, linked });
      touch('pointerdown',source); touch('pointermove',[source[0]+60*sign,source[1]]);
      step(1);const onset = Math.abs(app.state().offsets[other][0]);step(89);
      const held = sign*app.state().offsets[other][0], visible = sign*movement(frame(),app.centers[other]);
      touch('pointerdown',app.centers[other],3);
      const caught = sign*app.state().offsets[other][0];
      touch('pointermove',[source[0]-40*sign,source[1]]);step(60);
      const pinned = sign*app.state().offsets[other][0];
      touch('pointercancel',app.centers[other],3);touch('pointerup',source);step(600);
      const settled = Math.max(...app.state().offsets.flat().map(Math.abs));
      app.configure({ ...options, mode, linked });
      touch('pointerdown',source);touch('pointerup',source);
      const trace=[];
      for(let i=0;i<34;i++){step(1);trace.push(app.state().offsets.map(p=>p[1]));}
      const peak = s=>Math.max(...trace.map(t=>t[s]));
      const when = s=>trace.findIndex(t=>t[s]===peak(s));
      app.configure({ ...options, mode, linked });
      touch('pointerdown',source);step(4);
      touch('pointermove',[source[0]+48*sign,source[1]+8]);step(8);touch('pointerup',source);
      const released=[];
      for(let i=0;i<105;i++){step(1);released.push(sign*app.state().offsets[other][0]);}
      transfer.push({mode,side,linked,onset,held,visible,caught,pinned,settled,tap:peak(other),lag:when(other)-when(side),
        flick:Math.max(...released),returning:Math.min(...released)});
    }
  }
  app.configure({...options,linked:true});touch('pointerdown',thigh);touch('pointerup',thigh);step(17);
  const fromThigh = app.state().offsets.map(p=>p[0]);
  return { contact, tap, thighHeld, farThighHeld, twoHolds, drag, solo, shadow, map, transfer, fromThigh };
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
    args: ['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
  try {
    const maker = await browser.newPage(), ruler = await maker.evaluate(makeRuler);
    await maker.close();
    for (const renderer of ['webgl','canvas']) {
      const measurements = [];
      for (const html of [previous, preview5, current]) {
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
      const [old, last, next] = measurements;
      console.log(renderer, JSON.stringify({contact:next.contact,shadow:[last.shadow,next.shadow],map:[last.map,next.map],
        transfer:next.transfer.filter(t=>t.linked).map(({mode,side,held,visible,tap,lag})=>({mode,side,held,visible,tap,lag})),fromThigh:next.fromThigh}));
      for (let side = 0; side < 2; side++) {
        next.contact[side].forEach((n, i) => {
          assert(n < old.contact[side][i] * .75, 'less compression on side ' + side + ', pull ' + i);
          assert(n <= 20, 'eight display pixels retain a readable strip of texture');
        });
      }
      assert.equal(old.thighHeld, 0); assert.equal(next.thighHeld, 1); assert.equal(next.twoHolds, 2);
      assert.equal(last.farThighHeld,1);assert.equal(next.farThighHeld, 0, 'the screen-right thigh is inactive');
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
      for (let i=0;i<next.shadow.length;i++) {
        assert(last.shadow[i].band>10 && next.shadow[i].band<=1,'rightward shadow stays anchored');
        assert(next.shadow[i].center>=16,'right side still follows the outward pull');
      }
      const mean=a=>a.reduce((sum,value)=>sum+value,0)/a.length;
      assert(mean(next.map.shoulder)<mean(last.map.shoulder)*.7,'less lift at the shoulder');
      assert(mean(next.map.lower)>mean(last.map.lower)*1.3,'more lift through the lower left volume');
      assert(next.map.fur.every(n=>n===0),'left lip stays attached');
      assert(last.transfer.filter(t=>t.linked).every(t=>t.held===0),'preview 5 lacked drag transfer');
      for(const t of next.transfer) {
        assert(t.onset<1 && t.settled<.02,'delayed onset and settling');
        assert(Math.abs(t.caught-t.held)<.001 && Math.abs(t.pinned-t.caught)<.001,'second finger owns its hold');
        if(t.linked){
          assert(t.held>10 && t.held<19 && t.visible>=7,'visible independent transfer');
          assert(t.tap>4 && t.lag>=4,'delayed tap follow-through');
          assert(t.flick>4 && t.returning< -1,'the neighbor follows a flick and rebounds after release');
        }else assert(t.held===0 && t.visible===0 && t.tap===0 && t.flick===0,'linked off isolates both sides');
      }
      assert(next.fromThigh[0]>2 && next.fromThigh[1]>1,'linked thigh shake carries into both sides');
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
