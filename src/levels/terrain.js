// Runtime terrain damage — ground that gets carved away while the level is
// being played, rather than authored as a hole in the level data.
//
// Lives here rather than in whatever cutscene or enemy did the carving,
// because the damage OUTLIVES its cause: the boss digs a pit during its
// cutscene, the cutscene ends, and the pit is still there when the player
// walks past it a minute later. It has to be undone on a respawn (the fight
// restarts, so the ground it dug should be back) but not before.
//
// This is also the seam the chamfer work will use — see "Terrain damage is
// runtime state, not authored data" in IMPLEMENTATION_PLAN's architecture
// constraints. Carving a gap and shaving a corner are the same kind of
// mutation with the same lifecycle.

// Every carve made since the last restore, newest last.
let carves = [];

// Splits the ground segment under `x` into two pieces with a gap between
// them. Returns true if it actually carved.
//
//   x          where the digging is happening
//   width      how wide a hole to try for
//   opts.margin      leave at least this much solid ground either side
//   opts.maxX        never carve past this — a corridor the player has to
//                    be able to walk (see the edge-transition walk-up)
//
// Fails quietly and returns false when there isn't room: a cutscene asking
// for a hole where one won't fit should carry on without one, not throw.
export function carveGap(level, x, width, opts = {}) {
  const margin = opts.margin ?? 20;
  const seg = level.platforms.find(p => p.ground && x >= p.x && x <= p.x + p.width);
  if (!seg) return false;

  const gapStart = Math.max(seg.x + margin, x);
  let gapEnd = Math.min(seg.x + seg.width - margin, gapStart + width);
  if (opts.maxX != null) gapEnd = Math.min(gapEnd, opts.maxX);
  if (gapEnd - gapStart < 20) return false; // no room without hitting something

  const leftPiece = { x: seg.x, y: seg.y, width: gapStart - seg.x, height: seg.height, ground: true };
  const rightPiece = { x: gapEnd, y: seg.y, width: (seg.x + seg.width) - gapEnd, height: seg.height, ground: true };
  const idx = level.platforms.indexOf(seg);
  level.platforms.splice(idx, 1, leftPiece, rightPiece);
  carves.push({ originalSeg: seg, leftPiece, rightPiece, center: (gapStart + gapEnd) / 2 });
  return true;
}

// Where the most recent carve opened up — for spawning the dust and debris
// that sell it. Null if nothing has been carved.
export function lastCarveCenter() {
  return carves.length ? carves[carves.length - 1].center : null;
}

// Puts every carved segment back. Called on respawn and on level load.
//
// On a fresh level load, loadLevel() has already handed back a brand new
// platforms array, so the indexOf lookups below find nothing and this is a
// harmless no-op — which is exactly what should happen, since the new array
// has no damage in it to undo.
export function restoreCarvedGaps(level) {
  for (let i = carves.length - 1; i >= 0; i--) {
    const c = carves[i];
    const li = level.platforms.indexOf(c.leftPiece);
    if (li !== -1) level.platforms.splice(li, 1, c.originalSeg);
    const ri = level.platforms.indexOf(c.rightPiece);
    if (ri !== -1) level.platforms.splice(ri, 1);
  }
  carves = [];
}

// True if anything is currently carved — mostly for probes asserting that a
// dig happened at all.
export function carveCount() {
  return carves.length;
}
