// The short arrival scenes for the last three outer faces.
//
// They're together in one file because they're one idea told across three
// levels — but the idea has been turned over since it was written. It used
// to be: Quarrick meets the player on four, meets them with less to say on
// five, and is absent on six with nothing explaining why.
//
// That absence was doing the work of a story beat it hadn't earned, because
// by then the player had already lost him and got him back inside a single
// level. Now he is TAKEN on the third face (cutscenes/level3/handoff.js)
// and found on the fifth (cutscenes/level5/reunion.js), so:
//
//   four    nobody is waiting, and the player knows exactly why. Halfway
//           across, they see him once, being walked the other way, and
//           cannot reach him.
//   five    he's here, and he's one of them. That's the level's real
//           obstacle, and it isn't in the arrival scene.
//   six     he's standing at the corner for the first time since the
//           second face, because the player put him there. And it's the one
//           face he won't cross.
//
// GAME_DESIGN's line about the corner meetings — "that's the protector
// phase of his arc reading as competence, and it's what makes the later
// phases land, when he stops being able to get there first" — is still
// what these are for. He stops being able to get there first on the fourth
// face. He starts again on the sixth, and it costs him something to say so.

import { createQuarrick } from '../entities/npc.js';
import { surfaceYAt } from '../levels/levelLoader.js';
import { say } from './say.js';

// Every corner meeting opens the same way — he's just standing there when
// you land — so the beat is written once.
function meetQuarrick(frames = 46) {
  return {
    name: 'meet',
    frames,
    enter(c) {
      const at = c.player.x + 170;
      c.state.rescueNPC = createQuarrick(at, surfaceYAt(at),
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

// No meet beat. He isn't here, and for the first time the player knows
// where he is instead of wondering.
export const l4Arrival = {
  id: 'l4-arrival',
  beats: [
    { name: 'empty', frames: 70 },
    say('narrator', "No one is waiting on this face."),
    say('player',   "He came through here. He has to have."),
    say('narrator', "They shoot on this one. Did you notice?")
  ]
};

// Halfway across the fourth face: one look at him, going the other way.
//
// He is not reachable and there is nothing to do about it — he's drawn
// walking along the far side and gone before the scene ends. That's the
// point, and it's why this is a cutscene and not an encounter: the player
// has the tool in their hands and it does not help, which is the same
// sentence the whole level is written in.
export const l4Glimpse = {
  id: 'l4-glimpse',
  beats: [
    {
      name: 'spot',
      frames: 46,
      enter(c) {
        // Out at the right edge of the view, walking away. Far enough that
        // he reads as "over there" rather than "just there".
        const at = c.player.x + 430;
        c.state.rescueNPC = createQuarrick(at, surfaceYAt(at), { facing: 1, damage: 4 });
      }
    },
    say('player', "QUARRICK!"),
    {
      name: 'no-answer',
      frames: 90,
      update(c) {
        const npc = c.state.rescueNPC;
        if (!npc) return;
        npc.state = 'walking';
        npc.facing = 1;
        npc.x += 2.6;
        npc.y = surfaceYAt(npc.x) - npc.height;
      }
    },
    say('narrator', "It keeps walking."),
    say('narrator', "Whatever is in there isn't answering to that."),
    {
      name: 'gone',
      frames: 1,
      enter(c) { c.state.rescueNPC = null; }
    }
  ]
};

// Fifth face. He's on it somewhere, and the player doesn't know that yet.
export const l5Arrival = {
  id: 'l5-arrival',
  beats: [
    { name: 'land', frames: 60 },
    say('narrator', "This one's bad. The ground doesn't stay where you put your foot."),
    say('narrator', "Watch what it's doing. Not where it is.")
  ]
};

// Sixth face, and he's at the corner. First time since the second.
export const l6Arrival = {
  id: 'l6-arrival',
  beats: [
    meetQuarrick(56),
    say('quarrick', "You're late."),
    say('player',   "You're standing up."),
    say('quarrick', "Mm."),
    // The refusal. He is chipped and he knows what's down there, and the
    // game does not make him brave about it — which is most of why the
    // player believes him the rest of the time.
    say('quarrick', "This is as far as I go."),
    say('quarrick', "Their general is on this face. I'd only be in the way."),
    say('player',   "You'll be here after?"),
    say('quarrick', "I'll be here after."),
    sendHimOff()
  ]
};
