'use strict';
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const ROOT = path.resolve(__dirname, '..');

// Hash actual candidate bytes through Git's text filters, not HEAD (which would
// hide uncommitted edits). This agrees with repository blobs on LF/CRLF checkouts.
function worktreeBlob(file) {
  return execFileSync('git', ['hash-object', `--path=${file}`, file], {
    cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']
  }).trim();
}
function rawBlob(bytes) {
  return crypto.createHash('sha1').update(Buffer.from(`blob ${bytes.length}\0`)).update(bytes).digest('hex');
}

// Independent of Git clean filters: only the documented LF/CRLF text
// representation is allowed. Latin-1 preserves every other byte exactly.
function rawTextIdentityMatches(bytes, expected) {
  if (!/^[0-9a-f]{40}$/.test(expected || '')) return false;
  const lf = Buffer.from(bytes.toString('latin1').replace(/\r\n/g, '\n'), 'latin1');
  return rawBlob(bytes) === expected || rawBlob(lf) === expected;
}
module.exports = { worktreeBlob, rawBlob, rawTextIdentityMatches };
