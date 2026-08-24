'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const fail = (message) => {
  console.error(`P0A preservation check failed: ${message}`);
  process.exit(1);
};
const requireText = (source, needle, label) => {
  if (!source.includes(needle)) fail(`${label} is missing: ${needle}`);
};

const readme = read('README.md');
const index = read('index.html');
const pr5 = read('assets/pr5-shell.js');
const pr6 = read('assets/pr6-play-learning.js');

const indexBytes = Buffer.byteLength(index, 'utf8');
if (indexBytes < 3_500_000) {
  fail(`core index.html looks truncated or replaced (${indexBytes.toLocaleString('en-US')} bytes)`);
}

const releaseInvariants = [
  ['5,799', 'canonical question count'],
  ['6,072', 'compatibility registry count'],
  ['273', 'excluded redundant alias count'],
  ['203', 'structured question count'],
  ['66 books', 'whole-Bible coverage'],
  ['5 difficulty tiers', 'difficulty tier count'],
  ['22 collections', 'collection count'],
  ['25 guided stages', 'Bible Journey stage count'],
  ['63 routed learning stages', 'Learning Path stage count'],
  ['72', 'Campaign mission count'],
  ['12', 'Expedition arc count'],
  ['Beginner', 'Beginner tier'],
  ['Easy', 'Easy tier'],
  ['Standard', 'Standard tier'],
  ['Advanced', 'Advanced tier'],
  ['Expert', 'Expert tier'],
  ['1,338', 'Beginner distribution'],
  ['1,666', 'Easy distribution'],
  ['1,133', 'Standard distribution'],
  ['1,141', 'Advanced distribution'],
  ['521', 'Expert distribution']
];

for (const [needle, label] of releaseInvariants) {
  requireText(readme, needle, label);
}

requireText(
  pr5,
  'It does not read, write, or mutate TBC game state.',
  'PR5 additive-state preservation contract'
);
requireText(pr5, 'pr6-play-learning.css', 'PR6 stylesheet loader');
requireText(pr5, 'pr6-play-learning.js', 'PR6 script loader');
requireText(
  pr6,
  'PR6 never rewrites quiz/question state.',
  'PR6 question-state preservation contract'
);

console.log('P0A preservation checks passed.');
console.log(`- core monolith size: ${indexBytes.toLocaleString('en-US')} bytes`);
console.log('- v4.1.0 question-bank and progression release stats: locked');
console.log('- five-tier difficulty distribution: locked');
console.log('- PR5/PR6 additive architecture contracts: locked');
console.log('- manual browser checks still required: onboarding, level selector, persistence, themes/accessibility, and mode reachability');
