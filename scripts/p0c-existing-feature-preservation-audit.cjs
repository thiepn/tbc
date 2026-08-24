#!/usr/bin/env node
'use strict';

const fs=require('fs');
const path=require('path');
const ROOT=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(ROOT,file),'utf8');
const index=read('index.html');
const pr5=read('assets/pr5-shell.js');
const pr6=read('assets/pr6-play-learning.js');
const p0c=read('assets/p0c-existing-feature-preservation.js');

const checks=[];
const check=(name,pass,detail='')=>checks.push({name,pass:Boolean(pass),detail});
const has=(src,needle)=>src.includes(needle);

check('P0A guard remains active',has(index,'__TBC_P0A_GUARD__'));
check('P0A shell loader remains in index',has(index,'assets/pr5-shell.js'));

const legacy=[
  ['Collections','#collectionsBtn','collectionsBtn'],
  ['Library','#libraryBtn','libraryBtn'],
  ['Progress / mastery','#progressBtn','progressBtn'],
  ['Duel','#pvpBtn','pvpBtn'],
  ['Campaign','#campaignBtn','campaignBtn'],
  ['Expedition','#expeditionBtn','expeditionBtn']
];
for(const [name,,id] of legacy)check(`Legacy ${name} entry point`,has(index,`id="${id}"`)||has(index,`id='${id}'`),id);

check('Collections implementation retained',has(index,'function openCollections')&&has(index,'tbc_v4_collection'));
check('Progress/mastery implementation retained',has(index,'getMasterySummary')&&has(index,'function renderStats'));
check('Duel implementation retained',has(index,'function renderPvp')&&has(index,'PvP Duel'));
check('Campaign implementation retained',has(index,'Campaign'));
check('Expedition implementation retained',has(index,'Expedition'));

for(const key of ['tbc_v4_progress','tbc_v4_custom','tbc_v4_verses','tbc_v4_collection','tbc_v4_achievements','tbc_v4_profile','tbc_v4_theme','tbc_v4_locale']){
  check(`Storage contract ${key}`,has(index,key),key);
}

for(const [flow,title] of [['journey','Bible Journey'],['path','Learning Path'],['review','Adaptive Review']]){
  check(`PR6 ${title} flow exists`,has(pr6,`${flow}:{domain:'learn'`)&&has(pr6,`render${flow==='journey'?'Journey':flow==='path'?'Path':'Review'}`),flow);
}
check('PR6 exposes public open API',has(pr6,'window.TBC_PR6={version:VERSION,open,handoff,audit,deactivate}'));

for(const key of ['collections','library','progress','journey','path','review','duel','campaign','expedition']){
  check(`P0C registry preserves ${key}`,new RegExp(`\\b${key}:\\{`).test(p0c),key);
}
for(const id of ['collectionsBtn','libraryBtn','progressBtn','pvpBtn','campaignBtn','expeditionBtn']){
  check(`P0C direct legacy bridge ${id}`,has(p0c,id),id);
}
check('P0C exposes Play preservation surface',has(p0c,'data-p0c-preserved="play"')&&has(p0c,"injectPlayModes"));
check('P0C exposes Learn/data preservation surface',has(p0c,'data-p0c-preserved="learn"')&&has(p0c,"injectLearnUtilities"));
check('P0C does not write localStorage',!has(p0c,'localStorage.setItem('));
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
