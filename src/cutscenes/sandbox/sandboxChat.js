// A dialogue exchange that exists only to prove the system works, in the
// sandbox level (`?test`) and nowhere else.
//
// Level 1 is deliberately WORDLESS (2026-09-21) — the story starts opening
// up in level 2, and putting placeholder lines in the one finished level
// would mean shipping words nobody meant. So the dialogue path needs
// somewhere real to be exercised, and data/testLevel.js is already the
// sandbox duplicate for exactly this kind of thing.
//
// The lines are about the machinery on purpose. They are not a draft of
// anything and should never be mistaken for one.

import { say } from '../say.js';

export const sandboxChat = {
  id: 'sandbox-chat',

  beats: [
    say('quarrick', 'This is the dialogue bar. Long lines wrap on their own, so a beat can say as much as it needs to without anyone counting characters first.'),
    say('player', 'Space turns the page. Pressing it mid-reveal finishes the line instead of skipping it.'),
    say('narrator', 'No speaker name here — that is the narrator, for captions and anything without a mouth.', { auto: 70 }),
    say('quarrick', 'Escape skips the whole thing. Back to work.')
  ]
};
