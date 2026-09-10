'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const PREDECESSOR = 'e8531e739b871236853115707b6b6bdf702996aa';
const SUCCESSOR = '742834e8ce148dcc8c8d8fcfdfa2d7baa7ea5f0f';
const STYLE_OPEN = '<style id="v340-product-polish">';
const STYLE_CLOSE = '</style>';

function git(...args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

function blobForBytes(bytes) {
  return execFileSync('git', ['hash-object', '--stdin'], {
    cwd: ROOT,
    input: bytes,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  }).trim();
}

function normalizeBodyPrefix(text) {
  return text.replace(/(<body\b[^>]*>)[ \t\r\n]+(?=<)/i, '$1\n');
}

function applyAuthorizedRepair(text) {
  const start = text.indexOf(STYLE_OPEN);
  assert.ok(start >= 2, 'v340-product-polish style block missing');
  assert.equal(text.slice(start - 2, start), '\\n', 'expected literal newline token before v340-product-polish');

  const innerStart = start + STYLE_OPEN.length;
  const close = text.indexOf(STYLE_CLOSE, innerStart);
  assert.ok(close > innerStart, 'v340-product-polish closing tag missing');
  const afterClose = close + STYLE_CLOSE.length;
  assert.equal(text.slice(afterClose, afterClose + 2), '\\n', 'expected literal newline token after v340-product-polish');

  const inner = text.slice(innerStart, close);
  assert.ok(inner.includes('\\n'), 'historical v340-product-polish block has no literal newline tokens to repair');

  let repaired = text.slice(0, start - 2) + '\n' + STYLE_OPEN;
  repaired += inner.replace(/\\r/g, '\n').replace(/\\n/g, '\n');
  repaired += STYLE_CLOSE + '\n' + text.slice(afterClose + 2);
  return normalizeBodyPrefix(repaired);
}

function validate(root = ROOT) {
  const historical = git('cat-file', 'blob', PREDECESSOR);
  const current = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

  assert.equal(blobForBytes(current), SUCCESSOR, 'current repaired index.html identity changed');
  assert.equal(blobForBytes(historical), PREDECESSOR, 'historical Batch 07 index identity changed');

  const repairedHistorical = applyAuthorizedRepair(historical);
  const normalizedCurrent = normalizeBodyPrefix(current);
  assert.equal(normalizedCurrent, repairedHistorical,
    'current index.html differs from Batch 07 beyond the authorized literal-newline repair');

  const currentStyleStart = current.indexOf(STYLE_OPEN);
  const currentStyleClose = current.indexOf(STYLE_CLOSE, currentStyleStart + STYLE_OPEN.length);
  assert.ok(currentStyleStart >= 0 && currentStyleClose > currentStyleStart, 'current v340-product-polish block missing');
  const currentStyle = current.slice(currentStyleStart, currentStyleClose + STYLE_CLOSE.length);
  assert.ok(!currentStyle.includes('\\n') && !currentStyle.includes('\\r'),
    'literal newline token remains inside current v340-product-polish block');
  assert.notEqual(current.slice(currentStyleStart - 2, currentStyleStart), '\\n',
    'literal newline token remains before current v340-product-polish block');
  assert.notEqual(current.slice(currentStyleClose + STYLE_CLOSE.length, currentStyleClose + STYLE_CLOSE.length + 2), '\\n',
    'literal newline token remains after current v340-product-polish block');

  return { predecessor: PREDECESSOR, successor: SUCCESSOR, scope: 'literal-newline-rendering-repair-only' };
}

module.exports = { ROOT, PREDECESSOR, SUCCESSOR, applyAuthorizedRepair, normalizeBodyPrefix, validate };

if (require.main === module) {
  try {
    console.log('TBC RENDERING REPAIR IDENTITY PASS:', validate());
  } catch (error) {
    console.error(error.stack);
    process.exitCode = 1;
  }
}
