/* The Bible Challenge — P1A / PR7 Library, Collections & Progress Reconstruction
 * Staged post-P0F module. This file is deliberately NOT loaded by the production
 * shell during P1A. CI injects it against the certified product so PR7 can be
 * validated without changing any P0F-frozen asset or owning browser persistence.
 */
(()=>{'use strict';

const VERSION='P1A.1';
if(window.TBC_PR7?.version)return;

const BOOK_GROUPS=[
  ['Pentateuch',['Genesis','Exodus','Leviticus','Numbers','Deuteronomy']],
  ['History',['Joshua','Judges','Ruth','1 Samuel','2 Samuel','1 Kings','2 Kings','1 Chronicles','2 Chronicles','Ezra','Nehemiah','Esther']],
  ['Poetry & Wisdom',['Job','Psalms','Proverbs','Ecclesiastes','Song of Songs']],
  ['Major Prophets',['Isaiah','Jeremiah','Lamentations','Ezekiel','Daniel']],
  ['Minor Prophets',['Hosea','Joel','Amos','Obadiah','Jonah','Micah','Nahum','Habakkuk','Zephaniah','Haggai','Zechariah','Malachi']],
  ['Gospels & Acts',['Matthew','Mark','Luke','John','Acts']],
  ['Pauline Letters',['Romans','1 Corinthians','2 Corinthians','Galatians','Ephesians','Philippians','Colossians','1 Thessalonians','2 Thessalonians','1 Timothy','2 Timothy','Titus','Philemon']],
  ['General Letters & Revelation',['Hebrews','James','1 Peter','2 Peter','1 John','2 John','3 John','Jude','Revelation']]
];
const BOOKS=BOOK_GROUPS.flatMap(([,books])=>books);
const META={
  library:{eyebrow:'Library',title:'Bible Library',copy:'Browse all 66 books, then hand off to the existing practice engine without replacing its question or progress state.'},
  collections:{eyebrow:'Library',title:'Collections',copy:'Browse the retained curated collections while keeping their established Practice and Test behavior intact.'},
  progress:{eyebrow:'Progress',title:'Progress',copy:'Read the existing mastery and performance signals, then choose the next deliberate practice step.'},
  mastery:{eyebrow:'Progress',title:'Mastery',copy:'Inspect retained mastery signals without creating a second progress model.'}
};

const state={active:false,flow:null,root:null,token:0,routeLock:false,lastUnlock:null,primed:null,collections:[],signals:[],interceptBound:false};
const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
const norm=v=>clean(v).toLowerCase();
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const own=el=>Boolean(el?.closest?.('[data-pr7-ui],[data-pr6-ui],[data-pr5-ui],[data-p0c-ui]'));
const content=()=>document.querySelector('.content');
const title=()=>document.querySelector('.topbar h1');
const frame=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));

function mount(){
  if(state.root?.isConnected)return state.root;
  const main=document.querySelector('.main'),bar=document.querySelector('.topbar');
  if(!main)return null;
  const root=document.createElement('section');
  root.className='pr7-root';
  root.dataset.pr7Ui='true';
  root.hidden=true;
  root.setAttribute('aria-live','polite');
  root.setAttribute('aria-label','Library and progress reconstruction');
  if(bar?.parentNode===main)bar.insertAdjacentElement('afterend',root);else main.prepend(root);
  state.root=root;
  return root;
}
function showSurface(){
  const root=mount();
  if(!root||state.routeLock)return false;
  root.hidden=false;
  document.body.classList.add('pr7-native-active');
  document.documentElement.setAttribute('data-pr7-stage-active','true');
  return true;
}
function leaveSurface({lock=false}={}){
  if(lock)state.routeLock=true;
  state.token++;
  document.body.classList.remove('pr7-native-active');
  document.documentElement.removeAttribute('data-pr7-stage-active');
  delete document.body.dataset.pr7Flow;
  if(state.root)state.root.hidden=true;
  state.flow=null;
}
function unlockSurface(reason='explicit'){state.routeLock=false;state.lastUnlock=reason}
function deactivate(){
  state.active=false;
  state.routeLock=true;
  state.primed=null;
  leaveSurface();
  document.documentElement.removeAttribute('data-pr7-activated');
  return true;
}
function activate(){
  if(!window.TBC_P0C?.launch||!window.TBC_PR6?.open)return false;
  state.active=true;
  unlockSurface('activate');
  bindIntercept();
  mount();
  document.documentElement.setAttribute('data-pr7-activated',VERSION);
  return true;
}

/* Legacy/P0C owns canonical state. Entering a retained route may legitimately
 * save navigation/session metadata. P1A delegates that behavior unchanged and
 * enforces non-ownership structurally: this module contains no storage writes. */
async function prime(feature,{force=false}={}){
  if(!force&&state.primed===feature)return true;
  const launched=Boolean(window.TBC_P0C?.launch?.(feature));
  if(!launched)return false;
  await frame();
  await delay(feature==='collections'?110:90);
  state.primed=feature;
  return true;
}

function collectionModal(){return document.querySelector('#modalRoot .p0c-collections-modal')||document.querySelector('#modalRoot .modal-backdrop:last-child')}
function collectionName(card,index){
  const explicit=clean(card.getAttribute('data-collection-name')||card.getAttribute('data-title')||card.querySelector('h1,h2,h3,h4,strong,.title,[class*="title"]')?.textContent);
  if(explicit&&explicit.length<=90)return explicit;
  const text=clean(card.textContent).replace(/\b(?:Practice\s*\d*|Test)\b.*$/i,'').trim();
  return text&&text.length<=90?text:`Collection ${index+1}`;
}
function scanCollections(){
  const modal=collectionModal();
  if(!modal)return[];
  const cards=Array.from(modal.querySelectorAll('.v24-collection-card'));
  state.collections=cards.map((card,index)=>{
    const name=collectionName(card,index);
    const text=clean(card.textContent);
    const meta=(text.match(/\b\d{1,5}\s+(?:questions?|items?)\b/i)||[])[0]||'';
    return {name,meta,index};
  });
  return state.collections;
}
function closeCollectionsModal(){if(typeof window.closeModal==='function')window.closeModal()}
async function loadCollections(){
  if(!(await prime('collections',{force:true})))return[];
  const items=scanCollections();
  closeCollectionsModal();
  await frame();
  return items;
}

function scanProgressSignals(){
  const root=content();
  if(!root)return[];
  const selectors='[class*="stat"],[class*="metric"],[class*="progress"],[class*="master"],[class*="accuracy"],[class*="retention"],[class*="streak"],[class*="review"]';
  const nodes=Array.from(root.querySelectorAll(selectors)).filter(el=>!own(el));
  const seen=new Set(),out=[];
  for(const el of nodes){
    const text=clean(el.textContent);
    if(text.length<3||text.length>360||!/\d|%|master|progress|accuracy|correct|streak|retention|review|coverage|question/i.test(text))continue;
    const heading=clean(el.querySelector('h1,h2,h3,h4,h5,label,.label,[class*="label"],[class*="title"]')?.textContent);
    const value=clean(el.querySelector('[class*="value"],strong,b,.number,[class*="count"]')?.textContent)||((text.match(/\b\d{1,3}(?:\.\d+)?%\b|\b\d{1,6}(?:[.,]\d+)?\b/)||[])[0])||'Active';
    const name=(heading&&heading.length<=64?heading:/master/i.test(text)?'Mastery':/accuracy|correct/i.test(text)?'Accuracy':/streak/i.test(text)?'Streak':/retention|review/i.test(text)?'Retention':/coverage/i.test(text)?'Coverage':/question/i.test(text)?'Questions':'Progress');
    const key=norm(name+' '+value);
    if(seen.has(key))continue;
    seen.add(key);
    out.push({name,value,copy:text.slice(0,170)});
    if(out.length>=8)break;
  }
  state.signals=out;
  return out;
}

function rail(flow){
  const library=flow==='library',collections=flow==='collections',progress=flow==='progress'||flow==='mastery';
  return `<div class="pr7-context-rail" role="navigation" aria-label="Library and progress">
    <button type="button" data-pr7-open="library" class="${library?'active':''}"${library?' aria-current="page"':''}>Bible Library</button>
    <button type="button" data-pr7-open="collections" class="${collections?'active':''}"${collections?' aria-current="page"':''}>Collections</button>
    <button type="button" data-pr7-open="progress" class="${progress?'active':''}"${progress?' aria-current="page"':''}>Progress</button>
    <button type="button" data-pr7-pr6="focused">Focused Practice</button>
    <button type="button" data-pr7-pr6="review">Adaptive Review</button>
  </div>`;
}
function subnav(flow){
  if(flow!=='progress'&&flow!=='mastery')return'';
  return `<div class="pr7-subnav" role="navigation" aria-label="Progress views">
    <button type="button" data-pr7-open="progress" class="${flow==='progress'?'active':''}"${flow==='progress'?' aria-current="page"':''}>Overview</button>
    <button type="button" data-pr7-open="mastery" class="${flow==='mastery'?'active':''}"${flow==='mastery'?' aria-current="page"':''}>Mastery</button>
  </div>`;
}
function shell(flow,body){
  const meta=META[flow]||META.library;
  return `${rail(flow)}${subnav(flow)}<header class="pr7-page-head"><div><span class="pr7-eyebrow">${meta.eyebrow}</span><h2 tabindex="-1">${meta.title}</h2><p>${meta.copy}</p></div></header><div data-pr7-view>${body}</div><div class="pr7-status" data-pr7-status role="status"></div>`;
}
function loading(){return '<div class="pr7-loading" aria-label="Loading retained data"><span></span><span></span><span></span></div>'}
function empty(titleText,copy){return `<div class="pr7-empty"><strong>${esc(titleText)}</strong><p>${esc(copy)}</p></div>`}

function libraryBody(){
  const groups=BOOK_GROUPS.map(([group,books])=>`<section class="pr7-book-group"><div class="pr7-book-group-head"><h3>${esc(group)}</h3><span>${books.length} books</span></div><div class="pr7-book-grid">${books.map(name=>`<button type="button" data-pr7-book="${esc(name)}">${esc(name)}</button>`).join('')}</div></section>`).join('');
  return `<section class="pr7-lead"><div><span class="pr7-section-label">Whole Bible</span><h3>Choose a book without replacing the existing practice engine.</h3><p>The reconstruction owns navigation only. Questions, scoring, difficulty, mastery, sessions, and persistence remain owned by the established game.</p></div><button class="pr7-button primary" type="button" data-pr7-pr6="focused">Focused Practice</button></section><div class="pr7-tools"><label>Find a book <input type="search" data-pr7-search="books" placeholder="Genesis, John, Romans…" autocomplete="off"></label><span>66 available</span></div><div data-pr7-books>${groups}</div>`;
}
function collectionsBody(){
  const cards=state.collections.map((item,index)=>`<button type="button" data-pr7-collection="${index}"><span class="pr7-index">${String(index+1).padStart(2,'0')}</span><strong>${esc(item.name)}</strong>${item.meta?`<small>${esc(item.meta)}</small>`:''}<b>Open retained collection <i aria-hidden="true">→</i></b></button>`).join('');
  return `<section class="pr7-lead"><div><span class="pr7-section-label">Curated scopes</span><h3>Use the game’s existing collection catalog.</h3><p>P1A mirrors the retained collection list. Selecting one hands back to its established Practice/Test flow.</p></div><button class="pr7-button" type="button" data-pr7-pr6="focused">Practice a book instead</button></section><div class="pr7-tools"><label>Find a collection <input type="search" data-pr7-search="collections" placeholder="Search collections…" autocomplete="off"></label><span>${state.collections.length} collections</span></div>${cards?`<div class="pr7-collection-grid">${cards}</div>`:empty('Collections are unavailable from this surface.','The retained Collections engine remains available through the preserved Learn surface.')}`;
}
function progressBody(){
  const metrics=state.signals.slice(0,6).map(item=>`<article><span>${esc(item.name)}</span><strong>${esc(item.value)}</strong><p>${esc(item.copy)}</p></article>`).join('');
  return `<section class="pr7-lead"><div><span class="pr7-section-label">Retained signals</span><h3>Use progress to decide what to practice next.</h3><p>No new mastery score is calculated here. P1A only re-presents the existing Progress surface.</p></div><button class="pr7-button primary" type="button" data-pr7-pr6="review">Start Adaptive Review</button></section>${metrics?`<section class="pr7-metric-grid">${metrics}</section>`:empty('Detailed metrics are not exposed in this view yet.','Your existing progress data remains owned by the retained Progress surface.')}<section class="pr7-next-grid"><button type="button" data-pr7-pr6="review"><span>Weak or due material</span><strong>Adaptive Review</strong><b>Review →</b></button><button type="button" data-pr7-pr6="focused"><span>Known weak area</span><strong>Focused Practice</strong><b>Choose focus →</b></button><button type="button" data-pr7-pr6="path"><span>Structured progression</span><strong>Learning Path</strong><b>Continue →</b></button></section>`;
}
function masteryBody(){
  const rows=state.signals.map((item,index)=>`<article><span class="pr7-rank">${String(index+1).padStart(2,'0')}</span><div><strong>${esc(item.name)}</strong><small>${esc(item.copy)}</small></div><b>${esc(item.value)}</b></article>`).join('');
  return `<section class="pr7-lead"><div><span class="pr7-section-label">Mastery</span><h3>See where another retrieval may be useful.</h3><p>This view re-presents retained signals; it does not write a parallel mastery model.</p></div><button class="pr7-button" type="button" data-pr7-pr6="review">Adaptive Review</button></section><section class="pr7-mastery-list">${rows||empty('No mastery rows are exposed here.','Use Adaptive Review or Focused Practice to continue with the retained learning system.')}</section>`;
}

function bindRoot(){
  const root=state.root;if(!root)return;
  root.querySelectorAll('[data-pr7-open]').forEach(button=>button.addEventListener('click',()=>open(button.dataset.pr7Open)));
  root.querySelectorAll('[data-pr7-pr6]').forEach(button=>button.addEventListener('click',()=>openPr6(button.dataset.pr7Pr6)));
  root.querySelectorAll('[data-pr7-book]').forEach(button=>button.addEventListener('click',()=>openBook(button.dataset.pr7Book)));
  root.querySelectorAll('[data-pr7-collection]').forEach(button=>button.addEventListener('click',()=>openCollection(Number(button.dataset.pr7Collection))));
  root.querySelectorAll('[data-pr7-search]').forEach(input=>input.addEventListener('input',()=>{
    const query=norm(input.value),selector=input.dataset.pr7Search==='books'?'[data-pr7-book]':'[data-pr7-collection]';
    root.querySelectorAll(selector).forEach(button=>button.hidden=Boolean(query&&!norm(button.textContent).includes(query)));
  }));
}

async function render(flow){
  if(!state.active||state.routeLock)return false;
  if(!META[flow])flow='library';
  const root=mount();if(!root)return false;
  const token=++state.token;
  if(!showSurface())return false;
  state.flow=flow;document.body.dataset.pr7Flow=flow;window.TBC_PR6?.deactivate?.();
  root.innerHTML=shell(flow,loading());title()?.replaceChildren(document.createTextNode(META[flow].title));

  if(flow==='library')await prime('library',{force:true});
  else if(flow==='collections')await loadCollections();
  else if(await prime('progress',{force:true}))scanProgressSignals();

  if(token!==state.token||!state.active||state.routeLock||state.flow!==flow)return false;
  const body=flow==='library'?libraryBody():flow==='collections'?collectionsBody():flow==='mastery'?masteryBody():progressBody();
  root.innerHTML=shell(flow,body);bindRoot();requestAnimationFrame(()=>root.querySelector('h2')?.focus({preventScroll:true}));
  return true;
}
async function open(flow){return render(flow)}

async function openPr6(flow){
  if(!window.TBC_PR6?.open)return false;
  leaveSurface({lock:true});state.primed=null;
  await window.TBC_PR6.open(flow);
  return true;
}
async function openBook(name){
  if(!BOOKS.includes(name)||!window.TBC_PR6?.open)return false;
  leaveSurface({lock:true});state.primed=null;
  await window.TBC_PR6.open('focused');
  await frame();await delay(60);
  const selector=`.pr6-root:not([hidden]) [data-pr6-book="${CSS.escape(name)}"]`;
  const target=document.querySelector(selector);
  if(target){target.click();return true;}
  return Boolean(document.querySelector('.pr6-root:not([hidden])'));
}
async function openCollection(index){
  const item=state.collections[index];if(!item)return false;
  if(!(await prime('collections',{force:true})))return false;
  const modal=collectionModal(),cards=modal?Array.from(modal.querySelectorAll('.v24-collection-card')):[];
  const card=cards.find((node,i)=>i===item.index||norm(collectionName(node,i))===norm(item.name));
  if(!card){closeCollectionsModal();return false;}
  const actions=Array.from(card.querySelectorAll('button,a[href],[role="button"]'));
  const action=actions.find(el=>/practice/i.test(clean(el.textContent)))||actions.find(el=>/test|open|play/i.test(clean(el.textContent)))||actions[0];
  if(!action){closeCollectionsModal();return false;}
  leaveSurface({lock:true});action.click();await frame();state.primed=null;return true;
}

function trustedOpen(event,flow,reason){
  event.preventDefault();event.stopImmediatePropagation();
  if(!event.isTrusted)return false;
  unlockSurface(reason);open(flow);return true;
}
function intercept(event){
  if(!state.active)return;
  const target=event.target?.closest?.('button,a,[role="button"]');if(!target||target.closest('[data-pr7-ui]'))return;
  const nav=target.closest('[data-pr5-nav]');
  if(nav?.dataset.pr5Nav==='library'){trustedOpen(event,'library','trusted-pr5-library');return;}
  if(nav){leaveSurface({lock:true});state.primed=null;return;}
  const utility=target.closest('[data-pr5-utility]');
  if(utility?.dataset.pr5Utility==='progress'){trustedOpen(event,'progress','trusted-pr5-progress');return;}
  if(utility){leaveSurface({lock:true});state.primed=null;return;}
  const preserved=target.closest('[data-p0c-feature]');
  if(preserved?.dataset.p0cFeature==='library'){trustedOpen(event,'library','trusted-p0c-library');return;}
  if(preserved?.dataset.p0cFeature==='collections'){trustedOpen(event,'collections','trusted-p0c-collections');return;}
  if(preserved?.dataset.p0cFeature==='progress'){trustedOpen(event,'progress','trusted-p0c-progress');return;}
  if(preserved){leaveSurface({lock:true});state.primed=null;return;}
  if(target.closest('.brand')){leaveSurface({lock:true});state.primed=null;return;}
  if(target.closest('.pr5-home')&&/practice a book|book practice|library/.test(norm(target.textContent))){trustedOpen(event,'library','trusted-pr5-home-library');}
}
function bindIntercept(){
  if(state.interceptBound)return;state.interceptBound=true;
  document.addEventListener('click',intercept,true);
  document.addEventListener('keydown',event=>{if(!state.active||state.routeLock||event.key!=='Escape')return;if(state.flow==='collections')open('library');else if(state.flow==='mastery')open('progress')});
}

function audit(){
  const p0c=window.TBC_P0C?.audit?.(),pr6=window.TBC_PR6?.audit?.();
  return {
    version:VERSION,staged:true,productionActive:false,active:state.active,flow:state.flow,routeLocked:state.routeLock,lastUnlock:state.lastUnlock,
    p0cVersion:window.TBC_P0C?.version||null,pr6Version:window.TBC_PR6?.version||null,
    libraryAvailable:Boolean(p0c?.features?.library),collectionsAvailable:Boolean(p0c?.features?.collections),progressAvailable:Boolean(p0c?.features?.progress),
    bookCount:BOOKS.length,collectionCount:state.collections.length,signalCount:state.signals.length,
    canonicalStateKeys:['theBibleChallenge_v21','theBibleChallenge_v21_recovery'],
    stateOwnership:'legacy/P0C/PR6',directStorageWrites:false,
    pass:Boolean(window.TBC_P0C?.launch&&window.TBC_PR6?.open&&p0c?.features?.library&&p0c?.features?.collections&&p0c?.features?.progress&&pr6)
  };
}
function start(){mount();document.documentElement.setAttribute('data-pr7-stage',VERSION);window.TBC_PR7={version:VERSION,stage:'P1A',staged:true,activate,deactivate,open,audit,openBook,openCollection}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();