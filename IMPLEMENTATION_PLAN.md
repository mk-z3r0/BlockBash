# Block Bash — Implementation Plan

> Companion to [GAME_DESIGN.md](GAME_DESIGN.md). The design doc owns *what the game is*.
> This one owns *how it gets built and in what order*.

---

## Where the code is today

Vanilla JS + HTML5 Canvas, no frameworks, no build step. ES modules served over
http (Live Server) — not `file://`.

```
src/
  engine/     game loop, physics constants, input, camera, renderer
  entities/   player, enemy, npc, coins, particles
  weapons/    bazooka
  levels/     levelLoader, levelRenderer, trickPlatforms (parked), data/level1.js
  scenes/     sceneManager + title, playing, win, gameOver
  ui/         hud, overlays
  audio/      audio (synth), sfx
tools/        gap-probe, cutscene-probe, shot  (dev tools, need the server running)
```

| Phase | Status |
|---|---|
| 0 — module split + scene manager | done |
| 1 — data-driven levels, loader, transitions | steps 1–4 done — loader, renderer, spikes, level 1 extended |
| **Milestone: Level 1 complete** | **not yet reached** — progression + versioned save are done; 3 of 5 retrofit items done (intro cutscene, coin thresholds, skybox resolved); weapon gating and carved platform damage remain |
| 2+ (level tool, chamfers, enemies, weapons, octagons, world manipulation, polish) | not started, re-scoped by the design doc, blocked on the milestone |

Level 1 runs 0–7200px: pits and passive spheres, then a spike half, then an
unwinnable chainsaw boss resolved by a rescue NPC. Three checkpoints.

See [Milestone: Level 1 complete](#milestone-level-1-complete) — nothing
below it starts until that's checked off.

---

## Decisions made

| Question | Decision | Why it matters |
|---|---|---|
| How does terrain get "rounded"? | **Chamfers — corners cut at 45°, not curves.** Discrete damage states, progressively deeper | Curves would force a collision rewrite. A diagonal is the classic slope problem and stays tractable |
| The bazooka vs. "player starts unarmed" | **Stays.** Becomes the triangle shooter — earned, not innate, with limited ammo | Triangles *are* the missing corners, so restoring an octagon is literal geometry, not metaphor |
| Level 1 | **Keep it, retrofit it.** Good concept test | Passive enemies, foreshadowing boss and rescue NPC already fit the story |
| Spikes (absent from the design doc) | **Debris from the world being carved** | Folds an orphan mechanic into the narrative |
| What a restored octagon does | **Becomes a square again and flees** — an ally, not a recruit | Restoration is a *rescue* verb. Keeps freed squares out of the combat math |
| Does the triangle shooter still kill? | **Yes — it still pops spheres** | It's the main gun with a second verb, not a niche tool |
| Trick platforms | Parked in `levels/trickPlatforms.js`, out of level 1, returning later | Level 1 is the beginner level; trolling escalates in later levels |
| Art direction | **Stay fully procedural** — canvas-drawn shapes, synthesized audio, no image/sprite/audio-file assets | Matches the current skill set, needs no art pipeline, and it's already carried the whole game so far. Revisit only if scope grows well past the current design doc |
| Opening cutscene style | **Super Metroid's ship-landing pacing** — slow burn (~13s), wordless, wide shot → descent → impact → a hard cut to intimate scale, no crossfade. Plays once ever, skippable any time | Restraint over reminders: show it once, powerfully, and let the world carry the memory rather than repeating it. Also why the planet's damaged corner doesn't reappear in level 1's gameplay background — the cutscene already said it |

### The unifying idea

A square with all four corners cut off **is an octagon.** So carved terrain and
corrupted squares are the same visual language at different scales. "Corners
being taken away" becomes the universal sign of sphere damage — one rendering
approach, one thing for the player to learn.

---

## Architecture constraints

Things that are cheap to build in now and expensive to retrofit.

**Weapons must be entity-agnostic.** The design doc has enemies carrying and
dropping weapons. Today `updateBazookaInput(player)` reads the keyboard
directly, cooldown state lives on the player object, projectiles carry no
owner, and `updateMissiles()` only ever tests projectiles against *enemies*.
For an enemy to fire, projectiles need an owner and collision has to resolve
against whoever isn't it. Build this at the start of the weapons work.

**Chamfer is a surface profile, not a flag.** A platform stops being "flat top
at `y`" and becomes a height-at-x function: for a top corner cut by N px, the
surface rises linearly across the first N px. Contained to the `overlapTop`
branch of collision in `entities/player.js`.

**Terrain damage is runtime state, not authored data.** Enemies carve during
play, so chamfer values are mutated live. The loader already clones platforms
per load, so a level reset wipes damage for free — don't break that.

**Trolling needs a visible cause.** The parked trick-platform code triggers off
the *player's* position. The design rule says the spheres must be visibly doing
it, so the trigger becomes a sphere actor near the platform. The tuning
constants survive; the trigger model gets replaced.

**Non-gameplay modes are scenes.** The opening cutscene (cube planet, descending
spheres, corner exploding) renders nothing like a side-scroller. That's a scene,
and the scene manager already handles the swap.

---

## Milestone: Level 1 complete

Before any work spreads across levels 2–7, level 1 goes all the way to done —
playable start to finish with nothing marked TODO. This is a deliberate
checkpoint, not just "finish Phase 1": it's the difference between building
seven levels' worth of half-finished systems and having one complete game
loop to actually hand someone a controller for.

Done means every box in [Level 1 retrofit](#level-1-retrofit) is checked,
progression and save both work end to end, and the coin→life economy is
tuned. Nothing about *later* levels — enemy tiers, looted weapons, octagons —
needs to exist yet. Level 1 uses none of that.

---

## Build order

Each step is sequenced by what it unblocks, not by how fun it is. Steps 1–2
are the milestone above; step 3 onward is what comes after — starting with
the level tool, built early on Mike's call rather than waiting until hand-
authoring starts hurting.

**1. Finish Phase 1 — progression + save** — done
`startLevel()`/`retryCurrentLevel()`/`startNewRun()` (src/scenes/playingScene.js)
replaced one resetGame() that couldn't tell "new run" from "same-level retry"
apart. Game over restarts the *current* level, never level 1 — verified with
tools/progression-probe.html by forcing a 2-level registry at runtime, since
that branch is a no-op with only one real level to observe. Coin counter +
coins→extra-life thresholds on the HUD. A 1-entry level registry
(src/levels/registry.js) exists and is what the level-transition logic reads
from, ready for level 2 to just be appended.

Save via localStorage (src/save.js), wrapped in try/catch — it throws
outright in private browsing — **and versioned from the start**: every save
carries a `saveVersion` field, and a mismatch means "reset," never "crash" or
"load anyway and hope." Tracks furthest level reached and best score;
recorded at level-advance, win, and game-over. Shown on the title screen when
a save exists. Verified with tools/save-probe.html: round-trip, a lower score
never regresses the best, a version mismatch or corrupted/malformed JSON both
reset cleanly instead of trusting bad data, and a simulated storage failure
(private browsing) doesn't crash the game.

**2. Level 1 retrofit**
See the checklist below. This is what turns "concept test" into "finished
level."

**3. Level authoring tool**
A small in-browser layout tool: click to place platforms/hazards/enemies/coins,
drag to resize, export in the existing level-data format. It doesn't need to
be pretty — it needs to kill the hand-type-coordinates-then-eyeball-the-probe-
output loop that level 1's spike section took. Worth drawing the ~162px jump
arc directly on the canvas as a placement guide, so an obviously-bad gap or an
overhead platform is visible *before* a probe run catches it. Pays off starting
with level 2, and every level after.

**4. Chamfer rendering + collision — authored only**
Cut corners as level data, drawn and collided, with nothing carving them yet.
Level 2 can open with pre-cut blocks showing the spheres have been at work.
De-risks the foundation without needing enemy AI to exist. Comes after the
level tool so the tool only has to support one terrain format, not two.
*Expect jump tuning to shift slightly near cut edges — re-run the gap probe.*

**5. Enemies**
Base class and the passive → pursuing → aggressive tiers. Enemies hold weapons.

**6. Weapons**
Entity-agnostic (see constraints). Player starts unarmed, weapons drop from
defeated enemies. Bazooka becomes the triangle shooter with limited ammo.

**7. Octagons**
Needs 5 and 6 — they're enemies, and restoring them needs the triangle weapon.
Introduced by a corruption cutscene. A restored one turns back into a square
and runs off-screen; that's the rescue NPC's existing `exit` state, so the
behavior is mostly already written.

*The real tension here is the ammo.* Triangles are scarce and the same weapon
is the player's main gun, so every rescue costs offence — and the square you
save just leaves. That's a genuine choice rather than a chore, and it's what
makes limited ammo interesting instead of annoying. Worth protecting when the
numbers get tuned: if triangles are plentiful, the choice evaporates.

Stomping stays the unarmed fallback, so running dry is never a dead end.

**8. Live world manipulation**
Sphere actors that carve terrain and move platforms. Revives the parked trick
code behind a visible sphere cause. Merges "trolling" and "reshaping" — they're
one system.

**9. Bosses, cutscenes, controller, polish**
Roughly the original roadmap. The opening cutscene may be worth pulling earlier
since it's the player's first impression and motivates everything. **Touch
controls belong here too** — parked for now (2026-09-18), see note below.
"Polish" here means procedural refinement (particles, screen shake, animation
curves, juice) — not a sprite pipeline; see the art-direction decision above.

Chamfers sit at #4 — right after the level tool, before any of the systems
that depend on the damage language (octagons, carving) — because retrofitting
a flat-top format after six more levels are authored would be miserable.

---

## Level design rules

Measured with `tools/gap-probe.html`, which drives the update loop directly and
reports how many jump timings actually clear each obstacle. Headless Chromium
barely fires `requestAnimationFrame`, so ticking `update()` by hand is the only
way to simulate more than a frame or two.

- **Jump arc:** rises ~146px, carries ~162px horizontally, ~45 frames airborne.
- **Never put a platform directly above a jump-off point.** The player rises
  into it and a correctly-timed jump becomes a death. This caused the worst bug
  in level 1.
- **Jumpable spike beds cap at ~60px.** Wider and jumping early enough to clear
  lands you mid-bed; the window of workable timings collapses (a 100px bed
  leaves ~44px of window, a 60px bed ~80px).
- **Wider hazards get crossed via platforms,** not jumped.
- **Keep landing zones clear of the next hazard.** A hard jump carries 162px —
  don't let a full-power leap off a pit land in spikes.
- **Don't start an enemy patrol at a checkpoint.** Respawning into a sphere is a
  cheap death.
- **Debris reads as damage from above,** so spikes want a carved surface
  overhead — but that fights the no-platforms-overhead rule. Resolution: use it
  where the player crosses *on top* (the stepping-stone section is already this
  shape); elsewhere put the damage source beside the corridor, not over it.

Benchmark: an autoplayer with a fixed-lookahead policy clears level 1 without
dying. That proves nothing is impossible or unfair — it says nothing about
whether it's fun.

---

## Level 1 retrofit

Already fits: passive patrolling spheres, the unwinnable chainsaw boss as
late-game foreshadowing, the rescue NPC as the first supporting NPC.

To add:
- [x] Block house at spawn, and the opening cutscene leading into it —
  `scenes/introScene.js` (planet → spheres descend → corner blown off → hard
  cut to the house → player walks out), `scenes/blockHouse.js` shared between
  the cutscene and level 1's background at spawn so both draw the same house.
  Plays once ever (`save.js`'s `hasSeenIntro`), skippable any time
- [ ] Gate the bazooka — `B` does nothing until it's earned
- [x] Coin→life thresholds tuned against its ~45 coins
- [ ] Carved damage on elevated platform undersides above the spike debris
- [x] ~~The blown-off planet corner visible in the skyline~~ — resolved by
  *not* doing this: it's shown once, in the opening cutscene, and deliberately
  not repeated as a gameplay-background reminder (see the cutscene-style
  decision below)

---

## Open questions

**Blocking:** none right now.

**Worth deciding when step 7 gets close:**
- Can a *different* weapon kill an octagon outright? If so, killing one means
  killing a victim who could have been saved — a possible moral beat, or an
  unfair trap, depending on how clearly the game signals it.

**Not blocking yet** (from the design doc — they land in steps 6–9):
NPC roles and dialogue, boss frequency, weapon inventory vs. one-at-a-time,
whether octagon restoration is required or optional, cutscene style,
multiplayer, sound direction.

---

## Parked: touch controls

A standalone mobile-demo prototype (separate Claude Artifact, not in this
repo) tested on-screen d-pad + jump button, wired via `touchstart`/`touchend`
into a `touch` state object OR'd with the keyboard — that wiring pattern is
worth reusing. Its physics were a simplified throwaway (flat velocity, no
coyote time/jump buffer/variable jump height), not our real model — don't
port those.

Belongs in step 9 alongside gamepad support, in `engine/input.js` +
`index.html`. Open question for whenever it's picked up: show the buttons
always, or only on detected touch devices (leaning touch-only, to keep the
keyboard experience uncluttered) — not yet decided.
