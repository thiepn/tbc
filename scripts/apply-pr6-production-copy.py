from pathlib import Path

PATH = Path("assets/pr6-play-learning.js")
text = PATH.read_text(encoding="utf-8")

replacements = {
    "before entering the quiz engine.": "before starting the round.",
    "Quick Play keeps the current game defaults and hands directly into the existing session engine.": "Quick Play uses your current game settings and takes you straight into a mixed round.",
    "PR6 mirrors book choices it can verify in the legacy practice surface. Selecting one hands off to that exact existing target.": "Choose a book below to practice it directly, or open the full practice setup for more options.",
    "Book targets are not exposed on this legacy screen.": "Book shortcuts are unavailable here.",
    "Use the verified practice setup handoff instead; no guessed book mapping will be created.": "Open the full practice setup to choose your focus.",
    "Choose a book or open the game’s existing focused-practice setup.": "Choose a book or open the full focused-practice setup.",
    "Bible Journey is the guided route through all 66 books. PR6 owns the route screen; the existing engine still owns session scoring and question delivery.": "Bible Journey guides you through all 66 books while keeping your existing progress and scoring.",
    "The native path surface mirrors verified plan actions from the current game state rather than fabricating a second progress system.": "Your current path steps and progress stay in sync as you continue learning.",
    "Continue through the verified Learning Path handoff.": "Continue through your current Learning Path.",
    "Follow the structured plan already maintained by the game.": "Follow your structured plan and continue from your current step.",
    "Adaptive Review stays grounded in the game’s existing retention and mistake data. PR6 does not invent mastery scores.": "Adaptive Review uses your existing retention and mistake history to prioritize what to revisit.",
    "Preparing the native flow…": "Preparing your next step…",
    "Opening the existing session engine…": "Starting your session…",
    "setStatus(`Could not verify a ${FLOW_META[flow]?.title||flow} launch target. No guessed action was taken.`,'error');": "setStatus(`Could not start ${FLOW_META[flow]?.title||flow} from this screen. Try opening the mode again.`,'error');",
    "setStatus(`Could not verify the ${name} practice target.`,'error');": "setStatus(`Could not open ${name} practice. Try the full practice setup instead.`,'error');",
}

missing = [old for old in replacements if old not in text]
if missing:
    raise SystemExit("PR6 copy cleanup failed; expected source text missing:\n- " + "\n- ".join(missing))

for old, new in replacements.items():
    text = text.replace(old, new, 1)

for forbidden in replacements:
    if forbidden in text:
        raise SystemExit(f"PR6 copy cleanup failed; old player-facing text remains: {forbidden}")

PATH.write_text(text, encoding="utf-8", newline="\n")
print(f"PR6 production copy cleanup applied ({len(replacements)} replacements)")
