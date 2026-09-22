// The short arrival scenes for the last three outer faces.
//
// They're together in one file because they're one idea told across three
// levels: Quarrick meeting the player at each new face is what established
// him as the one character who is never lost and always already there
// (GAME_DESIGN, on the cube-edge transition — "that's the protector phase
// of his arc reading as competence, and it's what makes the later phases
// land, when he stops being able to get there first").
//
// So he's there on four. He's there on five, and he has less to say. On
// six he is not there at all, and nothing explains why. That absence is the
// only thing his arc needed the player to feel before the descent, and
// spending a scene explaining it would have spent it.

import { createQuarrick } from '../entities/npc.js';
import { say } from './say.js';

// Every one of these opens the same way — he's just standing there when you
// land — so the beat is written once.
function meetQuarrick(frames = 46) {
  return {
    name: 'meet',
    frames,
    enter(c) {
      c.state.rescueNPC = createQuarrick(
        c.player.x + 170, c.level.groundY,
        { facing: -1, damage: c.level.quarrickDamage || 0 });
    }
  };
}

function sendHimOff() {
  return {
    name: 'leave',
    frames: 1,
    enter(c) {
      if (!c.state.rescueNPC) return;
      c.state.rescueNPC.state = 'exit';
      c.state.rescueNPC.velocityX = 4.0;
    }
  };
}

export const l4Arrival = {
  id: 'l4-arrival',
  beats: [
    meetQuarrick(),
    say('quarrick', "Fourth face. You're faster than they are."),
    say('quarrick', "They shoot now. Did you notice?"),
    say('player',   "I noticed."),
    sendHimOff()
  ]
};

export const l5Arrival = {
  id: 'l5-arrival',
  beats: [
    meetQuarrick(),
    say('quarrick', "This one's bad. The ground doesn't stay where you put your foot."),
    say('quarrick', "Watch what it's doing. Not where it is."),
    sendHimOff()
  ]
};

// No meet beat. He isn't here.
export const l6Arrival = {
  id: 'l6-arrival',
  beats: [
    { name: 'empty', frames: 70 },
    say('narrator', "No one is waiting on this face.")
  ]
};
