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
import { spawnExplosion, spawnDust, updateParticles, drawParticles, resetParticles } from '../entities/particles.js';
import { playExplosion, playSpaceAmbient, playApproach, playRumble, playSurprise, playDoorOpen } from '../audio/sfx.js';
import { drawBlockHouse } from './blockHouse.js';
import { switchTo } from './sceneManager.js';
import { markIntroSeen } from '../save.js';

// ============================================
// Beat boundaries, in frames at 60fps — a deliberate slow burn, ~17s total.
// ============================================
const P1_PLANET_END = 260;    // wide shot, planet alone, slow pan begins
const EXPLOSION_FRAME = 640;  // spheres have converged; the corner blows off
const P3_IMPACT_END = 680;    // hard cut to the house — no crossfade
const SHAKE_DURATION = 70;    // the shockwave reaching the house — visible
const BUBBLE_START = P3_IMPACT_END + SHAKE_DURATION + 20; // a beat to settle first
const BUBBLE_DURATION = 80;
const DOOR_OPEN_AT = BUBBLE_START + BUBBLE_DURATION;
const WALK_DURATION = 160;
const P5_END = DOOR_OPEN_AT + WALK_DURATION;

const PLANET_CX = VIEW_WIDTH / 2;
const PLANET_CY = VIEW_HEIGHT * 0.44;
const HOUSE_GROUND_Y = VIEW_HEIGHT * 0.78;

// ============================================
// Minimal 3D: rotate a unit cube, weak-perspective project it. Just enough
// linear algebra for this one scene — not a general math module, since
// nothing else needs 3D yet.
// ============================================
const CAM_DIST = 480;
// ~30 degrees above the horizon, top-down. Positive, not negative: canvas Y
// grows downward, so the face this makes front-facing (y=-1) is the one
// that projects toward the TOP of the screen — the near/prominent surface
// needs to be the one rendering up top, or it reads as looking up from
// below instead of down from above. Confirmed by deriving where each pole's
// face normal actually lands post-transform, not just by eye.
const CAM_TILT = 0.52;
const ROT_SPEED = 0.0004; // slow — a pan, not a spin (was 0.0021, an 81% cut)
// Chosen so the exploding corner ends up well-framed (centered, and its
// face pointing most directly at the camera) right at EXPLOSION_FRAME,
// given the current ROT_SPEED — solved with tools/corner-angle-probe.html
// rather than eyeballed. It also happens to frame the opening shot well;
// if either ROT_SPEED or EXPLOSION_FRAME changes, re-run that probe.
const PLANET_BASE_ANGLE = 2.1;

function normalize3(x, y, z) {
  const l = Math.hypot(x, y, z) || 1;
  return { x: x / l, y: y / l, z: z / l };
}
const LIGHT = normalize3(-0.45, -0.6, 0.65);

// The corner that blows off. On the y=-1 pole deliberately: with CAM_TILT
// positive, that's the pole facing the camera (see CAM_TILT's comment) — a
// corner on the far pole would only ever be visible edge-on. Re-run
// tools/corner-angle-probe.html against this if CAM_TILT, ROT_SPEED, or
// EXPLOSION_FRAME change; the best framing angle depends on all three.
const EXPLODED_CORNER = { x: 1, y: -1, z: 1 };

function rotateY(p, a) {
  const c = Math.cos(a), s = Math.sin(a);
  return { x: p.x * c + p.z * s, y: p.y, z: -p.x * s + p.z * c };
}
function rotateX(p, a) {
  const c = Math.cos(a), s = Math.sin(a);
  return { x: p.x, y: p.y * c - p.z * s, z: p.y * s + p.z * c };
}
function dot3(a, b) { return a.x * b.x + a.y * b.y + a.z * b.z; }
function lerp3(a, b, t) {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t };
}
// projects a point already in camera space (post-rotation) to screen coords
function project(p) {
  const f = CAM_DIST / (CAM_DIST + p.z);
  return { x: PLANET_CX + p.x * f, y: PLANET_CY + p.y * f, scale: f };
}
// applies the scene's current camera transform (pan + fixed tilt + zoom) to
// a point in the cube's local unit space
function toCameraSpace(p, angleY, scale) {
  const scaled = { x: p.x * scale, y: p.y * scale, z: p.z * scale };
  return rotateX(rotateY(scaled, angleY), CAM_TILT);
}

// One unit-cube face: 4 corners (consistent winding) + outward normal.
function makeFace(axis, sign) {
  const other = { x: ['y', 'z'], y: ['x', 'z'], z: ['x', 'y'] }[axis];
  const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  const verts = corners.map(([a, b]) => {
    const p = { x: 0, y: 0, z: 0 };
    p[axis] = sign;
    p[other[0]] = a * sign; // flips winding per sign so all faces point outward
    p[other[1]] = b;
    return p;
  });
  const normal = { x: 0, y: 0, z: 0 };
  normal[axis] = sign;
  return { verts, normal, craters: makeCraters(), damaged: false };
}
function makeCraters() {
  // Many small, fine specks rather than a few big holes — the original
  // read as cheese, not a rocky/worn surface.
  const n = 34 + Math.floor(Math.random() * 16);
  const spots = [];
  for (let i = 0; i < n; i++) {
    spots.push({ u: 0.06 + Math.random() * 0.88, v: 0.06 + Math.random() * 0.88, r: 0.01 + Math.random() * 0.016 });
  }
  return spots;
}

const BASE_FACES = [
  makeFace('x', 1), makeFace('x', -1),
  makeFace('y', 1), makeFace('y', -1),
  makeFace('z', 1), makeFace('z', -1)
];

// The corner that blows off — see EXPLODED_CORNER above for which one and
// why. Truncating it replaces that vertex with 3 new points along its 3
// edges, on the faces that share it, turning those quads into pentagons,
// and adds one new triangular "raw" face where the corner used to be.
//
// The replacement order matters: each new point has to be spliced in next
// to whichever original neighbor it's actually adjacent to, or the new
// 5-gon's edges cross themselves — a bowtie, which is exactly what shipped
// as "artifacting" the first time this was built, from hand-picking the
// order per axis and getting 2 of 3 wrong. Deriving the order directly from
// each face's actual prev/next vertex around the loop, as this does, can't
// make that mistake — the order isn't a guess, it's read off the geometry.
const CHAMFER_FRAC = 0.4;
function buildChamferedFaces(corner) {
  const edgeNeighbors = [
    { x: -corner.x, y: corner.y, z: corner.z },
    { x: corner.x, y: -corner.y, z: corner.z },
    { x: corner.x, y: corner.y, z: -corner.z }
  ];
  const cutVerts = edgeNeighbors.map(n => lerp3(corner, n, CHAMFER_FRAC));
  const sameVert = (a, b) => a.x === b.x && a.y === b.y && a.z === b.z;
  const cutPointFor = neighbor => cutVerts[edgeNeighbors.findIndex(n => sameVert(n, neighbor))];

  const faces = BASE_FACES.map(f => ({ ...f, verts: f.verts.slice() }));
  for (const f of faces) {
    const idx = f.verts.findIndex(v => sameVert(v, corner));
    if (idx === -1) continue;
    const n = f.verts.length;
    const prev = f.verts[(idx - 1 + n) % n];
    const next = f.verts[(idx + 1) % n];
    f.verts.splice(idx, 1, cutPointFor(prev), cutPointFor(next));
    // craters never render on a 5-gon (see the f.verts.length===4 guard in
    // drawPlanet), so there's nothing to clear here
  }

  faces.push({
    verts: cutVerts,
    normal: normalize3(corner.x, corner.y, corner.z),
    craters: [],
    damaged: true
  });
  return faces;
}
const CHAMFERED_FACES = buildChamferedFaces(EXPLODED_CORNER);

function bilerp(corners, u, v) {
  const top = lerp3(corners[0], corners[1], u);
  const bot = lerp3(corners[3], corners[2], u);
  return lerp3(top, bot, v);
}

let t = 0;
let stars = [];
let spheres = [];
let cornerBlownOff = false;
let shakeUntil = 0;
let bubbleActive = false;
let walker = null;

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

function mixGold(intensity) {
  const lo = [138, 106, 46], hi = [255, 224, 150];
  const c = lo.map((v, i) => Math.round(v + (hi[i] - v) * intensity));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

// Draws the rotating cube: transforms + backface-culls + depth-sorts every
// face, fills each with lighting-based shading, then a light crater texture
// so it doesn't read as flat color. First thing the player ever sees is the
// same 45-degree corner cut the game's damage language uses everywhere
// else, once the explosion lands.
function drawPlanet(angleY, scale) {
  const faces = cornerBlownOff ? CHAMFERED_FACES : BASE_FACES;

  const camFaces = faces.map(f => {
    const camVerts = f.verts.map(v => toCameraSpace(v, angleY, scale));
    const camNormal = rotateX(rotateY(f.normal, angleY), CAM_TILT);
    const avgZ = camVerts.reduce((s, p) => s + p.z, 0) / camVerts.length;
    return { ...f, camVerts, camNormal, avgZ };
  }).filter(f => f.camNormal.z < -0.05); // visible faces point back toward the camera

  camFaces.sort((a, b) => b.avgZ - a.avgZ); // paint far-to-near

  for (const f of camFaces) {
    const proj = f.camVerts.map(project);
    const intensity = Math.max(0.12, dot3(f.camNormal, LIGHT));
    ctx.fillStyle = f.damaged ? '#3a2a14' : mixGold(intensity);
    ctx.beginPath();
    proj.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = f.damaged ? '#1c1408' : '#5b3f1a';
    ctx.lineWidth = f.damaged ? 1 : 1.5;
    ctx.stroke();

    if (!f.damaged && f.verts.length === 4) {
      const avgScale = proj.reduce((s, p) => s + p.scale, 0) / proj.length;
      for (const c of f.craters) {
        const local = bilerp(f.verts, c.u, c.v);
        const camP = toCameraSpace(local, angleY, scale);
        const p = project(camP);
        ctx.fillStyle = `rgba(90, 65, 20, ${0.4 + intensity * 0.2})`;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, c.r * scale * avgScale, c.r * scale * avgScale * 0.65, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
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
    const r = s.size * shrink;
    if (r < 0.6) continue; // landed — nothing left to draw

    const grad = ctx.createRadialGradient(p.x - r * 0.3, p.y - r * 0.3, 1, p.x, p.y, r);
    grad.addColorStop(0, '#ff9fc4');
    grad.addColorStop(1, '#a12d5c');
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
    shakeUntil = 0;
    bubbleActive = false;
    walker = null;
    resetParticles();
    playSpaceAmbient();
  },

  update() {
    t++;

    if (t === P1_PLANET_END) playApproach();

    if (t === EXPLOSION_FRAME) {
      const angleY = PLANET_BASE_ANGLE + t * ROT_SPEED;
      const scale = 90 + Math.min(1, t / EXPLOSION_FRAME) * 20;
      const cam = toCameraSpace(EXPLODED_CORNER, angleY, scale);
      const p = project(cam);
      spawnExplosion(p.x, p.y, '#ffdf7a');
      spawnExplosion(p.x, p.y, '#f2c14e');
      cornerBlownOff = true;
      playExplosion();
    }

    if (t === P3_IMPACT_END) {
      shakeUntil = t + SHAKE_DURATION;
      playRumble();
    }
    if (shakeUntil > t && (shakeUntil - t) % 6 === 0) {
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
      drawStarfield();

      const angleY = PLANET_BASE_ANGLE + t * ROT_SPEED;
      const scale = 90 + Math.min(1, t / EXPLOSION_FRAME) * 20;
      drawPlanet(angleY, scale);

      if (t > 30) {
        const descentProgress = Math.min(1, Math.max(0, (t - P1_PLANET_END) / (EXPLOSION_FRAME - P1_PLANET_END)));
        drawSpheres(angleY, scale, descentProgress);
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
