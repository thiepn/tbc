#!/usr/bin/env node
'use strict';

const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(ROOT,file),'utf8');
const index=read('index.html');
const pr6=read('assets/pr6-play-learning.js');
const runtime=read('scripts/p0a-runtime-probe.cjs');

const checks=[];
const check=(name,pass)=>checks.push({name,pass:Boolean(pass)});
const tiers=['Beginner','Easy','Standard','Advanced','Expert'];

check('onboarding implementation remains in legacy product',/onboard(?:ing|ed)?|CHOOSE YOUR BIBLE DIFFICULTY/i.test(index));
for(const tier of tiers) check(`difficulty tier retained: ${tier}`,index.includes(tier));
check('canonical difficulty persists in settings',/settings[\s\S]{0,240}difficulty|difficulty[\s\S]{0,240}settings/i.test(index));
check('canonical save state remains present',index.includes('theBibleChallenge_v21'));
check('quiz session save control remains present',index.includes('saveQuizSession'));
check('quiz session restore control remains present',index.includes('restoreQuizSession'));
check('progress export remains present',index.includes('exportProgress'));
check('progress import remains present',/ImportProgress|importProgress/.test(index));
check('normal quiz/session source remains packaged',/question|quiz|answer/i.test(index)&&/score|streak|result/i.test(index));
check('PR6 exposes Quick Play',pr6.includes("data-pr6-action=\"quick-start\"")&&pr6.includes("title:'Quick Play'"));
check('PR6 exposes Focused Practice',pr6.includes("data-pr6-open=\"focused\"")&&pr6.includes("title:'Focused Practice'"));
check('PR6 hands Quick Play to legacy engine',/if\(a==='quick-start'\)handoff\('quick'\)/.test(pr6));
check('PR6 handoff deactivates reconstructed surface before legacy click',/async function handoff\(flow\)[\s\S]*deactivate\(\);[\s\S]*target\.click\(\)/.test(pr6));
check('runtime probe certifies fresh onboarding',runtime.includes('fresh profile must show the onboarding difficulty chooser'));
check('runtime probe certifies all five levels',runtime.includes("const TIERS = ['Beginner', 'Easy', 'Standard', 'Advanced', 'Expert']"));
check('runtime probe certifies persisted difficulty',runtime.includes('chosen onboarding difficulty must persist'));
check('runtime probe certifies session save/restore APIs',runtime.includes("['exportProgress','loadState','save','saveQuizSession','restoreQuizSession']"));

const failed=checks.filter(x=>!x.pass);
for(const item of checks) console.log(`${item.pass?'PASS':'FAIL'}  ${item.name}`);
console.log(`\nP0B player controls: ${checks.length-failed.length}/${checks.length} checks passed.`);
if(failed.length){
  console.error(`P0B FAILED: ${failed.length} player-control invariant(s) failed.`);
  process.exitCode=1;
}else console.log('P0B PASSED: onboarding, difficulty selection, and session-control contracts are preserved.');
