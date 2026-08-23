/* The Bible Challenge — PR5 compatibility shell
 * The v4.1.0 interface remains the visual/navigation authority.
 * This bridge only annotates existing native navigation for PR6 and loads the
 * reconstructed learning-flow assets. It must not replace or hide native UI.
 */
(()=>{'use strict';
const VERSION='PR5.2-RESTORED';
const ROOT_ATTR='data-pr5-foundation';
if(document.documentElement.getAttribute(ROOT_ATTR)===VERSION)return;
const ASSET_BASE=new URL('.',document.currentScript?.src||document.baseURI);
document.documentElement.setAttribute(ROOT_ATTR,VERSION);

const norm=v=>String(v||'').replace(/\s+/g,' ').trim().toLowerCase();
const routeFor=text=>{
  const t=norm(text);
  if(/\b(home|overview|dashboard)\b/.test(t))return'home';
  if(/\b(study|learn|journey|learning path|adaptive review)\b/.test(t))return'learn';
  if(/\b(bible|library|books|collection)\b/.test(t))return'library';
  if(/\b(progress|mastery|stats|statistics)\b/.test(t))return'progress';
  if(/\b(play|practice|quiz|challenge)\b/.test(t))return'play';
  return null;
};
const nativeNavSelector='.sidebar .nav button,.sidebar .nav a,.mobile-nav button,.mobile-nav a';
function annotateNativeNavigation(){
  document.querySelectorAll(nativeNavSelector).forEach(el=>{
    const raw=el.getAttribute('aria-label')||el.getAttribute('title')||el.textContent;
    const route=routeFor(raw);
    if(route){
      el.dataset.pr5Nav=route;
      /* PR6's legacy route resolver calls these native controls internally.
       * Preserve the visible TBC label while giving "Study" a learn alias. */
      if(route==='learn'&&norm(el.textContent)==='study'&&!el.getAttribute('aria-label')){
        el.title='Learn · Study';
      }
    }else delete el.dataset.pr5Nav;
  });
}
/* Playwright/user input produces trusted events. PR6's internal route priming
 * uses HTMLElement.click(), which is untrusted and must reach the native TBC
 * handler rather than being re-intercepted by PR6. Remove the bridge marker
 * for that one dispatch and restore it immediately afterwards. */
function allowSyntheticNativeNavigation(event){
  if(event.isTrusted)return;
  const target=event.target?.closest?.(nativeNavSelector);
  if(!target?.dataset?.pr5Nav)return;
  const route=target.dataset.pr5Nav;
  delete target.dataset.pr5Nav;
  queueMicrotask(()=>{if(target.isConnected)target.dataset.pr5Nav=route});
}
function addStyle(href,marker){
  if(document.querySelector(`link[${marker}]`))return;
  const link=document.createElement('link');
  link.rel='stylesheet';
  link.href=href;
  link.setAttribute(marker,'true');
  document.head.appendChild(link);
}
function loadPr6(){
  if(window.__TBC_PR6_LOADER__)return;
  window.__TBC_PR6_LOADER__=true;
  addStyle(new URL('pr6-play-learning.css',ASSET_BASE).href,'data-pr6-style');
  addStyle(new URL('pr6-vibrant.css',ASSET_BASE).href,'data-pr6-vibrant');
  if(!document.querySelector('script[data-pr6-script]')){
    const script=document.createElement('script');
    script.src=new URL('pr6-play-learning.js',ASSET_BASE).href;
    script.defer=true;
    script.dataset.pr6Script='true';
    document.head.appendChild(script);
  }
}
function start(){
  annotateNativeNavigation();
  document.addEventListener('click',allowSyntheticNativeNavigation,true);
  loadPr6();
  const observer=new MutationObserver(()=>annotateNativeNavigation());
  observer.observe(document.body,{childList:true,subtree:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
else start();
})();
