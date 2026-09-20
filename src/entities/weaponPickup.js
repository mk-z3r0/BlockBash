import { ctx, drawPickaxeIcon } from '../engine/renderer.js';
import { isColliding } from '../engine/physics.js';
import { playWeaponPickup } from '../audio/sfx.js';
import { showToast } from '../ui/hud.js';
import { state } from '../state.js';

// The level 1 boss drops its pickaxe when the rescue NPC (or, as a
// fallback, the cutscene timing out) takes it down — see
// scenes/playingScene.js and entities/npc.js, the only callers of this.
// The player starts unarmed; this is the only way to earn a weapon.
export function spawnWeaponPickup(x, groundY) {
  state.weaponPickups.push({ x, y: groundY, size: 22, collected: false });
}

export function updateWeaponPickups(player) {
  for (const pickup of state.weaponPickups) {
    if (pickup.collected) continue;
    const box = { x: pickup.x - pickup.size / 2, y: pickup.y - pickup.size, width: pickup.size, height: pickup.size };
    if (isColliding(player, box)) {
      pickup.collected = true;
      player.hasWeapon = true;
      showToast('PICKAXE ACQUIRED!', 120);
      playWeaponPickup();
    }
  }
}

export function drawWeaponPickups(frameCount) {
  for (const pickup of state.weaponPickups) {
    if (pickup.collected) continue;
    const bob = Math.sin((frameCount + pickup.x) * 0.08) * 3;
    ctx.save();
    ctx.translate(pickup.x, pickup.y - pickup.size / 2 + bob);
    ctx.rotate(-0.5); // lying tilted on the ground, not standing upright
    // drawPickaxeIcon()'s origin is the grip end of the handle (see
    // renderer.js) — held poses want that directly, but a dropped pickup
    // reads better centered on the ground than anchored by one end, hence
    // this extra offset (applied in the icon's own rotated local space, so
    // it stays centered regardless of the tilt above)
    ctx.translate(-13, 7);
    drawPickaxeIcon();
    ctx.restore();
  }
}
