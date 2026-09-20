// Parked, not currently wired into any level (2026-09-19) — the player's
// earned weapon in level 1 is the melee pickaxe (weapons/pickaxe.js). This
// stays in the codebase because the bazooka is planned to reappear later in
// the game; nothing calls updateBazookaInput/updateMissiles/drawMissiles
// right now, so it has no effect until a future level's scene wires it back
// in. If/when that happens, player.js will need a `bazookaCooldown` field
// again (restored below alongside `weaponCooldown`) — the missile logic
// here still expects it.
import { ctx } from '../engine/renderer.js';
import { keys } from '../engine/input.js';
import { isColliding } from '../engine/physics.js';
import { getLevel } from '../levels/levelLoader.js';
import { spawnExplosion } from '../entities/particles.js';
import { playMissile, playExplosion, playDeflect } from '../audio/sfx.js';
import { showToast, toast } from '../ui/hud.js';
import { state } from '../state.js';

const BAZOOKA_COOLDOWN = 60; // 1 second between shots
const MISSILE_SPEED = 11;
const MISSILE_RANGE = 320;  // missiles fizzle out after this many pixels

function fireMissile(player, cutsceneActive) {
  // silently eaten during the cutscene
  if (cutsceneActive) return;

  if (player.bazookaCooldown > 0) {
    if (toast.timer <= 0) showToast('COOLING DOWN', 50);
    return;
  }

  player.bazookaCooldown = BAZOOKA_COOLDOWN;
  player.weaponTimer = 16;
  const mx = player.x + player.width / 2 + player.facing * 36;
  const my = player.y + player.height / 2 - 11.5;
  state.missiles.push({ x: mx, y: my, spawnX: mx, dir: player.facing, w: 12, h: 5 });
  playMissile();
}

// Cooldown ticking + the held-key check that fires a shot. Called once per
// frame from the playing scene while gameState === 'playing'.
export function updateBazookaInput(player, cutsceneActive) {
  if (player.bazookaCooldown > 0) player.bazookaCooldown--;
  if (player.weaponTimer > 0) player.weaponTimer--;
  if (keys['b'] || keys['B']) fireMissile(player, cutsceneActive);
}

export function updateMissiles() {
  for (const missile of state.missiles) {
    missile.x += missile.dir * MISSILE_SPEED;
    // fizzle out after traveling the max range
    if (!missile.hit && Math.abs(missile.x - missile.spawnX) > MISSILE_RANGE) {
      missile.hit = true;
      spawnExplosion(missile.x, missile.y, '#7a84a8');
    }
  }
  const worldWidth = getLevel().worldWidth;
  state.missiles = state.missiles.filter(m => m.x > -50 && m.x < worldWidth + 50);

  for (const missile of state.missiles) {
    if (!missile.hit) {
      for (const enemy of state.enemies) {
        if (!enemy.alive) continue;
        const eBox = { x: enemy.x, y: enemy.y, width: enemy.w, height: enemy.w };
        const mBox = { x: missile.x - missile.w / 2, y: missile.y - missile.h / 2, width: missile.w, height: missile.h };
        if (isColliding(mBox, eBox)) {
          // the boss can't be killed by missiles — deflect them
          if (enemy.boss) {
            missile.hit = true;
            spawnExplosion(missile.x, missile.y, '#ffdf7a');
            playDeflect();
            break;
          }
          enemy.alive = false;
          enemy.squish = 14;
          state.score += 150;
          missile.hit = true;
          spawnExplosion(enemy.x + enemy.w / 2, enemy.y + enemy.w / 2, '#8effc0');
          playExplosion();
          break;
        }
      }
    }
  }
  state.missiles = state.missiles.filter(m => !m.hit);
}

export function drawMissiles() {
  for (const missile of state.missiles) {
    ctx.save();
    ctx.translate(missile.x, missile.y);
    ctx.scale(missile.dir, 1);
    ctx.fillStyle = '#8effc0';
    ctx.fillRect(-missile.w / 2, -missile.h / 2, missile.w, missile.h);
    ctx.fillStyle = '#ffdf7a';
    ctx.beginPath();
    ctx.moveTo(-missile.w / 2, -missile.h / 2);
    ctx.lineTo(-missile.w / 2 - 6, 0);
    ctx.lineTo(-missile.w / 2, missile.h / 2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}
