#!/usr/bin/env node
'use strict';

const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');

const ROOT=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(ROOT,file));
const text=file=>read(file).toString('utf8');
const manifest=JSON.parse(text('certification/p0e-preservation-baseline.json'));

const phaseGates=[
  ['P0A','scripts/p0a-preservation-audit.cjs'],
  ['P0B','scripts/p0b-player-controls-audit.cjs'],
  ['P0C','scripts/p0c-existing-feature-preservation-audit.cjs'],
  ['P0D','scripts/p0d-visual-preservation-audit.cjs']
];

console.log('TBC P0E — Final Preservation & Regression Certification\n');
let failures=0;
for(const [name,script] of phaseGates){
  console.log(`\n=== ${name} ===`);
  try{execFileSync(process.execPath,[path.join(ROOT,script)],{cwd:ROOT,stdio:'inherit'});}
  catch(error){failures+=1;console.error(`${name} gate failed.`);}
}

const checks=[];
const check=(name,pass,detail='')=>checks.push({name,pass:Boolean(pass),detail});
const index=text('index.html');
const readme=text('README.md');
const runtime=text('scripts/p0a-runtime-probe.cjs');
const pr5=text('assets/pr5-shell.js');
const pr6=text('assets/pr6-play-learning.js');
const p0b=text('assets/p0b-player-controls.js');
const p0c=text('assets/p0c-existing-feature-preservation.js');
const foundation=text('assets/pr5-foundation.css');

check('baseline manifest version',manifest.version==='P0E.1');
check('legacy core baseline is pinned',manifest.legacyCoreBaselineCommit==='58b5ec8a5ecd2fd87a74f11eea7a94a9bc4195bb');
check('repaired visual baseline is pinned',manifest.repairedVisualBaselineCommit==='7114e43466d0fc2c5c00bd87651aaa94e42cdf3a');
check('repaired player-controls baseline is pinned',manifest.repairedPlayerControlsBaselineCommit==='079f307d0ca206c8e12c9ce8b803b1b9be9a1078');
check('5,799-question contract',manifest.contract.questions===5799&&/5,799\s+(?:canonical\s+)?questions/i.test(readme));
check('203 structured-question contract',manifest.contract.structuredQuestions===203&&/203\s+structured\s+questions/i.test(readme));
check('66-book contract',manifest.contract.books===66&&/66\s+books/i.test(readme));
check('five difficulty levels frozen',JSON.stringify(manifest.contract.difficultyLevels)===JSON.stringify(['Beginner','Easy','Standard','Advanced','Expert']));
check('question-quality surfaces retained',/reviewed\s+questions/i.test(index)&&/feedback/i.test(index)&&/evidence/i.test(index)&&/explain/i.test(index));
check('onboarding retained',/onboard(?:ing|ed)?|first[-_ ]?run|welcome/i.test(index));
check('session save/restore retained',runtime.includes("['exportProgress','loadState','save','saveQuizSession','restoreQuizSession']"));
check('canonical state keys frozen',manifest.contract.canonicalStateKeys.includes('theBibleChallenge_v21')&&manifest.contract.canonicalStateKeys.includes('theBibleChallenge_v21_recovery'));
check('P0B player-control layer loaded',pr5.includes('p0b-player-controls.js')&&p0b.includes("const VERSION='P0B.2'"));
check('P0B retains all five levels',manifest.contract.difficultyLevels.every(level=>p0b.includes(`'${level}'`)));
check('P0B delegates changes through legacy state API',p0b.includes("window.setSetting('difficulty',lower(tier))")&&p0b.includes('window.save()'));
check('P0B remains direct-storage-write-free',!/localStorage\.setItem|sessionStorage\.setItem/.test(p0b));
check('P0C canonical state contract matches freeze',p0c.includes("'theBibleChallenge_v21'")&&p0c.includes("'theBibleChallenge_v21_recovery'"));
check('PR5 remains state-nonmutating',/does not read, write, or mutate TBC game state/i.test(pr5)&&!/localStorage\.setItem|sessionStorage\.setItem/.test(pr5));
check('PR6 remains quiz-state-nonmutating',/never rewrites quiz\/question state/i.test(pr6)&&!/localStorage\.setItem|sessionStorage\.setItem/.test(pr6));
check('P0C remains state-nonmutating',!/localStorage\.setItem|sessionStorage\.setItem/.test(p0c));
check('visual repair remains active',foundation.includes('--p0d-visual-preservation:1'));
check('dark theme compatibility retained',foundation.includes('body.dark')&&/dark/i.test(index));
check('contrast theme compatibility retained',foundation.includes('body.contrast:not(.dark)')&&/contrast/i.test(index));

for(const feature of ['collections','library','progress','journey','path','review','duel','campaign','expedition','challenges','reader','achievements','profile','settings','memory','custom']){
  check(`feature bridge retained: ${feature}`,new RegExp(`\\b${feature}:\\{`).test(p0c));
}
for(const file of ['scripts/p0a-runtime-probe.cjs','scripts/p0b-player-controls.cjs','scripts/p0c-browser-smoke.cjs','scripts/p0d-browser-smoke.cjs','scripts/pr5-browser-smoke.cjs','scripts/pr6-browser-smoke.cjs','scripts/p0e-browser-certification.cjs']){
  check(`browser certification asset exists: ${file}`,fs.existsSync(path.join(ROOT,file)));
}

function gitBlobSha(buffer){const header=Buffer.from(`blob ${buffer.length}\0`,'utf8');return crypto.createHash('sha1').update(header).update(buffer).digest('hex')}
for(const [file,expected] of Object.entries(manifest.frozenProductFiles||{})){
  const full=path.join(ROOT,file);const actual=fs.existsSync(full)?gitBlobSha(read(file)):null;
  check(`frozen product file unchanged: ${file}`,actual===expected,actual?`expected ${expected}, got ${actual}`:'missing');
}

const failedChecks=checks.filter(x=>!x.pass);
console.log('\n=== P0E CONTRACT ===');
for(const item of checks)console.log(`${item.pass?'PASS':'FAIL'}  ${item.name}${item.detail&&!item.pass?` — ${item.detail}`:''}`);
failures+=failedChecks.length;
console.log(`\nP0E static certification: ${checks.length-failedChecks.length}/${checks.length} contract checks passed.`);
if(failures){console.error(`P0E STATIC FAILED: ${failures} gate/check failure(s).`);process.exit(1)}
console.log('P0E STATIC PASSED: P0A–P0D and the frozen whole-product preservation contract are intact.');
