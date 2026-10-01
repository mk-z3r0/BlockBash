// The ending. Not a card — the thing the game was about, shown happening.
//
// GAME_DESIGN: "The ending is a restoration, not a kill. That's the whole
// thesis of the game stated once, at full volume." The last cutscene says
// it in words — "Eight corners. Twelve edges. Six flat faces." — and then,
// until this, the game cut to a score. This is the full volume.
//
// Four movements, continuous, about twenty-five seconds, skippable:
//
//   RISE      the two of them on a lifted block, going up through the
//             crust. Strata scroll past in parallax, rock comes loose and
//             falls past them, the rumble builds. Quarrick said "let's go up
//             and see it", so we go up and see it.
//   BREAKOUT  they punch through the surface in a burst of rock and land
//             beside the house from the opening, and the camera keeps
//             pulling back until the ground is a face of the planet.
//   PUT BACK  the spheres pop off every face. Triangles — the restore shot
//             the player has been firing since face three — stream in from
//             everywhere and the corner grows back. The twelve edges light
//             one by one as the line is counted out, each sending a ring
//             out; the corner snapping sends a shockwave through the stars.
//   TITLE     the cube, whole, turns once, lit — and the name of the game
//             assembles itself out of blocks, which is the verb, one last
//             time.
//
// Everything is the game's own language: the stick legs, the cube, the
// cyan that has meant "as it should be" since the level-1 seam, the
// triangle that has meant "put back" since the handoff. No new asset is
// introduced, because the ending is the game.
//
// --- the bloom ---
// Everything that should glow is drawn twice: once to the screen, and once
// to an offscreen canvas that is blurred (ctx.filter) and composited back
// additively. That is a real bloom pass, in plain 2D canvas, and it is the
// difference between "lit edges" and light.

import { ctx, VIEW_WIDTH, VIEW_HEIGHT, drawStickLegs, drawMuscleArm } from '../engine/renderer.js';
import { drawBlockHouse } from './blockHouse.js';
import { drawRescueNPC } from '../entities/npc.js';
import { switchTo } from './sceneManager.js';
import {
  BASE_FACES, EDGES, EXPLODED_CORNER, CHAMFER_FRAC, CAM_TILT,
  buildChamferedFaces, drawPlanet, toCameraSpace, project, bilerp
} from './planet.js';
import {
  playRestore, playWin, playRumble, playEndingSwell, playEndingSnap, playEndingRumble,
  playBreakout, playSphereLeave, playEndingChord, playTitleBlip, fadeMusicOut, restoreMusicLevel
} from '../audio/sfx.js';

// --- the timeline, in frames ----------------------------------------------
const RISE_END = 300;
const BREAK_AT = 330;            // through the surface
const SURFACE_END = 540;         // house in view, then the pull-back begins
const SPACE_IN = 660;            // crossfade complete: the planet from space
const RESTORE_START = 860;
const RESTORE_END = 1100;        // corner back, edges lit
const BLOOM_AT = 1100;
const TITLE_AT = 1200;
const HOLD_END = 1640;           // then the win screen, or any key after the title

const PLANET_CX = VIEW_WIDTH / 2;
const PLANET_CY = VIEW_HEIGHT * 0.44;
const GROUND_Y = VIEW_HEIGHT * 0.78;

let t = 0;
let stars = [];
let strata = [];
let rocks = [];          // loose rock falling past them in the shaft
let spheres = [];
let triangles = [];
let sparks = [];
let rings = [];          // expanding rings: per-edge, and the big one
let puffs = [];          // small dust puffs (sphere pops, title landings)
let edgeLit = [];        // per EDGES index: 0..1 lit
let chamfer = CHAMFER_FRAC;
let faces = null;
let shake = 0;
let flash = 0;
let wind = 0;            // star wind after the snap
let titleBlocks = [];
let swellStarted = false;
let snapsDone = 0;
let landed = 0;          // title blocks that have landed, for the blips
let glow = null;         // the offscreen bloom canvas

const ease = x => x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
const clamp01 = x => Math.max(0, Math.min(1, x));

function makeStars(n) {
  const arr = [];
  for (let i = 0; i < n; i++) {
    arr.push({
      x: Math.random() * VIEW_WIDTH, y: Math.random() * VIEW_HEIGHT,
      z: 0.3 + Math.random() * 0.7, size: 0.5 + Math.random() * 1.7,
      twinkle: Math.random() * Math.PI * 2
    });
  }
  return arr;
}

function makeStrata() {
  const arr = [];
  for (let layer = 0; layer < 5; layer++) {
    const depth = 0.3 + layer * 0.2;
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
    arr.push({ local, normal: face.normal, lift: 0, delay: Math.random() * 110, size: 8 + Math.random() * 6, popped: false });
  }
  return arr;
}

function ensureGlow() {
  if (glow) return;
  glow = document.createElement('canvas');
  glow.width = VIEW_WIDTH;
  glow.height = VIEW_HEIGHT;
}

export const endingScene = {
  enter() {
    t = 0;
    stars = makeStars(240);
    strata = makeStrata();
    rocks = [];
    spheres = makeSpheres();
    triangles = []; sparks = []; rings = []; puffs = [];
    edgeLit = EDGES.map(() => 0);
    chamfer = CHAMFER_FRAC;
    faces = buildChamferedFaces(EXPLODED_CORNER, chamfer);
    shake = 0; flash = 0; wind = 0;
    titleBlocks = [];
    swellStarted = false;
    snapsDone = 0;
    landed = 0;
    ensureGlow();
    fadeMusicOut(2.5);
    playEndingRumble();
  },

  update() {
    t++;

    // --- rise: rock coming loose, rumble building ------------------------
    if (t < BREAK_AT) {
      const k = clamp01(t / RISE_END);
      shake = Math.max(shake, 0.5 + k * 3.5);
      if (t % 9 === 0) {
        rocks.push({
          x: Math.random() < 0.5 ? 120 + Math.random() * 120 : VIEW_WIDTH - 240 + Math.random() * 120,
          y: -20, vy: 2 + Math.random() * 3, vx: (Math.random() - 0.5) * 1.2,
          s: 4 + Math.random() * 9, spin: Math.random() * 6, dspin: (Math.random() - 0.5) * 0.2
        });
      }
    }
    for (const r of rocks) { r.y += r.vy + (t < BREAK_AT ? 4 : 0); r.x += r.vx; r.vy += 0.15; r.spin += r.dspin; }
    rocks = rocks.filter(r => r.y < VIEW_HEIGHT + 40);

    // --- breakout --------------------------------------------------------
    if (t === BREAK_AT) {
      playBreakout();
      shake = 16; flash = 1;
      for (let i = 0; i < 40; i++) {
        const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2;
        const v = 4 + Math.random() * 9;
        rocks.push({ x: VIEW_WIDTH / 2 - 40 + Math.random() * 80, y: GROUND_Y, vy: Math.sin(a) * v, vx: Math.cos(a) * v,
                     s: 4 + Math.random() * 10, spin: Math.random() * 6, dspin: (Math.random() - 0.5) * 0.3 });
      }
      rings.push({ x: VIEW_WIDTH / 2, y: GROUND_Y, r: 10, dr: 9, life: 40, w: 6, col: '255, 235, 170' });
    }
    if (t === SURFACE_END) playRumble();

    // --- put back: the corner, the edges, the triangles -------------------
    if (t >= RESTORE_START && t <= RESTORE_END) {
      const k = clamp01((t - RESTORE_START) / (RESTORE_END - RESTORE_START));
      chamfer = CHAMFER_FRAC * (1 - ease(k));
      faces = buildChamferedFaces(EXPLODED_CORNER, chamfer);
      if (!swellStarted) { swellStarted = true; playEndingSwell(); }
      if (t % 2 === 0) {
        const a = Math.random() * Math.PI * 2;
        const r = 430 + Math.random() * 220;
        triangles.push({ x: PLANET_CX + Math.cos(a) * r, y: PLANET_CY + Math.sin(a) * r, life: 0, spin: Math.random() * 6, trail: [] });
      }
      const lit = Math.floor(k * EDGES.length);
      for (let i = 0; i < EDGES.length; i++) if (i < lit) edgeLit[i] = Math.min(1, edgeLit[i] + 0.08);
      if (lit > snapsDone) {
        snapsDone = lit;
        playEndingSnap(snapsDone);
        shake = 4;
        // a ring out from the midpoint of the edge that just completed
        const e = EDGES[snapsDone - 1];
        const mid = { x: (e[0].x + e[1].x) / 2, y: (e[0].y + e[1].y) / 2, z: (e[0].z + e[1].z) / 2 };
        const p = project(toCameraSpace(mid, angleAt(t), planetScaleAt(t), CAM_TILT), PLANET_CX, PLANET_CY);
        rings.push({ x: p.x, y: p.y, r: 4, dr: 5, life: 30, w: 3, col: '94, 231, 255' });
      }
    }
    if (t === RESTORE_END) {
      playRestore(); playEndingChord();
      shake = 14; flash = 1; wind = 1;
      rings.push({ x: PLANET_CX, y: PLANET_CY, r: 30, dr: 16, life: 70, w: 10, col: '215, 250, 255' });
      rings.push({ x: PLANET_CX, y: PLANET_CY, r: 10, dr: 11, life: 90, w: 5, col: '94, 231, 255' });
    }
    if (t === BLOOM_AT + 30) playWin();
    if (t > RESTORE_END) edgeLit = edgeLit.map(v => Math.min(1, v + 0.05));

    // triangles fly to the projected corner and land as sparks
    const cornerP = project(toCameraSpace(EXPLODED_CORNER, angleAt(t), planetScaleAt(t), CAM_TILT), PLANET_CX, PLANET_CY);
    for (const tri of triangles) {
      tri.life++;
      tri.trail.push({ x: tri.x, y: tri.y }); if (tri.trail.length > 7) tri.trail.shift();
      const dx = cornerP.x - tri.x, dy = cornerP.y - tri.y;
      const d = Math.hypot(dx, dy) || 1;
      const sp = 4 + tri.life * 0.3;
      tri.x += dx / d * sp; tri.y += dy / d * sp; tri.spin += 0.25;
      if (d < 10) { tri.dead = true; for (let i = 0; i < 4; i++) sparks.push({ x: tri.x, y: tri.y, vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4, life: 20 }); }
    }
    triangles = triangles.filter(x => !x.dead);
    for (const s of sparks) { s.x += s.vx; s.y += s.vy; s.life--; }
    sparks = sparks.filter(s => s.life > 0);
    for (const r of rings) { r.r += r.dr; r.life--; }
    rings = rings.filter(r => r.life > 0);
    for (const p of puffs) { p.x += p.vx; p.y += p.vy; p.vy -= 0.02; p.life--; }
    puffs = puffs.filter(p => p.life > 0);

    // spheres leave, each with a pop
    if (t > SPACE_IN) for (const s of spheres) {
      if (t - SPACE_IN > s.delay) {
        if (!s.popped) {
          s.popped = true;
          playSphereLeave();
          const p = sphereScreen(s, 0.14);
          if (p) for (let i = 0; i < 6; i++) puffs.push({ x: p.x, y: p.y, vx: (Math.random() - 0.5) * 2.5, vy: (Math.random() - 0.5) * 2.5, life: 22, col: '255, 159, 196' });
        }
        s.lift = Math.min(1, s.lift + 0.012);
      }
    }

    // the title assembles
    if (t === TITLE_AT) titleBlocks = makeTitle();
    if (t > TITLE_AT) for (const b of titleBlocks) {
      const k = clamp01((t - TITLE_AT - b.delay) / 40);
      const e = ease(k);
      b.x = b.fromX + (b.toX - b.fromX) * e;
      b.y = b.fromY + (b.toY - b.fromY) * e;
      if (k >= 1 && !b.landed) {
        b.landed = true; landed++;
        if (landed % 3 === 0) playTitleBlip(landed / 3);
        for (let i = 0; i < 2; i++) puffs.push({ x: b.toX + b.s / 2, y: b.toY + b.s, vx: (Math.random() - 0.5) * 1.5, vy: 0.4 + Math.random() * 0.6, life: 14, col: b.gold ? '242, 193, 78' : '94, 231, 255' });
      }
      b.k = k;
    }

    if (shake > 0) shake *= 0.86;
    if (flash > 0) flash = Math.max(0, flash - 0.07);
    if (wind > 0) wind = Math.max(0, wind - 0.012);
    if (t >= HOLD_END) finish();
  },

  draw() {
    ctx.save();
    if (shake > 0.3) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);

    if (t < SURFACE_END) drawRise();
    else if (t < SPACE_IN) {
      const k = ease(clamp01((t - SURFACE_END) / (SPACE_IN - SURFACE_END)));
      drawRise(k);
      ctx.save(); ctx.globalAlpha = k; drawSpace(); ctx.restore();
    } else drawSpace();

    // rings and puffs live in screen space over everything
    for (const r of rings) {
      ctx.strokeStyle = `rgba(${r.col}, ${0.9 * r.life / (r.life + 20)})`;
      ctx.lineWidth = r.w * (r.life / 40);
      ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2); ctx.stroke();
    }
    for (const p of puffs) {
      ctx.fillStyle = `rgba(${p.col}, ${0.8 * p.life / 22})`;
      ctx.fillRect(p.x, p.y, 3, 3);
    }
    ctx.restore();

    if (flash > 0) {
      ctx.fillStyle = `rgba(255, 250, 235, ${0.9 * flash})`;
      ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
    }
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
    // blown through by accident either.
    if (t >= TITLE_AT + 30) finish();
    else {
      t = TITLE_AT - 1; chamfer = 0; faces = buildChamferedFaces(EXPLODED_CORNER, 0);
      edgeLit = EDGES.map(() => 1); spheres.forEach(s => { s.lift = 1; s.popped = true; });
      triangles = []; rocks = [];
    }
  }
};

function finish() {
  restoreMusicLevel();
  switchTo('win');
}

// --- camera -----------------------------------------------------------------
function angleAt(frame) {
  // a slow pan through the restoration, and one full, slower turn after it
  const base = 2.1 + frame * 0.0006;
  if (frame <= BLOOM_AT) return base;
  return base + ease(clamp01((frame - BLOOM_AT) / (HOLD_END - BLOOM_AT))) * Math.PI * 2 * 0.75;
}
function planetScaleAt(frame) {
  const k = ease(clamp01((frame - SURFACE_END) / (SPACE_IN - SURFACE_END)));
  return 60 + 50 * k;
}

// --- RISE and BREAKOUT ------------------------------------------------------
function drawRise(fade = 0) {
  const k = clamp01(t / RISE_END);
  const speed = 2 + ease(k) * 9;
  const travel = t < BREAK_AT ? t * (2 + ease(k) * 5) : BREAK_AT * 7;

  ctx.fillStyle = '#05070f';
  ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

  // the glow from below, fading as they get higher; brighter near the top
  // as the shaft opens
  const below = ctx.createRadialGradient(VIEW_WIDTH / 2, VIEW_HEIGHT + 120, 20, VIEW_WIDTH / 2, VIEW_HEIGHT + 120, 560);
  below.addColorStop(0, `rgba(94, 231, 255, ${0.6 * (1 - k * 0.7)})`);
  below.addColorStop(1, 'rgba(94, 231, 255, 0)');
  ctx.fillStyle = below;
  ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

  if (t < BREAK_AT + 40) {
    for (const s of strata) {
      const y = ((s.y + travel * s.depth) % 1900) - 300;
      if (y > VIEW_HEIGHT + 100 || y + s.h < -100) continue;
      const shade = 20 + s.depth * 30;
      ctx.fillStyle = `rgb(${shade}, ${shade + 8}, ${shade + 30})`;
      const w = 240 + s.depth * 130;
      const x = s.side > 0 ? VIEW_WIDTH - w : 0;
      ctx.beginPath();
      ctx.moveTo(x, y); ctx.lineTo(x + w, y);
      const edgeX = s.side > 0 ? x : x + w;
      s.bites.forEach((b, i) => {
        const yy = y + (s.h * i) / s.bites.length;
        ctx.lineTo(edgeX + (s.side > 0 ? 1 : -1) * (i % 2 ? b : 0), yy);
      });
      ctx.lineTo(edgeX, y + s.h); ctx.lineTo(s.side > 0 ? x + w : x, y + s.h);
      ctx.closePath(); ctx.fill();
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
    ctx.fillStyle = `rgba(255, 255, 240, ${sky * 0.8})`;
    for (let i = 0; i < 70; i++) { const s = stars[i]; ctx.fillRect(s.x, s.y * 0.6, s.size, s.size); }
  }

  const blockY = t < RISE_END
    ? VIEW_HEIGHT * 0.62
    : VIEW_HEIGHT * 0.62 + (GROUND_Y - VIEW_HEIGHT * 0.62) * ease(clamp01((t - RISE_END) / 90));
  const house = clamp01((t - BREAK_AT - 10) / 70);
  if (house > 0) {
    ctx.fillStyle = '#1b2446';
    ctx.fillRect(0, GROUND_Y, VIEW_WIDTH, VIEW_HEIGHT - GROUND_Y);
    ctx.save(); ctx.globalAlpha = house;
    drawBlockHouse(VIEW_WIDTH / 2 + 190, GROUND_Y, 1.7, { doorOpen: true });
    ctx.restore();
  }
  const bx = VIEW_WIDTH / 2 - 60, bw = 150;
  if (house < 1) {
    ctx.save();
    ctx.globalAlpha = 1 - house;
    const bob = Math.sin(t * 0.08) * 2;
    ctx.fillStyle = '#243a6e';
    ctx.fillRect(bx, blockY + bob, bw, 26);
    ctx.strokeStyle = 'rgba(94, 231, 255, 0.95)';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(bx + 0.5, blockY + bob + 0.5, bw - 1, 25);
    ctx.fillStyle = 'rgba(94, 231, 255, 0.6)';
    for (let i = 0; i < 12; i++) {
      const my = (blockY + 26 + ((t * speed * 0.7 + i * 37) % 180));
      ctx.fillRect(bx + 10 + ((i * 53) % (bw - 20)), my, 3, 3 + speed * 0.4);
    }
    ctx.restore();
  }
  // loose rock, in front of everything in the shaft
  for (const r of rocks) {
    ctx.save();
    ctx.translate(r.x, r.y); ctx.rotate(r.spin);
    ctx.fillStyle = '#2a3356';
    ctx.fillRect(-r.s / 2, -r.s / 2, r.s, r.s);
    ctx.restore();
  }
  const standY = house < 1 ? blockY + Math.sin(t * 0.08) * 2 : GROUND_Y;
  drawRescueNPC({ x: bx + 86, y: standY - 44, width: 44, height: 44, facing: -1, state: 'standing', damage: 1 }, t);
  drawWalker(bx + 48, standY, t, 1);

  if (fade > 0) {
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

function sphereScreen(s, off) {
  const p3 = { x: s.local.x + s.normal.x * off, y: s.local.y + s.normal.y * off, z: s.local.z + s.normal.z * off };
  const cam = toCameraSpace(p3, angleAt(t), planetScaleAt(t), CAM_TILT);
  if (cam.z > 0) return null;
  return project(cam, PLANET_CX, PLANET_CY);
}

// --- SPACE: the planet, the spheres leaving, the corner put back ----------
// Draws the glowing things into a callback so they can go to the screen AND
// to the bloom canvas.
function drawGlowing(c, angle, scale, bloom) {
  c.save();
  c.globalCompositeOperation = 'lighter';
  EDGES.forEach((e, i) => {
    const lit = edgeLit[i];
    if (lit <= 0) return;
    const a = project(toCameraSpace(e[0], angle, scale, CAM_TILT), PLANET_CX, PLANET_CY);
    const b = project(toCameraSpace(e[1], angle, scale, CAM_TILT), PLANET_CX, PLANET_CY);
    for (const [w, al] of [[8, 0.12], [3.5, 0.4], [1.5, 0.95]]) {
      c.strokeStyle = `rgba(94, 231, 255, ${al * lit * (0.65 + bloom * 0.35)})`;
      c.lineWidth = w;
      c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke();
    }
    if (lit < 1) {
      const px = a.x + (b.x - a.x) * lit, py = a.y + (b.y - a.y) * lit;
      c.fillStyle = 'rgba(215, 250, 255, 0.95)';
      c.beginPath(); c.arc(px, py, 4, 0, Math.PI * 2); c.fill();
    }
  });
  for (const tri of triangles) {
    // trail
    tri.trail.forEach((p, i) => {
      c.fillStyle = `rgba(94, 231, 255, ${0.08 + (i / tri.trail.length) * 0.3})`;
      c.fillRect(p.x - 1.5, p.y - 1.5, 3, 3);
    });
    c.save();
    c.translate(tri.x, tri.y); c.rotate(tri.spin);
    c.fillStyle = 'rgba(94, 231, 255, 0.95)';
    c.beginPath(); c.moveTo(0, -6); c.lineTo(5, 4); c.lineTo(-5, 4); c.closePath(); c.fill();
    c.restore();
  }
  c.fillStyle = 'rgba(215, 250, 255, 0.9)';
  for (const s of sparks) c.fillRect(s.x, s.y, 2, 2);
  for (const b of titleBlocks) {
    if (b.k <= 0) continue;
    c.fillStyle = b.gold ? '#f2c14e' : '#5ee7ff';
    c.globalAlpha = 0.35 + b.k * 0.65;
    c.fillRect(b.x, b.y, b.s, b.s);
    c.globalAlpha = 1;
  }
  c.restore();
}

function drawSpace() {
  const angle = angleAt(t);
  const scale = planetScaleAt(t);
  const bloom = t > BLOOM_AT ? clamp01((t - BLOOM_AT) / 40) : 0;

  ctx.fillStyle = '#05070f';
  ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  // stars: depth drift, and a wind outward from the planet after the snap
  for (const s of stars) {
    const tw = 0.5 + Math.sin(t * 0.04 + s.twinkle) * 0.5;
    const drift = (t - SPACE_IN) * 0.02 * s.z;
    let x = ((s.x - drift) % VIEW_WIDTH + VIEW_WIDTH) % VIEW_WIDTH, y = s.y;
    if (wind > 0) {
      const dx = x - PLANET_CX, dy = y - PLANET_CY;
      const d = Math.hypot(dx, dy) || 1;
      const push = wind * 60 * s.z;
      x += dx / d * push; y += dy / d * push;
      // a streak along the push
      ctx.strokeStyle = `rgba(255, 255, 240, ${0.5 * wind})`;
      ctx.lineWidth = s.size;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - dx / d * push * 0.5, y - dy / d * push * 0.5); ctx.stroke();
    }
    ctx.fillStyle = `rgba(255, 255, 240, ${0.25 + tw * 0.6 + bloom * 0.2})`;
    ctx.fillRect(x, y, s.size, s.size);
  }

  if (t > RESTORE_START) {
    const k = clamp01((t - RESTORE_START) / (RESTORE_END - RESTORE_START));
    const aura = ctx.createRadialGradient(PLANET_CX, PLANET_CY, 40, PLANET_CX, PLANET_CY, 180 + k * 240 + bloom * 220);
    aura.addColorStop(0, `rgba(94, 231, 255, ${0.08 + k * 0.2 + bloom * 0.3})`);
    aura.addColorStop(1, 'rgba(94, 231, 255, 0)');
    ctx.fillStyle = aura;
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  }

  const healK = clamp01((t - RESTORE_START) / (RESTORE_END - RESTORE_START));
  drawPlanet(faces, angle, scale, PLANET_CX, PLANET_CY, {
    damagedFill: t > RESTORE_START ? `rgb(${58 + healK * 100}, ${42 + healK * 150}, ${20 + healK * 200})` : undefined,
    rim: t > RESTORE_END ? 'rgba(94, 231, 255, 0.55)' : undefined
  });

  for (const s of spheres) {
    if (s.lift >= 1) continue;
    const p = sphereScreen(s, 0.14 + s.lift * 2.4);
    if (!p && s.lift < 0.05) continue;
    if (!p) continue;
    const r = s.size * p.scale * (1 - s.lift * 0.85);
    const g = ctx.createRadialGradient(p.x - r * 0.3, p.y - r * 0.3, 1, p.x, p.y, r);
    g.addColorStop(0, '#ff9fc4'); g.addColorStop(1, '#a12d5c');
    ctx.fillStyle = g;
    ctx.globalAlpha = 1 - s.lift * 0.6;
    ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(0.5, r), 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }

  // the glowing things: to the screen, and through the bloom pass
  drawGlowing(ctx, angle, scale, bloom);
  if (glow && (edgeLit.some(v => v > 0) || triangles.length || titleBlocks.length)) {
    const gc = glow.getContext('2d');
    gc.clearRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
    drawGlowing(gc, angle, scale, bloom);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.filter = `blur(${7 + bloom * 7}px)`;
    ctx.globalAlpha = 0.75 + bloom * 0.25;
    ctx.drawImage(glow, 0, 0);
    ctx.filter = `blur(${22 + bloom * 12}px)`;
    ctx.globalAlpha = 0.45;
    ctx.drawImage(glow, 0, 0);
    ctx.restore();
  }

  // the light rays after the snap, falling off as the cube turns
  if (bloom > 0) {
    const fall = clamp01(1 - (t - BLOOM_AT - 40) / 200);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 22; i++) {
      const a = i * (Math.PI * 2 / 22) + t * 0.0025;
      const len = 260 + bloom * 360;
      const g = ctx.createLinearGradient(PLANET_CX, PLANET_CY, PLANET_CX + Math.cos(a) * len, PLANET_CY + Math.sin(a) * len);
      g.addColorStop(0, `rgba(215, 250, 255, ${0.24 * bloom * fall})`);
      g.addColorStop(1, 'rgba(94, 231, 255, 0)');
      ctx.strokeStyle = g;
      ctx.lineWidth = 16;
      ctx.beginPath(); ctx.moveTo(PLANET_CX, PLANET_CY); ctx.lineTo(PLANET_CX + Math.cos(a) * len, PLANET_CY + Math.sin(a) * len); ctx.stroke();
    }
    ctx.restore();
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
    [RISE_END - 70, RISE_END + 30, '"Come on. Let\'s go up and see it."'],
    [RESTORE_START, RESTORE_START + 80, 'Eight corners.'],
    [RESTORE_START + 80, RESTORE_START + 160, 'Twelve edges.'],
    [RESTORE_START + 160, RESTORE_END, 'Six flat faces.']
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
  const x0 = VIEW_WIDTH / 2 - totalW / 2;
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
          x: 0, y: 0, k: 0, landed: false,
          delay: (col + c) * 1.6 + r * 2,
          gold: col < 22
        });
      });
    });
    col += rows[0].length + 1;
  }
  return blocks;
}
