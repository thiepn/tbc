from pathlib import Path

INDEX = Path("index.html")
text = INDEX.read_text(encoding="utf-8")

STYLE_MARKER = "<!-- PR5_FOUNDATION_ASSETS -->"
STYLE_TAG = '<link rel="stylesheet" href="assets/pr5-foundation.css?v=pr5.1">'
SCRIPT_TAG = '<script src="assets/pr5-shell.js?v=pr5.1" defer></script>'

if STYLE_MARKER not in text:
    if "</head>" not in text:
        raise SystemExit("PR5 apply failed: </head> not found")
    text = text.replace("</head>", f"{STYLE_MARKER}\n{STYLE_TAG}\n</head>", 1)

if SCRIPT_TAG not in text:
    if "</body>" not in text:
        raise SystemExit("PR5 apply failed: </body> not found")
    head, sep, tail = text.rpartition("</body>")
    if not sep:
        raise SystemExit("PR5 apply failed: final </body> not found")
    text = f"{head}{SCRIPT_TAG}\n</body>{tail}"

if text.count(STYLE_MARKER) != 1:
    raise SystemExit("PR5 apply failed: style marker is not unique")
if text.count("assets/pr5-foundation.css") != 1:
    raise SystemExit("PR5 apply failed: stylesheet loader is not unique")
if text.count("assets/pr5-shell.js") != 1:
    raise SystemExit("PR5 apply failed: shell loader is not unique")

INDEX.write_text(text, encoding="utf-8", newline="\n")
print("PR5 foundation loaders applied successfully")
