#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const workerSource = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');
const ORIGIN = 'http://127.0.0.1:4173/';
const NEXT = 'tbc-offline-v3';
const OLD = 'tbc-pwa-v2';
const FUTURE = 'tbc-offline-v4';

function deferred() {
  let resolve, reject;
  const promise = new Promise((a, b) => { resolve = a; reject = b; });
  return {promise, resolve, reject};
}
function fixture(options = {}) {
  const stores = new Map();
  const deletions = [];
  let installs = 0, claimed = 0;
  const firstFailure = deferred();
  const key = request => new URL(request?.url || request, ORIGIN).href;
  const response = url => ({
    async json() { return {release: options.badRelease ? 'forged-v9' : 'v4.1.0'}; },
    url
  });
  class MemoryCache {
    constructor() { this.entries = new Map(); }
    async addAll(requests) {
      if (options.overlap && ++installs === 1) {
        await firstFailure.promise;
        throw new Error('simulated first installation 503');
      }
      for (const request of requests) this.entries.set(key(request), response(key(request)));
    }
    async match(request) { return this.entries.get(key(request)); }
    async put(request, value) { this.entries.set(key(request), value); }
    async keys() { return [...this.entries.keys()].map(url => ({url})); }
  }
  const caches = {
    async open(name) {
      if (!stores.has(name)) stores.set(name, new MemoryCache());
      return stores.get(name);
    },
    async keys() { return [...stores.keys()]; },
    async delete(name) { deletions.push(name); return stores.delete(name); }
  };
  function worker() {
    const handlers = new Map();
    const self = {
      location: new URL(ORIGIN + 'sw.js'),
      registration: {scope: ORIGIN, active:{state:'activated'}},
      clients: {async claim() { claimed++; }},
      addEventListener(name, callback) { handlers.set(name,callback); }
    };
    const context = {self,caches,URL,Request,Promise,Math,Date,setTimeout,
      Response:class {}};
    vm.runInNewContext(workerSource, context, {filename:'sw.js',timeout:10000});
    function event(name) {
      let promise;
      const handler = handlers.get(name);
      assert.ok(handler,'missing service worker '+name);
      handler({waitUntil(task) { promise = task; }});
      assert.ok(promise, 'worker '+name+' must extend its lifetime');
      return promise;
    }
    return {event};
  }
  return {worker,stores,caches,deletions,firstFailure,claimCount:()=>claimed,
    attempts:()=>installs};
}
async function main() {
  const f = fixture({overlap:true});
  const first = f.worker(), second = f.worker();
  const unsuccessful = first.event('install');
  // Ensure the first attempt owns its staging cache before second starts.
  for (let i=0; f.attempts() < 1 && i<100; i++) await Promise.resolve();
  assert.equal(f.attempts(),1,'first independent install did not start');
  await second.event('install');
  const complete = f.stores.get(NEXT);
  assert.ok(complete,'successful overlapping attempt did not publish a shell');
  const entries = complete.entries.size;
  assert.ok(entries >= 24,'successor shell is incomplete');
  f.firstFailure.resolve();
  await assert.rejects(unsuccessful,/simulated first installation 503/);
  assert.equal(f.stores.get(NEXT)?.entries.size,entries,
    'failed concurrent attempt must not delete successful shell');
  assert.ok(!f.deletions.includes(NEXT),
    'failed install must never delete a shared release cache');
  assert.ok((await f.caches.keys()).every(name => !name.startsWith('tbc-stage-')),
    'temporary installation cache must be removed on both outcomes');
  console.log('PASS overlapping failed 503 cannot erase a successful waiting shell');

  // The shipped v2 activate() deleted every tbc-pwa-* cache but its own.
  for (const name of await f.caches.keys()) {
    if (name.startsWith('tbc-pwa-') && name !== OLD) await f.caches.delete(name);
  }
  assert.ok(f.stores.has(NEXT), 'released v2 purge rule must not reach successor shell');
  console.log('PASS successor cache is isolated from shipped v2 activation purge');

  await f.caches.open(OLD);
  await f.caches.open(FUTURE);
  await second.event('activate');
  assert.ok(!f.stores.has(OLD), 'v3 activation must delete retired v2');
  assert.ok(f.stores.has(NEXT), 'v3 must retain current cache');
  assert.ok(f.stores.has(FUTURE), 'v3 must preserve a future waiting v4 cache');
  assert.ok(f.claimCount() > 0,'successful activation must claim clients');
  console.log('PASS active v3 retires v2 without deleting future v4');

  const bad = fixture({badRelease:true});
  await assert.rejects(bad.worker().event('install'),/identity invalid/);
  assert.ok(!bad.stores.has(NEXT) || bad.stores.get(NEXT).entries.size === 0,
    'forged release identity must never publish playable shell bytes');
  assert.ok((await bad.caches.keys()).every(name => !name.startsWith('tbc-stage-')),
    'failed identity check must clean only its own staging cache');
  console.log('PASS forged release identity fails closed before publication');
}
main().catch(error => {console.error('P30 INSTALL RACE: FAIL',error.stack || error);process.exitCode=1;});
