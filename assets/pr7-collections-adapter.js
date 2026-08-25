/* The Bible Challenge — P1A retained Collections / route adapter
 * The retained v24 catalog is complete (22 collections) but its P0C modal is a
 * snapshot: the first snapshot contains 18 cards and the native show-more action
 * only advances v24's internal practice limit. PR7 therefore advances that
 * retained limit through v24ShowMorePractice(), then asks the retained P0C
 * launcher to regenerate the modal snapshot. No collection data is duplicated.
 *
 * The bridge also gives retained PR5 navigation the final word on route exit.
 * PR7 hides immediately in its capture listener, then this adapter re-applies
 * that exit after the retained click handler completes so a later legacy render
 * cannot leave the staged PR7 surface exposed beside Play/Learn/Home/Settings.
 */
(()=>{'use strict';
if(window.TBC_PR7_COLLECTIONS?.version)return;
const VERSION='P1A.1';
const EXPECTED=22;
const NATIVE_CONTROL='.v24-show-more';
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let postNavigationBound=false;
function active(){return Boolean(document.documentElement.getAttribute('data-pr7-activated'))}
function count(root=document){return root.querySelectorAll?.('#modalRoot .v24-collection-card')?.length||0}
function originalLaunch(){
  const launch=window.TBC_P0C?.launch;
  return launch?.__pr7OriginalLaunch||launch||null;
}
function regenerate(args=[]){
  if(!active()||count(document)>=EXPECTED)return count(document);
  const p0c=window.TBC_P0C;
  const launch=originalLaunch();
  if(typeof window.v24ShowMorePractice!=='function'||typeof launch!=='function')return count(document);
  window.v24ShowMorePractice();
  if(typeof window.closeModal==='function')window.closeModal();
  launch.call(p0c,'collections',...args);
  return count(document);
}
async function ensure(root=document,expected=EXPECTED){
  if(!active())return count(root);
  for(let attempt=0;attempt<3&&count(root)<expected;attempt++){
    regenerate();
    if(count(root)>=expected)break;
    await delay(40);
  }
  return count(root);
}
function wrapP0C(){
  const p0c=window.TBC_P0C;
  if(!p0c?.launch||p0c.launch.__pr7CollectionsAdapter)return Boolean(p0c?.launch);
  const original=p0c.launch;
  function launch(feature,...args){
    let result=original.call(this,feature,...args);
    if(active()&&feature==='collections'&&count(document)<EXPECTED){
      if(typeof window.v24ShowMorePractice==='function')window.v24ShowMorePractice();
      if(typeof window.closeModal==='function')window.closeModal();
      result=original.call(this,feature,...args);
    }
    return result;
  }
  Object.defineProperty(launch,'__pr7CollectionsAdapter',{value:true});
  Object.defineProperty(launch,'__pr7OriginalLaunch',{value:original});
  p0c.launch=launch;
  return true;
}
function forceRouteExit(){
  const body=document.body;
  const root=document.querySelector('.pr7-root');
  if(!body||!root)return false;
  let changed=false;
  if(body.dataset.pr7Flow){delete body.dataset.pr7Flow;changed=true}
  if(!root.hidden){root.hidden=true;changed=true}
  if(body.classList.contains('pr7-native-active')){body.classList.remove('pr7-native-active');changed=true}
  if(document.documentElement.hasAttribute('data-pr7-stage-active')){document.documentElement.removeAttribute('data-pr7-stage-active');changed=true}
  return changed;
}
function scheduleRouteExit(){
  forceRouteExit();
  queueMicrotask(forceRouteExit);
  requestAnimationFrame(forceRouteExit);
  setTimeout(forceRouteExit,0);
}
function bindPostNavigation(){
  if(postNavigationBound)return;
  postNavigationBound=true;
  document.addEventListener('click',event=>{
    if(!active())return;
    const target=event.target?.closest?.('button,a,[role="button"]');
    if(!target||target.closest('[data-pr7-ui]'))return;
    const nav=target.closest('[data-pr5-nav]');
    const utility=target.closest('[data-pr5-utility]');
    const exitsPr7=Boolean(
      (nav&&nav.dataset.pr5Nav!=='library')||
      (utility&&utility.dataset.pr5Utility!=='progress')||
      target.closest('.brand')
    );
    if(exitsPr7)scheduleRouteExit();
  },false);
}
function settle(){
  if(!active())return;
  wrapP0C();
  bindPostNavigation();
}
const activationObserver=new MutationObserver(records=>{
  if(records.some(record=>record.type==='attributes'&&record.target===document.documentElement))settle();
});
function start(){
  wrapP0C();
  bindPostNavigation();
  activationObserver.observe(document.documentElement,{attributes:true,attributeFilter:['data-pr7-activated']});
  settle();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
window.TBC_PR7_COLLECTIONS={
  version:VERSION,ensure,regenerate,settle,wrapP0C,forceRouteExit,scheduleRouteExit,
  audit:()=>({version:VERSION,active:active(),expected:EXPECTED,directStorageWrites:false,nativeControl:NATIVE_CONTROL,snapshotStrategy:'retained-limit-relaunch',launcherWrapped:Boolean(window.TBC_P0C?.launch?.__pr7CollectionsAdapter),postNavigationExit:true})
};
})();
