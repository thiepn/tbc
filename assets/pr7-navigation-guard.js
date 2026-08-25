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
  const utility=target.closest?.('[data-pr5-utility]')?.dataset.p0cFeature||target.closest?.('[data-pr5-utility]')?.dataset.pr5Utility;
  if(utility&&utility!=='progress')return true;
  const preserved=target.closest?.('[data-p0c-feature]')?.dataset.p0cFeature;
  if(preserved&&!['library','collections','progress'].includes(preserved))return true;
  return Boolean(target.closest?.('.brand'));
};

function handle(event){
  const target=event.target?.closest?.('button,a,[role="button"]');
  if(!target||pr7Target(target))return;
  const api=window.TBC_PR7;if(!api)return;
  const flow=reentryFlow(target);
  if(flow&&!api.audit?.().active){
    event.preventDefault();event.stopImmediatePropagation();
    if(api.activate())api.open(flow);
    return;
  }
  if(exitsPr7(target)&&api.audit?.().active){
    /* Run after the destination's own handler. Deactivation invalidates any
     * in-flight PR7 render token and guarantees the old surface stays hidden. */
    setTimeout(()=>api.deactivate?.(),0);
  }
}

document.addEventListener('click',handle,true);
})();
