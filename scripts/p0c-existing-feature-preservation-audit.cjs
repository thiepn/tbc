#!/usr/bin/env node
'use strict';

const fs=require('fs');
const path=require('path');
const ROOT=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(ROOT,file),'utf8');
const index=read('index.html');
const readme=read('README.md');
const p0a=read('scripts/p0a-preservation-audit.cjs');
const pr5=read('assets/pr5-shell.js');
const pr6=read('assets/pr6-play-learning.js');
const p0c=read('assets/p0c-existing-feature-preservation.js');

const checks=[];
const check=(name,pass,detail='')=>checks.push({name,pass:Boolean(pass),detail});
const has=(src,needle)=>src.includes(needle);

check('P0A guard remains active',has(p0a,"const BASELINE = '58b5ec8a5ecd2fd87a74f11eea7a94a9bc4195bb'")&&has(p0a,'legacy-monolith-frozen'));
check('P0A shell loader remains in index',has(index,'assets/pr5-shell.js'));
check('Canonical state key remains packaged',has(index,'theBibleChallenge_v21'));
check('Canonical recovery state remains packaged',has(index,'theBibleChallenge_v21_recovery'));

const contracts=[
  ['Collections',/22\s+(?:curated\s+)?(?:thematic\s+)?collections/i],
  ['Library',/Whole-Bible Library/i],
  ['Progress / mastery',/Mastery Tracking/i],
  ['Bible Journey',/25\s+(?:guided\s+)?stages/i],
  ['Learning Path',/63\s+(?:routed\s+)?learning\s+stages/i],
  ['Adaptive Review',/Adaptive Review/i],
  ['Duel',/Duel/i],
  ['Campaign',/Campaign missions\s*\|\s*\*\*72\*\*/i],
  ['Expedition',/Expedition arcs\s*\|\s*\*\*12\*\*/i],
  ['Challenges',/collections, challenges, Bible Reader practice/i],
  ['Bible Reader practice',/Bible Reader practice/i]
];
for(const [name,re] of contracts)check(`Product contract: ${name}`,re.test(readme),name);

for(const [flow,title] of [['journey','Bible Journey'],['path','Learning Path'],['review','Adaptive Review']]){
  const renderer=flow==='journey'?'Journey':flow==='path'?'Path':'Review';
  check(`PR6 ${title} flow exists`,has(pr6,`${flow}:{domain:'learn'`)&&has(pr6,`render${renderer}`),flow);
}
check('PR6 exposes public open API',has(pr6,'window.TBC_PR6={version:VERSION,open,handoff,audit,deactivate}'));

const required=['collections','library','progress','journey','path','review','duel','campaign','expedition'];
for(const key of required)check(`P0C registry preserves ${key}`,new RegExp(`\\b${key}:\\{`).test(p0c),key);
for(const key of ['challenges','reader','achievements','profile','settings','memory','custom']){
  check(`P0C adjacent bridge covers ${key}`,new RegExp(`\\b${key}:\\{`).test(p0c),key);
}

check('P0C Collections uses retained panel engine',has(p0c,"route:'collections'")&&has(p0c,"window.v24CollectionsPanel")&&has(p0c,'window.openModal(html,true)'));
check('P0C Library uses current v292 route',has(p0c,"route:'library'")&&has(p0c,'window.v292Go(route)'));
check('P0C Progress uses current v292 route',has(p0c,"route:'progress'")&&has(p0c,'window.v292Go(route)'));
check('P0C Duel uses canonical function entrypoint',has(p0c,"functions:['v31OpenDuelSetup']")&&has(p0c,'legacyFunction(key)'));
for(const id of ['campaignBtn','expeditionBtn'])check(`P0C retained legacy bridge ${id}`,has(p0c,id),id);

check('P0C version is current',has(p0c,"const VERSION='P0C.3'"));
check('P0C uses canonical browser state contract',has(p0c,"'theBibleChallenge_v21'")&&has(p0c,"'theBibleChallenge_v21_recovery'"));
check('P0C contains no obsolete tbc_v4 state contract',!has(p0c,'tbc_v4_'));
check('P0C exposes Play preservation surface',has(p0c,'data-p0c-preserved="play"')&&has(p0c,'injectPlayModes'));
check('P0C exposes Learn/data preservation surface',has(p0c,'data-p0c-preserved="learn"')&&has(p0c,'injectLearnUtilities'));
check('P0C preserves PR6 re-entry after legacy handoffs',has(p0c,'needsNativePrime')&&has(p0c,'normalizeReentry')&&has(p0c,"window.addEventListener('click',normalizeReentry,true)"));
check('P0C preservation grids do not alter PR6 core-card test counts',has(p0c,'p0c-preserved-grid')&&!has(p0c,'<div class="pr6-intro-grid three">${cards}</div>'));
check('P0C does not write localStorage',!has(p0c,'localStorage.setItem('));
check('P0C does not write sessionStorage',!has(p0c,'sessionStorage.setItem('));
check('P0C does not remove legacy DOM',!has(p0c,'.remove()')&&!has(p0c,'.replaceWith('));
check('PR5 loads P0C preservation layer',has(pr5,'p0c-existing-feature-preservation.js'));

const failed=checks.filter(x=>!x.pass);
console.log(`P0C Existing Feature Preservation Audit — ${failed.length?'FAIL':'PASS'}`);
for(const item of checks)console.log(`${item.pass?'✓':'✗'} ${item.name}${item.detail?` [${item.detail}]`:''}`);
if(failed.length){
  console.error(`\n${failed.length} preservation check(s) failed.`);
  process.exit(1);
}
console.log(`\n${checks.length} preservation checks passed.`);
