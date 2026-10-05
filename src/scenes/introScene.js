// The opening cutscene: a cube planet floating in space, spheres descending
// on it, a corner blown off, then a hard cut to ground level — the player
// feels it, reacts, and walks out of their block house into the game. Plays
// once ever (see save.js's hasSeenIntro), skippable any time with a key
// press.
//
// Non-gameplay, so it renders nothing like the side-scroller: this is its
// own small scene with its own timed beats, the same shape as the boss
// cutscene's state machine in playingScene.js but for an entirely different
// visual (a planet in space, not a platformer level).
//
// The planet is real, if minimal, 3D: a rotating cube built from actual
// vertices/faces/normals, projected with a simple weak-perspective camera
// (see project() below) — not a flat square with a fake pan. That's what
// makes "slow pan around the planet" and spheres correctly shrinking with
// distance as they approach possible at all; faking either in pure 2D was
// what the first version did and it read as flat.
import { ctx, VIEW_WIDTH, VIEW_HEIGHT, drawStickLegs, drawMuscleArm } from '../engine/renderer.js';
import { spawnExplosion, spawnDust, spawnDebris, updateParticles, drawParticles, resetParticles } from '../entities/particles.js';
import { playExplosion, playSpaceAmbient, playApproach, playRumble, playSurprise, playDoorOpen } from '../audio/sfx.js';
import { drawBlockHouse } from './blockHouse.js';
import {
  BASE_FACES, EXPLODED_CORNER, CHAMFER_FRAC, buildChamferedFaces, drawPlanet as drawPlanetShared,
  toCameraSpace, project as projectP, bilerp, normalize3, lerp3, dot3, rotateX, rotateY, LIGHT, mixGold, CAM_DIST
} from './planet.js';
import { switchTo } from './sceneManager.js';
import { markIntroSeen } from '../save.js';

// ============================================
// Beat boundaries, in frames at 60fps — a short shape-driven story, ~10s total.
// ============================================
const P1_PLANET_END = 120;    // two seconds of peace before the invasion
const EXPLOSION_FRAME = 360;  // spheres have converged; the corner blows off
const P3_IMPACT_END = 405;    // hard cut to the house — no crossfade
const SHAKE_DURATION = 40;    // the shockwave reaching the house — visible
const BUBBLE_START = P3_IMPACT_END + SHAKE_DURATION + 20; // a beat to settle first
const BUBBLE_DURATION = 55;
const DOOR_OPEN_AT = BUBBLE_START + BUBBLE_DURATION;
const WALK_DURATION = 100;
const P5_END = DOOR_OPEN_AT + WALK_DURATION;

const PLANET_CX = VIEW_WIDTH / 2;
const PLANET_CY = VIEW_HEIGHT * 0.44;
const HOUSE_GROUND_Y = VIEW_HEIGHT * 0.78;

// ============================================
// Minimal 3D: rotate a unit cube, weak-perspective project it. Just enough
// linear algebra for this one scene — not a general math module, since
// nothing else needs 3D yet.
// ============================================
const ROT_SPEED = 0.0004; // slow — a pan, not a spin (was 0.0021, an 81% cut)
const PLANET_BASE_ANGLE = 2.1;

// Everything about the cube itself — projection, faces, the chamfer, the
// crater texture — lives in planet.js now, shared with the ending, which
// draws the same planet and puts the corner back.
const CHAMFERED_FACES = buildChamferedFaces(EXPLODED_CORNER, CHAMFER_FRAC);
const GRIND_START = EXPLOSION_FRAME - 100;
const GRIND_STEPS = 32;
const grindingFaces = Array.from({ length: GRIND_STEPS }, (_, i) =>
  buildChamferedFaces(EXPLODED_CORNER, CHAMFER_FRAC * (i + 1) / GRIND_STEPS));
function project(p) { return projectP(p, PLANET_CX, PLANET_CY); }

let t = 0;
let stars = [];
let spheres = [];
let cornerBlownOff = false;
let blast = null;   // { x, y, t } while the corner is coming apart on screen
let shakeUntil = 0;
let bubbleActive = false;
let walker = null;

function finish() {
  markIntroSeen();
  // straight into a run — the title screen already sent the player here
  // specifically to start one; going back to title would undo that
  switchTo('playing');
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

// A handful converge on the corner that's about to blow off (in the cube's
// LOCAL unit space, so they rotate consistently with the planet); the rest
// drift toward random points on random faces — "many spheres descend," not
// all aimed at once. Their screen position comes from the same 3D pipeline
// as the planet (so the path correctly tracks the rotating cube), but their
// SIZE is deliberately NOT derived from perspective — see drawSpheres().
// They should read as landing and disappearing into the surface, not as
// approaching the camera and growing.
function makeSpheres() {
  const arr = [];
  for (let i = 0; i < 11; i++) {
    const targeted = i < 4;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    // in cube-radii, pre-scale. Capped so even at max cube zoom (scale~110)
    // the scaled magnitude stays well under CAM_DIST (480) — otherwise a
    // point with z crossing -CAM_DIST sends the perspective divide negative
    // and flings the sphere to a huge mirrored position instead of just
    // being safely offscreen.
    const dist = 2.0 + Math.random() * 1.1;
    const start = {
      x: dist * Math.sin(phi) * Math.cos(theta),
      y: dist * Math.sin(phi) * Math.sin(theta),
      z: dist * Math.cos(phi)
    };
    let targetLocal, targetNormal;
    if (targeted) {
      targetLocal = { ...EXPLODED_CORNER };
      targetNormal = normalize3(1, 1, 1);
    } else {
      const face = BASE_FACES[Math.floor(Math.random() * 6)];
      targetLocal = bilerp(face.verts, 0.2 + Math.random() * 0.6, 0.2 + Math.random() * 0.6);
      targetNormal = face.normal;
    }
    const target = {
      x: targetLocal.x + targetNormal.x * 0.14,
      y: targetLocal.y + targetNormal.y * 0.14,
      z: targetLocal.z + targetNormal.z * 0.14
    };
    arr.push({ start, target, size: targeted ? 15 : 10 });
  }
  return arr;
}

function drawStarfield() {
  const nebula = ctx.createRadialGradient(PLANET_CX, PLANET_CY, 30, PLANET_CX, PLANET_CY, 460);
  nebula.addColorStop(0, t < P1_PLANET_END ? '#253651' : '#40203c');
  nebula.addColorStop(1, '#040711');
  ctx.fillStyle = nebula;
  ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  for (const s of stars) {
    const twinkle = 0.5 + Math.sin(t * 0.04 + s.twinkle) * 0.5;
    ctx.globalAlpha = 0.3 + twinkle * 0.5;
    ctx.fillStyle = '#e8ecf7';
    ctx.fillRect(s.x, s.y, s.size, s.size);
  }
  ctx.globalAlpha = 1;
}


// Draws the rotating cube: transforms + backface-culls + depth-sorts every
// face, fills each with lighting-based shading, then a light crater texture
// so it doesn't read as flat color. First thing the player ever sees is the
// same 45-degree corner cut the game's damage language uses everywhere
// else, once the explosion lands.
function drawPlanet(angleY, scale) {
  const step = Math.min(GRIND_STEPS - 1, Math.floor((t - GRIND_START) / (EXPLOSION_FRAME - GRIND_START) * GRIND_STEPS));
  const faces = cornerBlownOff ? CHAMFERED_FACES : t >= GRIND_START ? grindingFaces[step] : BASE_FACES;
  drawPlanetShared(faces, angleY, scale, PLANET_CX, PLANET_CY);
}

function drawSpheres(angleY, scale, progress) {
  for (const s of spheres) {
    const local = lerp3(s.start, s.target, progress);
    const cam = toCameraSpace(local, angleY, scale);
    const p = project(cam);

    // Size is explicitly a function of landing progress, NOT perspective —
    // they read as landing and disappearing into the surface, not as
    // approaching the camera and growing. Eased so most of the shrink
    // happens late, like slowing into a landing rather than shrinking at a
    // constant rate.
    const shrink = Math.pow(Math.max(0, 1 - progress), 0.6);
    const r = cornerBlownOff ? s.size * shrink : s.size * Math.max(0.3, shrink);
    if (r < 0.6) continue; // landed — nothing left to draw

    const grad = ctx.createRadialGradient(p.x - r * 0.3, p.y - r * 0.3, 1, p.x, p.y, r);
    grad.addColorStop(0, '#ff9fc4');
    grad.addColorStop(1, '#a12d5c');
    // Trails show intent: the round invaders converge on the square world.
    const tail = project(toCameraSpace(lerp3(s.start, s.target, Math.max(0, progress - 0.12)), angleY, scale));
    ctx.strokeStyle = 'rgba(255, 77, 141, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(tail.x, tail.y); ctx.lineTo(p.x, p.y); ctx.stroke();
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

// A tiny stand-in figure — same limb art the player/enemies/NPC share, but
// this is its own lightweight object, not the real gameplay player. The
// cutscene shouldn't depend on entities/player.js's gameplay-only state.
function drawWalker(x, groundY, frame, facing, moving) {
  const legLength = 9;
  const w = 22, h = 22;
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
  drawMuscleArm(0, -h * 0.01, facing * (w / 2 + 14), -h * 0.035);
  ctx.restore();
  ctx.restore();
}

function drawExclamation(x, y, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#fffbe0';
  ctx.beginPath();
  ctx.arc(x, y, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ff4d8d';
  ctx.font = 'bold 18px Trebuchet MS, Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('!', x, y + 6);
  ctx.restore();
}

export const introScene = {
  enter() {
    t = 0;
    stars = makeStars();
    spheres = makeSpheres();
    cornerBlownOff = false;
    blast = null;
    shakeUntil = 0;
    bubbleActive = false;
    walker = null;
    resetParticles();
    playSpaceAmbient();
  },

  update() {
    t++;

    if (t === P1_PLANET_END) playApproach();

    if (t >= GRIND_START && t < EXPLOSION_FRAME && t % 3 === 0) {
      const p = project(toCameraSpace(EXPLODED_CORNER, PLANET_BASE_ANGLE + t * ROT_SPEED, 90 + t / EXPLOSION_FRAME * 20));
      spawnDebris(p.x, p.y, 2, '#ffdf7a', { speed: 2.8, life: 25 });
    }
    if (t === GRIND_START) playRumble();
    if (t === EXPLOSION_FRAME) {
      const angleY = PLANET_BASE_ANGLE + t * ROT_SPEED;
      const scale = 90 + Math.min(1, t / EXPLOSION_FRAME) * 20;
      const cam = toCameraSpace(EXPLODED_CORNER, angleY, scale);
      const p = project(cam);
      // Three bursts, a cone of planet thrown outward along the corner's own
      // direction, and the screen whites out for a few frames. The old
      // version was two sparkle rings over a shape change, which read as
      // the planet quietly being replaced.
      spawnExplosion(p.x, p.y, '#ffffff');
      spawnExplosion(p.x, p.y, '#ffdf7a');
      spawnExplosion(p.x, p.y, '#f2c14e');
      const outward = Math.atan2(cam.y, cam.x);
      spawnDebris(p.x, p.y, 34, '#c99a2e', { aim: outward, spread: Math.PI * 0.9, speed: 5.5, life: 95 });
      spawnDebris(p.x, p.y, 18, '#5b3f1a', { aim: outward, spread: Math.PI * 1.3, speed: 3.5, life: 80 });
      spawnDebris(p.x, p.y, 14, '#ffdf7a', { speed: 7, life: 40 });
      blast = { x: p.x, y: p.y, t: 0 };
      shakeUntil = t + 26;
      cornerBlownOff = true;
      playExplosion();
    }
    if (blast) {
      blast.t++;
      // two aftershocks as the chunk keeps coming apart
      if (blast.t === 9 || blast.t === 19) {
        spawnExplosion(blast.x + (Math.random() - 0.5) * 30, blast.y + (Math.random() - 0.5) * 30, '#ffdf7a');
        spawnDebris(blast.x, blast.y, 8, '#c99a2e', { speed: 4, life: 60 });
      }
      if (blast.t > 50) blast = null;
    }

    if (t === P3_IMPACT_END) {
      shakeUntil = t + SHAKE_DURATION;
      playRumble();
    }
    // House dust only once the shock has reached the house; the planet
    // beat has its own shake and the house isn't on screen for it.
    if (t >= P3_IMPACT_END && shakeUntil > t && (shakeUntil - t) % 6 === 0) {
      spawnDust(VIEW_WIDTH / 2 + (Math.random() - 0.5) * 150, HOUSE_GROUND_Y - 90, 2,
        { spread: 1.8, size: 7, life: 34, color: 'rgba(200, 180, 150, 0.85)' });
    }

    if (t === BUBBLE_START) {
      bubbleActive = true;
      playSurprise();
    }
    if (t === DOOR_OPEN_AT) {
      bubbleActive = false;
      walker = { offset: 0 };
      playDoorOpen();
    }
    if (walker && t > DOOR_OPEN_AT) {
      const progress = Math.min(1, (t - DOOR_OPEN_AT) / WALK_DURATION);
      walker.offset = progress * 90;
    }

    updateParticles();

    if (t >= P5_END) finish();
  },

  draw() {
    if (t < P3_IMPACT_END) {
      // --- space: rotating planet, stars, descending spheres ---
      // The whole space view jolts while the corner is coming apart. The
      // only shake this scene had was at the house, where the shock
      // arrives; the explosion itself was perfectly still.
      ctx.save();
      if (blast) {
        const mag = 9 * (1 - blast.t / 50);
        ctx.translate((Math.random() - 0.5) * mag, (Math.random() - 0.5) * mag);
      }
      drawStarfield();

      const angleY = PLANET_BASE_ANGLE + t * ROT_SPEED;
      const scale = 90 + Math.min(1, t / EXPLOSION_FRAME) * 20;
      drawPlanet(angleY, scale);
      if (blast) {
        // an expanding ring, and a flash that falls off fast
        const k = blast.t / 50;
        ctx.save();
        ctx.strokeStyle = `rgba(255, 235, 170, ${0.9 * (1 - k)})`;
        ctx.lineWidth = 6 * (1 - k) + 1;
        ctx.beginPath();
        ctx.arc(blast.x, blast.y, 10 + k * 260, 0, Math.PI * 2);
        ctx.stroke();
        if (blast.t < 10) {
          ctx.fillStyle = `rgba(255, 250, 230, ${0.85 * (1 - blast.t / 10)})`;
          ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
        }
        ctx.restore();
      }

      if (t >= P1_PLANET_END) {
        const descentProgress = Math.min(1, Math.max(0, (t - P1_PLANET_END) / (EXPLOSION_FRAME - P1_PLANET_END)));
        drawSpheres(angleY, scale, Math.min(1, descentProgress * 1.4));
      }
      drawParticles();

      if (t < 40) {
        ctx.fillStyle = `rgba(5, 7, 15, ${1 - t / 40})`;
        ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
      }
      ctx.restore();
    } else {
      // --- ground: the house, hard-cut from space, no crossfade ---
      ctx.save();
      if (shakeUntil > t) {
        const decay = (shakeUntil - t) / SHAKE_DURATION;
        const mag = decay * 12; // a clearly visible shake, not a subtle jitter
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

      const doorOpen = t >= DOOR_OPEN_AT;
      const { doorX } = drawBlockHouse(VIEW_WIDTH / 2, HOUSE_GROUND_Y, 2.1, { doorOpen });

      drawParticles();

      if (t >= BUBBLE_START && t < DOOR_OPEN_AT) {
        const fadeIn = Math.min(1, (t - BUBBLE_START) / 15);
        const fadeOut = Math.min(1, (DOOR_OPEN_AT - t) / 15);
        drawExclamation(doorX, HOUSE_GROUND_Y - 70, Math.min(fadeIn, fadeOut));
      }

      if (walker) {
        drawWalker(doorX + walker.offset, HOUSE_GROUND_Y, t, 1, true);
      } else if (t >= P3_IMPACT_END + 6) {
        // standing just inside the doorway, reacting, before stepping out
        drawWalker(doorX, HOUSE_GROUND_Y, t, 1, false);
      }

      ctx.restore();
    }

    // Letterboxing and short captions frame the shape conflict, then hand off.
    ctx.fillStyle = '#040711';
    ctx.fillRect(0, 0, VIEW_WIDTH, 24);
    ctx.fillRect(0, VIEW_HEIGHT - 60, VIEW_WIDTH, 60);
    const caption = t < P1_PLANET_END ? 'A world with corners.' :
      t < GRIND_START ? 'They came to make it smooth.' :
      t < P3_IMPACT_END ? 'One corner at a time.' :
      t < DOOR_OPEN_AT ? 'That was your world.' : 'Time to push back.';
    ctx.textAlign = 'center';
    ctx.fillStyle = t < GRIND_START ? '#fff0b2' : '#ffd1e0';
    ctx.font = 'bold 18px Trebuchet MS, Arial, sans-serif';
    ctx.fillText(caption, VIEW_WIDTH / 2, VIEW_HEIGHT - 34);
    if (t > 20) {
      ctx.textAlign = 'right';
      ctx.fillStyle = 'rgba(122, 132, 168, 0.7)';
      ctx.font = '11px Trebuchet MS, Arial, sans-serif';
      ctx.fillText('click for sound · press any key to skip', VIEW_WIDTH - 14, VIEW_HEIGHT - 12);
    }
  },

  handleKeyDown(e, alreadyDown) {
    if (!alreadyDown) finish(); // ignore held-key repeat events, only a fresh press skips
  }
};
