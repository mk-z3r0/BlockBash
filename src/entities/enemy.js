import { ctx } from '../engine/renderer.js';
import { drawStickLegs, drawMuscleArm, drawPickaxeIcon } from '../engine/renderer.js';
import { isColliding, STOMP_BOUNCE } from '../engine/physics.js';
import { spawnExplosion } from './particles.js';
import { playStomp, playSurprise } from '../audio/sfx.js';
import { pickaxeAngleAt, pickaxeFistAt } from '../weapons/pickaxe.js';
import { state } from '../state.js';

// Builds live enemies from a level's raw spawn data.
export function spawnEnemies(spawns) {
  return spawns.map(e => ({
    ...e,
    alive: true,
    squish: 0,
    baseY: e.y,
    baseX: e.x,
    hopVY: 0,
    hopTimer: 90 + Math.floor(Math.random() * 150), // ticks down to the next surprise hop
    shout: 0,
    awake: false,     // boss only: has the pickaxe come out yet
    swingPhase: 0     // boss only: drives the threatening pickaxe swing
  }));
}

// Boss movement/attack timing is driven by the cutscene state machine in
// scenes/playingScene.js, not by the patrol AI here — see the `enemy.boss`
// branch below, which just backs off while a cutscene is in control.
export function updateEnemies(player, cutsceneActive) {
  let hitPlayer = false;
  for (const enemy of state.enemies) {
    if (!enemy.alive) {
      if (enemy.squish > 0) enemy.squish--;
      continue;
    }

    if (enemy.boss) {
      if (!enemy.awake) {
        enemy.x += enemy.speed;
        if (enemy.x < enemy.minX || enemy.x + enemy.w > enemy.maxX) {
          enemy.speed *= -1;
          enemy.x = Math.max(enemy.minX, Math.min(enemy.x, enemy.maxX - enemy.w));
        }
      }
      // boss collision during cutscene — don't kill the player
      if (cutsceneActive) continue;
    } else {
      enemy.x += enemy.speed;
      if (enemy.x < enemy.minX || enemy.x + enemy.w > enemy.maxX) {
        enemy.speed *= -1;
        enemy.x = Math.max(enemy.minX, Math.min(enemy.x, enemy.maxX - enemy.w));
      }

      // --- surprise! every so often a sphere randomly hops instead of just rolling ---
      if (enemy.hopVY === 0 && enemy.y === enemy.baseY) {
        enemy.hopTimer--;
        if (enemy.hopTimer <= 0) {
          enemy.hopVY = -7.5;
          enemy.shout = 22;
          enemy.hopTimer = 150 + Math.floor(Math.random() * 200);
          playSurprise();
        }
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

    const eBox = { x: enemy.x, y: enemy.y, width: enemy.w, height: enemy.w };
    if (isColliding(player, eBox)) {
      if (enemy.boss) {
        // the boss can't be killed by the player — bounce off harmlessly
        player.velocityY = STOMP_BOUNCE;
        player.x = enemy.x - player.width - 5;
      } else {
        const fromAbove = player.velocityY > 0 && (player.y + player.height) - enemy.y < enemy.w * 0.6;
        if (fromAbove) {
          enemy.alive = false;
          enemy.squish = 14;
          player.velocityY = STOMP_BOUNCE;
          state.score += 100;
          playStomp();
        } else if (player.invincible <= 0) {
          hitPlayer = true;
        }
      }
    }
  }
  return { hitPlayer };
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
    if (!squashed) {
      const legSwing = isHopping ? -6 : Math.sin((frameCount + enemy.x) * 0.3) * 5;
      const footY = isHopping ? hipY + 4 : groundY;
      drawStickLegs(hipY, footY, legSwing);
    }

    // the body sits on top of the legs, shifted up rather than sunk to the ground
    ctx.save();
    ctx.translate(0, -legLength);

    const grad = ctx.createRadialGradient(-enemy.w * 0.2, -enemy.w * 0.2, 2, 0, 0, enemy.w * 0.7);
    if (enemy.boss) {
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
    // sphere's center — exactly the same art as the player's. Once the
    // pickaxe is out, the fist target rides the same idle(shoulder) <->
    // struck(handle level with the ground) sweep as the player's swing
    // (weapons/pickaxe.js) — just driven by an oscillating phase instead of
    // a one-shot timer, since the boss's is a continuous threat, not a
    // single button-press swing. Sharing the same two poses is what keeps
    // the boss's swing reading as the same motion as the player's.
    if (!squashed) {
      const side = enemy.speed >= 0 ? 1 : -1;
      const r = enemy.w / 2;
      const hasPickaxe = enemy.boss && enemy.awake && !cutsceneDone;
      const swingProgress = hasPickaxe ? (Math.sin(enemy.swingPhase * 0.24) + 1) / 2 : 0;
      const fist = hasPickaxe ? pickaxeFistAt(r, r, side, swingProgress) : { x: side * (r + 17), y: -r * 0.35 };
      const hand = drawMuscleArm(0, -r * 0.1, fist.x, fist.y);

      // the boss whips out its pickaxe once it's awake, swinging it as a
      // continuous threat — this is what it drops for the player once the
      // rescue NPC stomps it (see entities/weaponPickup.js)
      if (hasPickaxe) {
        ctx.save();
        ctx.translate(hand.x, hand.y);
        // scale(side, 1) before rotating, same as the player's swing (see
        // weapons/pickaxe.js) — keeps the pickaxe pointing away from the
        // body on both sides instead of swinging through it
        ctx.scale(side, 1);
        ctx.rotate(pickaxeAngleAt(swingProgress));
        drawPickaxeIcon();
        ctx.restore();
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
