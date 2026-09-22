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

// cameraY is 0 for all normal play (see engine/camera.js) — it only moves
// during the level-edge transition's camera pan, and everything here
// parallaxes against it at a much lower factor than the world itself, so
// the backdrop drifts rather than tracking, and the drop past the edge
// reads as genuinely deep rather than as the whole image sliding.
export function drawBackground(cameraX, cameraY = 0) {
  ctx.fillStyle = '#10162c';
  ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

  ctx.save();
  const farOffset = -cameraX * 0.15;
  ctx.fillStyle = 'rgba(255, 77, 141, 0.06)';
  for (let i = 0; i < 8; i++) {
    const cx = (i * 420 + farOffset) % (VIEW_WIDTH + 800) - 200;
    ctx.beginPath();
    ctx.arc(cx, 90 + (i % 3) * 40 - cameraY * 0.15, 60, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  ctx.save();
  const gridOffset = -cameraX * 0.4;
  const gridOffsetY = -cameraY * 0.4;
  ctx.strokeStyle = 'rgba(242, 193, 78, 0.05)';
  ctx.lineWidth = 1;
  const spacing = 40;
  for (let x = (gridOffset % spacing); x < VIEW_WIDTH; x += spacing) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, VIEW_HEIGHT);
    ctx.stroke();
  }
  for (let y = (gridOffsetY % spacing); y < VIEW_HEIGHT; y += spacing) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(VIEW_WIDTH, y);
    ctx.stroke();
  }
  ctx.restore();
}

// A sledgehammer, drawn to the same contract as drawPickaxeIcon(): grip end
// of the handle AT the origin, head extending toward +x/-y, so the two are
// interchangeable in any hand that holds a weapon.
//
// Deliberately blunter and heavier-looking than the pickaxe — a thicker
// handle and a squared-off steel head instead of a tapered spike. The
// silhouette has to say "slow but it hurts" before the player has swung it
// once, because that's exactly how it plays (see weapons/sledgehammer.js).
export function drawSledgehammerIcon() {
  ctx.strokeStyle = '#7d5730';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(20, -15);
  ctx.stroke();

  // the head: a solid block across the end of the handle
  ctx.save();
  ctx.translate(21, -16);
  ctx.rotate(Math.atan2(-15, 20) + Math.PI / 2);
  ctx.fillStyle = '#8f9ab0';
  ctx.strokeStyle = '#464e5e';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.rect(-6, -13, 12, 26);
  ctx.fill();
  ctx.stroke();
  // a lighter band down the striking face, so the block reads as metal
  // rather than as a plain rectangle
  ctx.fillStyle = 'rgba(232, 238, 248, 0.45)';
  ctx.fillRect(-6, -13, 3, 26);
  ctx.restore();
}

// The Cornerstone — the restoration weapon. Same grip-at-origin contract.
//
// It is the one weapon that doesn't destroy anything, so it's drawn as a
// mason's tool rather than a striking one: a short haft with an open
// triangular frame at the end, lit in the same cyan the cube-edge seam uses
// (levels/levelRenderer.js). That colour already means "the world, intact"
// everywhere else in the game, which is the whole idea.
export function drawCornerstoneIcon(glow = 1) {
  ctx.strokeStyle = '#6b5b45';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(15, -11);
  ctx.stroke();

  ctx.save();
  ctx.translate(16, -12);
  ctx.rotate(Math.atan2(-11, 15));
  // the frame: an outlined triangle, point forward — the shape it fires
  ctx.strokeStyle = `rgba(94, 231, 255, ${0.55 + 0.45 * glow})`;
  ctx.lineWidth = 2.4;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(18, 0);
  ctx.lineTo(-2, -11);
  ctx.lineTo(-2, 11);
  ctx.closePath();
  ctx.stroke();
  ctx.fillStyle = `rgba(94, 231, 255, ${0.12 * glow})`;
  ctx.fill();
  ctx.restore();
}

// One restoration triangle in flight, and the same shape used for the
// ammo pips on the HUD. Points along +x before rotation.
export function drawRestoreTriangle(size, alpha = 1) {
  ctx.fillStyle = `rgba(94, 231, 255, ${0.85 * alpha})`;
  ctx.strokeStyle = `rgba(215, 250, 255, ${alpha})`;
  ctx.lineWidth = 1.5;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(size, 0);
  ctx.lineTo(-size * 0.7, -size * 0.85);
  ctx.lineTo(-size * 0.7, size * 0.85);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

// A drilling rig, to the same contract as the other weapon icons: grip end
// at the transform origin, everything extending toward +x/-y.
//
// The Excavator is "a sphere operating a drilling rig" (GAME_DESIGN's boss
// table) and spent a while holding a pickaxe instead, which made it read as
// a slightly bigger Foreman. A rig is a different silhouette on purpose:
// blocky motor housing, a shaft, and a long fluted bit that turns. Nothing
// else in the game has a straight horizontal line that long.
//
// `spin` advances the flutes. Passing the frame count makes it turn.
export function drawDrillIcon(spin = 0) {
  // motor housing
  ctx.fillStyle = '#3f4a5c';
  ctx.strokeStyle = '#222933';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.rect(0, -8, 15, 16);
  ctx.fill();
  ctx.stroke();

  // a vent stripe, so the housing reads as machinery rather than a box
  ctx.fillStyle = '#5b6b82';
  ctx.fillRect(3, -5, 9, 2.5);
  ctx.fillRect(3, 1, 9, 2.5);

  // collar
  ctx.fillStyle = '#8f9ab0';
  ctx.beginPath();
  ctx.rect(15, -5, 5, 10);
  ctx.fill();
  ctx.stroke();

  // the bit: a long taper to a point
  ctx.fillStyle = '#9aa6bb';
  ctx.beginPath();
  ctx.moveTo(20, -4.5);
  ctx.lineTo(40, -1.2);
  ctx.lineTo(40, 1.2);
  ctx.lineTo(20, 4.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // helical flutes, travelling along the bit — this is the whole reason it
  // reads as turning rather than as a spike
  ctx.strokeStyle = 'rgba(232, 238, 248, 0.75)';
  ctx.lineWidth = 1.4;
  const travel = (spin * 0.9) % 6;
  for (let x = 21 + travel; x < 39; x += 6) {
    const t = (x - 20) / 20;
    const halfH = 4.5 - 3.3 * t;
    ctx.beginPath();
    ctx.moveTo(x, -halfH);
    ctx.lineTo(x + 2.5, halfH);
    ctx.stroke();
  }
}
