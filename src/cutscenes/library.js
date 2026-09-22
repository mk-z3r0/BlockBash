// Every cutscene the game can play, by id.
//
// Levels refer to cutscenes by id in their data (see the `cutscenes` block
// in levels/data/level1.js), so this is the one place that maps a name to
// an actual beat list. Adding a cutscene is: write the beat list, register
// it here, declare its trigger in the level. Nothing in
// scenes/playingScene.js changes.
//
// Ids are global rather than per-level on purpose — narrative state
// records which ones have been seen, and "seen" has to mean the same thing
// across a whole save.

import { bossShowdown } from './level1/bossShowdown.js';
import { edgeTransition } from './level1/edgeTransition.js';
import { l2Arrival } from './level2/arrival.js';
import { l3Handoff, l3Restored } from './level3/handoff.js';
import { l4Arrival, l5Arrival, l6Arrival } from './faces.js';
import { sandboxChat } from './sandbox/sandboxChat.js';

const all = [
  bossShowdown, edgeTransition,
  l2Arrival, l3Handoff, l3Restored,
  l4Arrival, l5Arrival, l6Arrival,
  sandboxChat
];

export const cutsceneLibrary = Object.fromEntries(all.map(c => [c.id, c]));
