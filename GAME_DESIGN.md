# Block Bash — Game Design Document

## Story Premise

The world is a **cube-shaped planet** inhabited by square block characters. Spheres invade, attempting to reshape everything into rounded forms. The player must defend the block world across all faces of the cube.

The spheres came **from space** — they are not native to the planet, and nothing on it created them. That matters for the ending: the core the player eventually reaches is their *target*, not their origin.

---

## Story Arc — surface to core

The shape of the whole game, start to finish. **Decided.**

1. **Invasion.** The spheres arrive from space and begin reshaping the block world (shown in the opening cutscene, below).
2. **The surface.** The player traverses all **6 outer faces** of the cube, one level each, reaching the literal edge of each face and rotating onto the next (see [Level Transitions](#level-transitions--the-cube-edge)).
3. **The descent.** After the sixth face, the player descends into the planet's **hollow centre** for the seventh and final level.
4. **The core.** The spheres have been hollowing the planet from the surface inward, carving material away as they go. The centre is now a large cavity — and at the middle of it is what they've been digging toward.

### The core

The planet's core is a **dodecahedron — a corrupted cube.** Every edge and vertex shaved off a cube, and then some, leaving 12 pentagonal faces. The spheres didn't finish the job: the core resisted, and they left it stalled partway between cube and sphere.

This is deliberately **the same corruption as the octagons** — squares that lost their corners — at planetary scale. One visual language, one idea, escalated from a single enemy to the whole world. The player has been reading "corners taken away = damage" since the first level; the core is that sentence shouted.

The core is **not** the source of the spheres. It's the thing they came for.

### The final boss

**The core *is* the final boss.** It doesn't move or patrol like anything else in the game — it sits at the centre of the hollow interior, and the player orbits it on platforms.

Its attacks are **geological**, not combat moves:
- shockwaves rolling out from the centre
- floor sections rounding off and collapsing underfoot
- gravity distortion pulling the player toward it

It's defeated with the **triangle restoration weapon** — the same mechanic used to restore octagons, scaled up: many hits, landed while the core actively reshapes the arena around the player. Each hit snaps one face back toward square. The final hit makes it **cubic again**, the planet stabilises, and the sphere threat collapses with it.

> The ending is a *restoration*, not a kill. That's the whole thesis of the game stated once, at full volume: the win condition for the entire story is the same verb the player has been practising on individual octagons all along.

---

## Introduction / Opening Cutscene

1. Show the cube planet floating in space.
2. Many spheres descend toward it.
3. One of the cube's corners **explodes off**, leaving a triangular face exposed on the planet.
4. Transition to the player inside their **block house** — they feel the explosion, go outside to investigate.
5. Gameplay begins.

---

## Core Mechanics

### Player

- Starts **without a weapon**.
- Weapons are **collected from defeated enemies** (not found in the world).
- Lives system: collect coins (like Mario) to earn **extra lives** and extend play time.
- Coin counter displayed on HUD.

### Weapons

**Every player weapon is mining, demolition, or terraforming equipment.** The spheres are reshaping the earth; the player fights back with earth-moving tools. That theme is the constraint any candidate weapon has to satisfy — it's what keeps the arsenal from drifting into generic shooter guns.

Target roster is **3–5 weapons total**, including the two decided ones below, with clear escalation between them.

**Decided:**

| Weapon | Level | Role |
|---|---|---|
| **Pickaxe** | 1 (built) | Short melee swing. Earned from the boss via the rescue NPC. The foundation the rest escalates from. |
| **Restoration weapon** *(name TBD)* | Mid-to-late (see [the NPC arc](#the-rescue-npc-arc)) | Fires **triangle projectiles** that restore octagons by snapping their missing corners back on. Also kills spheres on contact. **Limited ammo** — that scarcity is the tension. This is the key narrative weapon and the one that defeats the final boss. |

> **TBD: the restoration weapon needs a real name.** "Restoration weapon" is a working label, not a name. It's the most story-important object in the game and deserves better.

**Candidates — under consideration, none confirmed.** The middle tier is open for redesign; these are the current shortlist, not a plan:

| Candidate | Idea | Status |
|---|---|---|
| **Sledgehammer** | Heavier and slower than the pickaxe, with knockback. Could crack weakened platforms to open hidden areas. | Candidate |
| **Drill / Jackhammer** | Sustained-contact damage; locks the player in place while active. | Candidate |
| **Dynamite / blasting charges** | Placeable, timed, area damage — and can hurt the player. | Candidate |
| **Bulldozer shield** | Defensive. Pushes enemies and debris; can't jump while active. | Candidate |

Each of these trades mobility for power in a different way, which is the axis worth protecting when the roster gets cut down to size.

**Parked, not cut:** the bazooka (`weapons/bazooka.js`) and chainsaw (`weapons/chainsaw.js`) both exist in the codebase, unwired, kept for a later level. See the implementation plan's "Decisions made" for why the bazooka stopped being level 1's weapon.

### Enemies

Enemies evolve across levels:

| Level Range | Enemy Behavior | Weapons They Carry |
|---|---|---|
| Early levels | Patrolling, passive | None |
| Mid levels | Begin pursuing the player | Pick axes, basic tools |
| Late levels | Aggressive pursuit, coordinated | Chainsaws, lasers, etc. |

Enemies are using their tools to **reshape the world** (carving, sanding, rounding off the block terrain). This is both narrative and a gameplay mechanic — the environment changes as enemies work on it.

#### Spheres shoot back — open question

At some point in the **mid-to-late** progression the spheres need a **ranged/projectile attack**. Up to that point every threat is contact damage, and the difficulty curve flattens out once the player has reliable melee.

Two hard constraints on whatever it turns out to be:

- It is **not** the triangle restoration weapon. That projectile belongs to the player and means "repair." A sphere firing triangles would break the one piece of visual grammar the whole story rests on.
- It must be **visually distinct from triangles** and read as sphere-shaped thinking — round, smooth, curved.

**Open — needs design.** Candidates floated so far, none chosen: something round; energy blasts; compressed-air bursts that shove terrain (and the player) around. The compressed-air idea is the most on-theme, since it attacks by *reshaping* rather than by damaging, but it's also the hardest to read at a glance.

### Octagons (Corrupted Squares)

- Squares that have had their **corners sanded off** by spheres, turning them into octagons.
- Introduced via a **cutscene** showing the corruption process.
- Behave like **zombies** — they serve the spheres mindlessly.
- Can be **restored** back into squares using a special weapon that **shoots triangles** at them (restoring their missing corners).
- The same corruption, at planetary scale, is [the core](#the-core) — and restoring it is how the game ends.

### NPCs

- Supporting NPC characters appear throughout the game.
- The **rescue NPC**, [Quarrick](#the-rescue-npc-arc), has a full multi-level arc and is the game's mentor figure — see below.
- Other NPC roles (quest givers, comic relief, survivors) are still TBD.

### Dialogue

**Built 2026-09-21.** Characters can talk. A **bottom bar**, JRPG style: a
panel across the bottom of the screen with the speaker's name, text
revealed a character at a time, advanced with Space. Chosen over speech
bubbles floating above characters because it takes a line of any length
without reflowing the composition, it's always in the same place, and it
doesn't fight the camera.

Colour is the whole of a speaker's identity — the art is procedural shapes
and there's no room for portraits, so each character's name appears in the
palette they're already drawn in. Each also has a pitch for the tick that
plays as their text appears: lower for bigger characters. Both of those are
learned from play rather than explained.

**Level 1 says nothing, on purpose.** It's the tutorial level and the story
is deliberately withheld there — the spheres arrive, the boss is
unwinnable, Quarrick saves you and hands you a pickaxe, and none of it is
narrated. **The story starts opening up in level 2**, which is where the
first real dialogue belongs. Putting placeholder lines in the one finished
level would mean shipping words nobody meant.

> The system, the beat format, and the traps are in IMPLEMENTATION_PLAN's
> "The cutscene system" section. Anyone writing a conversation should read
> that first — a line of dialogue is one entry in a beat list.

### The rescue NPC arc

The single biggest piece of character writing in the game, and the spine the weapon progression hangs off. **The overall arc is decided; the ending beat is open.**

> **Named (2026-09-21): Quarrick.** He carries the game's emotional throughline; "the rescue NPC" was a code identifier, not a character. The code still uses `rescueNPC` for the boss-cutscene instance and `cornerQuarrick` for the edge-transition one — worth unifying whenever the NPC arc gets real narrative state (IMPLEMENTATION_PLAN, step 7).

**1. Level 1 — the protector.** *(Built.)* The NPC arrives during the boss cutscene, stomps the boss sphere, and leaves the **pickaxe** behind for the player. Visibly **larger and stronger** than the player. Establishes them as ally, protector, and the reason the player is armed at all.

**2. Mid-game — the deterioration.** The NPC reappears across later levels, **progressively more damaged** — losing corners to the spheres, level by level, in plain view. No dialogue needed: the player reads the damage. Meanwhile the NPC is **working on something**. They've been studying what the spheres do to squares — the octagon corruption — and are engineering a countermeasure.

**3. The handoff — key story beat.** The NPC gives the player the **triangle restoration weapon**. Not as a reward or an upgrade drop: because they are **too damaged to keep fighting**. The mentor passes the torch because they can't carry it any further.

**4. The corruption — immediately after.** Right after the handoff, the NPC **fully corrupts** — into an octagon, or worse. This forces the player's **first use of the restoration weapon to be on the NPC who just handed it to them.** The player restores their mentor. The weapon is proven, the mechanic is taught, and the game's central verb lands with real weight, all in one beat.

> The sequencing is the whole trick: give the weapon, then immediately create the one target the player can't refuse. The tutorial for the mechanic *is* the emotional peak.

**Open questions on the ending of the arc:**
- [ ] Does the NPC **stay** restored, or re-corrupt over time?
- [ ] Do they **help in the final level**, or is the core fight strictly solo?
- [ ] Do they **sacrifice themselves** at some point — and if so, does the player have any agency over it?

---

## World / Level Structure

**7 levels minimum** — one per face of the cube, plus the **center of the planet**.

| Level | Location | Notes |
|---|---|---|
| 1 | Starting face (near block house) | Tutorial area, passive enemies |
| 2 | Adjacent face | Enemies begin carrying tools |
| 3 | Adjacent face | Octagon enemies introduced (cutscene) |
| 4 | Adjacent face | Enemies pursue the player |
| 5 | Adjacent face | Environment manipulation intensifies |
| 6 | Opposite face / damaged corner | Heavy combat, all weapon types |
| 7 | Center of the planet | Final level / boss area |

> Level locations and progression are flexible — this is a starting framework.

Levels 1–6 are the **six outer faces**; level 7 is the **hollow interior** reached by descending after the sixth face. See [Story Arc](#story-arc--surface-to-core).

### Level Transitions — the cube edge

**Decided, and built for level 1.**

The player is on the **outside surface** of the cube planet, so the end of a level isn't a door or a flag — it's the **literal edge of the current face**. The ground stops. The next face drops away at 90° below them.

What the player experiences:

1. They walk to the edge and stop. There's nothing past it — open space, and a long way down.
2. The camera settles on them and **looks down**, so the depth of the drop is legible before anything happens.
3. **Quarrick is already down there**, standing on the next face — which from here is a sheer wall — walking *up* it toward the corner they're both standing on. His feet are on his ground; ours is at right angles to it. He arrives and waits, looking up at the player.
4. They **jump off the edge**, and the world **rotates 90° underneath them** mid-air. Quarrick turns with it, because he's standing on the part that's turning. The player doesn't, because they're in the air.
5. They land on what was the vertical face below and is now simply *the ground* — one tile in front of Quarrick, face to face. Gravity has shifted with the world.

This is a **visual cutscene**, not a gameplay mechanic — no physics or collision runs during the rotation, and the player can't fail it. It's the cube-planet premise made literal once per level: the world doesn't end, it turns.

The Quarrick beat is doing narrative work as well as spatial: he's the one character who is never disoriented by the geometry, and he's always *already there*. That's the protector phase of his arc reading as competence — and it's what makes the later phases land, when he stops being able to get there first. See "The rescue NPC arc" below.

> Implementation (the state machine, the canvas rotation, the trigger) lives in IMPLEMENTATION_PLAN's "Level-edge transition" section. The level-1 version is built and playable.

---

## Bosses

One boss per level, at the end. **A starting framework in the same spirit as the level table** — only level 1 (built) and level 7 (decided, it's the story's ending) are settled. Everything between is a candidate and expected to change.

| Level | Boss | Concept | Status |
|---|---|---|---|
| 1 | **The Foreman** | Oversized sphere with a pickaxe. Unwinnable — resolved by the rescue NPC, who stomps it and leaves the pickaxe behind. | **Built** |
| 2 | **The Excavator** | A sphere operating a drilling rig. Terrain deforms in real time during the fight; the player wins by jamming the mechanism rather than out-damaging it. | Candidate |
| 3 | **The Sculptor** | First **octagon** boss — a large corrupted square. Defeated by **restoration, not combat**, which teaches the verb the endgame depends on. | Candidate |
| 4 | **The Demolition Crew** | Three coordinated smaller spheres with distinct roles. Boss-as-puzzle: read the roles, break the coordination. | Candidate |
| 5 | **The Terraformer** | Never fights directly. Reshapes the arena around the player — platforms rise, fall, and shift — and the fight is against the room. | Candidate |
| 6 | **The General** | Pure combat. Fast, aggressive, no gimmick. The hardest *fair* fight in the game. | Candidate |
| 7 | **The Core** | The corrupted dodecahedron itself. Geological attacks, orbited on platforms, restored face-by-face with the triangle weapon. | **Decided** — see [Story Arc](#the-final-boss) |

Note the intended shape of the progression: it escalates through **mechanic variety** (jam it, restore it, puzzle it, survive it, out-fight it) before the finale, rather than through bigger health bars.

### Environmental storytelling — visual degradation

The corruption gets worse **as set dressing**, level over level, with no dialogue and no exposition:

- **Early levels** — minor chips and dents. Something is wrong, but the block world is intact.
- **Middle levels** — sections visibly sanded smooth. Round divots in flat surfaces. Corners going missing.
- **Late levels** — block architecture barely recognisable. Curves everywhere. The player is walking through a place that has mostly stopped being square.

The player learns how far the invasion has progressed by **looking at the walls**. This is art direction doing narrative work, and it costs nothing at runtime — it's authored terrain, not a system.

---

## Dynamic World / Troll Mechanics

As levels progress, the **spheres manipulate the world** to defeat the player:

- Pits move while the player is jumping over them.
- Platforms shift, walls appear/disappear.
- The environment becomes increasingly untrustworthy.

**Key design rule:** Every "troll" moment has a cause — the spheres are visibly doing it. The player should be able to see or infer sphere interference (e.g., a sphere hovering near a pit that just moved). This keeps it from feeling unfair and reinforces the narrative.

---

## Economy / Progression

- **Coins** — scattered throughout levels, dropped by enemies.
- **Extra lives** — earned by hitting coin thresholds.
- **Weapons** — looted from enemies, potentially upgradeable.
- **Triangle ammo** — for the octagon-restoration weapon (limited supply to add tension).

### Should coins buy more than lives? — candidate

Today coins do exactly one thing: cross a threshold, earn a life. That works, but it means coins **reset in value every level** and a player who explores thoroughly gets no more out of the back half of the game than one who runs straight through.

**Candidate idea, not decided:** let coins also fund **weapon upgrades and ammo refills** between levels, via a small shop screen shown during the cube-edge transition.

Why it's attractive:
- Gives a concrete reason to **explore instead of speedrun**.
- Stretches the coin economy **across the whole game** rather than resetting per level.
- Ammo refills in particular pair well with the restoration weapon's deliberate scarcity — it turns "do I spend a triangle on this octagon?" into a decision with a price attached.

Why it isn't decided:
- A shop screen in the middle of the cube-edge rotation risks **puncturing** what's currently the game's best cinematic moment.
- It competes with the extra-life threshold for the same currency; both being fed by coins may dilute each.

---

---

## Sound Design

**Every weapon needs a distinct, immediately recognisable audio signature.** Not a variation on a generic hit sound — an identity. The player should know which weapon is out with their eyes shut.

The pickaxe swing already establishes the pattern. Future weapons follow it:

- **Drill** — a sustained buzz that starts and stops, so holding it feels different from tapping it.
- **Dynamite** — fuse hiss, pause, boom. The pause is the whole sound.
- **Restoration weapon** — a crystalline chime. It should sound like *repair*, not like a gun; it's the one weapon that isn't destroying anything.

The existing synth audio system (`audio/sfx.js`) can handle all of this — everything is procedurally generated, so a new sound is a function, not an asset. But the sound list is going to grow a lot, and it's worth saying plainly: **these audio identities are what players actually remember, and they shouldn't be bolted on at the end.** Design the sound alongside the weapon, not after it.

Music direction is still open.

---

## Open Questions / Future Ideas

**Answered since this list was written** (kept for the trail):

- [x] ~~Boss fights — one per level? Only at key story beats?~~ → **One per level**, framework in [Bosses](#bosses).
- [x] ~~Octagon restoration — is it required (rescue mechanic) or optional?~~ → **Required at least twice**: the NPC beat forces it, and the final boss *is* it. Whether individual field octagons are optional is still open (below).
- [x] ~~Cutscene style — animated in-engine or comic-panel stills?~~ → **In-engine**, decided with the opening cutscene (see IMPLEMENTATION_PLAN's "Decisions made").
- [x] ~~How do characters talk?~~ → **A bottom bar, typewritten, advanced with Space** (2026-09-21). Built and working; see [Dialogue](#dialogue). Level 1 stays wordless, the story opens up in level 2.
- [x] ~~NPC roles and dialogue~~ → partially: the [rescue NPC arc](#the-rescue-npc-arc) is defined. *Other* NPCs are still open.

**Still open:**

- [x] ~~The rescue NPC's name~~ → **Quarrick** (2026-09-21).
- [ ] **Names.** The restoration weapon still needs one.
- [ ] **What do spheres shoot?** Ranged sphere attack, mid-to-late game — must be visually distinct from triangles. See [Spheres shoot back](#spheres-shoot-back--open-question).
- [ ] **The middle weapon tier.** Which 1–3 of the candidates actually ship, and in what order.
- [ ] **Weapon inventory** — carry one at a time, or collect a loadout?
- [ ] **Are field octagons optional?** Restoring them costs ammo that the player may want for spheres — is that a real choice, or does skipping them cost something?
- [ ] **How the NPC arc ends** — stays restored? helps at the core? sacrifices themselves? See [the arc](#the-rescue-npc-arc).
- [ ] **Coins beyond lives** — the between-levels shop idea. See [Economy](#should-coins-buy-more-than-lives--candidate).
- [ ] **Music direction** (weapon sound identities are now specified — see [Sound Design](#sound-design)).
- [ ] Multiplayer / co-op potential?
