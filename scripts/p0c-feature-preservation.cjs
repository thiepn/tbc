#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');

const src = {
  app: read('index.html'),
  readme: read('README.md'),
  pr5: read('assets/pr5-shell.js'),
  pr6: read('assets/pr6-play-learning.js'),
};
const all = Object.values(src).join('\n');

const has = (...patterns) => patterns.every(re => re.test(all));
const appHas = (...patterns) => patterns.every(re => re.test(src.app));
const readmeHas = (...patterns) => patterns.every(re => re.test(src.readme));
const tableCount = (label, count) => new RegExp(`${label}[^\n|]*\\|[^\n]*\\*\\*${count}\\*\\*|\\*\\*${count}\\*\\*[^\n]*${label}`, 'i').test(src.readme);

const checks = [
  ['quick-play', 'Quick Play remains part of the playable product surface', () => has(/Quick Play/i)],
  ['focused-book-practice', 'focused/book practice remains represented', () => has(/Focused Practice|Practice a Book|Book Practice/i)],
  ['bible-journey', 'Bible Journey remains represented', () => has(/Bible Journey/i) && readmeHas(/25\s+(?:guided\s+)?stages/i)],
  ['learning-path', 'Learning Path remains represented', () => has(/Learning Path/i) && readmeHas(/63\s+(?:routed\s+)?learning\s+stages/i)],
  ['adaptive-review', 'Adaptive Review remains represented', () => has(/Adaptive Review/i)],
  ['whole-bible-library', 'whole-Bible library remains represented', () => has(/Library/i) && readmeHas(/all\s+66\s+books/i)],
  ['collections', '22 curated collections remain represented', () => has(/Collections?/i) && readmeHas(/22\s+(?:curated\s+)?(?:thematic\s+)?collections/i)],
  ['progress-mastery', 'progress and mastery tracking remain represented', () => has(/Progress/i, /Mastery/i)],
  ['campaign', 'Campaign remains represented with 72 missions', () => appHas(/Campaign/i) && (tableCount('Campaign missions', '72') || /72\s+Campaign\s+missions/i.test(src.readme))],
  ['expedition', 'Expedition remains represented with 12 arcs', () => appHas(/Expedition/i) && (tableCount('Expedition arcs', '12') || /12\s+Expedition\s+arcs/i.test(src.readme))],
  ['duel', 'Duel remains represented as a playable mode', () => has(/\bDuel\b/i)],
  ['bible-reader', 'Bible Reader / Read Bible surface remains represented', () => has(/Bible Reader|Read Bible/i)],
  ['structured-interactions', 'structured question interactions remain represented', () => readmeHas(/203\s+structured\s+questions/i) && has(/sequence|chain|timeline|matrix|ladder|grouping/i)],
  ['answer-feedback', 'rich answer feedback remains represented', () => has(/feedback/i, /evidence/i, /explain/i)],
  ['save-state', 'local save and canonical state machinery remain represented', () => appHas(/localStorage/i, /theBibleChallenge_v21/i)],
  ['export-import', 'progress export/import remains part of the declared feature contract', () => readmeHas(/progress\s+export\/import/i)],
  ['session-restore', 'active-session restoration remains part of the declared feature contract', () => readmeHas(/active-session\s+restoration/i)],
  ['search', 'search remains represented in the player interface', () => appHas(/Search/i)],
  ['settings', 'Settings remains represented in the player interface', () => has(/Settings/i)],
  ['offline-ready', 'offline-ready deployment contract remains represented', () => /offline-ready/i.test(src.readme)],
];

let failures = 0;
console.log('TBC P0C — Existing Feature Preservation');
for (const [id, detail, test] of checks) {
  let ok = false;
  let error = null;
  try { ok = Boolean(test()); } catch (err) { error = err; }
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${id}`);
  console.log(`      ${detail}${error ? ` (${error.message})` : ''}`);
}
console.log(`\n${checks.length - failures}/${checks.length} static feature checks passed.`);
if (failures) {
  console.error(`P0C STATIC FAILED: ${failures} existing feature contract(s) missing.`);
  process.exitCode = 1;
} else {
  console.log('P0C STATIC PASSED. Existing v4.1.0 feature inventory remains packaged.');
}
