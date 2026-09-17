export const camera = { x: 0 };

// Follows the player, clamped to the world, eased toward its target.
export function updateCamera(playerX, viewWidth, worldWidth) {
  const targetCameraX = Math.max(0, Math.min(playerX - viewWidth / 2.6, worldWidth - viewWidth));
  camera.x += (targetCameraX - camera.x) * 0.12;
}

export function resetCamera() {
  camera.x = 0;
}
