// Boss behaviour, one small state machine per boss.
//
// GAME_DESIGN's boss table is explicit about the shape of the progression:
// it "escalates through mechanic variety (jam it, restore it, puzzle it,
// survive it, out-fight it) before the finale, rather than through bigger
// health bars." So these are deliberately NOT one boss with seven stat
// blocks — each one asks a different question. What they share is the
// plumbing: hp, phases, a timer, and the ordinary combat path in
// weapons/combat.js doing the actual damage.
//
// Level 1's Foreman is not here. It's unwinnable and entirely driven by its
// cutscene (cutscenes/level1/bossShowdown.js), which is a different kind of
// thing: a scripted scene that happens to contain a sphere.
//
// A boss opts in with `mode: 'fight'` and a `bossKind` in its spawn data.
// Everything else — hp, speed, patrol bounds — is ordinary enemy data.

import { state } from '../state.js';
import { getLevel, surfaceYAt, isBlocked } from '../levels/levelLoader.js';
import { carveGap } from '../levels/terrain.js';
import { spawnWeaponPickup, spawnAmmoPickup } from './weaponPickup.js';
import { spawnExplosion, spawnDust } from './particles.js';
import { spawnSphereShot, startAttack } from '../weapons/combat.js';
import { playExplosion, playRumble, playSphereShot } from '../audio/sfx.js';
import { showToast } from '../ui/hud.js';

// A boss is only ever hurt during its own opening. `invulnerable` is the
// same flag level 1's Foreman uses permanently — here it's switched on and
// off by the phase machine, so "when can I hit this thing" is one concept
// across every fight rather than a per-boss special case in the hit path.
function setPhase(boss, phase, frames) {
  boss.phase = phase;
  boss.phaseTimer = frames;
}

// --- what a boss LOOKS like it's doing ---------------------------------
//
// Reported from play, twice: "the boss' weapon isn't visible", and then
// "the level 2 boss is swinging the drill like a pickaxe". The second one
// was fixed by giving the drill a braced pose, but the shape of the problem
// was bigger than one animation — every fightable boss in the game stood
// holding its kit in a single frozen idle pose for its entire fight, because
// nothing between the phase machine and the draw carried "and right now it
// is doing THIS".
//
// `posePhase` is that channel, and it deliberately reuses the one the player
// already has: it's a frozen point in the weapon's own swing animation,
// 0 (carried) to 1 (followed through), read by entities/enemy.js exactly
// where it reads the player's live swing progress. So a boss holding its
// hammer up is the same pose the player sees at 0.25 of their own swing, not
// a second set of numbers that can drift away from it.
//
// A boss that carries a real `weapon` (as opposed to a `tool` it only
// holds) swings it through weapons/combat.js like anything else, and that
// overrides the held pose while the swing is live.
function pose(boss, phase) {
  boss.posePhase = phase;
}

// Close enough to swing at. Slightly inside the weapon's reach so the hit
// connects rather than whiffing at full extension — same reasoning as the
// ordinary pursuer's SWING_RANGE in entities/enemy.js.
function withinSwing(boss, player, range = 52) {
  return Math.abs((player.x + player.width / 2) - (boss.x + boss.w / 2)) < range;
}

// Bosses move by direct assignment rather than through the patrol helpers,
// so they need the same wall test. They ignore hazards — the Excavator is
// busy taking the floor apart and has no business being fenced in by its
// own side's spikes.
function stepTo(boss, x) {
  const next = Math.max(boss.minX, Math.min(x, boss.maxX - boss.w));
  if (!isBlocked({ x: next, y: boss.y, width: boss.w, height: boss.w }, { hazards: false })) {
    boss.x = next;
  }
}

// --- level 2: The Excavator -------------------------------------------
// "A sphere operating a drilling rig. Terrain deforms in real time during
// the fight; the player wins by jamming the mechanism rather than out-
// damaging it."
//
// So it is never hurt while it's working. It advances, it drills a pit out
// of the floor, and the drill binds — and for about two seconds it is stuck
// fast and open. Every hit has to land in that window. The pits it leaves
// are the real pressure: the arena it's chasing you across is the thing
// it's destroying, and they persist until the fight restarts.
const EXCAVATOR = {
  advance: 150, drill: 84, jammed: 132,
  // Narrow enough to clear at walk speed (max carry ~93.5px) — the floor
  // getting worse must never become the floor becoming impossible.
  pitWidth: 44
};

function updateExcavator(boss, player) {
  const level = getLevel();
  boss.phaseTimer--;

  if (boss.phase === 'advance') {
    boss.invulnerable = true;
    boss.mining = false;
    boss.strain = false;
    // Rig carried level in front, bit spinning, walking it toward you. The
    // drill's idle pose already points forward — this is the one phase where
    // the frozen idle was the RIGHT picture, and the only thing it was
    // missing was that the machine is running.
    pose(boss, 0);
    const dir = Math.sign((player.x + player.width / 2) - (boss.x + boss.w / 2)) || 1;
    boss.facing = dir;
    boss.swingPhase += 4;        // the bit, turning
    stepTo(boss, boss.x + dir * Math.abs(boss.speed));
    if (boss.phaseTimer <= 0) setPhase(boss, 'drill', EXCAVATOR.drill);
    return;
  }

  if (boss.phase === 'drill') {
    boss.invulnerable = true;
    boss.mining = true;
    // gathering toward the moment the drill binds and it opens up
    boss.telegraph = Math.max(0, 1 - boss.phaseTimer / 30);
    boss.swingPhase += 3;   // fast, mechanical — a rig, not a swing
    if (boss.phaseTimer % 7 === 0) {
      spawnDust(boss.x + boss.w / 2 + boss.facing * boss.w, boss.y + boss.w, 5, { spread: 3, size: 6, life: 22 });
    }
    if (boss.phaseTimer <= 0) {
      // The pit opens beside it, on the side it's facing — never under the
      // player, and never so far along that it eats the walk-up to the
      // world's edge (carveGap's own maxX guard, same one the level 1
      // Foreman's dig uses).
      const digX = boss.x + (boss.facing > 0 ? boss.w + 10 : -EXCAVATOR.pitWidth - 10);
      if (carveGap(level, digX, EXCAVATOR.pitWidth, { margin: 30, maxX: level.worldEdgeX - 220 })) {
        playRumble();
        spawnDust(digX + EXCAVATOR.pitWidth / 2, level.groundY, 14, { spread: 5, size: 8, life: 30 });
      }
      boss.mining = false;
      setPhase(boss, 'jammed', EXCAVATOR.jammed);
      showToast('THE DRILL IS STUCK — HIT IT!', 70);
    }
    return;
  }

  // jammed: the whole fight happens here
  boss.invulnerable = false;
  boss.mining = false;
  boss.telegraph = 0;
  // Stuck fast, and it has to LOOK stuck — the window is two seconds long
  // and a player who can't see it is playing a guessing game. It leans back
  // on the rig hauling at it, the bit judders instead of turning, and it
  // throws sparks. See the `strain` branch in entities/enemy.js.
  boss.strain = true;
  boss.swingPhase += 1.2;
  if (boss.phaseTimer % 9 === 0) {
    spawnDust(boss.x + boss.w / 2 + boss.facing * (boss.w * 0.9), boss.y + boss.w * 0.9,
      3, { spread: 4, size: 4, life: 14, color: '#ffd27a' });
  }
  if (boss.phaseTimer <= 0) { boss.strain = false; setPhase(boss, 'advance', EXCAVATOR.advance); }
}

// --- level 4: The Demolition Crew --------------------------------------
// "Three coordinated smaller spheres with distinct roles. Boss-as-puzzle:
// read the roles, break the coordination."
//
// The coordination is literal and visible: while all three are up, they
// shield each other — none can be hurt. Take out the shooter, who is the
// only one that stops to fire and so the only one you can reach, and the
// other two lose the link and become ordinary. That IS the puzzle: work
// out that the one hanging back is the one that matters.
function updateCrew(boss, player) {
  const crew = state.enemies.filter(e => e.alive && e.crew === boss.crew);
  const shooter = crew.find(e => e.role === 'shooter');
  const linked = crew.length > 1 && !!shooter;

  boss.invulnerable = linked && boss.role !== 'shooter';
  boss.linkedVisual = linked;

  const dir = Math.sign((player.x + player.width / 2) - (boss.x + boss.w / 2)) || 1;
  boss.facing = dir;

  if (boss.role === 'shooter') {
    // hangs back and fires — reachable, which is the point
    const wanted = player.x + player.width / 2 - dir * 260;
    stepTo(boss, boss.x + Math.sign(wanted - boss.x) * Math.abs(boss.speed) * 0.7);
    if (--boss.shotTimer <= 0) {
      boss.shotTimer = 95;
      boss.charge = 0;
      spawnSphereShot(boss);
    } else {
      // The same wind-up halo every ordinary shooter in the game uses
      // (entities/enemy.js draws it off `charge`). The one crew member you
      // are supposed to work out is the target should be the one telegraphing
      // hardest — it's the visual that says "this one is doing something
      // different from the other two", which IS the puzzle.
      boss.charge = Math.max(0, 1 - boss.shotTimer / 34);
    }
    return;
  }

  // The other two crowd the player, and now they swing at them. They were
  // carrying a pickaxe as decoration — `tool`, drawn and never used — so two
  // thirds of this fight was three spheres walking into you.
  stepTo(boss, boss.x + dir * Math.abs(boss.speed) * 1.25);
  pose(boss, 0);
  if (withinSwing(boss, player, 46)) startAttack(boss);
}

// --- level 5: The Terraformer ------------------------------------------
// "Never fights directly. Reshapes the arena around the player — platforms
// rise, fall, and shift — and the fight is against the room."
//
// It sits still and pumps. The arena's platforms are driven from here (see
// `movers` in the level data), and the boss is only reachable at the top of
// the cycle, when the platforms it raised put the player level with it.
const TERRAFORMER_CYCLE = 300;

function updateTerraformer(boss) {
  const level = getLevel();
  boss.cycle = (boss.cycle + 1) % TERRAFORMER_CYCLE;
  const t = boss.cycle / TERRAFORMER_CYCLE;
  // one smooth breath in and out, so the room's rhythm is readable
  const lift = (1 - Math.cos(t * Math.PI * 2)) / 2;

  for (const p of level.platforms) {
    if (!p.mover) continue;
    p.y = p.baseY - p.mover * lift;
  }

  // Open only at the top of the breath, which is also the only moment the
  // raised platforms reach it.
  boss.invulnerable = lift < 0.72;

  // It has no weapon and it never swings at anyone, which left it standing
  // through its entire fight with one arm held out in the game's default
  // empty-handed pose — the same pose a dead-eyed patrolling sphere holds.
  // The one boss whose whole idea is that it is DOING something to the room
  // was the one boss that looked like it was doing nothing.
  //
  // So it conducts. Both arms up, driven by the same `lift` that drives the
  // platforms, so the room and the thing moving the room are visibly on one
  // clock — and they drop when it opens, which is the tell.
  boss.conducting = !boss.invulnerable ? 0 : lift;
  boss.swingPhase += 2.4;
  if (boss.invulnerable && boss.cycle % 6 === 0) {
    spawnDust(boss.x + boss.w / 2, boss.y - 6 - lift * 26, 1,
      { spread: 2.4, size: 5, life: 26, color: 'rgba(160, 130, 255, 0.55)' });
  }

  if (!boss.invulnerable && boss.phaseTimer <= 0) {
    boss.phaseTimer = 40;
    showToast('THE ROOM IS OPEN — NOW!', 50);
  }
  if (boss.phaseTimer > 0) boss.phaseTimer--;
}

// --- level 6: The General ----------------------------------------------
// "Pure combat. Fast, aggressive, no gimmick. The hardest FAIR fight in the
// game." Fair is the operative word: it telegraphs, it commits, and it is
// open the whole time. Nothing to solve, only to out-play.
function updateGeneral(boss, player) {
  boss.invulnerable = false;
  const dir = Math.sign((player.x + player.width / 2) - (boss.x + boss.w / 2)) || 1;
  boss.phaseTimer--;

  if (boss.phase === 'charge') {
    boss.telegraph = 0;
    // Hammer out ahead of it, at the end of its own arc. It does NOT get a
    // swing hitbox here: the charge is a body-check, and putting a 58px
    // hammer box on the front of something moving at 2.6x speed is how a
    // fair fight stops being one. The pose is what sells it.
    pose(boss, 0.92);
    stepTo(boss, boss.x + boss.chargeDir * Math.abs(boss.speed) * 2.6);
    if (boss.phaseTimer <= 0) setPhase(boss, 'recover', 55);
    return;
  }
  if (boss.phase === 'recover') {
    // Stopped dead. This is the window, and the only thing the whole fight
    // is asking the player to read. Hammer down, head on the floor, leaning
    // on it — the picture of something that has just spent everything.
    boss.telegraph = 0;
    boss.facing = dir;
    pose(boss, 1);
    if (boss.phaseTimer <= 0) setPhase(boss, 'stalk', 90);
    return;
  }

  // stalk: pressure, then commit
  boss.facing = dir;
  stepTo(boss, boss.x + dir * Math.abs(boss.speed));
  // It actually swings it now. The General carried a sledgehammer through
  // its entire fight as scenery — "pure combat, no gimmick" fought by
  // walking into people. In close it swings, which is both the threat and
  // the reason to not simply stand next to it and trade hits.
  if (withinSwing(boss, player, 54)) startAttack(boss);
  if (--boss.shotTimer <= 0) {
    boss.shotTimer = 150;
    spawnSphereShot(boss);
  }
  // The wind-up. "The hardest FAIR fight in the game" is the whole brief, and
  // fair means the charge is something the player saw coming — it stops
  // turning to track them and visibly gathers for the last third of the
  // stalk, which is also the moment to stop being in front of it.
  boss.telegraph = Math.max(0, 1 - boss.phaseTimer / 30);
  // Hauls the hammer up as it gathers. 0.28 is the top of the backswing in
  // weapons/sledgehammer.js, so the boss visibly winds up through exactly
  // the frames the telegraph ring is swelling — one gesture, two channels,
  // which is what makes it readable at a glance.
  if (boss.weaponTimer <= 0) pose(boss, boss.telegraph * 0.28);
  if (boss.phaseTimer <= 0) {
    boss.chargeDir = dir;
    setPhase(boss, 'charge', 46);
  }
}

const KINDS = {
  excavator: updateExcavator,
  crew: updateCrew,
  terraformer: updateTerraformer,
  general: updateGeneral,
  core: updateCore
};

// --- level 7: The Core ------------------------------------------------
// "It doesn't move or patrol like anything else in the game — it sits at the
// centre of the hollow interior, and the player orbits it on platforms. Its
// attacks are geological, not combat moves."
//
// So it has no hp and it is never closed. It cannot be hurt at all, by
// anything; the only thing that touches it is a triangle, and every triangle
// puts one face back. The fight is entirely about surviving the room long
// enough to land twelve of them, which is why all three of its phases attack
// the arena rather than the player.
const CORE = { shockwave: 210, collapse: 180, pull: 200 };
// The floor is finite. Left uncapped, a long fight eventually saws the arena
// into islands the player cannot cross, which turns "hard" into "over".
const CORE_MAX_COLLAPSES = 6;

function updateCore(boss, player) {
  const level = getLevel();
  boss.invulnerable = false;      // restoration is always available
  boss.phaseTimer--;

  if (boss.phase === 'shockwave') {
    // Rolling out from the centre along the floor, both ways at once, so
    // there is no side of the arena that is simply safe.
    if (boss.phaseTimer % 70 === 0) {
      for (const dir of [-1, 1]) {
        state.projectiles.push({
          team: 'sphere', kind: 'wave',
          x: boss.x + boss.w / 2, y: level.groundY - 15,
          vx: dir * 3.6, vy: 0,
          size: 15, life: 260, spin: 0, dead: false
        });
      }
      playRumble();
    }
    if (boss.phaseTimer <= 0) setPhase(boss, 'collapse', CORE.collapse);
    return;
  }

  if (boss.phase === 'collapse') {
    // One section rounds off and drops out, near the player but never under
    // their feet — a hole opening where you are standing isn't an attack you
    // can answer, it's just a death.
    if (boss.phaseTimer === CORE.collapse - 1 && boss.collapses < CORE_MAX_COLLAPSES) {
      const side = player.x < boss.x ? -1 : 1;
      const at = player.x + side * 150;
      if (carveGap(level, at, 46, { margin: 40 })) {
        boss.collapses++;
        playRumble();
        spawnDust(at + 23, level.groundY, 16, { spread: 6, size: 9, life: 34 });
        showToast('THE FLOOR IS GOING', 70);
      }
    }
    if (boss.phaseTimer <= 0) setPhase(boss, 'pull', CORE.pull);
    return;
  }

  // pull: it leans on gravity. Not enough to take control away — enough that
  // standing still stops being neutral.
  const dir = Math.sign((boss.x + boss.w / 2) - (player.x + player.width / 2)) || 1;
  player.velocityX += dir * 0.075;
  if (boss.phaseTimer === CORE.pull - 1) showToast('IT IS PULLING YOU IN', 70);
  if (boss.phaseTimer <= 0) setPhase(boss, 'shockwave', CORE.shockwave);
}

const OPENING_PHASE = { general: 'stalk', core: 'shockwave' };

export function initBoss(boss) {
  boss.phase = OPENING_PHASE[boss.bossKind] || 'advance';
  boss.phaseTimer = boss.bossKind === 'core' ? CORE.shockwave
                  : boss.bossKind === 'general' ? 90
                  : EXCAVATOR.advance;
  boss.collapses = 0;
  boss.cycle = 0;
  boss.chargeDir = -1;
  boss.shotTimer = 90;
  boss.telegraph = 0;
  boss.invulnerable = true;
  boss.defeatHandled = false;
  boss.posePhase = 0;
  boss.strain = false;
  boss.conducting = 0;
  boss.charge = 0;
}

export function updateBossBehaviour(boss, player) {
  const fn = KINDS[boss.bossKind];
  if (!fn) return;
  fn(boss, player);
}

// Called once, the frame a fightable boss goes down. Idempotent, for the
// same reason a cutscene's onComplete has to be: this is the OUTCOME of the
// fight, and the player must never end up next to a dead boss with no drop.
export function onBossDefeated(boss) {
  if (boss.defeatHandled) return;
  boss.defeatHandled = true;
  const level = getLevel();
  spawnExplosion(boss.x + boss.w / 2, boss.y + boss.w / 2, '#ffd9a0');
  playExplosion();
  // Onto the surface the boss is standing on, not the level's base line —
  // a boss fought on a terrace would otherwise drop its weapon into the floor.
  const at = boss.x + boss.w / 2;
  if (boss.drops) {
    spawnWeaponPickup(at, surfaceYAt(at), boss.drops);
  }
  // Later bosses have no new weapon to give — the player is carrying the
  // Cornerstone by then and it's the last one. They pay out in triangles
  // instead, which matters more at that point than another tool would.
  if (boss.dropsAmmo) {
    spawnAmmoPickup(at, surfaceYAt(at) - 30, boss.dropsAmmo);
  }
}
