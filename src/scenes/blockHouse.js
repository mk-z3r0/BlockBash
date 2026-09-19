import { ctx } from '../engine/renderer.js';

// The player's home — shared between the opening cutscene (a close-up,
// where the corner-explosion is felt and the door opens) and level 1's
// background near spawn (a small, distant decoration), so both places
// draw the exact same house rather than two independent approximations
// of it. Square, gold-toned, same family as the player character: home
// reads as "belongs to the same people you're playing as."
export function drawBlockHouse(cx, groundY, scale, opts) {
  const doorOpen = opts && opts.doorOpen;
  const shake = (opts && opts.shake) || 0;

  const width = 90 * scale;
  const bodyHeight = 60 * scale;
  const roofHeight = 30 * scale;
  const left = cx - width / 2 + (shake ? (Math.random() - 0.5) * shake : 0);
  const top = groundY - bodyHeight;

  ctx.save();

  // body
  ctx.fillStyle = '#f2c14e';
  ctx.fillRect(left, top, width, bodyHeight);
  ctx.strokeStyle = '#c99a2e';
  ctx.lineWidth = 2 * scale;
  ctx.strokeRect(left, top, width, bodyHeight);

  // roof
  ctx.fillStyle = '#c99a2e';
  ctx.beginPath();
  ctx.moveTo(left - 8 * scale, top);
  ctx.lineTo(cx, top - roofHeight);
  ctx.lineTo(left + width + 8 * scale, top);
  ctx.closePath();
  ctx.fill();

  // window — a small warm glow, the house is lived-in
  const winSize = 14 * scale;
  ctx.fillStyle = 'rgba(255, 223, 122, 0.85)';
  ctx.fillRect(cx - width * 0.28 - winSize / 2, top + bodyHeight * 0.28, winSize, winSize);

  // door
  const doorWidth = 20 * scale;
  const doorHeight = (doorOpen ? 40 : 34) * scale;
  const doorX = cx + width * 0.12;
  if (doorOpen) {
    // swung open: a bright gap into the lit interior
    ctx.fillStyle = 'rgba(255, 223, 122, 0.55)';
    ctx.fillRect(doorX, groundY - doorHeight, doorWidth, doorHeight);
  } else {
    ctx.fillStyle = '#8a6a2e';
    ctx.fillRect(doorX, groundY - doorHeight, doorWidth, doorHeight);
  }
  ctx.strokeStyle = '#c99a2e';
  ctx.lineWidth = 1.5 * scale;
  ctx.strokeRect(doorX, groundY - doorHeight, doorWidth, doorHeight);

  ctx.restore();

  // returns where a character would stand when stepping out the door
  return { doorX: doorX + doorWidth / 2, groundY };
}
