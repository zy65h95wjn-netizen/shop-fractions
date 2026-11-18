// Compare the production picker to the approved study with the same crop, clock,
// portrait and input. The app's normal framing and offline controls run in the upgrade suite.
const { chromium, assert, base, root, fs, path } = require('./harness.cjs');
const ids = ['ember', 'midnight', 'aurelia', 'holly'];
const app = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const preview = fs.readFileSync(path.join(root, 'peach-physics/previews/four-portraits/engine.html'), 'utf8');
const images = ['IMAGE', 'OTHER_IMAGE'].map(id => app.match(new RegExp("const " + id + "='([^']+)'"))[1]);
const hook = `
const approvedStudy=!!window.study;
window.releaseProbe={
 prepare() {
  // The comparison page and the main PWA use different viewport crops.
  resize();
  cssW=canvas.width=300;cssH=canvas.height=520;drawW=cssW;drawH=cssH;ox=oy=0;
  uvCover=[1,1,0,0];needSize=false;
  if(!fallback){gl.viewport(0,0,canvas.width,canvas.height);uploadDepth();}
  Object.assign(model,currentPresets().playful,{transfer:50});
  if(approvedStudy){study.reset();}else{
   reset();motion.time=0;motion.quietUntil=0;motion.lastCharacter=currentCharacter().id;motion.setAuto(false);
   let seed=8147;motion.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  }
  window.releaseClock=1000;viewX=viewY=0;
 },
 tick(n){for(let i=0;i<n;i++){
  window.releaseClock+=1000/120;
  if(approvedStudy)study.tick(1/120);else{motion.tick(1/120);step(1/120);}
 }},
 pointer(type,side,dx=0,dy=0){
  viewX=viewY=0;
  const r=currentCharacter().impactCenters[side],x=r[0]+dx,y=r[1]+dy;
  if(approvedStudy){study.pointer({type,id:side+1,x,y});return;}
  const box=canvas.getBoundingClientRect();
  canvas.dispatchEvent(new PointerEvent(type,{pointerId:side+1,pointerType:'touch',
   clientX:box.left+ox+x*drawW/W,clientY:box.top+oy+y*drawH/H,bubbles:true,cancelable:true}));
 },
 bounce(){if(approvedStudy)study.exercise('bounce');else bounceBoth();},
 auto(){motion.setAuto(true);},
 photo(camera){
  viewX=camera?.069:0;viewY=camera?-.019:0;render();
  if(fallback)return ctx2.getImageData(0,0,canvas.width,canvas.height).data;
  const pixels=new Uint8Array(canvas.width*canvas.height*4);
  gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
  if(gl.getError())throw Error('WebGL error while reading frame');
  return pixels;
 }
};
`;
// Inject this function into the production closure. Markers measure the displayed
// movement after mask sampling, including Aurelia's existing baked Auto accent.
function trackClap(){
  releaseProbe.prepare();resize();
  const id=currentCharacter().id;
  const guards={ember:[[216,900],[210,1240]],midnight:[[320,895],[461,1430]],aurelia:[[270,754],[520,1040]]};
  const points=[...currentCharacter().impactCenters,...guards[id]];
  const portrait=img,patch=midnightPatch;
  const markers=document.createElement('canvas');markers.width=W;markers.height=H;
  const ink=markers.getContext('2d');ink.fillRect(0,0,W,H);ink.fillStyle='white';
  for(const [x,y] of points)ink.fillRect(x-4,y-4,8,8);
  function useImage(image){
    img=image;midnightPatch=null;
    if(!fallback){gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);}
  }
  const surface=document.createElement('canvas');
  surface.width=canvas.width;surface.height=canvas.height;
  const read=surface.getContext('2d',{willReadFrequently:true});
  function locate(){
    // Measure the Auto motion independently of camera sway.
    viewX=0;viewY=0;render();read.drawImage(canvas,0,0);
    return points.map(([x,y],i)=>{
      const scale=canvas.width/cssW,r=i<2?Math.ceil(28*scale):Math.ceil(5*scale);
      const cx=Math.round((ox+x/W*drawW)*scale),cy=Math.round((oy+y/H*drawH)*scale);
      const w=2*r+1,data=read.getImageData(cx-r,cy-r,w,w).data;
      let mass=0,dx=0,dy=0;
      for(let j=0;j<w;j++)for(let k=0;k<w;k++){
        const v=data[4*(j*w+k)];mass+=v;dx+=v*(k-r);dy+=v*(j-r);
      }
      if(!mass)throw Error(id+' missing Auto marker at '+[x,y]);
      return [dx/mass/scale,dy/mass/scale];
    });
  }
  try{
    useImage(markers);
    const rest=locate(),offsets=()=>locate().map(([x,y],i)=>[x-rest[i][0],y-rest[i][1]]);
    releaseProbe.auto();releaseProbe.tick(180);
    const samples=[];
    let bakedTravel=0;
    for(let n=0;n<48;n++){
      releaseProbe.tick(5);samples.push(offsets());
      bakedTravel=Math.max(bakedTravel,Math.abs(reboundOffset(1).x));
    }
    // Catch an active clap. The grab must begin at the visible position and
    // automatic inputs must pause through both the hold and the release delay.
    const beforeGrab=clamp(nodes[1].dx+reboundOffset(1).x,-26,26),steps=motion.counts.autoSteps;
    releaseProbe.pointer('pointerdown',0);
    const caught=pointers.get(1)?.grabBase[1].dx;
    releaseProbe.tick(160);releaseProbe.pointer('pointerup',0);releaseProbe.tick(140);
    const paused=motion.counts.autoSteps===steps;
    releaseProbe.tick(24);
    const resumed=motion.counts.autoSteps>steps;
    motion.setAuto(false);releaseProbe.tick(540);
    const gap=samples.map(([[left],[right]])=>left-right);
    const lo=Math.min(...gap),hi=Math.max(...gap),middle=(lo+hi)/2;
    const crossings=gap.filter((v,i)=>i&&v>=middle&&gap[i-1]<middle).length;
    const peak=(array)=>Math.max(...array.map(Math.abs));
    const movingBoth=samples.filter(([[l],[r]])=>Math.abs(l)>.7&&Math.abs(r)>.7);
    return {inward:hi,outward:-lo,crossings,bakedTravel,catchError:Math.abs(beforeGrab-caught),paused,resumed,
      opposite:movingBoth.length>=32&&movingBoth.every(([[l],[r]])=>l*r<0),
      vertical:peak(samples.flatMap(frame=>frame.slice(0,2).map(p=>p[1]))),
      guards:peak(samples.flatMap(frame=>frame.slice(2).flat())),
      settled:peak(offsets().flat())};
  }finally{useImage(portrait);midnightPatch=patch;releaseProbe.prepare();}
}
function instrument(html) {
  const marker = 'presentCharacter();\ngetPhoto';
  assert(html.includes(marker));
  return html.replace(marker, hook + '\n' + trackClap.toString() + '\nreleaseProbe.trackClap=trackClap;\n' + marker);
}
async function check(renderer, browser) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
  try {
    await ctx.addInitScript(renderer => {
      if (window === window.top) return;
      window.requestAnimationFrame = () => 0;
      performance.now = () => window.releaseClock || 1000;
      if (renderer === 'canvas') {
        const native = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function(type, ...args) {
          if (/webgl/i.test(type)) return null;
          // Pixel readbacks should not switch Skia backends mid-comparison.
          if(type==='2d'&&this.id==='game')return native.call(this,type,{...args[0],willReadFrequently:true});
          return native.call(this, type, ...args);
        };
      }
    }, renderer);
    const page = await ctx.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.route('**/peach-physics/v8/', r => r.fulfill({contentType:'text/html',body:instrument(app)}));
    await page.route('**/four-portraits/engine.html?*', r => r.fulfill({contentType:'text/html',body:instrument(preview)}));
    await page.route('**/release-fixture', r => r.fulfill({contentType:'text/html',body:
      '<script>window.embeddedPortraits=' + JSON.stringify(images) + '</script>' +
      '<style>iframe{width:390px;height:844px;border:0}</style><iframe id="live" src="../"></iframe><iframe id="gold" name="study"></iframe>'}));
    await page.goto(base + '/peach-physics/v8/tests/release-fixture');
    const live = page.frameLocator('#live');
    await live.locator('#loader.hiding').waitFor({state:'attached'});
    for (const [slot,id] of ids.entries()) {
      if (slot) await live.locator('#character').evaluate(el=>el.click());
      await page.evaluate(id => {
        document.getElementById('gold').src='../../previews/four-portraits/engine.html?portrait='+id;
      }, id);
      await page.waitForFunction(id => {
        const live=document.getElementById('live').contentWindow, gold=document.getElementById('gold').contentWindow;
        return live.__peachPhysicsDebug?.snapshot().character===id && gold.study?.ready() && gold.study.snapshot().character===id;
      }, id, {polling:60});
      const result = await page.evaluate((renderer) => {
        const windows=['live','gold'].map(id=>document.getElementById(id).contentWindow);
        const snapshots=()=>windows.map(w=>w.__peachPhysicsDebug.snapshot());
        const probes=windows.map(w=>w.releaseProbe);
        const both=(key,...args)=>probes.forEach(p=>p[key](...args));
        const checks=[];
        const clean=()=>both('prepare');
        clean();const rest=probes[1].photo(false).slice();
        function compare(label,camera=false) {
          const [actual,expected]=probes.map(p=>p.photo(camera)), states=snapshots();
          let delta=0, bad=0, moving=0;
          for(let k=0;k<actual.length;k+=4){
            let peak=0;
            for(let i=k;i<k+3;i++){const diff=Math.abs(actual[i]-expected[i]);delta+=diff;peak=Math.max(peak,diff);}
            if(peak>3)bad++;
            if(Math.abs(rest[k]-expected[k])>3)moving++;
          }
          checks.push({label,mae:delta/(actual.length*.75),bad,moving,
            solver:JSON.stringify(states[0].nodes)===JSON.stringify(states[1].nodes),
            renderer:states.every(s=>s.renderer===renderer)});
        }
        compare('rest');compare('depth',true);
        both('bounce');both('tick',9);compare('bounce');both('tick',16);compare('rebound',true);
        clean();both('pointer','pointerdown',0);both('tick',8);both('pointer','pointermove',0,30,29);both('tick',18);
        compare('left held');both('pointer','pointerup',0,30,29);both('tick',9);compare('diagonal release');
        clean();both('pointer','pointerdown',1);both('pointer','pointerup',1);both('tick',8);compare('right tap');
        clean();both('pointer','pointerdown',0);both('pointer','pointerdown',1);both('tick',9);
        both('pointer','pointermove',0,-25,-34);both('pointer','pointermove',1,14,21);both('tick',24);
        compare('two fingers and upper trim');both('pointer','pointerup',0,-25,-34);both('pointer','pointerup',1,14,21);
        // These two portraits deliberately replace the reference's drifting Auto.
        if(['aurelia','holly'].includes(snapshots()[0].character)){
          clean();both('auto');both('tick',143);compare('auto');
        }
        return checks;
      }, renderer);
      for (const frame of result) {
        assert(frame.renderer && frame.solver, id+' '+renderer+' '+JSON.stringify(frame));
        assert(frame.mae < .05 && frame.bad < 120, id+' '+renderer+' '+JSON.stringify(frame));
        if(frame.label==='bounce'||(frame.label==='depth'&&renderer==='webgl')) assert(frame.moving>100,id+' blank '+frame.label);
      }
      if(id!=='holly'){
        const travel=await live.locator('#game').evaluate(()=>releaseProbe.trackClap());
        console.log(renderer,id,'Auto motion in phone CSS pixels',JSON.stringify(travel));
        const minGap=renderer==='webgl'?12:8;
        assert(travel.inward>minGap&&travel.outward>minGap&&travel.opposite,id+' needs opposite, visible horizontal travel');
        assert(travel.bakedTravel>1&&travel.catchError<.001&&travel.paused&&travel.resumed,id+' baked accent and touch takeover');
        assert(travel.crossings>=3&&travel.crossings<=4,id+' needs two claps per second');
        assert(travel.vertical<.6&&travel.guards<.25&&travel.settled<.25,id+' vertical drift, moving guard or residual Auto');
      }
      console.log(renderer,id,result.length+' preview comparisons, max changed pixels (>3 RGB)',Math.max(...result.map(r=>r.bad)));
    }
    assert.deepEqual(errors,[]);
  } finally { await ctx.close(); }
}
(async()=>{
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM||'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  try { for (const renderer of ['webgl','canvas']) await check(renderer,browser); }
  finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
