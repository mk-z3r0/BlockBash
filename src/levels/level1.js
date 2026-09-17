// Level 1 geometry, hazards, and spawn data. This is the one hardcoded level
// for now — Phase 1 turns this into a general loader, but the shape of this
// module (data + a few level-specific behaviors) is meant to carry over.
import { ctx } from '../engine/renderer.js';
import { GROUND_Y } from '../engine/physics.js';

export const platforms = [
  { x: 0,    y: GROUND_Y, width: 420, height: 40, ground: true },
  { x: 580,  y: GROUND_Y, width: 770, height: 40, ground: true },
  { x: 1560, y: GROUND_Y, width: 590, height: 40, ground: true },
  { x: 2320, y: GROUND_Y, width: 880, height: 40, ground: true },

  { x: 150,  y: 320, width: 120, height: 18 },
  { x: 470,  y: 330, width: 90,  height: 18 },
  { x: 650,  y: 300, width: 120, height: 18 },
  { x: 900,  y: 230, width: 100, height: 18 },
  { x: 1150, y: 320, width: 100, height: 18 },
  { x: 1620, y: 280, width: 140, height: 18 },
  { x: 1750, y: 200, width: 100, height: 18 },
  { x: 2040, y: 300, width: 190, height: 18 },
  { x: 2350, y: 260, width: 130, height: 18 },
  { x: 2600, y: 200, width: 100, height: 18 },
  { x: 2850, y: 300, width: 120, height: 18 }
];

// The troll pit's stepping-stone island: it looks like an ordinary ledge in
// the middle of a wide pit, but it eases sideways while the player is airborne
// over the pit, then eases back once they land. The pit spans 1350-1560 with
// the island resting at 1400-1480, so the island is genuinely needed to cross
// — which is exactly what makes moving it a good prank.
const TRICK_SHIFT = 38;  // how far the island slides, in pixels
const TRICK_EASE = 0.09; // how smoothly it eases toward its target (lower = smoother/slower)
export const trickLip = { x: 1400, baseX: 1400, offset: 0, y: GROUND_Y, width: 80, height: 40, ground: true, trick: true };
platforms.push(trickLip);

// The last pit's retracting ledge. At rest it fills 2190-2320, leaving a
// piddly 40px pit (half the original 80px) that looks trivially jumpable.
// The moment the player leaves the ground it retracts completely, stretching
// the pit to 170px and holding it open for the whole jump: too far to clear
// from ground level, but just makeable from the raised platform at 2040-2170.
const RETRACT_EASE = 0.12;
export const retractLedge = {
  x: 2190, baseX: 2190, baseWidth: 130, progress: 0,
  y: GROUND_Y, width: 130, height: 40, ground: true, retract: true
};
platforms.push(retractLedge);

// The FIRST pit's eroding lip. It looks like ordinary ground running out to
// x=500. The moment the player is airborne over the pit it crumbles backwards
// — its right edge (the near side of the opening) pulls in toward the player,
// stretching the pit from 80px to 160px beneath them. The platform at 470-560
// is the way across once that happens.
const ERODE_EASE = 0.14;
export const erodeLip = {
  x: 420, baseX: 420, baseWidth: 80, progress: 0,
  y: GROUND_Y, width: 80, height: 40, ground: true, erode: true
};
platforms.push(erodeLip);

export const goal = { x: 3100, y: 200, width: 10, height: GROUND_Y - 200 };
export const checkpoint = { x: 1600, y: GROUND_Y - 70, width: 8, height: 70, activated: false };

// Boss cutscene trigger point (see scenes/playingScene.js).
export const BOSS_WAKE_X = 2560;
export const BOSS_CHARGE_SPEED = 2.4;

export function resetDynamicPlatforms() {
  trickLip.offset = 0;
  trickLip.x = trickLip.baseX;
  retractLedge.progress = 0;
  retractLedge.x = retractLedge.baseX;
  retractLedge.width = retractLedge.baseWidth;
  erodeLip.progress = 0;
  erodeLip.width = erodeLip.baseWidth;
  checkpoint.activated = false;
}

// Eases the three trick platforms based on the player's position/airborne
// state. Returns how far trickLip moved this frame, so the caller can carry
// the player along with it if they're standing on it (it doesn't get left
// behind as the ledge eases back).
export function updateDynamicPlatforms(player) {
  const nearTrollPit = player.x + player.width > 1300 && player.x < 1640;
  const trickTarget = (nearTrollPit && !player.isOnGround) ? TRICK_SHIFT : 0;
  trickLip.offset += (trickTarget - trickLip.offset) * TRICK_EASE;
  const prevTrickLipX = trickLip.x;
  trickLip.x = trickLip.baseX + trickLip.offset;
  const trickLipDelta = trickLip.x - prevTrickLipX;

  const nearLastPit = player.x + player.width > 2090 && player.x < 2400;
  const retractTarget = (nearLastPit && !player.isOnGround) ? 1 : 0;
  retractLedge.progress += (retractTarget - retractLedge.progress) * RETRACT_EASE;
  retractLedge.x = retractLedge.baseX + retractLedge.progress * retractLedge.baseWidth;
  retractLedge.width = retractLedge.baseWidth * (1 - retractLedge.progress);

  const nearFirstPit = player.x + player.width > 330 && player.x < 640;
  const erodeTarget = nearFirstPit ? 1 : 0;
  erodeLip.progress += (erodeTarget - erodeLip.progress) * ERODE_EASE;
  erodeLip.width = erodeLip.baseWidth * (1 - erodeLip.progress);

  return trickLipDelta;
}

export function createEnemies() {
  const base = [
    { x: 250,  y: GROUND_Y - 22, w: 22, minX: 220,  maxX: 460,  speed: 1.4 },
    { x: 700,  y: GROUND_Y - 22, w: 22, minX: 650,  maxX: 950,  speed: 1.7 },
    { x: 660,  y: 300 - 20,      w: 20, minX: 655,  maxX: 750,  speed: 1.1 },
    { x: 1600, y: GROUND_Y - 22, w: 22, minX: 1580, maxX: 1800, speed: 1.6 },
    { x: 1760, y: 200 - 20,      w: 20, minX: 1755, maxX: 1830, speed: 1.0 },
    { x: 2980, y: GROUND_Y - 26, w: 26, minX: 2900, maxX: 3100, speed: 1.2, boss: true },
    { x: 2360, y: 260 - 20,      w: 20, minX: 2355, maxX: 2460, speed: 1.1 }
  ];
  return base.map(e => ({
    ...e,
    alive: true,
    squish: 0,
    baseY: e.y,
    baseX: e.x,
    hopVY: 0,
    hopTimer: 90 + Math.floor(Math.random() * 150), // ticks down to the next surprise hop
    shout: 0,
    awake: false,   // boss only: has the chainsaw come out yet
    sawRev: 0       // boss only: chainsaw spin/buzz timer
  }));
}

export function createCoins() {
  const pts = [
    [180, 280], [230, 280], [680, 260], [730, 260],
    [920, 190], [1170, 280], [1220, 280], [1530, 240],
    [1580, 240], [1770, 160], [2075, 260], [2125, 260],
    [2370, 220], [2620, 160], [2870, 260], [2920, 260],
    [1000, 380], [1900, 380], [2900, 380]
  ];
  return pts.map(p => ({ x: p[0], y: p[1], size: 12, collected: false }));
}

// Hazard stripes: any ground edge with an actual gap after it gets a visible
// warning strip. Computed fresh each frame (rather than once at startup) so
// the stripes on the moving ledges travel with them instead of hanging in midair.
const HAZARD_WIDTH = 18;
function computeHazardStripes() {
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

function drawHazardStripes() {
  // diagonal amber/dark hazard tape along the top edge of every ground
  // segment that borders a pit — visible well before the player reaches it
  for (const h of computeHazardStripes()) {
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
  // Fills first. Ground segments are filled without their own outline so that
  // two flush segments read as one continuous surface — otherwise the seam
  // between them gives away where the retracting ledge is hiding.
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

  drawHazardStripes();
}

export function drawGoal() {
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

export function drawCheckpoint() {
  const color = checkpoint.activated ? '#8effc0' : '#3a4a6a';
  ctx.fillStyle = color;
  ctx.fillRect(checkpoint.x, checkpoint.y, 4, checkpoint.height);
  ctx.beginPath();
  ctx.moveTo(checkpoint.x + 4, checkpoint.y + 4);
  ctx.lineTo(checkpoint.x + 26, checkpoint.y + 12);
  ctx.lineTo(checkpoint.x + 4, checkpoint.y + 20);
  ctx.closePath();
  ctx.fill();
}
