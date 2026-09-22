import { ctx } from '../engine/renderer.js';
import { getLevel } from './levelLoader.js';

// Hazard stripes: any ground edge with an actual gap after it gets a visible
// warning strip. Computed fresh each frame so stripes on any moving ledge
// travel with it instead of hanging in midair.
const HAZARD_WIDTH = 18;

function computeHazardStripes(platforms) {
  const stripes = [];
  const segs = platforms.filter(p => p.ground && p.width > 2).sort((a, b) => a.x - b.x);
  segs.forEach((seg, i) => {
    if (i === 0) return;
    const prev = segs[i - 1];
    if (seg.x - (prev.x + prev.width) > 2) {
      stripes.push({ x: prev.x + prev.width - HAZARD_WIDTH, y: prev.y, width: HAZARD_WIDTH });
      stripes.push({ x: seg.x, y: seg.y, width: HAZARD_WIDTH });
    }
  });
  return stripes;
}

function drawHazardStripes(platforms) {
  // diagonal amber/dark hazard tape along the top edge of every ground
  // segment that borders a pit — visible well before the player reaches it
  for (const h of computeHazardStripes(platforms)) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(h.x, h.y, h.width, 6);
    ctx.clip();
    ctx.fillStyle = '#1c2547';
    ctx.fillRect(h.x, h.y, h.width, 6);
    ctx.fillStyle = '#f2c14e';
    const stripeSpacing = 8;
    for (let sx = h.x - 6; sx < h.x + h.width + 6; sx += stripeSpacing) {
      ctx.beginPath();
      ctx.moveTo(sx, h.y + 6);
      ctx.lineTo(sx + 4, h.y);
      ctx.lineTo(sx + 8, h.y);
      ctx.lineTo(sx + 4, h.y + 6);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }
}

// --- Carved undersides ---------------------------------------------------
//
// Visual texture, nothing more. A floating platform sitting over a spike bed
// gets its underside bitten away and its bottom corners cut off, in the same
// square-minus-its-corners language the spheres use elsewhere.
//
// Deliberately NOT a story about where the spikes came from: spikes are just
// an obstacle (see the "Spikes" row in Decisions made). An earlier pass had
// them as debris carved out of the surface overhead, which only ever applied
// to two platforms in one level and wanted more scaffolding than it repaid.
//
// Derived from level data rather than authored per platform, the way hazard
// stripes and the world edge are, so it costs nothing in a later level.
const CARVE_SCOOP = 22;   // target width of one bite; the real one divides evenly
const CARVE_DEPTH = 8;    // how far the deepest bite eats up into the slab
const CARVE_CHAMFER = 5;  // how much of each bottom corner is gone

function isOverSpikes(p, hazards) {
  if (p.ground) return false;
  return hazards.some(h =>
    h.type === 'spikes' &&
    h.y > p.y + p.height &&                      // genuinely below the slab
    h.x < p.x + p.width && h.x + h.width > p.x   // and overlapping it
  );
}

// Deterministic per-bite variation, so a slab always chews the same way
// instead of shimmering frame to frame. Keyed off the platform's ORIGINAL x
// (`baseX` on anything that slides) so a moving ledge carries its damage with
// it rather than re-rolling the pattern as it travels.
function hash(seed, i) {
  const n = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453;
  return n - Math.floor(n);            // 0..1
}

function scoopDepth(g, i) {
  return CARVE_DEPTH * (0.35 + hash(g.seed, i) * 0.65);
}

// Where bite `i` starts. The interior boundaries jitter sideways, because
// evenly spaced bites read as decorative scalloping rather than as something
// having eaten the rock. The two ends stay put so the chamfers stay clean.
function boundary(g, i) {
  if (i === 0) return g.spanL;
  if (i === g.count) return g.spanR;
  return g.spanL + i * g.w + (hash(g.seed + 101, i) - 0.5) * g.w * 0.55;
}

function carveGeometry(p) {
  const spanL = p.x + CARVE_CHAMFER;
  const spanR = p.x + p.width - CARVE_CHAMFER;
  const count = Math.max(2, Math.round((spanR - spanL) / CARVE_SCOOP));
  return {
    spanL, spanR, count,
    w: (spanR - spanL) / count,
    bottom: p.y + p.height,
    seed: Math.round(p.baseX ?? p.x)
  };
}

// The bitten edge, traced right-to-left from the current point. Each bite is
// a scoop pushed up into the slab; the control point sits at twice the depth
// because a quadratic peaks halfway to it.
function scoopPath(g) {
  for (let i = g.count - 1; i >= 0; i--) {
    const x0 = boundary(g, i), x1 = boundary(g, i + 1);
    ctx.quadraticCurveTo((x0 + x1) / 2, g.bottom - scoopDepth(g, i) * 2, x0, g.bottom);
  }
}

// Drawing only — collision still uses the full rect (engine/physics.js never
// looks at this), so a slab stays exactly as solid as it looks from above,
// which is the surface that matters. The bites are shallow enough that the
// difference is invisible on a head-bonk from below.
function drawCarvedPlatform(p) {
  const g = carveGeometry(p);

  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.lineTo(p.x + p.width, p.y);
  ctx.lineTo(p.x + p.width, g.bottom - CARVE_CHAMFER);
  ctx.lineTo(g.spanR, g.bottom);
  scoopPath(g);
  ctx.lineTo(p.x, g.bottom - CARVE_CHAMFER);
  ctx.closePath();

  ctx.fillStyle = '#232f5c';
  ctx.fill();
  ctx.strokeStyle = '#3a4a82';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Freshly exposed material along the bitten edge only, clipped to the slab
  // so it reads as inside-the-rock rather than as a glow hanging under it.
  // Deliberately the same pale tone the spikes below are drawn in — that's
  // the point of the whole detail: this is where they came from.
  ctx.save();
  ctx.clip();
  ctx.beginPath();
  ctx.moveTo(g.spanR, g.bottom);
  scoopPath(g);
  ctx.strokeStyle = 'rgba(232, 238, 248, 0.26)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

export function drawPlatforms() {
  const { platforms, hazards } = getLevel();

  // Fills first. Ground segments are filled without their own outline so that
  // two flush segments read as one continuous surface.
  for (const p of platforms) {
    if (p.width <= 1) continue;
    if (p.ground) {
      ctx.fillStyle = '#1c2547';
      ctx.fillRect(p.x, p.y, p.width, p.height);
    } else if (isOverSpikes(p, hazards)) {
      drawCarvedPlatform(p);
    } else {
      ctx.fillStyle = '#232f5c';
      ctx.fillRect(p.x, p.y, p.width, p.height);
      ctx.strokeStyle = '#3a4a82';
      ctx.lineWidth = 2;
      ctx.strokeRect(p.x + 1, p.y + 1, p.width - 2, p.height - 2);
    }
  }

  // Ground outlines: a top line along every segment, but vertical edges only
  // where an actual pit begins or ends.
  const segs = platforms.filter(p => p.ground && p.width > 1).sort((a, b) => a.x - b.x);
  ctx.strokeStyle = '#3a4a82';
  ctx.lineWidth = 2;
  segs.forEach((seg, i) => {
    const prev = segs[i - 1];
    const next = segs[i + 1];
    const gapBefore = !prev || (seg.x - (prev.x + prev.width) > 2);
    const gapAfter = !next || (next.x - (seg.x + seg.width) > 2);

    ctx.beginPath();
    ctx.moveTo(seg.x, seg.y + 1);
    ctx.lineTo(seg.x + seg.width, seg.y + 1);
    ctx.stroke();

    if (gapBefore) {
      ctx.beginPath();
      ctx.moveTo(seg.x + 1, seg.y + 1);
      ctx.lineTo(seg.x + 1, seg.y + seg.height);
      ctx.stroke();
    }
    if (gapAfter) {
      ctx.beginPath();
      ctx.moveTo(seg.x + seg.width - 1, seg.y + 1);
      ctx.lineTo(seg.x + seg.width - 1, seg.y + seg.height);
      ctx.stroke();
    }
  });

  drawHazardStripes(platforms);
}

const SPIKE_HEIGHT = 16;
const SPIKE_TOOTH = 16; // target width per tooth; actual width divides evenly

export function drawHazards() {
  for (const h of getLevel().hazards) {
    if (h.type !== 'spikes') continue;

    // dark mounting band, so spikes read as sitting ON the surface
    ctx.fillStyle = '#2d3340';
    ctx.fillRect(h.x, h.y - 3, h.width, 4);

    const count = Math.max(1, Math.round(h.width / SPIKE_TOOTH));
    const w = h.width / count;
    const grad = ctx.createLinearGradient(0, h.y - SPIKE_HEIGHT, 0, h.y);
    grad.addColorStop(0, '#e8eef8');
    grad.addColorStop(1, '#5b6678');

    for (let i = 0; i < count; i++) {
      const x = h.x + i * w;
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(x, h.y);
      ctx.lineTo(x + w / 2, h.y - SPIKE_HEIGHT);
      ctx.lineTo(x + w, h.y);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#3a4a82';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
}

// The literal edge of this cube face, at `worldEdgeX` (where the ground data
// actually stops — see levelLoader.js). Nothing here collides with anything:
// it's backdrop for scenes/playingScene.js's edge-transition state machine,
// which is what walks the player up to this point and rotates the world
// around it. Computed from level data rather than authored per level, so it
// appears at the end of every level for free.
//
// Two things this deliberately does NOT do, both from playtesting it
// (2026-09-21):
//
// - Nothing is drawn PAST the edge. An earlier pass filled that space with
//   a ground-coloured slab meant to read as "the next face seen side-on",
//   and it just read as more ground with no outline — the one place the
//   player most needs to understand "this stops here" was the least clear
//   thing on screen. Past the edge is now empty: the parallax grid shows
//   straight through, which is what makes the drop legible at all once the
//   camera pans down to look at it.
// - The seam never rises above `groundY`. A glow sticking up into the air
//   above the surface reads as a beam or a doorway, not as the lip of a
//   cliff. It starts exactly at the top surface and fades downward.
//
// What's left is the geometry that's actually true of a cube corner: the
// bright line where the two faces meet, and the solid interior of the cube
// behind/below it. That interior band is also what the player lands on —
// rotate the whole thing -PI/2 about the corner and the seam becomes the
// new ground's surface line, with the band filling in beneath it.
const EDGE_INTERIOR_DEPTH = 700; // becomes how far the new ground extends rightward once rotated
const EDGE_INTERIOR_BACK = 320;  // becomes how far it extends downward once rotated
const EDGE_SEAM_FADE = 520;      // how far down the corner glow reaches before it's gone

export function drawWorldEdge(frameCount) {
  const { worldEdgeX, groundY } = getLevel();

  // The cube's interior — behind the cut face and below the surface, i.e.
  // left of the seam and under the ground, never past the edge. Kept
  // translucent so the background still reads through it as depth rather
  // than as a second slab of terrain.
  ctx.fillStyle = 'rgba(35, 47, 92, 0.38)';
  ctx.fillRect(worldEdgeX - EDGE_INTERIOR_BACK, groundY, EDGE_INTERIOR_BACK, EDGE_INTERIOR_DEPTH);

  // The corner itself: brightest exactly at the surface, fading with depth.
  // Reads as a glowing lip from here; after the world rotates it's the
  // surface line of the face the player lands on, receding into the
  // distance — the same gradient works for both because it IS both.
  const pulse = 0.85 + Math.sin(frameCount * 0.05) * 0.15;
  const seam = ctx.createLinearGradient(0, groundY, 0, groundY + EDGE_SEAM_FADE);
  seam.addColorStop(0, `rgba(94, 231, 255, ${pulse})`);
  seam.addColorStop(0.35, 'rgba(94, 231, 255, 0.45)');
  seam.addColorStop(1, 'rgba(94, 231, 255, 0)');
  ctx.fillStyle = seam;
  ctx.fillRect(worldEdgeX - 2, groundY, 4, EDGE_SEAM_FADE);

  // a soft bloom either side of the line, same fade, so the corner has some
  // weight to it without widening the line itself
  const bloom = ctx.createLinearGradient(worldEdgeX - 9, 0, worldEdgeX + 9, 0);
  bloom.addColorStop(0, 'rgba(94, 231, 255, 0)');
  bloom.addColorStop(0.5, `rgba(94, 231, 255, ${pulse * 0.28})`);
  bloom.addColorStop(1, 'rgba(94, 231, 255, 0)');
  ctx.fillStyle = bloom;
  ctx.fillRect(worldEdgeX - 9, groundY, 18, EDGE_SEAM_FADE * 0.55);
}

export function drawCheckpoints() {
  for (const checkpoint of getLevel().checkpoints) {
    ctx.fillStyle = checkpoint.activated ? '#8effc0' : '#3a4a6a';
    ctx.fillRect(checkpoint.x, checkpoint.y, 4, checkpoint.height);
    ctx.beginPath();
    ctx.moveTo(checkpoint.x + 4, checkpoint.y + 4);
    ctx.lineTo(checkpoint.x + 26, checkpoint.y + 12);
    ctx.lineTo(checkpoint.x + 4, checkpoint.y + 20);
    ctx.closePath();
    ctx.fill();
  }
}
