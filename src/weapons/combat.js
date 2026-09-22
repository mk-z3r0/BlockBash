// Entity-agnostic combat.
//
// IMPLEMENTATION_PLAN's architecture constraints open with this one:
// "For an enemy to swing back, the hit test has to resolve against whoever
// isn't the swinger, not be hardcoded to 'the player attacks, enemies get
// hit.' Build this generically at the start of the weapons work, not by
// special-casing a second weapon module."
//
// So: an *owner* is anything with a position, a facing, a `weapon` id and
// the three timer fields. The player is one. A tool-carrying sphere is
// another. Nothing below asks which.
//
// What each side actually is still differs in one honest place —
// `opponentsOf()` — because the player's targets live in a list and the
// enemy's target is a singleton. That's a fact about the game, not a
// special case in the weapon logic.

import { state } from '../state.js';
import { getLevel } from '../levels/levelLoader.js';
import { player } from '../entities/player.js';
import { keys } from '../engine/input.js';
import { isColliding } from '../engine/physics.js';
import { getWeapon } from './registry.js';
import { spawnExplosion, spawnDust } from '../entities/particles.js';
import { playStomp, playOctagonThud, playRestore, playSphereShot } from '../audio/sfx.js';
import {
  TRIANGLE_SPEED, TRIANGLE_SIZE, TRIANGLE_LIFE, drawRestoreProjectile
} from './cornerstone.js';
import { ctx } from '../engine/renderer.js';
import { showToast } from '../ui/hud.js';
import { addShake, addHitStop } from '../engine/impact.js';
import { addPopup } from '../ui/popups.js';

// Enemies carry `w` (they're circles, one dimension); the player carries
// width/height. One box shape for the hit tests either way.
export function boxOf(o) {
  return o.w != null
    ? { x: o.x, y: o.y, width: o.w, height: o.w }
    : { x: o.x, y: o.y, width: o.width, height: o.height };
}

// Everything that can hurt the player — a sphere's swing, a sphere's shot,
// walking into a corrupted square — raises the SAME flag on state, and the
// playing scene reads it once per frame after every system has had its
// turn. One channel, because "what being hit means" (a life, a respawn,
// maybe the end of the run) is the scene's decision and should be made in
// exactly one place regardless of what did the hitting.
function hitThePlayer() {
  if (player.invincible > 0) return;
  state.playerTouchedHazard = true;
}

export function consumePlayerHit() {
  const hit = !!state.playerTouchedHazard;
  state.playerTouchedHazard = false;
  return hit;
}

export function canAttack(owner) {
  const weapon = getWeapon(owner.weapon);
  if (!weapon) return false;
  if (owner.weaponCooldown > 0) return false;
  if (weapon.ammo != null && (owner.ammo || 0) <= 0) return false;
  return true;
}

// Starts a swing or a shot. Returns whether anything actually happened, so
// an AI can tell "I attacked" from "I was still on cooldown".
export function startAttack(owner) {
  if (!canAttack(owner)) return false;
  const weapon = getWeapon(owner.weapon);
  owner.weaponCooldown = weapon.cooldown;
  owner.weaponTimer = weapon.duration;
  // A melee swing's hitbox is live for its whole animation (see the note in
  // weapons/pickaxe.js on why), so it needs to remember who it has already
  // hit — otherwise one swing lands `duration` times.
  owner.hitThisSwing = new Set();
  if (weapon.kind === 'restore') {
    owner.ammo--;
    spawnRestoreTriangle(owner);
  }
  if (weapon.sound) weapon.sound();
  return true;
}

// How far through the swing the hitbox is, and how far out it reaches.
//
// This used to be "full reach, every frame the animation is playing", which
// meant the hit landed while the weapon was still cocked behind the owner's
// shoulder. Reported from play: "looks like I can hit enemies before the
// pick contacts them", and much worse with the sledgehammer, whose 22-frame
// overhead smash spends its first half going UP.
//
// So the box now follows the swing. It stays shut through the wind-up
// (`activeFrom`, a fraction of the duration, per weapon) and then extends
// from about half reach to full as the weapon travels.
//
// What it deliberately does NOT go back to is a single-frame check on the
// button press. That was the original design and it whiffed at run speed —
// press a hair early, miss the empty box that frame, and run into the enemy
// on the next one. A window that opens late and stays open to the end of the
// animation keeps that fixed while still looking like the hit it draws.
function swingReach(owner, weapon) {
  const progress = weapon.duration ? 1 - owner.weaponTimer / weapon.duration : 1;
  const from = weapon.activeFrom == null ? 0.35 : weapon.activeFrom;
  if (progress < from) return 0;                       // still winding up
  const out = from >= 1 ? 1 : Math.min(1, (progress - from) / (1 - from));
  return weapon.reach * (0.55 + 0.45 * out);
}

function meleeHitbox(owner, weapon, reach) {
  const b = boxOf(owner);
  const dir = owner.facing >= 0 ? 1 : -1;
  return {
    x: dir > 0 ? b.x + b.width : b.x - reach,
    y: b.y,
    width: reach,
    height: b.height
  };
}

function applyMeleeHits(owner, weapon) {
  const reach = swingReach(owner, weapon);
  if (reach <= 0) return;
  const hitbox = meleeHitbox(owner, weapon, reach);
  const dir = owner.facing >= 0 ? 1 : -1;

  if (owner === player) {
    for (const enemy of state.enemies) {
      if (!enemy.alive) continue;
      if (owner.hitThisSwing && owner.hitThisSwing.has(enemy)) continue;
      if (!isColliding(hitbox, boxOf(enemy))) continue;
      if (owner.hitThisSwing) owner.hitThisSwing.add(enemy);
      damageEnemy(enemy, weapon, dir);
    }
    return;
  }

  if (owner.hitThisSwing && owner.hitThisSwing.has(player)) return;
  if (!isColliding(hitbox, boxOf(player))) return;
  if (owner.hitThisSwing) owner.hitThisSwing.add(player);
  hitThePlayer();
}

// Ticks timers and keeps a live melee hitbox swinging. Call once per frame
// for every owner that can hold a weapon.
export function tickWeapon(owner) {
  if (owner.weaponCooldown > 0) owner.weaponCooldown--;
  if (owner.weaponTimer > 0) {
    owner.weaponTimer--;
    const weapon = getWeapon(owner.weapon);
    if (weapon && weapon.kind === 'melee') applyMeleeHits(owner, weapon);
  }
}

// The player's own input path. Kept here rather than in the player module
// so that "what the B button does" is decided by the registry entry for
// whatever they're holding, not by an if/else over weapon names.
export function updatePlayerWeapon(inputLocked) {
  tickWeapon(player);
  // Cutscene-locked input mustn't swing, same gate the pickaxe had.
  if (inputLocked) return;
  if (keys['b'] || keys['B']) startAttack(player);
}

// --- damage -----------------------------------------------------------

// A corrupted square is a victim, not a combatant: nothing in the arsenal
// can beat one, and the Cornerstone doesn't beat it either — it restores
// it. Swinging at one thuds and accomplishes nothing, which is the point.
// See GAME_DESIGN's octagon section and the "restoration, not combat" note
// on the Sculptor.
// Said once, the first time in a run that a player swings at something that
// cannot be swung at. The thud and the lack of damage say it too, but a
// seven-year-old's reading of "nothing happened" is usually "I missed", and
// they'll try the same thing twenty more times.
let explainedOctagon = false;

export function resetOctagonHint() {
  explainedOctagon = false;
}

function rebuffOctagon(octagon) {
  if (octagon.thudTimer > 0) return;
  octagon.thudTimer = 18;
  playOctagonThud();
  spawnDust(octagon.x + octagon.w / 2, octagon.y + octagon.w / 2, 4, { spread: 2, size: 5, life: 16 });
  if (!explainedOctagon) {
    explainedOctagon = true;
    showToast(octagon.kind === 'core' ? "IT CAN'T BE BROKEN" : "IT WON'T BREAK — IT'S A SQUARE", 150);
  }
}

export function damageEnemy(enemy, weapon, dir = 1) {
  // Corrupted squares and the core are the same kind of thing at different
  // scales, and neither can be beaten — only put back. The ending of this
  // game is a restoration, not a kill, and that has to be true of the hit
  // path and not just of the cutscene after it.
  if (enemy.kind === 'octagon' || enemy.kind === 'core') { rebuffOctagon(enemy); return false; }
  // Level 1's Foreman — the unwinnable boss. Marked in level data rather
  // than inferred from `boss`, because every boss after it CAN be fought.
  if (enemy.invulnerable) return false;

  enemy.hp = (enemy.hp == null ? 1 : enemy.hp) - (weapon.damage || 1);
  enemy.hitFlash = 10;
  if (weapon.knockback) enemy.knockback = dir * weapon.knockback;

  if (enemy.hp > 0) {
    // It survived: a short jolt so the player knows the hit counted even
    // though nothing died. This is the feedback a multi-hit boss lives on.
    addShake(enemy.boss ? 4 : 2);
    addHitStop(3);
    playOctagonThud();
    return false;
  }

  enemy.alive = false;
  enemy.squish = 14;
  const worth = weapon.score || 100;
  state.score += worth;
  addPopup(enemy.x + enemy.w / 2, enemy.y, `+${worth}`, '#8effc0');
  spawnExplosion(enemy.x + enemy.w / 2, enemy.y + enemy.w / 2, '#8effc0');
  addShake(enemy.boss ? 9 : 3);
  addHitStop(enemy.boss ? 8 : 4);
  playStomp();
  return true;
}

// Putting a corner back. `restoreHits` is how many triangles the target
// takes; `cornersLost` is the drawing's view of the same number, so the
// shape visibly squares up hit by hit instead of flipping at the end.
export function restoreTarget(target) {
  target.restoreHits = (target.restoreHits == null ? 1 : target.restoreHits) - 1;
  target.restoreFlash = 16;
  spawnExplosion(target.x + target.w / 2, target.y + target.w / 2, '#5ee7ff');

  if (target.restoreHits > 0) {
    // part-way: one corner back, and the shape knows it
    target.cornersLost = Math.max(0, Math.ceil(4 * target.restoreHits / (target.restoreTotal || 2)));
    addShake(target.boss ? 3 : 1.5);
    addHitStop(3);
    playOctagonThud();
    return false;
  }

  target.cornersLost = 0;
  target.restored = true;
  target.fleeing = true;
  state.score += 300;
  // Cyan, and worth three times a kill. Both of those are the game saying
  // which verb it actually cares about.
  addPopup(target.x + target.w / 2, target.y, '+300  RESTORED', '#5ee7ff');
  // A restoration gets a bigger, softer beat than a kill: longer stop, less
  // shake. It should land like relief rather than like an explosion.
  addShake(target.boss ? 6 : 2);
  addHitStop(target.boss ? 14 : 6);
  playRestore();
  return true;
}

// --- projectiles ------------------------------------------------------

export function spawnRestoreTriangle(owner) {
  const b = boxOf(owner);
  const dir = owner.facing >= 0 ? 1 : -1;
  state.projectiles.push({
    team: 'player',
    kind: 'triangle',
    x: b.x + b.width / 2 + dir * b.width * 0.8,
    y: b.y + b.height * 0.42,
    vx: dir * TRIANGLE_SPEED,
    vy: 0,
    size: TRIANGLE_SIZE,
    life: TRIANGLE_LIFE,
    spin: (b.x * 7 + b.y * 13) % 100,   // tumble phase, from where it was fired — deterministic like everything else that affects a probe
    dead: false
  });
}

// What the spheres fire back, from level 4 on.
//
// GAME_DESIGN left "what do spheres shoot?" open with two hard constraints:
// not triangles, and it has to read as sphere-shaped thinking. This is a
// slow round pellet with a soft edge — a sanding burst. The doc's own
// favourite was compressed air that shoves terrain around, and it also
// flagged that as the hardest to read at a glance; with a 7-year-old as the
// target player, legibility won. It is unmistakably round, unmistakably
// not cyan, and slow enough to be jumped or outrun, which is what keeps
// ranged enemies fair rather than just punishing.
export const SPHERE_SHOT_SPEED = 3.3;

export function spawnSphereShot(enemy) {
  const b = boxOf(enemy);
  const cx = b.x + b.width / 2;
  const cy = b.y + b.height / 2;
  const tx = player.x + player.width / 2;
  const ty = player.y + player.height / 2;
  const d = Math.hypot(tx - cx, ty - cy) || 1;
  state.projectiles.push({
    team: 'sphere',
    kind: 'puff',
    x: cx,
    y: cy,
    vx: (tx - cx) / d * SPHERE_SHOT_SPEED,
    vy: (ty - cy) / d * SPHERE_SHOT_SPEED * 0.55, // flattened — a lobbed shot is unreadable
    size: 7,
    life: 150,
    spin: 0,
    dead: false
  });
  playSphereShot();
}

function projectileBox(p) {
  return { x: p.x - p.size, y: p.y - p.size, width: p.size * 2, height: p.size * 2 };
}

// Anything in flight stops at solid terrain.
//
// Without this, cover doesn't exist: a sphere's shot passes through a wall
// and there is no such thing as getting behind something, which makes ranged
// enemies a pure tax rather than a problem with a solution. It cuts both
// ways on purpose — a triangle that hits a pillar is a triangle spent, which
// is a real cost given how few of them there are.
//
// The shockwaves the core rolls along the floor are exempt. They ARE the
// floor moving; stopping them at the first ledge would be stopping the
// attack at the thing it travels through.
function hitsTerrain(p) {
  if (p.kind === 'wave') return false;
  const box = projectileBox(p);
  return getLevel().platforms.some(t => t.width > 1 && isColliding(box, t));
}

export function updateProjectiles() {
  for (const p of state.projectiles) {
    if (p.dead) continue;
    p.x += p.vx;
    p.y += p.vy;
    if (--p.life <= 0) { p.dead = true; continue; }
    if (hitsTerrain(p)) {
      p.dead = true;
      spawnDust(p.x, p.y, 4, { spread: 2, size: 4, life: 14 });
      continue;
    }

    if (p.team === 'player') {
      for (const enemy of state.enemies) {
        if (!enemy.alive || enemy.restored) continue;
        if (!isColliding(projectileBox(p), boxOf(enemy))) continue;
        p.dead = true;
        if (enemy.kind === 'octagon' || enemy.kind === 'core') restoreTarget(enemy);
        else damageEnemy(enemy, { damage: 1, score: 150 }, Math.sign(p.vx) || 1);
        break;
      }
    } else if (isColliding(projectileBox(p), boxOf(player))) {
      p.dead = true;
      hitThePlayer();
    }
  }
  state.projectiles = state.projectiles.filter(p => !p.dead);
}

export function drawProjectiles(frameCount) {
  for (const p of state.projectiles) {
    if (p.kind === 'triangle') { drawRestoreProjectile(p, frameCount); continue; }

    if (p.kind === 'wave') {
      // The core's shockwave: an arc rolling along the floor rather than a
      // pellet flying through the air. Drawn as an expanding ring segment so
      // it reads as the ground itself moving, which is what it is.
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 120, 170, 0.85)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(p.x, p.y + p.size, p.size, Math.PI, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255, 200, 225, 0.45)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y + p.size, p.size * 0.6, Math.PI, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
      continue;
    }

    // The sphere shot: a soft round pellet with a halo. Everything about it
    // is curves, which is the whole visual argument.
    const glow = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, p.size * 2);
    glow.addColorStop(0, 'rgba(255, 159, 196, 0.95)');
    glow.addColorStop(0.5, 'rgba(255, 77, 141, 0.55)');
    glow.addColorStop(1, 'rgba(255, 77, 141, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffe3ee';
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function resetProjectiles() {
  state.projectiles = [];
}
