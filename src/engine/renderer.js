// Canvas setup, plus the shared stick-figure limb art used by both the
// player and the enemy spheres (see ENGINEERING NOTES in the original file:
// they intentionally share the exact same limb-drawing code).
export const canvas = document.getElementById('game');
export const ctx = canvas.getContext('2d');
export const VIEW_WIDTH = canvas.width;
export const VIEW_HEIGHT = canvas.height;

export const SKIN_FILL = '#e0a878';
export const SKIN_LINE = '#b07d52';
const ARM_SCALE = 0.5;  // overall arm thickness — bicep bulge and fist scale together
const ARM_LENGTH = 0.5; // fraction of the full reach the arm actually extends

// Where the hand ends up, given a shoulder and the arm's full-reach target.
// Shared so anything held in the hand lines up with the drawn arm.
export function armEnd(shoulderX, shoulderY, fistX, fistY) {
  return {
    x: shoulderX + (fistX - shoulderX) * ARM_LENGTH,
    y: shoulderY + (fistY - shoulderY) * ARM_LENGTH
  };
}

export function drawStickLegs(hipY, groundY, swing) {
  ctx.strokeStyle = SKIN_LINE;
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-5, hipY);
  ctx.lineTo(-5 + swing * 0.3, groundY);
  ctx.moveTo(5, hipY);
  ctx.lineTo(5 - swing * 0.3, groundY);
  ctx.stroke();
}

export function drawMuscleArm(shoulderX, shoulderY, fistX, fistY) {
  const end = armEnd(shoulderX, shoulderY, fistX, fistY);
  const len = Math.hypot(end.x - shoulderX, end.y - shoulderY);
  const angle = Math.atan2(end.y - shoulderY, end.x - shoulderX);
  const s = ARM_SCALE;

  ctx.save();
  ctx.translate(shoulderX, shoulderY);
  ctx.rotate(angle);
  ctx.fillStyle = SKIN_FILL;
  ctx.strokeStyle = SKIN_LINE;
  ctx.lineWidth = 1.5;

  // one tapered limb: narrow at the shoulder, bulging at the bicep,
  // tapering again to the wrist
  ctx.beginPath();
  ctx.moveTo(0, -4 * s);
  ctx.quadraticCurveTo(len * 0.32, -11 * s, len * 0.62, -5.5 * s);
  ctx.quadraticCurveTo(len * 0.85, -4 * s, len, -3 * s);
  ctx.lineTo(len, 3 * s);
  ctx.quadraticCurveTo(len * 0.85, 4 * s, len * 0.62, 5.5 * s);
  ctx.quadraticCurveTo(len * 0.32, 11 * s, 0, 4 * s);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // fist, kept in proportion to the bicep
  ctx.beginPath();
  ctx.arc(len, 0, 5 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  return { x: end.x, y: end.y, angle };
}

// A pickaxe, drawn with the grip end of the handle AT the transform origin
// — the caller translates to the hand position first, then scale(facing, 1)
// + rotate (see weapons/pickaxe.js and entities/enemy.js). The origin being
// the grip end (not somewhere along the handle) is deliberate: whoever's
// holding it should look like they're gripping the end of the handle, not
// its middle. Everything else (rest of handle + head) extends outward from
// there toward +x/-y. Same shape serves the boss's threat swing, the
// player's earned swing, and the dropped pickup lying on the ground.
//
// Shaped like the classic pickaxe silhouette: one continuous curved head
// mounted through the end of the handle, tapering to a point at both ends —
// not two separate axe-blade wedges, which read as a hatchet instead.
export function drawPickaxeIcon() {
  // handle — starts exactly at the origin (the grip)
  ctx.strokeStyle = '#8a6238';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(18, -13);
  ctx.stroke();

  // head: a single curved spike through the end of the handle, sharp at
  // both tips, wide in the middle
  ctx.fillStyle = '#9aa6bb';
  ctx.strokeStyle = '#4d5566';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(15, -28);                     // top tip
  ctx.quadraticCurveTo(27, -20, 30, -3);   // down the outer (right) edge
  ctx.lineTo(27, -1);                      // bottom tip
  ctx.quadraticCurveTo(22, -14, 11, -24);  // back up the inner (left) edge
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

export function drawBackground(cameraX) {
  ctx.fillStyle = '#10162c';
  ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

  ctx.save();
  const farOffset = -cameraX * 0.15;
  ctx.fillStyle = 'rgba(255, 77, 141, 0.06)';
  for (let i = 0; i < 8; i++) {
    const cx = (i * 420 + farOffset) % (VIEW_WIDTH + 800) - 200;
    ctx.beginPath();
    ctx.arc(cx, 90 + (i % 3) * 40, 60, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  ctx.save();
  const gridOffset = -cameraX * 0.4;
  ctx.strokeStyle = 'rgba(242, 193, 78, 0.05)';
  ctx.lineWidth = 1;
  const spacing = 40;
  for (let x = (gridOffset % spacing); x < VIEW_WIDTH; x += spacing) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, VIEW_HEIGHT);
    ctx.stroke();
  }
  for (let y = 0; y < VIEW_HEIGHT; y += spacing) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(VIEW_WIDTH, y);
    ctx.stroke();
  }
  ctx.restore();
}
