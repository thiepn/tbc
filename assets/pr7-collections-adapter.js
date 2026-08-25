/* The Bible Challenge — P1A retained Collections adapter
 * The v24 catalog initially renders 18 of 22 collections behind one native
 * `.v24-show-more` control. While staged PR7 is explicitly active, expand that
 * retained catalog before PR7 reads or launches from it. No data is invented.
 */
(()=>{'use strict';
if(window.TBC_PR7_COLLECTIONS?.version)return;
const VERSION='P1A.1';
const pending=new WeakSet();
function active(){return Boolean(document.documentElement.getAttribute('data-pr7-activated'))}
function eligible(button){return Boolean(button?.isConnected&&!button.disabled&&button.getAttribute('aria-disabled')!=='true')}
function expand(root=document){
  if(!active())return 0;
  let scheduled=0;
  for(const button of root.querySelectorAll?.('#modalRoot .v24-show-more')||[]){
    if(!eligible(button)||pending.has(button))continue;
    pending.add(button);
    scheduled++;
    /* The retained modal can insert the control before its own click handler is
     * fully bound. Delay one task, then permit a bounded retry if it remains. */
    setTimeout(()=>{
      if(active()&&eligible(button))button.click();
      setTimeout(()=>pending.delete(button),70);
    },20);
  }
  return scheduled;
}
function settle(){
  if(!active())return;
  let attempt=0;
  const tick=()=>{
    if(!active()||attempt++>=12)return;
    expand(document);
    if(document.querySelectorAll('#modalRoot .v24-collection-card').length>=22&&!document.querySelector('#modalRoot .v24-show-more'))return;
    setTimeout(tick,40);
  };
  tick();
}
const observer=new MutationObserver(records=>{
  if(!active())return;
  let relevant=false;
  for(const record of records){
    if(record.type==='attributes'&&record.target===document.documentElement){relevant=true;break}
    for(const node of record.addedNodes){
      if(node.nodeType!==1)continue;
      if(node.matches?.('.v24-show-more,.v24-collection-card')||node.querySelector?.('.v24-show-more,.v24-collection-card')){relevant=true;break}
    }
    if(relevant)break;
  }
  if(relevant)settle();
});
function start(){
  observer.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['data-pr7-activated']});
  settle();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
window.TBC_PR7_COLLECTIONS={version:VERSION,expand,settle,audit:()=>({version:VERSION,active:active(),directStorageWrites:false,nativeControl:'.v24-show-more'})};
})();
