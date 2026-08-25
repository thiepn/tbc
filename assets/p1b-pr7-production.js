/* The Bible Challenge — P1B controlled PR7 production activation
 * Promotes the P1A-certified Library / Collections / Progress reconstruction.
 * State, questions, scoring, difficulty, mastery and persistence remain owned by
 * the retained legacy/P0C/PR6 layers.
 */
(()=>{'use strict';
if(window.TBC_P1B?.version)return;
const VERSION='P1B.0';
const script=document.currentScript;
const base=new URL('.',script?.src||document.baseURI);
const state={ready:false,error:null,activated:false};

const wait=(test,timeout=10000)=>new Promise((resolve,reject)=>{
  const started=performance.now();
  const tick=()=>{
    try{if(test())return resolve(true)}catch{}
    if(performance.now()-started>=timeout)return reject(new Error('P1B dependency timeout'));
    setTimeout(tick,25);
  };
  tick();
});
function style(name,key){
  if(document.querySelector(`link[data-${key}]`))return;
  const link=document.createElement('link');
  link.rel='stylesheet';link.href=new URL(name,base).href;link.dataset[key]='true';
  document.head.appendChild(link);
}
function load(name,key){
  return new Promise((resolve,reject)=>{
    const existing=document.querySelector(`script[data-${key}]`);
    if(existing){if(existing.dataset.loaded==='true')return resolve(true);existing.addEventListener('load',()=>resolve(true),{once:true});existing.addEventListener('error',reject,{once:true});return;}
    const node=document.createElement('script');
    node.src=new URL(name,base).href;node.dataset[key]='true';
    node.addEventListener('load',()=>{node.dataset.loaded='true';resolve(true)},{once:true});
    node.addEventListener('error',()=>reject(new Error(`P1B failed to load ${name}`)),{once:true});
    document.head.appendChild(node);
  });
}
async function boot(){
  try{
    await wait(()=>window.TBC_P0C?.version&&window.TBC_PR6?.version);
    style('pr7-library-progress.css','p1bPr7Style');
    await load('pr7-collections-adapter.js','p1bCollectionsAdapter');
    await load('pr7-library-progress.js','p1bPr7Core');
    await wait(()=>window.TBC_PR7?.version==='P1A.1');
    await load('pr7-navigation-guard.js','p1bPr7Guard');
    await wait(()=>window.__TBC_PR7_NAV_GUARD__===true);
    if(!window.TBC_PR7.activate())throw new Error('P1B PR7 activation prerequisites unavailable');
    state.activated=true;state.ready=true;
    document.documentElement.setAttribute('data-p1b-pr7-production',VERSION);
    document.dispatchEvent(new CustomEvent('tbc:p1b-ready',{detail:{version:VERSION}}));
  }catch(error){
    state.error=String(error?.message||error);
    document.documentElement.setAttribute('data-p1b-pr7-error','true');
    console.error('[TBC P1B]',error);
  }
}
function audit(){
  const pr7=window.TBC_PR7?.audit?.()||null;
  return {
    version:VERSION,
    productionActive:true,
    ready:state.ready,
    activated:state.activated,
    error:state.error,
    pr7Version:window.TBC_PR7?.version||null,
    p0cVersion:window.TBC_P0C?.version||null,
    pr6Version:window.TBC_PR6?.version||null,
    guard:Boolean(window.__TBC_PR7_NAV_GUARD__),
    canonicalStateKeys:['theBibleChallenge_v21','theBibleChallenge_v21_recovery'],
    stateOwnership:'legacy/P0C/PR6',
    directStorageWrites:false,
    pass:Boolean(state.ready&&state.activated&&!state.error&&pr7?.pass&&window.__TBC_PR7_NAV_GUARD__)
  };
}
window.TBC_P1B={version:VERSION,productionActive:true,audit};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
