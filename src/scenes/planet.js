// The planet, as a thing drawn from space.
//
// A unit cube, projected with a tilted camera and lit from one direction,
// with a corner that can be CHAMFERED off — the intro blows it off, the
// ending puts it back. Both scenes draw the same object, which is the whole
// point: the first thing the player sees and the last thing they see are
// one shape, and the game is what happened to it in between.
//
// Pulled out of introScene.js so the ending could share it rather than
// copy it. Nothing here knows which scene it's in; `chamfer` is just a
// number from 0 (a cube) to CHAMFER_FRAC (the corner gone), and the caller
// animates it.

import { ctx } from '../engine/renderer.js';

export const CAM_DIST = 480;
export const CAM_TILT = 0.52;
export const CHAMFER_FRAC = 0.4;
export const EXPLODED_CORNER = { x: 1, y: -1, z: 1 };

export function normalize3(x, y, z) {
  const l = Math.hypot(x, y, z) || 1;
  return { x: x / l, y: y / l, z: z / l };
}
export const LIGHT = normalize3(-0.45, -0.6, 0.65);

export function rotateY(p, a) {
  const c = Math.cos(a), s = Math.sin(a);
  return { x: p.x * c + p.z * s, y: p.y, z: -p.x * s + p.z * c };
}
export function rotateX(p, a) {
  const c = Math.cos(a), s = Math.sin(a);
  return { x: p.x, y: p.y * c - p.z * s, z: p.y * s + p.z * c };
}
export function dot3(a, b) { return a.x * b.x + a.y * b.y + a.z * b.z; }
export function lerp3(a, b, t) {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t };
}
export function bilerp(corners, u, v) {
  const top = lerp3(corners[0], corners[1], u);
  const bot = lerp3(corners[3], corners[2], u);
  return lerp3(top, bot, v);
}

// Perspective, about a screen centre the caller chooses. The intro frames
// the planet high; the ending moves it around.
export function project(p, cx, cy) {
  const f = CAM_DIST / (CAM_DIST + p.z);
  return { x: cx + p.x * f, y: cy + p.y * f, scale: f };
}
export function toCameraSpace(p, angleY, scale, tilt = CAM_TILT) {
  const scaled = { x: p.x * scale, y: p.y * scale, z: p.z * scale };
  return rotateX(rotateY(scaled, angleY), tilt);
}

// One unit-cube face: 4 corners (consistent winding) + outward normal.
// `quad` is the face's ORIGINAL four corners, kept separately from `verts`
// so the crater texture can still be mapped after a chamfer turns the quad
// into a pentagon.
function makeFace(axis, sign) {
  const other = { x: ['y', 'z'], y: ['x', 'z'], z: ['x', 'y'] }[axis];
  const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  const verts = corners.map(([a, b]) => {
    const p = { x: 0, y: 0, z: 0 };
    p[axis] = sign;
    p[other[0]] = a * sign;
    p[other[1]] = b;
    return p;
  });
  const normal = { x: 0, y: 0, z: 0 };
  normal[axis] = sign;
  return { verts, quad: verts.slice(), normal, craters: makeCraters(), damaged: false };
}
function makeCraters() {
  // Many small, fine specks rather than a few big holes — the original
  // read as cheese, not a rocky/worn surface.
  const n = 34 + Math.floor(Math.random() * 16);
  const spots = [];
  for (let i = 0; i < n; i++) {
    spots.push({ u: 0.06 + Math.random() * 0.88, v: 0.06 + Math.random() * 0.88, r: 0.01 + Math.random() * 0.016 });
  }
  return spots;
}

export const BASE_FACES = [
  makeFace('x', 1), makeFace('x', -1),
  makeFace('y', 1), makeFace('y', -1),
  makeFace('z', 1), makeFace('z', -1)
];

// The twelve edges of the cube, as vertex pairs. The ending lights them.
export const EDGES = (() => {
  const vs = [];
  for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) vs.push({ x, y, z });
  const edges = [];
  for (let i = 0; i < vs.length; i++) for (let j = i + 1; j < vs.length; j++) {
    const a = vs[i], b = vs[j];
    const diff = Math.abs(a.x - b.x) + Math.abs(a.y - b.y) + Math.abs(a.z - b.z);
    if (diff === 2) edges.push([a, b]);
  }
  return edges;
})();

// Truncates `corner` by `frac` of each edge it sits on. 0 is the untouched
// cube; CHAMFER_FRAC is the intro's blown-off corner. Anything between is
// the ending putting it back.
//
// The replacement order matters: each new point has to be spliced in next
// to whichever original neighbour it's actually adjacent to, or the new
// 5-gon's edges cross themselves. Deriving the order from each face's
// prev/next vertex around the loop can't make that mistake.
export function buildChamferedFaces(corner, frac = CHAMFER_FRAC) {
  if (frac <= 0.001) return BASE_FACES.map(f => ({ ...f, verts: f.verts.slice() }));
  const edgeNeighbors = [
    { x: -corner.x, y: corner.y, z: corner.z },
    { x: corner.x, y: -corner.y, z: corner.z },
    { x: corner.x, y: corner.y, z: -corner.z }
  ];
  const cutVerts = edgeNeighbors.map(n => lerp3(corner, n, frac));
  const sameVert = (a, b) => a.x === b.x && a.y === b.y && a.z === b.z;
  const cutPointFor = neighbor => cutVerts[edgeNeighbors.findIndex(n => sameVert(n, neighbor))];

  const faces = BASE_FACES.map(f => ({ ...f, verts: f.verts.slice() }));
  for (const f of faces) {
    const idx = f.verts.findIndex(v => sameVert(v, corner));
    if (idx === -1) continue;
    const n = f.verts.length;
    const prev = f.verts[(idx - 1 + n) % n];
    const next = f.verts[(idx + 1) % n];
    f.verts.splice(idx, 1, cutPointFor(prev), cutPointFor(next));
    // Keep the texture, minus the bit that's missing: the removed chunk is
    // the tetrahedron within `frac` of the corner along each edge, which on
    // a face is "L1 distance to the corner < 2*frac".
    f.craters = f.craters.filter(c => {
      const q = bilerp(f.quad, c.u, c.v);
      const d = Math.abs(q.x - corner.x) + Math.abs(q.y - corner.y) + Math.abs(q.z - corner.z);
      return d > frac * 2 + 0.08;
    });
  }

  faces.push({
    verts: cutVerts,
    normal: normalize3(corner.x, corner.y, corner.z),
    craters: [],
    damaged: true
  });
  return faces;
}

export function mixGold(intensity) {
  const r = Math.round(120 + intensity * 135);
  const g = Math.round(95 + intensity * 110);
  const b = Math.round(40 + intensity * 50);
  return `rgb(${r}, ${g}, ${b})`;
}

// Projects every face and returns the visible ones, far-to-near, with
// their screen polygons — so a scene can draw the planet and then draw
// things ON it (edge light, triangles landing) in the same space.
export function projectFaces(faces, angleY, scale, cx, cy, tilt = CAM_TILT) {
  return faces.map(f => {
    const camVerts = f.verts.map(v => toCameraSpace(v, angleY, scale, tilt));
    const camNormal = rotateX(rotateY(f.normal, angleY), tilt);
    const avgZ = camVerts.reduce((s, p) => s + p.z, 0) / camVerts.length;
    return { ...f, camVerts, camNormal, avgZ, proj: camVerts.map(p => project(p, cx, cy)) };
  }).filter(f => f.camNormal.z < -0.05)
    .sort((a, b) => b.avgZ - a.avgZ);
}

// Draws it. `opts.damagedFill` lets the ending light the raw face up as it
// heals; `opts.rim` tints every face's outline (the ending's cyan).
export function drawPlanet(faces, angleY, scale, cx, cy, opts = {}) {
  const tilt = opts.tilt == null ? CAM_TILT : opts.tilt;
  const camFaces = projectFaces(faces, angleY, scale, cx, cy, tilt);
  for (const f of camFaces) {
    const proj = f.proj;
    const intensity = Math.max(0.12, dot3(f.camNormal, LIGHT));
    ctx.fillStyle = f.damaged ? (opts.damagedFill || '#3a2a14') : mixGold(intensity);
    ctx.beginPath();
    proj.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = opts.rim || (f.damaged ? '#1c1408' : '#5b3f1a');
    ctx.lineWidth = f.damaged ? 1 : 1.5;
    ctx.stroke();

    if (!f.damaged) {
      const avgScale = proj.reduce((s, p) => s + p.scale, 0) / proj.length;
      for (const c of f.craters) {
        const local = bilerp(f.quad, c.u, c.v);
        const camP = toCameraSpace(local, angleY, scale, tilt);
        const p = project(camP, cx, cy);
        ctx.fillStyle = `rgba(90, 65, 20, ${0.4 + intensity * 0.2})`;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, c.r * scale * avgScale, c.r * scale * avgScale * 0.65, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  return camFaces;
}
