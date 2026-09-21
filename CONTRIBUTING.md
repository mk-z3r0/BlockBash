# Contributing

Short version: **the repo is public to read, not open to pull requests yet.**

## Why not

Block Bash is still in the stage where the design changes faster than the
code. Decisions are made by playing it, and a lot of what currently looks
like a bug is a deliberate choice that hasn't been written down yet — or a
choice that's about to be reversed. Reviewing outside changes against a
moving target costs more than it's worth right now, and it isn't fair to
anyone who put real work into a patch.

This will change as the game gets closer to finished. There's no date.

## What *is* welcome

**Issues.** Especially:

- Something crashed, or the browser console has errors in it. Include the
  browser and what you were doing.
- A jump, a gap, or an enemy felt unfair, mushy, or wrong. Say where in the
  level, and what you expected instead. "This felt bad to play" is a
  complete bug report as far as this project is concerned.
- Something about the movement felt off. `tools/physics-lab.html` is a live
  tuning rig — if you can reproduce the feel you mean with different numbers
  in it, that's an extremely useful issue.
- The game doesn't run at all on your setup.

**Forks.** Fork it, take it apart, build something else with it. No
permission needed beyond what the license allows.

## Pull requests

PRs opened against this repo will be closed with a pointer back to this
file. That isn't a judgement on the change — it's the policy for every PR
right now, including good ones. If you found a real problem, please open an
issue describing it instead; that gets acted on.

## Reading the code

- `GAME_DESIGN.md` — what the game is meant to be, including the parts that
  are still open questions.
- `IMPLEMENTATION_PLAN.md` — how it's being built, in what order, and the
  reasoning behind each decision. Includes the mistakes.

Between them, those two documents explain most of the "why is it like this?"
questions the code raises.
