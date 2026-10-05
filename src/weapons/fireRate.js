// Cornerstone upgrades survive level changes, but each death resets the tier.
// Fixed 60 Hz ticks: one shot per second, then progressively shorter waits.
// A blocked attack is silent; only a successfully fired triangle makes sound.
export const FIRE_COOLDOWNS = [60, 45, 30, 20];
export function fireCooldown(player) {
  return FIRE_COOLDOWNS[Math.max(0, Math.min(3, player.fireRateTier || 0))];
}
export function upgradeFireRate(player) {
  player.fireRateTier = Math.min(3, (player.fireRateTier || 0) + 1);
  // Apply the faster cadence immediately, including an in-flight cooldown.
  player.weaponCooldown = Math.min(player.weaponCooldown || 0, fireCooldown(player));
  return player.fireRateTier;
}
