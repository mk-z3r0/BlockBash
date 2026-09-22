// Story state — what the player has seen and where the story has got to,
// as opposed to how well they're doing at it.
//
// Separate from state.js on purpose. `state` is run state: score, lives,
// enemies, the things a game-over resets. This is the other axis, and the
// two have genuinely different lifetimes:
//
//   score/lives        reset on a new run
//   narrative          persists across runs, and is SAVED
//
// Which cutscenes have played, how battered Quarrick is, and any story
// gates all belong here. The NPC arc (GAME_DESIGN's "The rescue NPC arc")
// spans levels and needs its state to survive both a level load and
// quitting the game — see the NPC-persistence note in IMPLEMENTATION_PLAN's
// architecture constraints, which called for exactly this module.
//
// Note the distinction from the runner's own `hasCompleted`: that one is
// "has this played during the current level attempt", is runtime-only, and
// a respawn clears it. This one is "has the player ever seen it".

import { loadNarrative, saveNarrative } from './save.js';

function emptyNarrative() {
  return {
    // cutscene id -> true, for `once: true` declarations
    seenCutscenes: {},
    // How far through Quarrick's four-beat arc the story is: 0 protector,
    // 1 deteriorating, 2 handoff, 3 corrupted. See GAME_DESIGN.
    npcStage: 0,
    // Open-ended story flags, so a one-off beat doesn't need a schema
    // change to remember something.
    flags: {}
  };
}

export const narrative = emptyNarrative();

function replaceContents(next) {
  narrative.seenCutscenes = next.seenCutscenes;
  narrative.npcStage = next.npcStage;
  narrative.flags = next.flags;
}

// Pulls whatever was saved into the live object. Called once at boot.
export function initNarrative() {
  replaceContents({ ...emptyNarrative(), ...loadNarrative() });
}

export function hasSeenCutscene(id) {
  return !!narrative.seenCutscenes[id];
}

export function markCutsceneSeen(id) {
  if (narrative.seenCutscenes[id]) return;
  narrative.seenCutscenes[id] = true;
  saveNarrative(narrative);
}

export function setNpcStage(stage) {
  if (narrative.npcStage === stage) return;
  narrative.npcStage = stage;
  saveNarrative(narrative);
}

export function setFlag(name, value = true) {
  if (narrative.flags[name] === value) return;
  narrative.flags[name] = value;
  saveNarrative(narrative);
}

export function getFlag(name) {
  return narrative.flags[name];
}

// A brand new playthrough from the title screen. Deliberately NOT called on
// a level retry or a game over: dying shouldn't un-see a cutscene.
export function resetNarrative() {
  replaceContents(emptyNarrative());
  saveNarrative(narrative);
}
