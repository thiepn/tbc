'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const id=require('./tbc-product-identity.cjs');

function fixture(run){
  const boundary=path.join(id.ROOT,'artifacts/question-successor');
  fs.mkdirSync(boundary,{recursive:true});
  const root=fs.mkdtempSync(path.join(boundary,'identity-negative-'));
  try{
    const files=[id.MANIFEST,id.TRANSITION,id.P2A,...Object.keys(id.loadManifest().historicalEvidence)];
    for(const file of files){fs.mkdirSync(path.dirname(path.join(root,file)),{recursive:true});fs.copyFileSync(path.join(id.ROOT,file),path.join(root,file))}
    // Every mutation starts from a passing authority, so no stale prerequisite
    // can masquerade as the intended rejection.
    id.currentP2ABaseline(root);id.loadTransition(root);
    run(root);
  }finally{
    const resolved=fs.realpathSync(root);
    assert.ok(resolved.startsWith(fs.realpathSync(boundary)+path.sep)&&path.basename(resolved).startsWith('identity-negative-'));
    fs.rmSync(resolved,{recursive:true,force:true});
  }
}

test('current hashes come from the successor without rewriting historical P2A content',()=>{
  const raw=JSON.parse(id.read(id.ROOT,id.P2A)),current=id.currentP2ABaseline();
  const historical=id.loadHistoricalManifest();
  assert.equal(raw.hashes.canonicalBankSha256,historical.content.semanticHashes.canonicalBank);
  assert.equal(raw.hashes.registryBankSha256,historical.content.semanticHashes.registry);
  assert.notEqual(current.hashes.canonicalBankSha256,raw.hashes.canonicalBankSha256);
  assert.notEqual(current.hashes.registryBankSha256,raw.hashes.registryBankSha256);
  const reverted=structuredClone(current);reverted.hashes=raw.hashes;
  assert.deepEqual(reverted,raw,'only the two explicitly authorized content expectations move');
});
for(const [name,file] of [['predecessor identity',id.HISTORICAL_MANIFEST],['previous transition','certification/tbc-preservation-repair-transition.json']]){
  test(`rejects rewriting ${name}`,()=>fixture(root=>{
    fs.appendFileSync(path.join(root,file),'\n');
    assert.throws(()=>id.validateProtectedEvidence(root),/protected historical evidence changed/);
  }));
}
for(const field of ['predecessorFingerprint','id']){
  test(`rejects a successor transition with changed ${field}`,()=>fixture(root=>{
    const file=path.join(root,id.TRANSITION),value=JSON.parse(fs.readFileSync(file));
    value.questions[0][field]='unrecognized';fs.writeFileSync(file,JSON.stringify(value));
    assert.throws(()=>id.loadTransition(root),/authorized transition record altered/);
  }));
}
for(const [file,read] of [[id.MANIFEST,id.loadManifest],[id.TRANSITION,id.loadTransition]]){
  test(`missing ${path.basename(file)} cannot fall back to a historical identity`,()=>fixture(root=>{
    fs.unlinkSync(path.join(root,file));assert.throws(()=>read(root),{code:'ENOENT'});
  }));
}
