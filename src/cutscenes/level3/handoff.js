// The handoff, and the corruption immediately after it.
//
// GAME_DESIGN calls this the game's central beat, and IMPLEMENTATION_PLAN
// step 7 calls it "the single most sequenced moment in the game — give
// weapon, corrupt NPC, force the player to use it on them." The trick is
// entirely in the order: hand over the tool, then create the one target the
// player cannot refuse. The tutorial for the mechanic IS the emotional peak.
//
// Deliberately NOT `once: true`. It replays on a retry, which is the same
// call level 1's boss showdown makes and for the same reason: the player
// must never respawn into a level where the weapon was handed over by a
// scene that has been marked as seen and will not run again. Escape skips
// it for anyone who has watched it already, and the skip still runs
// onComplete, so they still end up holding it.

import { createQuarrick } from '../../entities/npc.js';
import { spawnExplosion } from '../../entities/particles.js';
import { playWeaponPickup, playHit } from '../../audio/sfx.js';
import { getWeapon } from '../../weapons/registry.js';
import { say } from '../say.js';
import { setNpcStage, setFlag } from '../../narrative.js';

const CORNERSTONE_AMMO = 10;

// Everything that must be true when this is over, whether it was watched or
// skipped. Idempotent for the reason the runner's notes give: a skip at the
// wrong moment must never strand the player without the weapon, or without
// the thing they have to use it on.
function completeHandoff(c) {
  c.player.weapon = 'cornerstone';
  c.player.hasWeapon = true;
  c.player.ammo = Math.max(c.player.ammo, CORNERSTONE_AMMO);
  setNpcStage(3);
  setFlag('cornerstoneGiven');

  // He isn't a character any more, he's an obstacle in the shape of one.
  if (!c.state.enemies.some(e => e.quarrick)) {
    const groundY = c.level.groundY;
    c.state.enemies.push({
      quarrick: true,
      kind: 'octagon',
      x: c.data.quarrickX == null ? c.player.x + 150 : c.data.quarrickX,
      y: groundY - 44,
      w: 44,
      minX: 0, maxX: c.level.worldWidth,
      speed: 0.6,
      tier: 'passive',
      alive: true, squish: 0, hp: 999,
      baseY: groundY - 44, baseX: 0,
      hopVY: 0, hopTimer: 9999, shout: 0,
      awake: false, swingPhase: 0, mining: false,
      weaponTimer: 0, weaponCooldown: 0, hitThisSwing: null,
      facing: -1, hitFlash: 0, knockback: 0, thudTimer: 0, shotTimer: 9999,
      // Three triangles. Enough to feel like an act rather than a click,
      // few enough that a player who has just been handed ten can afford it
      // without thinking about the arithmetic.
      restoreTotal: 3, restoreHits: 3,
      cornersLost: 4, restoreFlash: 0, restored: false, fleeing: false
    });
  }
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
        c.state.rescueNPC = createQuarrick(c.data.quarrickX, c.level.groundY, {
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
        if (npc) spawnExplosion(npc.x + npc.width / 2, npc.y + npc.height / 2, '#f2c14e');
        playHit();
        completeHandoff(c);
      }
    },

    // Three words, because a seven-year-old has to know what to do and
    // anything longer would be the game explaining its own best moment.
    say('narrator', "Put him back.")
  ]
};

// What happens once they do.
export const l3Restored = {
  id: 'l3-restored',

  onComplete(c) {
    setFlag('quarrickRestored');
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
          // He comes back scarred, not new. The corners the spheres took
          // are still gone — restoring someone isn't the same as undoing
          // what was done to them.
          c.state.rescueNPC = createQuarrick(q.x, c.level.groundY, { facing: -1, damage: 2 });
        }
      }
    },

    say('quarrick', "...Oh."),
    say('quarrick', "It works, then."),
    say('player',   "You're all right?"),
    say('quarrick', "I'm square. That'll do."),
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
