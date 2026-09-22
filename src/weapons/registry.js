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
import { drawPickaxeIcon, drawSledgehammerIcon, drawCornerstoneIcon } from '../engine/renderer.js';
import { playPickaxeSwing, playSledgeSwing, playCornerstoneFire } from '../audio/sfx.js';

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
    // Half the swing rate of the pickaxe, ~22% more reach, and it shoves.
    // Slow enough that mistiming it against a pursuing sphere genuinely
    // costs you, which is the point of a power trade.
    cooldown: 54,
    duration: 22,
    reach: 62,
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
