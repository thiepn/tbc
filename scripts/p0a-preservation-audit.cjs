#!/usr/bin/env node
'use strict';

/**
 * TBC P0A — Static Preservation Audit
 *
 * Read-only guard for the proven v4.1.0 content/product contract.
 * Runtime-only systems are verified separately by p0a-runtime-probe.cjs.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(ROOT, file), 'utf8');
const src = {
  app: read('index.html'),
  readme: read('README.md'),
  pr5: read('assets/pr5-shell.js'),
  pr6: read('assets/pr6-play-learning.js'),
};
const all = Object.values(src).join('\n');

const BOOKS = [
  'Genesis','Exodus','Leviticus','Numbers','Deuteronomy','Joshua','Judges','Ruth',
  '1 Samuel','2 Samuel','1 Kings','2 Kings','1 Chronicles','2 Chronicles','Ezra','Nehemiah','Esther',
  'Job','Psalms','Proverbs','Ecclesiastes','Song of Songs','Isaiah','Jeremiah','Lamentations','Ezekiel','Daniel',
  'Hosea','Joel','Amos','Obadiah','Jonah','Micah','Nahum','Habakkuk','Zephaniah','Haggai','Zechariah','Malachi',
  'Matthew','Mark','Luke','John','Acts','Romans','1 Corinthians','2 Corinthians','Galatians','Ephesians',
  'Philippians','Colossians','1 Thessalonians','2 Thessalonians','1 Timothy','2 Timothy','Titus','Philemon',
  'Hebrews','James','1 Peter','2 Peter','1 John','2 John','3 John','Jude','Revelation'
];
const TIERS = ['Beginner', 'Easy', 'Standard', 'Advanced', 'Expert'];

const any = (text, patterns) => patterns.some(re => re.test(text));
const everyText = (text, values) => values.every(value => text.includes(value));

const checks = [
  ['monolith-not-truncated', 'index.html remains a substantial production build (>3.5 MB)', () => Buffer.byteLength(src.app, 'utf8') > 3_500_000],
  ['canonical-bank-contract', '5,799 canonical questions remain the frozen playable-bank contract', () => /5,799\s+(?:canonical\s+)?questions/i.test(src.readme)],
  ['structured-question-contract', '203 structured questions remain declared', () => /203\s+structured\s+questions/i.test(src.readme)],
  ['whole-bible-contract', 'all 66 books remain declared', () => /66\s+books/i.test(src.readme)],
  ['five-difficulty-contract', 'Beginner, Easy, Standard, Advanced, Expert all remain present', () => everyText(all, TIERS)],
  ['difficulty-distribution-contract', 'frozen v4.1.0 tier distribution remains documented', () => ['1,338','1,666','1,133','1,141','521'].every(n => src.readme.includes(n))],
  ['collections-contract', '22 curated collections remain part of the product contract', () => /22\s+(?:curated\s+)?(?:thematic\s+)?collections/i.test(src.readme)],
  ['journey-path-contract', '25 Journey stages and 63 Learning Path stages remain declared', () => /25\s+(?:guided\s+)?stages/i.test(src.readme) && /63\s+(?:routed\s+)?learning\s+stages/i.test(src.readme)],
  ['all-66-book-routes', 'PR6 still carries routing for all 66 biblical books', () => BOOKS.length === 66 && everyText(src.pr6, BOOKS)],
  ['onboarding-source', 'onboarding / first-run implementation markers remain packaged', () => any(src.app, [/onboard(?:ing)?/i,/first[-_ ]?run/i,/welcome[\s\S]{0,180}(?:difficulty|level|tier)/i,/(?:difficulty|level|tier)[\s\S]{0,180}welcome/i])],
  ['level-selector-source', 'difficulty/level selector implementation markers remain packaged', () => any(src.app, [/(?:difficulty|level|tier)[\s\S]{0,160}(?:selector|select|choose|picker|option)/i,/(?:selector|select|choose|picker|option)[\s\S]{0,160}(?:difficulty|level|tier)/i,/data-[^=\s]*(?:difficulty|level|tier)/i])],
  ['question-quality-surface', 'reviewed-question feedback/evidence/explainer surfaces remain represented', () => /reviewed\s+questions/i.test(src.app) && /feedback/i.test(src.app) && /evidence/i.test(src.app) && /explain/i.test(src.app)],
  ['canonical-dedup-contract', '273 redundant aliases remain excluded and exact playable duplicates remain eliminated', () => /273\s+redundant\s+aliases/i.test(src.readme) && /no\s+remaining\s+exact\s+playable\s+duplicate\s+groups/i.test(src.readme)],
  ['persistence-bootstrap-source', 'packaged bootstrap still references browser persistence; runtime audit verifies full save/import/export behavior', () => /localStorage/i.test(src.app) && /sessionStorage/i.test(src.app) && /getItem/i.test(src.app)],
  ['theme-surface', 'dark and high-contrast theme support remains represented', () => /dark/i.test(all) && /contrast/i.test(all)],
  ['pr5-state-preservation', 'PR5 remains explicitly non-mutating toward TBC game state', () => /does\s+not\s+read,\s*write,\s*or\s+mutate\s+TBC\s+game\s+state/i.test(src.pr5)],
  ['pr6-question-preservation', 'PR6 remains explicitly non-mutating toward quiz/question state', () => /never\s+rewrites\s+quiz\/question\s+state/i.test(src.pr6)],
];

let failures = 0;
console.log('TBC P0A — Static Preservation Audit');
console.log(`index.html: ${(Buffer.byteLength(src.app, 'utf8') / 1024 / 1024).toFixed(2)} MiB\n`);

for (const [id, detail, test] of checks) {
  let ok = false;
  let error = null;
  try { ok = Boolean(test()); } catch (err) { error = err; }
  if (!ok) failures += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${id}`);
  console.log(`      ${detail}${error ? ` (${error.message})` : ''}`);
}

console.log(`\n${checks.length - failures}/${checks.length} static preservation checks passed.`);
if (failures) {
  console.error(`P0A STATIC FAILED: ${failures} preservation invariant(s) need review.`);
  process.exitCode = 1;
} else {
  console.log('P0A STATIC PASSED.');
}
