#!/usr/bin/env node
'use strict';

/**
 * TBC P0A — Core Content Preservation Audit
 *
 * Read-only guard for the proven v4.1.0 content contract.
 * The legacy monolith remains frozen unless a later certified content phase
 * explicitly freezes an exact replacement source hash while preserving every
 * other production contract.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const BASELINE = '58b5ec8a5ecd2fd87a74f11eea7a94a9bc4195bb';
const EXPECTED_INDEX_ADDITIONS = 3;
const EXPECTED_INDEX_DELETIONS = 0;
const P2A_BASELINE_PATH = path.join(ROOT, 'certification/p2a-question-bank-extraction-baseline.json');

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

function legacyIndexDelta() {
  const out = execFileSync('git', ['diff', '--numstat', BASELINE, '--', 'index.html'], {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
  if (!out) return { additions: 0, deletions: 0, path: 'index.html' };
  const [additions, deletions, file] = out.split(/\s+/);
  return { additions: Number(additions), deletions: Number(deletions), path: file };
}

function gitBlobSha1(buffer) {
  return crypto.createHash('sha1')
    .update(Buffer.from(`blob ${buffer.length}\0`))
    .update(buffer)
    .digest('hex');
}

function certifiedP2BMonolith() {
  if (!fs.existsSync(P2A_BASELINE_PATH)) return false;
  const baseline = JSON.parse(fs.readFileSync(P2A_BASELINE_PATH, 'utf8'));
  const certification = baseline?.p2b;
  if (!certification || certification.phase !== 'P2B' || certification.mechanicalIntegrity !== true) return false;
  if (certification.confirmedDefectsRemaining !== 0 || certification.repairedQuestions !== 30) return false;
  const expectedSha = String(baseline?.source?.indexBlobSha1 || '');
  if (!/^[0-9a-f]{40}$/.test(expectedSha)) return false;
  return gitBlobSha1(Buffer.from(src.app, 'utf8')) === expectedSha;
}

const checks = [
  ['legacy-monolith-frozen', `index.html must remain the v4.1.0 baseline plus exactly ${EXPECTED_INDEX_ADDITIONS} approved reconstruction-loader lines, or match an exact P2B-certified corrected source hash`, () => {
    const delta = legacyIndexDelta();
    const legacyFrozen = delta.path === 'index.html' && delta.additions === EXPECTED_INDEX_ADDITIONS && delta.deletions === EXPECTED_INDEX_DELETIONS;
    return legacyFrozen || certifiedP2BMonolith();
  }],
  ['monolith-not-truncated', 'index.html remains a substantial production build (>3.5 MB)', () => Buffer.byteLength(src.app, 'utf8') > 3_500_000],
  ['canonical-bank-contract', '5,799 canonical questions remain the frozen playable-bank contract', () => /5,799\s+(?:canonical\s+)?questions/i.test(src.readme)],
  ['structured-question-contract', '203 structured questions remain declared', () => /203\s+structured\s+questions/i.test(src.readme)],
  ['whole-bible-contract', 'all 66 books remain declared', () => /66\s+books/i.test(src.readme)],
  ['five-difficulty-contract', 'Beginner, Easy, Standard, Advanced, Expert all remain present', () => everyText(all, TIERS)],
  ['difficulty-distribution-contract', 'frozen v4.1.0 tier distribution remains 1,338 / 1,666 / 1,133 / 1,141 / 521', () => ['1,338','1,666','1,133','1,141','521'].every(n => src.readme.includes(n))],
  ['canonical-dedup-contract', '273 redundant aliases remain excluded and exact playable duplicates remain eliminated', () => /273\s+redundant\s+aliases/i.test(src.readme) && /no\s+remaining\s+exact\s+playable\s+duplicate\s+groups/i.test(src.readme)],
  ['collections-contract', '22 curated collections remain part of the product contract', () => /22\s+(?:curated\s+)?(?:thematic\s+)?collections/i.test(src.readme)],
  ['journey-path-contract', '25 Journey stages and 63 Learning Path stages remain declared', () => /25\s+(?:guided\s+)?stages/i.test(src.readme) && /63\s+(?:routed\s+)?learning\s+stages/i.test(src.readme)],
  ['all-66-book-routes', 'PR6 still carries routing for all 66 biblical books', () => BOOKS.length === 66 && everyText(src.pr6, BOOKS)],
  ['question-quality-surface', 'reviewed-question feedback/evidence/explainer surfaces remain represented', () => /reviewed\s+questions/i.test(src.app) && /feedback/i.test(src.app) && /evidence/i.test(src.app) && /explain/i.test(src.app)],
  ['onboarding-source', 'onboarding / first-run implementation markers remain packaged', () => any(src.app, [/onboard(?:ing)?/i,/first[-_ ]?run/i,/welcome[\s\S]{0,180}(?:difficulty|level|tier)/i,/(?:difficulty|level|tier)[\s\S]{0,180}welcome/i])],
  ['level-selector-source', 'difficulty/level selector implementation markers remain packaged', () => any(src.app, [/(?:difficulty|level|tier)[\s\S]{0,160}(?:selector|select|choose|picker|option)/i,/(?:selector|select|choose|picker|option)[\s\S]{0,160}(?:difficulty|level|tier)/i,/data-[^=\s]*(?:difficulty|level|tier)/i])],
  ['persistence-bootstrap-source', 'packaged bootstrap still references browser persistence', () => /localStorage/i.test(src.app) && /sessionStorage/i.test(src.app) && /getItem/i.test(src.app)],
  ['theme-surface', 'dark and high-contrast theme support remains represented', () => /dark/i.test(all) && /contrast/i.test(all)],
  ['pr5-state-preservation', 'PR5 remains explicitly non-mutating toward TBC game state', () => /does\s+not\s+read,\s*write,\s*or\s+mutate\s+TBC\s+game\s+state/i.test(src.pr5)],
  ['pr6-question-preservation', 'PR6 remains explicitly non-mutating toward quiz/question state', () => /never\s+rewrites\s+quiz\/question\s+state/i.test(src.pr6)],
];

let failures = 0;
console.log('TBC P0A — Core Content Preservation Audit');
console.log(`Baseline: ${BASELINE}`);
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
  console.log('P0A STATIC PASSED. Core production contracts remain preserved under the active certified source baseline.');
}
