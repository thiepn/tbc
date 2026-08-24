/* The Bible Challenge — P0C Existing Feature Preservation
 * Access-preservation only. This layer never rewrites legacy feature state.
 * It keeps established v4.1.0 surfaces reachable while the PR5/PR6 shell is active.
 */
(()=>{'use strict';

const VERSION='P0C.1';
if(window.TBC_P0C?.version)return;

const FEATURES={
  collections:{label:'Collections',ids:['collectionsBtn'],terms:['Collections'],domain:'learn'},
  library:{label:'Library',ids:['libraryBtn'],terms:['Library','Book Library'],domain:'library'},
  progress:{label:'Progress & Mastery',ids:['progressBtn'],terms:['Progress','Mastery','Stats'],domain:'progress'},
  journey:{label:'Bible Journey',pr6:'journey',domain:'learn'},
  path:{label:'Learning Path',pr6:'path',domain:'learn'},
  review:{label:'Adaptive Review',pr6:'review',domain:'learn'},
  duel:{label:'Duel',ids:['pvpBtn'],terms:['PvP Duel','Duel'],domain:'play'},
  campaign:{label:'Campaign',ids:['campaignBtn'],terms:['Campaign'],domain:'play'},
  expedition:{label:'Expedition',ids:['expeditionBtn'],terms:['Expedition'],domain:'play'}
};

const STORAGE_CONTRACTS=[
  'tbc_v4_progress','tbc_v4_custom','tbc_v4_verses','tbc_v4_collection',
  'tbc_v4_achievements','tbc_v4_profile','tbc_v4_theme','tbc_v4_locale'
];

const state={scheduled:false,observer:null};
const norm=v=>String(v||'').replace(/\s+/g,' ').trim().toLowerCase();
const own=el=>Boolean(el?.closest?.('[data-p0c-ui],[data-pr5-ui],[data-pr6-ui]'));

function clickables(){
  return Array.from(document.querySelectorAll('button,a[href],[role="button"]')).filter(el=>!own(el));
}
function label(el){return String(el?.getAttribute?.('aria-label')||el?.getAttribute?.('title')||el?.textContent||'').trim()}
function findByTerms(terms=[]){
  const candidates=clickables().map(el=>{
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
function launch(key){
  const feature=FEATURES[key];
  if(!feature)return false;
  if(feature.pr6&&window.TBC_PR6?.open){
    window.TBC_PR6.open(feature.pr6);
    return true;
  }
  const target=legacyTarget(key);
  if(!target)return false;
  window.TBC_PR6?.deactivate?.();
  target.click();
  document.dispatchEvent(new CustomEvent('tbc:p0c-launch',{detail:{feature:key}}));
  return true;
}

function featureCard(key,title,copy,cta='Open'){
  if(!available(key))return'';
  return `<button type="button" class="pr6-flow-card" data-p0c-ui="true" data-p0c-feature="${key}">
    <strong>${title}</strong><span>${copy}</span><b>${cta} <i aria-hidden="true">→</i></b>
  </button>`;
}
function available(key){
  const feature=FEATURES[key];
  return Boolean(feature&&(feature.pr6?window.TBC_PR6?.open:legacyTarget(key)));
}
function injectPlayModes(root){
  if(root.querySelector('[data-p0c-preserved="play"]'))return;
  const view=root.querySelector('[data-pr6-view]');
  if(!view)return;
  const cards=[
    featureCard('duel','Duel','Open the existing PvP Duel mode and its established rules, rating, and room flow.','Play'),
    featureCard('campaign','Campaign','Continue the existing mission ladder without replacing campaign progress.','Continue'),
    featureCard('expedition','Expedition','Open the existing branching expedition mode and saved run state.','Explore')
  ].filter(Boolean).join('');
  if(!cards)return;
  const section=document.createElement('section');
  section.dataset.p0cPreserved='play';
  section.dataset.p0cUi='true';
  section.className='pr6-explain';
  section.innerHTML=`<span class="pr6-section-label">Existing game modes</span><div class="pr6-intro-grid three">${cards}</div>`;
  view.appendChild(section);
}
function injectLearnUtilities(root){
  if(root.querySelector('[data-p0c-preserved="learn"]'))return;
  const view=root.querySelector('[data-pr6-view]');
  if(!view)return;
  const cards=[
    featureCard('collections','Collections','Open your existing saved question and verse collections.','Open'),
    featureCard('library','Library','Browse the existing Bible library and book-focused content.','Browse'),
    featureCard('progress','Progress & Mastery','Open detailed mastery, book progress, and retained performance statistics.','View')
  ].filter(Boolean).join('');
  if(!cards)return;
  const section=document.createElement('section');
  section.dataset.p0cPreserved='learn';
  section.dataset.p0cUi='true';
  section.className='pr6-explain';
  section.innerHTML=`<span class="pr6-section-label">Your existing study data</span><div class="pr6-intro-grid three">${cards}</div>`;
  view.appendChild(section);
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
  const featureStatus=Object.fromEntries(Object.keys(FEATURES).map(key=>[key,available(key)]));
  const storage=Object.fromEntries(STORAGE_CONTRACTS.map(key=>[key,{present:localStorage.getItem(key)!==null}]));
  const required=['collections','library','progress','journey','path','review','duel','campaign','expedition'];
  return {
    version:VERSION,
    legacyStateUntouched:true,
    features:featureStatus,
    storage,
    playPreservation:Boolean(document.querySelector('[data-p0c-preserved="play"]')),
    learnPreservation:Boolean(document.querySelector('[data-p0c-preserved="learn"]')),
    pass:required.every(key=>featureStatus[key])
  };
}
function start(){
  document.documentElement.setAttribute('data-p0c-preservation',VERSION);
  state.observer=new MutationObserver(scheduleSync);
  state.observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden','data-pr6-flow']});
  scheduleSync();
  window.TBC_P0C={version:VERSION,features:FEATURES,launch,audit,sync};
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
