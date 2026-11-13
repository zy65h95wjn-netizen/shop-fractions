const h=require('../../../v8/tests/harness.cjs');
const dir=h.path.resolve(__dirname,'..');
async function setup(browser,{fallback=false,baseline=false,permission='granted',supported=true,controlled=true,dpr=2,motionSource=null}={}){
 const testFile='/tmp/r13-motion-test.html';
 if(!baseline)h.fs.writeFileSync(testFile,h.fs.readFileSync(h.path.join(dir,'index.html'),'utf8').replace('window.__peachMotionDebug=', 'window.__motionTest={motion,motionUI};window.__peachMotionDebug='));
 const fixtureBrowser={newContext:async(...args)=>{
  const context=await browser.newContext({...args[0],deviceScaleFactor:dpr});
  await context.addInitScript(({permission,supported})=>{
   window.motionPermissionCalls=0;window.motionPermissionGesture=false;
   Object.defineProperty(window,'DeviceMotionEvent',{configurable:true,value:supported?{requestPermission:()=>{window.motionPermissionCalls++;window.motionPermissionGesture=navigator.userActivation.isActive;return permission==='error'?Promise.reject(Error('blocked')):Promise.resolve(permission);}}:undefined});
  },{permission,supported});
  await context.route('**/motion.js',r=>r.fulfill({path:motionSource||h.path.join(dir,'motion.js'),contentType:'text/javascript'}));
  await context.route('**/assets/*.jpg*',r=>{const name=new URL(r.request().url()).pathname.split('/').pop();return ['aurelia-frost.jpg','holly-heartbreaker.jpg','santa-claus.jpg'].includes(name)?r.fulfill({path:h.path.join(dir,'assets',name),contentType:'image/jpeg'}):r.abort();});
  return context;
 }};
 return h.setup(fixtureBrowser,'experiments/r13-motion',{width:390,height:844},controlled,fallback,false,baseline?h.path.join(dir,'../../v8/index.html'):testFile);
}
async function select(page,id){await page.evaluate(id=>__test.chooseCharacter(['ember','midnight','aurelia','holly','santa'].indexOf(id)),id);await page.waitForFunction(id=>__peachPhysicsDebug.snapshot().character===id,id);await page.evaluate(()=>{__test.resize();__test.reset();__test.render();});}
module.exports={...h,setup,select,dir};
