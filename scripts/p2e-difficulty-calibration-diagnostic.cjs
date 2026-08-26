#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const DIR=path.resolve(ROOT,process.env.P2A_OUT_DIR||'artifacts/p2a');
const bank=JSON.parse(fs.readFileSync(path.join(DIR,'question-bank.json'),'utf8'));
const qs=bank.questions||[];
const OLD={
  'd4.easy.major.1-chronicles-inventory-1.01':['Advanced',63],
  'd4.easy.mode.parables.luke-good-samaritan.16':['Expert',97],
  'phase9.nt.romans.7.structure':['Standard',42],
  'v402.miracle.feeding-bread-discourse':['Advanced',60],
  'd4.easy.place.place-elah':['Beginner',19],
  'place.elah.significance':['Standard',49],
  'place.jordan.significance':['Standard',49],
  'place.shechem.significance':['Standard',49],
  'place.shiloh.significance':['Advanced',64],
  'place.valley-elah.v20-significance':['Standard',49]
};
const by=new Map(qs.map(q=>[q.canonicalId,q]));
const tiers=['Beginner','Easy','Standard','Advanced','Expert'];
const dist=Object.fromEntries(tiers.map(t=>[t,0]));
for(const q of qs)dist[q.difficulty]=(dist[q.difficulty]||0)+1;
const rows=[];
for(const [id,[oldTier,oldScore]] of Object.entries(OLD)){
  const q=by.get(id);if(!q)throw new Error(`missing deferred calibration question ${id}`);
  const qb5=q.qualityMetadata?.qb5Difficulty||{};
  rows.push({id,oldTier,oldScore,newTier:q.difficulty,newScore:qb5.difficultySignal,changedTier:q.difficulty!==oldTier,changedScore:qb5.difficultySignal!==oldScore,question:q.question});
}
console.log('TBC P2E — Deferred Difficulty Calibration Diagnostic');
console.log(`Canonical=${qs.length}`);
console.log(`Distribution=${tiers.map(t=>`${t}:${dist[t]}`).join(' | ')}`);
for(const r of rows)console.log(`${r.id}: ${r.oldTier}/${r.oldScore} -> ${r.newTier}/${r.newScore}${r.changedTier?' [TIER CHANGE]':r.changedScore?' [SCORE CHANGE]':''}`);
const out=path.resolve(ROOT,process.env.P2E_OUT_DIR||'artifacts/p2e');
fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(out,'difficulty-calibration-diagnostic.json'),JSON.stringify({phase:'P2E-diagnostic',counts:{canonical:qs.length},distribution:dist,deferredPins:rows},null,2)+'\n');
