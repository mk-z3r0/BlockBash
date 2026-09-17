import { ctx } from '../engine/renderer.js';

export let particles = [];

export function spawnExplosion(x, y, color) {
  for (let i = 0; i < 10; i++) {
    const angle = (Math.PI * 2 * i) / 10;
    particles.push({
      x, y,
      vx: Math.cos(angle) * (1.5 + Math.random() * 2),
      vy: Math.sin(angle) * (1.5 + Math.random() * 2),
      life: 20,
      maxLife: 20,
      size: 6,
      color,
      rotate: true,
      shrink: false
    });
  }
}

export function spawnDust(x, y, count, opts) {
  opts = opts || {};
  const life = opts.life || 26;
  const color = opts.color || 'rgba(235, 210, 150, 0.9)';
  const size = opts.size || 9;
  const spread = opts.spread || 1.6;
  const driftX = opts.driftX || 0;
  for (let i = 0; i < count; i++) {
    particles.push({
      x: x + (Math.random() - 0.5) * 10,
      y: y + (Math.random() - 0.5) * 6,
      vx: driftX + (Math.random() - 0.5) * spread,
      vy: -Math.random() * 1.1 - 0.3,
      life, maxLife: life,
      size: size * (0.8 + Math.random() * 0.7),
      color,
      rotate: false,
      angle: Math.random() * Math.PI,
      shrink: true,
      easeShrink: true
    });
  }
}

export function updateParticles() {
  for (const p of particles) {
    p.x += p.vx;
    p.y += p.vy;
    p.life--;
  }
  particles = particles.filter(p => p.life > 0);
}

export function resetParticles() {
  particles = [];
}

export function drawParticles() {
  for (const p of particles) {
    const maxLife = p.maxLife || 20;
    const baseSize = p.size || 6;
    const ratio = p.life / maxLife;
    const scale = p.shrink ? (p.easeShrink ? Math.sqrt(Math.max(0, ratio)) : ratio) : 1;
    const size = Math.max(1, baseSize * scale);
    ctx.save();
    ctx.globalAlpha = Math.max(0, ratio);
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotate ? p.life * 0.3 : (p.angle || 0));
    ctx.fillStyle = p.color;
    ctx.fillRect(-size / 2, -size / 2, size, size);
    if (p.easeShrink) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-size / 2, -size / 2, size, size);
    }
    ctx.restore();
  }
}
