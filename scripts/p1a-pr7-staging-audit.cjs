#!/usr/bin/env node
'use strict';

const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');

const ROOT=path.resolve(__dirname,'..');
const P0F_COMMIT='762f02de4227bb4719232db95b2657644ada4fcd';
const OLD_PR7_COMMIT='ce3bfac560c53516f4cea7ee2976a16c360fe11b';
const read=file=>fs.readFileSync(path.join(ROOT,file),'utf8');
const sha=file=>execFileSync('git',['hash-object',file],{cwd:ROOT,encoding:'utf8'}).trim();

const files={
  js:'assets/pr7-library-progress.js',
  css:'assets/pr7-library-progress.css',
  docs:'docs/P1A-PR7-STAGED-RECONSTRUCTION.md',
  smoke:'scripts/p1a-pr7-browser-smoke.cjs',
  workflow:'.github/workflows/p1a-pr7-staging.yml',
  baseline:'certification/p1a-pr7-staging-baseline.json'
};
const js=read(files.js),css=read(files.css),docs=read(files.docs);
const p1a=JSON.parse(read(files.baseline));
const p0f=JSON.parse(read('certification/p0f-production-baseline.json'));
const p0e=JSON.parse(read('certification/p0e-preservation-baseline.json'));
const pr5=read('assets/pr5-shell.js');
const index=read('index.html');

const checks=[];
const add=(name,detail,test)=>checks.push([name,detail,test]);

add('p1a-baseline-version','P1A baseline is current',()=>p1a.version==='P1A.1');
add('p0f-parent-pinned','P1A begins from the certified P0F main commit',()=>P0F_COMMIT==='762f02de4227bb4719232db95b2657644ada4fcd'&&p1a.parentProductionCommit===P0F_COMMIT);
add('old-pr7-reference-only','the obsolete PR7 branch is recorded as reference material only',()=>p1a.referenceOnlyLegacyPr7Commit===OLD_PR7_COMMIT&&(docs.includes(OLD_PR7_COMMIT)||docs.includes('codex/pr7-library-progress-reconstruction')));
add('production-activation-false','P1A baseline explicitly forbids production activation',()=>p1a.productionActivation===false&&p1a.contract.productionFilesMustRemainP0FIdentical===true);
add('stage-version','PR7 staging module identifies P1A.1',()=>js.includes("const VERSION='P1A.1'"));
add('stage-inert-by-default','PR7 exposes explicit activation and does not auto-activate',()=>js.includes('function activate()')&&js.includes('staged:true')&&!/\bactivate\(\);\s*(?:\n|$)/.test(js));
add('p0c-delegation','Library, Collections, and Progress delegate through P0C',()=>js.includes("prime('library'")&&js.includes("prime('collections'")&&js.includes("prime('progress'")&&js.includes('window.TBC_P0C?.launch'));
add('pr6-delegation','Focused Practice / Adaptive Review / Learning Path delegate through PR6',()=>js.includes('window.TBC_PR6?.open')&&js.includes('data-pr7-pr6="focused"')&&js.includes('data-pr7-pr6="review"')&&js.includes('data-pr7-pr6="path"'));
add('all-66-books-staged','the staged Library carries all 66 canonical book names',()=>{
  const books=['Genesis','Exodus','Leviticus','Numbers','Deuteronomy','Joshua','Judges','Ruth','1 Samuel','2 Samuel','1 Kings','2 Kings','1 Chronicles','2 Chronicles','Ezra','Nehemiah','Esther','Job','Psalms','Proverbs','Ecclesiastes','Song of Songs','Isaiah','Jeremiah','Lamentations','Ezekiel','Daniel','Hosea','Joel','Amos','Obadiah','Jonah','Micah','Nahum','Habakkuk','Zephaniah','Haggai','Zechariah','Malachi','Matthew','Mark','Luke','John','Acts','Romans','1 Corinthians','2 Corinthians','Galatians','Ephesians','Philippians','Colossians','1 Thessalonians','2 Thessalonians','1 Timothy','2 Timothy','Titus','Philemon','Hebrews','James','1 Peter','2 Peter','1 John','2 John','3 John','Jude','Revelation'];
  return books.length===66&&books.every(book=>js.includes(`'${book}'`));
});
add('retained-collection-engine','P1A scans the current retained v24 collection cards',()=>js.includes('.v24-collection-card')&&js.includes('window.TBC_P0C?.launch?.(feature)'));
add('canonical-state-keys','P1A recognizes the canonical state keys only',()=>js.includes('theBibleChallenge_v21')&&js.includes('theBibleChallenge_v21_recovery')&&!js.includes('tbc_v4_'));
add('no-storage-writes','PR7 does not write localStorage/sessionStorage directly',()=>!/localStorage\.setItem|sessionStorage\.setItem|localStorage\.removeItem|sessionStorage\.removeItem/.test(js));
add('no-question-model','PR7 does not define or rewrite quiz/question banks',()=>!/QUESTION_BANK\s*=|correctAnswer\s*=|mastery\s*=|score\s*=/.test(js));
add('legacy-theme-tokens','PR7 CSS inherits restored PR5/v4.1.0 palette',()=>['--pr5-text','--pr5-surface','--pr5-line','--indigo','--cyan','--gold','--violet'].every(token=>css.includes(token)));
add('dark-theme','PR7 explicitly supports dark-theme inheritance',()=>css.includes('body.dark .pr7-root'));
add('contrast-theme','PR7 explicitly supports high-contrast mode',()=>css.includes('body.contrast:not(.dark)'));
add('mobile-containment','PR7 has phone-width containment rules',()=>css.includes('@media(max-width:640px)')&&css.includes('@media(max-width:390px)'));
add('reduced-motion','PR7 respects reduced motion',()=>css.includes('@media(prefers-reduced-motion:reduce)'));
add('frozen-index-still-frozen','index.html is still the exact P0E/P0F product blob',()=>sha('index.html')===p0e.frozenProductFiles['index.html']);
add('frozen-pr5-still-frozen','PR5 shell remains byte-identical to P0E/P0F',()=>sha('assets/pr5-shell.js')===p0e.frozenProductFiles['assets/pr5-shell.js']);
add('frozen-pr6-still-frozen','PR6 logic remains byte-identical to P0E/P0F',()=>sha('assets/pr6-play-learning.js')===p0e.frozenProductFiles['assets/pr6-play-learning.js']);
add('frozen-p0c-still-frozen','P0C bridge remains byte-identical to P0E/P0F',()=>sha('assets/p0c-existing-feature-preservation.js')===p0e.frozenProductFiles['assets/p0c-existing-feature-preservation.js']);
add('not-production-loaded','P1A staged PR7 is not referenced by the live index or frozen PR5 loader',()=>!index.includes('pr7-library-progress')&&!pr5.includes('pr7-library-progress'));
add('p0f-url-unchanged','the production URL remains the certified GitHub Pages URL',()=>p0f.productionUrl==='https://thiepn.github.io/tbc/');
add('historical-freezes-untouched','P0E/P0F manifests remain their existing versions',()=>p0e.version==='P0E.1'&&p0f.version==='P0F.0');
add('staging-doc','P1A activation boundary is documented',()=>docs.includes('P1B is the controlled activation phase')&&docs.includes('P1A does not silently weaken or rewrite the P0E/P0F freeze'));
for(const [key,file] of Object.entries(files))add(`asset-${key}`,`P1A asset exists: ${file}`,()=>fs.existsSync(path.join(ROOT,file)));

let failed=0;
console.log('TBC P1A — PR7 Safe Rebase & Staged Reconstruction Audit\n');
for(const [name,detail,test] of checks){
  let ok=false,error=null;
  try{ok=Boolean(test())}catch(err){error=err}
  if(!ok)failed++;
  console.log(`${ok?'PASS':'FAIL'}  ${name}`);
  console.log(`      ${detail}${error?` (${error.message})`:''}`);
}
console.log(`\n${checks.length-failed}/${checks.length} P1A staging checks passed.`);
if(failed){
  console.error(`P1A STAGING FAILED: ${failed} invariant(s) need repair.`);
  process.exitCode=1;
}else{
  console.log('P1A STATIC PASSED: PR7 is staged against the current P0F product without production activation.');
}
