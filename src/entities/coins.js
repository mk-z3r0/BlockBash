import { ctx } from '../engine/renderer.js';
import { isColliding } from '../engine/physics.js';
import { getLevel } from '../levels/levelLoader.js';
import { playCoin, playExtraLife } from '../audio/sfx.js';
import { showToast } from '../ui/hud.js';
import { state } from '../state.js';

// Coins accumulate across a whole run, not just one level — reset alongside
// score/lives in playingScene's retryCurrentLevel/startNewRun, never on a
// plain level-to-level advance. Tuned against level 1's ~45 coins so a full
// clear earns more than one extra life without maxing out MAX_LIVES on its
// own (see the Level 1 retrofit checklist in IMPLEMENTATION_PLAN.md).
const COINS_PER_LIFE = 20;
const MAX_LIVES = 9; // also keeps the HUD's life-icon row from running off-canvas

export let coins = [];

export function resetCoins() {
  coins = getLevel().coinSpawns.map(([x, y]) => ({ x, y, size: 12, collected: false }));
}

export function updateCoins(player) {
  for (const coin of coins) {
    if (coin.collected) continue;
    const cBox = { x: coin.x - coin.size / 2, y: coin.y - coin.size / 2, width: coin.size, height: coin.size };
    if (isColliding(player, cBox)) {
      coin.collected = true;
      state.score += 10;
      state.coinsCollected++;
      playCoin();

      if (state.coinsCollected % COINS_PER_LIFE === 0 && state.lives < MAX_LIVES) {
        state.lives++;
        showToast('EXTRA LIFE!', 100);
        playExtraLife();
      }
    }
  }
}

export function drawCoins(frameCount) {
  for (const coin of coins) {
    if (coin.collected) continue;
    const bob = Math.sin((frameCount + coin.x) * 0.08) * 3;
    ctx.save();
    ctx.translate(coin.x, coin.y + bob);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = '#5ee7ff';
    ctx.fillRect(-coin.size / 2, -coin.size / 2, coin.size, coin.size);
    ctx.strokeStyle = '#b6f6ff';
    ctx.lineWidth = 2;
    ctx.strokeRect(-coin.size / 2, -coin.size / 2, coin.size, coin.size);
    ctx.restore();
  }
}
