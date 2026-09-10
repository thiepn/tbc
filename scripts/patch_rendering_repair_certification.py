from pathlib import Path

path = Path('scripts/tbc-product-identity.cjs')
text = path.read_text(encoding='utf-8')


def replace_once(old: str, new: str, label: str) -> None:
    global text
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly one match, found {count}')
    text = text.replace(old, new, 1)


replace_once(
    "const BATCH07_SUCCESSOR = 'e8531e739b871236853115707b6b6bdf702996aa';\n"
    "const BATCH07_PREDECESSOR = 'f1f4a8d4adeae2edd95f28624826abf96caa5b33';",
    "const BATCH07_SUCCESSOR = 'e8531e739b871236853115707b6b6bdf702996aa';\n"
    "const BATCH07_PREDECESSOR = 'f1f4a8d4adeae2edd95f28624826abf96caa5b33';\n"
    "const RENDER_REPAIR_SUCCESSOR = '742834e8ce148dcc8c8d8fcfdfa2d7baa7ea5f0f';",
    'render repair successor constant',
)

replace_once(
    "return { ...baseline, source: { ...baseline.source, indexBlobSha1: manifest.successor.indexBlobSha1 }, hashes: { ...baseline.hashes,",
    "return { ...baseline, source: { ...baseline.source, indexBlobSha1: RENDER_REPAIR_SUCCESSOR }, hashes: { ...baseline.hashes,",
    'current P2A source identity',
)

replace_once(
    "  for (const file of PRODUCT) {\n"
    "    const expected = file === 'index.html' ? BATCH07_SUCCESSOR : gitText('rev-parse', `${BASE}:${file}`);\n"
    "    assert.equal(manifest.productFiles[file], expected, `unauthorized product identity: ${file}`);\n"
    "    assert.equal(candidateBlob(root, file), expected, `current product identity changed: ${file}`);\n"
    "    assert.ok(rawTextIdentityMatches(read(root, file), expected), `current product raw identity changed: ${file}`);\n"
    "  }",
    "  for (const file of PRODUCT) {\n"
    "    const historicalExpected = file === 'index.html' ? BATCH07_SUCCESSOR : gitText('rev-parse', `${BASE}:${file}`);\n"
    "    const currentExpected = file === 'index.html' ? RENDER_REPAIR_SUCCESSOR : historicalExpected;\n"
    "    assert.equal(manifest.productFiles[file], historicalExpected, `unauthorized historical product identity: ${file}`);\n"
    "    assert.equal(candidateBlob(root, file), currentExpected, `current product identity changed: ${file}`);\n"
    "    assert.ok(rawTextIdentityMatches(read(root, file), currentExpected), `current product raw identity changed: ${file}`);\n"
    "  }",
    'current product identity loop',
)

replace_once(
    "assert.equal(summary.source.indexBlobSha1, manifest.successor.indexBlobSha1, 'content evidence has stale source identity');",
    "assert.equal(summary.source.indexBlobSha1, RENDER_REPAIR_SUCCESSOR, 'content evidence has stale source identity');",
    'content source identity',
)

replace_once(
    "BATCH04_SUCCESSOR, BATCH04_PREDECESSOR, BATCH07_SUCCESSOR, BATCH07_PREDECESSOR, HISTORICAL_MANIFEST",
    "BATCH04_SUCCESSOR, BATCH04_PREDECESSOR, BATCH07_SUCCESSOR, BATCH07_PREDECESSOR, RENDER_REPAIR_SUCCESSOR, HISTORICAL_MANIFEST",
    'module exports',
)

replace_once(
    "console.log('CURRENT PRODUCT IDENTITY PASS: recognized Batch 07 successor, 13 product files, immutable prior evidence and baselines, source-only current P2A authority, unchanged acceptance test.');",
    "console.log('CURRENT PRODUCT IDENTITY PASS: recognized Batch 07 history plus literal-newline rendering-repair successor, 13 product files, immutable prior evidence and baselines, source-only current P2A authority, unchanged acceptance test.');",
    'identity success message',
)

path.write_text(text, encoding='utf-8')
print('patched tbc-product-identity.cjs for rendering repair successor')
