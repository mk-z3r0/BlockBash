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

Target roster was **3–5 weapons total**. **Three shipped** (2026-09-21), which is the bottom of that range and deliberate: each one gets a real stretch of the game to itself rather than three of them overlapping.

**Built:**

| Weapon | Where | Role |
|---|---|---|
| **Pickaxe** | Earned in level 1, carried into 2 | Short melee swing, fast cooldown. The foundation the rest escalates from. Dropped by the Foreman via Quarrick's stomp. |
| **Sledgehammer** | Dropped by the Excavator, level 2 | Half the swing rate, ~22% more reach, double damage, and it knocks enemies back. The middle tier's stated axis — trade mobility for power — in its bluntest form. Carried until the handoff. |
| **The Cornerstone** | Handed over by Quarrick, level 3 | Fires **triangle projectiles** that restore octagons by snapping their missing corners back on. Kills spheres on contact too. **Limited ammo.** The last weapon in the game: nothing after level 3 drops another one, and it's what defeats the core. |

> **The restoration weapon has a name: the Cornerstone.** A cornerstone is the block a structure is set out from; it's masonry rather than weaponry, which satisfies the standing constraint that every weapon is earth-moving kit; and the word has the job inside it. It puts corners back.

**Cut, for now.** The drill, the dynamite and the bulldozer shield were the rest of the middle-tier shortlist. The sledgehammer was picked over them because "heavier, slower, knocks back" needed no new system to express, and three weapons across seven levels already gives each one room. The other three are still good ideas and nothing in the registry (`weapons/registry.js`) resists adding them.

**One at a time.** *(Answers an open question below.)* The player carries a single weapon, not a loadout. This is what keeps the Cornerstone's scarcity honest — with a melee weapon also in hand, running out of triangles would cost nothing. **Stomping is the unarmed fallback**, so running dry is never a dead end.

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

**Answered (2026-09-21): a slow round pellet**, pink like the spheres, with a soft halo and a filtered puff for a sound. It arrives in **level 4**, which is where the ranged tier lands.

The compressed-air idea was the most on-theme and it lost on legibility, which this doc had already flagged as its weakness. With a seven-year-old as the target player, a projectile that has to be *interpreted* is a projectile that kills you unfairly. Round versus pointed, at a glance, across a moving screen, is a distinction that survives being seven — and it's the same distinction the whole visual language already rests on.

It's slow enough to jump or outrun, which is what keeps ranged enemies fair rather than just punishing.

### Octagons (Corrupted Squares)

- Squares that have had their **corners sanded off** by spheres, turning them into octagons.
- Introduced in **level 3**, on open ground, ~900px before anyone explains what they are.
- Behave like **zombies** — they serve the spheres mindlessly. They shamble rather than hunt.
- **Nothing in the arsenal can beat one.** Swinging at an octagon thuds and accomplishes nothing — a deliberately unsatisfying sound, because it's the sound of doing the wrong thing to a victim. They can be restored, or walked past, and that is all.
- Can be **restored** back into squares with the Cornerstone's triangles (putting their missing corners back). The shape squares up visibly, corner by corner, rather than flipping at the end.
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

**The ending of the arc — decided 2026-09-21, and built:**

- **He stays restored.** Re-corruption would make the player's one act of rescue provisional, and the whole game is an argument that putting something back is worth doing.
- **He does not stay whole.** He comes back scarred: the corners the spheres took are still gone, on every appearance after level 3. Restoring someone is not the same as undoing what was done to them, and the game says so out loud exactly once, at the end — *"You're still missing your corners." / "So is everyone worth knowing."*
- **He is at the core, and he does not fight.** He meets the player in the cavity, gives them the last of his triangles, says the same thing he said in level 3 ("the same as always — put it back"), and withdraws. The final fight is solo.
- **He does not sacrifice himself.** He is alive at the end and the last line of the game is him suggesting they go up and look at the world together. This is a game built with and for a seven-year-old; the mentor surviving is not a softer ending, it's the one the story earned.

> The beat this arc was really built for is **his absence on level 6**. He meets the player at every new face — four, five — and then on six he simply isn't there, and nothing explains it. Being always already there was the whole of his competence. Taking it away was the last thing the arc needed the player to feel before the descent.

---

## World / Level Structure

**7 levels minimum** — one per face of the cube, plus the **center of the planet**.

**All seven are built** (2026-09-21). The framework below is what shipped; where it drifted from the original sketch, the reason is in the right-hand column.

| Level | Name | What it introduces |
|---|---|---|
| 1 | **The First Stand** | Tutorial. Passive spheres, an unwinnable boss, no dialogue at all. |
| 2 | **The Quarry** | The game starts talking. Spheres that carry tools and break patrol. A boss that can be fought. |
| 3 | **What the Sanders Left** | Octagons, then the Cornerstone, then the Sculptor. The turn the game is built around. |
| 4 | **Three Against One** | Spheres shoot back. The Demolition Crew. |
| 5 | **The Room That Moves** | The arena itself becomes the threat. |
| 6 | **No Tricks Left** | Everything at once, and nobody waiting for you. |
| 7 | **The Middle of the World** | The hollow centre and the core. |

Two drifts worth recording. **Pursuing enemies arrived in level 2, not 4** — once tool-carrying spheres existed, having them ignore the player was stranger than having them chase. And **octagons arrived in 3 alongside the Cornerstone rather than a level ahead of it**, because the beat only works if the player meets something they cannot beat shortly before being handed the thing that answers it.

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

**All seven are built** (2026-09-21), and each one shipped close to its sketch. How each is actually beaten is in the right-hand column, because that's the part that had to survive contact with a game whose only verb is *hit*.

| Level | Boss | Concept | How it's beaten |
|---|---|---|---|
| 1 | **The Foreman** | Oversized sphere with a pickaxe. Unwinnable — resolved by Quarrick, who stomps it and leaves the pickaxe behind. | It isn't. That's the point. |
| 2 | **The Excavator** | A sphere operating a drilling rig. Terrain deforms in real time during the fight. | Never open while it's working. It advances, drills a pit out of the floor, and the drill **binds** — every hit has to land in that ~2s window. The pits it leaves are the real pressure. |
| 3 | **The Sculptor** | A large corrupted square. | Six triangles. Nothing can hurt it. |
| 4 | **The Demolition Crew** | Three coordinated spheres with distinct roles. | While all three are up they shield each other and only the **shooter** can be hurt — and the shooter is the one hanging back, which is exactly what instinct says to ignore. Break the link and the others are ordinary. |
| 5 | **The Terraformer** | Never fights directly; reshapes the arena. | It sits on a ledge no standing jump reaches and works the room. It's open at the top of its own breath — the same moment the platforms it is raising put you level with it. **The thing it's doing to the arena is the window.** |
| 6 | **The General** | Pure combat, no gimmick. | Nothing to solve. Open the whole time, telegraphs every charge, and the recovery after one is your turn. |
| 7 | **The Core** | The corrupted dodecahedron itself. | Twelve triangles, landed while it takes the room apart. See [the final boss](#the-final-boss). |

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

**Answered 2026-09-21, while building levels 2–7:**

- [x] ~~The rescue NPC's name~~ → **Quarrick**.
- [x] ~~Names. The restoration weapon still needs one.~~ → **The Cornerstone**.
- [x] ~~What do spheres shoot?~~ → **A slow round pellet**, from level 4. Legibility beat theme; see [Spheres shoot back](#spheres-shoot-back--open-question).
- [x] ~~The middle weapon tier.~~ → **The sledgehammer, and only it.** Three weapons total.
- [x] ~~Weapon inventory — one at a time, or a loadout?~~ → **One at a time**, with stomping as the fallback.
- [x] ~~Are field octagons optional?~~ → **Optional, and they cost you.** Nothing forces a field rescue: an octagon can be walked past. Restoring one costs 2 triangles out of a supply the level meters carefully, and a freed square just leaves. That's the choice the ammo scarcity was for.
- [x] ~~How the NPC arc ends.~~ → **Stays restored, stays scarred, present at the core but doesn't fight, survives.** See [the arc](#the-rescue-npc-arc).

**Still open — genuinely, not for lack of time:**

- [ ] **Coins beyond lives** — the between-levels shop idea. See [Economy](#should-coins-buy-more-than-lives--candidate). Deliberately not built: the thresholds across all seven levels are tuned for lives-only, and adding a second sink means re-tuning every level rather than adding a menu.
- [ ] **Music direction.** Every weapon and enemy now has a sound identity (see [Sound Design](#sound-design)); there is still no music.
- [ ] **A second NPC.** Quarrick carries the entire cast. `state.rescueNPC` is a single slot and a scene with two characters in it would need a list first.
- [ ] Multiplayer / co-op potential?

**Deliberately not built, and worth knowing before picking any of it up:**

- [ ] **Chamfered terrain as a collision surface.** The plan's step 4 wanted platforms to become a height-at-x function so cut corners are walked on. What shipped is the *visual* half — carved undersides and `chewed` platforms carrying the degradation arc — with collision still square. The visual language is everywhere; the sloped-surface physics is not.
- [ ] **Live sphere-driven world manipulation** (the plan's step 8). Bosses carve terrain during fights, which is most of the way there, but the parked trick platforms in `levels/trickPlatforms.js` are still parked and no ordinary sphere reshapes the world while you watch.
- [ ] **The level authoring tool** (step 3). Never built. `tools/level-audit-probe.html` turned out to answer the need it was really for — "is this layout actually playable" — without a UI.
