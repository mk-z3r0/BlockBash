// The hollow centre: arriving, and ending.
//
// GAME_DESIGN is unusually specific about what this has to be, so both
// scenes here are written to serve one line of it: "The ending is a
// restoration, not a kill. That's the whole thesis of the game stated once,
// at full volume: the win condition for the entire story is the same verb
// the player has been practising on individual octagons all along."
//
// Which means the ending scene does NOT get a victory. It gets a planet
// that stops being wrong.

import { createQuarrick } from '../../entities/npc.js';
import { playRestore, playWin } from '../../audio/sfx.js';
import { say } from '../say.js';
import { setFlag } from '../../narrative.js';

export const l7Arrival = {
  id: 'l7-arrival',

  beats: [
    // A long hold before anyone speaks. The player has just fallen through
    // the crust of their own planet and the thing they came for is visible
    // from here.
    { name: 'land', frames: 90 },

    say('narrator', "The spheres hollowed it out from every side."),
    say('narrator', "This is what they were digging toward."),

    {
      name: 'quarrick',
      frames: 40,
      enter(c) {
        c.state.rescueNPC = createQuarrick(
          c.player.x + 150, c.level.groundY,
          { facing: -1, damage: c.level.quarrickDamage || 2 });
      }
    },

    say('quarrick', "I can't go any closer. It pulls."),
    say('quarrick', "Take the rest of mine."),
    {
      name: 'give-ammo',
      frames: 34,
      enter(c) {
        c.player.ammo += 8;
        c.showToast('+8 TRIANGLES', 100);
      }
    },
    say('player',   "What do I do?"),
    // The answer is the thing he told them in level 3, and the thing they
    // have been doing since. Nothing new is explained here on purpose.
    say('quarrick', "The same as always. Put it back."),

    {
      name: 'leave',
      frames: 1,
      enter(c) {
        if (!c.state.rescueNPC) return;
        c.state.rescueNPC.state = 'exit';
        c.state.rescueNPC.velocityX = -3.6;
      }
    }
  ]
};

export const l7Ending = {
  id: 'l7-ending',

  onComplete(c) {
    setFlag('coreRestored');
    // Ends the level, and this is the last one in the registry, so it ends
    // the game. Runs on a skip too.
    c.finishLevel();
  },

  beats: [
    {
      name: 'settle',
      frames: 110,
      enter(c) {
        playRestore();
        const core = c.state.enemies.find(e => e.kind === 'core');
        if (core) c.spawnExplosion(core.x + core.w / 2, core.y + core.w / 2, '#5ee7ff');
      }
    },

    say('narrator', "The shaking stops."),
    say('narrator', "Eight corners. Twelve edges. Six flat faces."),
    // The spheres don't get a death scene. They came for a thing that no
    // longer exists in the shape they wanted.
    say('narrator', "Above, on all six faces, the spheres stop digging."),

    {
      name: 'quarrick-returns',
      frames: 44,
      enter(c) {
        c.state.rescueNPC = createQuarrick(
          c.player.x - 150, c.level.groundY, { facing: 1, damage: 2 });
        playWin();
      }
    },

    say('quarrick', "You put the whole world back."),
    say('player',   "You're still missing your corners."),
    // He is, and he will be. The game does not pretend otherwise.
    say('quarrick', "So is everyone worth knowing."),
    say('quarrick', "Come on. Let's go up and see it.")
  ]
};
