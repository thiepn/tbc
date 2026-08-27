'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const BASE = 'http://127.0.0.1:4173/';
const SAVE = 'theBibleChallenge_v21';
const SESSION = SAVE + '_activeRound';
const results = [];

async function open(browser, coreOnly = false) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  // Reproducible test selection; never applied to product files or user profiles.
  await page.addInitScript(() => { let seed = 1701; Math.random = () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 4294967296); });
  if (coreOnly) await page.route('**/assets/**', route => route.abort());
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.TBC_QB11?.installed === true);
  if (!coreOnly) await page.waitForFunction(() => window.TBC_P1B?.audit?.().ready === true);
  const chooser = page.locator('#modalRoot .modal-backdrop');
  await chooser.getByRole('button').filter({ hasText: /Standard/i }).first().click();
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('theBibleChallenge_v21')).onboarded === true);
  return { context, page };
}

async function check(browser, name, fn, coreOnly = false) {
  let context;
  try {
    const opened = await open(browser, coreOnly); context = opened.context;
    const detail = await fn(opened.page, context);
    results.push({ name, passed: true, detail }); console.log(`PASS ${name}`);
  } catch (error) {
    results.push({ name, passed: false, error: error.message, stack: error.stack }); console.error(`FAIL ${name}: ${error.message}`);
  } finally { if (context) await context.close(); }
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const version = browser.version();
  try {
    await check(browser, 'authoritative runtime bank, Journey, Learning Path and Campaign counts', async page => {
      const counts = await page.evaluate(() => {
        const qs = TBC_QB6.activeQuestions();
        return { canonical: qs.length, registry: TBC_QB0.registry().length,
          structured: TBC_QB8.canonicalStructured().length,
          journey: TBC_LEARNING_PATH.foundationStages.length, learningPath: TBC_LEARNING_PATH.stages.length,
          missions: V29_CAMPAIGN_MASTERY.missions.length, arcs: V29_CAMPAIGN_MASTERY.arcs.length,
          schema: JSON.parse(localStorage.getItem('theBibleChallenge_v21')).schemaVersion };
      });
      assert.equal(counts.canonical, 5799); assert.equal(counts.registry, 6072); assert.equal(counts.structured, 203);
      assert.equal(counts.journey, 25); assert.equal(counts.learningPath, 63);
      assert.equal(counts.missions, 72); assert.equal(counts.arcs, 12); assert.equal(counts.schema, 27);
      // P2A checks all 66 books; the existing P1B browser suite renders and
      // counts all 66 book shortcuts and 22 collections on desktop and mobile.
      return counts;
    });

    await check(browser, 'schema-26 migration and schema-27 five-tier preservation', async page => {
      const actual = await page.evaluate(() => {
        const raw = JSON.parse(localStorage.getItem('theBibleChallenge_v21'));
        return [26,27].flatMap(schemaVersion => ['beginner','easy','standard','advanced','expert'].map(difficulty => {
          const value = sanitizeState({ ...raw, schemaVersion, settings: { ...raw.settings, difficulty }, stats: { ...raw.stats, questions: 37, correct: 29 } });
          return { schemaVersion, difficulty, result: value.settings.difficulty, questions: value.stats.questions, correct: value.stats.correct };
        }));
      });
      for (const row of actual) {
        assert.equal(row.result, row.schemaVersion === 26 && ['beginner','easy'].includes(row.difficulty) ? 'standard' : row.difficulty);
        assert.equal(row.questions, 37); assert.equal(row.correct, 29);
      }
      return actual;
    });

    await check(browser, 'actual export/import roundtrip, legacy import and rejected-import rollback', async page => {
      const downloadPromise = page.waitForEvent('download');
      await page.evaluate(() => exportProgress());
      const download = await downloadPromise;
      const stream = await download.createReadStream(); const chunks = [];
      for await (const chunk of stream) chunks.push(chunk);
      const exported = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      assert.equal(exported.app, 'The Bible Challenge'); assert.equal(exported.state.schemaVersion, 27);
      const importData = data => page.evaluate(async incoming => {
        const file = new File([JSON.stringify(incoming)], 'stage0-save.json', { type: 'application/json' });
        await v296ImportProgress({ currentTarget: { files: [file], value: 'fixture' } });
        return JSON.parse(localStorage.getItem('theBibleChallenge_v21'));
      }, data);
      const candidate = structuredClone(exported);
      candidate.state.stats.questions = 37; candidate.state.stats.correct = 29; candidate.state.settings.difficulty = 'easy';
      const imported = await importData(candidate);
      assert.equal(imported.stats.questions, 37); assert.equal(imported.stats.correct, 29); assert.equal(imported.settings.difficulty, 'easy');
      assert.ok(await page.evaluate(() => Object.keys(localStorage).some(key => /import.*backup/i.test(key))));
      await page.reload(); await page.waitForFunction(() => window.TBC_QB11?.installed);
      assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('theBibleChallenge_v21')).stats.questions), 37);
      const before = await page.evaluate(() => localStorage.getItem('theBibleChallenge_v21'));
      await importData({ incompatibleStage0Fixture: true });
      assert.equal(await page.evaluate(() => localStorage.getItem('theBibleChallenge_v21')), before, 'invalid import must not overwrite progress');
      const legacy = await importData({ difficulty: 'easy', questionCount: 10, stats: { questions: 17, correct: 11 } });
      assert.equal(legacy.settings.difficulty, 'standard'); assert.equal(legacy.stats.questions, 17); assert.equal(legacy.stats.correct, 11);
      return { exportSchema: 27, importedQuestions: 37, legacyQuestions: 17, invalidImportPreserved: true };
    });

    await check(browser, 'Quick Play active-session restoration after reload', async page => {
      await page.evaluate(() => TBC_PR6.open('quick'));
      await page.locator('[data-pr6-action="quick-start"]').click();
      await page.getByRole('button', { name: 'Start Quick Play', exact: true }).click();
      await page.waitForFunction(() => serializeQuizSession()?.questions?.length === 10);
      await page.evaluate(() => saveQuizSession());
      const snapshot = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), SESSION);
      assert.equal(snapshot.mode, 'quick'); assert.equal(snapshot.questions.length, 10);
      assert.ok(await page.evaluate(key => sessionStorage.getItem(key) !== null, SESSION));
      await page.reload(); await page.waitForFunction(() => window.TBC_QB11?.installed && window.TBC_P1B?.audit?.().ready);
      const restored = await page.evaluate(() => {
        const round = restoreQuizSession();
        return round ? { mode: round.mode, index: round.index, ids: round.questions.map(q => q.itemId) } : null;
      });
      assert.ok(restored, 'a freshly saved real Quick Play round must survive reload');
      assert.equal(restored.mode, snapshot.mode); assert.equal(restored.index, snapshot.index);
      assert.deepEqual(restored.ids, snapshot.questions.map(q => q.itemId));
      return { mode: restored.mode, questions: restored.ids.length };
    });

    for (const [mode, count] of [['daily', 5], ['weekly', 15]]) {
      await check(browser, `${mode === 'daily' ? 'Daily Five' : 'Weekly Challenge'} launch`, async page => {
        const round = await page.evaluate(mode => {
          if (mode === 'daily') startQuiz('daily', 5); else startWeekly();
          const snapshot = serializeQuizSession();
          return { mode: snapshot?.mode || null, count: snapshot?.questions?.length || 0, destination: location.hash };
        }, mode);
        assert.equal(round.mode, mode, `expected ${mode} round; actual destination ${round.destination}`);
        assert.equal(round.count, count);
        return round;
      });
    }

    await check(browser, 'embedded core boots without enhancement assets and works offline after load', async (page, context) => {
      await context.setOffline(true);
      await page.evaluate(() => v292Go('play', 'now'));
      await page.getByRole('button', { name: 'Start Quick Play', exact: true }).click();
      const result = await page.evaluate(() => {
        save();
        return { count: TBC_QB6.activeQuestions().length, quick: serializeQuizSession()?.questions?.length,
          saved: Boolean(localStorage.getItem('theBibleChallenge_v21')) };
      });
      assert.deepEqual(result, { count: 5799, quick: 10, saved: true });
      return { ...result, limitation: 'Not a hosted offline-refresh or all-mode offline certification.' };
    }, true);
  } finally { await browser.close(); }
  const passed = results.every(row => row.passed);
  const out = path.resolve(__dirname, '../artifacts/recovery-stage0'); fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'invariants.json'), JSON.stringify({ browserVersion: version, browserChannel: process.env.TBC_BROWSER_CHANNEL || 'bundled Chromium', passed, results }, null, 2) + '\n');
  console.log(`STAGE 0 INVARIANTS: ${results.filter(x => x.passed).length}/${results.length}`);
  if (!passed) process.exitCode = 1;
}
main().catch(error => { console.error(error); process.exitCode = 1; });
