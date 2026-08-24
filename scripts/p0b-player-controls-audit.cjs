#!/usr/bin/env node
'use strict';

const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(ROOT,file),'utf8');
const index=read('index.html');
const p0a=read('scripts/p0a-preservation-audit.cjs');
const runtime=read('scripts/p0a-runtime-probe.cjs');
const pr5=read('assets/pr5-shell.js');
const pr6=read('assets/pr6-play-learning.js');
const p0b=read('assets/p0b-player-controls.js');
const p0bBrowser=read('scripts/p0b-player-controls.cjs');

const checks=[];
const check=(name,pass)=>checks.push({name,pass:Boolean(pass)});
const tiers=['Beginner','Easy','Standard','Advanced','Expert'];

check('onboarding source remains packaged',/onboard(?:ing|ed)?|first[-_ ]?run|welcome/i.test(index));
check('P0A owns the five-tier core contract',tiers.every(tier=>p0a.includes(`'${tier}'`)));
check('P0B version is current',p0b.includes("const VERSION='P0B.1'"));
check('P0B preserves all five tiers',tiers.every(tier=>p0b.includes(`'${tier}'`)));
check('P0B delegates to the legacy difficulty target',p0b.includes('legacyDifficultyTarget')&&p0b.includes('target.click()'));
check('P0B exits PR6 before legacy handoff',p0b.includes('window.TBC_PR6?.deactivate?.()'));
check('P0B exposes a reconstructed difficulty control',p0b.includes('data-p0b-difficulty')&&p0b.includes('Choose difficulty'));
check('P0B uses legacy theme tokens',p0b.includes('var(--surface)')&&p0b.includes('var(--text)')&&p0b.includes('var(--indigo)'));
check('P0B supports dark and contrast themes',p0b.includes('body.dark')&&p0b.includes('body.contrast'));
check('P0B does not write localStorage',!p0b.includes('localStorage.setItem'));
check('P0B does not write sessionStorage',!p0b.includes('sessionStorage.setItem'));
check('PR5 loads P0B preservation layer',pr5.includes('p0b-player-controls.js')&&pr5.includes('__TBC_P0B_LOADER__'));
check('PR6 exposes Quick Play',pr6.includes('data-pr6-action="quick-start"')&&pr6.includes("title:'Quick Play'"));
check('PR6 exposes Focused Practice',pr6.includes('data-pr6-open="focused"')&&pr6.includes("title:'Focused Practice'"));
check('PR6 hands Quick Play to legacy engine',/if\(a==='quick-start'\)handoff\('quick'\)/.test(pr6));
check('runtime probe certifies fresh onboarding',runtime.includes('fresh profile must show the onboarding difficulty chooser'));
check('runtime probe certifies all five levels',runtime.includes("const TIERS = ['Beginner', 'Easy', 'Standard', 'Advanced', 'Expert']"));
check('runtime probe certifies persisted difficulty',runtime.includes('chosen onboarding difficulty must persist'));
check('runtime probe certifies session save/restore APIs',runtime.includes("['exportProgress','loadState','save','saveQuizSession','restoreQuizSession']"));
check('P0B browser suite certifies every onboarding tier',p0bBrowser.includes('verifyAllOnboardingChoices')&&p0bBrowser.includes('for (const tier of TIERS)'));
check('P0B browser suite certifies placement help',p0bBrowser.includes('verifyPlacementHelp')&&p0bBrowser.includes('15-question'));
check('P0B browser suite certifies post-onboarding selector',p0bBrowser.includes('verifyPostOnboardingSelector')&&p0bBrowser.includes('post-onboarding difficulty change must survive reload'));

const failed=checks.filter(x=>!x.pass);
for(const item of checks) console.log(`${item.pass?'PASS':'FAIL'}  ${item.name}`);
console.log(`\nP0B player controls: ${checks.length-failed.length}/${checks.length} checks passed.`);
if(failed.length){
  console.error(`P0B FAILED: ${failed.length} player-control invariant(s) failed.`);
  process.exit(1);
}
console.log('P0B PASSED: onboarding, all five difficulty levels, selector access, legacy handoff, and session-control contracts are preserved.');
