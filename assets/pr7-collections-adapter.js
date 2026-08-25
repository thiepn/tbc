/* The Bible Challenge — P1A retained Collections adapter
 * The v24 catalog initially renders 18 of 22 collections behind one native
 * `.v24-show-more` control. While staged PR7 is explicitly active, expand that
 * retained catalog before PR7 reads or launches from it. No data is invented.
 */
(()=>{'use strict';
if(window.TBC_PR7_COLLECTIONS?.version)return;
const VERSION='P1A.1';
const handled=new WeakSet();
function active(){return Boolean(document.documentElement.getAttribute('data-pr7-activated'))}
function expand(root=document){
  if(!active())return 0;
  let clicks=0;
  for(const button of root.querySelectorAll?.('#modalRoot .v24-show-more')||[]){
    if(handled.has(button)||button.disabled||button.getAttribute('aria-disabled')==='true')continue;
    handled.add(button);
    button.click();
    clicks++;
  }
  return clicks;
}
const observer=new MutationObserver(records=>{
  if(!active())return;
  for(const record of records){
    for(const node of record.addedNodes){
      if(node.nodeType!==1)continue;
      if(node.matches?.('.v24-show-more'))expand(node.parentElement||document);
      else if(node.querySelector?.('.v24-show-more'))expand(node);
    }
  }
  expand(document);
});
function start(){observer.observe(document.documentElement,{childList:true,subtree:true});expand(document)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
window.TBC_PR7_COLLECTIONS={version:VERSION,expand,audit:()=>({version:VERSION,active:active(),directStorageWrites:false,nativeControl:'.v24-show-more'})};
})();
