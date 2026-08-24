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
  duel:{label:'Duel',ids:['pvpBtn'],terms:['PvP Duel','Duel'],domain:'play',prime:['Quick Play','Start Quick Play']},
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

const state={scheduled:false,observer:null,observed:Object.create(null),needsNativePrime:false,pendingLaunch:null};
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
function legacyTarget(key){
  const feature=FEATURES[key];
  if(!feature)return null;
  for(const id of feature.ids||[]){
    const el=document.getElementById(id);
    if(el)return el;
  }
  return findByTerms(feature.terms||[]);
}
function primeTarget(key){
  const feature=FEATURES[key];
  return feature?.prime?.length?findByTerms(feature.prime):null;
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
  const ok=Boolean(feature.pr6?window.TBC_PR6?.open:(legacyTarget(key)||primeTarget(key)));
  if(ok)state.observed[key]=true;
  return ok;
}
function waitForLegacyTarget(key,timeout=2500){
  const started=performance.now();
  return new Promise(resolve=>{
    const check=()=>{
      const target=legacyTarget(key);
      if(target)return resolve(target);
      if(performance.now()-started>=timeout)return resolve(null);
      requestAnimationFrame(check);
    };
    check();
  });
}
async function launchPrimed(key){
  const feature=FEATURES[key];
  if(!feature?.prime?.length||state.pendingLaunch)return false;
  const primer=primeTarget(key);
  if(!primer)return false;
  state.pendingLaunch=key;
  state.observed[key]=true;
  state.needsNativePrime=true;
  window.TBC_PR6?.deactivate?.();
  primer.click();
  const target=await waitForLegacyTarget(key);
  state.pendingLaunch=null;
  if(!target)return false;
  target.click();
  document.dispatchEvent(new CustomEvent('tbc:p0c-launch',{detail:{feature:key,primed:true}}));
  return true;
}
function launch(key){
  const feature=FEATURES[key];
  if(!feature)return false;
  if(feature.pr6&&window.TBC_PR6?.open){
    state.observed[key]=true;
    window.TBC_PR6.open(feature.pr6);
    return true;
  }
  const target=legacyTarget(key);
  if(target){
    state.observed[key]=true;
    state.needsNativePrime=true;
    window.TBC_PR6?.deactivate?.();
    target.click();
    document.dispatchEvent(new CustomEvent('tbc:p0c-launch',{detail:{feature:key}}));
    return true;
  }
  if(feature.prime?.length&&primeTarget(key)){
    launchPrimed(key);
    return true;
  }
  return false;
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
function ensureSection(root,kind,labelText){
  const view=root.querySelector('[data-pr6-view]');
  if(!view)return null;
  let section=root.querySelector(`[data-p0c-preserved="${kind}"]`);
  if(section)return section;
  section=document.createElement('section');
  section.dataset.p0cPreserved=kind;
  section.dataset.p0cUi='true';
  section.className='pr6-explain';
  section.innerHTML=`<span class="pr6-section-label">${labelText}</span><div class="p0c-preserved-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px"></div>`;
  view.appendChild(section);
  return section;
}
function ensureCards(section,definitions){
  if(!section)return;
  const grid=section.querySelector('.p0c-preserved-grid');
  if(!grid)return;
  for(const [key,title,copy,cta] of definitions){
    if(grid.querySelector(`[data-p0c-feature="${key}"]`))continue;
    const html=featureCard(key,title,copy,cta);
    if(!html)continue;
    grid.insertAdjacentHTML('beforeend',html);
  }
}
function injectPlayModes(root){
  const section=ensureSection(root,'play','Existing game modes');
  ensureCards(section,[
    ['duel','Duel','Open the existing PvP Duel mode and its established rules, rating, and room flow.','Play'],
    ['campaign','Campaign','Continue the existing mission ladder without replacing campaign progress.','Continue'],
    ['expedition','Expedition','Open the existing branching expedition mode and saved run state.','Explore']
  ]);
}
function injectLearnUtilities(root){
  const section=ensureSection(root,'learn','Your existing study data');
  ensureCards(section,[
    ['collections','Collections','Open your existing saved question and verse collections.','Open'],
    ['library','Library','Browse the existing Bible library and book-focused content.','Browse'],
    ['progress','Progress & Mastery','Open detailed mastery, book progress, and retained performance statistics.','View']
  ]);
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
    pendingLaunch:state.pendingLaunch,
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
