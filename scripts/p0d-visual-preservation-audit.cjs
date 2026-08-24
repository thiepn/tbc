#!/usr/bin/env node
'use strict';

const fs=require('node:fs');
const path=require('node:path');

const ROOT=path.resolve(__dirname,'..');
const read=relative=>fs.readFileSync(path.join(ROOT,relative),'utf8');
const foundation=read('assets/pr5-foundation.css');
const pr6=read('assets/pr6-play-learning.css');
const index=read('index.html');

const checks=[];
const check=(name,pass,detail='')=>checks.push({name,pass:Boolean(pass),detail});

const requiredLegacyTokens=['--bg','--surface','--surface2','--text','--muted','--line','--indigo','--cyan','--gold','--violet','--shadow-sm','--shadow'];
for(const token of requiredLegacyTokens){
  check(`legacy token retained: ${token}`,foundation.includes(`var(${token}`)||pr6.includes(`var(${token}`));
}

check('P0D marker present',foundation.includes('P0D — Visual Identity & Visual-Regression Preservation'));
check('P0D contract variable present',foundation.includes('--p0d-visual-preservation:1'));
check('native v4.1.0 home remains visible',foundation.includes('.pr5-native-home{position:static!important'));
check('replacement PR5 home remains suppressed',foundation.includes('.pr5-home{display:none!important}'));
check('PR5 palette delegates to legacy indigo',foundation.includes('--pr5-accent:var(--indigo)'));
check('PR5 focus delegates to legacy cyan',foundation.includes('--pr5-focus:var(--cyan)'));
check('PR5 surfaces delegate to legacy surface tokens',foundation.includes('--pr5-surface:var(--surface)')&&foundation.includes('--pr5-surface-subtle:var(--surface2)'));
check('PR6 hero delegates to legacy palette',/\.pr6-page-head\{[\s\S]*var\(--cyan\)[\s\S]*var\(--gold\)[\s\S]*var\(--indigo\)[\s\S]*var\(--violet\)/.test(foundation));
check('P0C preserved grid is narrow-screen safe',foundation.includes('minmax(min(220px,100%),1fr)'));
check('contrast mode removes reconstruction shadows',foundation.includes('body.contrast:not(.dark) .pr6-root')&&foundation.includes('box-shadow:none!important'));
check('contrast hero has deterministic black/white fallback',foundation.includes('body.contrast:not(.dark) .pr6-page-head{background:#000!important;color:#fff!important'));
check('mobile reconstruction containment exists',foundation.includes('@media(max-width:620px)')&&foundation.includes('.pr6-book-tools{position:static;display:grid}'));
check('reduced motion fallback exists',foundation.includes('@media(prefers-reduced-motion:reduce)')&&foundation.includes('.pr6-root :where(button'));
check('PR5 stylesheet is still loaded by frozen document',/assets\/pr5-foundation\.css/.test(index));
check('PR6 remains isolated from core monolith',!/pr6-page-head|pr6-flow-card|p0d-visual-preservation/.test(index));

/* The initial generic PR5 palette is explicitly forbidden from returning. These
 * literals came from the reconstruction shell, not from the preserved v4.1.0
 * visual system. */
const deprecatedGenericPalette=['#f5f6fa','#4459d7','#3045c4','#11162c','#151b3d','#aeb8ff'];
for(const literal of deprecatedGenericPalette){
  check(`deprecated reconstruction color absent: ${literal}`,!foundation.toLowerCase().includes(literal));
}

/* P0D is CSS-only. Guard against accidental gameplay/state logic being moved
 * into this phase in future edits. */
const p0dSection=foundation.split('/* P0D — Visual Identity & Visual-Regression Preservation')[1]||'';
const forbiddenSemanticPatterns=[
  /QUESTION_BANK/,
  /localStorage/,
  /sessionStorage/,
  /startSession/,
  /correctAnswer/,
  /score\s*=/,
  /mastery\s*=/,
  /difficulty\s*=/
];
for(const pattern of forbiddenSemanticPatterns){
  check(`P0D contains no semantic logic: ${pattern}`,!pattern.test(p0dSection));
}

/* PR6 may add presentation, but its reconstructed layer must continue consuming
 * the preserved palette instead of introducing a separate design system. */
for(const token of ['--indigo','--cyan','--gold','--violet']){
  check(`PR6 consumes legacy ${token}`,pr6.includes(`var(${token})`));
}

const failed=checks.filter(item=>!item.pass);
for(const item of checks){
  console.log(`${item.pass?'PASS':'FAIL'}  ${item.name}${item.detail?` — ${item.detail}`:''}`);
}
console.log(`\nP0D visual preservation: ${checks.length-failed.length}/${checks.length} checks passed.`);
if(failed.length){
  console.error(`P0D FAILED: ${failed.length} preservation check(s) failed.`);
  process.exitCode=1;
}else{
  console.log('P0D PASSED: legacy visual identity and overlay containment are preserved.');
}
