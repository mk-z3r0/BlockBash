// The handoff, and the corruption immediately after it.
//
// GAME_DESIGN calls this the game's central beat, and IMPLEMENTATION_PLAN
// step 7 calls it "the single most sequenced moment in the game — give
// weapon, corrupt NPC, force the player to use it on them." The trick is
// entirely in the order: hand over the tool, then create the one target the
// player cannot refuse.
//
// REVISED, on the note that the story should be drawn out rather than
// resolved in one level. It was: he gives you the Cornerstone, corrupts,
// you put him back, and he walks off — all inside about ninety seconds, on
// the same screen. Every emotional beat the character had, spent at once,
// in the middle of level three of seven, after which he is simply fine
// again and shows up to wave you through the next four faces.
//
// Now the scene stops at the corruption. He is taken, and the player
// carries that for two levels before they find him on the fifth face
// (cutscenes/level5/reunion.js). The tool still gets handed over here —
// that part has to happen before the Sculptor at the end of this level —
// and the thing it's FOR is established here too. It just isn't spent here.
//
// Deliberately NOT `once: true`. It replays on a retry, which is the same
// call level 1's boss showdown makes and for the same reason: the player
// must never respawn into a level where the weapon was handed over by a
// scene that has been marked as seen and will not run again. Escape skips
// it for anyone who has watched it already, and the skip still runs
// onComplete, so they still end up holding it.

import { createQuarrick } from '../../entities/npc.js';
import { surfaceYAt } from '../../levels/levelLoader.js';
import { spawnExplosion } from '../../entities/particles.js';
import { playWeaponPickup, playHit, playRumble } from '../../audio/sfx.js';
import { getWeapon } from '../../weapons/registry.js';
import { say } from '../say.js';
import { setNpcStage, setFlag } from '../../narrative.js';

const CORNERSTONE_AMMO = 10;

// Everything that must be true when this is over, whether it was watched or
// skipped. Idempotent for the reason the runner's notes give: a skip at the
// wrong moment must never strand the player without the weapon.
function completeHandoff(c) {
  c.player.weapon = 'cornerstone';
  c.player.hasWeapon = true;
  c.player.ammo = Math.max(c.player.ammo, CORNERSTONE_AMMO);
  // Stage 3 is "corrupted" in the arc narrative.js documents. He stays
  // there for two levels now instead of two minutes.
  setNpcStage(3);
  setFlag('cornerstoneGiven');
  setFlag('quarrickTaken');
  c.state.rescueNPC = null;
}

export const l3Handoff = {
  id: 'l3-handoff',
  onComplete: completeHandoff,

  beats: [
    {
      name: 'stagger-in',
      frames: 60,
      enter(c) {
        c.data.quarrickX = c.player.x + 150;
        c.state.rescueNPC = createQuarrick(c.data.quarrickX, surfaceYAt(c.data.quarrickX), {
          facing: -1,
          // Worse than the player has ever seen him. The number is the
          // level's, so the arc is authored in one place.
          damage: c.level.quarrickDamage || 3
        });
      }
    },

    say('quarrick', "There you are. Good."),
    say('quarrick', "I can't hold it off much longer."),
    say('player',   "Hold what off?"),
    say('quarrick', "Take this. I made it out of what they took from me."),

    // The give. Its own beat so the sound and the toast land on the line
    // above rather than three lines later.
    {
      name: 'give',
      frames: 40,
      enter(c) {
        c.player.weapon = 'cornerstone';
        c.player.hasWeapon = true;
        c.player.ammo = Math.max(c.player.ammo, CORNERSTONE_AMMO);
        c.showToast(`${getWeapon('cornerstone').label} — PRESS B`, 150);
        playWeaponPickup();
      }
    },

    say('quarrick', "It fires corners. Put them back where they were taken."),
    say('player',   "What about you?"),
    say('quarrick', "Ah."),

    // The turn. No line over it — he simply stops being himself.
    {
      name: 'corrupt',
      frames: 70,
      enter(c) {
        const npc = c.state.rescueNPC;
        if (npc) {
          spawnExplosion(npc.x + npc.width / 2, npc.y + npc.height / 2, '#f2c14e');
          // Four corners gone: the worst the drawing goes, and the same
          // silhouette every corrupted square in the game wears. He's still
          // gold, which is the whole point — the player has to be able to
          // tell it's him (see drawQuarrickBody in entities/npc.js).
          npc.damage = 4;
          npc.facing = 1;
        }
        playHit();
      }
    },

    say('player', "Quarrick—"),

    // And he goes. Under his own legs, which is worse than being dragged:
    // there is nothing here for the player to fight or to shoot, and the
    // weapon they are holding — the one he just made for exactly this — is
    // not enough yet. That gap is the thing the next two levels are for.
    {
      name: 'taken',
      frames: 110,
      enter(c) {
        playRumble();
      },
      update(c) {
        const npc = c.state.rescueNPC;
        if (!npc) return;
        npc.state = 'walking';
        npc.facing = 1;
        npc.x += 2.2;
        npc.y = surfaceYAt(npc.x) - npc.height;
      }
    },

    say('narrator', "He doesn't look back."),
    say('player',   "...Where are they taking him?"),
    say('narrator', "Down. Same as everything else."),
    // Three words, because a ten-year-old has to know what to do and
    // anything longer would be the game explaining its own best moment.
    say('narrator', "Go and get him."),

    {
      name: 'gone',
      frames: 1,
      enter(c) {
        c.state.rescueNPC = null;
      }
    }
  ]
};
