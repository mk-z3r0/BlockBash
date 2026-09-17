# Block Bash — Game Design Document

## Story Premise

The world is a **cube-shaped planet** inhabited by square block characters. Spheres invade, attempting to reshape everything into rounded forms. The player must defend the block world across all faces of the cube.

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

### Enemies

Enemies evolve across levels:

| Level Range | Enemy Behavior | Weapons They Carry |
|---|---|---|
| Early levels | Patrolling, passive | None |
| Mid levels | Begin pursuing the player | Pick axes, basic tools |
| Late levels | Aggressive pursuit, coordinated | Chainsaws, lasers, etc. |

Enemies are using their tools to **reshape the world** (carving, sanding, rounding off the block terrain). This is both narrative and a gameplay mechanic — the environment changes as enemies work on it.

### Octagons (Corrupted Squares)

- Squares that have had their **corners sanded off** by spheres, turning them into octagons.
- Introduced via a **cutscene** showing the corruption process.
- Behave like **zombies** — they serve the spheres mindlessly.
- Can be **restored** back into squares using a special weapon that **shoots triangles** at them (restoring their missing corners).

### NPCs

- Supporting NPC characters appear throughout the game.
- Details TBD (allies, quest givers, comic relief, etc.).

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

---

## Open Questions / Future Ideas

- [ ] NPC roles and dialogue — who are they, what do they offer?
- [ ] Boss fights — one per level? Only at key story beats?
- [ ] Weapon inventory — carry one at a time or collect a loadout?
- [ ] Octagon restoration — is it required (rescue mechanic) or optional?
- [ ] Cutscene style — animated in-engine or comic-panel stills?
- [ ] Multiplayer / co-op potential?
- [ ] Sound design and music direction
