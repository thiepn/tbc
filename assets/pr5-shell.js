/* The Bible Challenge — compatibility bridge for reconstructed flows.
 * Keep the original v4.1.0 Home, navigation, themes and presentation intact.
 * This file only exposes native navigation controls to PR6 and loads PR6 assets.
 */
(()=>{'use strict';
const ROOT_ATTR='data-pr5-foundation';
if(document.documentElement.getAttribute(ROOT_ATTR)==='compat-v4.1')return;
document.documentElement.setAttribute(ROOT_ATTR,'compat-v4.1');

const ASSETS={css:'assets/pr6-play-learning.css?v=pr6.3',js:'assets/pr6-play-learning.js?v=pr6.3'};

function ensureStyle(href,id){
  const base=href.split('?')[0];
  if(document.getElementById(id)||document.querySelector(`link[href^="${base}"]`))return;
  const link=document.createElement('link');
  link.id=id;link.rel='stylesheet';link.href=href;document.head.appendChild(link);
}

function ensureScript(src,id){
  const base=src.split('?')[0];
  if(document.getElementById(id)||document.querySelector(`script[src^="${base}"]`))return;
  const script=document.createElement('script');
  script.id=id;script.src=src;script.defer=true;document.head.appendChild(script);
}

function labelOf(node){return (node.textContent||'').replace(/\s+/g,' ').trim().toLowerCase();}
function exitPr6(){window.TBC_PR6?.deactivate?.();}
function bindExit(node){
  if(node.dataset.pr5ExitBound)return;
  node.dataset.pr5ExitBound='true';
  node.addEventListener('click',exitPr6);
}

function bridgeNativeNavigation(){
  const navs=document.querySelectorAll('.nav, .mobile-nav, [class*="bottom-nav"]');
  for(const nav of navs){
    for(const node of nav.querySelectorAll('button,a,[role="button"]')){
      const text=labelOf(node);
      if(/(^|\s)home($|\s)|overview|dashboard/.test(text))node.dataset.pr5Nav='home';
      else if(/(^|\s)play($|\s)/.test(text))node.dataset.pr5Nav='play';
      else if(/(^|\s)learn($|\s)/.test(text))node.dataset.pr5Nav='learn';
      else if(/library|collections?|books?/.test(text))node.dataset.pr5Nav='library';
      else if(/progress|mastery|stats/.test(text)){node.dataset.pr5Nav='progress';bindExit(node);}
      else if(/settings|preferences/.test(text)){node.dataset.pr5Nav='settings';bindExit(node);}
    }
  }
}

function boot(){
  bridgeNativeNavigation();
  ensureStyle(ASSETS.css,'pr6-play-learning-css');
  ensureScript(ASSETS.js,'pr6-play-learning-js');
  const observer=new MutationObserver(bridgeNativeNavigation);
  observer.observe(document.body,{subtree:true,childList:true});
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
})();
