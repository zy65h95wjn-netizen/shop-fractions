// Serve only approved portrait fixtures to the controlled test pages. No broad
// repository HTTP server is required; the harness fulfills the HTML response.
const harness=require('../../../v8/tests/harness.cjs');
async function setup(browser,...args){
 const fixtureBrowser={newContext:async(...options)=>{
  const context=await browser.newContext(...options);
  await context.route('**/assets/*.jpg*',route=>{
   const name=new URL(route.request().url()).pathname.split('/').pop();
   if(!['aurelia-frost.jpg','holly-heartbreaker.jpg','santa-claus.jpg'].includes(name))return route.abort();
   return route.fulfill({contentType:'image/jpeg',path:harness.path.resolve(__dirname,'../assets',name)});
  });return context;
 }};
 return harness.setup(fixtureBrowser,...args);
}
module.exports={...harness,setup};
