#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');

const app = read('index.html');
const pr5css = read('assets/pr5-foundation.css');
const pr6css = read('assets/pr6-play-learning.css');
const pr5js = read('assets/pr5-shell.js');
const p0b = read('assets/p0b-player-controls.js');
const p0c = read('assets/p0c-existing-feature-preservation.js');
const p0d = pr5css.split('/* P0D — visual identity & theme preservation.')[1] || '';

const checks = [
  ['legacy-theme-tokens', 'legacy palette tokens remain packaged', () => ['--bg','--surface','--surface2','--text','--muted','--line','--indigo','--cyan','--gold','--violet'].every(token => app.includes(token))],
  ['legacy-dark-mode', 'legacy dark-mode styling remains packaged', () => /body\.dark|\.dark\s*\{/.test(app)],
  ['legacy-contrast-mode', 'legacy contrast/high-contrast styling remains packaged', () => /body\.contrast|\.contrast\s*\{/.test(app) && /contrast/i.test(app)],
  ['pr5-token-bridge', 'PR5 maps reconstruction colors onto legacy theme tokens', () => /--pr5-bg:var\(--bg\)/.test(pr5css) && /--pr5-surface:var\(--surface\)/.test(pr5css) && /--pr5-text:var\(--text\)/.test(pr5css)],
  ['p0d-override-present', 'P0D compatibility override is present', () => /P0D — visual identity & theme preservation/.test(pr5css)],
  ['pr6-heading-tokenized', 'PR6 page heading is forced back onto legacy surface/text tokens', () => /\.pr6-page-head\{[\s\S]*var\(--surface\)[\s\S]*color:var\(--text\)!important/.test(p0d)],
  ['pr6-primary-tokenized', 'PR6 primary controls inherit gold/surface/text tokens', () => /\.pr6-button\.primary\{[\s\S]*var\(--gold\)[\s\S]*color:var\(--text\)!important/.test(p0d)],
  ['contrast-override', 'P0D explicitly supports contrast mode without decorative gradients/shadows', () => /body\.contrast \.pr6-page-head/.test(p0d) && /box-shadow:none!important/.test(p0d) && /\.pr6-page-head:after\{display:none!important\}/.test(p0d)],
  ['no-new-fixed-palette', 'P0D introduces no new literal hex palette', () => !/#[0-9a-f]{3,8}\b/i.test(p0d)],
  ['reduced-motion-preserved', 'reconstruction still honors reduced-motion preference', () => /prefers-reduced-motion:reduce/.test(pr5css) && /prefers-reduced-motion:reduce/.test(pr6css)],
  ['p0b-carried-forward', 'P0B five-level player control layer is present', () => ['Beginner','Easy','Standard','Advanced','Expert'].every(level => p0b.includes(level))],
  ['p0b-loader-carried-forward', 'PR5 shell carries the P0B control layer', () => /p0b-player-controls\.js/.test(pr5js)],
  ['p0c-current-carried-forward', 'current P0C preservation bridge remains loaded and covers all required legacy features', () => /p0c-existing-feature-preservation\.js/.test(pr5js) && /P0C\.3/.test(p0c) && ['collections','library','progress','journey','path','review','duel','campaign','expedition'].every(key => p0c.includes(`${key}:`))],
];

let failures = 0;
console.log('TBC P0D — Visual Identity & Theme Preservation');
for (const [id, detail, test] of checks) {
  let ok = false;
  let error = null;
  try { ok = Boolean(test()); } catch (err) { error = err; }
  if (!ok) failures += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${id}`);
  console.log(`      ${detail}${error ? ` (${error.message})` : ''}`);
}
console.log(`\n${checks.length - failures}/${checks.length} visual-preservation checks passed.`);
if (failures) {
  console.error(`P0D STATIC FAILED: ${failures} visual/theme invariant(s) need review.`);
  process.exitCode = 1;
} else {
  console.log('P0D STATIC PASSED. P0A/P0B/P0C/P0D preservation layers are cumulative.');
}
