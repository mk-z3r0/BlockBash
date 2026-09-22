import { ctx, VIEW_WIDTH, VIEW_HEIGHT, drawRestoreTriangle } from '../engine/renderer.js';
import { muted } from '../audio/audio.js';
import { state } from '../state.js';
import { player } from '../entities/player.js';
import { getWeapon } from '../weapons/registry.js';
import { camera } from '../engine/camera.js';

export const toast = { text: null, timer: 0 };

export function showToast(text, duration) {
  toast.text = text;
  toast.timer = duration;
}

export function updateToast() {
  if (toast.timer > 0) toast.timer--;
}

// Ammo is only ever shown for a weapon that HAS ammo, which today means
// the Cornerstone alone. A counter that reads "-" or "unlimited" for every
// other weapon would be three quarters of the game showing a number that
// never moves.
//
// Drawn as the triangles themselves rather than a digit: the player already
// knows the shape (it's what the weapon fires and what an ammo pickup looks
// like), and at these counts — ten and down — pips are read at a glance
// where a number has to be read as a number. Below four they pulse, which
// is the only warning the scarcity gets.
function drawAmmo() {
  const weapon = getWeapon(player.weapon);
  if (!weapon || weapon.ammo == null) return;

  const count = Math.max(0, player.ammo);
  const low = count > 0 && count <= 3;
  ctx.save();
  ctx.globalAlpha = low ? 0.55 + 0.45 * Math.abs(Math.sin(state.frameCount * 0.12)) : 1;
  for (let i = 0; i < count; i++) {
    ctx.save();
    ctx.translate(VIEW_WIDTH - 22 - i * 15, 42);
    ctx.rotate(-Math.PI / 2);   // pointing up, so a row of them reads as a magazine
    drawRestoreTriangle(6, 1);
    ctx.restore();
  }
  ctx.restore();

  if (count === 0) {
    ctx.save();
    ctx.textAlign = 'right';
    ctx.fillStyle = '#7a84a8';
    ctx.font = 'bold 12px Trebuchet MS, Arial, sans-serif';
    ctx.fillText('NO TRIANGLES', VIEW_WIDTH - 14, 47);
    ctx.restore();
  }
}

// A boss bar, shown only while a boss is actually on screen.
//
// Bosses in this game are read rather than out-damaged — you wait for the
// Excavator's drill to bind, you work out which of the Crew is reachable,
// you ride the Terraformer's cycle — and none of that is legible if the
// player can't tell whether they're making progress. This is the difference
// between "hard" and "opaque", and it's the single cheapest fairness win
// available.
//
// It also states the two kinds of boss in the game plainly, because they're
// beaten by different verbs: red is health coming off, cyan is corners going
// back on.
const BOSS_LABELS = {
  excavator: 'THE EXCAVATOR',
  crew: 'THE DEMOLITION CREW',
  terraformer: 'THE TERRAFORMER',
  general: 'THE GENERAL',
  core: 'THE CORE'
};

function activeBoss() {
  let best = null;
  for (const e of state.enemies) {
    if (!e.boss || !e.alive || e.restored) continue;
    // On screen, with a margin — a bar for something the player can't see
    // yet is a spoiler, not information.
    if (e.x + e.w < camera.x - 40 || e.x > camera.x + VIEW_WIDTH + 40) continue;
    if (!best || e.x < best.x) best = e;
  }
  return best;
}

function drawBossBar() {
  const boss = activeBoss();
  if (!boss) return;

  const restoring = boss.restoreTotal != null && (boss.kind === 'octagon' || boss.kind === 'core');
  const total = restoring ? boss.restoreTotal : (boss.baseHp || 1);
  const left = restoring ? boss.restoreHits : Math.max(0, boss.hp);
  // A restoration bar FILLS as you work; a health bar empties. They're
  // opposite jobs and should not look like the same thing running backwards.
  const frac = restoring ? 1 - left / total : left / total;
  if (!restoring && left >= total && boss.invulnerable) {
    // untouched and currently closed — still worth naming, see below
  }

  // At the TOP, not the bottom. The bottom is where the ground is, and a
  // boss bar there sits directly on the fight it's describing — obscuring
  // the two things the player most needs to watch. Up here it's clear of
  // the score (y26), the coin count (y49) and the level-name toast (y46).
  const w = 260, h = 9;
  const x = (VIEW_WIDTH - w) / 2, y = 76;

  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = restoring ? '#5ee7ff' : '#ff9fc4';
  ctx.font = 'bold 11px Trebuchet MS, Arial, sans-serif';
  const label = boss.bossName || BOSS_LABELS[boss.bossKind] ||
                (boss.kind === 'octagon' ? 'THE SCULPTOR' : 'BOSS');
  ctx.fillText(label, VIEW_WIDTH / 2, y - 6);

  ctx.fillStyle = 'rgba(10, 13, 28, 0.75)';
  ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
  ctx.fillStyle = restoring ? 'rgba(94, 231, 255, 0.18)' : 'rgba(255, 159, 196, 0.16)';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = restoring ? '#5ee7ff' : '#ff4d8d';
  ctx.fillRect(x, y, w * Math.max(0, Math.min(1, frac)), h);

  // Whether it can be hurt RIGHT NOW is the thing the player most needs and
  // is least able to see, so the bar says it outright.
  if (boss.invulnerable) {
    ctx.strokeStyle = 'rgba(232, 236, 247, 0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    ctx.fillStyle = '#7a84a8';
    ctx.font = 'bold 9px Trebuchet MS, Arial, sans-serif';
    ctx.fillText('ARMOURED', VIEW_WIDTH / 2, y + h + 11);
  } else {
    ctx.strokeStyle = restoring ? '#d7faff' : '#ffd9a0';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    ctx.fillStyle = restoring ? '#d7faff' : '#ffd9a0';
    ctx.font = 'bold 9px Trebuchet MS, Arial, sans-serif';
    ctx.fillText(restoring ? 'PUT IT BACK' : 'OPEN — HIT IT', VIEW_WIDTH / 2, y + h + 11);
  }
  ctx.restore();
}

export function drawHUD() {
  ctx.fillStyle = '#e8ecf7';
  ctx.font = 'bold 16px Trebuchet MS, Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('SCORE  ' + state.score, 14, 26);

  ctx.save();
  ctx.translate(20, 44);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = '#5ee7ff';
  ctx.fillRect(-5, -5, 10, 10);
  ctx.restore();
  ctx.fillStyle = '#5ee7ff';
  ctx.font = 'bold 14px Trebuchet MS, Arial, sans-serif';
  ctx.fillText(String(state.coinsCollected), 34, 49);

  for (let i = 0; i < state.lives; i++) {
    ctx.fillStyle = '#f2c14e';
    ctx.fillRect(VIEW_WIDTH - 30 - i * 26, 12, 16, 16);
  }

  drawAmmo();
  drawBossBar();

  if (toast.timer > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, toast.timer / 30);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#8effc0';
    ctx.font = 'bold 15px Trebuchet MS, Arial, sans-serif';
    ctx.fillText(toast.text, VIEW_WIDTH / 2, 46);
    ctx.restore();
  }

  if (muted) {
    ctx.textAlign = 'right';
    ctx.fillStyle = '#7a84a8';
    ctx.font = '12px Trebuchet MS, Arial, sans-serif';
    ctx.fillText('muted', VIEW_WIDTH - 14, VIEW_HEIGHT - 12);
  }
}
