// Difficulty: three presets, chosen on the title screen, remembered.
//
// Normal is the game as tuned for a ten-year-old and as every probe measures
// it. Easy and Hard scale SPEEDS only — enemies, bosses, and (so the player
// can keep up with them) the player — plus how fast the Demolition Crew
// swings and shoots, and Hard gives fightable bosses 1.5x hit points
// (rounded up; restoration targets like the Core and Sculptor are won with
// triangles, not hp, and are left alone). Nothing about level geometry or
// what is reachable changes, so a level that passes its audits on Normal passes them on all
// three: the jump carry only ever grows or stays put.
//
//   easy    softer and slower. Bosses 0.8x, other enemies 0.9x.
//   normal  as shipped.
//   hard    bosses 1.35x and the Crew swings and fires faster; enemies 1.15x;
//           the player 1.1x so a faster world is still a controllable one.
//
// Applied at spawn (entities/enemy.js) and when a level starts
// (scenes/playingScene.js); the AI itself never asks which one is active.

import { P } from './engine/physics.js';

export const DIFFICULTIES = {
  easy:   { label: 'EASY',   enemy: 0.9,  boss: 0.8,  player: 1.0,  tempo: 0.8,  bossHp: 1 },
  normal: { label: 'NORMAL', enemy: 1.0,  boss: 1.0,  player: 1.0,  tempo: 1.0,  bossHp: 1 },
  hard:   { label: 'HARD',   enemy: 1.15, boss: 1.35, player: 1.1,  tempo: 1.35, bossHp: 1.5 }
};
export const ORDER = ['easy', 'normal', 'hard'];
const KEY = 'blockbash-difficulty';

let current = 'normal';
const base = { walkMax: P.walkMax, runMax: P.runMax, pSpeedMax: P.pSpeedMax };

export function initDifficulty() {
  try {
    const v = localStorage.getItem(KEY);
    if (DIFFICULTIES[v]) current = v;
  } catch { /* private window: stay on normal */ }
  applyPlayerSpeed();
}

export function getDifficulty() { return DIFFICULTIES[current]; }
export function getDifficultyId() { return current; }

export function setDifficulty(id) {
  if (!DIFFICULTIES[id]) return;
  current = id;
  try { localStorage.setItem(KEY, id); } catch { /* not worth failing over */ }
  applyPlayerSpeed();
}

export function cycleDifficulty(step) {
  const i = ORDER.indexOf(current);
  setDifficulty(ORDER[(i + step + ORDER.length) % ORDER.length]);
}

// The player's speed caps come from the base values every time, never from
// the previous scaled ones, so cycling can't compound.
function applyPlayerSpeed() {
  const k = DIFFICULTIES[current].player;
  P.walkMax = base.walkMax * k;
  P.runMax = base.runMax * k;
  P.pSpeedMax = base.pSpeedMax * k;
}
