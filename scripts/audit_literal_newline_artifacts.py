from pathlib import Path
import re

source = Path('index.html').read_text(encoding='utf-8')
failures = []


def check(condition: bool, message: str) -> None:
    if not condition:
        failures.append(message)


head_close = source.find('</head>')
head_source = source[:head_close] if head_close >= 0 else ''
check(head_close >= 0, 'structural </head> missing')
check(
    re.search(r'\\[nr][ \t]*<(?:style|script|meta|link|title)\b', head_source, flags=re.I) is None,
    'literal escaped newline appears as structural text inside <head>',
)

style = re.search(r'(?is)<style id="v340-product-polish">(.*?)</style>', source)
if style:
    check('\\n' not in style.group(1) and '\\r' not in style.group(1),
          'v340-product-polish contains literal escaped newlines')

body = re.search(r'<body\b[^>]*>', source, flags=re.I)
check(body is not None, 'structural <body> missing')
if body:
    first_child = source.find('<', body.end())
    body_prefix = source[body.end():first_child] if first_child >= 0 else source[body.end():]
    check('\\n' not in body_prefix and '\\r' not in body_prefix,
          'literal escaped newline appears immediately after <body>')

check('literal-newline-artifact-guard' not in source,
      'temporary literal-newline runtime guard must not ship')

if failures:
    print(f'Literal newline artifact audit failed ({len(failures)}):')
    for failure in failures:
        print(f'- {failure}')
    raise SystemExit(1)

print('Literal newline artifact audit: PASS')
