/* The Bible Challenge — P0B player-controls preservation bridge
 * Keeps the proven v4.1.0 five-tier difficulty control reachable from the
 * reconstructed shell. State changes are delegated to the legacy setSetting
 * function; this module never writes canonical game state directly.
 */
(()=>{'use strict';
if(window.TBC_P0B?.version)return;
const VERSION='P0B.2';
const STORAGE_KEY='theBibleChallenge_v21';
const TIERS=['Beginner','Easy','Standard','Advanced','Expert'];
const norm=v=>String(v||'').replace(/\s+/g,' ').trim();
const lower=v=>norm(v).toLowerCase();

function storedTier(){
  try{
    const raw=localStorage.getItem(STORAGE_KEY);
    const value=raw?JSON.parse(raw)?.settings?.difficulty:null;
    return TIERS.find(name=>lower(name)===lower(value))||null;
  }catch{return null}
}
function legacyDifficultyTarget(){
  const candidates=Array.from(document.querySelectorAll('button,[role="button"]')).filter(el=>!el.closest('[data-pr5-ui],[data-pr6-ui],[data-p0b-ui]'));
  return candidates.find(el=>{
    const text=lower(el.textContent||el.getAttribute('aria-label')||el.getAttribute('title'));
    const tier=TIERS.some(name=>text.includes(name.toLowerCase()));
    const signature=/\bdifficulty\b|\btier\b|\blevel\b/.test(text)&&!/\blives?\b|×|\bx\s*\d/i.test(text);
    return tier&&signature;
  })||null;
}
function currentTier(){
  const stored=storedTier();
  if(stored)return stored;
  const target=legacyDifficultyTarget();
  const text=norm(target?.textContent||target?.getAttribute('aria-label')||target?.getAttribute('title'));
  return TIERS.find(name=>new RegExp(`\\b${name}\\b`,'i').test(text))||'Standard';
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
    .p0b-tier-popover[hidden]{display:none!important}.p0b-tier-popover{position:fixed;z-index:10020;inset:0;display:grid;place-items:center;padding:20px;background:color-mix(in srgb,var(--bg) 44%,transparent);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px)}
    .p0b-tier-panel{width:min(560px,100%);padding:22px;border:1px solid var(--line);border-radius:20px;background:var(--surface);color:var(--text);box-shadow:var(--shadow)}
    .p0b-tier-head{display:flex;align-items:start;justify-content:space-between;gap:18px;margin-bottom:16px}.p0b-tier-head h2{margin:0 0 5px;font:850 1.18rem/1.2 var(--font-ui)}.p0b-tier-head p{margin:0;color:var(--muted);font:.84rem/1.45 var(--font-ui)}
    .p0b-tier-close{border:1px solid var(--line);border-radius:10px;background:var(--surface2);color:var(--text);min-width:38px;min-height:38px;cursor:pointer}
    .p0b-tier-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px}.p0b-tier-option{min-height:54px;padding:9px 7px;border:1px solid var(--line);border-radius:12px;background:var(--surface2);color:var(--text);font:800 .76rem/1.15 var(--font-ui);cursor:pointer}.p0b-tier-option:hover{border-color:var(--indigo)}.p0b-tier-option.active{border-color:var(--indigo);background:color-mix(in srgb,var(--indigo) 12%,var(--surface));color:var(--indigo)}
    body.dark .p0b-tier-option.active{color:var(--cyan);border-color:var(--cyan)}
    body.contrast .p0b-difficulty,body.contrast .p0b-tier-panel,body.contrast .p0b-tier-option,body.contrast .p0b-tier-close{border:2px solid currentColor;box-shadow:none}.p0b-tier-popover:focus{outline:none}
    @media(max-width:620px){.p0b-tier-grid{grid-template-columns:1fr}.p0b-tier-option{min-height:46px}.p0b-tier-panel{max-height:calc(100vh - 32px);overflow:auto}.p0b-difficulty span{display:none}}
  `;
  document.head.appendChild(style);
}
function setLegacyDifficulty(tier){
  const value=lower(tier);
  if(typeof window.setSetting!=='function')return false;
  window.setSetting('difficulty',value);
  if(typeof window.applySettings==='function')window.applySettings();
  return true;
}
function ensurePopover(){
  let overlay=document.querySelector('[data-p0b-tier-popover]');
  if(overlay)return overlay;
  overlay=document.createElement('div');
  overlay.className='p0b-tier-popover';
  overlay.dataset.p0bUi='true';
  overlay.dataset.p0bTierPopover='true';
  overlay.hidden=true;
  overlay.tabIndex=-1;
  overlay.setAttribute('role','dialog');
  overlay.setAttribute('aria-modal','true');
  overlay.setAttribute('aria-labelledby','p0b-tier-title');
  overlay.innerHTML=`<div class="p0b-tier-panel"><div class="p0b-tier-head"><div><h2 id="p0b-tier-title">Choose difficulty</h2><p>Choose the Bible-question difficulty used by normal practice. You can change it at any time.</p></div><button type="button" class="p0b-tier-close" aria-label="Close difficulty chooser">×</button></div><div class="p0b-tier-grid">${TIERS.map(tier=>`<button type="button" class="p0b-tier-option" data-p0b-tier="${tier}">${tier}</button>`).join('')}</div></div>`;
  overlay.querySelector('.p0b-tier-close').addEventListener('click',closePopover);
  overlay.addEventListener('click',event=>{if(event.target===overlay)closePopover()});
  overlay.querySelectorAll('[data-p0b-tier]').forEach(button=>button.addEventListener('click',()=>{
    const tier=button.dataset.p0bTier;
    if(!setLegacyDifficulty(tier))return;
    updateAll();
    closePopover();
  }));
  document.body.appendChild(overlay);
  return overlay;
}
function openPopover(){
  const overlay=ensurePopover();
  const active=currentTier();
  overlay.querySelectorAll('[data-p0b-tier]').forEach(button=>{
    const selected=lower(button.dataset.p0bTier)===lower(active);
    button.classList.toggle('active',selected);
    button.setAttribute('aria-pressed',String(selected));
  });
  overlay.hidden=false;
  overlay.focus({preventScroll:true});
  requestAnimationFrame(()=>overlay.querySelector(`[data-p0b-tier="${active}"]`)?.focus({preventScroll:true}));
  return true;
}
function closePopover(){
  const overlay=document.querySelector('[data-p0b-tier-popover]');
  if(overlay)overlay.hidden=true;
  document.querySelector('[data-p0b-difficulty]')?.focus({preventScroll:true});
}
function makeButton(){
  const button=document.createElement('button');
  button.type='button';
  button.className='p0b-difficulty';
  button.dataset.p0bUi='true';
  button.dataset.p0bDifficulty='true';
  button.setAttribute('aria-label','Choose difficulty');
  button.addEventListener('click',openPopover);
  return button;
}
function updateButton(button){
  const tier=currentTier();
  button.innerHTML=`<span>Difficulty</span><strong>${tier}</strong>`;
  button.title=`Current difficulty: ${tier}. Choose difficulty.`;
}
function updateAll(){document.querySelectorAll('[data-p0b-difficulty]').forEach(updateButton)}
function mount(){
  ensureStyle();
  ensurePopover();
  const topbar=document.querySelector('.topbar');
  if(!topbar)return;
  let button=topbar.querySelector('[data-p0b-difficulty]');
  if(!button){button=makeButton();topbar.appendChild(button)}
  updateButton(button);
}
let queued=false;
function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;mount()})}
const observer=new MutationObserver(schedule);
function start(){
  document.documentElement.setAttribute('data-p0b-player-controls',VERSION);
  observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden','data-pr6-flow','class']});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!document.querySelector('[data-p0b-tier-popover]')?.hidden)closePopover()});
  window.addEventListener('storage',updateAll);
  schedule();
  window.TBC_P0B={version:VERSION,audit:()=>({legacySetSetting:typeof window.setSetting==='function',button:Boolean(document.querySelector('[data-p0b-difficulty]')),tier:currentTier(),tiers:[...TIERS]}),openDifficulty:openPopover};
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
