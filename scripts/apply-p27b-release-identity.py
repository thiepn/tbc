#!/usr/bin/env python3
from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parent.parent
INDEX = ROOT / 'index.html'
RELEASE = json.loads((ROOT / 'release.json').read_text(encoding='utf-8'))
OLD = '1.0.0'
NEW = RELEASE['version']

html = INDEX.read_text(encoding='utf-8')
package_re = re.compile(
    r'(<script id="tbc-engine-package" type="application/octet-stream">)([A-Za-z0-9+/=\r\n]+)(</script>)'
)
package_before = package_re.search(html)
if not package_before:
    raise SystemExit('P27B: embedded engine package not found; refusing to modify index.html')
engine_payload_before = package_before.group(2)

identity_marker = re.compile(
    r'APP_VERSION|appVersion|applicationVersion|app[\s_-]*version|application[\s_-]*version|release[\s_-]*version|The Bible Challenge|\bTBC\b',
    re.IGNORECASE,
)

occurrences = list(re.finditer(re.escape(OLD), html))
candidates = []
for match in occurrences:
    start, end = match.span()
    context = html[max(0, start - 320):min(len(html), end + 320)]
    if identity_marker.search(context):
        candidates.append((start, end, context))

print(f'P27B: found {len(occurrences)} raw {OLD} occurrence(s); {len(candidates)} application-identity candidate(s).')
for i, (_, _, context) in enumerate(candidates, 1):
    print(f'identity candidate {i}: {re.sub(r"\s+", " ", context).strip()}')

if len(candidates) != 1:
    if not candidates:
        for i, match in enumerate(occurrences[:20], 1):
            start, end = match.span()
            context = re.sub(r'\s+', ' ', html[max(0, start - 180):min(len(html), end + 180)]).strip()
            print(f'raw context {i}: {context}')
    raise SystemExit(f'P27B: expected exactly one stale application identity, found {len(candidates)}; index.html left unchanged')

start, end, _ = candidates[0]
updated = html[:start] + NEW + html[end:]
if updated == html or OLD == NEW:
    raise SystemExit('P27B: identity repair produced no valid change')

# Strong single-edit proof: reversing exactly the replacement recreates the original file.
if updated[:start] + OLD + updated[start + len(NEW):] != html:
    raise SystemExit('P27B: repair is not a single literal substitution')

package_after = package_re.search(updated)
if not package_after or package_after.group(2) != engine_payload_before:
    raise SystemExit('P27B: embedded engine/question payload changed; refusing repair')

INDEX.write_text(updated, encoding='utf-8')
print(f'P27B: replaced exactly one stale application identity: {OLD} -> {NEW}.')
print('P27B: embedded engine/question payload is byte-for-byte unchanged.')
