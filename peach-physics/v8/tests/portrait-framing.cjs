// Run with the repository-root HTTP server described in harness.cjs.
const {chromium, setup, character, assert} = require('./harness.cjs');

const viewports = [
  {width:393, height:852},
  {width:375, height:667},
  {width:390, height:720},
  {width:852, height:393}
];

async function check(page, id, size) {
  const result = await page.evaluate(() => {
    const stage = document.querySelector('#stage');
    __test.resize();
    __test.render();
    const {framing:f, image, regions} = __peachPhysicsDebug.snapshot();
    const canvas = document.querySelector('#game');
    const pixels = document.createElement('canvas');
    pixels.width = 5;
    pixels.height = canvas.height;
    const read = pixels.getContext('2d');
    read.drawImage(canvas, 0, 0, 5, pixels.height);
    function alpha(row) {
      return Array.from(read.getImageData(0, row, 5, 1).data).filter((_,i)=>i%4===3);
    }
    const edges = [alpha(0),alpha(pixels.height-1)];
    const hits = regions.map((r, i) => {
      const point = {pointerId:i+1,pointerType:'touch',bubbles:true,
        clientX:f.x+r.x*f.width/image[0],clientY:f.y+r.y*f.height/image[1]};
      canvas.dispatchEvent(new PointerEvent('pointerdown',point));
      const side = __peachPhysicsDebug.snapshot().activePointers.find(p=>p.id===point.pointerId)?.side;
      canvas.dispatchEvent(new PointerEvent('pointerup',point));
      return side;
    });
    return {f, image, hits, edges, bounds:stage.getBoundingClientRect().toJSON(),
      mask:getComputedStyle(canvas).maskImage, backdrop:getComputedStyle(document.querySelector('#backdrop')).visibility};
  });
  const {f, image, hits, edges, bounds} = result;
  assert.deepEqual([bounds.x,bounds.y,bounds.width,bounds.height],[0,0,size.width,size.height]);
  assert(Math.abs(f.width/f.height-image[0]/image[1])<1e-9, 'native aspect');
  assert.deepEqual(hits,[0,1],id+' touch mapping');
  assert.equal(result.mask,'none');
  assert.equal(result.backdrop,'visible');
  if(size.height>size.width) {
    assert(f.x<=.01 && f.x+f.width>=size.width-.01, 'full width');
    assert(f.y+f.height>=size.height-.01, 'full height below portrait');
    assert(edges[1].every(a=>a===255),'opaque photo at bottom');
    assert.equal(f.y,0,id+' top anchor');
    assert(edges[0].every(a=>a===255),'opaque photo at top');
  } else {
    assert(Math.abs(f.y-(size.height-f.height)/2)<.01,'centered landscape crop');
  }
}
(async()=>{
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM||'/usr/bin/chromium',
    args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  try {
    for(const fallback of [false,true]){
      const {page,context,errors}=await setup(browser,'v8',viewports[0],true,fallback);
      try {
        for(const {width,height} of viewports){
          await page.setViewportSize({width,height});
          for(const id of ['holly','ember']){
            await character(page,id);
            await check(page,id,{width,height});
          }
        }
        assert.deepEqual(errors,[]);
        console.log((fallback?'Canvas':'WebGL')+': both portraits, four viewports, both touch targets passed');
      } finally { await context.close(); }
    }
  } finally { await browser.close(); }
})().catch(err=>{console.error(err);process.exitCode=1;});
