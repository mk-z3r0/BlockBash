// The ending. Not a card — the thing the game was about, shown happening.
//
// GAME_DESIGN: "The ending is a restoration, not a kill. That's the whole
// thesis of the game stated once, at full volume." The last cutscene says
// it in words — "Eight corners. Twelve edges. Six flat faces." — and then,
// until this, the game cut to a score. This is the full volume.
//
// Four movements, continuous, about twenty seconds, skippable:
//
//   RISE      the two of them on a lifted block, going up through the
//             crust. Strata scroll past in parallax; the core's light is
//             under them. Quarrick said "let's go up and see it", so we go
//             up and see it.
//   SURFACE   they break out at the house from the opening, and the camera
//             keeps pulling back until the ground is a face of the planet
//             — the same cube the intro showed, with the same corner gone.
//   PUT BACK  the spheres lift off every face. Triangles — the restore
//             shot the player has been firing since face three — stream in
//             from everywhere and the corner grows back. The twelve edges
//             light one by one as the line is counted out. Then the bloom.
//   TITLE     the name of the game assembles itself out of blocks, which
//             is the verb, one last time.
//
// Everything is the game's own language: the stick legs, the cube, the
// cyan that has meant "as it should be" since the level-1 seam, the
// triangle that has meant "put back" since the handoff. No new asset is
// introduced for the ending, because the ending is the game.

import { ctx, VIEW_WIDTH, VIEW_HEIGHT, drawStickLegs, drawMuscleArm } from '../engine/renderer.js';
import { drawBlockHouse } from './blockHouse.js';
import { drawRescueNPC } from '../entities/npc.js';
import { switchTo } from './sceneManager.js';
import { state } from '../state.js';
import {
  BASE_FACES, EDGES, EXPLODED_CORNER, CHAMFER_FRAC, CAM_TILT,
  buildChamferedFaces, drawPlanet, projectFaces, toCameraSpace, project, bilerp, normalize3
} from './planet.js';
import { playRestore, playWin, playRumble, playEndingSwell, playEndingSnap } from '../audio/sfx.js';

// --- the timeline, in frames ----------------------------------------------
const RISE_END = 300;
const SURFACE_END = 520;         // house in view, then the pull-back begins
const SPACE_IN = 640;            // crossfade complete: the planet from space
const SPHERES_GONE = 820;
const RESTORE_START = 840;
const RESTORE_END = 1080;        // corner back, edges lit
const BLOOM_AT = 1080;
const TITLE_AT = 1180;
const HOLD_END = 1560;           // then the win screen, or any key after TITLE_AT

const PLANET_CX = VIEW_WIDTH / 2;
const PLANET_CY = VIEW_HEIGHT * 0.46;
const GROUND_Y = VIEW_HEIGHT * 0.78;

let t = 0;
let stars = [];
let strata = [];
let spheres = [];
let triangles = [];
let sparks = [];
let edgeLit = [];        // per EDGES index: 0..1 lit
let chamfer = CHAMFER_FRAC;
let faces = null;
let shake = 0;
let titleBlocks = [];
let swellStarted = false;
let snapsDone = 0;

const ease = x => x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;   // smoothstep-ish
const clamp01 = x => Math.max(0, Math.min(1, x));

function makeStars(n) {
  const arr = [];
  for (let i = 0; i < n; i++) {
    arr.push({
      x: Math.random() * VIEW_WIDTH,
      y: Math.random() * VIEW_HEIGHT,
      z: 0.3 + Math.random() * 0.7,          // depth, for the parallax drift
      size: 0.5 + Math.random() * 1.7,
      twinkle: Math.random() * Math.PI * 2
    });
  }
  return arr;
}

// Bands of rock, each with a chewed edge, for the rise. Four depths.
function makeStrata() {
  const arr = [];
  for (let layer = 0; layer < 4; layer++) {
    const depth = 0.35 + layer * 0.22;        // nearer layers move faster
    for (let i = 0; i < 9; i++) {
      const bites = [];
      for (let b = 0; b < 14; b++) bites.push(Math.random() * 10 + 3);
      arr.push({ depth, y: i * 190 - 200, h: 60 + Math.random() * 70, bites, side: i % 2 ? 1 : -1 });
    }
  }
  return arr;
}

function makeSpheres() {
  const arr = [];
  for (let i = 0; i < 16; i++) {
    const face = BASE_FACES[i % 6];
    const local = bilerp(face.quad, 0.15 + Math.random() * 0.7, 0.15 + Math.random() * 0.7);
    arr.push({
      local, normal: face.normal,
      lift: 0,                                   // 0 on the face .. 1 gone
      delay: Math.random() * 100,
      size: 8 + Math.random() * 6
    });
  }
  return arr;
}

export const endingScene = {
  enter() {
    t = 0;
    stars = makeStars(220);
    strata = makeStrata();
    spheres = makeSpheres();
    triangles = [];
    sparks = [];
    edgeLit = EDGES.map(() => 0);
    chamfer = CHAMFER_FRAC;
    faces = buildChamferedFaces(EXPLODED_CORNER, chamfer);
    shake = 0;
    titleBlocks = [];
    swellStarted = false;
    snapsDone = 0;
  },

  update() {
    t++;

    // --- put back: the corner, the edges, the triangles -------------------
    if (t >= RESTORE_START && t <= RESTORE_END) {
      const k = clamp01((t - RESTORE_START) / (RESTORE_END - RESTORE_START));
      chamfer = CHAMFER_FRAC * (1 - ease(k));
      faces = buildChamferedFaces(EXPLODED_CORNER, chamfer);
      if (!swellStarted) { swellStarted = true; playEndingSwell(); }
      // triangles stream in toward the corner, from all round the screen
      if (t % 2 === 0) {
        const a = Math.random() * Math.PI * 2;
        const r = 420 + Math.random() * 200;
        triangles.push({
          x: PLANET_CX + Math.cos(a) * r, y: PLANET_CY + Math.sin(a) * r,
          life: 0, spin: Math.random() * 6
        });
      }
      // the edges light up one at a time, in the order the line counts them
      const lit = Math.floor(k * EDGES.length);
      for (let i = 0; i < EDGES.length; i++) {
        if (i < lit) edgeLit[i] = Math.min(1, edgeLit[i] + 0.08);
      }
      if (lit > snapsDone) { snapsDone = lit; playEndingSnap(snapsDone); shake = 3; }
    }
    if (t === RESTORE_END) { playRestore(); shake = 12; }
    if (t === BLOOM_AT + 20) playWin();
    if (t > RESTORE_END) edgeLit = edgeLit.map(v => Math.min(1, v + 0.05));

    // triangles fly to the projected corner and land as sparks
    const cornerCam = toCameraSpace(EXPLODED_CORNER, angleAt(t), planetScaleAt(t), CAM_TILT);
    const cornerP = project(cornerCam, PLANET_CX, PLANET_CY);
    for (const tri of triangles) {
      tri.life++;
      const dx = cornerP.x - tri.x, dy = cornerP.y - tri.y;
      const d = Math.hypot(dx, dy) || 1;
      const sp = 4 + tri.life * 0.25;
      tri.x += dx / d * sp; tri.y += dy / d * sp; tri.spin += 0.2;
      if (d < 10) { tri.dead = true; for (let i = 0; i < 3; i++) sparks.push({ x: tri.x, y: tri.y, vx: (Math.random() - 0.5) * 3, vy: (Math.random() - 0.5) * 3, life: 18 }); }
    }
    triangles = triangles.filter(x => !x.dead);
    for (const s of sparks) { s.x += s.vx; s.y += s.vy; s.life--; }
    sparks = sparks.filter(s => s.life > 0);

    // spheres leave
    if (t > SPACE_IN) for (const s of spheres) {
      if (t - SPACE_IN > s.delay) s.lift = Math.min(1, s.lift + 0.012);
    }

    // the title assembles
    if (t === TITLE_AT) titleBlocks = makeTitle();
    if (t > TITLE_AT) for (const b of titleBlocks) {
      const k = clamp01((t - TITLE_AT - b.delay) / 40);
      const e = ease(k);
      b.x = b.fromX + (b.toX - b.fromX) * e;
      b.y = b.fromY + (b.toY - b.fromY) * e;
      b.k = k;
    }

    if (shake > 0) shake *= 0.86;
    if (t === SURFACE_END) playRumble();
    if (t >= HOLD_END) finish();
  },

  draw() {
    ctx.save();
    if (shake > 0.3) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);

    if (t < SURFACE_END) drawRise();
    else if (t < SPACE_IN) {
      // crossfade: the surface shot pulling back into the planet
      const k = ease(clamp01((t - SURFACE_END) / (SPACE_IN - SURFACE_END)));
      drawRise(k);
      ctx.save(); ctx.globalAlpha = k; drawSpace(); ctx.restore();
    } else drawSpace();

    ctx.restore();
    drawCaptions();
    if (t > TITLE_AT + 140) {
      ctx.fillStyle = 'rgba(232, 236, 247, 0.55)';
      ctx.font = '12px Trebuchet MS, Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('press any key', VIEW_WIDTH / 2, VIEW_HEIGHT - 16);
    }
  },

  handleKeyDown() {
    // A second press after the title takes you on; a first press before it
    // skips to the title, so the ending can't trap anyone but can't be
    // missed by accident either.
    if (t >= TITLE_AT + 30) finish();
    else { t = TITLE_AT - 1; chamfer = 0; faces = buildChamferedFaces(EXPLODED_CORNER, 0); edgeLit = EDGES.map(() => 1); spheres.forEach(s => { s.lift = 1; }); }
  }
};

function finish() {
  switchTo('win');
}

// --- camera -----------------------------------------------------------------
function angleAt(frame) { return 2.1 + frame * 0.0006; }
function planetScaleAt(frame) {
  // the planet grows out of the pull-back and settles
  const k = ease(clamp01((frame - SURFACE_END) / (SPACE_IN - SURFACE_END)));
  return 60 + 50 * k;
}

// --- RISE -------------------------------------------------------------------
// Two squares on a lifted block, going up. The block is a restored one —
// cyan edges — and the light is from below, where the core is.
function drawRise(fade = 0) {
  const k = clamp01(t / RISE_END);
  const speed = 2 + ease(k) * 9;                 // accelerating
  const travel = t < RISE_END ? t * (2 + ease(k) * 4.5) : RISE_END * 6.5 + 0;

  ctx.fillStyle = '#05070f';
  ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

  // the glow from below, fading as they get higher
  const below = ctx.createRadialGradient(VIEW_WIDTH / 2, VIEW_HEIGHT + 120, 20, VIEW_WIDTH / 2, VIEW_HEIGHT + 120, 520);
  below.addColorStop(0, `rgba(94, 231, 255, ${0.55 * (1 - k * 0.8)})`);
  below.addColorStop(1, 'rgba(94, 231, 255, 0)');
  ctx.fillStyle = below;
  ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

  // strata, scrolling DOWN past them as they go up; nearer layers faster
  if (t < SURFACE_END) {
    for (const s of strata) {
      const y = ((s.y + travel * s.depth) % 1900) - 300;
      if (y > VIEW_HEIGHT + 100 || y + s.h < -100) continue;
      const shade = 20 + s.depth * 30;
      ctx.fillStyle = `rgb(${shade}, ${shade + 8}, ${shade + 30})`;
      const w = 260 + s.depth * 120;
      const x = s.side > 0 ? VIEW_WIDTH - w : 0;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + w, y);
      // the chewed edge faces the shaft
      const edgeX = s.side > 0 ? x : x + w;
      s.bites.forEach((b, i) => {
        const yy = y + (s.h * i) / s.bites.length;
        ctx.lineTo(edgeX + (s.side > 0 ? 1 : -1) * (i % 2 ? b : 0), yy);
      });
      ctx.lineTo(edgeX, y + s.h);
      ctx.lineTo(s.side > 0 ? x + w : x, y + s.h);
      ctx.closePath();
      ctx.fill();
    }
  }

  // the surface arriving: sky grows down from the top as they near it
  const sky = clamp01((t - RISE_END + 60) / 120);
  if (sky > 0) {
    const g = ctx.createLinearGradient(0, 0, 0, VIEW_HEIGHT);
    g.addColorStop(0, `rgba(16, 22, 44, ${sky})`);
    g.addColorStop(0.6, `rgba(16, 22, 44, ${sky * 0.9})`);
    g.addColorStop(1, 'rgba(16, 22, 44, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
    // stars, few at first
    ctx.fillStyle = `rgba(255, 255, 240, ${sky * 0.8})`;
    for (let i = 0; i < 60; i++) {
      const s = stars[i];
      ctx.fillRect(s.x, s.y * 0.6, s.size, s.size);
    }
  }

  // the block they're on, and them
  const blockY = t < RISE_END
    ? VIEW_HEIGHT * 0.62
    : VIEW_HEIGHT * 0.62 + (GROUND_Y - VIEW_HEIGHT * 0.62) * ease(clamp01((t - RISE_END) / 90));
  const house = clamp01((t - RISE_END - 40) / 80);
  if (house > 0) {
    // ground and the house from the opening
    ctx.fillStyle = '#1b2446';
    ctx.fillRect(0, GROUND_Y, VIEW_WIDTH, VIEW_HEIGHT - GROUND_Y);
    ctx.save(); ctx.globalAlpha = house;
    drawBlockHouse(VIEW_WIDTH / 2 + 190, GROUND_Y, 1.7, { doorOpen: true });
    ctx.restore();
  }
  const bx = VIEW_WIDTH / 2 - 60, bw = 150;
  if (house < 1) {
    // the lifted block: a restored one, edges lit, carrying them
    ctx.save();
    ctx.globalAlpha = 1 - house;
    const bob = Math.sin(t * 0.08) * 2;
    ctx.fillStyle = '#243a6e';
    ctx.fillRect(bx, blockY + bob, bw, 26);
    ctx.strokeStyle = 'rgba(94, 231, 255, 0.9)';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(bx + 0.5, blockY + bob + 0.5, bw - 1, 25);
    // its wake: cyan motes trailing down
    ctx.fillStyle = 'rgba(94, 231, 255, 0.6)';
    for (let i = 0; i < 10; i++) {
      const my = (blockY + 26 + ((t * speed * 0.7 + i * 37) % 160));
      ctx.fillRect(bx + 10 + ((i * 53) % (bw - 20)), my, 3, 3);
    }
    ctx.restore();
  }
  const standY = house < 1 ? blockY + Math.sin(t * 0.08) * 2 : GROUND_Y;
  // Quarrick, chipped but square, and the player
  drawRescueNPC({ x: bx + 86, y: standY - 44, width: 44, height: 44, facing: -1, state: 'standing', damage: 1 }, t);
  drawWalker(bx + 48, standY, t, 1);

  if (fade > 0) {
    // they get smaller as the camera pulls back — the whole shot shrinks
    // toward where the planet's top face will be
    ctx.fillStyle = `rgba(5, 7, 15, ${fade * 0.9})`;
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  }
}

function drawWalker(x, groundY, frame, facing) {
  const legLength = 9, w = 22, h = 22;
  ctx.save();
  ctx.translate(x, groundY - h / 2);
  drawStickLegs(h / 2 - legLength, h / 2, 4);
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

// --- SPACE: the planet, the spheres leaving, the corner put back ----------
function drawSpace() {
  const angle = angleAt(t);
  const scale = planetScaleAt(t);
  const bloom = t > BLOOM_AT ? clamp01((t - BLOOM_AT) / 40) : 0;

  ctx.fillStyle = '#05070f';
  ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  // stars, drifting with depth, brightening after the bloom
  for (const s of stars) {
    const tw = 0.5 + Math.sin(t * 0.04 + s.twinkle) * 0.5;
    const drift = (t - SPACE_IN) * 0.02 * s.z;
    const x = ((s.x - drift) % VIEW_WIDTH + VIEW_WIDTH) % VIEW_WIDTH;
    ctx.fillStyle = `rgba(255, 255, 240, ${0.25 + tw * 0.6 + bloom * 0.2})`;
    ctx.fillRect(x, s.y, s.size, s.size);
  }

  // the restored corner's light, behind everything, once it's back
  if (t > RESTORE_START) {
    const k = clamp01((t - RESTORE_START) / (RESTORE_END - RESTORE_START));
    const aura = ctx.createRadialGradient(PLANET_CX, PLANET_CY, 40, PLANET_CX, PLANET_CY, 180 + k * 220 + bloom * 200);
    aura.addColorStop(0, `rgba(94, 231, 255, ${0.08 + k * 0.18 + bloom * 0.3})`);
    aura.addColorStop(1, 'rgba(94, 231, 255, 0)');
    ctx.fillStyle = aura;
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  }

  // the planet
  const healK = clamp01((t - RESTORE_START) / (RESTORE_END - RESTORE_START));
  const camFaces = drawPlanet(faces, angle, scale, PLANET_CX, PLANET_CY, {
    damagedFill: t > RESTORE_START ? `rgb(${58 + healK * 100}, ${42 + healK * 150}, ${20 + healK * 200})` : undefined
  });

  // spheres lifting off along their face normals, shrinking into the stars
  for (const s of spheres) {
    if (s.lift >= 1) continue;
    const off = 0.14 + s.lift * 2.2;
    const p3 = { x: s.local.x + s.normal.x * off, y: s.local.y + s.normal.y * off, z: s.local.z + s.normal.z * off };
    const cam = toCameraSpace(p3, angle, scale, CAM_TILT);
    if (cam.z > 0 && s.lift < 0.05) continue;    // behind the planet
    const p = project(cam, PLANET_CX, PLANET_CY);
    const r = s.size * p.scale * (1 - s.lift * 0.85);
    const g = ctx.createRadialGradient(p.x - r * 0.3, p.y - r * 0.3, 1, p.x, p.y, r);
    g.addColorStop(0, '#ff9fc4');
    g.addColorStop(1, '#a12d5c');
    ctx.fillStyle = g;
    ctx.globalAlpha = 1 - s.lift * 0.6;
    ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(0.5, r), 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }

  // the edges, lit — additive, so they bloom rather than just draw
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  EDGES.forEach((e, i) => {
    const lit = edgeLit[i];
    if (lit <= 0) return;
    const a = project(toCameraSpace(e[0], angle, scale, CAM_TILT), PLANET_CX, PLANET_CY);
    const b = project(toCameraSpace(e[1], angle, scale, CAM_TILT), PLANET_CX, PLANET_CY);
    // a travelling highlight along the edge while it's lighting up
    for (const [w, al] of [[9, 0.10], [4, 0.35], [1.5, 0.9]]) {
      ctx.strokeStyle = `rgba(94, 231, 255, ${al * lit * (0.6 + bloom * 0.4)})`;
      ctx.lineWidth = w;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    if (lit < 1) {
      const px = a.x + (b.x - a.x) * lit, py = a.y + (b.y - a.y) * lit;
      ctx.fillStyle = 'rgba(215, 250, 255, 0.95)';
      ctx.beginPath(); ctx.arc(px, py, 4, 0, Math.PI * 2); ctx.fill();
    }
  });
  // triangles in flight, and the sparks where they land
  for (const tri of triangles) {
    ctx.save();
    ctx.translate(tri.x, tri.y);
    ctx.rotate(tri.spin);
    ctx.fillStyle = 'rgba(94, 231, 255, 0.9)';
    ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(5, 4); ctx.lineTo(-5, 4); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = 'rgba(215, 250, 255, 0.9)';
  for (const s of sparks) ctx.fillRect(s.x, s.y, 2, 2);
  ctx.restore();

  // the bloom: light rays, then it settles
  if (bloom > 0) {
    const fall = clamp01(1 - (t - BLOOM_AT - 40) / 160);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 18; i++) {
      const a = i * (Math.PI * 2 / 18) + t * 0.002;
      const len = 260 + bloom * 320;
      const g = ctx.createLinearGradient(PLANET_CX, PLANET_CY, PLANET_CX + Math.cos(a) * len, PLANET_CY + Math.sin(a) * len);
      g.addColorStop(0, `rgba(215, 250, 255, ${0.22 * bloom * fall})`);
      g.addColorStop(1, 'rgba(94, 231, 255, 0)');
      ctx.strokeStyle = g;
      ctx.lineWidth = 14;
      ctx.beginPath(); ctx.moveTo(PLANET_CX, PLANET_CY); ctx.lineTo(PLANET_CX + Math.cos(a) * len, PLANET_CY + Math.sin(a) * len); ctx.stroke();
    }
    ctx.restore();
    if (t < BLOOM_AT + 12) {
      ctx.fillStyle = `rgba(215, 250, 255, ${0.85 * (1 - (t - BLOOM_AT) / 12)})`;
      ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
    }
  }

  // the title
  for (const b of titleBlocks) {
    if (b.k <= 0) continue;
    ctx.fillStyle = b.gold ? '#f2c14e' : '#5ee7ff';
    ctx.globalAlpha = 0.35 + b.k * 0.65;
    ctx.fillRect(b.x, b.y, b.s, b.s);
    ctx.globalAlpha = 1;
  }
  if (t > TITLE_AT + 90) {
    const k = clamp01((t - TITLE_AT - 90) / 40);
    ctx.textAlign = 'center';
    ctx.fillStyle = `rgba(232, 236, 247, ${k})`;
    ctx.font = '15px Trebuchet MS, Arial, sans-serif';
    ctx.fillText('the world is square again', VIEW_WIDTH / 2, VIEW_HEIGHT - 42);
  }
}

// --- captions: the line, counted out as it happens ------------------------
function drawCaptions() {
  const lines = [
    [RESTORE_START, RESTORE_START + 80, 'Eight corners.'],
    [RESTORE_START + 80, RESTORE_START + 160, 'Twelve edges.'],
    [RESTORE_START + 160, RESTORE_END, 'Six flat faces.'],
    [RISE_END - 60, RISE_END + 60, '"Come on. Let\'s go up and see it."']
  ];
  for (const [from, to, text] of lines) {
    if (t < from || t > to) continue;
    const k = Math.min(1, (t - from) / 18, (to - t) / 18);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = `rgba(232, 236, 247, ${k})`;
    ctx.font = 'bold 22px Trebuchet MS, Arial, sans-serif';
    ctx.shadowColor = 'rgba(94, 231, 255, 0.8)';
    ctx.shadowBlur = 12;
    ctx.fillText(text, VIEW_WIDTH / 2, VIEW_HEIGHT - 64);
    ctx.restore();
  }
}

// --- the title, as blocks -------------------------------------------------
// "BLOCK BASH" in a 5-row pixel font, each cell a small square that flies in
// from off-screen and lands. Assembling a thing out of squares is the verb.
const FONT = {
  B: ['1110', '1001', '1110', '1001', '1110'],
  L: ['1000', '1000', '1000', '1000', '1111'],
  O: ['0110', '1001', '1001', '1001', '0110'],
  C: ['0111', '1000', '1000', '1000', '0111'],
  K: ['1001', '1010', '1100', '1010', '1001'],
  A: ['0110', '1001', '1111', '1001', '1001'],
  S: ['0111', '1000', '0110', '0001', '1110'],
  H: ['1001', '1001', '1111', '1001', '1001'],
  ' ': ['00', '00', '00', '00', '00']
};
function makeTitle() {
  const word = 'BLOCK BASH';
  const s = 9, gap = 1;
  let cols = 0;
  for (const ch of word) cols += FONT[ch][0].length + 1;
  const totalW = cols * (s + gap);
  let x0 = VIEW_WIDTH / 2 - totalW / 2;
  const y0 = VIEW_HEIGHT * 0.73;
  const blocks = [];
  let col = 0;
  for (const ch of word) {
    const rows = FONT[ch];
    rows.forEach((row, r) => {
      [...row].forEach((bit, c) => {
        if (bit !== '1') return;
        const toX = x0 + (col + c) * (s + gap), toY = y0 + r * (s + gap);
        const a = Math.random() * Math.PI * 2;
        blocks.push({
          toX, toY, s,
          fromX: toX + Math.cos(a) * (300 + Math.random() * 300),
          fromY: toY + Math.sin(a) * (200 + Math.random() * 200),
          x: 0, y: 0, k: 0,
          delay: (col + c) * 1.6 + r * 2,
          gold: ch === ' ' ? false : (col < 22)      // BLOCK gold, BASH cyan
        });
      });
    });
    col += rows[0].length + 1;
  }
  return blocks;
}
