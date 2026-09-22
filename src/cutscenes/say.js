// `say()` — the dialogue beat.
//
// Sugar over the beat shape, because a talking beat is the one kind
// there'll be dozens of and writing its five hooks out by hand every time
// would bury the words in machinery. A conversation reads as a
// conversation:
//
//   beats: [
//     say('quarrick', "You made it. Most don't."),
//     say('player',   'What happened here?'),
//     say('quarrick', 'Look down.', { auto: 90 })
//   ]
//
// Defaults: the world freezes and the player waits for a keypress. Both
// are overridable, because "keep talking while the thing you're talking
// about is still happening" is a real beat and the system shouldn't
// forbid it.

import {
  showDialogue, updateDialogue, drawDialogue, closeDialogue,
  isDialogueAdvanced, isDialogueRevealed
} from '../ui/dialogue.js';
import { state } from '../state.js';

// opts:
//   auto: N    advance on its own N frames after the line finishes
//              revealing, instead of waiting for a keypress
//   physics    override the default freeze ('run' to keep the world alive)
//   name       a name for the beat, for debugging
export function say(speakerId, text, opts = {}) {
  // Counts from the moment the last character lands, not from the start of
  // the beat — otherwise a long line and a short one with the same `auto`
  // sit on screen for different amounts of time once they can be read.
  // Reset in enter() so a replayed cutscene doesn't inherit it.
  let heldFor = 0;

  return {
    name: opts.name || `say:${speakerId}`,
    locks: { input: 'locked', physics: opts.physics || 'freeze', camera: 'scripted' },
    enter() {
      heldFor = 0;
      showDialogue(speakerId, text);
    },
    update() {
      updateDialogue();
      if (opts.auto != null && isDialogueRevealed()) heldFor++;
    },
    until() {
      if (opts.auto != null) return heldFor > opts.auto;
      return isDialogueAdvanced();
    },
    exit() {
      closeDialogue();
    },
    drawScreen() {
      drawDialogue(state.frameCount);
    }
  };
}
