import { upgradeFireRate } from '../../weapons/fireRate.js';
// Finding Quarrick, and putting him back. The fifth face.
//
// This is the payoff the level 3 handoff sets up and deliberately does not
// pay. GAME_DESIGN's rescue-NPC arc runs protector -> deteriorating ->
// handoff -> corrupted, and the corrupted phase used to last about ninety
// seconds; it lasts two levels now. The player carries the Cornerstone
// across the fourth face knowing exactly what it's for and not being able
// to use it on the one target that matters, sees him once on that face and
// can't reach him (cutscenes/faces.js, l4Glimpse), and catches up here.
//
// Why here and not on six: the fifth face is the Terraformer's, and its
// whole idea is that the ground won't stay still. Finding him in the middle
// of the one level where nothing holds still is the right room for it. It
// also means the sixth face — the hardest fight in the game — is the one
// he's standing on when the player arrives, which is a thing they earned.
//
// The corrupted Quarrick is an ordinary enemy in levels/data/level5.js,
// flagged `quarrick`, not a thing this file spawns. That matters: he can be
// walked past, come back to, and run out of triangles in front of. He costs
// five, which is half a full load, and the design tension GAME_DESIGN
// protects — "every rescue costs offence" — has never been more literal.

import { createQuarrick } from '../../entities/npc.js';
import { surfaceYAt } from '../../levels/levelLoader.js';
import { say } from '../say.js';
import { setNpcStage, setFlag } from '../../narrative.js';

// Fires the first time the player gets near him, before they can shoot.
// Without it a player who is good at this game restores him from forty
// pixels away with no idea what they just did — the shape is gold, and
// "that one is a person" has to be said out loud once.
export const l5Found = {
  id: 'l5-found',

  beats: [
    { name: 'see', frames: 40 },
    say('player', "That's him."),
    say('player',   "That's him, that's Quarrick."),
    // Nobody answers. He has had no lines since the third face and he gets
    // none here; the next voice he has is after he's been put back.
    say('narrator', "It doesn't know its name."),
    say('narrator', "Put him back.")
  ]
};

// And what happens once they do.
export const l5Restored = {
  id: 'l5-restored',

  onComplete(c) {
    setFlag('quarrickRestored');
    setNpcStage(4);
  },

  beats: [
    {
      name: 'reform',
      frames: 50,
      enter(c) {
        const q = c.state.enemies.find(e => e.quarrick);
        if (q) {
          q.alive = false;
          c.spawnExplosion(q.x + q.w / 2, q.y + q.w / 2, '#5ee7ff');
          // damage 1: chipped, but SQUARE. He says "I'm square. That'll do."
          // four lines from now and the player has to be able to see that
          // it's true — this is the payoff of the whole game's central
          // mechanic and it cannot end with him still the shape of the
          // thing they just cured. The corners the spheres took are still
          // visibly gone, which is what the ending calls back to.
          c.state.rescueNPC = createQuarrick(q.x, surfaceYAt(q.x), { facing: -1, damage: 1 });
        }
      }
    },

    say('quarrick', "...Oh."),
    say('quarrick', "It works, then."),
    say('player',   "You were gone two whole faces."),
    say('quarrick', "Was I."),
    say('player',   "You're all right?"),
    say('quarrick', "I'm square. That'll do."),
    // The inventor improves the launcher after seeing it restore him.
    {
      name: 'repay',
      frames: 34,
      enter(c) {
        upgradeFireRate(c.player);
        c.showToast('FIRE RATE BOOST!', 100);
      }
    },
    say('quarrick', "Go on. There are a lot more of them than there are of me."),

    {
      name: 'leave',
      frames: 1,
      enter(c) {
        if (!c.state.rescueNPC) return;
        c.state.rescueNPC.state = 'exit';
        c.state.rescueNPC.velocityX = 3.8;
      }
    }
  ]
};
