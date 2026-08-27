'use strict';
// Uses the exact main source to produce legacy fixtures; never edits its registry.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { chromium } = require('playwright');
const { ready, exact, snapshot, reloadExact, answerOne } = require('./tbc-preservation-repair.cjs');
const BASE = 'f84d5eff6a93046642c681e9163baa1b0b6b31a2';
const URL = 'http://127.0.0.1:4173/', SAVE = 'theBibleChallenge_v21', SESSION = SAVE + '_activeRound';
const OUT = path.resolve(__dirname, '../artifacts/preservation-repair');
const FIXTURE_IDS = ['v402.depth.deuteronomy-inventory-2', 'v402.depth.deuteronomy-inventory-5',
  'v402.depth.deuteronomy-inventory-8', 'v402.depth.ruth-inventory-3', 'event.samuel-call.place',
  'v402.depth.1-chronicles-inventory-4', 'v402.depth.2-chronicles-inventory-2',
  'v402.depth.psalms-inventory-12', 'v402.depth.psalms-inventory-16', 'v402.depth.jeremiah-inventory-9'];
const FIXTURE_SHA = 'b8d2c11b734c4758ca5a85d54a006fe430d75d3d94069d23f63be9e7199c4601';
const results = [];
async function check(name, fn) {
  try { const detail = await fn(); results.push({ name, passed: true, detail }); console.log('PASS', name); }
  catch (e) { results.push({ name, passed: false, error: e.message }); console.error('FAIL', name, e.message.slice(0, 1600)); }
}
async function open(browser, html) {
  const context = await browser.newContext({ timezoneId: 'Europe/Berlin', viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  await page.clock.setFixedTime(new Date('2026-08-27T12:00:00+02:00'));
  await page.addInitScript(() => { let seed = 1701; Math.random = () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 4294967296); });
  if (html) await page.route(URL, r => r.fulfill({ contentType: 'text/html', body: html }));
  await page.goto(URL); await ready(page);
  await page.locator('#modalRoot .modal-backdrop').getByRole('button').filter({ hasText: /Standard/i }).first().click();
  return page;
}
async function copies(page, primary, backup) {
  await page.evaluate(({ key, primary, backup }) => {
    for (const [store, value] of [[localStorage, primary], [sessionStorage, backup]]) {
      if (value === null) store.removeItem(key); else store.setItem(key, value);
    }
  }, { key: SESSION, primary, backup });
}
async function recover(page) {
  return page.evaluate(key => {
    const restored = restoreQuizSession();
    return { round: restored && serializeQuizSession(restored), primary: localStorage.getItem(key), backup: sessionStorage.getItem(key) };
  }, SESSION);
}
async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const baselineHtml = execFileSync('git', ['show', `${BASE}:index.html`], { maxBuffer: 32 * 1024 * 1024 }).toString();
  const browser = await chromium.launch({ headless: true });
  const report = { base: BASE, browser: browser.version(), channel: process.env.TBC_BROWSER_CHANNEL || 'bundled Chromium', results };
  try {
    const baseline = await open(browser, baselineHtml), page = await open(browser);
    const fixtures = await baseline.evaluate(ids => {
      startQuiz('quick', 10);
      const original = quiz, saved = [];
      for (const id of ids) { quiz = { ...original, questions: [v25QuestionSource(id)] }; saved.push(serializeQuizSession()); }
      const legacy = { ...saved[0], questions: saved.map(s => s.questions[0]) };
      const accepted = [], rejected = [];
      const aliases = TBC_QB0.registry().filter(r => TBC_QB6.aliasInfo(r.itemId));
      for (const row of aliases) {
        const question = v25QuestionSource(row.itemId); if (!question) { rejected.push(row.itemId); continue; }
        quiz = { ...original, questions: [question] };
        const raw = serializeQuizSession();
        if (hydrateQuizSession(structuredClone(raw))) accepted.push(raw); else rejected.push(row.itemId);
      }
      quiz = original;
      return { legacy, accepted, rejected, aliasCount: aliases.length, legacyAccepted: !!hydrateQuizSession(structuredClone(legacy)), canonicalAccepted: !!hydrateQuizSession(serializeQuizSession()) };
    }, FIXTURE_IDS);
    report.baseline = { aliases: fixtures.aliasCount, accepted: fixtures.accepted.length, rejected: fixtures.rejected, canonicalSeed1701Accepted: fixtures.canonicalAccepted };
    const legacy = fixtures.legacy, legacyText = JSON.stringify(legacy);
    await check('exact review fixture is unchanged and accepted by main', async () => {
      assert.equal(crypto.createHash('sha256').update(legacyText).digest('hex'), FIXTURE_SHA);
      assert.equal(fixtures.legacyAccepted, true); assert.equal(legacy.questions.length, 10);
      await copies(baseline, legacyText, legacyText); await baseline.reload(); await ready(baseline);
      assert.deepEqual((await snapshot(baseline)).questions.map(q => q.itemId), FIXTURE_IDS);
      return { sha256: FIXTURE_SHA };
    });
    await check('every main-accepted retained-alias fixture remains accepted', async () => {
      const restored = await page.evaluate(raws => raws.map(raw => {
        const round = hydrateQuizSession(structuredClone(raw)); return round && serializeQuizSession(round);
      }), fixtures.accepted);
      for (let i=0;i<restored.length;i++) assert.deepEqual(exact(restored[i]), exact(fixtures.accepted[i]), fixtures.accepted[i].questions[0].itemId);
      return { tested: fixtures.aliasCount, mainAccepted: fixtures.accepted.length };
    });
    await page.evaluate(() => { setSetting('autoNext', false); startQuiz('quick', 10); });
    const canonical = await snapshot(page), canonicalText = JSON.stringify(canonical);
    await check('all 203 prepared structured identities restore and insertion tampering is rejected', async () => {
      const detail = await page.evaluate(() => {
        const failures = [], negative = [];
        for (const item of TBC_QB8.canonicalStructured()) {
          const question = TBC_QB8.prepare(v25QuestionSource(item.itemId));
          const raw = serializeQuizSession({ ...quiz, questions: [question] });
          const restored = hydrateQuizSession(structuredClone(raw));
          if (!restored || JSON.stringify(serializeQuizSession(restored).questions[0].options) !== JSON.stringify(raw.questions[0].options)) failures.push(item.itemId);
          if (question.interaction === 'insertion') for (const field of ['options','insertionAnchors','insertionItem','answer']) {
            const bad = structuredClone(raw);
            if (Array.isArray(bad.questions[0][field])) bad.questions[0][field][0] += ' corrupt'; else bad.questions[0][field] += ' corrupt';
            if (hydrateQuizSession(bad)) negative.push({ id: item.itemId, field });
          }
        }
        return { count: TBC_QB8.canonicalStructured().length, failures, negative };
      });
      assert.equal(detail.count, 203); assert.deepEqual(detail.failures, []); assert.deepEqual(detail.negative, []); return detail;
    });
    await check('supported sessions validate without registering saved question records', async () => {
      const unchanged = await page.evaluate(raws => {
        const before = new Map(V18_QUESTION_MAP);
        for (const raw of raws) if (!hydrateQuizSession(structuredClone(raw))) return false;
        return before.size === V18_QUESTION_MAP.size && [...before].every(([id, row]) => V18_QUESTION_MAP.get(id) === row);
      }, [canonical, legacy]); assert.equal(unchanged, true);
    });
    await check('current canonical-ID Quick Play restores exactly', async () => { await reloadExact(page, canonical); });
    await check('exact legacy alias-ID Quick Play restores without replacing IDs', async () => {
      await copies(page, legacyText, legacyText); await reloadExact(page, legacy);
    });
    const mixed = { ...legacy, questions: [...canonical.questions.slice(0, 5), ...legacy.questions.slice(5)] };
    await check('mixed canonical and retained-alias IDs restore', async () => {
      await copies(page, JSON.stringify(mixed), JSON.stringify(mixed)); await reloadExact(page, mixed);
    });
    const unknown = structuredClone(legacy); unknown.questions[0].itemId = 'unsupported.alias';
    for (const [name, primary, backup, expected] of [
      ['primary invalid, backup valid', JSON.stringify(unknown), legacyText, legacy],
      ['primary valid, backup invalid', legacyText, '{broken', legacy],
      ['both valid retain primary precedence', canonicalText, legacyText, canonical]
    ]) await check(name, async () => {
      await copies(page, primary, backup); const result = await recover(page);
      assert.deepEqual(exact(result.round), exact(expected));
      assert.ok(JSON.parse(result.primary)); assert.ok(JSON.parse(result.backup));
      if (name.startsWith('both')) { assert.equal(result.primary, primary); assert.equal(result.backup, backup); }
    });
    await check('both copies are evaluated before any storage mutation', async () => {
      await copies(page, '{broken', legacyText);
      const events = await page.evaluate(() => {
        const events = [], hydrate = hydrateQuizSession, set = Storage.prototype.setItem, remove = Storage.prototype.removeItem;
        hydrateQuizSession = raw => { events.push('hydrate'); return hydrate(raw); };
        Storage.prototype.setItem = function(...args) { if (args[0] === 'theBibleChallenge_v21_activeRound') events.push('write'); return set.apply(this,args); };
        Storage.prototype.removeItem = function(...args) { if (args[0] === 'theBibleChallenge_v21_activeRound') events.push('remove'); return remove.apply(this,args); };
        try { restoreQuizSession(); } finally { hydrateQuizSession = hydrate; Storage.prototype.setItem = set; Storage.prototype.removeItem = remove; }
        return events;
      });
      assert.ok(events.indexOf('hydrate') < events.indexOf('write'), JSON.stringify(events)); assert.ok(!events.includes('remove'), JSON.stringify(events));
    });
    await check('failed primary repair cannot destroy the valid backup', async () => {
      await copies(page, '{broken', legacyText);
      const result = await page.evaluate(key => {
        const set = Storage.prototype.setItem;
        Storage.prototype.setItem = function(...args) { if (this === localStorage) throw Error('quota fixture'); return set.apply(this,args); };
        try { return { restored: !!restoreQuizSession(), backup: sessionStorage.getItem(key) }; }
        finally { Storage.prototype.setItem = set; }
      }, SESSION);
      assert.equal(result.restored, true); assert.equal(result.backup, legacyText);
    });
    await check('unknown aliases rejected without registering saved content', async () => {
      assert.deepEqual(await page.evaluate(raw => ({ accepted: !!hydrateQuizSession(raw), registered: V18_QUESTION_MAP.has(raw.questions[0].itemId) }), unknown), { accepted: false, registered: false });
    });
    await check('invalid primary cannot poison the backup through legacy registration', async () => {
      const invalid = structuredClone(unknown); invalid.mode = 'unsupported-mode';
      await copies(page, JSON.stringify(invalid), legacyText);
      const result = await recover(page);
      assert.deepEqual(exact(result.round), exact(legacy));
      assert.equal(await page.evaluate(id => V18_QUESTION_MAP.has(id), invalid.questions[0].itemId), false);
    });
    for (const defect of ['ambiguous', 'ambiguous-targets', 'removed', 'conflicting', 'removed-target']) await check(`${defect} alias registry identity is rejected`, async () => {
      const accepted = await page.evaluate(({ raw, defect }) => {
        const qb0 = TBC_QB0, qb6 = TBC_QB6, id = raw.questions[0].itemId, target = qb6.canonicalId(id);
        if (defect === 'ambiguous') window.TBC_QB0 = { ...qb0, registry: () => [...qb0.registry(), qb0.record(id)] };
        if (defect === 'ambiguous-targets') window.TBC_QB6 = { ...qb6, aliasInfo: key => key === id ? { canonicalId: [target, qb6.canonicalId(raw.questions[1].itemId)] } : qb6.aliasInfo(key) };
        if (defect === 'removed' || defect === 'removed-target') window.TBC_QB0 = { ...qb0, registry: () => qb0.registry().filter(r => r.itemId !== (defect === 'removed' ? id : target)) };
        if (defect === 'conflicting') window.TBC_QB6 = { ...qb6, aliasInfo: key => key === id ? { canonicalId: raw.questions[1].itemId } : qb6.aliasInfo(key) };
        try { return !!hydrateQuizSession(raw); } finally { window.TBC_QB0 = qb0; window.TBC_QB6 = qb6; }
      }, { raw: legacy, defect }); assert.equal(accepted, false);
    });
    await check('genuinely changed alias content and authoritative source are rejected', async () => {
      const accepted = await page.evaluate(raw => {
        const output = {};
        for (const field of ['prompt', 'display', 'answer', 'reference', 'difficulty']) {
          const bad = structuredClone(raw); bad.questions[0][field] += ' changed'; output[field] = !!hydrateQuizSession(bad);
        }
        const source = v25QuestionSource;
        try { v25QuestionSource = id => { const q = source(id); return id === raw.questions[0].itemId ? { ...q, answer: 'changed library' } : q; }; output.library = !!hydrateQuizSession(raw); }
        finally { v25QuestionSource = source; }
        return output;
      }, legacy); assert.ok(Object.values(accepted).every(v => v === false), JSON.stringify(accepted));
    });
    await check('corrupt payloads do not crash startup or erase progress', async () => {
      const progress = await page.evaluate(key => localStorage.getItem(key), SAVE);
      await copies(page, '{broken', 'null'); await page.reload(); await ready(page);
      assert.equal(await page.evaluate(() => serializeQuizSession()), null);
      assert.equal(await page.evaluate(key => localStorage.getItem(key), SAVE), progress);
    });
    await check('legacy round answers, score and progress survive repeated reloads', async () => {
      await copies(page, legacyText, legacyText); await reloadExact(page, legacy);
      await answerOne(page); const answered = await snapshot(page);
      await reloadExact(page, answered); await reloadExact(page, answered);
      await page.evaluate(() => nextQuestion()); await answerOne(page);
    });
    await check('real export/import preserves a supported legacy active round', async () => {
      await copies(page, legacyText, legacyText); await reloadExact(page, legacy); await answerOne(page);
      const before = await snapshot(page), downloadEvent = page.waitForEvent('download'); await page.evaluate(() => exportProgress());
      const download = await downloadEvent, stream = await download.createReadStream(), chunks = [];
      for await (const chunk of stream) chunks.push(chunk);
      const payload = JSON.parse(Buffer.concat(chunks).toString());
      assert.equal(payload.state.schemaVersion, 27); assert.deepEqual(exact(payload.activeRound), exact(before));
      await page.evaluate(async data => v296ImportProgress({ currentTarget: { files: [new File([JSON.stringify(data)], 'legacy.json')], value: 'fixture' } }), payload);
      assert.deepEqual(exact(await snapshot(page)), exact(before)); await reloadExact(page, before);
    });
    await check('invalid imported round preserves both existing recovery copies', async () => {
      await copies(page, canonicalText, legacyText);
      const before = await page.evaluate(key => localStorage.getItem(key), SAVE);
      await page.evaluate(async raw => v296ImportProgress({ currentTarget: { files: [new File([JSON.stringify({ state, activeRound: raw })], 'bad.json')], value: 'fixture' } }), unknown);
      assert.equal(await page.evaluate(key => localStorage.getItem(key), SAVE), before);
      assert.deepEqual(await page.evaluate(key => [localStorage.getItem(key), sessionStorage.getItem(key)], SESSION), [canonicalText, legacyText]);
    });
    await check('unavailable secondary storage does not block a valid primary import', async () => {
      const result = await page.evaluate(async raw => {
        const descriptor = Object.getOwnPropertyDescriptor(window, 'sessionStorage');
        Object.defineProperty(window, 'sessionStorage', { configurable: true, get() { throw Error('unavailable secondary fixture'); } });
        try {
          await v296ImportProgress({ currentTarget: { files: [new File([JSON.stringify({ state, activeRound: raw })], 'legacy.json')], value: 'fixture' } });
          return serializeQuizSession();
        } finally { Object.defineProperty(window, 'sessionStorage', descriptor); }
      }, legacy);
      assert.deepEqual(exact(result), exact(legacy));
    });
    await check('fresh selection remains canonical at every tier', async () => {
      const bad = await page.evaluate(() => {
        const result = [], previous = state.settings.difficulty;
        try { for (const tier of ['beginner','easy','standard','advanced','expert']) {
          state.settings.difficulty = tier;
          for (let i=0;i<3;i++) for (const q of buildQuestions('quick',10)) if (TBC_QB6.aliasInfo(q.itemId)||!TBC_QB0.record(q.itemId)||q.difficulty!==tier) result.push(q.itemId);
        } } finally { state.settings.difficulty = previous; }
        return result;
      }); assert.deepEqual(bad, []);
    });
    await check('all authored question-type progress survives sanitation with bounds intact', async () => {
      const detail = await page.evaluate(() => {
        const types = [...new Set([...TBC_QB0.registry().map(r => r.source.type), ...TBC_QB6.activeQuestions().map(q => q.type)])], raw = structuredClone(state);
        const invalid = ['unknown-type', 'unexpected2', 'bad--type', 'a'.repeat(21)];
        raw.stats.typeStats = Object.fromEntries([...types, ...invalid].map(type => [type, { total: 3, correct: 7 }]));
        raw.recentTypes = types.slice(-10);
        const clean = sanitizeState(raw);
        return { types: types.length, lost: types.filter(type => clean.stats.typeStats[type]?.total !== 3 || clean.stats.typeStats[type]?.correct !== 3),
          admittedInvalid: invalid.filter(type => Object.hasOwn(clean.stats.typeStats, type)), recentBefore: raw.recentTypes, recentAfter: clean.recentTypes };
      });
      assert.deepEqual(detail.lost, []); assert.deepEqual(detail.admittedInvalid, []); assert.deepEqual(detail.recentAfter, detail.recentBefore);
      return { types: detail.types };
    });
  } finally { await browser.close(); }
  report.passed = results.every(r => r.passed);
  fs.writeFileSync(path.join(OUT, 'session-compatibility.json'), JSON.stringify(report, null, 2)+'\n');
  console.log(`SESSION COMPATIBILITY: ${results.filter(r=>r.passed).length}/${results.length}`);
  if (!report.passed) process.exitCode = 1;
}
main().catch(e => { console.error(e); process.exitCode = 1; });
