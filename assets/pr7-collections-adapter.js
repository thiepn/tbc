/* The Bible Challenge — P1A retained Collections adapter
 * The v24 catalog initially renders 18 of 22 collections behind one native
 * `.v24-show-more` control. During staged PR7 activation, this adapter preserves
 * the retained Collections engine and expands that native control only after
 * P0C's launcher has returned, when the retained click handler is fully bound.
 */
(()=>{'use strict';
if(window.TBC_PR7_COLLECTIONS?.version)return;
const VERSION='P1A.1';
const EXPECTED=22;
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function active(){return Boolean(document.documentElement.getAttribute('data-pr7-activated'))}
function eligible(button){return Boolean(button?.isConnected&&!button.disabled&&button.getAttribute('aria-disabled')!=='true')}
function count(root=document){return root.querySelectorAll?.('#modalRoot .v24-collection-card')?.length||0}
function expand(root=document){
  if(!active())return count(root);
  const button=root.querySelector?.('#modalRoot .v24-show-more');
  if(eligible(button))button.click();
  return count(root);
}
async function ensure(root=document,expected=EXPECTED){
  if(!active())return count(root);
  for(let attempt=0;attempt<8&&count(root)<expected;attempt++){
    const button=root.querySelector?.('#modalRoot .v24-show-more');
    if(!eligible(button))break;
    button.click();
    await delay(40);
  }
  return count(root);
}
function wrapP0C(){
  const p0c=window.TBC_P0C;
  if(!p0c?.launch||p0c.launch.__pr7CollectionsAdapter)return Boolean(p0c?.launch);
  const original=p0c.launch;
  function launch(feature,...args){
    const result=original.call(this,feature,...args);
    if(active()&&feature==='collections'){
      /* P0C has completed native modal construction and event binding here. */
      expand(document);
      queueMicrotask(()=>expand(document));
      setTimeout(()=>expand(document),30);
    }
    return result;
  }
  Object.defineProperty(launch,'__pr7CollectionsAdapter',{value:true});
  Object.defineProperty(launch,'__pr7OriginalLaunch',{value:original});
  p0c.launch=launch;
  return true;
}
function settle(){
  if(!active())return;
  wrapP0C();
  queueMicrotask(()=>expand(document));
  setTimeout(()=>expand(document),30);
}
const observer=new MutationObserver(records=>{
  if(!active())return;
  if(records.some(record=>record.type==='attributes'||[...record.addedNodes].some(node=>node.nodeType===1&&(node.matches?.('.v24-show-more,.v24-collection-card')||node.querySelector?.('.v24-show-more,.v24-collection-card')))))settle();
});
function start(){
  wrapP0C();
  observer.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['data-pr7-activated']});
  settle();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
window.TBC_PR7_COLLECTIONS={
  version:VERSION,expand,ensure,settle,wrapP0C,
  audit:()=>({version:VERSION,active:active(),expected:EXPECTED,directStorageWrites:false,nativeControl:'.v24-show-more',launcherWrapped:Boolean(window.TBC_P0C?.launch?.__pr7CollectionsAdapter)})
};
})();
