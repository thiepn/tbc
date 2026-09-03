'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');
const zlib = require('node:zlib');
const { chromium } = require('playwright');
const { ready, open, exact, snapshot, reloadExact, answerOne } = require('./tbc-preservation-repair.cjs');
const { create, core, PREDECESSOR, BATCH03_PREDECESSOR, BATCH04_PREDECESSOR, PREDECESSOR_BY_ID, ARCHIVE, gitHtml, productHash, readArchive, record, validate, capture } = require('./tbc-question-revisions.cjs');
const { split } = require('./tbc-successor-transition.cjs');
const DIR='artifacts/question-revisions', SESSION='theBibleChallenge_v21_activeRound';
const IDS=['1-chronicles-16-11-context','1-chronicles-16-34-context','1-kings-8-27-context','1-kings-8-61-context','1-samuel-12-24-context','1-timothy-6-6-context'];
const results=[];
async function check(name, fn) {
  try { const detail=await fn(); results.push({name,passed:true,detail}); console.log('PASS',name); }
  catch(e) { results.push({name,passed:false,error:e.stack}); console.error('FAIL',name,e.stack.slice(0,1500)); }
}
async function openHtml(browser, html) {
  return open({newContext:async options=>{
    const context=await browser.newContext(options);
    if(html) await context.route('http://127.0.0.1:4173/',r=>r.fulfill({contentType:'text/html',body:html}));
    return context;
  }});
}
function archiveHtml(html, archive) {
  const engine=split(html).engine.replace(ARCHIVE, '/* TBC QUESTION REVISIONS DATA */\nconst TBC_QUESTION_REVISION_ARCHIVE = '+JSON.stringify(archive)+';');
  return html.toString().replace(/(<script id="tbc-engine-package" type="application\/octet-stream">)[\s\S]*?(<\/script>)/,
    (_,a,b)=>a+zlib.gzipSync(engine,{level:9}).toString('base64')+b);
}
async function copies(page, raw, which='both') {
  await page.evaluate(({raw,which,key})=>{
    for(const [store,name] of [[localStorage,'primary'],[sessionStorage,'backup']]) {
      if(which==='both'||which===name)store.setItem(key,JSON.stringify(raw));else store.removeItem(key);
    }
  },{raw,which,key:SESSION});
}
async function makeFixture(page, id, mode, answered=false, synthetic=null) {
  return page.evaluate(async ({id,mode,answered,synthetic})=>{
    clearQuizSession();quiz=null;
    const q=synthetic||v25QuestionSource(id);setSetting('difficulty',q.difficulty);setSetting('autoNext',false);
    startQuiz(mode,mode==='daily'?5:mode==='weekly'?15:10,mode==='weekly'?v20WeekKey():undefined);
    const position=answered?0:2;
    // Construct a round with exact predecessor source objects using the real
    // launch/serializer/answer paths. No claim these IDs occur in seed 1701.
    const other=quiz.questions.filter(x=>x.itemId!==id);
    if(other.length<quiz.questions.length)other.push(buildQuestions('quick',10).find(x=>x.itemId!==id&&!other.some(y=>y.itemId===x.itemId)));
    other[position]=q;quiz.questions=other;
    answer(currentQuestion().answer);nextQuestion();saveQuizSession();
    const raw=serializeQuizSession();
    const fixture={raw,progress:JSON.parse(localStorage.getItem('theBibleChallenge_v21')),accepted:!!hydrateQuizSession(raw)};
    // Independently continue in the predecessor, so candidate scores and XP
    // are compared with actual old behavior, not a guessed scoring formula.
    await Promise.resolve();answer(currentQuestion().answer);nextQuestion();
    await Promise.resolve();answer(currentQuestion().answer);
    fixture.continued=serializeQuizSession();
    return fixture;
  },{id,mode,answered,synthetic});
}
async function useFixture(page, fixture) {
  await page.evaluate(progress=>{localStorage.setItem('theBibleChallenge_v21',JSON.stringify(progress));},fixture.progress);
  await copies(page,fixture.raw);
  await reloadExact(page,fixture.raw);
}
async function cycle(page, fixture, finish=false) {
  for(const which of ['primary','backup','both']) {
    await copies(page,fixture.raw,which);
    const restored=await page.evaluate(()=>{const q=restoreQuizSession();return q&&serializeQuizSession(q)});
    assert.deepEqual(exact(restored),exact(fixture.raw),which+' restoration');
    assert.ok(await page.evaluate(({which,key})=>(which==='primary'?localStorage:sessionStorage).getItem(key)!==null,{which,key:SESSION}));
    if(which==='both')assert.deepEqual(await page.evaluate(key=>[localStorage.getItem(key),sessionStorage.getItem(key)],SESSION),[JSON.stringify(fixture.raw),JSON.stringify(fixture.raw)],'valid recovery copies not rewritten/deleted');
  }
  await useFixture(page,fixture);
  await reloadExact(page,await snapshot(page));
  assert.ok((await page.evaluate(key=>[localStorage.getItem(key),sessionStorage.getItem(key)],SESSION)).every(Boolean),'both copies retained after reload');
  await answerOne(page);await page.evaluate(()=>nextQuestion());
  const before=await page.evaluate(()=>({correct:quiz.correct,score:quiz.score,answer:currentQuestion().answer}));
  await answerOne(page);assert.equal(await page.evaluate(()=>currentQuestion().answer),before.answer,'historical answer remains authoritative');
  assert.ok(await page.evaluate(score=>quiz.score>score,before.score));
  assert.deepEqual(exact(await snapshot(page)),exact(fixture.continued),'continued round and score equal predecessor execution');
  await reloadExact(page,await snapshot(page));
  if(finish) {
    const prior=await page.evaluate(()=>state.stats.rounds);
    const attempts=await page.evaluate(()=>quiz.mode==='daily'?(state.daily[dateKey()]?.attempts||0):quiz.mode==='weekly'?(state.weekly[v20WeekKey()]?.attempts||0):null);
    await page.evaluate(async()=>{
      for(let i=0;i<40&&!quiz.finished;i++) {
        if(!quiz.answered)answer(currentQuestion().answer);
        nextQuestion();
        // V3220 intentionally drops duplicate next calls within one microtask.
        // Yield naturally; never patch or disable that production guard.
        await Promise.resolve();
      }
    });
    assert.equal(await page.evaluate(()=>quiz.finished),true,'historical round completes');
    assert.equal(await page.evaluate(()=>state.stats.rounds),prior+1);
    if(attempts!==null)assert.equal(await page.evaluate(()=>quiz.mode==='daily'?state.daily[dateKey()].attempts:state.weekly[v20WeekKey()].attempts),attempts+1);
    const progress=await page.evaluate(()=>JSON.stringify({stats:state.stats,daily:state.daily,weekly:state.weekly}));
    await page.evaluate(()=>finishQuiz());assert.equal(await page.evaluate(()=>JSON.stringify({stats:state.stats,daily:state.daily,weekly:state.weekly})),progress);
    assert.deepEqual(await page.evaluate(key=>[localStorage.getItem(key),sessionStorage.getItem(key)],SESSION),[null,null]);
    await page.reload();await ready(page);assert.equal(await snapshot(page),null);
  }
}
async function main() {
  fs.mkdirSync(DIR,{recursive:true});
  const empty={version:1,records:[]};
  await check('SHA-256 agrees with independent UTF-8/multiblock crypto vectors',()=>{
    for(const s of ['', 'abc', 'David’s song — \u{1f54a}', 'x'.repeat(10000)])assert.equal(core.sha256(s),crypto.createHash('sha256').update(s).digest('hex'));
  });
  const browser=await chromium.launch({headless:true}), html=fs.readFileSync('index.html'), archive=readArchive(html);
  try {
    const baseline=await openHtml(browser,gitHtml(PREDECESSOR)),batch03Baseline=await openHtml(browser,gitHtml(BATCH03_PREDECESSOR)),batch04Baseline=await openHtml(browser,gitHtml(BATCH04_PREDECESSOR)),candidate=await openHtml(browser);
    const before=await capture(baseline.page),batch03=await capture(batch03Baseline.page),batch04=await capture(batch04Baseline.page),after=await capture(candidate.page);
    before.productSha256=productHash(gitHtml(PREDECESSOR));batch03.productSha256=productHash(gitHtml(BATCH03_PREDECESSOR));batch04.productSha256=productHash(gitHtml(BATCH04_PREDECESSOR));after.productSha256=productHash(html);
    for(const [name,value] of [['predecessor',before],['predecessor-dded986',batch03],['predecessor-c2a129',batch04],['candidate',after]])fs.writeFileSync(`${DIR}/${name}.json`,JSON.stringify(value));
    const predecessorCaptures={[PREDECESSOR]:before,[BATCH03_PREDECESSOR]:batch03,[BATCH04_PREDECESSOR]:batch04};
    await check('exact predecessor archives, counts, tier/alias/schema and deterministic pools',()=>({changed:validate(archive,before,after,predecessorCaptures)}));
    const source=before.sources.find(q=>q.itemId===IDS[0]), historical=structuredClone(source);
    historical.prompt='Synthetic historical question: which context?';
    // An actual changed answer key, not just distractors, proves old scoring.
    historical.answer=historical.options.find(x=>x!==historical.answer);
    const second=structuredClone(historical);second.prompt+=' Second explicit revision.';
    const synthetic={version:1,records:[record(historical),record(second)]};
    await check('two revisions per stable ID; exact fingerprint and option permutation',()=>{
      const c=create(synthetic);assert.equal(c.error,null);
      for(const q of [historical,second]) { const shuffled={...q,options:q.options.slice().reverse()};assert.deepEqual(c.historical(shuffled),q); }
      assert.equal(c.historical({...historical,prompt:'unknown'}),null);assert.equal(c.historical({...historical,itemId:IDS[1]}),null);
    });
    for(const [name,mutate] of [
      ['duplicate key',a=>a.records.push(a.records[0])],['wrong ID',a=>a.records[0].id=IDS[1]],
      ['wrong fingerprint',a=>a.records[0].fingerprint='0'.repeat(64)],['tampered prompt',a=>a.records[0].snapshot.prompt+='!'],
      ['tampered choices',a=>a.records[0].snapshot.options[0]+='!'],['tampered answer',a=>a.records[0].snapshot.answer='bad'],
      ['tampered tier',a=>a.records[0].snapshot.difficulty='easy'],['incomplete snapshot',a=>delete a.records[0].snapshot.explanation],
      ['missing snapshot',a=>delete a.records[0].snapshot],['unknown version',a=>a.version=2],['missing records',a=>delete a.records],
      ['malformed provenance',a=>a.records[0].predecessor='unknown']]) {
      await check('archive rejects '+name,()=>{const a=structuredClone(synthetic);mutate(a);assert.throws(()=>core.validate(a));assert.equal(create(a).historical(historical),null)});
    }
    await check('validator rejects unnecessary, missing and stale predecessor records',()=>{
      assert.throws(()=>validate(synthetic,before,before));
      if(archive.records.length){assert.throws(()=>validate(empty,before,after,predecessorCaptures));const bad=structuredClone(archive);bad.records[0].predecessor='0'.repeat(40);assert.throws(()=>validate(bad,before,after,predecessorCaptures))}
    });
    await check('recomputed forged archive hashes cannot replace Git predecessor authority',()=>{
      const forged=structuredClone(before.sources[0]);forged.prompt+=' forged';
      assert.throws(()=>validate({version:1,records:[record(forged)]},before,after,predecessorCaptures));
    });
    const isolated=await openHtml(browser,archiveHtml(html,synthetic));
    await check('current canonical and retained-alias saves reject unknown static fingerprints',async()=>{
      const failures=await candidate.page.evaluate(()=>{
        clearQuizSession();quiz=null;startQuiz('quick',10);
        const canonical=serializeQuizSession(),alias=TBC_QB0.registry().find(r=>TBC_QB6.aliasInfo(r.itemId));
        const legacy=serializeQuizSession({...quiz,questions:[v25QuestionSource(alias.itemId)]}),failures=[];
        for(const [kind,raw] of [['canonical',canonical],['alias',legacy]]) {
          if(!hydrateQuizSession(raw))failures.push(kind+' valid');
          for(const key of ['hint','skill','tier','knowledgeIds']) {
            const bad=structuredClone(raw);
            bad.questions[0][key]=key==='knowledgeIds'?['passage.unknown']:String(bad.questions[0][key]||'')+' changed';
            if(hydrateQuizSession(bad))failures.push(kind+' '+key);
          }
        }
        clearQuizSession();quiz=null;return failures;
      });assert.deepEqual(failures,[]);
    });
    for(const mode of ['quick','daily','weekly']) await check(`synthetic ${mode}: primary/backup/both, progress, old scoring, repeated reload, cleanup`,async()=>{
      const fixture=await makeFixture(baseline.page,historical.itemId,mode,false,historical);
      assert.equal(fixture.accepted,false,'unallowlisted synthetic predecessor must fail original integrity checks');
      await cycle(isolated.page,fixture,true);
      assert.deepEqual(isolated.errors,[],'no browser page errors');
    });
    await check('second allowlisted revision independently restores the same stable ID',async()=>{
      const f=await makeFixture(baseline.page,second.itemId,'quick',false,second);await useFixture(isolated.page,f);await reloadExact(isolated.page,await snapshot(isolated.page));
    });
    await check('unserialized save properties cannot override authenticated historical metadata',async()=>{
      const f=await makeFixture(baseline.page,historical.itemId,'quick',false,historical),raw=structuredClone(f.raw);
      Object.assign(raw.questions[2],{learningObjective:'FORGED',biblicalEvidence:['wrong'],verse:{id:'wrong'},qb5Difficulty:{finalTier:'beginner'},unknownProperty:'forged'});
      const actual=await isolated.page.evaluate(raw=>{
        const round=hydrateQuizSession(raw),q=round?.questions[2];
        return {round:round&&serializeQuizSession(round),objective:q?.learningObjective,evidence:q?.biblicalEvidence,verse:q?.verse,tier:q?.qb5Difficulty,unknown:q?.unknownProperty};
      },raw);
      assert.deepEqual(exact(actual.round),exact(f.raw));assert.equal(actual.objective,historical.learningObjective);
      assert.deepEqual(actual.evidence,historical.biblicalEvidence);assert.deepEqual(actual.verse,historical.verse);assert.deepEqual(actual.tier,historical.qb5Difficulty);assert.equal(actual.unknown,undefined);
    });
    await check('historical recovery: invalid primary, invalid backup, both valid distinct revisions',async()=>{
      const one=(await makeFixture(baseline.page,historical.itemId,'quick',false,historical)).raw;
      const two=(await makeFixture(baseline.page,second.itemId,'quick',false,second)).raw;
      for(const [primary,backup,expected] of [['{broken',JSON.stringify(one),one],[JSON.stringify(one),'{broken',one],[JSON.stringify(one),JSON.stringify(two),one]]) {
        const got=await isolated.page.evaluate(({primary,backup,key})=>{
          localStorage.setItem(key,primary);sessionStorage.setItem(key,backup);
          const round=restoreQuizSession();return {round:round&&serializeQuizSession(round),copies:[localStorage.getItem(key),sessionStorage.getItem(key)]};
        },{primary,backup,key:SESSION});
        assert.deepEqual(exact(got.round),exact(expected));assert.ok(got.copies.every(Boolean));
        if(primary!=='{broken'&&backup!=='{broken')assert.deepEqual(got.copies,[primary,backup]);
      }
    });
    await check('unknown content and ID combinations, malformed saves and corrupt recovery fail closed',async()=>{
      const fixture=await makeFixture(baseline.page,historical.itemId,'quick',false,historical);
      for(const patch of [{prompt:'unknown'}, {itemId:IDS[1]}, {difficulty:'easy'}, {options:['a','b','c','d']}]) {
        const raw=structuredClone(fixture.raw);Object.assign(raw.questions[2],patch);
        assert.equal(await isolated.page.evaluate(raw=>hydrateQuizSession(raw),raw),null);
      }
      await isolated.page.evaluate(key=>{localStorage.setItem(key,'{broken');sessionStorage.setItem(key,'{broken')},SESSION);
      await isolated.page.reload();await ready(isolated.page);assert.equal(await snapshot(isolated.page),null);assert.deepEqual(isolated.errors,[],'no browser page errors');
    });
    await check('historical round export/import retains exact snapshot and recovery copies',async()=>{
      const fixture=await makeFixture(baseline.page,historical.itemId,'quick',true,historical);await useFixture(isolated.page,fixture);
      const before=await snapshot(isolated.page),download=isolated.page.waitForEvent('download');await isolated.page.evaluate(()=>exportProgress());
      const stream=await(await download).createReadStream(),chunks=[];for await(const c of stream)chunks.push(c);
      const payload=JSON.parse(Buffer.concat(chunks).toString());assert.deepEqual(exact(payload.activeRound),exact(before));
      await isolated.page.evaluate(async payload=>v296ImportProgress({currentTarget:{files:[new File([JSON.stringify(payload)],'revision.json')],value:'fixture'}}),payload);
      await reloadExact(isolated.page,before);assert.ok((await isolated.page.evaluate(key=>[localStorage.getItem(key),sessionStorage.getItem(key)],SESSION)).every(Boolean));
    });
    await check('intentional historical-round abandonment clears copies and returns to current selection',async()=>{
      const f=await makeFixture(baseline.page,historical.itemId,'quick',false,historical);await useFixture(isolated.page,f);
      await isolated.page.evaluate(()=>quitQuiz());await isolated.page.locator('#modalRoot').getByRole('button',{name:/^Return to/}).click();
      assert.equal(await snapshot(isolated.page),null);assert.deepEqual(await isolated.page.evaluate(key=>[localStorage.getItem(key),sessionStorage.getItem(key)],SESSION),[null,null]);
      await isolated.page.evaluate(()=>startQuiz('quick',10));
      assert.equal(await isolated.page.evaluate(()=>serializeQuizSession().questions.some(q=>TBC_QUESTION_REVISIONS.historical(q))),false);
      await reloadExact(isolated.page,await snapshot(isolated.page));assert.deepEqual(isolated.errors,[],'no browser page errors');
    });
    await check('archive cannot enter current registry, aliases or any deterministic selection pool',async()=>{
      await isolated.page.reload();await ready(isolated.page);
      // Fresh profile makes the Quick Play RNG/history comparison meaningful.
      const fresh=await openHtml(browser,archiveHtml(html,synthetic));
      const captured=await capture(fresh.page),{productSha256,...runtime}=after;
      assert.deepEqual(captured,runtime);assert.deepEqual(fresh.errors,[],'no browser page errors');await fresh.context.close();
    });
    await check('malformed embedded archive cannot crash startup or admit a historical save',async()=>{
      const broken=structuredClone(synthetic);broken.records[0].snapshot.answer='tampered';
      const bad=await openHtml(browser,archiveHtml(html,broken));
      const f=await makeFixture(baseline.page,historical.itemId,'quick',false,historical);
      assert.equal(await bad.page.evaluate(raw=>hydrateQuizSession(raw),f.raw),null);
      await bad.page.evaluate(()=>startQuiz('quick',10));await reloadExact(bad.page,await snapshot(bad.page));
      assert.deepEqual(bad.errors,[],'no browser page errors');await bad.context.close();
    });
    if(archive.records.length) {
      const fixtures=[];
      for(const id of IDS) for(const mode of ['quick','daily','weekly']) for(const answered of [false,true]) {
        await check(`certified predecessor ${id} ${mode} ${answered?'answered':'unasked'}: recovery/reloads/finish`,async()=>{
          const predecessor=PREDECESSOR_BY_ID[id];
          const sourcePage=predecessor===BATCH04_PREDECESSOR?batch04Baseline.page:predecessor===BATCH03_PREDECESSOR?batch03Baseline.page:baseline.page;
          const fixture=await makeFixture(sourcePage,id,mode,answered);assert.equal(fixture.accepted,true);fixtures.push(fixture);
          await cycle(candidate.page,fixture,true);assert.deepEqual(candidate.errors,[],'no browser page errors');
        });
      }
      for(const id of IDS)await check(`exact predecessor ${id}: real export/import and rejected unknown revision`,async()=>{
        const f=fixtures.find(f=>f.raw.questions.some(q=>q.itemId===id)&&f.raw.mode==='quick');await useFixture(candidate.page,f);
        const before=await snapshot(candidate.page),event=candidate.page.waitForEvent('download');await candidate.page.evaluate(()=>exportProgress());
        const stream=await(await event).createReadStream(),chunks=[];for await(const c of stream)chunks.push(c);
        const payload=JSON.parse(Buffer.concat(chunks).toString());assert.deepEqual(exact(payload.activeRound),exact(before));
        await candidate.page.evaluate(async payload=>v296ImportProgress({currentTarget:{files:[new File([JSON.stringify(payload)],'predecessor.json')],value:'fixture'}}),payload);
        await reloadExact(candidate.page,before);
        const bad=structuredClone(f.raw),target=bad.questions.find(q=>q.itemId===id);target.prompt+=' unknown revision';
        assert.equal(await candidate.page.evaluate(raw=>hydrateQuizSession(raw),bad),null);
        assert.deepEqual(candidate.errors,[],'no browser page errors');
      });
      fs.writeFileSync(`${DIR}/exact-predecessor-rounds.json`,JSON.stringify({predecessors:[PREDECESSOR,BATCH03_PREDECESSOR,BATCH04_PREDECESSOR],fixtures}));
    }
    assert.deepEqual(baseline.errors,[],'no predecessor browser page errors');assert.deepEqual(candidate.errors,[],'no browser page errors');
    assert.deepEqual(batch03Baseline.errors,[],'no Batch 03 predecessor browser page errors');
    assert.deepEqual(batch04Baseline.errors,[],'no Batch 04 predecessor browser page errors');
    await baseline.context.close();await batch03Baseline.context.close();await batch04Baseline.context.close();await candidate.context.close();await isolated.context.close();
  } finally { await browser.close(); }
  fs.writeFileSync(`${DIR}/tests.json`,JSON.stringify({browser:process.env.TBC_BROWSER_CHANNEL||'bundled Chromium',results},null,2));
  console.log(`QUESTION REVISIONS: ${results.filter(x=>x.passed).length}/${results.length}`);
  if(results.some(x=>!x.passed))process.exitCode=1;
}
module.exports={openHtml,archiveHtml,makeFixture,copies,cycle};
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1});
