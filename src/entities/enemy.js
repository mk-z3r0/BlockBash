import { ctx } from '../engine/renderer.js';
import { drawStickLegs, drawMuscleArm, drawPickaxeIcon } from '../engine/renderer.js';
import { isColliding, P } from '../engine/physics.js';
import { playStomp, playSurprise } from '../audio/sfx.js';
import { pickaxeAngleAt, pickaxeFistAt, miningAngleAt, miningFistAt } from '../weapons/pickaxe.js';
import { getWeapon } from '../weapons/registry.js';
import { startAttack, tickWeapon, spawnSphereShot, boxOf } from '../weapons/combat.js';
import { initBoss, updateBossBehaviour, onBossDefeated } from './bosses.js';
import { addShake, addHitStop } from '../engine/impact.js';
import { state } from '../state.js';

// --- enemy tiers (GAME_DESIGN's "Enemies evolve across levels") ---------
//
//   passive     patrols its span and ignores you. Levels 1-2.
//   pursuer     patrols until you're close and level with it, then comes
//               after you, swinging whatever tool it carries. Levels 3+.
//   aggressor   a pursuer that also shoots, and gives up the chase later.
//               Levels 4+.
//
// Tier is data on the spawn, defaulting to `passive`, so every level-1
// enemy keeps behaving exactly as it always has without its data changing.
// The tiers deliberately share one movement function with different
// numbers rather than branching into three AIs: the difference the player
// feels is range and commitment, not manoeuvre.
const AGGRO_RANGE = { passive: 0, pursuer: 230, aggressor: 330 };
// How far above/below the enemy the player can be and still be chased. A
// sphere on the ground shouldn't charge at someone standing on a platform
// two jumps up — it can't get there, and watching it jitter under them
// reads as broken rather than as menacing.
const AGGRO_HEIGHT = 70;
// Chase speed as a multiple of the patrol speed the level authored.
const CHASE_MULTIPLIER = { pursuer: 1.35, aggressor: 1.6 };
// How close before it swings. Slightly inside the weapon's own reach so the
// swing connects rather than whiffing at maximum extension.
const SWING_RANGE = 44;
const SHOT_COOLDOWN = 110;
// Corrupted squares shamble. They are not hunting you, they're just drawn
// toward you, and the speed says so.
const OCTAGON_SPEED = 0.75;

// Builds live enemies from a level's raw spawn data.
export function spawnEnemies(spawns) {
  const built = spawns.map(e => ({
    tier: 'passive',
    kind: 'sphere',
    hp: 1,
    ...e,
    alive: true,
    squish: 0,
    baseY: e.y,
    baseX: e.x,
    hopVY: 0,
    hopTimer: 90 + Math.floor(Math.random() * 150), // ticks down to the next surprise hop
    shout: 0,
    awake: false,     // boss only: has the pickaxe come out yet
    swingPhase: 0,    // boss only: drives the threatening pickaxe swing
    mining: false,    // boss only: swinging down into the ground (cutscene 'freeze') vs a level combat swing (see the mining pose in weapons/pickaxe.js)
    // combat state — see weapons/combat.js, which reads these by duck type
    weaponTimer: 0,
    weaponCooldown: 0,
    hitThisSwing: null,
    facing: e.speed >= 0 ? 1 : -1,
    hitFlash: 0,
    knockback: 0,
    thudTimer: 0,
    shotTimer: 40 + Math.floor(Math.random() * SHOT_COOLDOWN),
    charge: 0,      // 0..1 wind-up before a shot, drives the draw
    // octagons only
    restoreTotal: e.restoreHits == null ? 2 : e.restoreHits,
    restoreHits: e.restoreHits == null ? 2 : e.restoreHits,
    // What to come back to when a fight restarts — see resetBossAndCutscene
    // in scenes/playingScene.js. Captured here because the spawn data is the
    // only place the original numbers still exist once play has started.
    baseHp: e.hp == null ? 1 : e.hp,
    baseRestoreHits: e.restoreHits == null ? 2 : e.restoreHits,
    cornersLost: 4,
    restoreFlash: 0,
    restored: false,
    fleeing: false
  }));
  // Fightable bosses get their phase machine primed. Level 1's Foreman
  // isn't one — it's `mode: 'cutscene'` and driven entirely by its scene.
  built.filter(e => e.boss && e.mode === 'fight').forEach(initBoss);
  return built;
}

function patrol(enemy) {
  enemy.x += enemy.speed;
  if (enemy.x < enemy.minX || enemy.x + enemy.w > enemy.maxX) {
    enemy.speed *= -1;
    enemy.x = Math.max(enemy.minX, Math.min(enemy.x, enemy.maxX - enemy.w));
  }
  enemy.facing = enemy.speed >= 0 ? 1 : -1;
}

function playerIsNear(enemy, player, range) {
  const dx = (player.x + player.width / 2) - (enemy.x + enemy.w / 2);
  const dy = (player.y + player.height / 2) - (enemy.y + enemy.w / 2);
  return Math.abs(dx) < range && Math.abs(dy) < AGGRO_HEIGHT;
}

// Chase, but never off the span the level gave it. minX/maxX stay the
// leash: a sphere that could follow you anywhere would walk off its own
// platform into a pit, and levels are authored assuming it can't.
function chase(enemy, player, speed) {
  const dx = (player.x + player.width / 2) - (enemy.x + enemy.w / 2);
  const dir = Math.sign(dx) || 1;
  enemy.facing = dir;
  enemy.x = Math.max(enemy.minX, Math.min(enemy.x + dir * speed, enemy.maxX - enemy.w));
}

// Boss movement/attack timing for level 1's Foreman is driven by its
// cutscene, not by the AI here — see the `enemy.boss` branch, which just
// backs off while a cutscene is in control. Later bosses declare a tier
// like anything else and fight for themselves.
export function updateEnemies(player, cutsceneActive) {
  for (const enemy of state.enemies) {
    if (!enemy.alive) {
      // The frame a fightable boss goes down: drop what it was carrying and
      // open the way. Idempotent, so running it every frame afterwards
      // costs nothing and a player can never be stranded beside a dead boss
      // with no drop.
      if (enemy.boss && enemy.mode === 'fight') onBossDefeated(enemy);
      if (enemy.squish > 0) enemy.squish--;
      continue;
    }

    if (enemy.hitFlash > 0) enemy.hitFlash--;
    if (enemy.thudTimer > 0) enemy.thudTimer--;
    if (enemy.restoreFlash > 0) enemy.restoreFlash--;

    // A restored square is an ally, not a recruit: it squares up and runs
    // off. That's the rescue NPC's existing exit behaviour, and the
    // decision recorded in IMPLEMENTATION_PLAN's Decisions made.
    if (enemy.restored) {
      // The core doesn't flee. It's the planet: it stays exactly where it
      // has always been, square again, while the ending plays over it.
      if (enemy.kind === 'core') continue;
      if (!enemy.fleeDir) enemy.fleeDir = enemy.x < player.x ? -1 : 1;
      enemy.x += enemy.fleeDir * 3.1;
      // Counted down rather than compared against the world's width: it
      // only has to outlast the time it takes to leave the screen, and a
      // freed square shouldn't linger in the enemy list for the rest of
      // the level either way.
      if ((enemy.fleeTimer = (enemy.fleeTimer || 240) - 1) <= 0) enemy.alive = false;
      continue;
    }

    // Knockback decays wherever it came from, before anything else moves.
    if (enemy.knockback) {
      enemy.x = Math.max(enemy.minX - 20, Math.min(enemy.x + enemy.knockback, enemy.maxX + 20 - enemy.w));
      enemy.knockback *= 0.78;
      if (Math.abs(enemy.knockback) < 0.3) enemy.knockback = 0;
    }

    if (enemy.kind === 'core') {
      // Driven entirely by its own phase machine (entities/bosses.js). It
      // never moves — the arena moves, and the player moves around it.
      if (!cutsceneActive) updateBossBehaviour(enemy, player);
    } else if (enemy.kind === 'octagon') {
      // Checked BEFORE the boss branches, because the Sculptor is a boss
      // AND an octagon, and what it is matters more than what rank it
      // holds: it shambles and it's beaten by being restored, exactly like
      // every other corrupted square.
      if (playerIsNear(enemy, player, 200)) chase(enemy, player, OCTAGON_SPEED);
      else patrol(enemy);
    } else if (enemy.boss && enemy.mode === 'fight') {
      // A real fight: the boss drives itself. Its own phase machine decides
      // when it can be hurt (see entities/bosses.js).
      if (!cutsceneActive) updateBossBehaviour(enemy, player);
    } else if (enemy.boss) {
      // Level 1's Foreman: patrols until its cutscene takes over.
      if (!enemy.awake) patrol(enemy);
      if (cutsceneActive) continue;
    } else {
      const range = AGGRO_RANGE[enemy.tier] || 0;
      const hunting = range > 0 && !cutsceneActive && playerIsNear(enemy, player, range);
      if (hunting) {
        chase(enemy, player, Math.abs(enemy.speed) * (CHASE_MULTIPLIER[enemy.tier] || 1));
        if (enemy.weapon && Math.abs((player.x + player.width / 2) - (enemy.x + enemy.w / 2)) < SWING_RANGE) {
          startAttack(enemy);
        }
        if (enemy.shoots) {
          if (--enemy.shotTimer <= 0) {
            enemy.shotTimer = SHOT_COOLDOWN;
            enemy.charge = 0;
            spawnSphereShot(enemy);
          } else {
            // Wind-up, so a shot is something the player saw coming rather
            // than something that happened to them. 0 until the last ~28
            // frames, then ramps to 1 at the moment of firing — the same
            // shape every boss telegraph in the game uses.
            enemy.charge = Math.max(0, 1 - enemy.shotTimer / 28);
          }
        }
      } else {
        patrol(enemy);
        if (enemy.charge) enemy.charge = Math.max(0, enemy.charge - 0.08);
      }
    }

    // A swing already in flight keeps swinging even once the player has
    // backed out of range — committed, like the player's own.
    if (enemy.weapon) tickWeapon(enemy);

    // --- surprise! every so often a sphere randomly hops instead of just
    // rolling — parked behind `canHop` (2026-09-19): enemies shouldn't
    // jump yet, that's saved for a later level. Off by default; a level's
    // enemy spawn data opts in with `canHop: true` per enemy. ---
    if (!enemy.boss && enemy.canHop && enemy.hopVY === 0 && enemy.y === enemy.baseY) {
      enemy.hopTimer--;
      if (enemy.hopTimer <= 0) {
        enemy.hopVY = -7.5;
        enemy.shout = 22;
        enemy.hopTimer = 150 + Math.floor(Math.random() * 200);
        playSurprise();
      }
    }

    if (enemy.hopVY !== 0 || enemy.y !== enemy.baseY) {
      enemy.hopVY += 0.5;
      enemy.y += enemy.hopVY;
      if (enemy.y >= enemy.baseY) {
        enemy.y = enemy.baseY;
        enemy.hopVY = 0;
      }
    }
    if (enemy.shout > 0) enemy.shout--;

    const eBox = boxOf(enemy);
    if (isColliding(player, eBox)) {
      if (enemy.invulnerable) {
        // the unwinnable boss — bounce off harmlessly
        player.velocityY = P.STOMP_BOUNCE;
        player.x = enemy.x - player.width - 5;
      } else if (enemy.kind === 'octagon') {
        // A corrupted square can't be stomped: there's nothing to defeat.
        // Touching one hurts, and the only answer is the Cornerstone.
        if (player.invincible <= 0) state.playerTouchedHazard = true;
      } else {
        const fromAbove = player.velocityY > 0 && (player.y + player.height) - enemy.y < enemy.w * 0.6;
        if (fromAbove && !enemy.stompProof) {
          enemy.hp -= 1;
          player.velocityY = P.STOMP_BOUNCE;
          if (enemy.hp <= 0) {
            enemy.alive = false;
            enemy.squish = 14;
            state.score += 100;
            addShake(2.5);
            addHitStop(3);
          } else {
            enemy.hitFlash = 10;
            addShake(2);
            addHitStop(2);
          }
          playStomp();
        } else if (player.invincible <= 0) {
          state.playerTouchedHazard = true;
        }
      }
    }
  }

  // Nothing is returned any more: contact damage raises the same flag on
  // state that a sphere's swing or shot does, and the scene consumes it
  // once, after every system has run. See weapons/combat.js.
}

// --- drawing ----------------------------------------------------------

// A corrupted square: a square with its corners sanded off. `cornersLost`
// drives how deep the cuts are, so restoring one visibly squares it back up
// corner by corner rather than flipping shape at the end. This is the
// game's whole visual argument in one function — see "The unifying idea".
function drawOctagonBody(size, cornersLost, flash, wasQuarrick) {
  const h = size / 2;
  const cut = (size * 0.3) * (cornersLost / 4);
  ctx.beginPath();
  if (cut <= 0.5) {
    ctx.rect(-h, -h, size, size);
  } else {
    ctx.moveTo(-h + cut, -h);
    ctx.lineTo(h - cut, -h);
    ctx.lineTo(h, -h + cut);
    ctx.lineTo(h, h - cut);
    ctx.lineTo(h - cut, h);
    ctx.lineTo(-h + cut, h);
    ctx.lineTo(-h, h - cut);
    ctx.lineTo(-h, -h + cut);
    ctx.closePath();
  }
  const grad = ctx.createLinearGradient(0, -h, 0, h);
  // Sickly green-grey: visibly a block character, visibly wrong. Not pink
  // (that's the spheres) and not the player's gold.
  //
  // Except for Quarrick, who keeps his gold, drained. The player has to be
  // able to tell that the thing shambling at them is him — that's the
  // entire weight of the beat, and a generic corrupted square would throw
  // it away.
  const sick = wasQuarrick ? '#8a7434' : '#8fa08c';
  const sicker = wasQuarrick ? '#4a3d1c' : '#4a5a52';
  grad.addColorStop(0, flash > 0 ? '#d8faff' : sick);
  grad.addColorStop(1, flash > 0 ? '#5ee7ff' : sicker);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = flash > 0 ? '#d7faff' : '#33403a';
  ctx.lineWidth = 2;
  ctx.stroke();

  // dead eyes — the zombie read
  ctx.fillStyle = '#20282a';
  ctx.fillRect(-h * 0.45, -h * 0.25, size * 0.14, size * 0.14);
  ctx.fillRect(h * 0.18, -h * 0.25, size * 0.14, size * 0.14);
}

// The core: a dodecahedron being argued back into a cube.
//
// GAME_DESIGN describes it as "every edge and vertex shaved off a cube, and
// then some, leaving 12 pentagonal faces" — the octagon corruption at
// planetary scale — and says each restoring hit "snaps one face back toward
// square. The final hit makes it cubic again."
//
// So it's drawn as twelve vertices whose radius is interpolated between a
// regular 12-gon and the outline of a square, by how much of it has been put
// back. At full corruption the twelve points sit on a circle; at zero they
// sit exactly on a square's edges and the shape IS a cube face-on. Nothing
// switches over at the end — the player watches it square up, hit by hit,
// which is the entire thesis of the game happening in one shape.
function drawCoreBody(size, progress, frameCount, flash) {
  const r = size / 2;
  const POINTS = 12;
  ctx.beginPath();
  for (let i = 0; i < POINTS; i++) {
    // -PI/4 so a vertex lands on each corner of the square it's becoming,
    // rather than the square arriving rotated 15 degrees off true.
    const a = (i / POINTS) * Math.PI * 2 - Math.PI / 4;
    const cos = Math.cos(a), sin = Math.sin(a);
    // Radius out to a square's edge along this angle: the square is
    // |x| <= r and |y| <= r, so the boundary is r / max(|cos|, |sin|).
    const squareR = r / Math.max(Math.abs(cos), Math.abs(sin));
    const rad = r + (squareR - r) * progress;
    const x = cos * rad, y = sin * rad;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();

  const pulse = 0.5 + 0.5 * Math.sin(frameCount * 0.04);
  const grad = ctx.createRadialGradient(0, 0, r * 0.15, 0, 0, r);
  if (flash > 0) {
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(1, '#5ee7ff');
  } else {
    // Sphere pink while it's theirs, cyan as it comes back — the same cyan
    // the cube's edges are drawn in, and the same the Cornerstone fires.
    grad.addColorStop(0, `rgb(${255 - progress * 160}, ${150 + progress * 80}, ${200 + progress * 55})`);
    grad.addColorStop(1, `rgb(${120 - progress * 60}, ${30 + progress * 90}, ${70 + progress * 90})`);
  }
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = flash > 0 ? '#ffffff' : `rgba(94, 231, 255, ${0.35 + 0.4 * pulse + progress * 0.25})`;
  ctx.lineWidth = 3;
  ctx.stroke();

  // the seams between its faces, fading as they stop being faces
  ctx.strokeStyle = `rgba(10, 13, 28, ${0.45 * (1 - progress)})`;
  ctx.lineWidth = 1.5;
  for (let i = 0; i < POINTS; i++) {
    const a = (i / POINTS) * Math.PI * 2 - Math.PI / 4;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * r * 0.92, Math.sin(a) * r * 0.92);
    ctx.stroke();
  }
}

export function drawEnemies(frameCount, cutsceneDone) {
  for (const enemy of state.enemies) {
    if (!enemy.alive && enemy.squish <= 0) continue;
    const cx = enemy.x + enemy.w / 2;
    const cy = enemy.y + enemy.w / 2;
    const squashed = !enemy.alive;
    const scaleY = squashed ? Math.max(0.1, enemy.squish / 14) * 0.4 : 1;
    const isHopping = enemy.hopVY !== 0 || enemy.y !== enemy.baseY;
    const legLength = 8;
    const groundY = enemy.w / 2;          // bottom of the hitbox — the actual ground line
    const hipY = groundY - legLength;     // bottom of the body, where the legs attach

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1, scaleY);

    // stick legs, reaching exactly to the ground line — tucked up mid-hop
    // The core has no legs. It has never walked anywhere; it's the thing
    // they dug toward and it has been sitting there the whole game.
    if (!squashed && enemy.kind !== 'core') {
      const legSwing = isHopping ? -6 : Math.sin((frameCount + enemy.x) * 0.3) * 5;
      const footY = isHopping ? hipY + 4 : groundY;
      drawStickLegs(hipY, footY, legSwing);
    }

    // the body sits on top of the legs, shifted up rather than sunk to the ground
    ctx.save();
    ctx.translate(0, -legLength);

    if (enemy.kind === 'core') {
      const progress = enemy.restoreTotal
        ? 1 - enemy.restoreHits / enemy.restoreTotal
        : 0;
      drawCoreBody(enemy.w, progress, frameCount, enemy.restoreFlash);
      ctx.restore();
      ctx.restore();
      continue;
    }

    if (enemy.kind === 'octagon') {
      // A shuffle rather than a roll — it leans as it walks.
      ctx.rotate(Math.sin((frameCount + enemy.x) * 0.12) * 0.07);
      drawOctagonBody(enemy.w, enemy.cornersLost, enemy.restoreFlash, enemy.quarrick);
      ctx.restore();
      ctx.restore();
      continue;
    }

    // A sphere that shoots has to be tellable from one that doesn't, at a
    // glance, before it fires. Without this they are the same pink ball and
    // the player's only way to identify a shooter is to be shot by it —
    // which turns the ranged tier from a problem into an ambush.
    //
    // Two signals: a permanent hot core (it's carrying something), and a
    // halo that swells through the wind-up so the shot itself is telegraphed.
    if (enemy.shoots && !squashed) {
      const r = enemy.w / 2;
      const halo = ctx.createRadialGradient(0, 0, r * 0.6, 0, 0, r * (1.5 + enemy.charge * 0.9));
      halo.addColorStop(0, `rgba(255, 210, 120, ${0.25 + enemy.charge * 0.5})`);
      halo.addColorStop(1, 'rgba(255, 150, 60, 0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(0, 0, r * (1.6 + enemy.charge), 0, Math.PI * 2);
      ctx.fill();
    }

    const grad = ctx.createRadialGradient(-enemy.w * 0.2, -enemy.w * 0.2, 2, 0, 0, enemy.w * 0.7);
    if (enemy.hitFlash > 0) {
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(1, '#ff8fb5');
    } else if (enemy.shoots) {
      // hotter and more orange than a plain sphere, at every moment
      grad.addColorStop(0, '#ffe9a8');
      grad.addColorStop(1, '#b03a2e');
    } else if (enemy.boss) {
      grad.addColorStop(0, enemy.awake ? '#ffd9a0' : '#ffb0c8');
      grad.addColorStop(1, enemy.awake ? '#8a1020' : '#7a1f45');
    } else {
      grad.addColorStop(0, '#ff9fc4');
      grad.addColorStop(1, '#a12d5c');
    }
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, enemy.w / 2, 0, Math.PI * 2);
    ctx.fill();

    // one muscular arm on the side it's travelling toward, rooted at the
    // sphere's center — exactly the same art as the player's. Level 1's
    // Foreman rides an oscillating phase (a continuous threat, not a
    // button press); every armed sphere after it drives the same poses
    // from its own weaponTimer, through the registry, exactly like the
    // player does.
    if (!squashed) {
      const side = enemy.speed >= 0 ? 1 : -1;
      const r = enemy.w / 2;
      const hasThreatSwing = enemy.boss && enemy.awake && !cutsceneDone && enemy.mode !== 'fight';
      const carried = getWeapon(enemy.weapon);

      if (hasThreatSwing) {
        const swingProgress = (Math.sin(enemy.swingPhase * 0.24) + 1) / 2;
        const angleAt = enemy.mining ? miningAngleAt : pickaxeAngleAt;
        const fistAt = enemy.mining ? miningFistAt : pickaxeFistAt;
        const fist = fistAt(r, r, side, swingProgress);
        const hand = drawMuscleArm(0, -r * 0.1, fist.x, fist.y);
        ctx.save();
        ctx.translate(hand.x, hand.y);
        // scale(side, 1) before rotating, same as the player's swing — keeps
        // the pickaxe pointing away from the body on both sides
        ctx.scale(side, 1);
        ctx.rotate(angleAt(swingProgress));
        drawPickaxeIcon();
        ctx.restore();
      } else if (carried) {
        const facing = enemy.facing >= 0 ? 1 : -1;
        const progress = enemy.weaponTimer > 0 ? 1 - enemy.weaponTimer / carried.duration : 0;
        const fist = carried.fistAt(r, r, facing, progress);
        const hand = drawMuscleArm(0, -r * 0.1, fist.x, fist.y);
        carried.drawHeld(hand, facing, progress);
      } else {
        const fist = { x: side * (r + 17), y: -r * 0.35 };
        drawMuscleArm(0, -r * 0.1, fist.x, fist.y);
      }
    }

    ctx.restore();
    ctx.restore();

    // surprise! a little exclamation bubble pops up above the body during the hop
    if (enemy.shout > 0) {
      const bubbleY = cy - legLength - enemy.w * 0.9;
      ctx.save();
      ctx.globalAlpha = Math.min(1, enemy.shout / 10);
      ctx.fillStyle = '#fffbe0';
      ctx.beginPath();
      ctx.arc(cx, bubbleY, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ff4d8d';
      ctx.font = 'bold 13px Trebuchet MS, Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('!', cx, bubbleY + 4);
      ctx.restore();
    }
  }
}
