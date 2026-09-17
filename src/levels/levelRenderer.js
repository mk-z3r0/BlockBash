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

export function drawPlatforms() {
  const { platforms } = getLevel();

  // Fills first. Ground segments are filled without their own outline so that
  // two flush segments read as one continuous surface.
  for (const p of platforms) {
    if (p.width <= 1) continue;
    if (p.ground) {
      ctx.fillStyle = '#1c2547';
      ctx.fillRect(p.x, p.y, p.width, p.height);
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

export function drawGoal() {
  const { goal } = getLevel();
  ctx.fillStyle = '#5ee7ff';
  ctx.fillRect(goal.x, goal.y, 4, goal.height);
  ctx.fillStyle = '#f2c14e';
  ctx.beginPath();
  ctx.moveTo(goal.x + 4, goal.y + 6);
  ctx.lineTo(goal.x + 44, goal.y + 18);
  ctx.lineTo(goal.x + 4, goal.y + 34);
  ctx.closePath();
  ctx.fill();
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
