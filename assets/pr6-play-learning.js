/* The Bible Challenge — PR6 Play & Learning Flow Reconstruction
 * Native shell-owned flow surfaces with narrow, explicit handoffs into the
 * proven v4.1.0 session engine. PR6 never rewrites quiz/question state.
 */
(()=>{'use strict';

const VERSION='PR6.0';
if(window.TBC_PR6?.version)return;

const FLOW_META={
  play:{domain:'play',title:'Play',eyebrow:'Practice'},
  quick:{domain:'play',title:'Quick Play',eyebrow:'Play'},
  focused:{domain:'play',title:'Focused Practice',eyebrow:'Play'},
  learn:{domain:'learn',title:'Learn',eyebrow:'Learning'},
  journey:{domain:'learn',title:'Bible Journey',eyebrow:'Learn'},
  path:{domain:'learn',title:'Learning Path',eyebrow:'Learn'},
  review:{domain:'learn',title:'Adaptive Review',eyebrow:'Learn'}
};
const LEGACY={
  nav:{
    home:['Home','Overview','Dashboard'],
    play:['Play','Quick Play','Practice'],
    learn:['Learn','Bible Journey','Journey','Learning Path'],
    library:['Library','Books','Book Library']
  },
  quick:['Quick Play','Start Quick Play','Quick Round','Start Round'],
  focused:['Focused Practice','Practice a Book','Book Practice','Custom Practice','Practice'],
  journey:['Bible Journey','Continue Journey','Journey'],
  path:['Learning Path','Continue Learning','Continue Path','Learn'],
  review:['Adaptive Review','Review Due','Due Review','Mistake Review','Review','Weak Areas']
};
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
const state={flow:null,root:null,primed:null,renderToken:0,returnFocus:null,statusTimer:null};

const norm=v=>String(v||'').replace(/\s+/g,' ').trim().toLowerCase();
const clean=v=>String(v||'').replace(/\s+/g,' ').trim();
const own=el=>Boolean(el?.closest?.('[data-pr6-ui],[data-pr5-ui]'));
const clickables=(root=document)=>Array.from(root.querySelectorAll('button,a[href],[role="button"],input[type="button"],input[type="submit"]')).filter(el=>!own(el));

function label(el){
  return clean(el?.getAttribute?.('aria-label')||el?.getAttribute?.('title')||el?.value||el?.textContent||'');
}
function score(el,terms){
  const text=norm(label(el)); if(!text)return-1;
  let best=-1;
  for(let i=0;i<terms.length;i++){
    const t=norm(terms[i]); if(!t)continue;
    if(text===t)best=Math.max(best,120-i);
    else if(text.startsWith(t))best=Math.max(best,92-i);
    else if(text.includes(t))best=Math.max(best,64-i);
  }
  if(el.closest('.nav,.mode-card,.action-card,.panel,.card,.v27-learn-workspace'))best+=5;
  return best;
}
function findLegacy(terms,root=document){
  return clickables(root).map(el=>({el,s:score(el,terms)})).filter(x=>x.s>=0).sort((a,b)=>b.s-a.s)[0]?.el||null;
}
function nativeNav(){
  return document.querySelector('.pr5-native-nav')||Array.from(document.querySelectorAll('.nav')).find(el=>!own(el))||null;
}
function routeTarget(domain){
  const nav=nativeNav();
  return (nav&&findLegacy(LEGACY.nav[domain]||[domain],nav))||findLegacy(LEGACY.nav[domain]||[domain]);
}
function content(){return document.querySelector('.content')}
function topTitle(){return document.querySelector('.topbar h1')}

function sectionForText(terms){
  const root=content(); if(!root)return null;
  const nodes=Array.from(root.querySelectorAll('h1,h2,h3,h4,h5,strong,.mode-card,.action-card,.card,.panel,[class*="journey"],[class*="learn"],[class*="review"]')).filter(el=>!own(el));
  const hit=nodes.map(el=>({el,s:scoreText(clean(el.textContent),terms)})).filter(x=>x.s>=0).sort((a,b)=>b.s-a.s)[0]?.el;
  return hit?.closest('section,article,.panel,.card,.mode-card,.action-card,[class*="workspace"],[class*="scheduler"],[class*="hero"]')||hit||null;
}
function scoreText(text,terms){
  const n=norm(text); if(!n)return-1;
  let best=-1;
  terms.forEach((term,i)=>{const t=norm(term);if(n===t)best=Math.max(best,120-i);else if(n.startsWith(t))best=Math.max(best,90-i);else if(n.includes(t))best=Math.max(best,55-i)});
  return best;
}
function actionInSection(section,terms){
  if(!section)return null;
  return findLegacy(terms,section);
}
function flowTarget(flow){
  const root=content();
  if(!root)return null;
  const terms=LEGACY[flow]||[flow];
  const section=sectionForText(terms);
  const local=actionInSection(section,flow==='quick'?['Start','Play','Begin','Quick Play']:flow==='review'?['Review','Start','Practice','Continue']:['Continue','Start','Open','Play','Practice',...terms]);
  return local||findLegacy(terms,root);
}

function waitFrame(){
  return new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
}
async function prime(domain){
  if(state.primed===domain)return true;
  const target=routeTarget(domain);
  if(!target)return false;
  target.click();
  await waitFrame();
  await new Promise(resolve=>setTimeout(resolve,32));
  state.primed=domain;
  return true;
}

function mount(){
  if(state.root?.isConnected)return state.root;
  const main=document.querySelector('.main'),bar=document.querySelector('.topbar');
  if(!main)return null;
  const root=document.createElement('div');
  root.className='pr6-root';
  root.dataset.pr6Ui='true';
  root.hidden=true;
  root.setAttribute('aria-live','polite');
  if(bar?.parentNode===main)bar.insertAdjacentElement('afterend',root);else main.prepend(root);
  state.root=root;
  return root;
}
function setStatus(message,tone=''){
  const el=state.root?.querySelector('[data-pr6-status]');
  if(!el)return;
  el.textContent=message||'';
  el.dataset.tone=tone;
}
function deactivate(){
  document.body.classList.remove('pr6-native-active');
  delete document.body.dataset.pr6Flow;
  if(state.root)state.root.hidden=true;
  state.flow=null;
  /* Any external legacy handoff may replace the native content under PR6.
     Never reuse a domain-prime cache after reconstruction is deactivated. */
  state.primed=null;
}
function focusHeading(){
  requestAnimationFrame(()=>{
    const h=state.root?.querySelector('h2[tabindex="-1"]');
    h?.focus({preventScroll:true});
  });
}
function escapeHtml(v){
  return String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}
function rail(activeDomain){
  const playActive=activeDomain==='play',learnActive=activeDomain==='learn';
  return `<div class="pr6-domain-rail" role="navigation" aria-label="Play and learning">
    <button type="button" class="${playActive?'active':''}" data-pr6-open="play"${playActive?' aria-current="page"':''}>Play</button>
    <button type="button" class="${learnActive?'active':''}" data-pr6-open="learn"${learnActive?' aria-current="page"':''}>Learn</button>
  </div>`;
}
function subnav(flow){
  const domain=FLOW_META[flow].domain;
  const items=domain==='play'?[['quick','Quick Play'],['focused','Focused Practice']]:[['journey','Bible Journey'],['path','Learning Path'],['review','Adaptive Review']];
  return `<nav class="pr6-subnav" aria-label="${domain==='play'?'Play modes':'Learning modes'}">${items.map(([id,name])=>`<button type="button" data-pr6-open="${id}" class="${flow===id?'active':''}"${flow===id?' aria-current="page"':''}>${name}</button>`).join('')}</nav>`;
}
function shell(flow,body,status=''){
  const meta=FLOW_META[flow],domain=meta.domain;
  return `${rail(domain)}${subnav(flow)}<div class="pr6-shell-head"><span>${meta.eyebrow}</span><h2 tabindex="-1">${meta.title}</h2></div><div data-pr6-view>${body}</div><div class="pr6-status" role="status" aria-live="polite" data-pr6-status>${escapeHtml(status)}</div>`;
}

function renderPlay(){
  return `<section class="pr6-page-head"><div><span>Practice with purpose</span><h3>Choose the kind of session you need.</h3><p>Start immediately or narrow practice to a book. Your existing Bible Challenge question engine, settings, scores, and progress remain in control.</p></div><div class="pr6-head-mark" aria-hidden="true"><b>66</b><span>books</span></div></section>
  <section class="pr6-intro-grid" aria-label="Play choices">
    <button type="button" class="pr6-flow-card primary" data-pr6-action="quick-start"><span class="pr6-card-index">01</span><strong>Quick Play</strong><span>Start a mixed session using your current settings.</span><b>Start now <i aria-hidden="true">→</i></b></button>
    <button type="button" class="pr6-flow-card" data-pr6-open="focused"><span class="pr6-card-index">02</span><strong>Focused Practice</strong><span>Choose any biblical book and practice it directly.</span><b>Choose a book <i aria-hidden="true">→</i></b></button>
  </section>
  <section class="pr6-explain"><span class="pr6-section-label">What stays the same</span><div class="pr6-feature-row"><article><b>01</b><strong>Same question engine</strong><p>PR6 hands sessions back to the existing game instead of creating a second scoring system.</p></article><article><b>02</b><strong>Same settings</strong><p>Question count, difficulty, collections, accessibility, and other player settings continue to come from the proven application.</p></article><article><b>03</b><strong>Same progress</strong><p>Your saved statistics and mastery data remain untouched by this reconstructed navigation layer.</p></article></div></section>`;
}
function renderQuick(){
  const target=flowTarget('quick');
  return `<section class="pr6-focus-top"><div><span class="pr6-section-label">Quick session</span><h3>Mixed practice, ready to go.</h3><p>${target?'The existing Quick Play launcher is ready.':'Quick Play is still part of the application, but its launcher could not be matched on this screen.'}</p></div><button type="button" class="pr6-button primary" data-pr6-action="quick-start" ${target?'':'disabled'}>${target?'Start Quick Play':'Launcher unavailable'}</button></section>
  <section class="pr6-steps" aria-label="Quick Play steps"><article><span>1</span><div><strong>Use your current setup</strong><p>Difficulty, question count, active collection, and accessibility settings stay exactly where the game already stores them.</p></div></article><article><span>2</span><div><strong>Play in the native engine</strong><p>The reconstructed shell disappears when the quiz starts, keeping established gameplay behavior intact.</p></div></article><article><span>3</span><div><strong>Keep your progress</strong><p>Results continue through the existing scoring and progression system.</p></div></article></section>`;
}
function renderFocused(){
  const grouped=BOOK_GROUPS.map(([group,books])=>`<section class="pr6-book-group" data-pr6-book-group="${escapeHtml(group)}"><h4>${escapeHtml(group)}</h4><div class="pr6-book-grid">${books.map(book=>`<button type="button" data-pr6-book="${escapeHtml(book)}">${escapeHtml(book)}</button>`).join('')}</div></section>`).join('');
  return `<section class="pr6-focus-top"><div><span class="pr6-section-label">Focused practice</span><h3>Practice any book directly.</h3><p>All 66 books are available here. Selecting one hands the session to the existing practice engine.</p></div></section>
  <section class="pr6-book-tools"><div class="pr6-book-search"><label for="pr6-book-search">Find a book</label><input id="pr6-book-search" type="search" placeholder="Search Genesis, John, Romans…" autocomplete="off" data-pr6-book-search></div><div class="pr6-testament-filter" role="group" aria-label="Filter books"><button type="button" class="active" data-pr6-testament="all">All 66</button><button type="button" data-pr6-testament="ot">Old Testament</button><button type="button" data-pr6-testament="nt">New Testament</button></div></section>
  <div class="pr6-book-groups">${grouped}</div>`;
}

function learningItems(){
  const root=content();if(!root)return[];
  const groups=[];
  const candidates=Array.from(root.querySelectorAll('button,a[href],[role="button"]')).filter(el=>!own(el));
  candidates.forEach(el=>{
    const text=clean(label(el));if(!text)return;
    if(/journey|learning path|review|continue|chapter|stage|lesson|weak|due/i.test(text))groups.push({el,text});
  });
  return groups.slice(0,60);
}
function renderLearnHub(){
  return `<section class="pr6-page-head"><div><span>Build knowledge over time</span><h3>Learn, review, and retain.</h3><p>Use the guided journey, continue your learning path, or review material that needs another pass.</p></div><div class="pr6-head-mark" aria-hidden="true"><b>3</b><span>paths</span></div></section>
  <section class="pr6-intro-grid three" aria-label="Learning choices">
    <button type="button" class="pr6-flow-card primary" data-pr6-open="journey"><span class="pr6-card-index">01</span><strong>Bible Journey</strong><span>Move through the Bible in an ordered, guided sequence.</span><b>Open journey <i aria-hidden="true">→</i></b></button>
    <button type="button" class="pr6-flow-card" data-pr6-open="path"><span class="pr6-card-index">02</span><strong>Learning Path</strong><span>Continue the structured progression already in the game.</span><b>Continue path <i aria-hidden="true">→</i></b></button>
    <button type="button" class="pr6-flow-card" data-pr6-open="review"><span class="pr6-card-index">03</span><strong>Adaptive Review</strong><span>Return to due, weak, or previously missed material.</span><b>Review now <i aria-hidden="true">→</i></b></button>
  </section>`;
}
function renderJourney(){
  const items=learningItems();
  const sample=items.filter(x=>/journey|chapter|stage/i.test(x.text)).slice(0,8);
  return `<section class="pr6-focus-top"><div><span class="pr6-section-label">Bible Journey</span><h3>Follow the guided route.</h3><p>${sample.length?'Your existing journey steps are available below.':'The guided journey remains in the application; open the native journey to continue from your saved stage.'}</p></div><button class="pr6-button primary" type="button" data-pr6-action="journey-start">Continue journey</button></section>${sample.length?`<section class="pr6-learning-list">${sample.map((x,i)=>`<button type="button" data-pr6-learning-index="${items.indexOf(x)}"><span>${String(i+1).padStart(2,'0')}</span><strong>${escapeHtml(x.text)}</strong><b aria-hidden="true">→</b></button>`).join('')}</section>`:''}`;
}
function renderPath(){
  const items=learningItems();
  const sample=items.filter(x=>/learning|continue|lesson|stage|chapter/i.test(x.text)).slice(0,10);
  return `<section class="pr6-focus-top"><div><span class="pr6-section-label">Learning Path</span><h3>Continue the next useful step.</h3><p>The reconstructed view surfaces your existing route; completion and mastery remain owned by the original learning system.</p></div><button class="pr6-button primary" type="button" data-pr6-action="path-start">Open learning path</button></section>${sample.length?`<section class="pr6-learning-list">${sample.map((x,i)=>`<button type="button" data-pr6-learning-index="${items.indexOf(x)}"><span>${String(i+1).padStart(2,'0')}</span><strong>${escapeHtml(x.text)}</strong><b aria-hidden="true">→</b></button>`).join('')}</section>`:''}`;
}
function renderReview(){
  const items=learningItems();
  const sample=items.filter(x=>/review|weak|due|miss/i.test(x.text)).slice(0,8);
  return `<section class="pr6-focus-top"><div><span class="pr6-section-label">Adaptive Review</span><h3>Strengthen what needs another pass.</h3><p>${sample.length?'Your existing review targets are available below.':'The existing review engine remains available and will decide what should be revisited.'}</p></div><button class="pr6-button primary" type="button" data-pr6-action="review-start">Start review</button></section>${sample.length?`<section class="pr6-learning-list">${sample.map((x,i)=>`<button type="button" data-pr6-learning-index="${items.indexOf(x)}"><span>${String(i+1).padStart(2,'0')}</span><strong>${escapeHtml(x.text)}</strong><b aria-hidden="true">→</b></button>`).join('')}</section>`:''}`;
}

function filterBooks(query,testament){
  const root=state.root;if(!root)return;
  const q=norm(query),ntStart=BOOKS.indexOf('Matthew');
  root.querySelectorAll('[data-pr6-book]').forEach(b=>{
    const name=b.dataset.pr6Book,idx=BOOKS.indexOf(name);
    const testamentMatch=testament==='all'||(testament==='ot'&&idx>=0&&idx<ntStart)||(testament==='nt'&&idx>=ntStart);
    b.hidden=!(testamentMatch&&(!q||norm(name).includes(q)));
  });
  root.querySelectorAll('.pr6-book-group').forEach(group=>{
    const visible=Array.from(group.querySelectorAll('[data-pr6-book]')).some(b=>!b.hidden);
    group.hidden=!visible;
  });
}

async function render(flow){
  const root=mount(); if(!root)return;
  const token=++state.renderToken;
  state.flow=flow;
  root.hidden=false;
  document.body.classList.add('pr6-native-active');
  document.body.dataset.pr6Flow=flow;
  const domain=FLOW_META[flow]?.domain||'play';
  root.innerHTML=shell(flow,'<div class="pr6-loading" aria-label="Loading flow"><span></span><span></span><span></span></div>','Preparing your next step…');
  topTitle()?.replaceChildren(document.createTextNode(FLOW_META[flow]?.title||'Play'));
  await prime(domain);
  if(token!==state.renderToken||state.flow!==flow)return;
  let html;
  if(flow==='play')html=renderPlay();
  else if(flow==='quick')html=renderQuick();
  else if(flow==='focused')html=renderFocused();
  else if(flow==='learn')html=renderLearnHub();
  else if(flow==='journey')html=renderJourney();
  else if(flow==='path')html=renderPath();
  else if(flow==='review')html=renderReview();
  else html=renderPlay();
  root.innerHTML=html;
  topTitle()?.replaceChildren(document.createTextNode(FLOW_META[flow]?.title||'Play'));
  bindDynamic();
  focusHeading();
}
async function open(flow){
  if(!FLOW_META[flow])flow='play';
  state.returnFocus=document.activeElement;
  return render(flow);
}

async function handoff(flow){
  const domain=FLOW_META[flow]?.domain||'play';
  setStatus('Starting your session…');
  await prime(domain);
  const target=flowTarget(flow);
  if(!target){
    setStatus(`Could not start ${FLOW_META[flow]?.title||flow} from this screen. Try opening the mode again.`,'error');
    return false;
  }
  deactivate();
  target.click();
  state.primed=null;
  return true;
}
async function handoffBook(name){
  setStatus(`Opening ${name} practice…`);
  await prime('play');
  const target=bookTarget(name);
  if(!target){
    setStatus(`Could not open ${name} practice. Try the full practice setup instead.`,'error');
    return false;
  }
  deactivate();
  target.click();
  state.primed=null;
  return true;
}
async function handoffLearning(index){
  await prime('learn');
  const items=learningItems(),item=items[index];
  if(!item?.el){
    setStatus('That learning step is no longer available. Refreshing the path…','error');
    render('path');
    return false;
  }
  deactivate();
  item.el.click();
  state.primed=null;
  return true;
}

function bindDynamic(){
  const root=state.root;if(!root)return;
  root.querySelectorAll('[data-pr6-open]').forEach(b=>b.addEventListener('click',()=>open(b.dataset.pr6Open)));
  root.querySelectorAll('[data-pr6-action]').forEach(b=>b.addEventListener('click',()=>{
    const a=b.dataset.pr6Action;
    if(a==='quick-start')handoff('quick');
    else if(a==='focused-open')handoff('focused');
    else if(a==='journey-start')handoff('journey');
    else if(a==='path-start')handoff('path');
    else if(a==='review-start')handoff('review');
  }));
  root.querySelectorAll('[data-pr6-book]').forEach(b=>b.addEventListener('click',()=>handoffBook(b.dataset.pr6Book)));
  root.querySelectorAll('[data-pr6-learning-index]').forEach(b=>b.addEventListener('click',()=>handoffLearning(Number(b.dataset.pr6LearningIndex))));
  const search=root.querySelector('[data-pr6-book-search]');
  if(search)search.addEventListener('input',()=>filterBooks(search.value,root.querySelector('[data-pr6-testament].active')?.dataset.pr6Testament||'all'));
  root.querySelectorAll('[data-pr6-testament]').forEach(b=>b.addEventListener('click',()=>{
    root.querySelectorAll('[data-pr6-testament]').forEach(x=>x.classList.toggle('active',x===b));
    filterBooks(search?.value||'',b.dataset.pr6Testament);
  }));
}

function intercept(event){
  const target=event.target?.closest?.('button,a,[role="button"]');
  if(!target)return;
  const nav=target.closest('[data-pr5-nav]');
  if(nav&&(nav.dataset.pr5Nav==='play'||nav.dataset.pr5Nav==='learn')){
    event.preventDefault();event.stopImmediatePropagation();
    open(nav.dataset.pr5Nav);
    return;
  }
  if(nav&&(nav.dataset.pr5Nav==='home'||nav.dataset.pr5Nav==='library')){
    deactivate();state.primed=null;return;
  }
  if(target.closest('.pr5-utility-link,.brand')){
    deactivate();state.primed=null;return;
  }
  if(!target.closest('.pr5-home'))return;
  const t=norm(label(target));
  let flow=null;
  if(t.includes('quick play'))flow='quick';
  else if(t.includes('bible journey'))flow='journey';
  else if(t.includes('adaptive review'))flow='review';
  else if(t==='play')flow='play';
  else if(t==='continue')flow='path';
  if(flow){
    event.preventDefault();event.stopImmediatePropagation();open(flow);
  }
}
function onKey(event){
  if(event.key==='Escape'&&state.flow){
    const domain=FLOW_META[state.flow].domain;
    render(domain);
  }
}
function audit(){
  const checks={
    version:VERSION,
    shell:Boolean(document.querySelector('.main')&&document.querySelector('.topbar')&&document.querySelector('.content')),
    pr5Navigation:Boolean(document.querySelector('[data-pr5-nav="play"]')&&document.querySelector('[data-pr5-nav="learn"]')),
    legacyPlayRoute:Boolean(routeTarget('play')),
    legacyLearnRoute:Boolean(routeTarget('learn')),
    nativeRoot:Boolean(mount()),
    activeFlow:state.flow,
    quickTarget:Boolean(flowTarget('quick')),
    focusedTarget:Boolean(flowTarget('focused')),
    journeyTarget:Boolean(flowTarget('journey')),
    pathTarget:Boolean(flowTarget('path')),
    reviewTarget:Boolean(flowTarget('review'))
  };
  checks.pass=checks.shell&&checks.pr5Navigation&&checks.legacyPlayRoute&&checks.legacyLearnRoute;
  return checks;
}
function start(){
  mount();
  document.documentElement.setAttribute('data-pr6-reconstruction',VERSION);
  document.addEventListener('click',intercept,true);
  document.addEventListener('keydown',onKey);
  const observer=new MutationObserver(()=>{
    if(!state.root?.isConnected)mount();
  });
  observer.observe(document.body,{childList:true,subtree:true});
  window.TBC_PR6={version:VERSION,open,handoff,audit,deactivate};
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
