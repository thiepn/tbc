'use strict';
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const ROOT = path.resolve(__dirname, '..');

// Hash actual candidate bytes through Git's text filters, not HEAD (which would
// hide uncommitted edits). This agrees with repository blobs on LF/CRLF checkouts.
function worktreeBlob(file) {
  return execFileSync('git', ['hash-object', `--path=${file}`, file], {
    cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']
  }).trim();
}
module.exports = { worktreeBlob };
