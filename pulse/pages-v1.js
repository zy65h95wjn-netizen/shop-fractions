'use strict';
// Resting Beast page navigation. Only switches already-rendered sections;
// no health data, authentication tokens, or logs are read here.
(function(){
  const app=document.getElementById('app');
  const order=['today','trends','context'];
  const pages=Object.create(null);
  for(const id of order){
    const page=document.querySelector('#app > .app-page[data-page="'+id+'"]');
    if(!page)throw Error('Missing Resting Beast page: '+id);
    pages[id]=page;
  }
  const links=Array.from(document.querySelectorAll('.dock a[data-page-link]'));
  let current='today';
  let swipeStart=null;

  function fromHash(){
    if(location.hash==='#trends'||location.hash==='#patterns')return 'trends';
    if(location.hash==='#context')return 'context';
    return 'today';
  }
  function showPage(name,updateHash=true,scrollTop=true){
    if(!pages[name])return false;
    current=name;
    for(const id of order)pages[id].hidden=id!==name;
    for(const link of links){
      const active=link.dataset.pageLink===name;
      link.classList.toggle('is-active',active);
      if(active)link.setAttribute('aria-current','page');
      else link.removeAttribute('aria-current');
    }
    if(updateHash)history.replaceState(null,'','#'+pages[name].id);
    if(scrollTop && !app.hidden)window.scrollTo(0,0);
    // v7 already re-renders its chart on resize. Let CSS layout become visible
    // first: drawing inside a hidden Trends page would have width zero.
    if(name==='trends' && !app.hidden){
      window.requestAnimationFrame(()=>{
        if(current==='trends' && !app.hidden)window.dispatchEvent(new Event('resize'));
      });
    }
    return true;
  }

  for(const link of links)link.addEventListener('click',event=>{
    event.preventDefault();
    showPage(link.dataset.pageLink);
  });
  window.addEventListener('hashchange',()=>showPage(fromHash(),false));
  showPage(fromHash(),false,false);

  // Safari's edge gestures navigate browser history. Don't start a page
  // swipe from the screen edges or from any control/chart/dialog.
  function touchBlocked(target){
    return target?.closest?.(
      'a,button,input,select,textarea,canvas,dialog,[role="slider"],.dock'
    );
  }
  app.addEventListener('touchstart',event=>{
    swipeStart=null;
    if(app.hidden||event.touches.length!==1||document.querySelector('dialog[open]'))return;
    if(touchBlocked(event.target))return;
    const t=event.touches[0];
    if(t.clientX<28||t.clientX>window.innerWidth-28)return;
    swipeStart={id:t.identifier,x:t.clientX,y:t.clientY,time:Date.now()};
  },{passive:true});
  app.addEventListener('touchend',event=>{
    if(!swipeStart||app.hidden)return;
    const start=swipeStart;
    swipeStart=null;
    let t=null;
    for(const changed of event.changedTouches){
      if(changed.identifier===start.id){t=changed;break;}
    }
    if(!t)return;
    const dx=t.clientX-start.x,dy=t.clientY-start.y;
    if(Math.abs(dx)<68||Math.abs(dx)<1.4*Math.abs(dy)||Math.abs(dy)>90)return;
    if(Date.now()-start.time>1200)return;
    const next=order.indexOf(current)+(dx<0?1:-1);
    if(next>=0&&next<order.length)showPage(order[next]);
  },{passive:true});
  app.addEventListener('touchcancel',()=>{swipeStart=null;},{passive:true});
  // Public only for non-sensitive navigation tests.
  window.RestingBeastPages={showPage,getCurrentPage:()=>current};
}());
