'use strict';
// Direct regression matrix. Run with the read-only Stage 0 server on port 4173.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const SAVE = 'theBibleChallenge_v21', SESSION = SAVE + '_activeRound';
const OUT = path.resolve(__dirname, '../artifacts/preservation-repair');
const results = [];
const TIERS = ['beginner', 'easy', 'standard', 'advanced', 'expert'];
const COUNTS = { quick: 10, daily: 5, weekly: 15 };
const FIXED = new Date('2026-08-27T12:00:00+02:00');

async function ready(page) {
  await page.waitForFunction(() => window.TBC_QB11?.installed && window.TBC_P1B?.audit?.().ready && document.querySelector('#boot')?.classList.contains('hidden'));
}
async function open(browser, tier = 'standard', mobile = false) {
  const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 }, timezoneId: 'Europe/Berlin' });
  const page = await context.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.clock.setFixedTime(FIXED);
  await page.addInitScript(() => { let seed = 1701; Math.random = () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 4294967296); });
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
  await ready(page);
  await page.locator('#modalRoot .modal-backdrop').getByRole('button').filter({ hasText: /Standard/i }).first().click();
  await page.evaluate(tier => { setSetting('difficulty', tier); setSetting('autoNext', false); }, tier);
  return { context, page, errors };
}
async function launch(page, mode, mobile = false) {
  const nav = mobile ? '.pr5-mobile-nav' : '.pr5-primary-nav';
  await page.locator(`${nav} [data-pr5-nav="play"]`).click();
  await page.locator('.pr6-root:not([hidden]) [data-pr6-action="quick-start"]').first().click();
  await page.getByRole('button', { name: { quick: 'Start Quick Play', daily: 'Daily Five', weekly: 'Weekly Challenge' }[mode], exact: true }).click();
  await page.waitForFunction(mode => quiz?.mode === mode && screen === 'quiz', mode);
  assert.equal(new URL(page.url()).hash, '#quiz');
  assert.ok(await page.evaluate(() => document.body.innerText.includes(currentQuestion().prompt)), 'current prompt must be rendered');
  assert.equal(await page.locator('.pr7-root:not([hidden])').count(), 0);
  assert.equal(await page.locator('.pr6-root:not([hidden])').count(), 0);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'no horizontal overflow');
}
async function snapshot(page) { return page.evaluate(() => { saveQuizSession(); return serializeQuizSession(); }); }
// Boot intentionally resets qStarted for an unanswered question. All question
// identity, order, answer state, origin, totals and start time must survive.
function exact(round) {
  if (!round) return null;
  const fields = ['mode', 'scope', 'stageId', 'phase', 'origin', 'difficulty', 'index', 'correct', 'wrong', 'score', 'streak', 'bestStreak', 'missed', 'missedDetails', 'answered', 'selected', 'usedHint', 'started', 'assists'];
  const questionFields = ['itemId', 'verseId', 'type', 'label', 'prompt', 'display', 'answer', 'options', 'explanation', 'reference', 'difficulty', 'interaction', 'knowledgeIds', 'sequenceItems', 'sequenceOrder', 'matchPairs', 'matchChoices', 'insertionItem', 'insertionAnchors', 'selected', 'correct', 'responseMode', 'v28XpAwarded', 'v28XpAward'];
  const pick = (obj, keys) => Object.fromEntries(keys.map(key => [key, obj[key] ?? null]));
  return { ...pick(round, fields), questions: round.questions.map(q => ({ ...pick(q, questionFields), matchDraft: q.matchDraft || {}, hidden: q.hidden || [] })) };
}
async function reloadExact(page, before) {
  const progress = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), SAVE);
  await page.reload({ waitUntil: 'domcontentloaded' }); await ready(page);
  const restored = await page.evaluate(() => serializeQuizSession());
  assert.deepEqual(exact(restored), exact(before), 'automatic restoration must preserve the exact active round');
  assert.equal(new URL(page.url()).hash, '#quiz');
  assert.ok(await page.evaluate(() => document.body.innerText.includes(currentQuestion().prompt)));
  const after = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), SAVE);
  for (const key of ['stats', 'daily', 'weekly', 'gameProgress']) assert.deepEqual(after[key], progress[key], `reload must not award ${key}`);
  return restored;
}
async function answerOne(page, correct = true) {
  const before = await page.evaluate(() => ({ count: state.stats.questions, correct: quiz.correct, wrong: quiz.wrong }));
  await page.evaluate(correct => { const q = currentQuestion(); answer(correct ? q.answer : q.options.find(x => x !== q.answer)); }, correct);
  assert.deepEqual(await page.evaluate(() => ({ count: state.stats.questions, correct: quiz.correct, wrong: quiz.wrong })),
    { count: before.count + 1, correct: before.correct + Number(correct), wrong: before.wrong + Number(!correct) });
  await page.evaluate(() => answer(currentQuestion().answer));
  assert.equal(await page.evaluate(() => state.stats.questions), before.count + 1, 'duplicate answer must not count');
}
async function finish(page, count) {
  for (let i = 0; i < count; i++) {
    if (!(await page.evaluate(() => quiz.answered))) await answerOne(page);
    await page.evaluate(() => nextQuestion());
    if (await page.evaluate(() => quiz?.finished === true)) return;
  }
  assert.fail('round did not finish');
}
async function deterministic(page, mode) {
  return page.evaluate(mode => {
    const key = mode === 'weekly' ? v20WeekKey() : null;
    const identity = qs => qs.map(q => ({ id: q.itemId, options: q.options, answer: q.answer, sequenceOrder: q.sequenceOrder, matchChoices: q.matchChoices }));
    const before = identity(buildQuestions(mode, mode === 'daily' ? 5 : 15, key));
    buildQuestions('quick', 10); buildQuestions('challenge', 15, 'mixed');
    const after = identity(buildQuestions(mode, mode === 'daily' ? 5 : 15, key));
    return { before, after };
  }, mode);
}
async function check(browser, name, tier, mobile, fn) {
  let context;
  try {
    const opened = await open(browser, tier, mobile); context = opened.context;
    const detail = await fn(opened.page);
    assert.deepEqual(opened.errors, [], 'no browser page errors');
    results.push({ name, passed: true, detail }); console.log(`PASS ${name}`);
  } catch (error) {
    results.push({ name, passed: false, error: error.message }); console.error(`FAIL ${name}: ${error.message.slice(0, 1200)}`);
  } finally { await context?.close(); }
}
async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true }), browserVersion = browser.version();
  try {
    for (const tier of TIERS) for (const mode of Object.keys(COUNTS)) {
      await check(browser, `${mode} ${tier}: launch, deterministic identity, two reloads and continued answers`, tier, false, async page => {
        let identity;
        if (mode !== 'quick') { identity = await deterministic(page, mode); assert.deepEqual(identity.after, identity.before, 'practice history must not change recurring identity'); }
        await launch(page, mode);
        const first = await snapshot(page);
        assert.equal(first.questions.length, COUNTS[mode]); assert.equal(first.difficulty, tier);
        assert.ok(first.questions.every(q => q.difficulty === tier), 'exact selected tier');
        assert.equal(new Set(first.questions.map(q => q.itemId)).size, COUNTS[mode]);
        if (identity) assert.deepEqual(first.questions.map(q => q.itemId), identity.before.map(q => q.id));
        await reloadExact(page, first);
        await answerOne(page);
        await reloadExact(page, await snapshot(page));
        await page.evaluate(() => nextQuestion()); await answerOne(page);
        if (mode !== 'quick' && tier === 'standard') {
          const progressBefore = await page.evaluate(() => state.stats.rounds);
          await finish(page, COUNTS[mode]);
          assert.equal(await page.evaluate(() => state.stats.rounds), progressBefore + 1);
          const rec = await page.evaluate(mode => mode === 'daily' ? state.daily[dateKey()] : state.weekly[v20WeekKey()], mode);
          assert.equal(rec.attempts, 1); assert.equal(mode === 'daily' ? rec.correct : rec.first, COUNTS[mode]);
          const stateBeforeDuplicate = await page.evaluate(() => ({ stats: state.stats, daily: state.daily, weekly: state.weekly, gameProgress: state.gameProgress }));
          await page.evaluate(() => finishQuiz());
          assert.deepEqual(await page.evaluate(() => ({ stats: state.stats, daily: state.daily, weekly: state.weekly, gameProgress: state.gameProgress })), stateBeforeDuplicate);
          assert.equal(await page.evaluate(key => localStorage.getItem(key), SESSION), null);
          await page.reload(); await ready(page);
          assert.equal(await page.evaluate(() => serializeQuizSession()), null);
          assert.deepEqual(await page.evaluate(mode => mode === 'daily' ? state.daily[dateKey()] : state.weekly[v20WeekKey()], mode), rec);
          await launch(page, mode);
          assert.deepEqual((await snapshot(page)).questions.map(q => q.itemId), first.questions.map(q => q.itemId));
          await answerOne(page, false); await finish(page, COUNTS[mode]);
          const replay = await page.evaluate(mode => mode === 'daily' ? state.daily[dateKey()] : state.weekly[v20WeekKey()], mode);
          assert.equal(replay.attempts, 2); assert.equal(mode === 'daily' ? replay.correct : replay.first, COUNTS[mode]);
          if (mode === 'daily') { assert.equal(replay.last, 4); assert.equal(await page.evaluate(() => state.stats.daily), 1); }
          else assert.equal(replay.best, 15);
          await page.clock.setFixedTime(new Date('2026-09-03T12:00:00+02:00'));
          const nextPeriod = await deterministic(page, mode);
          assert.deepEqual(nextPeriod.before, nextPeriod.after); assert.notDeepEqual(nextPeriod.before, identity.before);
        }
        return { count: first.questions.length, tier, schema: await page.evaluate(key => JSON.parse(localStorage.getItem(key)).schemaVersion, SAVE) };
      });
    }
    await check(browser, 'Quick Play: changed questions, invalid identity, corrupt copies and import adjacency', 'standard', false, async page => {
      await launch(page, 'quick'); const saved = await snapshot(page);
      const rejected = await page.evaluate(raw => {
        const checks = {};
        for (const field of ['prompt', 'display', 'answer', 'reference', 'difficulty', 'itemId']) {
          const bad = structuredClone(raw); bad.questions[0][field] += ' corrupt'; checks[field] = hydrateQuizSession(bad) === null;
        }
        const badOptions = structuredClone(raw); badOptions.questions[0].options[0] = 'corrupt option'; checks.options = hydrateQuizSession(badOptions) === null;
        const badTotals = structuredClone(raw); badTotals.correct = 5; checks.totals = hydrateQuizSession(badTotals) === null;
        const original = v25QuestionSource, target = raw.questions[0].itemId;
        try { v25QuestionSource = id => { const q = original(id); return id === target ? { ...q, answer: q.options.find(x => x !== q.answer) } : q; }; checks.changedLibrary = hydrateQuizSession(raw) === null; }
        finally { v25QuestionSource = original; }
        return checks;
      }, saved);
      assert.ok(Object.values(rejected).every(Boolean), JSON.stringify(rejected));
      await page.evaluate(({ key, raw }) => { localStorage.setItem(key, '{broken'); sessionStorage.setItem(key, JSON.stringify(raw)); }, { key: SESSION, raw: saved });
      await reloadExact(page, saved);
      // Invalid import must preserve both progress and a healthy live round.
      const prior = await snapshot(page), progress = await page.evaluate(key => localStorage.getItem(key), SAVE);
      await page.evaluate(async () => v296ImportProgress({ currentTarget: { files: [new File(['{"invalid":true}'], 'invalid.json')], value: 'fixture' } }));
      assert.equal(await page.evaluate(key => localStorage.getItem(key), SAVE), progress);
      assert.deepEqual(exact(await snapshot(page)), exact(prior));
      await page.evaluate(key => { localStorage.setItem(key, '{broken'); sessionStorage.setItem(key, '{broken'); }, SESSION);
      await page.reload(); await ready(page);
      assert.equal(await page.evaluate(() => serializeQuizSession()), null);
      assert.equal(await page.evaluate(key => localStorage.getItem(key), SESSION), null);
      assert.equal(await page.evaluate(key => sessionStorage.getItem(key), SESSION), null);
      assert.equal(await page.evaluate(key => localStorage.getItem(key), SAVE), progress);
      await launch(page, 'quick'); await answerOne(page);
      return rejected;
    });
    for (const mode of Object.keys(COUNTS)) await check(browser, `${mode} mobile: navigation, rendering, reload and leave confirmation`, 'standard', true, async page => {
      await launch(page, mode, true); await reloadExact(page, await snapshot(page)); await answerOne(page);
      await page.screenshot({ path: path.join(OUT, `mobile-${mode}.png`), fullPage: true });
      await page.evaluate(() => quitQuiz());
      await page.getByRole('button', { name: 'Continue playing', exact: true }).click();
      assert.equal(await page.evaluate(() => quiz.mode), mode);
      await page.evaluate(() => quitQuiz());
      await page.locator('#modalRoot').getByRole('button', { name: /^Return to/ }).click();
      assert.equal(await page.evaluate(() => serializeQuizSession()), null);
      await page.locator('.pr5-mobile-nav [data-pr5-nav="library"]').click();
      await page.waitForFunction(() => document.body.dataset.pr7Flow === 'library');
      await launch(page, mode, true);
      return { mode, width: 390 };
    });
  } finally { await browser.close(); }
  const passed = results.every(r => r.passed);
  fs.writeFileSync(path.join(OUT, 'regressions.json'), JSON.stringify({ browserVersion, browserChannel: process.env.TBC_BROWSER_CHANNEL || 'bundled Chromium', passed, results }, null, 2) + '\n');
  console.log(`PRESERVATION REPAIR: ${results.filter(r => r.passed).length}/${results.length}`);
  if (!passed) process.exitCode = 1;
}
module.exports = { ready, open, launch, exact, snapshot, reloadExact, answerOne };
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
