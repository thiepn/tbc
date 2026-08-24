/* The Bible Challenge — P0C Existing Feature Preservation
 * Access-preservation only. This layer never rewrites legacy feature state.
 * It keeps established v4.1.0 surfaces reachable while the PR5/PR6 shell is active.
 */
(()=>{'use strict';

const VERSION='P0C.3';
if(window.TBC_P0C?.version)return;

const FEATURES={
  collections:{label:'Collections',ids:['collectionsBtn'],terms:['Collections'],domain:'learn'},
  library:{label:'Library',ids:['libraryBtn'],terms:['Library','Book Library'],domain:'library'},
  progress:{label:'Progress & Mastery',ids:['progressBtn'],terms:['Progress','Mastery','Stats'],domain:'progress'},
  journey:{label:'Bible Journey',pr6:'journey',domain:'learn'},
  path:{label:'Learning Path',pr6:'path',domain:'learn'},
  review:{label:'Adaptive Review',pr6:'review',domain:'learn'},
  duel:{label:'Duel',functions:['v31OpenDuelSetup'],ids:['pvpBtn'],terms:['PvP Duel','Duel','PvP'],domain:'play'},
  campaign:{label:'Campaign',ids:['campaignBtn'],terms:['Campaign'],domain:'play'},
  expedition:{label:'Expedition',ids:['expeditionBtn'],terms:['Expedition'],domain:'play'},

  /* Adjacent legacy surfaces covered by the same bridge when present. They
   * are intentionally not duplicated into the main hubs unless the legacy
   * product already exposes them there. */
  challenges:{label:'Challenges',ids:['challengesBtn','challengeBtn'],terms:['Challenges','Challenge Mode'],domain:'play',optional:true},
  reader:{label:'Bible Reader Practice',ids:['bibleReaderBtn','readerBtn'],terms:['Bible Reader Practice','Bible Reader','Reader Practice'],domain:'library',optional:true},
  achievements:{label:'Achievements',ids:['achievementsBtn'],terms:['Achievements'],domain:'utility',optional:true},
  profile:{label:'Profile',ids:['profileBtn'],terms:['Profile'],domain:'utility',optional:true},
  settings:{label:'Settings',ids:['settingsBtn'],terms:['Settings','Preferences'],domain:'utility',optional:true},
  memory:{label:'Memory Helper',ids:['memoryBtn','memoryVerseBtn'],terms:['Memory Helper','Memory Verse'],domain:'learn',optional:true},
  custom:{label:'Custom Questions',ids:['customQuestionsBtn','customBtn'],terms:['Custom Questions','Custom Practice'],domain:'play',optional:true}
};

/* Canonical v4.1.0 browser-state contract verified by P0A runtime probes. */
const STORAGE_CONTRACTS=['theBibleChallenge_v21','theBibleChallenge_v21_recovery'];
const REQUIRED=['collections','library','progress','journey','path','review','duel','campaign','expedition'];

const state={scheduled:false,observer:null,observed:Object.create(null),needsNativePrime:false};
const norm=v=>String(v||'').replace(/\s+/g,' ').trim().toLowerCase();
const own=el=>Boolean(el?.closest?.('[data-p0c-ui],[data-pr5-ui],[data-pr6-ui]'));

function clickables(root=document){
  return Array.from(root.querySelectorAll('button,a[href],[role="button"]')).filter(el=>!own(el));
}
function label(el){return String(el?.getAttribute?.('aria-label')||el?.getAttribute?.('title')||el?.textContent||'').trim()}
function findByTerms(terms=[],root=document){
  const candidates=clickables(root).map(el=>{
    const text=norm(label(el));
    let score=-1;
    terms.forEach((term,index)=>{
      const t=norm(term);
      if(text===t)score=Math.max(score,120-index);
      else if(text.startsWith(t))score=Math.max(score,90-index);
      else if(text.includes(t))score=Math.max(score,60-index);
    });
    return {el,score};
  }).filter(x=>x.score>=0).sort((a,b)=>b.score-a.score);
  return candidates[0]?.el||null;
}
function legacyFunction(key){
  const feature=FEATURES[key];
  if(!feature)return null;
  for(const name of feature.functions||[]){
    const fn=window[name];
    if(typeof fn==='function')return fn;
  }
  return null;
}
function legacyTarget(key){
  const feature=FEATURES[key];
  if(!feature)return null;
  for(const id of feature.ids||[]){
    const el=document.getElementById(id);
    if(el)return el;
  }
  return findByTerms(feature.terms||[]);
}
function nativeDomainTarget(domain){
  const terms=domain==='play'?['Play']:domain==='learn'?['Learn']:domain==='library'?['Library','Books']:[];
  if(!terms.length)return null;
  const nav=document.querySelector('.pr5-native-nav')||Array.from(document.querySelectorAll('.nav')).find(el=>!own(el));
  return nav?findByTerms(terms,nav):null;
}
function available(key){
  const feature=FEATURES[key];
  if(!feature)return false;
  const ok=Boolean(feature.pr6?window.TBC_PR6?.open:(legacyFunction(key)||legacyTarget(key)));
  if(ok)state.observed[key]=true;
  return ok;
}
function launch(key){
  const feature=FEATURES[key];
  if(!feature)return false;
  if(feature.pr6&&window.TBC_PR6?.open){
    state.observed[key]=true;
    window.TBC_PR6.open(feature.pr6);
    return true;
  }
  const direct=legacyFunction(key);
  if(direct){
    state.observed[key]=true;
    direct();
    document.dispatchEvent(new CustomEvent('tbc:p0c-launch',{detail:{feature:key,entry:'function'}}));
    return true;
  }
  const target=legacyTarget(key);
  if(!target)return false;
  state.observed[key]=true;
  state.needsNativePrime=true;
  window.TBC_PR6?.deactivate?.();
  target.click();
  document.dispatchEvent(new CustomEvent('tbc:p0c-launch',{detail:{feature:key,entry:'dom'}}));
  return true;
}

/* PR6 caches which legacy domain was last primed. A P0C handoff deliberately
 * leaves that domain for a legacy feature. On the next PR5 Play/Learn click,
 * normalize the hidden native view at window-capture time, before PR6's
 * document-capture router runs. This prevents stale Campaign/Library/etc.
 * content from being mistaken for a freshly primed Play/Learn surface. */
function normalizeReentry(event){
  if(!state.needsNativePrime)return;
  const target=event.target?.closest?.('[data-pr5-nav],.pr5-utility-link,.brand');
  if(!target)return;
  const nav=target.closest?.('[data-pr5-nav]');
  const domain=nav?.dataset?.pr5Nav;
  if(domain==='play'||domain==='learn'){
    nativeDomainTarget(domain)?.click();
    state.needsNativePrime=false;
  }else if(domain==='home'||domain==='library'||target.closest?.('.pr5-utility-link,.brand')){
    state.needsNativePrime=false;
  }
}

function featureCard(key,title,copy,cta='Open'){
  if(!available(key))return'';
  return `<button type="button" class="pr6-flow-card" data-p0c-ui="true" data-p0c-feature="${key}">
    <strong>${title}</strong><span>${copy}</span><b>${cta} <i aria-hidden="true">→</i></b>
  </button>`;
}
function reconcileSection(root,kind,labelText,cards){
  const view=root.querySelector('[data-pr6-view]');
  if(!view||!cards)return;
  let section=root.querySelector(`[data-p0c-preserved="${kind}"]`);
  if(!section){
    section=document.createElement('section');
    section.dataset.p0cPreserved=kind;
    section.dataset.p0cUi='true';
    section.className='pr6-explain';
    section.innerHTML=`<span class="pr6-section-label">${labelText}</span><div class="p0c-preserved-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px"></div>`;
    view.appendChild(section);
  }else if(section.parentElement!==view){
    view.appendChild(section);
  }
  const grid=section.querySelector('.p0c-preserved-grid');
  if(grid&&grid.innerHTML!==cards)grid.innerHTML=cards;
}
function injectPlayModes(root){
  const cards=[
    featureCard('duel','Duel','Open the existing PvP Duel mode and its established rules, rating, and room flow.','Play'),
    featureCard('campaign','Campaign','Continue the existing mission ladder without replacing campaign progress.','Continue'),
    featureCard('expedition','Expedition','Open the existing branching expedition mode and saved run state.','Explore')
  ].filter(Boolean).join('');
  reconcileSection(root,'play','Existing game modes',cards);
}
function injectLearnUtilities(root){
  const cards=[
    featureCard('collections','Collections','Open your existing saved question and verse collections.','Open'),
    featureCard('library','Library','Browse the existing Bible library and book-focused content.','Browse'),
    featureCard('progress','Progress & Mastery','Open detailed mastery, book progress, and retained performance statistics.','View')
  ].filter(Boolean).join('');
  reconcileSection(root,'learn','Your existing study data',cards);
}
function bind(root=document){
  root.querySelectorAll('[data-p0c-feature]:not([data-p0c-bound])').forEach(button=>{
    button.dataset.p0cBound='true';
    button.addEventListener('click',()=>launch(button.dataset.p0cFeature));
  });
}
function sync(){
  state.scheduled=false;
  const root=document.querySelector('.pr6-root');
  const flow=document.body?.dataset?.pr6Flow;
  if(root&&!root.hidden){
    if(flow==='play')injectPlayModes(root);
    if(flow==='learn')injectLearnUtilities(root);
    bind(root);
  }
  document.documentElement.setAttribute('data-p0c-preservation',VERSION);
}
function scheduleSync(){
  if(state.scheduled)return;
  state.scheduled=true;
  requestAnimationFrame(sync);
}
function audit(){
  const featureStatus=Object.fromEntries(Object.keys(FEATURES).map(key=>[key,Boolean(state.observed[key]||available(key))]));
  const storage=Object.fromEntries(STORAGE_CONTRACTS.map(key=>[key,{present:localStorage.getItem(key)!==null}]));
  return {
    version:VERSION,
    legacyStateUntouched:true,
    required:[...REQUIRED],
    features:featureStatus,
    storage,
    reentryGuard:Boolean(window.__TBC_P0C_REENTRY_BOUND__),
    pendingNativePrime:state.needsNativePrime,
    playPreservation:Boolean(document.querySelector('[data-p0c-preserved="play"]')),
    learnPreservation:Boolean(document.querySelector('[data-p0c-preserved="learn"]')),
    pass:REQUIRED.every(key=>featureStatus[key])
  };
}
function start(){
  document.documentElement.setAttribute('data-p0c-preservation',VERSION);
  if(!window.__TBC_P0C_REENTRY_BOUND__){
    window.__TBC_P0C_REENTRY_BOUND__=true;
    window.addEventListener('click',normalizeReentry,true);
  }
  state.observer=new MutationObserver(scheduleSync);
  state.observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden','data-pr6-flow']});
  scheduleSync();
  window.TBC_P0C={version:VERSION,features:FEATURES,launch,audit,sync};
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
