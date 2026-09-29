// The weapon registry.
//
// Built as part of the same piece of work as the entity-agnostic combat
// core (weapons/combat.js), exactly as IMPLEMENTATION_PLAN's scaling note
// insisted: "register a weapon by name; look up behaviour, drawing, and
// sound by type" — one job done once, rather than an if/else chain that
// grows a branch per weapon in the pickup, the input path and the draw.
//
// A weapon is data plus four small functions. Nothing outside this file
// needs to know which weapon anyone is holding:
//
//   kind       'melee' fires a hitbox in front of the owner for `duration`
//              frames; 'restore' spawns a triangle projectile instead
//   cooldown   frames before it can be used again
//   duration   frames the swing/recoil animation (and melee hitbox) lasts
//   reach      px in front of the owner the melee hitbox extends
//   damage     hp removed per hit — most things in the game have 1
//   knockback  px/frame shoved along the swing direction
//   ammo       null for unlimited, else the amount a fresh pickup carries
//
// The roster is deliberately 3, inside GAME_DESIGN's 3-5 target. Pickaxe
// and Cornerstone are the two decided weapons; the sledgehammer is the one
// middle-tier candidate that shipped, chosen because "heavier, slower,
// knockback" is the clearest version of the middle tier's stated axis
// (trade mobility for power) and needs no new system to express.

import { pickaxeAngleAt, pickaxeFistAt, drawHeldPickaxeAt, SWING_COOLDOWN, SWING_DURATION } from './pickaxe.js';
import { sledgeAngleAt, sledgeFistAt, drawHeldSledgehammer } from './sledgehammer.js';
import { cornerstoneAngleAt, cornerstoneFistAt, drawHeldCornerstone } from './cornerstone.js';
import { chainsawAngleAt, chainsawFistAt, drawHeldChainsaw, drawChainsawIcon } from './chainsaw.js';
import { drillAngleAt, drillFistAt, drawHeldDrill, drawDrillPickup } from './drill.js';
import { drawPickaxeIcon, drawSledgehammerIcon, drawCornerstoneIcon } from '../engine/renderer.js';
import { playPickaxeSwing, playSledgeSwing, playCornerstoneFire, playChainsawStart } from '../audio/sfx.js';

const WEAPONS = {
  pickaxe: {
    id: 'pickaxe',
    label: 'PICKAXE',
    kind: 'melee',
    // Unchanged from the standalone module's constants on purpose: level 1
    // is finished and tuned, and tools/weapon-probe.html asserts against
    // how it currently plays.
    cooldown: SWING_COOLDOWN,
    duration: SWING_DURATION,
    reach: 51,
    // The chop travels from over the shoulder to level with the ground, so
    // the head is only out front for the back two thirds of it.
    activeFrom: 0.34,
    damage: 1,
    knockback: 0,
    score: 150,
    ammo: null,
    sound: playPickaxeSwing,
    angleAt: pickaxeAngleAt,
    fistAt: pickaxeFistAt,
    drawHeld: drawHeldPickaxeAt,
    drawIcon: drawPickaxeIcon
  },

  sledgehammer: {
    id: 'sledgehammer',
    label: 'SLEDGEHAMMER',
    kind: 'melee',
    // Slower than the pickaxe, more reach, double damage, and it shoves.
    //
    // Was cooldown 54 — nearly a full second between swings, on top of a
    // hitbox that stayed shut for the first half of the animation. Against
    // anything that moves that is not a power trade, it's a weapon you put
    // down; a player who misses once waits 54 frames to try again while a
    // pursuer closes. 38 still reads as heavy next to the pickaxe's 30 and
    // still costs you for a miss, without the wait being the main thing you
    // feel about the weapon.
    cooldown: 38,
    duration: 20,
    // 58, not 62. Its strike is an overhead smash that finishes BELOW the
    // player's feet, so its reach at torso height — where the hitbox is —
    // is shorter than a level chop's, and 62 left the box noticeably longer
    // than anywhere the head actually goes. Still longer than the pickaxe's
    // 51, which is the weapon's whole selling point.
    reach: 58,
    // 0.42 is the frame the head passes vertical on its way down — measured
    // off the arc in weapons/sledgehammer.js, not guessed. Earlier than
    // that and the box is open while the hammer is still up behind the
    // shoulder, which is the complaint that started all of this; later and
    // the weapon whiffs at anything that is moving.
    activeFrom: 0.42,
    damage: 2,
    knockback: 11,
    score: 200,
    ammo: null,
    sound: playSledgeSwing,
    angleAt: sledgeAngleAt,
    fistAt: sledgeFistAt,
    drawHeld: drawHeldSledgehammer,
    drawIcon: drawSledgehammerIcon
  },

  // The Excavator's rig. Enemy kit; nothing swings it at anyone.
  drill: {
    id: 'drill',
    label: 'DRILL',
    kind: 'melee',
    cooldown: 60,
    duration: 30,
    reach: 60,
    activeFrom: 0.2,
    // Held against the work, not swung through it. Without this the
    // Excavator drove its rig into the ground with a pickaxe's chopping
    // arc, which is not what a drill does and read as the wrong tool
    // playing the right animation. See the mining branch in
    // entities/enemy.js.
    bracedMining: true,
    damage: 1,
    knockback: 6,
    score: 150,
    ammo: null,
    sound: playChainsawStart,
    angleAt: drillAngleAt,
    fistAt: drillFistAt,
    drawHeld: drawHeldDrill,
    drawIcon: drawDrillPickup
  },

  // Enemy kit, not the player's. Nothing drops one — it's here because a
  // weapon is a weapon, and the whole point of this file is that the hit
  // path doesn't care who is swinging. Level 6's pursuers carry it.
  chainsaw: {
    id: 'chainsaw',
    label: 'CHAINSAW',
    kind: 'melee',
    // Faster than the sledgehammer, longer than the pickaxe, and with a much
    // longer active window. A chainsaw held out in front of a sphere that is
    // chasing you is a different problem from a swing you can wait out.
    cooldown: 40,
    duration: 26,
    reach: 56,
    // A thrust, not a swing: out fast and then held, so it's live early and
    // stays live. That long active window is the point of the weapon.
    activeFrom: 0.15,
    damage: 1,
    knockback: 4,
    score: 150,
    ammo: null,
    sound: playChainsawStart,
    angleAt: chainsawAngleAt,
    fistAt: chainsawFistAt,
    drawHeld: drawHeldChainsaw,
    drawIcon: drawChainsawIcon
  },

  cornerstone: {
    id: 'cornerstone',
    label: 'CORNERSTONE',
    kind: 'restore',
    cooldown: 26,
    duration: 14,
    reach: 0,          // it's the projectile that reaches, not the tool
    damage: 1,
    knockback: 0,
    score: 150,
    // Scarce on purpose. The tension the design doc protects is "every
    // rescue costs offence" — at this count a level's field octagons and
    // its spheres are genuinely competing for the same triangles, and
    // ammo pickups (entities/weaponPickup.js) top you back up rather than
    // making you rich.
    ammo: 10,
    sound: playCornerstoneFire,
    angleAt: cornerstoneAngleAt,
    fistAt: cornerstoneFistAt,
    drawHeld: drawHeldCornerstone,
    drawIcon: () => drawCornerstoneIcon(1)
  }
};

export function getWeapon(id) {
  if (!id) return null;
  const w = WEAPONS[id];
  if (!w) {
    console.warn(`unknown weapon "${id}" — add it to weapons/registry.js`);
    return null;
  }
  return w;
}

export function weaponIds() {
  return Object.keys(WEAPONS);
}
