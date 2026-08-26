#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');

const ROOT=path.resolve(__dirname,'..');
const DIR=path.resolve(ROOT,process.env.P2A_OUT_DIR||'artifacts/p2a');
const OUT=path.resolve(ROOT,process.env.P2D_OUT_DIR||'artifacts/p2d');
const load=n=>JSON.parse(fs.readFileSync(path.join(DIR,n),'utf8'));
const bank=load('question-bank.json');
const qs=bank.questions||[];
const failures=[];
const warnings=[];
const fail=(code,id,detail)=>failures.push({code,id:id||null,detail});
const warn=(code,id,detail)=>warnings.push({code,id:id||null,detail});
const norm=s=>String(s??'').normalize('NFC').replace(/[“”]/g,'"').replace(/[‘’]/g,"'").replace(/\s+/g,' ').trim();
const words=s=>(norm(s).toLowerCase().match(/[a-z0-9]+(?:'[a-z]+)?/g)||[]);
const STOP=new Set('the a an and or but if then than of to in on at for from with without by as is are was were be been being this that these those it its their his her them they he she who what which where when why how does do did best most central main point idea statement situation passage immediate context biblical bible book reference teaching setting event person place relationship described recorded known about according section unit summary summarize captures emphasis key complete claims answer question cited reviewed different other here there use using into during after before through over under within toward towards around among between each every one two three four five six seven eight nine ten'.split(' '));
const contentWords=s=>words(s).filter(w=>w.length>=3&&!STOP.has(w));
const JUNK=/\b(?:all of the above|none of the above|both a and b|all are correct|none are correct)\b/i;
const GENERIC_PLACE='Which option identifies the place associated with the cited passage?';
const GENERIC_PERSON='Which option identifies the person associated with the cited passage?';
const GENERIC_EVENT='Which option best identifies the event supported by the cited evidence?';
const NEGATION=/\b(?:not|never|no|without|none|neither|nor)\b/i;
const VAGUE=/^(?:which|what) (?:option|statement|answer) (?:best )?(?:fits|matches|identifies|describes|is correct)(?: the)?(?: cited)?(?: passage|reference|evidence|context)?\??$/i;

function titleCaseNameLike(s){
  const t=norm(s).replace(/[.,;:!?()]/g,'');
  const parts=t.split(/\s+/).filter(Boolean);
  if(parts.length<1||parts.length>4)return false;
  return parts.every(p=>/^(?:[1-3]\s*)?[A-Z][A-Za-z'’-]*$/.test(p));
}
function jaccard(a,b){
  const A=new Set(contentWords(a)),B=new Set(contentWords(b));
  if(!A.size||!B.size)return 0;
  let overlap=0;for(const x of A)if(B.has(x))overlap++;
  return overlap/(A.size+B.size-overlap||1);
}
function containsSequence(hay,needle){
  const h=words(hay),n=words(needle);
  if(n.length<3||n.length>h.length)return false;
  outer:for(let i=0;i+n.length<=h.length;i++){
    for(let j=0;j<n.length;j++)if(h[i+j]!==n[j])continue outer;
    return true;
  }
  return false;
}
function feedbackRows(q){return q?.qualityMetadata?.qb7Feedback?.distractors||[]}

if(qs.length!==5799)fail('COUNT_CANONICAL',null,`${qs.length} != 5799`);
const choice=qs.filter(q=>q.interactionType==='choice');
if(choice.length!==5596)fail('COUNT_CHOICE',null,`${choice.length} != 5596`);

for(const q of choice){
  const id=q.canonicalId;
  const stem=norm(q.question);
  const opts=(Array.isArray(q.options)?q.options:[]).map(norm);
  const answer=norm(q.correctAnswer);
  const qm=q.qualityMetadata||{};

  if(qm.answerLeak===true)fail('FLAGGED_ANSWER_LEAK',id,'quality metadata marks answer leakage');
  if(qm.multipleDefensibleAnswers===true)fail('MULTIPLE_DEFENSIBLE_ANSWERS',id,'quality metadata marks multiple defensible answers');
  if(Array.isArray(qm.qualityFlags)&&qm.qualityFlags.length)fail('QUALITY_FLAGS',id,JSON.stringify(qm.qualityFlags));
  if(JUNK.test(stem)||opts.some(o=>JUNK.test(o)))fail('TESTWISE_META_OPTION',id,'all/none/both meta-option wording remains');
  if(containsSequence(stem,answer))fail('FULL_ANSWER_LEAK',id,'stem contains the complete multiword correct answer');

  if(stem===GENERIC_PLACE&&opts.length===4&&opts.every(o=>contentWords(o).length>=5)){
    fail('PLACE_DESCRIPTION_STEM',id,'stem asks the player to identify a place, but every choice is a descriptive significance statement');
  }
  if(stem===GENERIC_PERSON&&opts.length===4&&opts.every(o=>!titleCaseNameLike(o)&&contentWords(o).length>=5)){
    fail('PERSON_DESCRIPTION_STEM',id,'stem asks the player to identify a person, but every choice is a descriptive statement');
  }
  if(stem===GENERIC_EVENT&&opts.length===4&&opts.every(titleCaseNameLike)){
    fail('EVENT_PERSON_STEM',id,'stem asks the player to identify an event, but every choice is a person name');
  }

  if(VAGUE.test(stem))warn('VAGUE_STEM',id,stem);

  const answerIndex=opts.findIndex(o=>o.toLowerCase()===answer.toLowerCase());
  if(answerIndex>=0){
    const answerNeg=NEGATION.test(opts[answerIndex]);
    const otherNeg=opts.some((o,i)=>i!==answerIndex&&NEGATION.test(o));
    if(answerNeg&&!otherNeg)warn('UNIQUE_NEGATION_CUE',id,'only the correct option contains an explicit negation');

    const lens=opts.map(o=>contentWords(o).length);
    const aLen=lens[answerIndex];
    const otherLens=lens.filter((_,i)=>i!==answerIndex);
    if(otherLens.length===3&&aLen>=Math.max(...otherLens)+6&&aLen>=2*Math.max(1,Math.min(...otherLens))){
      warn('ANSWER_LENGTH_CUE',id,`correct option has ${aLen} significant words; alternatives ${otherLens.join(',')}`);
    }
  }

  for(let i=0;i<opts.length;i++)for(let j=i+1;j<opts.length;j++){
    if(contentWords(opts[i]).length<3||contentWords(opts[j]).length<3)continue;
    const sim=jaccard(opts[i],opts[j]);
    if(sim>=0.9&&opts[i].toLowerCase()!==opts[j].toLowerCase())warn('NEAR_DUPLICATE_CHOICES',id,`options ${i+1}/${j+1} lexical similarity ${sim.toFixed(2)}`);
  }

  const feedback=feedbackRows(q);
  if(feedback.length===3){
    const generic=feedback.filter(d=>/does not fit this question['’]s specific clue|re-check how the cited source connects/i.test(norm(d?.text))).length;
    if(generic===3)warn('GENERIC_DISTRACTOR_FEEDBACK',id,'all three distractor rationales use fallback contextual feedback');
  }
}

fs.mkdirSync(OUT,{recursive:true});
const report={
  phase:'P2D',
  scope:'question-quality-ambiguity-distractor-fairness',
  counts:{canonical:qs.length,choice:choice.length,confirmedDefects:failures.length,warnings:warnings.length},
  confirmedDefects:failures,
  warnings
};
fs.writeFileSync(path.join(OUT,'question-quality-report.json'),JSON.stringify(report,null,2)+'\n');

console.log('TBC P2D — Question Quality, Ambiguity & Distractor Audit');
console.log(`Canonical=${qs.length}; Choice=${choice.length}; Confirmed defects=${failures.length}; Review warnings=${warnings.length}`);
for(const x of failures)console.error(`FAIL  ${x.code} ${x.id||''} — ${x.detail}`);
const warningCounts={};for(const x of warnings)warningCounts[x.code]=(warningCounts[x.code]||0)+1;
for(const [code,count] of Object.entries(warningCounts).sort())console.log(`WARN  ${code}: ${count}`);
if(failures.length){console.error(`P2D FAILED: ${failures.length} confirmed question-quality defect(s).`);process.exit(1)}
console.log('P2D PASSED: 0 confirmed question-quality blockers. Heuristic review warnings remain non-blocking candidates for later editorial phases.');
