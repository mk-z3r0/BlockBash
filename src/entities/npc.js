import { ctx } from '../engine/renderer.js';
import { drawStickLegs, drawMuscleArm } from '../engine/renderer.js';
import { P } from '../engine/physics.js';
import { getLevel, surfaceYAt } from '../levels/levelLoader.js';
import { spawnExplosion, spawnDust } from './particles.js';
import { playStomp } from '../audio/sfx.js';
import { spawnWeaponPickup } from './weaponPickup.js';
import { state } from '../state.js';

// Quarrick — the rescue NPC. He shows up twice in a level: during the boss
// cutscene (see scenes/playingScene.js), where he runs in from off-screen,
// jumps the pickaxe-wielding boss and exits stage right; and again at the
// world's edge, already standing on the next face, waiting for the player to
// make the jump. Kept as its own module since Phase 5's cutscene engine will
// likely want to reuse "a scripted character" like this.
export function createRescueNPC(spawnX) {
  return {
    x: spawnX,
    y: surfaceYAt(spawnX) - 44,
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

// Quarrick's second appearance: standing on the NEXT cube face while the
// player is still on this one, walking up it toward the shared corner.
//
// The next face is the vertical plane at x = worldEdgeX running down from
// the corner — that's the surface the edge transition rotates into place as
// the new ground (see scenes/playingScene.js and levelRenderer.js's
// drawWorldEdge, which draws that plane as the bright seam). Its material
// lies to the LEFT of that line, so standing on it means being to the RIGHT
// of it, out over what currently looks like empty space. Which is the point:
// he's already on the next face, and its gravity isn't ours yet.
//
// `alongFace` is how far down the face he is from the corner. After the
// world rotates -PI/2 it becomes how far along the new ground he is, so
// positioning him is the same arithmetic before and after — see
// cornerQuarrickBox() below.
//
// `spin` is a rotation about his own centre, applied by drawRescueNPC. At
// +PI/2 his feet point at the wall (world -x) instead of at our floor. He's
// drawn INSIDE the world-rotation transform, so as that runs 0 -> -PI/2 the
// two cancel and he ends the transition upright on the new ground without
// anything having to animate him. His feet are on solid ground the whole
// way through, which is the only orientation that makes sense for someone
// who was never falling in the first place.
export function createCornerQuarrick(worldEdgeX, groundY, alongFace) {
  const npc = {
    x: 0, y: 0,            // filled in by placeCornerQuarrick below
    width: 44, height: 44,
    velocityX: 0,
    velocityY: 0,
    jumpVX: 0,
    // Faces the corner, which is the direction he's walking and also where
    // the player comes down. Local +x is his front; with spin at +PI/2 that
    // points down the face, so -1 is the way up it. Once the world has
    // rotated the same -1 reads as "facing back toward the edge", so he
    // never has to turn around: he walks up to meet the player and is
    // already looking at them when they land.
    facing: -1,
    state: 'cornerWalk',
    timer: 0,
    stomped: true,         // his boss work is already done by this point
    spin: Math.PI / 2,
    alongFace
  };
  placeCornerQuarrick(npc, worldEdgeX, groundY);
  return npc;
}

// Derives the npc box from alongFace. Kept separate because both the
// constructor and every walk step need it, and because the offset is easy to
// get subtly wrong: his centre sits half his height out from the face (so
// his feet land exactly on it), and `alongFace` measures his CENTRE's
// distance from the corner, not his leading edge.
function placeCornerQuarrick(npc, worldEdgeX, groundY) {
  npc.x = worldEdgeX + npc.height / 2 - npc.width / 2;
  npc.y = groundY + npc.alongFace - npc.height / 2;
}

// Walks him up the face toward the corner until he's `stopAlong` from it.
// Returns true on the frame he arrives.
export function updateCornerQuarrick(npc, worldEdgeX, groundY, stopAlong, speed) {
  if (npc.state !== 'cornerWalk') return false;
  npc.alongFace = Math.max(stopAlong, npc.alongFace - speed);
  placeCornerQuarrick(npc, worldEdgeX, groundY);
  if (npc.alongFace <= stopAlong) {
    npc.state = 'cornerStand';
    npc.timer = 0;
    return true;
  }
  return false;
}

// Quarrick standing somewhere and talking, which is most of his
// appearances from level 2 on. `damage` is how many corners the spheres
// have taken off him (0-4) — GAME_DESIGN's deterioration beat is explicitly
// wordless ("No dialogue needed: the player reads the damage"), so this is
// the whole of that beat's delivery and it's authored per level.
export function createQuarrick(x, groundY, opts = {}) {
  return {
    x,
    y: groundY - 44,
    width: 44, height: 44,
    velocityX: 0, velocityY: 0, jumpVX: 0,
    facing: opts.facing == null ? -1 : opts.facing,
    state: opts.state || 'standing',
    timer: 0,
    stomped: true,
    damage: opts.damage || 0
  };
}

// Walk him along under a cutscene's direction. Separate from
// updateRescueNPC's state machine, which is about the boss stomp and owns
// its own sequencing.
export function walkQuarrick(npc, dir, speed) {
  npc.state = 'walking';
  npc.facing = dir;
  npc.x += dir * speed;
}

// Returns true once the NPC has run off-screen and should be discarded.
export function updateRescueNPC(npc, viewWidth, cameraX) {
  const boss = state.enemies.find(e => e.boss);
  // The surface under HIM, re-read each frame because he runs across the
  // level. `level.groundY` is only the base line now that ground can be
  // terraced, and this whole routine — run in, leap, land, walk off — is
  // written in terms of "the floor".
  const groundY = surfaceYAt(npc.x);

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
    // Steer toward the boss mid-flight instead of committing to a fixed
    // horizontal speed. A fixed one only reaches ~82px in the ~41 frames of
    // airtime, which lands the stomp only if the boss happens to charge the
    // remaining distance itself — it doesn't once it's stopped against the
    // player, and then the leap falls short. This is scripted choreography;
    // the hit is supposed to connect wherever the boss ended up.
    if (boss && boss.alive) {
      const drift = (boss.x + boss.w / 2) - (npc.x + npc.width / 2);
      npc.x += Math.max(-10, Math.min(10, drift * 0.12));
    } else {
      npc.x += npc.jumpVX;
    }
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
        spawnWeaponPickup(boss.x + boss.w / 2, groundY);
        npc.velocityY = P.STOMP_BOUNCE;
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
        spawnWeaponPickup(boss.x + boss.w / 2, groundY);
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

// `damage` is how many of his four corners are gone, and how deep. Drawn as
// one path rather than a rect plus cuts so the outline follows the damage.
function drawQuarrickBody(hw, hh, width, height, damage) {
  const cut = Math.min(4, damage) * 5.5;
  ctx.beginPath();
  if (cut <= 0.5) {
    ctx.rect(-hw, -hh, width, height);
  } else {
    ctx.moveTo(-hw + cut, -hh);
    ctx.lineTo(hw - cut, -hh);
    ctx.lineTo(hw, -hh + cut);
    ctx.lineTo(hw, hh - cut);
    ctx.lineTo(hw - cut, hh);
    ctx.lineTo(-hw + cut, hh);
    ctx.lineTo(-hw, hh - cut);
    ctx.lineTo(-hw, -hh + cut);
    ctx.closePath();
  }
  // He dulls as he goes. Still unmistakably the gold square who saved you
  // in level 1 — the colour is his identity in the dialogue bar too
  // (cutscenes/speakers.js) — just less of it each time you meet him.
  const wear = Math.min(1, damage / 4);
  ctx.fillStyle = damage ? `rgb(${242 - wear * 40}, ${193 - wear * 45}, ${78 - wear * 10})` : '#f2c14e';
  ctx.fill();
  ctx.strokeStyle = '#c99a2e';
  ctx.lineWidth = 3;
  ctx.stroke();
}

export function drawRescueNPC(npc, frameCount) {
  const hw = npc.width / 2;
  const hh = npc.height / 2;
  const legLength = 14;
  const groundY = hh;
  const hipY = groundY - legLength;
  const moving = npc.state === 'running' || npc.state === 'exit' ||
                 npc.state === 'cornerWalk' || npc.state === 'walking';
  // The corner walk is a climb up a wall, not a sprint across a floor — same
  // gait, slowed down, so it reads as deliberate rather than as the stomp
  // run played back at the wrong speed.
  const gait = npc.state === 'cornerWalk' ? 0.22 : 0.5;
  const legSwing = moving ? Math.sin(frameCount * gait) * 14 : 4;

  ctx.save();
  ctx.translate(npc.x + hw, npc.y + hh);
  // Rotation about his own centre — only the corner-walk version sets this
  // (see createCornerQuarrick). Applied after the translate so the pivot is
  // him, not the world.
  if (npc.spin) ctx.rotate(npc.spin);

  // stick legs
  drawStickLegs(hipY, npc.state === 'jumping' || npc.state === 'landing' ? hipY + 6 : groundY, legSwing);

  // body shifted up on the legs
  ctx.save();
  ctx.translate(0, -legLength);

  // The same square-minus-its-corners language everything damaged in this
  // game is drawn in — the octagons, the carved platforms, and eventually
  // the core. On Quarrick it's the deterioration beat of his arc, and it's
  // meant to be read without a line of dialogue explaining it.
  drawQuarrickBody(hw, hh, npc.width, npc.height, npc.damage || 0);

  // muscular arm
  drawMuscleArm(0, -hh * 0.1, npc.facing * (hw + 20), -hh * 0.35);

  ctx.restore();
  ctx.restore();
}
