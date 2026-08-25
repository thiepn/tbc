const fs=require('node:fs');
const assert=require('node:assert/strict');

const read=path=>fs.readFileSync(path,'utf8');
const exists=path=>fs.existsSync(path);
const baseline=JSON.parse(read('certification/p1b-pr7-production-baseline.json'));
const p1b=read('assets/p1b-pr7-production.js');
const p0b=read('assets/p0b-player-controls.js');
const pr7=read('assets/pr7-library-progress.js');
const guard=read('assets/pr7-navigation-guard.js');
const checks=[];
const check=(name,fn)=>{try{fn();checks.push([name,true]);console.log('PASS ',name)}catch(error){checks.push([name,false]);console.error('FAIL ',name,'\n      ',error.message)}};

console.log('TBC P1B — Controlled PR7 Production Activation Audit\n');
check('baseline-version',()=>assert.equal(baseline.version,'P1B.0'));
check('p1a-parent-pinned',()=>assert.equal(baseline.parentP1AMerge,'6ab50b944e434c42cae96eab2341573f51eeaf3a'));
check('production-active-contract',()=>assert.equal(baseline.productionActive,true));
check('5799-question-contract',()=>assert.equal(baseline.questionCount,5799));
check('66-book-contract',()=>assert.equal(baseline.bookCount,66));
check('22-collection-contract',()=>assert.equal(baseline.collectionCount,22));
check('five-difficulty-contract',()=>assert.deepEqual(baseline.difficultyLevels,['Beginner','Easy','Standard','Advanced','Expert']));
check('canonical-state-contract',()=>assert.deepEqual(baseline.canonicalStateKeys,['theBibleChallenge_v21','theBibleChallenge_v21_recovery']));
check('p1b-asset-exists',()=>assert.ok(exists('assets/p1b-pr7-production.js')));
check('p1b-loaded-from-preserved-bootstrap',()=>assert.match(p0b,/p1b-pr7-production\.js/));
check('p1b-production-marker',()=>assert.match(p1b,/productionActive:true/));
check('p1b-waits-for-p0c-pr6',()=>assert.match(p1b,/TBC_P0C\?\.version&&window\.TBC_PR6\?\.version/));
check('p1b-loads-collections-adapter',()=>assert.match(p1b,/pr7-collections-adapter\.js/));
check('p1b-loads-pr7-core',()=>assert.match(p1b,/pr7-library-progress\.js/));
check('p1b-loads-navigation-guard',()=>assert.match(p1b,/pr7-navigation-guard\.js/));
check('p1b-activates-certified-pr7',()=>assert.match(p1b,/TBC_PR7\.activate\(\)/));
check('pr7-still-p1a-certified-component',()=>assert.match(pr7,/const VERSION='P1A\.1'/));
check('pr7-still-state-nonowning',()=>assert.match(pr7,/directStorageWrites:false/));
check('guard-reconciles-pr6-handoff',()=>assert.match(guard,/data-pr6-flow/));
check('no-p1b-direct-storage-write',()=>{assert.doesNotMatch(p1b,/localStorage\.(?:setItem|removeItem|clear)|sessionStorage\.(?:setItem|removeItem|clear)/)});
check('historical-p0e-baseline-preserved',()=>assert.ok(exists('certification/p0e-preservation-baseline.json')));
check('historical-p0f-baseline-preserved',()=>assert.ok(exists('certification/p0f-production-baseline.json')));
check('historical-p1a-baseline-preserved',()=>assert.ok(exists('certification/p1a-pr7-staging-baseline.json')));

const failed=checks.filter(([,pass])=>!pass);
console.log(`\n${checks.length-failed.length}/${checks.length} P1B static activation checks passed.`);
if(failed.length){process.exitCode=1;throw new Error(`P1B static audit failed: ${failed.map(([name])=>name).join(', ')}`)}
console.log('P1B STATIC PASSED: the P1A-certified PR7 component is wired for controlled production activation without taking ownership of TBC state.');
