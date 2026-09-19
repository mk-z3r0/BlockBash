// The opening cutscene: a cube planet floating in space, spheres descending
// on it, a corner blown off, then a hard cut to ground level — the player
// feels it, and walks out of their block house into the game. Plays once
// ever (see save.js's hasSeenIntro), skippable any time with a key press.
//
// Non-gameplay, so it renders nothing like the side-scroller: this is its
// own small scene with its own timed beats, the same shape as the boss
// cutscene's state machine in playingScene.js but for an entirely different
// visual (a planet in space, not a platformer level).
import { ctx, VIEW_WIDTH, VIEW_HEIGHT, drawStickLegs, drawMuscleArm } from '../engine/renderer.js';
import { spawnExplosion, spawnDust, updateParticles, drawParticles, resetParticles } from '../entities/particles.js';
import { playExplosion } from '../audio/sfx.js';
import { drawBlockHouse } from './blockHouse.js';
import { switchTo } from './sceneManager.js';
import { markIntroSeen } from '../save.js';

// Beat boundaries, in frames at 60fps — ~13s total, a deliberate slow burn.
const P1_PLANET_END = 200;   // wide shot, planet alone
const P2_DESCENT_END = 440;  // spheres arrive
const P3_IMPACT_END = 540;   // convergence + explosion
const P4_HOUSE_END = 640;    // hard cut, felt the shockwave
const P5_WALKOUT_END = 780;  // door opens, steps outside
const EXPLOSION_FRAME = 500;

const PLANET_CX = VIEW_WIDTH / 2;
const PLANET_CY = VIEW_HEIGHT * 0.44;
const HOUSE_GROUND_Y = VIEW_HEIGHT * 0.78;

let t = 0;
let stars = [];
let spheres = [];
let cornerBlownOff = false;
let shakeUntil = 0;
let walker = null; // the tiny figure that steps out of the house

function finish() {
  markIntroSeen();
  switchTo('title');
}

function makeStars() {
  const arr = [];
  for (let i = 0; i < 90; i++) {
    arr.push({
      x: Math.random() * VIEW_WIDTH,
      y: Math.random() * VIEW_HEIGHT * 0.75,
      size: 0.6 + Math.random() * 1.6,
      twinkle: Math.random() * Math.PI * 2
    });
  }
  return arr;
}

// A handful converge on the corner that's about to blow off; the rest just
// drift past the planet — "many spheres descend," not all aimed at once.
function makeSpheres() {
  const cornerX = PLANET_CX + Math.cos(-Math.PI / 4) * 90;
  const cornerY = PLANET_CY + Math.sin(-Math.PI / 4) * 90;
  const arr = [];
  for (let i = 0; i < 11; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = VIEW_WIDTH * 0.75;
    const startX = PLANET_CX + Math.cos(angle) * dist;
    const startY = PLANET_CY * 0.6 + Math.sin(angle) * dist * 0.5 - 40;
    const targeted = i < 4;
    arr.push({
      startX, startY,
      x: startX, y: startY,
      targetX: targeted ? cornerX : PLANET_CX + (Math.random() - 0.5) * 130,
      targetY: targeted ? cornerY : PLANET_CY + (Math.random() - 0.5) * 130,
      size: targeted ? 7 : 4 + Math.random() * 3
    });
  }
  return arr;
}

function drawStarfield() {
  ctx.fillStyle = '#05070f';
  ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  for (const s of stars) {
    const twinkle = 0.5 + Math.sin(t * 0.04 + s.twinkle) * 0.5;
    ctx.globalAlpha = 0.3 + twinkle * 0.5;
    ctx.fillStyle = '#e8ecf7';
    ctx.fillRect(s.x, s.y, s.size, s.size);
  }
  ctx.globalAlpha = 1;
}

// The planet: a square, on purpose — "a cube-shaped planet" per the design
// doc, and it means the corner it loses is drawn with the exact same 45°
// chamfer the game's damage language uses everywhere else (see
// IMPLEMENTATION_PLAN.md's chamfer decision). First thing the player ever
// sees is the shape that later means "sphere damage."
function drawPlanet(size) {
  const half = size / 2;
  const cut = cornerBlownOff ? size * 0.22 : 0;

  ctx.save();
  const grad = ctx.createRadialGradient(
    PLANET_CX - half * 0.3, PLANET_CY - half * 0.3, size * 0.1,
    PLANET_CX, PLANET_CY, size * 0.9
  );
  grad.addColorStop(0, '#f2c14e');
  grad.addColorStop(1, '#8a6a2e');
  ctx.fillStyle = grad;

  ctx.beginPath();
  ctx.moveTo(PLANET_CX - half, PLANET_CY - half + cut);
  ctx.lineTo(PLANET_CX - half + cut, PLANET_CY - half);
  ctx.lineTo(PLANET_CX + half, PLANET_CY - half);
  ctx.lineTo(PLANET_CX + half, PLANET_CY + half);
  ctx.lineTo(PLANET_CX - half, PLANET_CY + half);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#c99a2e';
  ctx.lineWidth = 3;
  ctx.stroke();

  if (cornerBlownOff) {
    // a jagged crack line near the break, distinguishing "just exploded"
    // from a clean intentional cut
    ctx.strokeStyle = '#5b3f1a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(PLANET_CX - half + cut * 0.6, PLANET_CY - half + cut * 1.4);
    ctx.lineTo(PLANET_CX - half + cut * 1.3, PLANET_CY - half + cut * 0.7);
    ctx.lineTo(PLANET_CX - half + cut * 0.9, PLANET_CY - half + cut * 0.3);
    ctx.stroke();
  }
  ctx.restore();
}

function drawSpheres(progress) {
  for (const s of spheres) {
    const x = s.startX + (s.targetX - s.startX) * progress;
    const y = s.startY + (s.targetY - s.startY) * progress;
    s.x = x; s.y = y;
    const grad = ctx.createRadialGradient(x - s.size * 0.3, y - s.size * 0.3, 1, x, y, s.size);
    grad.addColorStop(0, '#ff9fc4');
    grad.addColorStop(1, '#a12d5c');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, s.size, 0, Math.PI * 2);
    ctx.fill();
  }
}

// A tiny stand-in figure — same limb art the player/enemies/NPC share, but
// this is its own lightweight object, not the real gameplay player. The
// cutscene shouldn't depend on entities/player.js's gameplay-only state.
function drawWalker(x, groundY, frame, facing) {
  const legLength = 9;
  const w = 22, h = 22;
  const moving = true;
  const legSwing = moving ? Math.sin(frame * 0.5) * 14 : 4;

  ctx.save();
  ctx.translate(x, groundY - h / 2);
  drawStickLegs(h / 2 - legLength, h / 2, legSwing);
  ctx.save();
  ctx.translate(0, -legLength);
  ctx.fillStyle = '#f2c14e';
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.strokeStyle = '#c99a2e';
  ctx.lineWidth = 2;
  ctx.strokeRect(-w / 2, -h / 2, w, h);
  drawMuscleArm(0, -h * 0.1 * 0.1, facing * (w / 2 + 14), -h * 0.35 * 0.1);
  ctx.restore();
  ctx.restore();
}

export const introScene = {
  enter() {
    t = 0;
    stars = makeStars();
    spheres = makeSpheres();
    cornerBlownOff = false;
    shakeUntil = 0;
    walker = null;
    resetParticles();
  },

  update() {
    t++;

    if (t === EXPLOSION_FRAME) {
      const cornerX = PLANET_CX + Math.cos(-Math.PI / 4) * 90;
      const cornerY = PLANET_CY + Math.sin(-Math.PI / 4) * 90;
      spawnExplosion(cornerX, cornerY, '#ffdf7a');
      spawnExplosion(cornerX, cornerY, '#f2c14e');
      cornerBlownOff = true;
      playExplosion();
    }

    if (t === P3_IMPACT_END) {
      shakeUntil = t + 26; // the shockwave reaching the house
    }
    if (shakeUntil > t && shakeUntil - 8 <= t) {
      spawnDust(VIEW_WIDTH / 2 + (Math.random() - 0.5) * 140, HOUSE_GROUND_Y - 90, 1,
        { spread: 1.5, size: 6, life: 30, color: 'rgba(200, 180, 150, 0.8)' });
    }

    if (t === P4_HOUSE_END) {
      walker = { offset: 0 }; // distance from the doorway, not an absolute x
    }
    if (walker && t > P4_HOUSE_END) {
      const progress = (t - P4_HOUSE_END) / (P5_WALKOUT_END - P4_HOUSE_END);
      walker.offset = progress * 90;
    }

    updateParticles();

    if (t >= P5_WALKOUT_END) finish();
  },

  draw() {
    if (t < P3_IMPACT_END) {
      // --- space: planet, stars, descending spheres ---
      drawStarfield();

      const growth = Math.min(1, t / P2_DESCENT_END);
      const size = 130 + growth * 40;
      drawPlanet(size);

      if (t > 30) {
        const descentProgress = Math.min(1, Math.max(0, (t - P1_PLANET_END) / (P3_IMPACT_END - P1_PLANET_END)));
        drawSpheres(descentProgress);
      }
      drawParticles();

      if (t < 40) {
        ctx.fillStyle = `rgba(5, 7, 15, ${1 - t / 40})`;
        ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
      }
    } else {
      // --- ground: the house, hard-cut from space, no crossfade ---
      ctx.save();
      if (shakeUntil > t) {
        const mag = ((shakeUntil - t) / 26) * 5;
        ctx.translate((Math.random() - 0.5) * mag, (Math.random() - 0.5) * mag);
      }

      const skyGrad = ctx.createLinearGradient(0, 0, 0, VIEW_HEIGHT);
      skyGrad.addColorStop(0, '#0a0d1c');
      skyGrad.addColorStop(1, '#151b33');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
      for (const s of stars.slice(0, 20)) {
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = '#e8ecf7';
        ctx.fillRect(s.x, s.y * 0.5, s.size, s.size);
      }
      ctx.globalAlpha = 1;

      ctx.fillStyle = '#1c2547';
      ctx.fillRect(0, HOUSE_GROUND_Y, VIEW_WIDTH, VIEW_HEIGHT - HOUSE_GROUND_Y);

      const doorOpen = t >= P4_HOUSE_END;
      const { doorX } = drawBlockHouse(VIEW_WIDTH / 2, HOUSE_GROUND_Y, 2.1, { doorOpen });

      drawParticles();

      if (walker) {
        drawWalker(doorX + walker.offset, HOUSE_GROUND_Y, t, 1);
      }

      ctx.restore();
    }

    if (t > 20) {
      ctx.textAlign = 'right';
      ctx.fillStyle = 'rgba(122, 132, 168, 0.7)';
      ctx.font = '11px Trebuchet MS, Arial, sans-serif';
      ctx.fillText('press any key to skip', VIEW_WIDTH - 14, VIEW_HEIGHT - 12);
    }
  },

  handleKeyDown(e, alreadyDown) {
    if (!alreadyDown) finish(); // ignore held-key repeat events, only a fresh press skips
  }
};
