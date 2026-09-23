// Block Bash — level editor.
//
// Build-order step 3, finally built (2026-09-22). It was skipped once with
// the note that the real need was "is this layout playable", which
// tools/level-audit-probe.html answers without a UI. That's still true. This
// exists for the other half: nudging things in a level that already works,
// and laying out new ones.
//
// --- the one design decision that matters ---
// A quarter of every level file is comments explaining WHY a number is what
// it is — which gap needs run speed, which bed was moved and what broke when
// it wasn't. A tool that loaded a level, let you drag things and wrote the
// file back out would delete all of it.
//
// So editing an existing level does NOT export a file. It exports a list of
// exactly what changed, indexed into the arrays it came from:
//
//     platforms[4].x   1520 -> 1540
//     hazards[2]       removed
//
// You apply those by hand, which for a nudge is one number, and every
// comment survives. Whole-file export exists only for a level that doesn't
// exist yet, where there's nothing to preserve.
//
// It renders through the GAME's own drawing code (levels/levelRenderer.js),
// so terrain looks exactly like terrain looks in play — including the carved
// undersides and the hazard stripes, which are the things you most need to
// see when placing something.

import { ctx } from '../src/engine/renderer.js';
import { loadLevel, getLevel, isBlocked, surfaceYAt } from '../src/levels/levelLoader.js';
import { drawPlatforms, drawHazards, drawCheckpoints } from '../src/levels/levelRenderer.js';
import { levels } from '../src/levels/registry.js';

const canvas = document.getElementById('game');

// The canvas fills whatever space is left beside the sidebar, and is resized
// to match rather than scaled — a scaled canvas makes every line in the
// level fuzzy, which is the opposite of useful when you're lining edges up.
// W/H are read fresh each frame for the same reason.
function fit() {
  const r = canvas.parentElement.getBoundingClientRect();
  const side = document.getElementById('side').getBoundingClientRect();
  canvas.width = Math.max(320, Math.floor(r.width - side.width));
  canvas.height = Math.max(240, Math.floor(r.height));
}
const W = () => canvas.width;
const H = () => canvas.height;
window.addEventListener('resize', fit);
fit();

// Measured, and the numbers every level-design rule derives from. See
// IMPLEMENTATION_PLAN's level design rules.
const JUMP_RISE = 225;
const CARRY_RUN = 168;
const CARRY_WALK = 93.5;
const PLAYER_W = 22, PLAYER_H = 22;

const clone = o => JSON.parse(JSON.stringify(o));

const state = {
  levelIndex: 0,
  original: null,   // untouched copy, for diffing
  data: null,       // the working copy everything edits
  cam: { x: 0, y: 0 },
  zoom: 1,
  sel: null,        // { list, index }
  drag: null,
  showArc: false,
  mouse: { x: 0, y: 0 }
};

// --- undo ---------------------------------------------------------------
//
// Snapshots of the whole working copy. A level's data is small enough
// (a few hundred numbers) that diffing edits to save memory would be
// effort spent on the wrong problem, and whole snapshots can't get out of
// step with the thing they're meant to restore.
//
// The subtlety is GROUPING, and it cuts both ways.
//
// A held arrow key repeats, so without grouping one press-and-hold buries
// the stack in fifty entries and undo feels broken — you press it and the
// platform moves a single pixel. Snapshots carry a tag, and a new snapshot
// with the same tag inside COALESCE_MS is dropped, because the first one
// already holds the state from before the burst began.
//
// But only CONTINUOUS input groups. A mouse gesture is its own boundary —
// mousedown means "a new thing is happening" — so drags and resizes pass no
// tag and always push. Grouping them by time was the first version and it
// meant two quick resizes collapsed into one undo, which loses an edit the
// user watched themselves make.
const UNDO_LIMIT = 120;
const COALESCE_MS = 700;
const undoStack = [];
const redoStack = [];
let lastTag = null;
let lastTagAt = 0;

function snapshot(tag) {
  const now = Date.now();
  if (tag && tag === lastTag && now - lastTagAt < COALESCE_MS) { lastTagAt = now; return; }
  // A click that selects something but doesn't move it shouldn't cost an
  // undo press later. If nothing has changed since the last snapshot, there
  // is nothing to go back to.
  const top = undoStack[undoStack.length - 1];
  if (top && JSON.stringify(top) === JSON.stringify(state.data)) { lastTag = tag; lastTagAt = now; return; }
  lastTag = tag;
  lastTagAt = now;
  undoStack.push(clone(state.data));
  if (undoStack.length > UNDO_LIMIT) undoStack.shift();
  redoStack.length = 0;
  refreshUndoButtons();
}

function undo() {
  if (!undoStack.length) return;
  redoStack.push(clone(state.data));
  state.data = undoStack.pop();
  lastTag = null;
  clampSelection();
  sync(); refreshProps(); refreshUndoButtons();
}

function redo() {
  if (!redoStack.length) return;
  undoStack.push(clone(state.data));
  state.data = redoStack.pop();
  lastTag = null;
  clampSelection();
  sync(); refreshProps(); refreshUndoButtons();
}

// An undo can restore a level with fewer objects than the selection points
// at — undoing an "add" is the obvious case.
function clampSelection() {
  const s = state.sel;
  if (!s) return;
  const list = state.data[s.list];
  if (!list || s.index >= list.length) state.sel = null;
}

function refreshUndoButtons() {
  const u = document.getElementById('undo'), r = document.getElementById('redo');
  if (u) u.disabled = !undoStack.length;
  if (r) r.disabled = !redoStack.length;
}

// --- coordinate helpers ------------------------------------------------
const toScreen = (wx, wy) => ({ x: (wx - state.cam.x) * state.zoom, y: (wy - state.cam.y) * state.zoom });
const toWorld = (sx, sy) => ({ x: sx / state.zoom + state.cam.x, y: sy / state.zoom + state.cam.y });

function loadIndex(i) {
  state.levelIndex = i;
  state.original = clone(levels[i]);
  state.data = clone(levels[i]);
  state.sel = null;
  undoStack.length = 0;
  redoStack.length = 0;
  lastTag = null;
  state.cam = { x: 0, y: state.data.groundY - H() / state.zoom + 90 };
  sync();
  refreshUndoButtons();
  // Panels too, or a revert leaves the change list still listing changes
  // that no longer exist — which is the one thing a change list must never
  // do, since the whole point is that you trust it enough to apply it.
  refreshProps();
}

// The renderer reads from getLevel(), so the working copy has to be pushed
// through the real loader after every change. That also means the editor is
// looking at exactly the geometry the game would build from this data —
// terraces thickened, hazards snapped to the ground beneath them, and so on.
function sync() {
  loadLevel(state.data);
}

// --- what's under the cursor -------------------------------------------
// Ordered so small things win over big ones: you almost never mean to grab
// the ground segment a coin is sitting on.
function boxesFor(d) {
  const b = [];
  (d.coins || []).forEach((c, i) => b.push({ list: 'coins', index: i, x: c[0] - 7, y: c[1] - 7, w: 14, h: 14 }));
  (d.enemies || []).forEach((e, i) => b.push({ list: 'enemies', index: i, x: e.x, y: e.y, w: e.w, h: e.w }));
  (d.checkpoints || []).forEach((c, i) => b.push({ list: 'checkpoints', index: i, x: c.x - 4, y: c.y, w: 16, h: c.height }));
  (d.hazards || []).forEach((h, i) => {
    const y = h.y == null ? surfaceYAt(h.x) : h.y;
    b.push({ list: 'hazards', index: i, x: h.x, y: y - 16, w: h.width, h: 16 });
  });
  (d.platforms || []).forEach((p, i) => b.push({ list: 'platforms', index: i, x: p.x, y: p.y, w: p.width, h: p.height }));
  (d.ground || []).forEach((g, i) => {
    const y = g.y == null ? d.groundY : g.y;
    b.push({ list: 'ground', index: i, x: g.x, y, w: g.width, h: 40 });
  });
  return b;
}

function pick(wx, wy) {
  const hit = boxesFor(state.data).find(b =>
    wx >= b.x && wx <= b.x + b.w && wy >= b.y && wy <= b.y + b.h);
  return hit ? { list: hit.list, index: hit.index } : null;
}

function selBox() {
  if (!state.sel) return null;
  return boxesFor(state.data).find(b => b.list === state.sel.list && b.index === state.sel.index) || null;
}

// --- moving things -----------------------------------------------------
// Everything is edited through this so there is exactly one place that knows
// how each kind of object stores its position.
function moveSelected(dx, dy) {
  const s = state.sel;
  if (!s) return;
  const d = state.data;
  if (s.list === 'coins') {
    d.coins[s.index][0] = Math.round(d.coins[s.index][0] + dx);
    d.coins[s.index][1] = Math.round(d.coins[s.index][1] + dy);
  } else {
    const o = d[s.list][s.index];
    o.x = Math.round(o.x + dx);
    // Ground segments and hazards without a y ride the terrain; everything
    // else has a real y of its own.
    if (s.list === 'enemies' || s.list === 'platforms' || s.list === 'checkpoints') {
      o.y = Math.round((o.y || 0) + dy);
    } else if (o.y != null) {
      o.y = Math.round(o.y + dy);
    }
    if (s.list === 'enemies' && o.minX != null) {
      o.minX = Math.round(o.minX + dx);
      o.maxX = Math.round(o.maxX + dx);
    }
  }
  sync();
}

// --- resize handles ----------------------------------------------------
//
// What can be resized, and by dragging which edge. Enemies get handles on
// the ENDS OF THEIR PATROL rather than on their body: minX/maxX are the
// numbers that actually matter about an enemy and the only ones that are
// completely invisible in the running game.
const HANDLE_R = 7;   // screen px

function handlesFor() {
  const s = state.sel;
  if (!s) return [];
  const d = state.data;
  const b = selBox();
  if (!b) return [];

  if (s.list === 'enemies') {
    const e = d.enemies[s.index];
    if (e.minX == null) return [];
    const y = e.y + e.w + 5;
    return [{ id: 'patrolL', wx: e.minX, wy: y }, { id: 'patrolR', wx: e.maxX, wy: y }];
  }
  if (s.list === 'coins') return [];
  if (s.list === 'checkpoints') {
    return [{ id: 'bottom', wx: b.x + b.w / 2, wy: b.y + b.h }];
  }
  const h = [
    { id: 'left', wx: b.x, wy: b.y + b.h / 2 },
    { id: 'right', wx: b.x + b.w, wy: b.y + b.h / 2 }
  ];
  // Only things with a real height of their own — a ground segment's height
  // is derived from the level's base line, and a spike bed's is the art.
  if (s.list === 'platforms') h.push({ id: 'bottom', wx: b.x + b.w / 2, wy: b.y + b.h });
  return h;
}

function hitHandle(wx, wy) {
  const r = HANDLE_R / state.zoom;
  return handlesFor().find(h => Math.abs(wx - h.wx) <= r && Math.abs(wy - h.wy) <= r) || null;
}

const MIN_SIZE = 8;

function applyHandle(id, wx, wy) {
  const s = state.sel;
  const d = state.data;
  const o = s.list === 'coins' ? null : d[s.list][s.index];
  if (!o) return;
  const x = Math.round(wx), y = Math.round(wy);

  if (id === 'patrolL') { o.minX = Math.min(x, o.maxX - o.w - 2); return; }
  if (id === 'patrolR') { o.maxX = Math.max(x, o.minX + o.w + 2); return; }

  if (id === 'left') {
    // Dragging a left edge moves the origin AND changes the size, which is
    // the bit that's easy to get wrong: the right edge has to stay put.
    const right = o.x + (o.width == null ? 0 : o.width);
    const nx = Math.min(x, right - MIN_SIZE);
    o.width = right - nx;
    o.x = nx;
    return;
  }
  if (id === 'right') { o.width = Math.max(MIN_SIZE, x - o.x); return; }
  if (id === 'bottom') {
    const top = o.y == null ? surfaceYAt(o.x) : o.y;
    o.height = Math.max(MIN_SIZE, y - top);
  }
}

function drawHandles() {
  const hs = handlesFor();
  if (!hs.length) return;
  const r = HANDLE_R / state.zoom;
  hs.forEach(h => {
    const patrol = h.id.startsWith('patrol');
    ctx.fillStyle = patrol ? '#ff9fc4' : '#8effc0';
    ctx.strokeStyle = '#0a0d1c';
    ctx.lineWidth = 1.5 / state.zoom;
    ctx.beginPath();
    ctx.rect(h.wx - r, h.wy - r, r * 2, r * 2);
    ctx.fill();
    ctx.stroke();
  });
}

// --- drawing -----------------------------------------------------------

function drawGrid() {
  const step = 100;
  const x0 = Math.floor(state.cam.x / step) * step;
  const x1 = state.cam.x + W() / state.zoom;
  const y0 = Math.floor(state.cam.y / step) * step;
  const y1 = state.cam.y + H() / state.zoom;
  ctx.lineWidth = 1 / state.zoom;
  for (let x = x0; x < x1; x += step) {
    ctx.strokeStyle = x % 1000 === 0 ? 'rgba(122,132,168,0.35)' : 'rgba(122,132,168,0.12)';
    ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y1); ctx.stroke();
    if (x % 500 === 0) {
      ctx.fillStyle = 'rgba(122,132,168,0.75)';
      ctx.font = `${11 / state.zoom}px monospace`;
      ctx.fillText(String(x), x + 3, y0 + 14 / state.zoom);
    }
  }
  for (let y = y0; y < y1; y += step) {
    ctx.strokeStyle = 'rgba(122,132,168,0.12)';
    ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
  }
}

function drawEntities() {
  const d = state.data;
  // coins
  ctx.fillStyle = '#5ee7ff';
  (d.coins || []).forEach(c => {
    ctx.save(); ctx.translate(c[0], c[1]); ctx.rotate(Math.PI / 4);
    ctx.fillRect(-5, -5, 10, 10); ctx.restore();
  });
  // enemies, with their patrol span drawn under them — minX/maxX are pure
  // data and completely invisible in the game, which is exactly how twelve
  // of them ended up authored inside walls.
  (d.enemies || []).forEach(e => {
    const cy = e.y + e.w / 2, cx = e.x + e.w / 2;
    if (e.minX != null) {
      ctx.strokeStyle = 'rgba(255,159,196,0.45)';
      ctx.lineWidth = 2 / state.zoom;
      ctx.beginPath();
      ctx.moveTo(e.minX, e.y + e.w + 5); ctx.lineTo(e.maxX, e.y + e.w + 5); ctx.stroke();
    }
    const tier = e.tier || 'passive';
    ctx.fillStyle = e.boss ? '#ffb0c8'
      : e.kind === 'octagon' ? '#8fa08c'
      : tier === 'aggressor' ? '#ffb168'
      : tier === 'pursuer' ? '#ff7a9c' : '#ff9fc4';
    ctx.beginPath();
    if (e.kind === 'octagon') ctx.rect(e.x, e.y, e.w, e.w);
    else ctx.arc(cx, cy, e.w / 2, 0, Math.PI * 2);
    ctx.fill();
    if (e.weapon || e.tool || e.shoots || e.canHop) {
      ctx.fillStyle = '#0a0d1c';
      ctx.font = `bold ${10 / state.zoom}px monospace`;
      ctx.fillText(e.shoots ? 'S' : e.canHop ? 'H' : 'W', cx - 3, cy + 3);
    }
  });
  // the world edge, which is where every level except the last one ends
  const edge = Math.max(...d.ground.map(g => g.x + g.width));
  ctx.strokeStyle = '#5ee7ff';
  ctx.lineWidth = 2 / state.zoom;
  ctx.beginPath(); ctx.moveTo(edge, state.cam.y); ctx.lineTo(edge, state.cam.y + H() / state.zoom); ctx.stroke();
  // and where the player starts
  ctx.fillStyle = '#f2c14e';
  ctx.fillRect(d.playerSpawn.x, d.playerSpawn.y, PLAYER_W, PLAYER_H);
}

function drawSelection() {
  const b = selBox();
  if (!b) return;
  ctx.strokeStyle = '#8effc0';
  ctx.lineWidth = 2 / state.zoom;
  ctx.setLineDash([6 / state.zoom, 4 / state.zoom]);
  ctx.strokeRect(b.x - 2, b.y - 2, b.w + 4, b.h + 4);
  ctx.setLineDash([]);
}

// An approximation, and labelled as one. The real arc is asymmetric —
// gravityFall is heavier than gravityRise — and the authority on whether a
// specific jump works is tools/level-audit-probe.html, which simulates it.
// What this is for is the question you ask while dragging: "could anything
// get from here to there at all."
function drawArc() {
  if (!state.showArc) return;
  const m = state.mouse;
  [[CARRY_RUN, 'rgba(94,231,255,0.8)', 'run'], [CARRY_WALK, 'rgba(242,193,78,0.8)', 'walk']]
    .forEach(([carry, colour, label]) => {
      ctx.strokeStyle = colour;
      ctx.lineWidth = 1.5 / state.zoom;
      ctx.beginPath();
      for (let t = 0; t <= 1.001; t += 0.05) {
        const x = m.x + carry * t;
        const y = m.y - JUMP_RISE * Math.sin(Math.PI * t);
        if (t === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.fillStyle = colour;
      ctx.font = `${11 / state.zoom}px monospace`;
      ctx.fillText(`${label} ${carry}px`, m.x + carry + 4, m.y - 4);
    });
}

function draw() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#10162c';
  ctx.fillRect(0, 0, W(), H());
  ctx.save();
  ctx.scale(state.zoom, state.zoom);
  ctx.translate(-state.cam.x, -state.cam.y);
  drawGrid();
  drawPlatforms();
  drawHazards();
  drawCheckpoints();
  drawEntities();
  drawArc();
  drawSelection();
  drawHandles();
  ctx.restore();
  requestAnimationFrame(draw);
}

// --- checks ------------------------------------------------------------
// The cheap half of tools/level-audit-probe.html: everything it can tell
// from the data without simulating a jump. The probe is still the authority
// on whether an obstacle is clearable — this is what you want while you're
// dragging, which is "have I just made something obviously wrong".
function runChecks() {
  const d = state.data, lv = getLevel();
  const bad = [], warn = [], info = [];
  const ground = lv.platforms.filter(p => p.ground).sort((a, b) => a.x - b.x);
  const groundAt = x => ground.find(p => x >= p.x && x <= p.x + p.width);

  // gaps, with the carry numbers applied
  for (let i = 1; i < ground.length; i++) {
    const edge = ground[i - 1].x + ground[i - 1].width;
    const size = ground[i].x - edge;
    if (size <= 2) continue;
    const step = ground[i - 1].y - ground[i].y;
    const verdict = size > CARRY_RUN ? 'TOO WIDE' : size > CARRY_WALK ? 'run only' : 'walk ok';
    const line = `gap ${edge}–${ground[i].x} (${size}px${step ? `, ${step > 0 ? '+' : ''}${step}px step` : ''}) ${verdict}`;
    if (size > CARRY_RUN) bad.push(line); else info.push(line);
  }

  (d.hazards || []).forEach((h, i) => {
    const seg = groundAt(h.x);
    if (!seg) { bad.push(`hazards[${i}] at ${h.x} hangs over nothing`); return; }
    const runOut = (seg.x + seg.width) - (h.x + h.width);
    if (h.width <= 200 && runOut < 90) {
      bad.push(`hazards[${i}] at ${h.x}: only ${runOut}px of ground after it — clearing it lands in the pit`);
    }
    if (h.width > 200) {
      const stones = (d.platforms || []).filter(p => p.x + p.width > h.x && p.x < h.x + h.width);
      if (stones.length < 2) warn.push(`hazards[${i}] is ${h.width}px wide with ${stones.length} platform(s) over it — two is the fair shape`);
    }
  });

  const REACH = { passive: 30, pursuer: 240, aggressor: 340 };
  (d.enemies || []).forEach((e, i) => {
    const box = { x: e.x, y: e.y, width: e.w, height: e.w };
    if (isBlocked(box, { hazards: !e.boss })) bad.push(`enemies[${i}] at ${e.x} is standing inside terrain — it will be stuck`);
    if (e.minX != null && (e.x < e.minX - 1 || e.x + e.w > e.maxX + 1)) {
      warn.push(`enemies[${i}] starts outside its own patrol`);
    }
  });

  (d.checkpoints || []).forEach((c, i) => {
    if (!groundAt(c.x)) bad.push(`checkpoints[${i}] at ${c.x} has no ground under it`);
    const near = (d.enemies || []).find(e => {
      if (e.boss) return false;
      const r = REACH[e.tier || 'passive'] || 30;
      return e.minX != null && c.x > e.minX - r && c.x < e.maxX + r;
    });
    if (near) warn.push(`checkpoints[${i}] at ${c.x} is inside a ${near.tier || 'passive'} enemy's reach`);
  });

  if (!groundAt(d.playerSpawn.x)) bad.push('the player spawns with no ground under them');
  const last = ground[ground.length - 1];
  if (last && last.y !== d.groundY) warn.push(`the level ends on a terrace (y${last.y}) — the edge transition assumes groundY`);

  const html = [];
  bad.forEach(t => html.push(`<div class="bad">✗ ${t}</div>`));
  warn.forEach(t => html.push(`<div class="warn">! ${t}</div>`));
  if (!bad.length && !warn.length) html.push('<div class="good">✓ nothing obviously wrong</div>');
  info.forEach(t => html.push(`<div style="color:#7a84a8">${t}</div>`));
  html.push('<div style="color:#7a84a8;margin-top:6px">run tools/level-audit-probe.html for the real verdict</div>');
  document.getElementById('checks').innerHTML = html.join('');
}

// --- the change list ---------------------------------------------------
const lit = v => Array.isArray(v) ? `[${v.join(', ')}]`
  : typeof v === 'object' ? `{ ${Object.entries(v).map(([k, x]) => `${k}: ${typeof x === 'string' ? `'${x}'` : x}`).join(', ')} }`
  : String(v);

function diffList(name, before = [], after = []) {
  const lines = [];
  const n = Math.max(before.length, after.length);
  for (let i = 0; i < n; i++) {
    const a = before[i], b = after[i];
    if (a === undefined) { lines.push(`${name}[+]  add   ${lit(b)}`); continue; }
    if (b === undefined) { lines.push(`${name}[${i}]  REMOVE  (was ${lit(a)})`); continue; }
    if (Array.isArray(a)) {
      if (a[0] !== b[0] || a[1] !== b[1]) lines.push(`${name}[${i}]  ${lit(a)} -> ${lit(b)}`);
      continue;
    }
    Object.keys({ ...a, ...b }).forEach(k => {
      // By value, not by reference. `original` and `data` are separate deep
      // clones, so any object-valued field — a platform's `move`, say —
      // compares unequal every single time and the change list fills up with
      // "move [object Object] -> [object Object]" for things nobody touched.
      const same = typeof a[k] === 'object' || typeof b[k] === 'object'
        ? JSON.stringify(a[k]) === JSON.stringify(b[k])
        : a[k] === b[k];
      if (!same) lines.push(`${name}[${i}].${k}  ${lit(a[k])} -> ${lit(b[k])}`);
    });
  }
  return lines;
}

function refreshExport() {
  const o = state.original, d = state.data;
  const lines = [
    ...diffList('ground', o.ground, d.ground),
    ...diffList('platforms', o.platforms, d.platforms),
    ...diffList('hazards', o.hazards, d.hazards),
    ...diffList('enemies', o.enemies, d.enemies),
    ...diffList('coins', o.coins, d.coins),
    ...diffList('checkpoints', o.checkpoints, d.checkpoints)
  ];
  if (o.playerSpawn.x !== d.playerSpawn.x || o.playerSpawn.y !== d.playerSpawn.y) {
    lines.unshift(`playerSpawn  ${lit(o.playerSpawn)} -> ${lit(d.playerSpawn)}`);
  }
  const file = `src/levels/data/${d.id}.js`;
  document.getElementById('out').textContent = lines.length
    ? `${file}\n\n${lines.join('\n')}\n\n(apply by hand — the comments in that file are worth more than the typing)`
    : 'no changes yet';
}

// --- the property panel ------------------------------------------------
function refreshProps() {
  const el = document.getElementById('props');
  const s = state.sel;
  if (!s) { el.textContent = 'nothing selected'; refreshExport(); runChecks(); return; }
  const d = state.data;
  const obj = s.list === 'coins' ? { x: d.coins[s.index][0], y: d.coins[s.index][1] } : d[s.list][s.index];
  const rows = Object.entries(obj)
    .filter(([, v]) => typeof v === 'number')
    .map(([k, v]) => `<div class="row"><label>${k}</label><input data-k="${k}" value="${v}"></div>`);
  el.innerHTML = `<div style="color:#8effc0;margin-bottom:6px">${s.list}[${s.index}]</div>${rows.join('')}`;
  el.querySelectorAll('input').forEach(inp => {
    inp.onchange = () => {
      const v = parseFloat(inp.value);
      if (!Number.isFinite(v)) return;
      snapshot('field:' + inp.dataset.k);
      const k = inp.dataset.k;
      if (s.list === 'coins') d.coins[s.index][k === 'x' ? 0 : 1] = v;
      else d[s.list][s.index][k] = v;
      sync(); refreshProps();
    };
  });
  refreshExport();
  runChecks();
}

// --- input -------------------------------------------------------------
let panning = null;

canvas.addEventListener('mousedown', e => {
  const r = canvas.getBoundingClientRect();
  const w = toWorld(e.clientX - r.left, e.clientY - r.top);
  // A handle on the current selection wins over anything underneath it —
  // otherwise the left edge of a platform is unreachable whenever something
  // else overlaps it, which on a terrace is most of the time.
  const handle = hitHandle(w.x, w.y);
  if (handle) {
    snapshot();   // a mouse gesture is its own undo step
    state.drag = { wx: w.x, wy: w.y, handle: handle.id };
    return;
  }
  const hit = pick(w.x, w.y);
  if (hit) {
    state.sel = hit;
    snapshot();   // ...as is this one
    state.drag = { wx: w.x, wy: w.y };
    refreshProps();
  } else {
    state.sel = null;
    panning = { x: e.clientX, y: e.clientY, cx: state.cam.x, cy: state.cam.y };
    refreshProps();
  }
});

canvas.addEventListener('mousemove', e => {
  const r = canvas.getBoundingClientRect();
  state.mouse = toWorld(e.clientX - r.left, e.clientY - r.top);
  if (panning) {
    state.cam.x = panning.cx - (e.clientX - panning.x) / state.zoom;
    state.cam.y = panning.cy - (e.clientY - panning.y) / state.zoom;
    return;
  }
  if (state.drag && state.sel) {
    if (state.drag.handle) {
      applyHandle(state.drag.handle, state.mouse.x, state.mouse.y);
      sync();
    } else {
      moveSelected(state.mouse.x - state.drag.wx, state.mouse.y - state.drag.wy);
      state.drag.wx = state.mouse.x;
      state.drag.wy = state.mouse.y;
    }
    refreshProps();
  }
});

window.addEventListener('mouseup', () => { panning = null; state.drag = null; });

window.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
  const step = e.shiftKey ? 10 : 1;
  const nudges = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
  if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
    e.preventDefault();
    if (e.shiftKey) redo(); else undo();
    return;
  }
  if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) { e.preventDefault(); redo(); return; }
  if (nudges[e.key] && state.sel) {
    e.preventDefault();
    snapshot('nudge');
    moveSelected(...nudges[e.key]);
    refreshProps();
    return;
  }
  if ((e.key === 'Delete' || e.key === 'Backspace') && state.sel) { e.preventDefault(); removeSelected(); }
});

function removeSelected() {
  const s = state.sel;
  if (!s) return;
  snapshot();
  state.data[s.list].splice(s.index, 1);
  state.sel = null;
  sync(); refreshProps();
}

// New things land in the middle of the view, on the surface where that's
// the only sensible place for them.
function centreWorld() {
  return { x: Math.round(state.cam.x + W() / state.zoom / 2), y: Math.round(state.cam.y + H() / state.zoom / 2) };
}

function add(list, make) {
  const c = centreWorld();
  snapshot();
  state.data[list] = state.data[list] || [];
  state.data[list].push(make(c));
  state.sel = { list, index: state.data[list].length - 1 };
  sync(); refreshProps();
}

const on = (id, fn) => document.getElementById(id).addEventListener('click', fn);

on('addPlatform', () => add('platforms', c => ({ x: c.x, y: c.y, width: 110, height: 18 })));
on('addSpikes', () => add('hazards', c => ({ type: 'spikes', x: c.x, width: 55 })));
on('addEnemy', () => add('enemies', c => {
  const y = surfaceYAt(c.x) - 22;
  return { x: c.x, y, w: 22, minX: c.x - 60, maxX: c.x + 120, speed: 1.6 };
}));
on('addCoin', () => add('coins', c => [c.x, c.y]));
on('addCheckpoint', () => add('checkpoints', c => {
  const y = surfaceYAt(c.x) - 70;
  return { x: c.x, y, width: 8, height: 70 };
}));
on('del', removeSelected);
on('undo', undo);
on('redo', redo);
on('revert', () => loadIndex(state.levelIndex));

on('arcBtn', e => {
  state.showArc = !state.showArc;
  e.currentTarget.classList.toggle('on', state.showArc);
});

on('zoomBtn', e => {
  const c = centreWorld();
  state.zoom = state.zoom === 1 ? 0.5 : 1;
  state.cam.x = c.x - W() / state.zoom / 2;
  state.cam.y = c.y - H() / state.zoom / 2;
  e.currentTarget.classList.toggle('on', state.zoom !== 1);
});

on('copy', () => {
  navigator.clipboard.writeText(document.getElementById('out').textContent)
    .then(() => { document.getElementById('copy').textContent = 'copied';
                  setTimeout(() => { document.getElementById('copy').textContent = 'copy changes'; }, 1200); })
    .catch(() => {});
});

const picker = document.getElementById('levelPick');
levels.forEach((l, i) => {
  const opt = document.createElement('option');
  opt.value = i;
  opt.textContent = `${i + 1} — ${l.name}`;
  picker.appendChild(opt);
});
picker.addEventListener('change', () => loadIndex(parseInt(picker.value, 10)));

// ?level=2 opens that level (1-based, same as the game's own flag), ?arc=1
// starts with the jump guide on. Worth having so a particular spot can be
// bookmarked or linked rather than clicked back to.
const params = new URLSearchParams(location.search);
const wanted = parseInt(params.get('level') || '1', 10) - 1;
if (params.get('arc')) {
  state.showArc = true;
  document.getElementById('arcBtn').classList.add('on');
}
if (params.has('x')) state.cam.x = parseFloat(params.get('x'));

loadIndex(Number.isFinite(wanted) && wanted >= 0 && wanted < levels.length ? wanted : 0);
if (params.has('x')) state.cam.x = parseFloat(params.get('x'));
picker.value = String(state.levelIndex);
draw();

// Exposed for tools/level-editor-probe.html only.
//
// An editor is all mouse and keyboard, and none of that can be checked by
// loading the page and looking at it — which is exactly how a tool quietly
// stops round-tripping correctly. The probe drives real pointer and key
// events at the canvas; it needs the camera to know where on screen a given
// world coordinate has ended up.
window.__editor = {
  state,
  toScreen,
  loadIndex,
  handles: () => handlesFor(),
  undoDepth: () => undoStack.length,
  select: (list, index) => { state.sel = { list, index }; refreshProps(); }
};
