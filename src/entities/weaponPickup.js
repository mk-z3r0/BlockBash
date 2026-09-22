import { ctx } from '../engine/renderer.js';
import { isColliding } from '../engine/physics.js';
import { playWeaponPickup, playAmmoPickup } from '../audio/sfx.js';
import { showToast } from '../ui/hud.js';
import { state } from '../state.js';
import { getWeapon } from '../weapons/registry.js';
import { drawRestoreTriangle } from '../engine/renderer.js';

// Weapons are earned, never found lying around at the start of a level: a
// boss drops one when it goes down (the level 1 Foreman via Quarrick's
// stomp, every boss after it by being beaten), and the player walks onto
// it. The player starts every level unarmed — see startLevel().
//
// `type` is a weapon id from weapons/registry.js. It used to be implicit
// (there was only the pickaxe), which is exactly the if/else chain the
// registry was built to avoid.
export function spawnWeaponPickup(x, groundY, type = 'pickaxe', fromBoss = true) {
  // `fromBoss` marks this as something a fight produced rather than
  // something the level placed. A respawn clears boss drops (the fight is
  // restarting, and a drop from the last attempt would sit stranded beside a
  // boss that's alive again) and must NOT clear the level's own pickups.
  //
  // It defaults to true because for most of this game's life a dropped
  // weapon was the ONLY kind. Level 6's sledgehammer is the first one a
  // level places itself, and it was being swept off its shelf during load
  // until this argument existed.
  state.weaponPickups.push({ x, y: groundY, size: 22, type, kind: 'weapon', fromBoss, collected: false });
}

// Triangles for the Cornerstone. Placed in levels rather than dropped,
// because running dry needs a visible way back — the scarcity is meant to
// make each rescue a decision, not to soft-lock a 7-year-old who spent the
// lot on the first octagon they met.
export function spawnAmmoPickup(x, y, amount = 4) {
  state.weaponPickups.push({ x, y, size: 18, kind: 'ammo', amount, collected: false });
}

function give(pickup, player) {
  if (pickup.kind === 'ammo') {
    player.ammo += pickup.amount;
    showToast(`+${pickup.amount} TRIANGLES`, 80);
    playAmmoPickup();
    return;
  }
  const weapon = getWeapon(pickup.type);
  if (!weapon) return;

  // Say what it COST, not just what it gave. The player carries one weapon,
  // so picking up level 6's sledgehammer puts the Cornerstone down and takes
  // every triangle with it — and a toast reading "SLEDGEHAMMER ACQUIRED!"
  // tells a seven-year-old they gained something, which is half the story.
  const had = getWeapon(player.weapon);
  const tradedAway = had && had.id !== weapon.id && had.ammo != null && player.ammo > 0;

  player.weapon = weapon.id;
  player.hasWeapon = true;
  // A weapon with its own ammo arrives loaded. Picking the same one up
  // again tops it back up rather than resetting it downward.
  if (weapon.ammo != null) player.ammo = Math.max(player.ammo, weapon.ammo);

  showToast(tradedAway ? `${weapon.label} — ${had.label} PUT DOWN` : `${weapon.label} ACQUIRED!`, 150);
  playWeaponPickup();
}

export function updateWeaponPickups(player) {
  for (const pickup of state.weaponPickups) {
    if (pickup.collected) continue;
    const box = {
      x: pickup.x - pickup.size / 2,
      y: pickup.y - pickup.size,
      width: pickup.size,
      height: pickup.size
    };
    if (isColliding(player, box)) {
      pickup.collected = true;
      give(pickup, player);
    }
  }
}

export function drawWeaponPickups(frameCount) {
  for (const pickup of state.weaponPickups) {
    if (pickup.collected) continue;
    const bob = Math.sin((frameCount + pickup.x) * 0.08) * 3;

    if (pickup.kind === 'ammo') {
      // a small cluster of triangles, spinning slowly — the same shape the
      // weapon fires, so what it refills needs no explaining
      ctx.save();
      ctx.translate(pickup.x, pickup.y - pickup.size / 2 + bob);
      for (let i = 0; i < 3; i++) {
        ctx.save();
        ctx.rotate(frameCount * 0.02 + (i * Math.PI * 2) / 3);
        ctx.translate(7, 0);
        drawRestoreTriangle(6, 1);
        ctx.restore();
      }
      ctx.restore();
      continue;
    }

    const weapon = getWeapon(pickup.type);
    if (!weapon) continue;
    ctx.save();
    ctx.translate(pickup.x, pickup.y - pickup.size / 2 + bob);
    ctx.rotate(-0.5); // lying tilted on the ground, not standing upright
    // Every weapon icon's origin is the grip end of its handle (see
    // renderer.js), which held poses want directly — but a dropped pickup
    // reads better centered on the ground than anchored by one end, hence
    // this offset, applied in the icon's own rotated local space so it
    // stays centered regardless of the tilt above.
    ctx.translate(-13, 7);
    weapon.drawIcon();
    ctx.restore();
  }
}
