/* The Bible Challenge — P1A retained Collections adapter
 * The retained v24 catalog is complete (22 collections) but its P0C modal is a
 * snapshot: the first snapshot contains 18 cards and the native show-more action
 * only advances v24's internal practice limit. PR7 therefore advances that
 * retained limit through v24ShowMorePractice(), then asks the retained P0C
 * launcher to regenerate the modal snapshot. No collection data is duplicated.
 */
(()=>{'use strict';
if(window.TBC_PR7_COLLECTIONS?.version)return;
const VERSION='P1A.1';
const EXPECTED=22;
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
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
  /* This changes only v24's in-memory display limit. Its current render cannot
   * mutate P0C's already-created modal, so discard that snapshot and recreate it. */
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
function settle(){if(active())wrapP0C()}
const observer=new MutationObserver(records=>{
  if(records.some(record=>record.type==='attributes'&&record.target===document.documentElement))settle();
});
function start(){
  wrapP0C();
  observer.observe(document.documentElement,{attributes:true,attributeFilter:['data-pr7-activated']});
  settle();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
window.TBC_PR7_COLLECTIONS={
  version:VERSION,ensure,regenerate,settle,wrapP0C,
  audit:()=>({version:VERSION,active:active(),expected:EXPECTED,directStorageWrites:false,snapshotStrategy:'retained-limit-relaunch',launcherWrapped:Boolean(window.TBC_P0C?.launch?.__pr7CollectionsAdapter)})
};
})();
