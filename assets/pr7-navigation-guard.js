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

/* PR7 primes retained Library/Progress surfaces internally, so generic PR5
 * domain changes are not a safe exit signal. A truthy PR6 flow is authoritative:
 * it only appears when PR6 has taken navigation ownership. */
const routeObserver=new MutationObserver(records=>{
  const api=window.TBC_PR7;if(!api?.audit?.().active)return;
  if(records.some(record=>record.attributeName==='data-pr6-flow')&&document.body.dataset.pr6Flow)deactivate();
});
function observeRoutes(){
  if(!document.body)return;
  routeObserver.observe(document.body,{attributes:true,attributeFilter:['data-pr6-flow']});
}

document.addEventListener('click',handle,true);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',observeRoutes,{once:true});else observeRoutes();
})();
