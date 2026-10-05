import { ctx, VIEW_WIDTH, VIEW_HEIGHT } from '../engine/renderer.js';
import { muted } from '../audio/audio.js';
import { state } from '../state.js';
import { player } from '../entities/player.js';
import { getWeapon } from '../weapons/registry.js';
import { getLevel } from '../levels/levelLoader.js';
import { isCutsceneActive } from '../cutscenes/runner.js';
import { camera } from '../engine/camera.js';

export const toast = { text: null, timer: 0 };

export function showToast(text, duration) {
  toast.text = text;
  toast.timer = duration;
}

export function updateToast() {
  if (toast.timer > 0) toast.timer--;
}

// Fire-rate upgrades only: there is no ammunition counter.
function drawFireRate() {
  if (getWeapon(player.weapon)?.kind !== 'restore') return;
  ctx.save();
  ctx.textAlign = 'right';
  ctx.fillStyle = '#5ee7ff';
  ctx.font = 'bold 11px Trebuchet MS, Arial, sans-serif';
  const tier = Math.max(0, Math.min(3, player.fireRateTier || 0));
  ctx.fillText(tier === 0 ? 'FIRE RATE: BASE' : `FIRE RATE: +${tier}`, VIEW_WIDTH - 14, 44);
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = i < (player.fireRateTier || 0) ? '#5ee7ff' : '#344763';
    ctx.fillRect(VIEW_WIDTH - 24 - i * 12, 49, 8, 4);
  }
  ctx.restore();
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
  // The Demolition Crew is three bosses and the bar speaks for one. It used
  // to be the LEFTMOST — always a shielded bruiser — so the bar read
  // ARMOURED for nearly the whole fight and the one you could actually hurt
  // was never the one it described. Reported from play as "can't find any
  // openings". Speak for the shooter while it lives.
  if (best && best.crew) {
    const shooter = state.enemies.find(e => e.crew === best.crew && e.role === 'shooter' && e.alive);
    if (shooter) best = shooter;
  }
  return best;
}

// The crew shares one bar: everyone's remaining hp, and an instruction.
function crewBar(boss) {
  if (!boss.crew) return null;
  const crew = state.enemies.filter(e => e.crew === boss.crew);
  const total = crew.reduce((a, e) => a + (e.baseHp || 1), 0);
  const left = crew.reduce((a, e) => a + (e.alive ? Math.max(0, e.hp) : 0), 0);
  const shooterUp = crew.some(e => e.role === 'shooter' && e.alive);
  return {
    total, left,
    hint: shooterUp ? 'HIT THE ONE AT THE BACK — SHOTS PASS THE SHIELDS' : 'SHIELDS DOWN — STOMP THEM!'
  };
}

function drawBossBar() {
  const boss = activeBoss();
  if (!boss) return;

  const restoring = boss.restoreTotal != null && (boss.kind === 'octagon' || boss.kind === 'core');
  const crew = crewBar(boss);
  const total = crew ? crew.total : restoring ? boss.restoreTotal : (boss.baseHp || 1);
  const left = crew ? crew.left : restoring ? boss.restoreHits : Math.max(0, boss.hp);
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
  const label = crew ? 'THE DEMOLITION CREW' : boss.bossName || BOSS_LABELS[boss.bossKind] ||
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
  if (crew) {
    // The bar is for the crew as a whole and the thing to DO is the point.
    ctx.strokeStyle = '#ffd9a0';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    ctx.fillStyle = '#ffd9a0';
    ctx.font = 'bold 9px Trebuchet MS, Arial, sans-serif';
    ctx.fillText(crew.hint, VIEW_WIDTH / 2, y + h + 11);
  } else if (boss.invulnerable) {
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
    // The count, for the restoration bar only. It fills rather than empties
    // — noticed from play and liked — and saying how many faces are back
    // turns that from a thing the player works out into a thing the game
    // is telling them.
    ctx.fillText(
      restoring ? `PUT IT BACK — ${total - left}/${total}` : 'OPEN — HIT IT',
      VIEW_WIDTH / 2, y + h + 11);
  }
  ctx.restore();
}

export function drawHUD() {
  ctx.fillStyle = 'rgba(8, 13, 30, 0.82)';
  ctx.fillRect(8, 8, 150, 48);
  ctx.fillRect(VIEW_WIDTH - 112, 8, 104, 48);
  ctx.fillStyle = '#f2c14e';
  ctx.fillRect(8, 8, 3, 48);
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

  if (!isCutsceneActive()) {
    const level = getLevel();
    const progress = Math.max(0, Math.min(1, player.x / (level.worldEdgeX || level.worldWidth)));
    ctx.fillStyle = 'rgba(8, 13, 30, 0.8)';
    ctx.fillRect(14, VIEW_HEIGHT - 18, 110, 5);
    ctx.fillStyle = '#8effc0';
    ctx.fillRect(14, VIEW_HEIGHT - 18, 110 * progress, 5);
    ctx.fillStyle = '#aebfe6';
    ctx.font = 'bold 10px Trebuchet MS, Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`FACE ${state.currentLevelIndex + 1} / 7`, 14, VIEW_HEIGHT - 25);
    if (state.currentLevelIndex === 0 && player.x < 3700 && toast.timer <= 0) {
      const hint = player.x < 380 ? 'MOVE →   •   HOLD JUMP FOR HEIGHT' :
        player.x < 900 ? 'JUMP ON SPHERES TO BASH THEM!' :
        player.x > 3100 ? 'BIG GAP! HOLD RUN + JUMP' : 'HOLD SHIFT / B TO RUN + BASH';
      ctx.fillStyle = 'rgba(8, 13, 30, 0.88)';
      ctx.fillRect(210, VIEW_HEIGHT - 40, 380, 28);
      ctx.fillStyle = '#fff0a1';
      ctx.textAlign = 'center';
      ctx.font = 'bold 12px Trebuchet MS, Arial, sans-serif';
      ctx.fillText(hint, VIEW_WIDTH / 2, VIEW_HEIGHT - 22);
    }
  }
  drawFireRate();
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
