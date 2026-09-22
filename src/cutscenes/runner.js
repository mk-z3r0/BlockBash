// The cutscene runner.
//
// A cutscene is data: `{ id, beats: [...] }`. A beat is an object with
// optional lifecycle hooks and an end condition:
//
//   {
//     name: 'charge',
//     locks: { physics: 'freeze' },   // see LOCKS below; omitted = defaults
//     enter(c) {},                    // once, on entry
//     update(c, frame) {},            // every frame, `frame` 0-based
//     exit(c) {},                     // once, when the beat ends
//     draw(c) {},                     // in-world, inside the camera transform
//     drawScreen(c) {},               // screen space, over everything
//     frames: 45,                     // end after N update() calls, and/or
//     until: c => bool                // end as soon as this goes true
//   }
//
// Both `frames` and `until` may be present — whichever fires first ends the
// beat. A beat with neither runs until the cutscene is skipped, which is
// almost always a bug, so the runner warns about it in the console rather
// than hanging silently.
//
// --- Why beats chain within a single tick ---
// When a beat ends, the next one enters AND updates in the SAME tick. That
// isn't an arbitrary choice: it's what the hand-rolled boss cutscene this
// replaces already did, because its beats were a run of separate `if`
// statements in one function, so falling out of one fell straight into the
// next. `tools/cutscene-probe.html` asserts the boss dies on a specific
// frame, so anything else here shifts that by one frame per beat boundary
// and the port stops being a port. CHAIN_LIMIT guards the degenerate case
// of beats that all end immediately.
//
// --- What lives where ---
// `c.data` is per-run scratch, wiped when the cutscene starts. It is for
// things that belong to the cutscene and die with it (a scripted walker, a
// captured start position). It is NOT for:
//   - entities that outlive the scene (the rescue NPC walks off-screen long
//     after its cutscene is done) — those belong in `state`
//   - world mutation that has to survive a respawn (the boss's mined pit) —
//     that belongs to the level, see levels/terrain.js
// Getting this wrong is the main way a cutscene leaks state into the next
// attempt, so it's worth the paragraph.

// The three axes a beat can suspend, and what they mean to the scene
// running it. The defaults are chosen so that the common case — "a scripted
// moment where the player can't move but the world keeps living" — is an
// empty `locks`.
const BEAT_DEFAULTS = {
  input: 'locked',   // 'locked' | 'free'   — does the player drive the avatar
  physics: 'run',    // 'run'    | 'freeze' — does the world simulate
  camera: 'follow'   // 'follow' | 'scripted' — who drives the camera
};

// What the scene sees when nothing is playing. Deliberately NOT
// BEAT_DEFAULTS: no cutscene means the player is in control.
const IDLE_LOCKS = { input: 'free', physics: 'run', camera: 'follow' };

const CHAIN_LIMIT = 16;

let active = null;
// Cutscenes finished since the last reset. Runtime only, per level attempt —
// this is what "the boss fight is over, the way is clear" reads off, and a
// respawn genuinely should replay it. Persisted "has the player ever seen
// this" lives in narrative state instead, which is a different question.
let completed = new Set();
let worldTransformState = null;

function resolveLocks(beat) {
  return { ...BEAT_DEFAULTS, ...(beat.locks || {}) };
}

// Starts `def`, replacing anything already running. `context` is everything
// the beats are allowed to touch — see makeCutsceneContext in the scene.
export function startCutscene(def, context) {
  if (!def || !def.beats || !def.beats.length) return;
  active = {
    def,
    c: context,
    index: 0,
    frame: 0,
    entered: false
  };
  context.data = {};
  worldTransformState = null;
  if (def.beats.some(b => b.frames == null && !b.until)) {
    console.warn(`cutscene "${def.id}": a beat has neither frames nor until — it can only end by being skipped`);
  }
}

function beatEnded(beat, c, frame) {
  if (beat.until && beat.until(c)) return true;
  if (beat.frames != null && frame >= beat.frames) return true;
  return false;
}

function finish() {
  const { def, c } = active;
  active = null;
  worldTransformState = null;
  completed.add(def.id);
  if (def.onComplete) def.onComplete(c);
}

// Advances the active cutscene by one tick. Returns true if one is running.
export function updateCutscene() {
  if (!active) return false;

  for (let chained = 0; chained < CHAIN_LIMIT; chained++) {
    const beat = active.def.beats[active.index];

    if (!active.entered) {
      active.entered = true;
      active.frame = 0;
      if (beat.enter) beat.enter(active.c);
      // enter() can end the cutscene outright (a beat that just fires a
      // callback), in which case there's nothing left to update
      if (!active) return false;
    }

    if (beat.update) beat.update(active.c, active.frame);
    active.frame++;

    if (!beatEnded(beat, active.c, active.frame)) return true;

    if (beat.exit) beat.exit(active.c);
    active.index++;
    active.entered = false;

    if (active.index >= active.def.beats.length) {
      finish();
      return false;
    }
    // ...otherwise loop: the next beat enters and updates this same tick.
  }

  console.warn(`cutscene "${active.def.id}": ${CHAIN_LIMIT} beats ended in one tick — check for beats with frames: 0`);
  return true;
}

// Jump straight to the payoff. Beats get no exit() — a skip is "pretend this
// already finished", and running N exit hooks in one frame would fire every
// sound and spawn every particle the player just chose to skip. onComplete
// DOES run: that's the outcome, not the choreography.
export function skipCutscene() {
  if (!active) return;
  finish();
}

export function isCutsceneActive() {
  return !!active;
}

// The id of whatever is playing, or null. Lets a scene ask "is it THIS one"
// without exporting the runner's internals.
export function activeCutsceneId() {
  return active ? active.def.id : null;
}

export function currentBeatName() {
  return active ? active.def.beats[active.index].name : null;
}

export function currentLocks() {
  if (!active) return IDLE_LOCKS;
  return resolveLocks(active.def.beats[active.index]);
}

export function drawCutsceneWorld() {
  if (!active) return;
  const beat = active.def.beats[active.index];
  if (beat.draw) beat.draw(active.c);
}

export function drawCutsceneScreen() {
  if (!active) return;
  const beat = active.def.beats[active.index];
  if (beat.drawScreen) beat.drawScreen(active.c);
}

// A rotation the whole world is drawn under, set by beats that tip the
// level (the cube-edge transition). Null the rest of the time, which the
// scene treats as "no transform" rather than as identity maths per frame.
export function setWorldTransform(pivotX, pivotY, angle) {
  worldTransformState = angle ? { pivotX, pivotY, angle } : null;
}

export function getWorldTransform() {
  return worldTransformState;
}

// Has this cutscene finished during the current level attempt? Cleared by
// resetCutscenes.
export function hasCompleted(id) {
  return completed.has(id);
}

// Called on every level load and every respawn: nothing about a cutscene
// should survive either.
export function resetCutscenes() {
  active = null;
  worldTransformState = null;
  completed = new Set();
}
