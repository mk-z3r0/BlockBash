import { ctx } from '../engine/renderer.js';
import { drawStickLegs, drawMuscleArm } from '../engine/renderer.js';
import { STOMP_BOUNCE } from '../engine/physics.js';
import { getLevel } from '../levels/levelLoader.js';
import { spawnExplosion, spawnDust } from './particles.js';
import { playStomp } from '../audio/sfx.js';
import { state } from '../state.js';

// The rescue NPC only exists during the boss cutscene (see
// scenes/playingScene.js): it runs in from off-screen, jumps the chainsaw
// boss, and exits stage right. Kept as its own module since Phase 5's
// cutscene engine will likely want to reuse "a scripted character" like this.
export function createRescueNPC(spawnX) {
  return {
    x: spawnX,
    y: getLevel().groundY - 44,
    width: 44, height: 44,
    velocityX: 8.5,
    velocityY: 0,
    jumpVX: 0,
    facing: 1,
    state: 'running',
    timer: 0,
    stomped: false
  };
}

// Returns true once the NPC has run off-screen and should be discarded.
export function updateRescueNPC(npc, viewWidth, cameraX) {
  const boss = state.enemies.find(e => e.boss);
  const groundY = getLevel().groundY;

  if (npc.state === 'running') {
    npc.x += npc.velocityX;
    if (boss && boss.alive) {
      const dist = boss.x - (npc.x + npc.width);
      if (dist < 180 && dist > 0) {
        npc.state = 'jumping';
        npc.velocityY = -14;
        npc.jumpVX = 2.0;
      }
    }
  } else if (npc.state === 'jumping') {
    npc.velocityY += 0.68;
    npc.x += npc.jumpVX;
    npc.y += npc.velocityY;
    if (boss && boss.alive && npc.velocityY > 0) {
      const npcCX = npc.x + npc.width / 2;
      const bossCX = boss.x + boss.w / 2;
      const overlap = Math.abs(npcCX - bossCX) < (npc.width / 2 + boss.w / 2);
      if (overlap && npc.y + npc.height >= boss.y) {
        boss.alive = false;
        boss.squish = 14;
        state.score += 200;
        playStomp();
        spawnExplosion(boss.x + boss.w / 2, boss.y + boss.w / 2, '#8effc0');
        spawnDust(boss.x + boss.w / 2, boss.y + boss.w, 12, { spread: 4, size: 10, life: 28 });
        npc.velocityY = STOMP_BOUNCE;
        npc.state = 'landing';
        npc.stomped = true;
        npc.timer = 0;
      }
    }
    if (!npc.stomped && npc.y + npc.height >= groundY) {
      npc.y = groundY - npc.height;
      npc.velocityY = 0;
      if (boss && boss.alive) {
        boss.alive = false;
        boss.squish = 14;
        state.score += 200;
        playStomp();
        spawnExplosion(boss.x + boss.w / 2, boss.y + boss.w / 2, '#8effc0');
      }
      npc.state = 'posing';
      npc.stomped = true;
      npc.timer = 0;
    }
  } else if (npc.state === 'landing') {
    npc.velocityY += 0.68;
    npc.y += npc.velocityY;
    if (npc.y + npc.height >= groundY) {
      npc.y = groundY - npc.height;
      npc.velocityY = 0;
      npc.velocityX = 0;
      npc.state = 'posing';
      npc.timer = 0;
    }
  } else if (npc.state === 'posing') {
    npc.timer++;
    if (npc.timer > 70) {
      npc.state = 'exit';
      npc.velocityX = 5;
    }
  } else if (npc.state === 'exit') {
    npc.x += npc.velocityX;
    if (npc.x > cameraX + viewWidth + 60) {
      return true;
    }
  }
  return false;
}

export function drawRescueNPC(npc, frameCount) {
  const hw = npc.width / 2;
  const hh = npc.height / 2;
  const legLength = 14;
  const groundY = hh;
  const hipY = groundY - legLength;
  const moving = npc.state === 'running' || npc.state === 'exit';
  const legSwing = moving ? Math.sin(frameCount * 0.5) * 14 : 4;

  ctx.save();
  ctx.translate(npc.x + hw, npc.y + hh);

  // stick legs
  drawStickLegs(hipY, npc.state === 'jumping' || npc.state === 'landing' ? hipY + 6 : groundY, legSwing);

  // body shifted up on the legs
  ctx.save();
  ctx.translate(0, -legLength);

  ctx.fillStyle = '#f2c14e';
  ctx.fillRect(-hw, -hh, npc.width, npc.height);
  ctx.strokeStyle = '#c99a2e';
  ctx.lineWidth = 3;
  ctx.strokeRect(-hw, -hh, npc.width, npc.height);

  // muscular arm
  drawMuscleArm(0, -hh * 0.1, npc.facing * (hw + 20), -hh * 0.35);

  ctx.restore();
  ctx.restore();
}
