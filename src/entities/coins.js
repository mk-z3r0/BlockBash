import { ctx } from '../engine/renderer.js';
import { isColliding } from '../engine/physics.js';
import { getLevel } from '../levels/levelLoader.js';
import { playCoin } from '../audio/sfx.js';
import { state } from '../state.js';

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
      playCoin();
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
