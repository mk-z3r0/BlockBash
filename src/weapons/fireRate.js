// Cornerstone upgrades survive level changes, but each death resets the tier.
export const FIRE_COOLDOWNS = [26, 20, 15, 11];
export function fireCooldown(player) {
  return FIRE_COOLDOWNS[Math.max(0, Math.min(3, player.fireRateTier || 0))];
}
export function upgradeFireRate(player) {
  player.fireRateTier = Math.min(3, (player.fireRateTier || 0) + 1);
  // Apply the faster cadence immediately, including an in-flight cooldown.
  player.weaponCooldown = Math.min(player.weaponCooldown || 0, fireCooldown(player));
  return player.fireRateTier;
}
