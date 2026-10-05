import { ctx } from '../engine/renderer.js';

// A solid cube with its eight corners cut away. Restoration closes the
// bevels until only the six square faces remain. Project and shade each
// face separately so turning the core exposes real depth and hidden edges.
export function coreMesh(progress) {
  const inset = 1 - 0.58 * (1 - Math.max(0, Math.min(1, progress)));
  const ring = [[-inset, -1], [inset, -1], [1, -inset], [1, inset],
                [inset, 1], [-inset, 1], [-1, inset], [-1, -inset]];
  const faces = [];
  for (let axis = 0; axis < 3; axis++) {
    for (const sign of [-1, 1]) {
      const normal = [0, 0, 0];
      normal[axis] = sign;
      faces.push({ normal, points: ring.map(([u, v]) => {
        const point = [0, 0, 0];
        point[axis] = sign;
        point[(axis + 1) % 3] = u;
        point[(axis + 2) % 3] = v;
        return point;
      }) });
    }
  }
  if (inset < 1) {
    for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) {
      const normal = [x, y, z].map(n => n / Math.sqrt(3));
      faces.push({ normal, points: [[x * inset, y, z], [x, y * inset, z], [x, y, z * inset]] });
    }
  }
  return faces;
}

export function drawCoreBody(size, progress, frameCount, flash) {
  const pulse = 0.5 + 0.5 * Math.sin(frameCount * 0.04);
  const yaw = 0.55 + Math.sin(frameCount * 0.008) * 0.22 * (1 - progress);
  const tilt = -0.32 + Math.sin(frameCount * 0.011) * 0.08 * (1 - progress);
  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  const cx = Math.cos(tilt), sx = Math.sin(tilt);
  const rotate = ([x, y, z]) => {
    const rx = x * cy + z * sy, rz = z * cy - x * sy;
    return [rx, y * cx - rz * sx, y * sx + rz * cx];
  };
  const half = size * 0.32;
  const distance = size * 4;
  const project = ([x, y, z]) => {
    const scale = distance / (distance - z * half);
    return [x * half * scale, y * half * scale];
  };

  // Soft halo behind the solid, strongest when a triangle lands.
  ctx.save();
  const glow = ctx.createRadialGradient(0, 0, size * 0.22, 0, 0, size * 0.72);
  glow.addColorStop(0, `rgba(${flash > 0 ? '94, 231, 255' : '255, 100, 180'}, ${flash > 0 ? 0.5 : 0.12 + pulse * 0.08})`);
  glow.addColorStop(1, 'rgba(94, 231, 255, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(-size, -size, size * 2, size * 2);

  const faces = coreMesh(progress).map(face => ({
    normal: rotate(face.normal), points: face.points.map(rotate)
  })).filter(face => {
    // Camera is on the positive z axis; discard faces pointing away from it.
    const center = face.points.reduce((sum, p) => sum.map((v, i) => v + p[i] / face.points.length), [0, 0, 0]);
    return face.normal.reduce((sum, n, i) => sum + n * ((i === 2 ? distance / half : 0) - center[i]), 0) > 0;
  }).sort((a, b) => {
    const depth = face => face.points.reduce((sum, p) => sum + p[2], 0) / face.points.length;
    return depth(a) - depth(b);
  });

  const base = [235 - progress * 150, 80 + progress * 125, 155 + progress * 85];
  for (const face of faces) {
    const light = Math.max(0, face.normal[0] * -0.4 + face.normal[1] * -0.65 + face.normal[2] * 0.65);
    const brightness = 0.38 + light * 0.62;
    const color = base.map(v => Math.round(v * brightness));
    const points = face.points.map(project);
    ctx.beginPath();
    points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
    ctx.closePath();
    ctx.fillStyle = flash > 0 ? `rgb(${color.map(v => Math.round(v + (255 - v) * 0.7)).join(',')})` : `rgb(${color.join(',')})`;
    ctx.fill();
    ctx.strokeStyle = flash > 0 ? '#d7faff' : `rgba(180, 240, 255, ${0.38 + light * 0.35})`;
    ctx.lineWidth = 1.4;
    ctx.lineJoin = 'round';
    ctx.stroke();
  }
  ctx.restore();
}
