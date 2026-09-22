// Ordered list of levels, in play order. Reaching the goal advances to the
// next entry; running out past the last one means the game is won. Add a
// level by appending its data module here — nothing else needs to change.
import level1 from './data/level1.js';
import level2 from './data/level2.js';
import level3 from './data/level3.js';
import level4 from './data/level4.js';
import level5 from './data/level5.js';
import level6 from './data/level6.js';
import level7 from './data/level7.js';
import testLevel from './data/testLevel.js';

// ?test in the URL swaps in the sandbox duplicate instead of the real
// progression — for messing with controls/weapons/enemies without touching
// level1.js. Resolved once at load, same as everything else here.
const useTestLevel = typeof location !== 'undefined' && new URLSearchParams(location.search).has('test');

export const levels = useTestLevel ? [testLevel] : [level1, level2, level3, level4, level5, level6, level7];
