'use strict';

// P27C trigger interpretation, independent of checkout line endings.
function workflowOnBlock(text) {
  text = text.replace(/\r\n/g, '\n');
  const marker = '\non:\n';
  const start = text.indexOf(marker);
  if (start < 0) return '';
  const bodyStart = start + marker.length;
  const permissions = text.indexOf('\npermissions:', bodyStart);
  return text.slice(bodyStart, permissions < 0 ? text.length : permissions);
}

function automaticMainAuthority(file, text) {
  const block = workflowOnBlock(text);
  const pullRequest = /^\s*pull_request\s*:/m.test(block);
  const push = /^\s*push\s*:/m.test(block);
  const mainBranch = /branches\s*:\s*\[[^\]]*\bmain\b[^\]]*\]/m.test(block) || /^\s*-\s*main\s*$/m.test(block);
  return { file, pullRequest, pushToMain: push && mainBranch, automatic: pullRequest || (push && mainBranch) };
}

module.exports = { automaticMainAuthority };
