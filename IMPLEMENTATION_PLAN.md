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
| 1 — data-driven levels, loader, transitions, save | steps 1–4 done; **progression + save remain** |
| 2+ | not started, re-scoped by the design doc |

Level 1 runs 0–7200px: pits and passive spheres, then a spike half, then an
unwinnable chainsaw boss resolved by a rescue NPC. Three checkpoints.

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

## Build order

Each step is sequenced by what it unblocks, not by how fun it is.

**1. Finish Phase 1 — progression + save**
`startNewRun()` vs `loadLevel()`; game over restarts the *current* level, never
level 1. Coin counter on the HUD, coins→extra lives thresholds. 7-level registry.
Save via localStorage, wrapped in try/catch (it throws in private browsing).

**2. Chamfer rendering + collision — authored only**
Cut corners as level data, drawn and collided, with nothing carving them yet.
Level 2 can open with pre-cut blocks showing the spheres have been at work.
De-risks the foundation without needing enemy AI to exist.
*Expect jump tuning to shift slightly near cut edges — re-run the gap probe.*

**3. Enemies**
Base class and the passive → pursuing → aggressive tiers. Enemies hold weapons.

**4. Weapons**
Entity-agnostic (see constraints). Player starts unarmed, weapons drop from
defeated enemies. Bazooka becomes the triangle shooter with limited ammo.

**5. Octagons**
Needs 3 and 4 — they're enemies, and restoring them needs the triangle weapon.
Introduced by a corruption cutscene. A restored one turns back into a square
and runs off-screen; that's the rescue NPC's existing `exit` state, so the
behavior is mostly already written.

*The real tension here is the ammo.* Triangles are scarce and the same weapon
is the player's main gun, so every rescue costs offence — and the square you
save just leaves. That's a genuine choice rather than a chore, and it's what
makes limited ammo interesting instead of annoying. Worth protecting when the
numbers get tuned: if triangles are plentiful, the choice evaporates.

Stomping stays the unarmed fallback, so running dry is never a dead end.

**6. Live world manipulation**
Sphere actors that carve terrain and move platforms. Revives the parked trick
code behind a visible sphere cause. Merges "trolling" and "reshaping" — they're
one system.

**7. Bosses, cutscenes, controller, polish**
Roughly the original roadmap. The opening cutscene may be worth pulling earlier
since it's the player's first impression and motivates everything.

Chamfers sit at #2 because the octagons, the carving, and the whole damage
language rest on them — and retrofitting a flat-top format after six more levels
are authored would be miserable.

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
- [ ] Block house at spawn, and the opening cutscene leading into it
- [ ] Gate the bazooka — `B` does nothing until it's earned
- [ ] Coin→life thresholds tuned against its ~45 coins
- [ ] Carved damage on elevated platform undersides above the spike debris
- [ ] The blown-off planet corner visible in the skyline, if it fits

---

## Open questions

**Blocking:** none right now.

**Worth deciding when step 5 gets close:**
- Can a *different* weapon kill an octagon outright? If so, killing one means
  killing a victim who could have been saved — a possible moral beat, or an
  unfair trap, depending on how clearly the game signals it.

**Not blocking yet** (from the design doc — they land in steps 4–7):
NPC roles and dialogue, boss frequency, weapon inventory vs. one-at-a-time,
whether octagon restoration is required or optional, cutscene style,
multiplayer, sound direction.
