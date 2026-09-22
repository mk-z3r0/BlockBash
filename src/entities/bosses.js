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
import { getLevel } from '../levels/levelLoader.js';
import { carveGap } from '../levels/terrain.js';
import { spawnWeaponPickup, spawnAmmoPickup } from './weaponPickup.js';
import { spawnExplosion, spawnDust } from './particles.js';
import { spawnSphereShot } from '../weapons/combat.js';
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
    const dir = Math.sign((player.x + player.width / 2) - (boss.x + boss.w / 2)) || 1;
    boss.facing = dir;
    boss.x = Math.max(boss.minX, Math.min(boss.x + dir * Math.abs(boss.speed), boss.maxX - boss.w));
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
  if (boss.phaseTimer <= 0) setPhase(boss, 'advance', EXCAVATOR.advance);
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
    boss.x = Math.max(boss.minX, Math.min(boss.x + Math.sign(wanted - boss.x) * Math.abs(boss.speed) * 0.7, boss.maxX - boss.w));
    if (--boss.shotTimer <= 0) {
      boss.shotTimer = 95;
      spawnSphereShot(boss);
    }
    return;
  }

  // the other two crowd the player
  boss.x = Math.max(boss.minX, Math.min(boss.x + dir * Math.abs(boss.speed) * 1.25, boss.maxX - boss.w));
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
    boss.x = Math.max(boss.minX, Math.min(boss.x + boss.chargeDir * Math.abs(boss.speed) * 2.6, boss.maxX - boss.w));
    if (boss.phaseTimer <= 0) setPhase(boss, 'recover', 55);
    return;
  }
  if (boss.phase === 'recover') {
    // Stopped dead. This is the window, and the only thing the whole fight
    // is asking the player to read.
    boss.telegraph = 0;
    boss.facing = dir;
    if (boss.phaseTimer <= 0) setPhase(boss, 'stalk', 90);
    return;
  }

  // stalk: pressure, then commit
  boss.facing = dir;
  boss.x = Math.max(boss.minX, Math.min(boss.x + dir * Math.abs(boss.speed), boss.maxX - boss.w));
  if (--boss.shotTimer <= 0) {
    boss.shotTimer = 150;
    spawnSphereShot(boss);
  }
  // The wind-up. "The hardest FAIR fight in the game" is the whole brief, and
  // fair means the charge is something the player saw coming — it stops
  // turning to track them and visibly gathers for the last third of the
  // stalk, which is also the moment to stop being in front of it.
  boss.telegraph = Math.max(0, 1 - boss.phaseTimer / 30);
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
  if (boss.drops) {
    spawnWeaponPickup(boss.x + boss.w / 2, level.groundY, boss.drops);
  }
  // Later bosses have no new weapon to give — the player is carrying the
  // Cornerstone by then and it's the last one. They pay out in triangles
  // instead, which matters more at that point than another tool would.
  if (boss.dropsAmmo) {
    spawnAmmoPickup(boss.x + boss.w / 2, level.groundY - 30, boss.dropsAmmo);
  }
}
