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
import { carveGap, crackFloor, updateCracks } from '../levels/terrain.js';
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
// --- level 2: The Excavator -------------------------------------------
// "A sphere operating a drilling rig. Terrain deforms in real time during
// the fight; the player wins by jamming the mechanism rather than out-
// damaging it."
//
// REBUILT 2026-09-30, from play: "you jump over the block and it proceeds
// to push you over the edge, as there is little time to engage, and the
// pit it creates is always in front of it — where you are likely
// standing." All true. The old one walked AT the player across a 480px
// arena and dug on the side it was facing, which was by definition the
// player's side. A boss that comes to you and digs where you stand is not
// a pattern, it's a shove.
//
// So it's a machine on a track now. It works three fixed DRILL SPOTS across
// the arena, in order, and never chases. Arriving at a spot it cracks the
// floor there — the same red telegraph the Terraformer uses — and drills
// into the crack; the pit opens where the crack was, and then the drill
// binds and it is open for two and a half seconds. The whole fight is one
// sentence a kid can learn in a single cycle: it goes where the crack is,
// so don't be there, and hit it when it shouts.
//
// Two pits at most. Three spots over 330px of floor with 40px pits would
// leave islands; two leaves a floor.
const EXCAVATOR = {
  // Travel has to cover the longest trip at its speed — the far spot to
  // the near one is ~210px at 1.5px a frame — or it drills where it
  // happens to be, without a crack, which is the one thing it must never
  // do. 200 is the budget; it usually arrives well inside it.
  travel: 200, drill: 84, jammed: 150,
  pitWidth: 40,
  maxPits: 2,
  // Where it drills, as offsets from the arena's left edge (the block it
  // is entered over). Spaced so there is always floor on both sides of
  // every pit — see maxPits.
  spots: [80, 180, 280],
  warn: 70
};

function excavatorArenaLeft(boss) {
  // The arena starts where the fight is allowed to (engageFromX, set in the
  // level data to just past the entry block), or at the boss's leash.
  return boss.engageFromX == null ? boss.minX : boss.engageFromX;
}

function updateExcavator(boss, player) {
  const level = getLevel();
  boss.phaseTimer--;
  const left = excavatorArenaLeft(boss);
  const spotX = left + EXCAVATOR.spots[boss.spot % EXCAVATOR.spots.length];

  if (boss.phase === 'advance') {
    // Travelling to the next spot. Not toward the player — toward the
    // spot, whichever side of it they are on.
    boss.invulnerable = true;
    boss.mining = false;
    boss.strain = false;
    pose(boss, 0);
    boss.swingPhase += 4;        // the bit, turning
    // It parks with the rig's bit over the spot: body to the left of it,
    // facing right, so the pit opens in front of the rig and the entry
    // side of the arena is never what it digs.
    const park = spotX - boss.w - 6;
    const dir = Math.sign(park - boss.x) || 1;
    boss.facing = 1;
    if (Math.abs(park - boss.x) > Math.abs(boss.speed)) {
      stepTo(boss, boss.x + dir * Math.abs(boss.speed));
    } else {
      boss.x = Math.max(boss.minX, Math.min(park, boss.maxX - boss.w));
      // Arrived. Say where, and start the clock on the floor.
      if (!boss.cracked) {
        boss.cracked = true;
        if (boss.pits < EXCAVATOR.maxPits) {
          crackFloor(level, spotX, EXCAVATOR.pitWidth, EXCAVATOR.warn, { margin: 30, maxX: level.worldEdgeX - 220 });
          showToast("IT'S DRILLING THERE — MOVE", 70);
        }
        playRumble();
        setPhase(boss, 'drill', EXCAVATOR.drill);
      }
    }
    if (boss.phaseTimer <= 0 && !boss.cracked) {
      // Took too long to get there (it can't — but a pinned timer in a
      // probe can). Drill where it is.
      boss.cracked = true;
      setPhase(boss, 'drill', EXCAVATOR.drill);
    }
    return;
  }

  if (boss.phase === 'drill') {
    boss.invulnerable = true;
    boss.mining = true;
    boss.telegraph = Math.max(0, 1 - boss.phaseTimer / 30);
    boss.swingPhase += 3;   // fast, mechanical — a rig, not a swing
    if (boss.phaseTimer % 7 === 0) {
      spawnDust(boss.x + boss.w / 2 + boss.facing * boss.w, boss.y + boss.w, 5, { spread: 3, size: 6, life: 22 });
    }
    // The crack it opened runs out on its own clock and becomes the pit.
    for (const g of updateCracks(level)) {
      boss.pits++;
      spawnDust(g.x + g.width / 2, level.groundY, 14, { spread: 5, size: 8, life: 30 });
      playRumble();
    }
    if (boss.phaseTimer <= 0) {
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
  // Stuck fast, and it has to LOOK stuck. It leans back on the rig hauling
  // at it, the bit judders instead of turning, and it throws sparks. See
  // the `strain` branch in entities/enemy.js.
  boss.strain = true;
  boss.swingPhase += 1.2;
  if (boss.phaseTimer % 9 === 0) {
    spawnDust(boss.x + boss.w / 2 + boss.facing * (boss.w * 0.9), boss.y + boss.w * 0.9,
      3, { spread: 4, size: 4, life: 14, color: '#ffd27a' });
  }
  if (boss.phaseTimer <= 0) {
    boss.strain = false;
    boss.cracked = false;
    boss.spot++;
    setPhase(boss, 'advance', EXCAVATOR.travel);
  }
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
// The crew works in SHIFTS. Reported from play: "the demolition crew isn't
// really fair, the pursuit is too good, can't find many openings." Two
// bruisers that never stop closing at 1.25x, plus a shooter, is three
// problems with no gaps between them. So they press, and then they fall
// back to regroup — and the regroup is the opening, because the shooter is
// the one you have to reach and for those frames nothing is in your way.
//
// Shared across the crew off one clock (the shooter's shotTimer, which all
// three can read), so the two bruisers always move together: one pressing
// while the other backs off would be the same wall from a different side.
const CREW_PRESS = 110;     // frames closing in
const CREW_REGROUP = 90;    // frames backing off to flank positions
const CREW_CYCLE = CREW_PRESS + CREW_REGROUP;

function updateCrew(boss, player) {
  const crew = state.enemies.filter(e => e.alive && e.crew === boss.crew);
  const shooter = crew.find(e => e.role === 'shooter');
  const linked = crew.length > 1 && !!shooter;

  boss.invulnerable = linked && boss.role !== 'shooter';
  boss.linkedVisual = linked;

  const dir = Math.sign((player.x + player.width / 2) - (boss.x + boss.w / 2)) || 1;
  boss.facing = dir;

  // One clock for the whole crew.
  const leader = shooter || crew[0];
  if (leader === boss) boss.crewClock = ((boss.crewClock || 0) + 1) % CREW_CYCLE;
  const clock = leader.crewClock || 0;
  const pressing = clock < CREW_PRESS;

  if (boss.role === 'shooter') {
    // hangs back and fires — reachable, which is the point
    const wanted = player.x + player.width / 2 - dir * 260;
    stepTo(boss, boss.x + Math.sign(wanted - boss.x) * Math.abs(boss.speed) * 0.7);
    if (--boss.shotTimer <= 0) {
      // 130, not 95. With the bruisers pressing in waves the shots are the
      // thing that fills the gaps, and at 95 they filled them completely.
      boss.shotTimer = 130;
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

  if (pressing) {
    // Closing — at the speed they were authored, not a quarter faster. The
    // 1.25 was the whole of "the pursuit is too good".
    stepTo(boss, boss.x + dir * Math.abs(boss.speed));
    pose(boss, 0);
    if (withinSwing(boss, player, 46)) startAttack(boss);
    return;
  }
  // Regrouping: back off to a flank position either side of the shooter
  // and hold there. This is the window — the shooter is open for the whole
  // of it, and for once the two things that hurt you are walking away.
  const side = boss.flank || (boss.flank = (crew.indexOf(boss) % 2 === 0 ? -1 : 1));
  const home = (shooter ? shooter.x : boss.baseX) + side * 150;
  stepTo(boss, boss.x + Math.sign(home - boss.x) * Math.abs(boss.speed) * 0.8);
  pose(boss, 0);
}

// --- level 5: The Terraformer ------------------------------------------
// "Never fights directly. Reshapes the arena around the player — platforms
// rise, fall, and shift — and the fight is against the room."
//
// It sits still and pumps. The arena's platforms are driven from here (see
// `movers` in the level data), and the boss is only reachable at the top of
// the cycle, when the platforms it raised put the player level with it.
// The room breathes, and it HOLDS at each end of the breath.
//
// It used to be a plain cosine, which meant the top of the lift — the only
// moment the raised platforms reach the boss's ledge, and so the only
// moment the fight exists — was a single instant the arena passed through.
// Reported from play: "the level 5 boss doesn't allow enough time to get to
// him." Quite right: the window was real but it was a point, not a door.
//
// A cosine also spends almost no time at the BOTTOM, which is the other
// half of the same problem — the player has to get onto a platform before
// they can ride it anywhere, and the platform was only down there for a
// blink.
//
// So the curve is four parts. Held low long enough to step on, up, held
// high long enough to cross and land a couple of hits, and down. Same shape
// the fight always had; it just stops and waits at both ends now.
const TERRAFORMER_CYCLE = 360;
const T_HOLD_LOW = 0.18;   // parked at the bottom: ~65 frames to board
const T_RISE = 0.26;       // ~94 frames going up
const T_HOLD_HIGH = 0.30;  // ~108 frames level with the ledge, and open
// the rest is the way back down

function breath(t) {
  if (t < T_HOLD_LOW) return 0;
  if (t < T_HOLD_LOW + T_RISE) {
    const d = (t - T_HOLD_LOW) / T_RISE;
    return (1 - Math.cos(d * Math.PI)) / 2;
  }
  if (t < T_HOLD_LOW + T_RISE + T_HOLD_HIGH) return 1;
  const d = (t - T_HOLD_LOW - T_RISE - T_HOLD_HIGH) / (1 - T_HOLD_LOW - T_RISE - T_HOLD_HIGH);
  return (1 + Math.cos(d * Math.PI)) / 2;
}

// How the Terraformer attacks the ROOM rather than the player — the thing
// the fight was always described as and, until this, mostly wasn't.
// Reported from play: "the terraformer level where you just get knocked off
// the platform is not what I was intending, but seeing the spheres move
// platforms and pits underneath the player."
//
//   while the room is LOW and the player is on the floor: it cracks the
//   floor under them. The crack holds TERRA_WARN frames, then that patch
//   drops out. Where the crack was — not where the player is by then.
//   while the room is RISING: the lifts also drift sideways, so the
//   platform you boarded is not quite where you boarded it.
//
// Capped, like the core's collapses: a floor you can saw into islands turns
// hard into over.
const TERRA_WARN = 75;              // 1.25s to read it and step off
const TERRA_PIT = 40;              // a hop, not a jump (walk carry ~93)
const TERRA_MAX_PITS = 4;
const TERRA_SWAY = 48;             // px the lifts drift sideways at the top

function updateTerraformer(boss, player) {
  const level = getLevel();
  boss.cycle = (boss.cycle + 1) % TERRAFORMER_CYCLE;
  const t = boss.cycle / TERRAFORMER_CYCLE;
  const lift = breath(t);
  const low = t < T_HOLD_LOW;

  for (const p of level.platforms) {
    if (!p.mover) continue;
    p.y = p.baseY - p.mover * lift;
    // Sideways drift, strongest at the top. Deterministic from the
    // platform's own x so the two never move in lockstep.
    const phase = (p.baseX % 7) / 7 * Math.PI * 2;
    p.x = p.baseX + Math.sin(boss.cycle * 0.02 + phase) * TERRA_SWAY * lift;
  }

  // Crack the floor under the player once per low phase, while they are
  // actually standing on the floor (not on a lift — a crack under a
  // platform means nothing).
  if (low && !boss.crackedThisCycle && (boss.pits || 0) < TERRA_MAX_PITS &&
      player.isOnGround && Math.abs((player.y + player.height) - level.groundY) < 3) {
    const at = player.x + player.width / 2 - TERRA_PIT / 2;
    // never right under a lift's footprint, or the lift lands on nothing
    const underLift = level.platforms.some(p => p.mover && at + TERRA_PIT > p.baseX - 30 && at < p.baseX + p.width + 30);
    if (!underLift) {
      crackFloor(level, at, TERRA_PIT, TERRA_WARN, { margin: 36, maxX: level.worldEdgeX - 220 });
      boss.crackedThisCycle = true;
      playRumble();
      showToast('THE FLOOR IS CRACKING', 60);
    }
  }
  if (!low) boss.crackedThisCycle = false;
  for (const g of updateCracks(level)) {
    boss.pits = (boss.pits || 0) + 1;
    spawnDust(g.x + g.width / 2, level.groundY, 14, { spread: 5, size: 8, life: 30 });
    playRumble();
  }

  // Open across the whole hold at the top, plus the last of the climb and
  // the first of the drop — so it is already open as the player steps off
  // the platform, rather than the instant they arrive being the instant it
  // shuts. That is about 140 frames of the 360, against the old ~100 that
  // were spread either side of a moment nobody could stand still in.
  boss.invulnerable = lift < 0.9;

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
                  : EXCAVATOR.travel;
  boss.collapses = 0;
  boss.pits = 0;
  boss.spot = 0;
  boss.cracked = false;
  boss.crackedThisCycle = false;
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
