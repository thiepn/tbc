#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');

const ROOT=path.resolve(__dirname,'..');
const DIR=path.resolve(ROOT,process.env.P2A_OUT_DIR||'artifacts/p2a');
const load=n=>JSON.parse(fs.readFileSync(path.join(DIR,n),'utf8'));
const bank=load('question-bank.json');
const qs=bank.questions||[];
const failures=[];
const warnings=[];
const fail=(code,id,detail)=>failures.push({code,id:id||null,detail});
const warn=(code,id,detail)=>warnings.push({code,id:id||null,detail});

const norm=s=>String(s??'').normalize('NFC').replace(/[“”]/g,'"').replace(/[‘’]/g,"'").replace(/\s+/g,' ').trim();
const words=s=>(norm(s).toLowerCase().match(/[a-z0-9]+(?:'[a-z]+)?/g)||[]);
const contentWords=s=>words(s).filter(w=>w.length>=3&&!STOP.has(w));
const STOP=new Set('the a an and or but if then than of to in on at for from with without by as is are was were be been being this that these those it its their his her them they he she who what which where when why how does do did best most central main point idea statement situation passage immediate context biblical bible book reference teaching setting event person place relationship described recorded known about according section unit summary summarize captures emphasis key complete claims answer question cited reviewed different other here there use using into during after before through over under within toward towards around among between each every one two three four five six seven eight nine ten'.split(' '));
const JUNK=/\b(?:all of the above|none of the above|both a and b|all are correct|none are correct)\b/i;
const VAGUE=/^(?:which|what) (?:option|statement|answer) (?:best )?(?:fits|matches|identifies|describes|is correct)(?: the)?(?: cited)?(?: passage|reference|evidence|context)?\??$/i;
const GENERIC=/^which option (?:identifies|best identifies) the (?:person|place|event|relationship) associated with the cited passage\??$/i;
const DOMAIN_WORDS={
  person:new Set(['man','woman','king','prophet','priest','apostle','disciple','judge','queen','father','mother','son','daughter','brother','sister','person','jesus','god','lord']),
  place:new Set(['city','land','mount','mountain','river','sea','island','region','country','place','jerusalem','israel','judah','egypt','rome']),
  event:new Set(['battle','exile','birth','death','resurrection','crucifixion','flood','plague','covenant','event','journey','reform','miracle','feeding']),
};
function jaccard(a,b){const A=new Set(contentWords(a)),B=new Set(contentWords(b));if(!A.size&&!B.size)return 1;let i=0;for(const x of A)if(B.has(x))i++;return i/(A.size+B.size-i||1)}
function containsSequence(hay,needle){const h=words(hay),n=words(needle);if(!n.length||n.length>h.length)return false;outer:for(let i=0;i+n.length<=h.length;i++){for(let j=0;j<n.length;j++)if(h[i+j]!==n[j])continue outer;return true}return false}
function optionLengths(opts){return opts.map(o=>contentWords(o).length)}
function median(xs){const a=[...xs].sort((x,y)=>x-y);return a.length%2?a[(a.length-1)/2]:(a[a.length/2-1]+a[a.length/2])/2}
function stemDomain(stem){const s=norm(stem).toLowerCase();for(const d of ['person','place','event'])if(new RegExp(`\\b${d}\\b`).test(s))return d;return null}
function optionLooksDomain(option,domain){if(!domain)return true;const ws=new Set(contentWords(option));for(const w of DOMAIN_WORDS[domain])if(ws.has(w))return true;const text=norm(option);if(domain==='person'&&/^[A-Z][A-Za-z'’-]+(?:\s+[A-Z][A-Za-z'’-]+){0,3}(?:,|$)/.test(text))return true;if(domain==='place'&&/^[A-Z][A-Za-z'’-]+(?:\s+[A-Z][A-Za-z'’-]+){0,3}$/.test(text)&&contentWords(text).length<=4)return true;return false}

for(const q of qs){
  const id=q.canonicalId;
  if(q.interactionType!=='choice')continue;
  const opts=Array.isArray(q.options)?q.options.map(norm):[];
  const answer=norm(q.correctAnswer);
  const stem=norm(q.question);
  if(opts.length!==4)continue; // P2B owns mechanical option-count defects.

  if(JUNK.test(stem)||opts.some(o=>JUNK.test(o)))fail('TESTWISE_META_OPTION',id,'all/none/both meta-option wording remains');
  if(GENERIC.test(stem))fail('GENERIC_DOMAIN_STEM',id,stem);
  else if(VAGUE.test(stem))warn('VAGUE_STEM',id,stem);

  const domain=stemDomain(stem);
  if(domain){
    const fitting=opts.filter(o=>optionLooksDomain(o,domain)).length;
    if(fitting===0)fail('STEM_OPTION_DOMAIN_MISMATCH',id,`${domain} stem but no option resembles that domain`);
    else if(fitting===1&&optionLooksDomain(answer,domain))warn('DOMAIN_GIVEAWAY',id,`only the correct option visibly matches ${domain} domain`);
  }

  const answerIndex=opts.findIndex(o=>norm(o).toLowerCase()===answer.toLowerCase());
  if(answerIndex>=0){
    const overlaps=opts.map(o=>jaccard(stem,o));
    const a=overlaps[answerIndex];
    const others=overlaps.filter((_,i)=>i!==answerIndex);
    if(containsSequence(stem,answer)&&contentWords(answer).length>=2)fail('ANSWER_LEAK_FULL',id,'stem contains the full correct answer');
    if(a>=0.65&&a-Math.max(...others)>=0.35)warn('ANSWER_LEXICAL_GIVEAWAY',id,`correct-option stem overlap ${a.toFixed(2)} vs alternatives ${others.map(x=>x.toFixed(2)).join(',')}`);

    const lens=optionLengths(opts),al=lens[answerIndex],other=lens.filter((_,i)=>i!==answerIndex),med=median(lens);
    if(al>=Math.max(...other)+5&&al>=1.65*Math.max(1,median(other)))warn('ANSWER_LENGTH_GIVEAWAY',id,`correct option ${al} content words; alternatives ${other.join(',')}`);
    if(al+5<=Math.min(...other)&&al<=0.6*Math.max(1,median(other)))warn('ANSWER_SHORTNESS_GIVEAWAY',id,`correct option ${al} content words; alternatives ${other.join(',')}`);
  }

  for(let i=0;i<opts.length;i++)for(let j=i+1;j<opts.length;j++){
    const sim=jaccard(opts[i],opts[j]);
    if(sim>=0.88&&norm(opts[i]).toLowerCase()!==norm(opts[j]).toLowerCase())warn('NEAR_DUPLICATE_CHOICES',id,`options ${i+1}/${j+1} lexical similarity ${sim.toFixed(2)}`);
  }

  const feedback=q.qualityMetadata?.qb7Feedback;
  if(feedback?.distractors&&Array.isArray(feedback.distractors)){
    const generic=feedback.distractors.filter(d=>/does not fit this question['’]s specific clue|re-check how the cited source connects/i.test(norm(d?.text))).length;
    if(generic===3)warn('ALL_DISTRACTOR_FEEDBACK_GENERIC',id,'all three distractor rationales use contextual fallback text');
  }
}

console.log('TBC P2D — Question Quality, Ambiguity & Distractor Audit');
console.log(`Canonical=${qs.length}; choice=${qs.filter(q=>q.interactionType==='choice').length}`);
console.log(`Confirmed quality defects=${failures.length}; review warnings=${warnings.length}`);
for(const x of failures)console.error(`FAIL  ${x.code} ${x.id||''} — ${x.detail}`);
for(const x of warnings.slice(0,300))console.log(`WARN  ${x.code} ${x.id||''} — ${x.detail}`);
if(warnings.length>300)console.log(`WARN  ... ${warnings.length-300} additional warning(s) omitted from console output`);
fs.mkdirSync(path.resolve(ROOT,process.env.P2D_OUT_DIR||'artifacts/p2d'),{recursive:true});
fs.writeFileSync(path.resolve(ROOT,process.env.P2D_OUT_DIR||'artifacts/p2d','question-quality-report.json'),JSON.stringify({phase:'P2D',canonical:qs.length,confirmedDefects:failures,warnings},null,2)+'\n');
if(failures.length){console.error(`P2D FAILED: ${failures.length} confirmed question-quality defect(s).`);process.exit(1)}
console.log('P2D PASSED: no mechanically/semantically defensible question-quality blockers detected; warnings remain review candidates only.');
