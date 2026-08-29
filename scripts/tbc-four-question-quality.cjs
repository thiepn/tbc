'use strict';
// Four reviewed cases only. These assertions preserve the Scripture-reviewed
// option sets; they do not claim to automate theological or semantic review.
const fs=require('node:fs');
const assert=require('node:assert/strict');
const {core,readArchive,PREDECESSOR,gitHtml,productHash}=require('./tbc-question-revisions.cjs');
const cases=[
  {id:'1-chronicles-16-11-context', replacements:{0:'Nathan delivers God’s covenant promise to David.'},
    evidence:[['1 Chronicles 16:1–7, 11','https://biblehub.com/bsb/1_chronicles/16.htm'],['1 Chronicles 17:1–15','https://biblehub.com/bsb/1_chronicles/17.htm']],
    rationale:'Verse 11 is in the thanksgiving song introduced after the ark arrives (16:1–7), not Nathan’s later covenant message (17:1–15), David’s instructions to Solomon (28:9), or David’s final prayer (29:10–20). The replaced distractor described the same ark-arrival song as the keyed answer.'},
  {id:'1-chronicles-16-34-context', replacements:{0:'Nathan delivers God’s covenant promise to David.'},
    evidence:[['1 Chronicles 16:1–7, 34–36','https://biblehub.com/bsb/1_chronicles/16.htm'],['1 Chronicles 17:1–15','https://biblehub.com/bsb/1_chronicles/17.htm']],
    rationale:'Verse 34 remains inside the same ark-arrival thanksgiving song (16:7–36). Nathan’s later covenant message, David’s instructions to Solomon, and David’s final prayer are separate scenes. The removed alternative was another description of the correct event.'},
  {id:'1-kings-8-27-context', replacements:{0:'Rehoboam refuses to ease the people’s burdens'},
    evidence:[['1 Kings 8:22–30','https://biblehub.com/bsb/1_kings/8.htm'],['1 Kings 12:1–20','https://biblehub.com/bsb/1_kings/12.htm']],
    rationale:'Solomon is praying at the temple dedication in 8:22–30. The former construction-and-dedication distractor also encompassed that event. Rehoboam’s refusal occurs after Solomon’s reign (12:1–20); Solomon’s wisdom request (3:5–15) and Elijah at Carmel (18:20–40) are separate contexts.'},
  {id:'1-kings-8-61-context', replacements:{1:'The kingdom divides under Rehoboam',2:'Jeroboam establishes calf worship at Bethel and Dan'},
    evidence:[['1 Kings 8:54–66; 1 Kings 5–8','https://biblehub.com/bsb/1_kings/8.htm'],['1 Kings 12:16–33','https://biblehub.com/bsb/1_kings/12.htm']],
    rationale:'The prompt asks for the larger literary context. Verse 61 concludes Solomon’s blessing after his prayer (8:54–61), within the construction/dedication account in chapters 5–8. The two prayer-setting alternatives overlapped that account. Division under Rehoboam and Jeroboam’s calf worship occur later in chapter 12, and Elijah’s Carmel confrontation is later still (chapter 18).'}
];
function main(){
  const read=name=>JSON.parse(fs.readFileSync(`artifacts/question-revisions/${name}.json`,'utf8'));
  const before=read('predecessor'),after=read('candidate'),archive=readArchive();
  assert.equal(before.productSha256,productHash(gitHtml(PREDECESSOR)),'stale predecessor capture');
  assert.equal(after.productSha256,productHash(fs.readFileSync('index.html')),'stale candidate capture');
  const changed=before.sources.filter(q=>core.fingerprint(q)!==core.fingerprint(after.sources.find(x=>x.itemId===q.itemId))).map(q=>q.itemId);
  assert.deepEqual(changed.slice().sort(),cases.map(x=>x.id).sort(),'only four reviewed identities may change');
  for(const c of cases){
    const old=before.sources.find(q=>q.itemId===c.id),now=after.sources.find(q=>q.itemId===c.id);
    const options=old.options.map((x,i)=>c.replacements[i]??x);
    assert.deepEqual(now,{...old,options},`${c.id}: only reviewed distractors change`);
    assert.equal(now.options.indexOf(now.answer),old.options.indexOf(old.answer),'correct-answer position retained');
    assert.equal(new Set(now.options).size,4);assert.equal(now.options.filter(x=>x===now.answer).length,1);
    assert.ok(archive.records.some(r=>r.id===c.id&&r.predecessor===PREDECESSOR&&r.fingerprint===core.fingerprint(old)));
    console.log(`PASS ${c.id}: reviewed distinct contexts; answer, position, tier and metadata retained`);
  }
  console.log('FOUR QUESTION QUALITY: 4/4');
}
module.exports={cases};
if(require.main===module)try{main()}catch(e){console.error(e.stack);process.exitCode=1}
