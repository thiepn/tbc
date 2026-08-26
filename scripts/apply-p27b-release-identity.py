#!/usr/bin/env python3
from pathlib import Path
import json
import re
import sys

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
if not candidates:
    for i, match in enumerate(occurrences[:20], 1):
        start, end = match.span()
        context = re.sub(r'\s+', ' ', html[max(0, start - 180):min(len(html), end + 180)]).strip()
        print(f'context {i}: {context}')
    raise SystemExit('P27B: no safely identifiable stale application identity found; index.html left unchanged')

# Rebuild from exact spans. Nothing outside the identified version literals may change.
parts = []
cursor = 0
for start, end, _ in candidates:
    if start < cursor:
        continue
    parts.append(html[cursor:start])
    parts.append(NEW)
    cursor = end
parts.append(html[cursor:])
updated = ''.join(parts)

if updated == html:
    raise SystemExit('P27B: identity repair produced no change')
if OLD == NEW:
    raise SystemExit('P27B: old and new versions are identical')

package_after = package_re.search(updated)
if not package_after:
    raise SystemExit('P27B: embedded engine package disappeared during repair')
if package_after.group(2) != engine_payload_before:
    raise SystemExit('P27B: embedded engine/question payload changed; refusing repair')

remaining_candidates = []
for match in re.finditer(re.escape(OLD), updated):
    start, end = match.span()
    context = updated[max(0, start - 320):min(len(updated), end + 320)]
    if identity_marker.search(context):
        remaining_candidates.append(re.sub(r'\s+', ' ', context).strip())
if remaining_candidates:
    raise SystemExit(f'P27B: {len(remaining_candidates)} stale application identity occurrence(s) remain')

INDEX.write_text(updated, encoding='utf-8')
print(f'P27B: replaced {len(candidates)} stale application identity occurrence(s): {OLD} -> {NEW}.')
print('P27B: embedded engine/question payload is byte-for-byte unchanged.')
