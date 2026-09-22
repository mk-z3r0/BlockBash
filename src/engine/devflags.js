// URL flags, in one place.
//
// The game already had `?test` (levels/registry.js) swapping in the sandbox
// level. IMPLEMENTATION_PLAN's parked debug-mode note says to gate the rest
// the same way — "a `?debug` URL param (matching the existing `?test`), with
// a hotkey to toggle" — so this is that, starting with the first thing that
// section lists under "asked for directly": quick traversal.
//
//   ?level=2   boot straight into level 2 (1-based, the way a person counts)
//   ?debug     in-game traversal keys, and every level unlocked on the title
//
// Read once at load, like `?test`.

const params = typeof location !== 'undefined'
  ? new URLSearchParams(location.search)
  : new URLSearchParams('');

// The probe pages under tools/ take their OWN `?level=` and it is 0-based
// (tools/level-audit-probe.html?level=0 is the first level). Those pages
// import main.js, which would otherwise read the same param, boot into the
// wrong level and fight the probe for control of the scene. So the game's
// flag only applies when the game itself is the page.
const isToolPage = typeof location !== 'undefined' && location.pathname.includes('/tools/');

export const DEBUG = !isToolPage && params.has('debug');

// null when not given. 1-based in the URL because "start at level 2" is what
// a person means; 0-based everywhere inside the code.
export const START_LEVEL = (() => {
  if (isToolPage || !params.has('level')) return null;
  const n = parseInt(params.get('level'), 10);
  return Number.isFinite(n) ? Math.max(0, n - 1) : null;
})();
