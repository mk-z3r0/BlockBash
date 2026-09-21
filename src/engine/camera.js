// `y` is 0 for all normal play — the game is a flat side-scroller and
// nothing follows the player vertically. It exists for scripted moments
// that need to reframe deliberately: the level-edge transition pans it down
// so the player sits at the centre of the screen and the drop past the edge
// is actually visible (see scenes/playingScene.js's 'brink' beat).
export const camera = { x: 0, y: 0 };

// Follows the player, clamped to the world, eased toward its target.
// Horizontal only — see the note above `camera` on why y isn't touched here.
export function updateCamera(playerX, viewWidth, worldWidth) {
  const targetCameraX = Math.max(0, Math.min(playerX - viewWidth / 2.6, worldWidth - viewWidth));
  camera.x += (targetCameraX - camera.x) * 0.12;
}

export function resetCamera() {
  camera.x = 0;
  camera.y = 0;
}
