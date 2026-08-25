/* The Bible Challenge — PR7 navigation exit guard
 * Compatibility guard for staged/activated PR7 routing. It prevents a stale PR7
 * surface from surviving a hand-off to PR5/PR6 native destinations, while keeping
 * Library and Progress re-entry available without owning game or persistence state.
 */
(()=>{'use strict';
if(window.__TBC_PR7_NAV_GUARD__)return;window.__TBC_PR7_NAV_GUARD__=true;

const pr7Target=target=>Boolean(target?.closest?.('[data-pr7-ui]'));
const reentryFlow=target=>{
  const nav=target?.closest?.('[data-pr5-nav]')?.dataset.pr5Nav;
  if(nav==='library')return'library';
  const utility=target?.closest?.('[data-pr5-utility]')?.dataset.pr5Utility;
  if(utility==='progress')return'progress';
  const preserved=target?.closest?.('[data-p0c-feature]')?.dataset.p0cFeature;
  return ['library','collections','progress'].includes(preserved)?preserved:null;
};
const exitsPr7=target=>{
  if(!target||pr7Target(target))return false;
  const nav=target.closest?.('[data-pr5-nav]')?.dataset.pr5Nav;
  if(nav&&nav!=='library')return true;
  const utility=target.closest?.('[data-pr5-utility]')?.dataset.pr5Utility;
  if(utility&&utility!=='progress')return true;
  const preserved=target.closest?.('[data-p0c-feature]')?.dataset.p0cFeature;
  if(preserved&&!['library','collections','progress'].includes(preserved))return true;
  return Boolean(target.closest?.('.brand'));
};

function deactivate(){
  const api=window.TBC_PR7;
  if(api?.audit?.().active)api.deactivate?.();
}
function handle(event){
  const target=event.target?.closest?.('button,a,[role="button"]');
  if(!target||pr7Target(target))return;
  const api=window.TBC_PR7;if(!api)return;
  const flow=reentryFlow(target);
  if(flow&&!api.audit?.().active){
    if(!event.isTrusted)return;
    event.preventDefault();event.stopImmediatePropagation();
    if(api.activate())api.open(flow);
    return;
  }
  if(exitsPr7(target)&&api.audit?.().active)deactivate();
}

/* Native routing can complete after click propagation. Reconcile against the
 * authoritative PR5/PR6 route markers so PR7 cannot remain visible even when a
 * retained handler performs additional navigation work after our capture pass. */
const routeObserver=new MutationObserver(records=>{
  const api=window.TBC_PR7;if(!api?.audit?.().active)return;
  for(const record of records){
    if(record.attributeName==='data-pr6-flow'&&document.body.dataset.pr6Flow){deactivate();return;}
    if(record.attributeName==='data-pr5-domain'){
      const domain=document.body.dataset.pr5Domain;
      if(domain&&domain!=='library'){deactivate();return;}
    }
  }
});
function observeRoutes(){
  if(!document.body)return;
  routeObserver.observe(document.body,{attributes:true,attributeFilter:['data-pr5-domain','data-pr6-flow']});
}

document.addEventListener('click',handle,true);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',observeRoutes,{once:true});else observeRoutes();
})();
