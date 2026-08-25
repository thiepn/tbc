/* The Bible Challenge — P0B player-controls preservation bridge
 * Restores the canonical five-tier Bible-question difficulty selector to the
 * reconstructed shell. State changes delegate to the legacy v4.1.0 APIs;
 * this layer never writes browser persistence directly.
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
function currentTier(){return storedTier()||'Standard'}
function legacySetterAvailable(){return typeof window.setSetting==='function'}
function setTier(value){
  const tier=TIERS.find(name=>lower(name)===lower(value));
  if(!tier||!legacySetterAvailable())return false;
  window.setSetting('difficulty',lower(tier));
  if(typeof window.save==='function')window.save();
  if(typeof window.applySettings==='function')window.applySettings();
  schedule();
  document.dispatchEvent(new CustomEvent('tbc:p0b-difficulty',{detail:{tier}}));
  return true;
}

function ensureStyle(){
  if(document.querySelector('style[data-p0b-style]'))return;
  const style=document.createElement('style');
  style.dataset.p0bStyle='true';
  style.textContent=`
    .p0b-control{display:inline-flex;align-items:center;gap:8px;min-height:40px;padding:6px 8px 6px 10px;border:1px solid var(--line);border-radius:11px;background:var(--surface);color:var(--text);box-shadow:var(--shadow-sm);font:800 .76rem/1 var(--font-ui)}
    .p0b-control>span{color:var(--muted);font-weight:760;white-space:nowrap}
    .p0b-control select{min-width:104px;max-width:132px;height:30px;padding:0 26px 0 8px;border:0;border-radius:8px;background:color-mix(in srgb,var(--indigo) 9%,var(--surface));color:var(--indigo);font:850 .78rem/1 var(--font-ui);cursor:pointer;outline:none}
    .p0b-control select:focus-visible{outline:3px solid color-mix(in srgb,var(--cyan) 52%,transparent);outline-offset:2px}
    body.dark .p0b-control select{color:var(--cyan);background:color-mix(in srgb,var(--cyan) 10%,var(--surface))}
    body.contrast .p0b-control{border:2px solid currentColor;box-shadow:none}
    body.contrast .p0b-control select{border:1px solid currentColor;background:var(--surface);color:var(--text)}
    @media(max-width:640px){.p0b-control{padding:5px 6px;gap:4px}.p0b-control>span{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}.p0b-control select{min-width:88px;max-width:100px;padding-left:6px;font-size:.72rem}}
    @media(prefers-reduced-motion:reduce){.p0b-control *{scroll-behavior:auto!important}}
  `;
  document.head.appendChild(style);
}
function makeControl(){
  const wrap=document.createElement('label');
  wrap.className='p0b-control';
  wrap.dataset.p0bUi='true';
  wrap.dataset.p0bControl='true';
  wrap.innerHTML='<span>Bible level</span>';
  const select=document.createElement('select');
  select.dataset.p0bDifficulty='true';
  select.setAttribute('aria-label','Bible question difficulty');
  TIERS.forEach(name=>{
    const option=document.createElement('option');
    option.value=lower(name);option.textContent=name;select.appendChild(option);
  });
  select.addEventListener('change',()=>{
    if(!setTier(select.value)){
      select.value=lower(currentTier());
      select.setAttribute('aria-invalid','true');
    }else select.removeAttribute('aria-invalid');
  });
  wrap.appendChild(select);
  return wrap;
}
function host(){
  const activePr6=document.querySelector('.pr6-root:not([hidden])');
  return activePr6?.querySelector('.pr6-focus-top,.pr6-page-head,.pr6-domain-rail')||document.querySelector('.topbar');
}
function mount(){
  ensureStyle();
  const target=host();
  if(!target)return;
  let control=document.querySelector('[data-p0b-control]');
  if(!control)control=makeControl();
  if(control.parentElement!==target)target.appendChild(control);
  const select=control.querySelector('[data-p0b-difficulty]');
  if(select&&document.activeElement!==select)select.value=lower(currentTier());
  control.hidden=false;
}
let queued=false;
function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;mount()})}
const observer=new MutationObserver(schedule);
function start(){
  document.documentElement.setAttribute('data-p0b-player-controls',VERSION);
  observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden','data-pr6-flow','class']});
  schedule();
  window.TBC_P0B={
    version:VERSION,
    tiers:[...TIERS],
    currentTier,
    setDifficulty:setTier,
    audit:()=>({legacySetter:legacySetterAvailable(),control:Boolean(document.querySelector('[data-p0b-control]')),tier:currentTier(),tiers:[...TIERS]})
  };
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();

/* P1B production loader — P0B remains the last dependency loaded by PR5, so it
 * is the narrowest safe bootstrap point for the post-P0F PR7 activation layer. */
(()=>{'use strict';
if(window.__TBC_P1B_LOADER__)return;window.__TBC_P1B_LOADER__=true;
const current=document.currentScript;
const base=new URL('.',current?.src||document.baseURI);
if(!document.querySelector('script[data-p1b-production]')){
  const script=document.createElement('script');
  script.src=new URL('p1b-pr7-production.js',base).href;
  script.defer=true;
  script.dataset.p1bProduction='true';
  document.head.appendChild(script);
}
})();
