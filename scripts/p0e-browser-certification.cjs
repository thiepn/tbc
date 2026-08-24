#!/usr/bin/env node
'use strict';

const path=require('node:path');
const {execFileSync}=require('node:child_process');
const ROOT=path.resolve(__dirname,'..');
const suites=[
  ['P0A runtime core/player bootstrap','scripts/p0a-runtime-probe.cjs'],
  ['P0B player controls','scripts/p0b-browser-smoke.cjs'],
  ['PR5 reconstructed shell','scripts/pr5-browser-smoke.cjs'],
  ['PR6 play/learning flows','scripts/pr6-browser-smoke.cjs'],
  ['P0C existing systems + re-entry','scripts/p0c-browser-smoke.cjs'],
  ['P0D visual/UI integrity','scripts/p0d-browser-smoke.cjs']
];

console.log('TBC P0E — Whole-product browser certification');
let failed=0;
for(const [name,script] of suites){
  console.log(`\n=== ${name} ===`);
  try{execFileSync(process.execPath,[path.join(ROOT,script)],{cwd:ROOT,stdio:'inherit'});}
  catch(error){failed+=1;console.error(`${name} FAILED.`);}
}
if(failed){
  console.error(`\nP0E BROWSER FAILED: ${failed}/${suites.length} browser suite(s) failed.`);
  process.exit(1);
}
console.log(`\nP0E BROWSER PASSED: all ${suites.length} browser suites passed together.`);
