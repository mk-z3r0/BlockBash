# Block Bash — Implementation Plan

> Companion to [GAME_DESIGN.md](GAME_DESIGN.md). The design doc owns *what the game is*.
> This one owns *how it gets built and in what order*.

---

## Where the code is today

Vanilla JS + HTML5 Canvas, no frameworks, no build step. ES modules served over
http (Live Server) — not `file://`.

```
src/
  main.js       fixed-timestep loop (accumulator, see Architecture constraints)
  state.js      run state (lives, score, enemies, projectiles, …)
  save.js       versioned localStorage progress + narrative state
  narrative.js  story position — cutscenes seen, NPC stage, flags. Persisted
  engine/       physics constants (SMB3-derived), input, gamepad, camera, renderer
  entities/     player, enemy, bosses, npc, coins, particles, weaponPickup
  weapons/      registry + combat (entity-agnostic), pickaxe, sledgehammer,
                cornerstone; bazooka + chainsaw still parked for a later level
  levels/       levelLoader, levelRenderer, registry, terrain,
                trickPlatforms (parked), data/level1..level7.js,
                data/testLevel.js (sandbox dupe, see below)
  cutscenes/    runner, library, triggers, say, speakers,
                level1/ level2/ level3/ level7/ faces.js sandbox/
  scenes/       sceneManager + title, intro, playing, win, gameOver;
                blockHouse (shared drawing); playing/collisions.js
  ui/           hud, dialogue, overlays, textWrap
  audio/        audio (synth), sfx
tools/          ~45 single-purpose probe pages — dev-only, need the server
                running. See "Verifying a level" for which ones matter
```

`tools/` is append-only by habit: each probe is a throwaway page written to
answer one question, kept afterwards so the answer can be re-checked when a
constant changes. `tools/physics-lab.html` is the exception — it's a real
live-tuning harness, not a one-shot probe, and it's how the current physics
values were arrived at.

`data/testLevel.js` is a straight duplicate of `data/level1.js`, loaded instead
of it when the game is opened with `?test` in the URL (see `levels/registry.js`)
— a sandbox for trying out controls/weapons/enemies changes without touching
the real level 1. It diverges freely once created; nothing keeps it in sync.

| Phase | Status |
|---|---|
| 0 — module split + scene manager | done |
| 1 — data-driven levels, loader, transitions | done |
| **Milestone: Level 1 complete** | **reached (2026-09-21)** |
| **The whole game** | **playable start to finish (2026-09-21)** — seven levels, seven bosses, three weapons, the full NPC arc, and the ending. See "What got built" below |
| 4 — chamfers as a collision surface | **not built.** The visual half shipped (carved undersides, `chewed` platforms); collision is still square. See the honest list at the end |
| 3 — level authoring tool | **not built, and probably not needed** — see the note under Build order |
| 8 — live sphere-driven world manipulation | **partial.** Bosses carve terrain during fights; the parked trick platforms are still parked |
| *out of band* — SMB3 physics rewrite + tuning lab, level-1 retune, level-edge transition | done, merged to `main` in a74db2f |

### What got built (2026-09-21)

The game goes from the block house to the core. Seven levels, each ending at
the edge of its cube face except the sixth, which ends by falling through it.

| System | Where | Note |
|---|---|---|
| Terraced ground | `levels/levelLoader.js` | A ground segment may sit above the level's base line. Everything that reads ground already read `seg.y`, so this was a data change rather than a system one |
| Moving platforms | `levels/movers.js` | Lifts and sliders on a clock. A slider hands back its delta so it carries the player; a lift doesn't need to, since it rises into them and collision resolves it |
| Impact | `engine/impact.js` | Screen shake and hit-stop on every landed hit. Suspended during cutscenes, whose beats are timed in frames and asserted by probes |
| Weapon registry | `weapons/registry.js` | Register by name; look up behaviour, drawing and sound by type. Three weapons |
| Entity-agnostic combat | `weapons/combat.js` | An *owner* is anything with a position, a facing, a weapon id and three timers. A sphere swings through the same path the player does |
| Enemy tiers | `entities/enemy.js` | passive → pursuer → aggressor, declared per spawn, defaulting to passive so level 1 never moved |
| Octagons | `entities/enemy.js` | Cannot be beaten by anything. Restored, or walked past |
| Bosses | `entities/bosses.js` | One small state machine each — jam it, restore it, puzzle it, survive the room, out-fight it, put the world back |
| Narrative state | `narrative.js` (existing) | Now actually carries the arc: `npcStage`, `flags`, persisted |
| The audit gate | `tools/level-audit-probe.html` | Per-obstacle proof that a level is playable. See "Verifying a level" |

**Every level's geometry is machine-checked**, not eyeballed: `run-probes.sh`
audits each level in the registry, and a level that fails does not ship. That
gate caught a re-introduction of the single worst bug level 1 ever had (a
platform directly over a spike bed's take-off) within an hour of it being
written.

Level 1 runs 0–7200px: pits and passive spheres, a staircase and a tall wall,
then a spike half, then an unwinnable boss (50% larger than a normal sphere,
wielding a pickaxe) resolved by a rescue NPC that stomps it and leaves the
pickaxe behind — the player's first and only weapon this level. Three
checkpoints. It ends at the world's edge, not a flag: the player leaps off,
the cube rotates under them, and they land on the next face (see
[Level-edge transition](#level-edge-transition-2026-09-20-physics-lab-branch)).

Level 1 is face 1 of 6, then a descent, then the hollow centre — GAME_DESIGN.md's
"Story Arc — surface to core" is the shape the whole build order was aimed at,
and as of 2026-09-21 all of it exists. The registry has seven entries.

The `physics-lab` work (SMB3-derived physics rewrite, the tuning lab, the
level-1 retune, the edge transition) was merged to `main` in a74db2f.

---

## Decisions made

| Question | Decision | Why it matters |
|---|---|---|
| How does terrain get "rounded"? | **Chamfers — corners cut at 45°, not curves.** Discrete damage states, progressively deeper | Curves would force a collision rewrite. A diagonal is the classic slope problem and stays tractable |
| The bazooka vs. "player starts unarmed" | **Parked, not converted.** Level 1's retrofit (2026-09-19) got to "player starts unarmed, earns a weapon from a defeated enemy" first, via a melee pickaxe dropped by the boss (`weapons/pickaxe.js`) — the bazooka isn't the player's level 1 weapon anymore. It still exists in the codebase (`weapons/bazooka.js`), just not wired into any scene right now: confirmed (2026-09-19) it's planned to reappear later in the game, so it's parked rather than deleted or converted. The triangle-shooter idea is still the plan for whatever *that* eventually becomes, whenever it's actually built | Triangles *are* the missing corners, so restoring an octagon is literal geometry, not metaphor — that reasoning still holds whenever the triangle shooter actually gets built |
| Level 1 | **Keep it, retrofit it.** Good concept test | Passive enemies, foreshadowing boss and rescue NPC already fit the story |
| Spikes (absent from the design doc) | **Just an obstacle** (2026-09-21). Briefly decided as debris from the carved world; reversed — too few platforms sit over spikes for that reading to land, and the plain one (the spheres put them there to slow you down) needs no scaffolding | An obstacle doesn't have to earn a narrative justification before it's allowed to exist |
| Does a weapon survive a level boundary? | **Yes — levels declare what the player arrives carrying** (`startsWith` in level data, 2026-09-21). The old rule reset the player to unarmed on every load | Losing an earned weapon at a seam, for no reason the player can see, reads as a bug. Declaring it per level also survives a retry, which carrying it in run state would not |
| One weapon or a loadout? | **One at a time**, stomping as the fallback | It's the only thing that keeps the Cornerstone's ammo scarcity honest — with a melee weapon also in hand, running dry costs nothing |
| Can an octagon be killed? | **No. By anything.** Swinging at one thuds | "Restoration is a rescue verb" stops being true the moment there's a faster way through. It also removes the moral trap of letting the player kill a victim by accident |
| Is a boss "can't be hurt"? | **Per-boss, via `invulnerable` in data** — level 1's Foreman sets it permanently, the Excavator's phase machine toggles it | "Is a boss" and "can't be hurt" stopped being the same thing the moment a second boss existed |
| What ends level 6? | **A fall, not a rotation** | Five faces of walking off an edge and having the world turn under you is the setup. The descent is the one that doesn't |
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
dropping weapons — level 1's boss already does the "dropping" half (see the
Level 1 retrofit). Today `updateWeaponInput(player)` (`weapons/pickaxe.js`)
reads the keyboard directly, cooldown state lives on the player object, and
the swing hitbox only ever tests against *enemies*. For an enemy to swing
back, the hit test has to resolve against whoever isn't the swinger, not be
hardcoded to "the player attacks, enemies get hit." Build this generically at
the start of the weapons work, not by special-casing a second weapon module.

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

**Weapon sound identities are part of the weapon, not polish.** `audio/sfx.js`
is procedural, so a new sound is a function rather than an asset — cheap to add,
which is exactly why it keeps getting deferred. The design doc now specifies an
audio signature per weapon (sustained drill buzz, dynamite's fuse-pause-boom,
the restoration weapon's crystalline chime). Write the sound with the weapon in
the same piece of work; the list is going to grow past a dozen entries and
retrofitting identity onto a weapon that already ships feeling generic is much
harder than it sounds.

### Scaling concerns (2026-09-21 review)

Observed by reading the current codebase against what levels 2–7 and the story
arc actually need. None of these are broken today — they're all things that get
expensive in direct proportion to how long they're left.

**Level data files will outgrow single files.** `src/levels/data/level1.js` is
already 223 lines and most of that is the comments that make it maintainable at
all. Add evolving enemy behaviours, the trick platforms coming back, and runtime
terrain-damage state, and level 3–4 files balloon well past readable. Split per
level into sub-modules — `level1/geometry.js`, `level1/enemies.js`,
`level1/events.js` — with a barrel file assembling them. Side benefit that
matters more than it looks: two people can then edit different parts of the same
level without a merge conflict.

**The cutscene state machine in `playingScene.js` is already straining.** The
boss cutscene is 100+ lines of state machine sharing a file with the entire
gameplay update/draw loop, and the edge transition added a second one beside it.
Still coming: octagon corruption reveals, the NPC handoff beat, and a boss
encounter per level. This file becomes the dumping ground for every scripted
moment in the game. Phase 5 already nominally owns "cutscene engine earns its
own home" — **the edge transition and the NPC arc make that urgent enough to
move earlier in the build order** (see step 4b below). A lightweight
`cutsceneRunner.js` taking a sequence of timed beats (freeze, animate, callback)
would empty most of `playingScene.js`'s state-machine weight and make every
future scripted moment cheap instead of structural.

**The weapon system needs its entity-agnostic refactor *before* level 2, not
during it.** The existing note above covers `updateWeaponInput`. The additional
piece: `entities/weaponPickup.js` also assumes a single drop type (the pickaxe).
The moment level 2 introduces a second weapon, pickups need a `type` field
mapping to different swing/fire/draw/sound behaviours — and the naive version of
that is an if/else chain that grows with every weapon. Build a **weapon registry**
(register a weapon by name; look up behaviour, drawing, and sound by type) as
part of the same piece of work as the entity-agnostic refactor. One job, done
once, rather than two half-migrations.

**~~Camera only tracks X~~ — done (2026-09-21).** `engine/camera.js` now has
`camera.y` alongside `camera.x`, added for the edge transition's look-down beat.
It's 0 for all normal play and `updateCamera` still only drives X, but the axis
exists and `drawWorldAndHUD` honours it. When a face is oriented so the player
traverses vertically, or level 7's hollow interior needs vertical descent, the
remaining work is giving Y the same easing and clamping X already has — not
threading a new axis through the renderer.

**NPC persistence across levels is state that doesn't exist yet.** The rescue
NPC's arc — progressive damage, reappearances, the handoff, the corruption —
needs state that survives a level load, and nothing in the current architecture
does that. `state.js` holds run-level counters, `loadLevel()` clones level data
fresh every time, and the NPC itself is a local variable in `playingScene.js`
that gets nulled between levels. This needs deciding deliberately: either a
`narrativeState` object in `state.js` (NPC damage level, which cutscenes have
played, story-gate flags) or a separate `story.js` module. `save.js` would need
to persist it too, or quitting mid-game loses the story position while keeping
the level progress — which would read as a bug. **Design this before building
the NPC's level 2+ appearances**, not alongside them.

**~~`playingScene.js` is a god module~~ — resolved 2026-09-21.** It had
reached **768 lines, 61% of it two hand-rolled cutscenes**, with six more
levels planned at roughly two cutscenes each. The fix was the cutscene
system below, not a tidy-up: **370 lines** now, and adding a cutscene no
longer touches the file at all.

The measured before/after, since the original note's line count went stale
without anyone noticing and that's worth not repeating:

| Responsibility | Before | After |
|---|---|---|
| Boss showdown | ~252 (inline) | `cutscenes/level1/bossShowdown.js` |
| Edge transition | ~213 (inline) | `cutscenes/level1/edgeTransition.js` |
| Collision responses | inline | `scenes/playing/collisions.js` |
| Terrain damage | inline (`minedGap`) | `levels/terrain.js` |
| Scene object, draw, level start | ~266 | ~270, unchanged in substance |

**The remaining rule still holds:** adding a new system means adding a
module and one line to the update sequence, not weaving 40 lines into the
middle of an existing function. `update()` is now a sequence of named steps
gated on one `currentLocks()` read.

### The cutscene system (2026-09-21) — read this before writing one

Build-order step 4b, done. **This is the contract every future cutscene is
written against**, so it's documented here rather than left to be
reverse-engineered from `cutscenes/runner.js`.

**Adding a cutscene is three things and none of them are in a scene file:**

1. A beat list in `src/cutscenes/<level>/<name>.js`
2. A line in `src/cutscenes/library.js` registering it by id
3. A trigger in the level's data: `{ id, when: {...}, once?: true }`

**A beat is data:**

```js
{
  name: 'charge',
  locks: { physics: 'freeze' },   // omitted = defaults, see below
  enter(c) {}, update(c, frame) {}, exit(c) {},
  draw(c) {},        // in-world, inside the camera AND world-rotation transform
  drawScreen(c) {},  // screen space, over the HUD
  frames: 45,        // end after N updates, and/or
  until: c => bool   // end as soon as this goes true — whichever fires first
}
```

**Locks are the heart of it.** Three axes, fixed vocabulary, defaults chosen
so the common case ("the player can't move but the world keeps living") is
an empty `locks`:

| Axis | Values | Default | What it means |
|---|---|---|---|
| `input` | `locked` / `free` | `locked` | does the player drive the avatar |
| `physics` | `run` / `freeze` | `run` | does the world simulate at all |
| `camera` | `follow` / `scripted` | `follow` | `scripted` = the scene doesn't touch it |

`playingScene.update()` reads this **once, at the top**, and branches in one
place. That read happens *before* the cutscene advances, deliberately: a
beat that ends this frame still governs this frame, which is what the
hand-rolled code did and what the probes' frame counts assume.

**Dialogue is a beat type.** `say('quarrick', 'text', { auto: 90 })` from
`cutscenes/say.js`. Bottom-bar panel (`ui/dialogue.js`), word-wrapped
(`ui/textWrap.js` — canvas has no wrapping), typewritten, per-speaker blip.
Speakers are registered in `cutscenes/speakers.js`; colour is the whole of a
speaker's identity, since there's no room for portraits. Defaults to
freezing the world and waiting for a keypress; both overridable.

**Three traps, each of which cost something to find:**

- **Beats chain within one tick.** When a beat ends, the next one enters
  *and* updates in the same tick. Not a stylistic choice — the boss beats
  were a run of separate `if`s in one function, so falling out of one fell
  into the next, and `cutscene-probe.html` asserts the boss dies on a
  specific frame. Anything else shifts that by one frame per boundary.
- **`c.data` is for things that die with the cutscene, and nothing else.**
  Entities that outlive it (Quarrick keeps walking off-screen after the
  showdown hands control back) belong in `state`. World mutation that must
  survive a respawn (the boss's mined pit) belongs to the level —
  `levels/terrain.js`, which is also the seam the chamfer work will use.
- **The outcome goes in `onComplete`, not in the last beat's `exit`.** A
  skip runs `onComplete` but deliberately *not* the exit hooks it jumped
  over, because firing every sound and spawning every particle the player
  just chose to skip is not what skipping means. Put "the boss is dead and
  the pickaxe is on the ground" in `onComplete` and make it idempotent —
  otherwise Escape at the wrong moment strands the player next to a live
  boss with no weapon. Asserted in `cutscene-probe.html`.

**Not converted: `introScene.js`.** 511 lines of bespoke 3D planet
rendering in a standalone scene with no gameplay world, so the in-world lock
machinery buys it nothing. The runner is scene-agnostic, so its *timeline*
could move later while keeping its draw code. Revisit when a second
standalone cutscene exists.

**Probes:** `cutscene-runner-probe.html` asserts the contract above against
synthetic beat lists (24 checks — lock semantics driven through the real
update loop, chaining, skip, leak-freedom). `dialogue-probe.html` covers
wrapping, the typewriter, and advance-vs-complete, plus `?test&live=N` to
screenshot the bar in the running game.

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

**~~3. Level authoring tool~~ — not built, and the need turned out to be
something else.**

Six levels were hand-authored after this was written, and the loop it was
meant to kill never hurt the way it was expected to. Typing coordinates is
fast. What was actually slow and dangerous was *not knowing whether a layout
was playable* — and the thing that answers that is not a canvas with a jump
arc drawn on it, it's a machine that tries the jump.

`tools/level-audit-probe.html?level=N` does that: every gap and every jumpable
spike bed, at both speeds across three timings, from a clean runway, plus the
structural rules checked statically. A level that fails it doesn't ship. It
caught a platform sitting over a spike bed's take-off in level 2 — the exact
class of bug this section calls "the worst bug in level 1" — within an hour of
that level being written, which is faster than a placement guide would have.

A visual editor would still be nice for *shaping* a level rather than
validating one, and if hand-authoring ever does start hurting, this is the
thing to build. It just isn't blocking anything today.

**4. Chamfer rendering + collision — HALF BUILT, and the half that shipped is
the visual one.**

What exists: carved undersides on any platform over a spike bed, and a
`chewed: true` flag in level data that forces the same damage anywhere. That
carries the design doc's **visual degradation arc** exactly as intended —
a couple of chipped platforms in level 2, most of level 5, nearly everything
by level 6 and 7. It's authored terrain, costs nothing at runtime, and the
square-minus-its-corners language now runs from a platform's underside
through the octagons and Quarrick's body all the way to the core.

What does NOT exist: **chamfer as a collision surface.** Platforms are still
flat-top rectangles. Nothing is walked up, nothing is stood on at 45°, and
`overlapTop` is untouched. The plan's "surface profile, not a flag" note in
Architecture constraints is still the right design and still unimplemented.

Doing it now is harder than doing it then, which is what this step warned
about — seven levels of geometry are authored against square collision. But
it is not as bad as it sounds: no level *depends* on a cut corner being
walkable, because none of them could. Adding sloped collision would change
how existing terrain feels, not whether it works. **Re-run the gap probe and
every level audit after**, which is now one command.

**~~4b. Cutscene runner~~ — DONE 2026-09-21.** Pulled forward from Phase 5
and built out further than the original one-paragraph sketch, once the real
count landed: **six more levels at roughly two cutscenes each, most with
dialogue.** At ~100 lines welded into `playingScene.js` per cutscene, that
was not a file that survived the content.

Shipped: the beat runner and its lock vocabulary, both existing in-world
cutscenes ported to it with frame-identical behaviour, a bottom-bar dialogue
system, narrative state persisted to the save, and triggers declared in
level data. Also pulled the collision responses and terrain damage out while
the seams were open. **The contract is documented under Architecture
constraints — read that before writing a cutscene.**

Dialogue exists but level 1 says nothing, deliberately: the story starts
opening up in level 2, and placeholder lines in the one finished level would
be words nobody meant. The dialogue path is exercised in the `?test` sandbox
instead (`cutscenes/sandbox/sandboxChat.js`).

Still open behind this, for whoever writes level 2's cutscenes:
- **`introScene.js` is still hand-rolled** — see the note in Architecture
  constraints for why that's the right call for now.
- **Skip keys are inconsistent.** The intro takes any key; in-world
  cutscenes take Escape only, and dialogue takes Space to advance. The
  in-world pair is deliberate (an ordinary jump input used to clear the
  level); the intro is just older. Worth unifying once there's a second
  standalone cutscene to unify *with*.
- **`state.rescueNPC` is a single slot.** Fine while Quarrick is the only
  scripted character on screen. A scene with two of them needs a list.

**~~5. Enemies~~ — DONE 2026-09-21.**
`tier` on the spawn: `passive` (the default, so level 1's data never changed),
`pursuer` (breaks patrol inside ~230px and swings whatever tool it carries),
`aggressor` (further, faster, and shoots). All three share one movement
function with different numbers, deliberately — what the player feels is range
and commitment, not manoeuvre.

`minX`/`maxX` stay the leash even while chasing: a sphere that could follow
anywhere would walk off its own platform, and levels are authored assuming it
can't.

The **ranged attack** is a slow round pellet, in from level 4. GAME_DESIGN has
the reasoning; the short version is that legibility beat theme.

**~~6. Weapons + weapon registry~~ — DONE 2026-09-21, and done first.**
Built before a second weapon existed rather than during it, which is what this
step asked for. Three weapons: pickaxe, sledgehammer, Cornerstone.

The entity-agnostic part is real, not aspirational: `startAttack(owner)` and
`tickWeapon(owner)` take anything with a position, a facing, a `weapon` id and
three timers. A tool-carrying sphere in level 2 swings through the identical
path the player does. The one place the sides still differ is `opponentsOf()`,
because the player's targets live in a list and a sphere's target is a
singleton — a fact about the game, not a special case in the weapon logic.

Everything that can hurt the player — a sphere's swing, a sphere's shot,
walking into a corrupted square — raises **one** flag (`state.playerTouchedHazard`),
consumed once per frame by the scene. What being hit *means* is one decision
in one place regardless of what did the hitting.

**~~7. Octagons + the NPC arc~~ — DONE 2026-09-21.**
Both prerequisites this section named turned out to matter exactly as
predicted. Narrative state already existed (`narrative.js`) and now carries the
arc. The handoff/corruption beat is a beat list, not an inline state machine,
and it is the clearest possible argument for having built the runner first.

One thing this section did not anticipate: **the handoff cutscene must not be
`once: true`.** A player who dies after it respawns holding the level's
starting weapon, and a scene marked as seen would never run again — leaving
the Sculptor, which can only be beaten with the Cornerstone, unbeatable. It
replays per attempt, the same call level 1's boss showdown makes. The skip
path hands the weapon over too, because `onComplete` is the outcome.

The original text follows, since its reasoning about the ammo tension is still
exactly right and is what the numbers were tuned against.

---

**7. Octagons + the NPC arc**
Needs 5 and 6 — they're enemies, and restoring them needs the triangle weapon.
Introduced by a corruption cutscene. A restored one turns back into a square
and runs off-screen; that's the rescue NPC's existing `exit` state, so the
behavior is mostly already written.

This is also where the **rescue NPC's story arc** lands (progressive damage
across levels, the weapon handoff, the NPC's own corruption immediately after,
and the player being forced to restore them). Two prerequisites that aren't
obvious from the story side:

- **Narrative state has to exist first.** Nothing currently survives a level
  load — see the scaling note on NPC persistence. Decide `narrativeState` vs a
  `story.js` module, and whether `save.js` persists it, *before* building the
  level 2+ appearances rather than discovering it halfway through.
- **The handoff/corruption beat is the payoff for the cutscene runner** (4b).
  It's the single most sequenced moment in the game — give weapon, corrupt NPC,
  force the player to use it on them — and it's exactly the kind of thing that
  becomes unmaintainable as another inline state machine.

*The real tension here is the ammo.* Triangles are scarce and the same weapon
is the player's main gun, so every rescue costs offence — and the square you
save just leaves. That's a genuine choice rather than a chore, and it's what
makes limited ammo interesting instead of annoying. Worth protecting when the
numbers get tuned: if triangles are plentiful, the choice evaporates.

Stomping stays the unarmed fallback, so running dry is never a dead end.

**8. Live world manipulation — PARTIAL.**
What shipped: bosses that reshape the world while you're standing in it. The
Excavator drills pits out of its own arena; the Terraformer raises and drops
the platforms the fight happens on; the Core collapses sections of the cavity
floor. All of it runs through `levels/terrain.js`'s `carveGap`, all of it is
undone on a respawn, and all of it has a visible cause on screen — the design
rule that every troll moment must have one.

What did NOT ship: ordinary spheres doing it. `levels/trickPlatforms.js` is
still parked, and its tuning constants are still the valuable part. The
trigger model this section describes — a sphere actor near the platform rather
than the player's position — is still the right one and still unwritten.

One number worth keeping: the Core's floor collapses are **capped at six**.
Uncapped, a long fight saws the arena into islands the player can't cross,
which turns "hard" into "over".

**9. Bosses, cutscenes, controller, polish — BOSSES AND CUTSCENES DONE.**
All seven bosses are built (`entities/bosses.js` plus level 1's cutscene-driven
Foreman), and every scripted moment in the game is a beat list. The
per-boss content this step was left holding is the content that shipped.

Still open from this step: **touch controls** (still parked, note below) and
**polish** in the procedural-juice sense — screen shake, richer particles,
animation curves. Nothing here is load-bearing; the game plays without it.

A note for whoever does the polish pass: the boss phase machines are the
obvious place for screen shake, and they already have the hooks — each one
ends a phase at a known frame, which is exactly where a shake wants to start.

The generic cutscene machinery has moved out of this step to **4b**; what's
left here is the per-level boss content itself. The design doc now carries a
boss-per-level framework (Foreman → Excavator → Sculptor → Demolition Crew →
Terraformer → General → the Core), of which only level 1 is built and only
level 7 is decided. Worth noting the intended shape before any of it is built:
it escalates through **mechanic variety** rather than health bars, and two of
the candidates (the Sculptor, the Core) are won by *restoration* rather than
damage — so the triangle weapon needs to work against a boss-sized target, not
just field octagons.

**Level 7 — the core** is its own thing and the one boss that's decided: a
corrupted dodecahedron at the centre of the hollowed planet, attacked by
restoring it face by face while it reshapes the arena (shockwaves, floor
sections rounding off and collapsing, gravity distortion). Two systems it
leans on that nothing else does: an arena the player **orbits on platforms**,
and terrain that deforms *as an attack* rather than as sphere set-dressing —
which is step 8's carving system pointed at the player instead of the scenery.

Chamfers sit at #4 — right after the level tool, before any of the systems
that depend on the damage language (octagons, carving) — because retrofitting
a flat-top format after six more levels are authored would be miserable.

---

## Verifying a level

`bash tools/run-probes.sh` runs everything. It needs a server on :8000 or
starts its own (`PORT=` overrides), and takes a few minutes. It is the only thing that has to pass.

What's in it, and what each thing is actually for:

| Probe | Answers |
|---|---|
| `module-load-probe` | Does every module still parse? There is no build step and no node here, so a syntax error otherwise shows up as a blank canvas in whatever runs next. **Run this first after any edit** — it's seconds |
| `level-audit-probe?level=N` | Is this level *playable*? Every gap and jumpable bed, both speeds, three timings, from a clean runway, plus the structural rules. One per level in the registry, counted off the registry itself |
| `boss-fight-probe` | Does each boss open, close and pay out? |
| `story-beats-probe` | Can the player be blocked by a story beat? The handoff, the restoration, the Sculptor, the core |
| `progression-chain-probe` | Does every level actually lead to the next one? |
| `full-playthrough-probe` | One run, cleared save to win screen, every story scene asserted |
| `level-data-probe` | The boring stuff, read straight off level data: weapons and cutscene ids that exist, a level that can end, spawns and checkpoints over ground, hazards that don't run off a ledge. Found three of level 6's checkpoints floating in its pits |
| `respawn-state-probe` | What survives a death — and standing at all 21 checkpoints in the game for two seconds without touching the controls |
| the older probes | Physics, coins, saves, cutscene contract — unchanged, and all still green |

Not a probe, but in the same spirit: **`python3 tools/pressure-profile.py`**
prints how much can reach the player every 100px of every level — enemy
patrol spans widened by what each tier can actually do, plus beds and pits.
It cannot tell you whether a level is fun. It can tell you where one suddenly
gets three times busier than the rest of itself, which is usually a mistake
rather than a design. The current curve ramps 0.51 → 0.83 → 0.75 → 1.21 →
1.23 → 1.52 and then eases to 1.01 for level 7, where the core is the event
rather than the population.

**Adding a level** means: write the data file, add it to `levels/registry.js`,
run `python3 tools/gen-module-probe.py`, and run the suite. The audit list and
the module list both size themselves off the repo, so nothing else needs
touching.

### What the audit is and isn't

It proves **nothing is impossible**. It says nothing about whether a level is
*fun*, or fairly paced, or the right difficulty for a seven-year-old. Those
need a person with a controller.

**Probes are deterministic.** Enemy hop and shot timers used to be seeded
with `Math.random()` at spawn, which made "is this checkpoint survivable"
pass alone and fail in the suite depending on the dice. They're derived from
the enemy's own x now. A failure means something changed, not that the coin
came up differently. What's left of `Math.random()` is particles and the
block house's shake, neither of which anything measures.

It is also calibrated against level 1, which is the only reason to trust it —
every complaint it raised about that finished, playtested level turned out to
be the instrument being wrong, and each fix is written up in the probe at the
line it applies to. Six of them are worth knowing about because they'll bite anyone who extends
it. Tests must **arrive at speed** — a standing start measures the runway,
not the obstacle. A runway must not begin **inside a solid block or a spike
bed**. Obstacles must be tested at **both walk and run**, since some are
deliberately walk-only. The static "platform over a take-off" rule is
**advisory**, because it can't see horizontal travel and the simulation can.
Tests must model **jumping off blocks**, not just running along the ground —
in a level built of columns that's the only way anyone plays, and testing the
ground alone called all twelve of level 3's beds uncrossable. And everything
that asks "is this on the ground" must ask about the **local** ground, not
the level's base line, or every block on a raised shelf goes unrecognised.

Two rules exist because a level shipped without them and the pair of
obstacles was wrong even though each was fine alone:

- **A bed near the end of its segment is a trap.** Clearing it at run carries
  ~168px, so if the ledge is right there the correct answer to the hazard is
  a death in the pit after it.
- **A checkpoint is measured against what an enemy can REACH**, not where it
  walks. A pursuer breaks patrol at 230px and an aggressor shoots from 330,
  so a checkpoint 100px outside a shooter's patrol is still somewhere you
  respawn and get shot standing still. Five checkpoints passed the old rule
  and were fatal.

---

## Level design rules

Measured with `tools/gap-probe.html`, which drives the update loop directly and
reports how many jump timings actually clear each obstacle. Headless Chromium
barely fires `requestAnimationFrame`, so ticking `update()` by hand is the only
way to simulate more than a frame or two.

- **Jump arc:** rises ~225px, ~73 frames airborne regardless of speed —
  original was ~144px/~47 frames, cut twice now (2026-09-19 twice: 20% off
  speed+gravity together each time, most recently after playtesting with an
  actual kid — see physics.js's note above GRAVITY_UP for why that pairing
  cancels out and leaves horizontal carry unchanged). Horizontal carry
  depends on which speed cap is active — walk ~93.5px, run ~168px (same
  physics, just a lower speed cap; see physics.js) — and has stayed exactly
  there through both cuts. Any gap/hazard analysis needs both numbers now,
  not one.
- **A fixed-pixel autoplay lookahead doesn't scale with a speed change on its
  own, and needs re-sweeping every time.** Each of the two speed cuts so far
  broke the autoplay at the 2150 gap with the previous lookahead value still
  in place — not because the gap became unfair, but because a fixed pixel
  distance is a *smaller fraction* of a frame's travel at a slower speed,
  shifting exactly when the bot commits to jumping. Swept it
  (tools/autoplay-lookahead-sweep.html) both times: 28px -> 20px after the
  first cut, 20px -> 14px after the second. Don't assume a fixed-pixel test
  constant survives the next one either — re-sweep it.
- **A gap can erode to a razor-thin landing margin over several rounds of
  the same percentage speed cut, even though total carry distance is
  preserved each time.** The 2150 gap's margin at run speed went from
  comfortable to exactly +0px (a real ~15px-wide window to jump *within*,
  but zero slack in the landing itself) after two cuts, even though nothing
  about that gap was ever touched directly — carry distance staying fixed
  doesn't mean every individual gap's specific margin does, because the
  discrete frame-by-frame arc shape still shifts. Narrowed 40px -> 25px to
  restore real margin (same treatment as the very first gap, just for a
  different underlying cause). Worth spot-checking gaps close to a speed
  cap's max carry after any future speed/gravity change, not just re-running
  the full-level autoplay and calling it done.
- **Jump-trajectory-matched coin placements (the two 3-coin arcs over the
  3980 and 4320 spike beds) also drift out of alignment with each
  speed/gravity change**, even at the SAME hazard, because the curve's shape
  changes even though endpoints (carry distance) don't. Re-sample with
  tools/jump-trajectory-probe.html (records the player's real (x,y) each
  frame of an actual jump) any time a speed constant changes — checked after
  the second cut here and the run-speed trio had already started missing
  coins at the edges of its timing window.
- **Never put a platform directly above a jump-off point.** The player rises
  into it and a correctly-timed jump becomes a death. This caused the worst bug
  in level 1.
- **Jumpable spike beds cap at ~60px at run speed.** Wider and jumping early
  enough to clear lands you mid-bed; the window of workable timings collapses
  (a 100px bed leaves ~44px of window, a 60px bed ~80px). At walk speed the
  ceiling is far lower — walk's own max carry (~93.5px) is the hard limit, so
  anything approaching that width is effectively a run-only bed regardless of
  timing.
- **At walk speed, jump right at the edge — never early.** There's no carry to
  spare, so an early jump wastes distance you don't have and reliably falls
  short; at run speed the extra ~75px of carry makes early jumps forgiving.
  This is a real second skill axis (precision vs. commitment), not just "run
  goes further" — confirmed by sweeping jump timing across a range of
  lead/hold combinations, not assumed. Don't put the first walk/run-relevant
  obstacle in a level somewhere a new player hasn't had room to discover this;
  level 1's very first gap had to be narrowed for exactly this reason.
- **Don't test spike-bed clearance with `player.invincible` set high as a
  "safety" value.** The real hazard-death check is itself gated on
  `invincible<=0`, so a high value silently defeats it and the player walks
  through spikes unharmed in the test — every spike-bed measurement in an
  earlier pass was invalid this way before it was caught. Falling into a gap
  is a different, invincibility-independent check (`player.y` past the bottom
  of the screen), so gap results aren't affected by this trap. Set it to 0.
- **A fixed-lookahead autoplay bot is not a reliable per-obstacle judge of
  difficulty at a speed it wasn't tuned for.** One bot (fixed lookahead
  distance + hold duration) can clear the whole level at run speed with zero
  deaths while failing almost everything at walk speed — not because walk is
  broken, but because the bot's specific strategy (jump N px early) is the
  wrong technique at walk speed specifically. Trust a full-level clean run for
  "is this level beatable"; don't trust one bot's per-obstacle pass/fail as
  "is this obstacle beatable at this speed" without also sweeping actual
  timing windows directly.
- **Wider hazards get crossed via platforms,** not jumped.
- **Keep landing zones clear of the next hazard.** A hard jump carries 162px —
  don't let a full-power leap off a pit land in spikes.
- **Don't start an enemy patrol at a checkpoint.** Respawning into a sphere is a
  cheap death.
- **Enemies don't jump/hop yet, on purpose (2026-09-19).** The old "surprise
  hop" (a sphere randomly popping straight up) is parked behind
  `enemy.canHop` in entities/enemy.js, off by default — saved for a later
  level rather than deleted, since the animation/timing code still works
  fine. A level opts a specific enemy back in with `canHop: true` in its
  spawn data.
- **Spikes don't need a reason to be there** (rule retired 2026-09-21). It
  used to read "debris reads as damage from above, so spikes want a carved
  surface overhead" — which fought the no-platforms-overhead rule and only
  ever applied to level 1's stepping stones. Place spikes where they make a
  crossing interesting; that's the whole constraint.
- **A boss/cutscene trigger keyed only on player position can fire while the
  boss is still off-screen.** The camera eases toward the player rather than
  snapping to them, so it lags — position-only triggers (`player.x` past some
  `wakeX`) can fire before the camera has actually caught up, especially
  approaching at run speed. Level 1's ending cutscene checks that the boss is
  fully within the current camera view (`camera.x`/`VIEW_WIDTH`) in addition
  to the position trigger. Applies to any future scripted moment tied to a
  specific world position, not just this one boss.

Benchmark: an autoplayer with a fixed-lookahead policy clears level 1 without
dying. That proves nothing is impossible or unfair — it says nothing about
whether it's fun.

### 2026-09-20 retune: SMB3-accurate physics rewrite (physics-lab branch)

The whole model above — flat ACCEL/FRICTION, single GRAVITY_UP/DOWN split,
the ~93.5px/~168px walk/run carry numbers — was replaced wholesale by an
SMB3-accurate physics core (see physics.js and the physics-lab task doc),
then hand-tuned off the ROM-accurate defaults after playtesting felt too
slow. **Every number above this heading describes the old model and is no
longer live** — kept for the reasoning, not the values. New landmarks:

- **New carry figures: walk ~132.5px, run (no P-meter) ~245.8px**, both
  measured with a full/generous hold via the same trace methodology as
  before (tools/jump-trajectory-probe.html). There's now also a **third
  tier, P-speed**, that unlocks automatically after ~1.2s of sustained
  running (accel-to-cap + the P-meter's own fill time) — a long enough
  straightaway lets a "run-required" gap get cleared with even more margin
  than the run figure above, which is fine (more margin never breaks
  anything) but means carry distance is no longer just two clean numbers.
- **The walk/run carry gap grew enough that most of level 1's original gap
  widths stopped requiring run at all** (new walk-carry alone clears
  everything up to ~130px). Restored the "requires run" role specifically
  for the 3500 gap (70px -> 160px, by shrinking the ground segment after
  it) and the 4320 spike bed (90px -> 160px, by widening the hazard in
  place) — the two gaps/hazards whose own comments explicitly documented
  that as their purpose. Left the rest alone rather than rescaling
  everything on principle; not-technically-broken gaps that just got a
  bit easier aren't a problem worth manufacturing work over.
- **Widening a gap by shrinking the ground segment on either side of it
  doesn't require moving anything else in the level.** Ground segments and
  everything else (platforms/hazards/coins/enemies) are all positioned by
  absolute world coordinates, not relative to their segment's start — so
  resizing one segment's extent is a fully local edit, verified safe by
  checking nothing else's coordinates fall inside the span being eaten.
  Much simpler than the cascading-shift relayout this looked like it would
  need at first.
- **A single fixed-pixel autoplay lookahead can get permanently stuck at
  one specific spot for reasons that have nothing to do with that spot's
  actual difficulty.** The 5700 spike bed's autoplay run died repeatedly at
  the same x regardless of hazard width (60px, 45px, 35px all identical) or
  lookahead/hold tuning (18-22 / 16-24 all identical) — traced directly and
  confirmed the hazard clears fine both via the isolated jumpTest() harness
  and a clean restart at the same position with the same bot parameters.
  The actual cause is state carried over from landing the *previous* jump
  (the 5590 gap) sometimes leaving the bot grounded past its own
  once-per-grounded-frame trigger check's window before it reacts — a bot
  precision gap, not a level design flaw. Confirmed separately (a real
  playthrough via tools/save-probe.html reaches the win screen). Don't
  trust one autoplay bot's specific stuck point as proof of an unfair
  obstacle without checking whether a fresh, isolated attempt at the same
  spot also fails.
- **A perfectly symmetric 3-coin trio (equal y on both outer coins) isn't
  always achievable for 100% of realistic jump timings, because
  gravityFall is heavier than gravityRise** — the rise and fall halves of a
  real jump arc sit at different heights for the same x-offset from the
  apex. Swept the outer coins' shared y across the full timing range
  (tools/coin-trio-check.html) rather than picking one side's value or
  averaging blind: found no y that collects all 3 across every timing, and
  picked the one that works from the canonical "jump right at the edge"
  timing through early jumps, sacrificing only late-jump collection (the
  riskier technique anyway, not the one worth optimizing for).
- **Enemy patrol speeds and the boss's chargeSpeed need to move in lockstep
  with player speed changes, same as before** — flagged as already-drifted
  in the physics rewrite's own report (the boss's charge had fallen slower
  than the player's plain walk) and rescaled by the same ~1.79x the new
  walkMax grew over the old one, preserving every enemy's relative speed
  to the player exactly.
- **The boss's mining cutscene now actually carves a gap out of the ground
  it's standing on**, not just a particle effect over solid ground (see
  carveMiningGap in playingScene.js) — triggered on the third of ~5 mining
  swings during 'freeze', small enough (2 blocks, comfortably walk-clearable)
  to read as "look what it did" on the way to the goal rather than a hazard
  sprung on the player. Reverses itself on a mid-level retry
  (resetBossAndCutscene splices the original ground segment back by object
  reference) but persists once the boss is actually beaten — the world
  stays reshaped after a real clear.

### 2026-09-20 later: climb obstacles, and where the boss digs

- **Ground-flush solid blocks are a third obstacle shape**, alongside pits
  and hazards: a staircase (2990-3222, four treads a tile apart) and one
  tall wall (6300, 3 tiles). Unlike every floating platform in the level
  these sit *on* the ground line, so they're climbed/jumped-onto rather
  than jumped-across, and crucially **they can't kill you** — failing one
  means stalling against its side, not dying. No death counter catches
  that, which is why they get their own probe (tools/climb-probe.html)
  rather than relying on gap-probe's autoplay death count.
- **Adding them broke the autoplay bot in a way that looked like nothing at
  all.** Its jump trigger was `!solidAt(ahead) || spikeAt(ahead) ||
  enemyAhead`, and `solidAt()` only ever looked at *ground* segments — a
  solid block ahead reads as perfectly solid ground, so the bot walked
  into the first tread and stood there pushing right forever, with zero
  deaths logged. Fixed by adding a `wallAhead` test (a non-ground platform
  whose vertical span overlaps the player's — floating platforms overhead
  correctly don't trigger it) to both gap-probe.html and
  autoplay-lookahead-sweep.html. Worth remembering that "no deaths" and
  "made progress" are different assertions.
- **Sizing: a 16-frame hold clears 82px, a full hold 117px** (both speed
  tiers are tier 2 at the current caps, so walk and run jump the same
  height). 3 tiles (66px) leaves real margin — 10/13 approach timings land
  on top of the wall — while still being the tallest thing in the level.
- **The boss digs to the side it's facing, never underneath itself.**
  Enemies have no ground collision at all (updateEnemies only moves x
  between minX/maxX), so a pit opening under the boss left it visibly
  hanging in mid-air over its own hole. It now faces right for the whole
  mining beat and the gap opens immediately to its right, then a new
  'turn' beat flips it to face left, pops its "!" and holds a moment
  before the charge — previously the turn and the charge happened on the
  same frame, which read as the boss having known you were there all along.
- **That dig position then constrained the boss's patrol range.** Digging
  to the right meant the dig point tracked the boss's right edge, and the
  boss patrolled to 7100 — right up against the goal flag at 7100 — so
  carveMiningGap's goal-clearance clamp silently squeezed the gap to zero
  width whenever the boss woke on the right half of its patrol, and the
  dig just… didn't happen. Pulled maxX back to 7010. A cutscene beat that
  depends on an entity's *runtime* position needs that position's whole
  range checked, not just its spawn point.

---

## Level-edge transition (2026-09-20, physics-lab branch)

> **Built and playable**, not planned — commit `613d363`, reworked in
> `7c90e0b`. What it should *feel* like, and what it means in the story
> (each level is one face of the cube; the edge is the seam between faces)
> lives in GAME_DESIGN.md → "Level Transitions — the cube edge". This
> section is the mechanism only: the state machine, the frame counts, the
> drawing approach. If the two ever disagree about intent, the design doc
> wins; if they disagree about what the code does, this one does.
>
> Read the **2026-09-21 revision** subsection below before trusting the
> beat names in the next few paragraphs — the original
> `approach/pause/rotate/hold` machine was largely rebuilt after
> playtesting, and the beats are now `approach/brink/leap/land`.

Not part of the original numbered build order — the design doc's "7 levels,
one per cube face" premise didn't have a mechanic for actually *arriving* at
the next face until now. Built ahead of level 2 existing at all (the
registry still only has one real entry), so it's exercised today by
`tools/progression-probe.html` forcing a second registry entry, same trick
already used to test level-advance-vs-win.

**What happens:** reaching the goal, once the boss cutscene has resolved
(`bossActive()` false — same gate the old immediate-advance code used),
starts a state machine scoped to `scenes/playingScene.js` (same shape as the
boss cutscene, for the same reason: it needs that scene's own live
platforms/player/camera, not a fresh scene's isolated state):
`null -> 'approach' -> 'pause' -> 'rotate' -> 'hold' ->` (advance to the next
level, or win if this was the last one). `'approach'` walks the player the
rest of the way to the *actual* edge of the ground data — the goal marker
sits a little short of it on purpose, same as it always has, which turns out
to double as exactly the runway this needed. `'rotate'` pivots the whole
scene -PI/2 around that edge point over ~90 eased frames; `'rotate'`/`'hold'`
skip player/enemy/particle physics entirely (there's no meaningful "up" to
apply gravity toward mid-spin), everything else still runs normally.
Skippable any time with a keypress, same convention as the opening cutscene.

- **`worldWidth` and "the edge" are now two different things, on purpose.**
  The camera's clamp is `worldWidth - VIEW_WIDTH`, so if the edge-of-world
  wall visual (`levelRenderer.js`'s `drawWorldEdge`) were drawn starting
  exactly at `worldWidth`, the camera could never pan far enough to reveal
  any of it before the player was already standing on top of it — the whole
  point of foreshadowing "you're approaching the edge" would be invisible
  until it was too late to see coming. `worldEdgeX` (new, computed in
  `levelLoader.js` from where the ground data actually stops, not authored)
  is the real edge; `worldWidth` got 300px of headroom added past it purely
  so the camera has room to reveal the wall in advance. Nothing solid exists
  in that 300px — it's camera runway, not playable space.
- **The rotation direction has a real, checked-not-assumed consequence for
  which way "old ground" and "new ground" end up**, and the two things the
  task asked for (angle = exactly -PI/2, AND old ground reading as "rising up
  and away") turned out to be in tension. Verified empirically (headless
  screenshots through the actual rotation, not hand-derived trig) rather
  than trusting either claim blind: at -PI/2, the wall's near face rotates
  to become flat new ground extending *forward* in the same direction the
  player was already walking — the more important outcome, gameplay-wise —
  while old ground rotates to end up receding *below*, not literally
  "rising." The other sign (+PI/2) gets old-ground genuinely rising, but at
  the cost of new-ground extending *backward* behind the player instead,
  which reads worse. Kept the specified -PI/2. Flagged, not silently
  resolved — worth another look if the direction ever feels wrong in person,
  since screenshots aren't the same as playing it.
- **`drawBackground` is deliberately exempted from the rotation**, even
  though the task described background as one of the things that rotates
  together with everything else. It fills the entire canvas every frame
  (`fillRect(0,0,VIEW_WIDTH,VIEW_HEIGHT)`); rotated around an off-center
  pivot that fill stops covering the canvas corners, which is a real visual
  bug (flashing gaps), not a subtle deviation. It also doesn't make physical
  sense for a starfield light-years away to visibly spin from one small
  patch of planet surface tilting 90°. Everything that's actually *part* of
  the world (ground, platforms, the edge wall, player, enemies, particles)
  still rotates together.
- **Any probe that teleports the player to the end of a level and expects an
  immediate advance/win from a single `update()` call now needs a skip
  keypress in between** (`save-probe.html`, `progression-probe.html`) —
  reaching the end now only *starts* the transition. Caught this the boring
  way: ran the regression sweep, watched `progression-probe.html`'s "reach
  goal at level 1 (last)" line come back `state=playing` instead of
  `state=win`. Worth remembering for level 2's own probes later: a key press
  without a matching `keyup` is a held-key repeat on the *second* call, not a
  second fresh press — `input.js`'s `alreadyDown` tracking (correctly)
  ignores it, which is exactly what silently broke the first pass at this fix.

### 2026-09-21 revision: playtested, and largely rebuilt

Seeing it in motion changed most of it. What the first pass got wrong:

- **Don't draw anything past the edge.** The first pass filled the space
  beyond the edge with a ground-coloured slab standing in for "the next
  face seen side-on". It read as more ground with no outline — the one
  place the player most needs to read "this stops HERE" was the least
  legible thing on screen. Past the edge is now empty: the parallax grid
  shows straight through, and the drop is obvious. The only things drawn
  are the bright corner seam and a translucent band for the cube's
  *interior* (behind the cut face, never past it).
- **A glow that rises above the ground surface reads as a doorway, not a
  cliff.** The seam used to extend 60px above `groundY`. It now starts
  exactly at the top surface and fades downward.
- **The camera has to actually look down, or the depth isn't there.**
  Added `camera.y` (0 for all normal play) and a 'brink' beat that eases
  the player to the centre of the screen on *both* axes before the jump.
  Centring x matters as much as y: it puts the empty space past the edge
  across the whole right half of the frame instead of crammed against it.
- **The player jumps; the world rotates under them.** Much better than the
  original "player stands still and rotates with the scenery" — the player
  is now drawn OUTSIDE the rotation transform, stays upright through a
  scripted arc, and lands on whichever face has swung into place. The arc
  is scripted rather than physics-driven because "down" is precisely what's
  changing during that beat; gravity would have to pick one of the two
  floors and looks wrong against either. Rotation finishes at ~82% of the
  arc so they come down on ground that's already settled.
  Convenient geometry: the new face's surface ends up at exactly the same
  screen height as the old one, so a flat arc from edge to landing works
  without any vertical fudging.
- **The goal flag is gone entirely, and that fixes a real bug.** It sat
  100px short of the actual edge and touching it cleared the level, so a
  clear could fire without the player reaching — or even seeing — the edge
  it stood for. The edge itself is the trigger now
  (`EDGE_TRIGGER_MARGIN`), `goal` is off the level-data shape, and
  `carveMiningGap`'s old "don't dig away the flag" guard became "don't dig
  into the walk-up corridor" (which matters more: that walk runs with real
  physics, so a hole there would drop the player mid-cutscene).
- **"Skippable with any key" was wrong for this one.** The intro can take
  any key because the player isn't playing when it runs. This fires
  mid-stride with movement and jump very likely being pressed, so an
  ordinary jump input during the walk-up instantly cleared the level with
  none of the ending seen — almost certainly the "clear without reaching
  the edge" bug as experienced. Skip is Escape only now.
- **A third bot had the same silent-stall bug and nobody noticed.**
  `walk-only-autoplay.html` never got the `wallAhead` fix the other two
  bots got when the staircase landed, so it had been stopping dead at the
  first tread — reported as "likely a wall only run can cross", which read
  as a finding rather than a broken bot. Fixed; it now climbs the stairs
  and stops at the 3500 gap instead, which is genuinely run-only by
  design. When one bot gets a fix for a whole class of obstacle, check
  every bot.

### 2026-09-21 later: Quarrick meets you on the next face

The ending had the player leaping into an empty world. Now the rescue NPC
— **Quarrick**, named this session — is already standing on the next face
when the player arrives at the lip, walking up it toward the shared corner,
and the player lands exactly one tile in front of him.

- **He's a second, separate instance.** `state.rescueNPC` deletes itself
  once it runs off-screen after the boss fight, and `updateRescueNPC` is
  all boss choreography, so reusing it would mean running stomp logic
  against a character standing on a wall. The corner version lives in the
  edge transition's own `c.data.quarrick`, built by `createCornerQuarrick`
  in `entities/npc.js`. *(Updated after the cutscene refactor later the
  same day — he was a module-level slot in `playingScene.js` when this was
  first written.)*
- **The rotation animates him for free, and that's the whole trick.** He's
  drawn *inside* the world-rotation transform (unlike the player, who is
  drawn outside it so they stay upright through the arc), and he carries a
  `spin` of `+PI/2` about his own centre. Before the transition those two
  compose to "standing sideways on the vertical face"; as the world runs
  `0 -> -PI/2` they cancel, and he ends upright on the new ground. Nothing
  interpolates him — his feet are on solid ground on every single frame,
  which is the only orientation that makes sense for someone who was never
  falling.
- **`alongFace` is the coordinate that survives the rotation.** How far he
  is down the face from the corner *before* becomes how far along the new
  ground he is *after*, so positioning him is the same arithmetic on both
  sides of the spin. `QUARRICK_STOP_ALONG` is derived from `LEAP_REACH`
  rather than authored, so the one-tile landing gap holds if the arc is
  ever retuned.
- **He faces the corner the whole time and never turns around.** Local `-x`
  is up the face before the rotation and back toward the edge after it —
  the same facing reads as "walking toward the corner" and then "looking at
  the player who just landed".
- **`BRINK_FRAMES` went 80 -> 105.** At 80 he was still walking when the
  player jumped, so the two never shared a still frame. The extra 25 buys
  the held beat where they're both just standing there, which is the point
  of putting him there at all.
- **He only appears on levels with a boss** (`level.boss`), which today
  means "levels where he showed up to rescue you". That's a stand-in for
  real narrative state — see the NPC arc in step 7 and the `narrativeState`
  note under Scaling concerns.

Checked with `tools/edge-transition-shot.html?f=N` (renders frame N of the
ending) and `tools/edge-transition-trace.html` (per-frame player/camera
numbers, and where the beat boundaries actually fall). A trap worth
remembering: both of those teleport the player to the lip, and the first
version left `camera.x` at 0, so `brink` spent its whole budget easing in
from the far side of the level and the screenshots showed a completely
different stretch of ground. They seed the camera where normal play would
have left it now.

---

## Level 1 retrofit

Already fits: passive patrolling spheres, the unwinnable pickaxe-armed boss
(50% bigger than a normal sphere) as late-game foreshadowing, the rescue NPC
as the first supporting NPC.

To add:
- [x] Block house at spawn, and the opening cutscene leading into it —
  `scenes/introScene.js` (planet → spheres descend → corner blown off → hard
  cut to the house → player walks out), `scenes/blockHouse.js` shared between
  the cutscene and level 1's background at spawn so both draw the same house.
  Plays once ever (`save.js`'s `hasSeenIntro`), skippable any time
- [x] Gate the weapon — `B`/`X` does nothing until it's earned (2026-09-19):
  level 1 doesn't use the bazooka at all anymore — it's parked in the
  codebase (`weapons/bazooka.js`), not wired into any scene, since it's
  planned to reappear in a later level. The player starts fully unarmed; the
  boss carries a pickaxe (swung, not fired) instead of its old chainsaw, and
  the rescue NPC's stomp leaves it behind at `boss.x` for the player to walk
  onto (`entities/weaponPickup.js`). Once picked up, `B`/`X` triggers a
  short melee swing (`weapons/pickaxe.js`, capped at 2/sec, no cooldown
  toast) instead of a ranged shot — see the "bazooka vs. unarmed" row in
  Decisions made above
- [x] Coin→life thresholds tuned against its ~47 coins
- [x] Carved damage on elevated platform undersides above the spike beds —
  `levels/levelRenderer.js`. Any floating platform overlapping a spike bed
  below it gets its underside bitten away (irregular scoops, both bottom
  corners chamfered, a faint pale edge). Derived from level data the way
  hazard stripes and the world edge already are, so a later level gets it
  free. Drawing only — collision still uses the full rect. In level 1 that's
  the two stepping stones over the 4920–5260 bed. Kept as plain visual
  texture after the debris rationale behind it was dropped the same day;
  screenshot via tools/carved-underside-shot.html
- [x] ~~The blown-off planet corner visible in the skyline~~ — resolved by
  *not* doing this: it's shown once, in the opening cutscene, and deliberately
  not repeated as a gameplay-background reminder (see the cutscene-style
  decision below)

---

## Open questions

GAME_DESIGN.md is the register of record for open *design* questions — this
list is only the subset that changes what gets built, and in what order.

**Blocking:** none. The game is finishable, and every level has a shape of
its own rather than a shared skeleton — see GAME_DESIGN's level table for
what each one's structural idea is.

**The honest list — what a reader should not assume exists.** Everything
below is deliberately unbuilt, not overlooked, and each has its reasoning at
the build-order step it belongs to:

- **Chamfered terrain is visual only.** Platforms are still flat-top
  rectangles; nothing is walked up at 45°. Step 4. Note that TERRACES are a
  different thing and do exist: ground can sit at different heights, it's
  just always flat where it sits.
- **No level authoring tool.** Six levels were hand-authored without missing
  it; the audit probe answered the need it was really for. Step 3.
- **Ordinary spheres don't reshape the world.** Bosses do. The parked trick
  platforms are still parked. Step 8.
- **Music is one loop for all seven levels.** It exists and it works
  (`audio/audio.js`, started once and never restarted so transitions don't
  stutter); what doesn't exist is any variation across a game that goes from
  a tutorial to the centre of a hollow planet.
- **No touch controls.** Still parked, see the note at the end of this file.
- **Coins still only buy lives.** The shop idea is untouched, and all seven
  levels' thresholds are tuned for lives-only.
- **Difficulty is unplaytested by a human.** Every level is machine-proved
  *possible*. Nobody has yet sat down with a controller and found out whether
  levels 4-6 are too hard for a seven-year-old, which is the single most
  likely thing to need changing.

**Decided since this list was last written** (2026-09-21 — full reasoning in
GAME_DESIGN.md, repeated here only where it constrains the build):
- **The arc is 6 surface faces → descent → hollow centre → dodecahedron
  core.** Level 7 is not a seventh face; it's a different kind of space, and
  step 9 now carries notes about that.
- **The cube-edge transition is the level-to-level connector.** No goal flag
  any more. Anything that assumed "touch the goal → advance" is gone.
- **Weapon roster targets 3–5, not an open-ended set.** Pickaxe and the
  restoration weapon are decided; the rest are candidates. This is why step 6
  now folds in a weapon registry rather than adding weapons ad hoc.
- **The rescue NPC has a four-beat arc** (protector → deterioration →
  handoff → corruption). That's what forces cross-level narrative state, and
  it's why step 7 now has an NPC-persistence line item and the Scaling
  concerns section has a `narrativeState` vs. `story.js` note.
- **Cutscenes get a data-driven runner** — pulled forward from step 5 to
  step 4b, because the boss cutscene and the edge transition are already two
  hand-rolled state machines in one scene file and a third would be the
  point of no return.

**Worth deciding when step 7 gets close:**
- Can a *different* weapon kill an octagon outright? If so, killing one means
  killing a victim who could have been saved — a possible moral beat, or an
  unfair trap, depending on how clearly the game signals it.
- **How the NPC arc ends.** GAME_DESIGN.md lists the candidate endings and
  deliberately doesn't pick one. It matters here because "the NPC can be
  saved" and "the NPC cannot be saved" imply different amounts of state to
  persist, and different level-7 content.

**Newly open, and cheap to defer:**
- **Do spheres shoot back?** Step 5 now carries a ranged-attack note as
  tentative. If the answer is no, that note comes back out; if yes, it
  changes enemy-projectile collision and probably the camera's comfort zone.
- **Does the coin economy buy anything beyond lives?** Candidate only. The
  thresholds in level 1 are already tuned for lives-only, so adding a second
  sink means re-tuning, not just adding a menu.
- **How much visual degradation is authored vs. procedural?** The
  environmental-storytelling section assumes later faces look more chewed-up.
  Authoring that per level multiplies level-data size — see Scaling concerns.

**Not blocking yet** (from the design doc — they land in steps 6–9):
boss frequency, weapon inventory vs. one-at-a-time, whether octagon
restoration is required or optional, multiplayer. Sound direction is no
longer on this list — GAME_DESIGN.md has a Sound Design section now, and the
per-weapon sound-identity constraint moved into Architecture constraints.

---

## Controller and movement (done, 2026-09-19)

Xbox/standard-mapping gamepad support landed via `engine/gamepad.js`: it
polls each frame and dispatches synthetic keydown/keyup events on button
transitions, so the rest of the game (movement, jump buffering, the earned
weapon, pause) treats a controller as just another source feeding the same
`keys` state real keyboard input already populates — no consumer code had to
change. A=run, B=jump, Y=weapon swing (gated until earned — see the Level 1
retrofit; moved from X to Y on 2026-09-19, closer to Super Metroid's
weapon/item-select slot), Start=menu/pause, stick+d-pad=move — A/B
match physical position (bottom/right), not the letter each maps to on a
Nintendo pad; matching by letter put run and jump backwards, per playtest.

Movement gained a walk/run split: walk is the new slower default
(`WALK_MAX_SPEED`), holding run raises the cap to `RUN_MAX_SPEED`, which
deliberately equals the old flat speed constant exactly (same acceleration
too) so running reproduces level 1's already-validated feel rather than
approximating it — see physics.js's comment for the one real mistake this
caught (a faster run *ramp* alone was enough to shift a jump's timing
against a patrolling enemy).

Menu/pause exists now (Escape / gamepad Start) — a flag in playingScene,
not a full menu system. That's the "menu key" satisfied minimally; a real
options/settings menu is still future scope. Mike's flagged wanting music/
sfx volume sliders specifically, accessible from that eventual menu —
noted for whenever it gets built, not needed yet. `audio.js` already has
separate `musicGain`/`sfxGain` nodes, so this is a small addition once
there's a menu screen to put the sliders on — no audio-graph rework needed.

**Caveat:** none of this can be verified against real hardware here — no
physical controller can be attached in this environment. The polling/
dispatch logic was verified with a mocked gamepad object standing in for
real input. Whether an actual Xbox controller behaves identically, and
whether a gamepad button press counts as a valid autoplay gesture in every
browser, needs a real playtest.

## Parked: touch controls

A standalone mobile-demo prototype (separate Claude Artifact, not in this
repo) tested on-screen d-pad + jump button, wired via `touchstart`/`touchend`
into a `touch` state object OR'd with the keyboard — that wiring pattern is
worth reusing. Its physics were a simplified throwaway (flat velocity, no
coyote time/jump buffer/variable jump height), not our real model — don't
port those.

Gamepad support (above) is done; this is the remaining piece of step 9's
input work, in `engine/input.js` + `index.html`. Open question for whenever
it's picked up: show the buttons always, or only on detected touch devices
(leaning touch-only, to keep the keyboard experience uncluttered) — not yet
decided.

---

## Parked: debug mode

Wish-list item (2026-09-20), not started. The idea: the instrumentation
that already exists in `tools/physics-lab.html`, but layered over the
*real* level instead of a synthetic benchmark course. Most of the pieces
below already exist there in some form — the work is mostly extraction
into something like `src/engine/debugOverlay.js` that both can share,
plus the bits that only make sense against real level data.

Gate it the same way the sandbox level already is: a `?debug` URL param
(matching the existing `?test`), with a hotkey to toggle the overlay once
on. Keyboard-driven, so it stays usable while a controller is doing the
playing.

Asked for directly:

- **Quick traversal.** Warp to any checkpoint/hazard/boss by name (the
  physics-lab's marker dropdown is exactly this), plus click-to-teleport
  and a "skip to next checkpoint" key. A free/detached camera that pans
  independently of the player is worth having alongside it.
- **God mode.** Note this needs *two* things, not one: invincibility
  covers enemy and hazard contact, but the fall-into-a-pit check is
  deliberately independent of `player.invincible` (see the
  RESPAWN_FREEZE_FRAMES note in physics.js — this exact asymmetry is why
  the respawn freeze had to exist). So god mode has to bypass the pit
  death separately or it'll still drop you.
- **Hitboxes.** Player/enemy/coin AABBs, but the highest-value one is
  **hazards**: their kill box is deliberately inset from the art
  (`x+4, y-12, width-8, height 12` — see levelLoader.js), so what kills
  you is visibly smaller than what's drawn and there's currently no way to
  see it. Also worth drawing: the weapon swing reach, and the checkpoint /
  edge-transition trigger boxes (the latter is a margin off `worldEdgeX`,
  invisible today, and easy to misjudge while authoring a level's ending).

Other things that would earn their place:

- **Enemy patrol bounds drawn in-world.** `minX`/`maxX` are pure data and
  completely invisible today; drawing them as a line under each sphere
  would make "this one walks off its platform" a glance instead of a
  playthrough.
- **World coordinate readout + tile grid,** with click-to-copy. Level data
  is authored in absolute world pixels by hand — this would take a lot of
  the arithmetic out of placing anything.
- **Physics state HUD** — vx/vy, grounded, coyote timer, jump buffer,
  P-meter fill, speed tier, gravity state. Already built in physics-lab;
  the value is seeing it during actual play.
- **Pause / frame-step / slow-mo,** and a **trajectory trace** of the last
  jump overlaid on the level. Both exist in physics-lab; both are most
  useful when you're standing in front of the jump you're arguing with.
- **System toggles** — enemies off, hazards off, cutscene off (there's
  already a shift-K cutscene skip to build on).
- **Grant the pickaxe on demand.** It's boss-gated, so testing the weapon
  currently means either playing the whole level or switching to `?test`.
- **Cutscene state readout** (`freeze`/`turn`/`charge`/`rescue`/`done` plus
  its timer) — that state machine is module-private and has grown enough
  beats to be worth seeing.
- **Step count / real fps,** to catch the class of problem the fixed
  timestep was added for in the first place.
