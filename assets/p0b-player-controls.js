/* The Bible Challenge — P0B player-controls preservation bridge
 * Restores access to the proven v4.1.0 difficulty chooser from reconstructed
 * Play surfaces. This module never writes game state; it delegates to the
 * legacy difficulty control so v4.1.0 remains the single source of truth.
 */
(()=>{'use strict';
if(window.TBC_P0B?.version)return;
const VERSION='P0B.1';
const TIERS=['Beginner','Easy','Standard','Advanced','Expert'];
const norm=v=>String(v||'').replace(/\s+/g,' ').trim();
const lower=v=>norm(v).toLowerCase();

function legacyDifficultyTarget(){
  const candidates=Array.from(document.querySelectorAll('button,[role="button"]')).filter(el=>!el.closest('[data-pr5-ui],[data-pr6-ui],[data-p0b-ui]'));
  return candidates.find(el=>{
    const text=lower(el.textContent||el.getAttribute('aria-label')||el.getAttribute('title'));
    const tier=TIERS.some(name=>text.includes(name.toLowerCase()));
    const signature=/\blives?\b|×|\bx\s*\d/i.test(text);
    return tier&&signature;
  })||null;
}
function currentTier(){
  const target=legacyDifficultyTarget();
  const text=norm(target?.textContent||target?.getAttribute('aria-label')||target?.getAttribute('title'));
  return TIERS.find(name=>new RegExp(`\\b${name}\\b`,'i').test(text))||'Difficulty';
}
function ensureStyle(){
  if(document.querySelector('style[data-p0b-style]'))return;
  const style=document.createElement('style');
  style.dataset.p0bStyle='true';
  style.textContent=`
    .p0b-difficulty{display:inline-flex;align-items:center;gap:8px;min-height:40px;padding:8px 12px;border:1px solid var(--line);border-radius:11px;background:var(--surface);color:var(--text);font:800 .78rem/1 var(--font-ui);cursor:pointer;box-shadow:var(--shadow-sm);transition:transform .16s ease,border-color .16s ease,box-shadow .16s ease}
    .p0b-difficulty:hover{transform:translateY(-1px);border-color:color-mix(in srgb,var(--indigo) 42%,var(--line));box-shadow:var(--shadow)}
    .p0b-difficulty span{color:var(--muted);font-weight:720}.p0b-difficulty strong{color:var(--indigo)}
    body.dark .p0b-difficulty strong{color:var(--cyan)}
    body.contrast .p0b-difficulty{border:2px solid currentColor;box-shadow:none}
  `;
  document.head.appendChild(style);
}
function openLegacyDifficulty(){
  const target=legacyDifficultyTarget();
  if(!target)return false;
  window.TBC_PR6?.deactivate?.();
  requestAnimationFrame(()=>{
    target.click();
    target.focus?.({preventScroll:true});
  });
  return true;
}
function makeButton(){
  const button=document.createElement('button');
  button.type='button';
  button.className='p0b-difficulty';
  button.dataset.p0bUi='true';
  button.dataset.p0bDifficulty='true';
  button.setAttribute('aria-label','Choose difficulty');
  button.addEventListener('click',()=>{
    if(!openLegacyDifficulty()){
      button.setAttribute('aria-label','Difficulty control unavailable');
      button.title='Difficulty control unavailable';
    }
  });
  return button;
}
function updateButton(button){
  const tier=currentTier();
  button.innerHTML=`<span>Difficulty</span><strong>${tier}</strong>`;
  button.title=`Current difficulty: ${tier}. Choose difficulty.`;
}
function mount(){
  ensureStyle();
  const root=document.querySelector('.pr6-root:not([hidden])');
  if(!root)return;
  const host=root.querySelector('.pr6-focus-top')||root.querySelector('.pr6-page-head')||root.querySelector('.pr6-domain-rail');
  if(!host)return;
  let button=root.querySelector('[data-p0b-difficulty]');
  if(!button){button=makeButton();host.appendChild(button)}
  updateButton(button);
}
let queued=false;
function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;mount()})}
const observer=new MutationObserver(schedule);
function start(){
  document.documentElement.setAttribute('data-p0b-player-controls',VERSION);
  observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden','data-pr6-flow','class']});
  schedule();
  window.TBC_P0B={version:VERSION,audit:()=>({legacyDifficulty:Boolean(legacyDifficultyTarget()),button:Boolean(document.querySelector('[data-p0b-difficulty]')),tier:currentTier()}),openDifficulty:openLegacyDifficulty};
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
