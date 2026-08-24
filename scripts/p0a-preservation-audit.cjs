#!/usr/bin/env node
'use strict';

/**
 * TBC P0A — Preservation Audit
 *
 * Purpose: detect accidental loss of the proven v4.1.0 content/product surface
 * before later reconstruction work is accepted.
 *
 * This script is read-only. It never edits game data, saves, or UI state.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const paths = {
  app: path.join(ROOT, 'index.html'),
  readme: path.join(ROOT, 'README.md'),
  pr5: path.join(ROOT, 'assets', 'pr5-shell.js'),
  pr6: path.join(ROOT, 'assets', 'pr6-play-learning.js'),
};

function read(name) {
  const file = paths[name];
  if (!fs.existsSync(file)) throw new Error(`Missing required file: ${path.relative(ROOT, file)}`);
  return fs.readFileSync(file, 'utf8');
}

const src = {
  app: read('app'),
  readme: read('readme'),
  pr5: read('pr5'),
  pr6: read('pr6'),
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

function any(text, patterns) { return patterns.some((re) => re.test(text)); }
function everyText(text, values) { return values.every((value) => text.includes(value)); }

const checks = [
  {
    id: 'monolith-not-truncated',
    detail: 'index.html remains a substantial production build (>3.5 MB)',
    test: () => Buffer.byteLength(src.app, 'utf8') > 3_500_000,
  },
  {
    id: 'canonical-bank-contract',
    detail: 'README preserves the 5,799 canonical-question contract',
    test: () => /5,799\s+(?:canonical\s+)?questions/i.test(src.readme),
  },
  {
    id: 'structured-question-contract',
    detail: 'README preserves 203 structured questions',
    test: () => /203\s+structured\s+questions/i.test(src.readme),
  },
  {
    id: 'whole-bible-contract',
    detail: 'README preserves all 66 books',
    test: () => /66\s+books/i.test(src.readme),
  },
  {
    id: 'five-difficulty-contract',
    detail: 'all five calibrated difficulty tiers remain declared',
    test: () => everyText(all, TIERS),
  },
  {
    id: 'difficulty-distribution-contract',
    detail: 'v4.1.0 tier distribution remains documented',
    test: () => ['1,338','1,666','1,133','1,141','521'].every((n) => src.readme.includes(n)),
  },
  {
    id: 'collections-contract',
    detail: '22 curated collections remain part of the preserved product contract',
    test: () => /22\s+(?:curated\s+)?(?:thematic\s+)?collections/i.test(src.readme),
  },
  {
    id: 'journey-path-contract',
    detail: '25 Journey stages and 63 Learning Path stages remain declared',
    test: () => /25\s+(?:guided\s+)?stages/i.test(src.readme) && /63\s+(?:routed\s+)?learning\s+stages/i.test(src.readme),
  },
  {
    id: 'all-66-book-routes',
    detail: 'PR6 still carries routing for all 66 biblical books',
    test: () => BOOKS.length === 66 && everyText(src.pr6, BOOKS),
  },
  {
    id: 'onboarding-surface',
    detail: 'onboarding / first-run setup markers remain in the production app',
    test: () => any(src.app, [
      /onboard(?:ing)?/i,
      /first[-_ ]?run/i,
      /welcome[\s\S]{0,180}(?:difficulty|level|tier)/i,
      /(?:difficulty|level|tier)[\s\S]{0,180}welcome/i,
    ]),
  },
  {
    id: 'level-selector-surface',
    detail: 'difficulty/level selector markers remain in the production app',
    test: () => any(src.app, [
      /(?:difficulty|level|tier)[\s\S]{0,160}(?:selector|select|choose|picker|option)/i,
      /(?:selector|select|choose|picker|option)[\s\S]{0,160}(?:difficulty|level|tier)/i,
      /data-[^=\s]*(?:difficulty|level|tier)/i,
    ]),
  },
  {
    id: 'question-quality-surface',
    detail: 'quality-audit learning metadata remains represented in app source',
    test: () => {
      const markers = [
        /biblical\s+evidence/i,
        /memory\s+cue/i,
        /wrong[- ]answer/i,
        /explanation/i,
        /learning\s+focus/i,
      ];
      return markers.filter((re) => re.test(src.app)).length >= 3;
    },
  },
  {
    id: 'canonical-dedup-contract',
    detail: '273 redundant aliases remain excluded from normal selection by contract',
    test: () => /273\s+redundant\s+aliases/i.test(src.readme) && /no\s+remaining\s+exact\s+playable\s+duplicate\s+groups/i.test(src.readme),
  },
  {
    id: 'persistence-surface',
    detail: 'local save/export/import/session mechanisms remain represented',
    test: () => /localStorage/i.test(src.app) && /export/i.test(src.app) && /import/i.test(src.app) && /session/i.test(src.app),
  },
  {
    id: 'theme-surface',
    detail: 'dark and high-contrast theme support remains represented',
    test: () => /dark/i.test(all) && /contrast/i.test(all),
  },
  {
    id: 'pr5-state-preservation',
    detail: 'PR5 remains explicitly non-mutating toward TBC game state',
    test: () => /does\s+not\s+read,\s*write,\s*or\s+mutate\s+TBC\s+game\s+state/i.test(src.pr5),
  },
  {
    id: 'pr6-question-preservation',
    detail: 'PR6 remains explicitly non-mutating toward quiz/question state',
    test: () => /never\s+rewrites\s+quiz\/question\s+state/i.test(src.pr6),
  },
];

let failures = 0;
console.log('TBC P0A — Preservation Audit');
console.log(`index.html: ${(Buffer.byteLength(src.app, 'utf8') / 1024 / 1024).toFixed(2)} MiB`);
console.log('');

for (const check of checks) {
  let ok = false;
  let error = null;
  try { ok = Boolean(check.test()); } catch (err) { error = err; }
  if (!ok) failures += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${check.id}`);
  console.log(`      ${check.detail}${error ? ` (${error.message})` : ''}`);
}

console.log('');
console.log(`${checks.length - failures}/${checks.length} preservation checks passed.`);
if (failures) {
  console.error(`P0A FAILED: ${failures} preservation invariant(s) need review before reconstruction continues.`);
  process.exitCode = 1;
} else {
  console.log('P0A PASSED: preserved v4.1.0 surfaces detected.');
}
