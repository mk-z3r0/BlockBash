// The backdrop: what's behind the level.
//
// One starfield-and-grid served every level for a long time, and a game that
// runs from a first stand to the middle of a hollow planet shouldn't look the
// same the whole way down. Each face gets a palette and a skyline — far
// silhouettes of the kind of thing the level is made of (cubes, terraces,
// columns, shelves, a fortress, a cavern) — plus drifting motes and a glow
// along the horizon. Everything is deterministic from the level index, so a
// screenshot of level 3 is the same screenshot every time.
//
// Three parallax layers, far to near:
//   motes     0.06   specks, twinkling
//   skyline   0.18   the silhouettes
//   orbs/grid 0.15 / 0.40   the old backdrop, kept, tinted
//
// Cheap on purpose: a few dozen rects and ~50 dots a frame. Nothing here
// allocates per frame except gradients, which the canvas handles fine.

import { ctx, VIEW_WIDTH, VIEW_HEIGHT } from './renderer.js';

// The skyline is laid out over one tile this wide and repeated, so every
// level — the longest is 8000px — is covered without authoring 8000px of
// silhouettes.
const TILE = 2400;
const MOTES = 48;

const THEMES = [
  // 1 — The First Stand: night over home. Cubes drifting in the dark.
  { top: '#0f1630', bottom: '#1b2345', glow: 'rgba(94, 231, 255, 0.10)', grid: 'rgba(242, 193, 78, 0.05)',
    orbs: 'rgba(255, 77, 141, 0.06)', mote: '200, 220, 255', sil: '#222c5c', skyline: 'cubes' },
  // 2 — The Quarry: dust in the air, amber on the horizon, terraces cut down to the right.
  { top: '#171226', bottom: '#2b1e2c', glow: 'rgba(242, 193, 78, 0.12)', grid: 'rgba(242, 193, 78, 0.04)',
    orbs: 'rgba(255, 140, 90, 0.045)', mote: '255, 210, 150', sil: '#362845', skyline: 'terraces' },
  // 3 — What the Sanders Left: slate and standing stone. Columns.
  { top: '#0f1a26', bottom: '#1e2c3c', glow: 'rgba(150, 220, 255, 0.10)', grid: 'rgba(160, 200, 255, 0.04)',
    orbs: 'rgba(120, 160, 255, 0.05)', mote: '190, 225, 255', sil: '#243a54', skyline: 'columns' },
  // 4 — Three Against One: the first face that shoots back. Red in the sky.
  { top: '#1a0f1e', bottom: '#2c1522', glow: 'rgba(255, 77, 141, 0.13)', grid: 'rgba(255, 120, 160, 0.04)',
    orbs: 'rgba(255, 77, 141, 0.06)', mote: '255, 170, 190', sil: '#3e2040', skyline: 'shelves' },
  // 5 — The Room That Moves: violet, and the silhouettes don't hold still either.
  { top: '#130f2c', bottom: '#261b48', glow: 'rgba(190, 150, 255, 0.12)', grid: 'rgba(200, 170, 255, 0.04)',
    orbs: 'rgba(170, 120, 255, 0.07)', mote: '220, 200, 255', sil: '#30245e', skyline: 'drift' },
  // 6 — No Tricks Left: steel. A fortress wall behind everything.
  { top: '#0d1117', bottom: '#1b2028', glow: 'rgba(200, 220, 255, 0.09)', grid: 'rgba(200, 220, 255, 0.035)',
    orbs: 'rgba(140, 160, 200, 0.05)', mote: '220, 230, 255', sil: '#252e3c', skyline: 'fortress' },
  // 7 — The Middle of the World: a cavern. Gold from below, embers rising, no grid.
  { top: '#04080a', bottom: '#0e1c18', glow: 'rgba(242, 193, 78, 0.18)', grid: null,
    orbs: 'rgba(242, 193, 78, 0.04)', mote: '255, 200, 110', sil: '#142a24', skyline: 'cavern', embers: true }
];
// The title screen: level 1's night, with no skyline — the planet and the
// title are the picture.
const TITLE_THEME = { ...THEMES[0], skyline: 'cubes' };

// Deterministic per theme, so the same level always has the same sky.
function rng(seed) {
  let s = (seed * 2654435761 + 12345) >>> 0;
  return () => { s = (s * 1103515245 + 12345) >>> 0; return (s >>> 8) / 16777216; };
}

// --- skylines: lists of rects in tile space, built once per theme ---------
const skylineCache = new Map();
function skyline(kind, seed) {
  const k = `${kind}:${seed}`;
  if (skylineCache.has(k)) return skylineCache.get(k);
  const r = rng(seed + 7);
  const rects = [];
  const base = VIEW_HEIGHT - 60;             // where the silhouettes stand
  if (kind === 'cubes') {
    for (let i = 0; i < 14; i++) {
      const s = 14 + r() * 40;
      rects.push({ x: r() * TILE, y: 40 + r() * 230, w: s, h: s, bob: 0.4 + r() * 0.8, phase: r() * 6.3 });
    }
  } else if (kind === 'terraces') {
    let x = 0;
    while (x < TILE) {
      const steps = 3 + Math.floor(r() * 3), w = 60 + r() * 80;
      let h = 120 + r() * 90;
      for (let s = 0; s < steps && x < TILE; s++) { rects.push({ x, y: base - h, w, h }); x += w; h -= 28 + r() * 16; if (h < 30) h = 30; }
      x += 40 + r() * 120;
    }
  } else if (kind === 'columns') {
    let x = 30;
    while (x < TILE) {
      const w = 18 + r() * 26, h = 90 + r() * 200;
      rects.push({ x, y: base - h, w, h });
      // a capital on some of them
      if (r() < 0.5) rects.push({ x: x - 5, y: base - h - 8, w: w + 10, h: 8 });
      x += w + 30 + r() * 110;
    }
  } else if (kind === 'shelves') {
    for (let i = 0; i < 16; i++) {
      const w = 120 + r() * 220;
      rects.push({ x: r() * TILE, y: 70 + r() * 240, w, h: 10 + r() * 10 });
    }
    let x = 0;
    while (x < TILE) { const w = 40 + r() * 60, h = 40 + r() * 70; rects.push({ x, y: base - h, w, h }); x += w + 60 + r() * 160; }
  } else if (kind === 'drift') {
    for (let i = 0; i < 18; i++) {
      const w = 60 + r() * 140;
      rects.push({ x: r() * TILE, y: 60 + r() * 260, w, h: 10 + r() * 8, bob: 6 + r() * 10, phase: r() * 6.3, rate: 0.008 + r() * 0.01 });
    }
  } else if (kind === 'fortress') {
    rects.push({ x: 0, y: base - 110, w: TILE, h: 110 });
    for (let x = 0; x < TILE; x += 44) rects.push({ x, y: base - 128, w: 24, h: 18 });        // crenellations
    let tx = 120;
    while (tx < TILE) { const w = 60 + r() * 50, h = 170 + r() * 110; rects.push({ x: tx, y: base - h, w, h }); rects.push({ x: tx - 8, y: base - h - 14, w: w + 16, h: 14 }); tx += w + 260 + r() * 400; }
  } else if (kind === 'cavern') {
    let x = 0;
    while (x < TILE) { const w = 20 + r() * 50, h = 40 + r() * 170; rects.push({ x, y: -4, w, h, hang: true }); x += w + 10 + r() * 60; }
    // No floor rubble: it poked out beside the platforms and read as a
    // stray block. The glow and the embers carry the bottom of the frame.
  }
  skylineCache.set(k, rects);
  return rects;
}

// Motes, likewise.
const moteCache = new Map();
function motes(seed) {
  if (moteCache.has(seed)) return moteCache.get(seed);
  const r = rng(seed + 99);
  const list = [];
  for (let i = 0; i < MOTES; i++) list.push({ x: r() * TILE, y: r() * (VIEW_HEIGHT - 80), s: 0.6 + r() * 1.6, phase: r() * 6.3, rate: 0.02 + r() * 0.04 });
  moteCache.set(seed, list);
  return list;
}

function themeFor(which) {
  if (which === 'title') return TITLE_THEME;
  return THEMES[Math.max(0, Math.min(THEMES.length - 1, which | 0))];
}

export function drawBackdrop(cameraX, cameraY = 0, which = 0, frame = 0) {
  const t = themeFor(which);
  const seed = which === 'title' ? 100 : (which | 0) + 1;

  // sky
  const sky = ctx.createLinearGradient(0, 0, 0, VIEW_HEIGHT);
  sky.addColorStop(0, t.top);
  sky.addColorStop(1, t.bottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

  // motes, far away, twinkling
  {
    const off = -cameraX * 0.06;
    for (const m of motes(seed)) {
      const a = 0.25 + 0.3 * (0.5 + 0.5 * Math.sin(frame * m.rate + m.phase));
      let x = ((m.x + off) % TILE + TILE) % TILE - 100;
      if (x < -10 || x > VIEW_WIDTH + 10) continue;
      let y = m.y - cameraY * 0.06;
      if (t.embers) { y = ((m.y - frame * 0.25 * m.s) % VIEW_HEIGHT + VIEW_HEIGHT) % VIEW_HEIGHT; }
      ctx.fillStyle = `rgba(${t.mote}, ${a.toFixed(3)})`;
      ctx.fillRect(x, y, m.s, m.s);
    }
  }

  // the old far orbs, tinted
  {
    const farOffset = -cameraX * 0.15;
    ctx.fillStyle = t.orbs;
    for (let i = 0; i < 8; i++) {
      const cx = (i * 420 + farOffset) % (VIEW_WIDTH + 800) - 200;
      ctx.beginPath();
      ctx.arc(cx, 90 + (i % 3) * 40 - cameraY * 0.15, 60, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // skyline
  {
    const off = -cameraX * 0.18;
    const dy = -cameraY * 0.18;
    ctx.fillStyle = t.sil;
    for (const s of skyline(t.skyline, seed)) {
      // tiled: draw the copy (or two) that lands on screen
      let x = ((s.x + off) % TILE + TILE) % TILE;
      for (const xx of [x, x - TILE]) {
        if (xx + s.w < 0 || xx > VIEW_WIDTH) continue;
        let y = s.y + (s.hang ? 0 : dy);
        if (s.bob) y += Math.sin(frame * (s.rate || 0.012) + s.phase) * (s.bob * (s.rate ? 1 : 6));
        ctx.fillRect(xx, y, s.w, s.h);
      }
    }
  }

  // grid, the old one
  if (t.grid) {
    const gridOffset = -cameraX * 0.4;
    const gridOffsetY = -cameraY * 0.4;
    ctx.strokeStyle = t.grid;
    ctx.lineWidth = 1;
    const spacing = 40;
    ctx.beginPath();
    for (let x = (gridOffset % spacing); x < VIEW_WIDTH; x += spacing) { ctx.moveTo(x, 0); ctx.lineTo(x, VIEW_HEIGHT); }
    for (let y = (gridOffsetY % spacing); y < VIEW_HEIGHT; y += spacing) { ctx.moveTo(0, y); ctx.lineTo(VIEW_WIDTH, y); }
    ctx.stroke();
  }

  // horizon glow
  {
    const g = ctx.createLinearGradient(0, VIEW_HEIGHT - 170, 0, VIEW_HEIGHT);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, t.glow);
    ctx.fillStyle = g;
    ctx.fillRect(0, VIEW_HEIGHT - 170, VIEW_WIDTH, 170);
  }
}
