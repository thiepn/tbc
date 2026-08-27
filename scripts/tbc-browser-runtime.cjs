'use strict';
// Explicit local fallback only. CI uses the lockfile's bundled Chromium.
const channel = process.env.TBC_BROWSER_CHANNEL;
if (channel) {
  if (!['msedge', 'chrome'].includes(channel)) throw new Error('Unsupported TBC_BROWSER_CHANNEL');
  const { chromium } = require('playwright');
  const launch = chromium.launch.bind(chromium);
  chromium.launch = options => launch({ ...options, channel });
}
