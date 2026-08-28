'use strict';
// Read-only extraction/validation helpers. Never freezes or rewrites the product.
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const { split } = require('./tbc-successor-transition.cjs');
const create = require('./tbc-question-revision-core.js');
const core = create({ version: 1, records: [] });
const PREDECESSOR = 'e09333f1b532ef5fe5d3179335eafbba5e61d53b';
const ARCHIVE = /\/\* TBC QUESTION REVISIONS DATA \*\/\nconst TBC_QUESTION_REVISION_ARCHIVE = (.+);/;
function readArchive(html = fs.readFileSync('index.html')) {
  const engine = split(html).engine;
  assert.ok(engine.includes(fs.readFileSync('scripts/tbc-question-revision-core.js','utf8').replace(/\r\n/g,'\n')), 'embedded revision core is stale');
  const match = engine.match(ARCHIVE); assert.ok(match, 'missing embedded archive');
  return JSON.parse(match[1]);
}
const gitHtml = sha => execFileSync('git', ['show', `${sha}:index.html`], { maxBuffer: 40 * 1024 * 1024 });
const productHash = html => createHash('sha256').update(split(html).html).digest('hex');
function record(source, predecessor = PREDECESSOR) {
  return { id: source.itemId, fingerprint: core.fingerprint(source), snapshotSha256: core.snapshotHash(source), predecessor, snapshot: structuredClone(source) };
}
function validate(archive, before, after) {
  core.validate(archive);
  for (const key of ['ids','aliases','tiers','schema','structuredIds','pools']) assert.deepEqual(after[key], before[key], `revision changed ${key}`);
  assert.equal(after.ids.length, 5799); assert.equal(after.aliases.length,273); assert.equal(after.registry.length,6072);
  assert.equal(after.structuredIds.length,203); assert.equal(after.schema,27);
  const old = new Map(before.sources.map(q => [q.itemId, q])), current = new Map(after.sources.map(q => [q.itemId,q]));
  const changed = before.sources.filter(q => core.fingerprint(q) !== core.fingerprint(current.get(q.itemId))).map(q => q.itemId);
  for (const q of before.sources) if (!changed.includes(q.itemId)) assert.deepEqual(current.get(q.itemId),q, `unreviewed metadata change: ${q.itemId}`);
  for (const id of changed) {
    const prior=old.get(id), next=current.get(id);
    for(const key of ['difficulty','tier','knowledgeIds','verse','qb5Difficulty','qb6CanonicalId','qb6Active']) assert.deepEqual(next[key],prior[key], `protected metadata: ${id}/${key}`);
    assert.ok(archive.records.some(r => r.id===id && r.predecessor===PREDECESSOR && r.fingerprint===core.fingerprint(prior)), `missing predecessor: ${id}`);
  }
  for (const row of archive.records) {
    assert.ok(changed.includes(row.id), `unnecessary or stale revision: ${row.id}`);
    assert.equal(row.predecessor, PREDECESSOR, 'this audit only authorizes the certified predecessor');
    assert.deepEqual(row.snapshot, old.get(row.id), `snapshot differs from exact predecessor: ${row.id}`);
    assert.notEqual(row.fingerprint, core.fingerprint(current.get(row.id)), `revision duplicates current: ${row.id}`);
  }
  for (let i=0;i<before.registry.length;i++) if(!changed.includes(before.registry[i].itemId)) assert.deepEqual(after.registry[i],before.registry[i],`unreviewed registry change: ${before.registry[i].itemId}`);
  return changed;
}
async function capture(page) {
  const data = await page.evaluate(() => {
    const bank = TBC_QB6.activeQuestions(), ids = bank.map(q=>q.itemId);
    const tiers = Object.fromEntries(bank.map(q=>[q.itemId,q.difficulty]));
    const registry=TBC_QB0.registry(), aliases=registry.filter(q=>TBC_QB6.aliasInfo(q.itemId)).map(q=>[q.itemId,TBC_QB6.aliasInfo(q.itemId)]);
    const pools={};
    for(const tier of ['beginner','easy','standard','advanced','expert']) {
      setSetting('difficulty',tier);
      for(const mode of ['quick','daily','weekly']) pools[tier+':'+mode]=buildQuestions(mode,mode==='daily'?5:mode==='weekly'?15:10,mode==='weekly'?v20WeekKey():undefined).map(q=>q.itemId);
    }
    return {ids,tiers,registry,aliases,pools,schema:state.schemaVersion,structuredIds:TBC_QB8.canonicalStructured().map(q=>q.itemId),sources:ids.map(id=>v25QuestionSource(id))};
  });
  // Match the exact JSON representation stored in the embedded archive; runtime
  // undefined properties are not serializable question content.
  return JSON.parse(JSON.stringify(data));
}
module.exports = { create, core, PREDECESSOR, ARCHIVE, readArchive, gitHtml, productHash, record, validate, capture };
if (require.main === module) {
  try {
    const read = name => JSON.parse(fs.readFileSync(`artifacts/question-revisions/${name}.json`,'utf8'));
    const before=read('predecessor'),after=read('candidate');
    assert.equal(before.productSha256,productHash(gitHtml(PREDECESSOR)),'stale predecessor capture');
    assert.equal(after.productSha256,productHash(fs.readFileSync('index.html')),'stale candidate capture');
    const changed = validate(readArchive(),before,after);
    console.log(`REVISION ARCHIVE PASS: ${changed.length} changed IDs, ${readArchive().records.length} exact predecessor revisions; all counts/tiers/aliases/schema/pool identities retained.`);
  } catch(e) { console.error(e.stack); process.exitCode=1; }
}
