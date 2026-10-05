// Raw keyboard state, plus a single pair of hooks for edge-triggered actions
// (main.js wires these to audio/mute/scene behavior). Scenes read `keys`
// directly each frame for held-key checks (movement, the earned weapon).
export const keys = {};
export const actionHeld = () => !!(keys.Shift || keys.b || keys.B);

export function initInput({ onKeyDown, onKeyUp } = {}) {
  document.addEventListener('keydown', (e) => {
    if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) e.preventDefault();
    const alreadyDown = keys[e.key];
    keys[e.key] = true;
    if (onKeyDown) onKeyDown(e, alreadyDown);
  });
  window.addEventListener('blur', () => { for (const key in keys) keys[key] = false; });
  document.addEventListener('keyup', (e) => {
    keys[e.key] = false;
    if (onKeyUp) onKeyUp(e);
  });
}
