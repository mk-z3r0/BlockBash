// Level 2's opening — the first words anyone says in this game.
//
// Level 1 is wordless by design, so this carries the whole weight of the
// story opening up: what the spheres are doing, what they're after, and —
// without a line about it — that Quarrick is already coming apart.
//
// He's put in `state.rescueNPC` rather than in the cutscene's `data`,
// deliberately, and the runner's note on that distinction is the reason:
// he OUTLIVES this scene. The last beat sets him walking and hands control
// straight back, and the scene's own update keeps him going until he's off
// screen. Anything in `data` would vanish the moment the cutscene ended.
//
// It also means he needs no draw hook here. The playing scene already
// draws state.rescueNPC every frame, which is what lets him stay on screen
// across the say() beats — those bring their own drawScreen for the
// dialogue bar and would otherwise paint over nothing.

import { createQuarrick } from '../../entities/npc.js';
import { surfaceYAt } from '../../levels/levelLoader.js';
import { say } from '../say.js';

export const l2Arrival = {
  id: 'l2-arrival',

  beats: [
    // He's just standing there when you land. A beat of nothing first, so
    // the player registers him — and the missing corner — before a
    // dialogue bar covers the bottom of the screen.
    {
      name: 'meet',
      frames: 46,
      enter(c) {
        // The surface under HIM, not the level's base line. Level 2 opens on
        // the quarry rim, 120px above groundY, and placing him at groundY
        // buried him in the terrace the player was standing on.
        const at = c.player.x + 170;
        c.state.rescueNPC = createQuarrick(at, surfaceYAt(at),
          { facing: -1, damage: c.level.quarrickDamage || 0 });
      }
    },

    say('quarrick', "Careful. This face is theirs already."),
    say('player',   "What are they even doing?"),
    say('quarrick', "Digging. Straight down, all six sides."),
    say('quarrick', "They want the middle of the world."),
    // The deterioration beat is supposed to land without being narrated —
    // the player has been looking at the gap in his corner for four lines
    // by now. This is the closest it gets to being acknowledged, and it's
    // him refusing to.
    say('quarrick', "...Don't. Keep moving."),

    {
      name: 'leave',
      frames: 1,
      enter(c) {
        // 'exit' is updateRescueNPC's own walk-off state; the scene keeps
        // ticking him after this cutscene is done and discards him when
        // he's past the camera.
        c.state.rescueNPC.state = 'exit';
        c.state.rescueNPC.velocityX = 4.2;
      }
    }
  ]
};
