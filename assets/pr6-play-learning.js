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
  return `<div class="pr6-subnav" role="navigation" aria-label="${domain==='play'?'Play':'Learning'} flows">${items.map(([id,name])=>`<button type="button" data-pr6-open="${id}" class="${flow===id?'active':''}"${flow===id?' aria-current="page"':''}>${name}</button>`).join('')}</div>`;
}
function shell(flow,body,description){
  const meta=FLOW_META[flow],domain=meta.domain;
  return `${rail(domain)}${subnav(flow==='play'?'quick':flow==='learn'?'journey':flow)}
    <header class="pr6-page-head">
      <div>
        <span class="pr6-eyebrow">${meta.eyebrow}</span>
        <h2 tabindex="-1">${meta.title}</h2>
        <p>${description}</p>
      </div>
    </header>
    <div data-pr6-view>${body}</div>
    <div class="pr6-status" data-pr6-status role="status"></div>`;
}
function card({title,copy,flow,action,labelText='Open',primary=false,meta=''}) {
  const attrs=flow?`data-pr6-open="${flow}"`:`data-pr6-action="${action}"`;
  return `<button type="button" class="pr6-flow-card${primary?' primary':''}" ${attrs}>
    ${meta?`<span class="pr6-card-meta">${escapeHtml(meta)}</span>`:''}
    <strong>${escapeHtml(title)}</strong><span>${escapeHtml(copy)}</span><b>${escapeHtml(labelText)} <i aria-hidden="true">→</i></b>
  </button>`;
}

function renderPlay(){
  return shell('play',`
    <section class="pr6-intro-grid" aria-label="Play choices">
      ${card({title:'Quick Play',copy:'Start immediately with the game’s default mixed practice. No setup required.',action:'quick-start',labelText:'Start now',primary:true})}
      ${card({title:'Focused Practice',copy:'Choose a specific book or practice route before starting the round.',flow:'focused',labelText:'Choose focus'})}
    </section>
    <section class="pr6-explain">
      <span class="pr6-section-label">Two ways to practice</span>
      <div class="pr6-explain-grid"><div><b>1</b><strong>Need reps?</strong><p>Use Quick Play when the goal is immediate recall practice.</p></div><div><b>2</b><strong>Know the weak area?</strong><p>Use Focused Practice when you want deliberate work on a narrower scope.</p></div></div>
    </section>`,'Start a round immediately or narrow the practice target first.');
}
function renderQuick(){
  return shell('quick',`
    <section class="pr6-feature">
      <div class="pr6-feature-copy"><span class="pr6-section-label">Zero setup</span><h3>One action. Straight into questions.</h3><p>Quick Play uses your current game settings and takes you straight into a mixed round.</p>
      <div class="pr6-actions"><button class="pr6-button primary" type="button" data-pr6-action="quick-start">Start Quick Play</button><button class="pr6-button" type="button" data-pr6-open="focused">Choose a focus instead</button></div></div>
      <div class="pr6-feature-steps" aria-label="Quick Play flow"><div><b>01</b><span>Start</span></div><div><b>02</b><span>Answer</span></div><div><b>03</b><span>Review result</span></div></div>
    </section>`,'Start a mixed practice round with the fewest possible decisions.');
}

function bookTarget(name){
  const root=content(); if(!root)return null;
  const wanted=norm(name);
  const candidates=clickables(root).filter(el=>{
    const t=norm(label(el));
    return t===wanted||t.startsWith(wanted+' ')||t.endsWith(' '+wanted)||t.includes(' '+wanted+' ');
  });
  if(candidates.length)return candidates[0];
  const cards=Array.from(root.querySelectorAll('.book-card,[data-book],[class*="book"]')).filter(el=>!own(el));
  const card=cards.find(el=>{const t=norm(el.getAttribute('data-book')||el.textContent);return t===wanted||t.startsWith(wanted+' ')});
  return card?.matches('button,a,[role="button"]')?card:card?.querySelector('button,a,[role="button"]')||null;
}
function detectedBooks(){
  return BOOKS.filter(name=>bookTarget(name));
}
function renderFocused(){
  const available=new Set(detectedBooks());
  const groups=BOOK_GROUPS.map(([group,books])=>{
    const usable=books.filter(name=>available.has(name));
    if(!usable.length)return'';
    return `<section class="pr6-book-group"><div class="pr6-book-group-head"><h3>${escapeHtml(group)}</h3><span>${usable.length} available</span></div><div class="pr6-book-grid">${usable.map(name=>`<button type="button" data-pr6-book="${escapeHtml(name)}">${escapeHtml(name)}</button>`).join('')}</div></section>`;
  }).join('');
  const practice=flowTarget('focused');
  return shell('focused',`
    <section class="pr6-focus-top">
      <div><span class="pr6-section-label">Targeted recall</span><h3>Practice what you intend to strengthen.</h3><p>Choose a book below to practice it directly, or open the full practice setup for more options.</p></div>
      ${practice?'<button class="pr6-button primary" type="button" data-pr6-action="focused-open">Open practice setup</button>':''}
    </section>
    <div class="pr6-book-tools"><label>Find a book <input type="search" data-pr6-book-search placeholder="Genesis, John, Romans…" autocomplete="off"></label><div role="group" aria-label="Testament filter"><button type="button" class="active" data-pr6-testament="all">All</button><button type="button" data-pr6-testament="ot">Old Testament</button><button type="button" data-pr6-testament="nt">New Testament</button></div></div>
    <div data-pr6-books>${groups||`<div class="pr6-empty"><strong>Book shortcuts are unavailable here.</strong><p>Open the full practice setup to choose your focus.</p><button class="pr6-button primary" type="button" data-pr6-action="focused-open">Open practice setup</button></div>`}</div>
  `,'Choose a book or open the full focused-practice setup.');
}
function renderLearnHub(){
  return shell('learn',`
    <section class="pr6-intro-grid three" aria-label="Learning choices">
      ${card({title:'Bible Journey',copy:'Move through Scripture in a guided whole-Bible sequence.',flow:'journey',labelText:'Continue journey',primary:true})}
      ${card({title:'Learning Path',copy:'Follow the game’s structured learning plan and current next step.',flow:'path',labelText:'Open path'})}
      ${card({title:'Adaptive Review',copy:'Return to material the game identifies as due or weak.',flow:'review',labelText:'Review'})}
    </section>`,'Choose a guided sequence, structured path, or targeted review.');
}
function renderJourney(){
  const target=flowTarget('journey');
  return shell('journey',`
    <section class="pr6-feature compact">
      <div class="pr6-feature-copy"><span class="pr6-section-label">Whole-Bible sequence</span><h3>Keep the big picture visible.</h3><p>Bible Journey guides you through all 66 books while keeping your existing progress and scoring.</p>
      <div class="pr6-actions"><button class="pr6-button primary"${target?'':' disabled'} type="button" data-pr6-action="journey-start">${target?'Continue Bible Journey':'Journey unavailable'}</button></div></div>
    </section>
    <section class="pr6-roadmap" aria-label="Bible Journey roadmap">${BOOK_GROUPS.map(([group,books],i)=>`<div><span>${String(i+1).padStart(2,'0')}</span><strong>${escapeHtml(group)}</strong><small>${books.length} books</small></div>`).join('')}</section>
  `,'Follow a guided sequence across the whole Bible.');
}
function learningItems(){
  const root=content(); if(!root)return[];
  const candidates=Array.from(root.querySelectorAll('.v27-plan-strip,.v27-learn-workspace button,[class*="learning"] button,[class*="path"] button')).filter(el=>!own(el));
  const seen=new Set(),out=[];
  for(const el of candidates){
    const t=clean(el.textContent); if(!t||t.length>220)continue;
    const key=norm(t); if(seen.has(key))continue; seen.add(key);
    const parts=t.split(/\n+/).map(clean).filter(Boolean);
    out.push({el,title:parts[0]||'Learning step',copy:parts.slice(1).join(' ')||'Continue this learning step.'});
    if(out.length>=6)break;
  }
  return out;
}
function renderPath(){
  const items=learningItems();
  const target=flowTarget('path');
  return shell('path',`
    <section class="pr6-focus-top"><div><span class="pr6-section-label">Structured progression</span><h3>One clear next learning step.</h3><p>Your current path steps and progress stay in sync as you continue learning.</p></div>${target?'<button class="pr6-button primary" type="button" data-pr6-action="path-start">Continue path</button>':''}</section>
    <section class="pr6-path-list">${items.length?items.map((item,i)=>`<button type="button" data-pr6-learning-index="${i}"><span>${String(i+1).padStart(2,'0')}</span><div><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.copy)}</small></div><b aria-hidden="true">→</b></button>`).join(''):`<div class="pr6-empty"><strong>No individual path steps are exposed here.</strong><p>Continue through your current Learning Path.</p>${target?'<button class="pr6-button primary" type="button" data-pr6-action="path-start">Continue Learning Path</button>':''}</div>`}</section>
  `,'Follow your structured plan and continue from your current step.');
}
function reviewSnapshot(){
  const root=content(); if(!root)return[];
  const selectors=['.v26-review-scheduler','.v26-retention-hero','.v25-mistake-list','.v26-mistake-insight','[class*="review"]','[class*="mistake"]'];
  const seen=new Set(),items=[];
  for(const el of root.querySelectorAll(selectors.join(','))){
    if(own(el))continue;
    const text=clean(el.textContent);
    if(text.length<8||text.length>420)continue;
    const key=norm(text); if(seen.has(key))continue;seen.add(key);
    const first=text.match(/\b\d+\b/)?.[0]||'';
    const title=/mistake/i.test(text)?'Mistakes':/due|schedule/i.test(text)?'Due review':/retention|weak|master/i.test(text)?'Retention':'Review signal';
    items.push({title,value:first||'Active',copy:text.slice(0,150)+(text.length>150?'…':'')});
    if(items.length>=3)break;
  }
  return items;
}
function renderReview(){
  const target=flowTarget('review'),snap=reviewSnapshot();
  return shell('review',`
    <section class="pr6-focus-top"><div><span class="pr6-section-label">Retention loop</span><h3>Review what deserves another retrieval.</h3><p>Adaptive Review uses your existing retention and mistake history to prioritize what to revisit.</p></div><button class="pr6-button primary"${target?'':' disabled'} type="button" data-pr6-action="review-start">${target?'Start Adaptive Review':'Review unavailable'}</button></section>
    ${snap.length?`<section class="pr6-signal-grid" aria-label="Current review signals">${snap.map(s=>`<article><span>${escapeHtml(s.title)}</span><strong>${escapeHtml(s.value)}</strong><p>${escapeHtml(s.copy)}</p></article>`).join('')}</section>`:''}
    <section class="pr6-review-loop"><div><b>1</b><strong>Retrieve</strong><span>Answer before seeing the explanation.</span></div><div><b>2</b><strong>Correct</strong><span>Use the result to identify the gap.</span></div><div><b>3</b><strong>Return</strong><span>Revisit the material when the game schedules it again.</span></div></section>
  `,'Use due reviews, mistakes, and weak areas to strengthen retention.');
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
