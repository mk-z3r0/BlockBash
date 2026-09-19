import { audioCtx, sfxGain, tone, noiseBurst } from './audio.js';

export function playJump() {
  if (!audioCtx) return;
  const t = audioCtx.currentTime;
  tone(320, t, 0.12, 'square', 0.18, sfxGain, 3000, 640);
}
export function playStomp() {
  if (!audioCtx) return;
  const t = audioCtx.currentTime;
  tone(420, t, 0.14, 'sawtooth', 0.2, sfxGain, 1200, 90);
  noiseBurst(t, 0.08, 0.15, sfxGain, 'lowpass', 1500);
}
export function playCoin() {
  if (!audioCtx) return;
  const t = audioCtx.currentTime;
  tone(880, t, 0.08, 'square', 0.15, sfxGain, 5000);
  tone(1318.5, t + 0.06, 0.1, 'square', 0.15, sfxGain, 5000);
}
export function playHit() {
  if (!audioCtx) return;
  const t = audioCtx.currentTime;
  tone(400, t, 0.3, 'sawtooth', 0.22, sfxGain, 900, 70);
  noiseBurst(t, 0.2, 0.15, sfxGain, 'lowpass', 800);
}
export function playMissile() {
  if (!audioCtx) return;
  const t = audioCtx.currentTime;
  tone(150, t, 0.2, 'sawtooth', 0.2, sfxGain, 500, 60);
  noiseBurst(t, 0.15, 0.18, sfxGain, 'lowpass', 3000);
}
export function playExplosion() {
  if (!audioCtx) return;
  const t = audioCtx.currentTime;
  tone(80, t, 0.25, 'sine', 0.3, sfxGain, null);
  noiseBurst(t, 0.35, 0.28, sfxGain, 'lowpass', 2000);
}
export function playSurprise() {
  if (!audioCtx) return;
  const t = audioCtx.currentTime;
  // a silly upward "boing" — deliberately cartoonish
  tone(220, t, 0.18, 'square', 0.16, sfxGain, 3500, 900);
  tone(140, t + 0.02, 0.14, 'triangle', 0.12, sfxGain, 2000, 500);
}
export function playChainsawStart() {
  if (!audioCtx) return;
  const t = audioCtx.currentTime;
  // a nasty two-pull rev
  tone(90, t, 0.28, 'sawtooth', 0.26, sfxGain, 1400, 260);
  noiseBurst(t, 0.3, 0.2, sfxGain, 'bandpass', 1800);
  tone(120, t + 0.32, 0.45, 'sawtooth', 0.26, sfxGain, 2200, 420);
  noiseBurst(t + 0.32, 0.5, 0.22, sfxGain, 'bandpass', 2400);
}
export function playChainsawLoop() {
  if (!audioCtx) return;
  const t = audioCtx.currentTime;
  tone(300, t, 0.48, 'sawtooth', 0.12, sfxGain, 2600, 340);
  noiseBurst(t, 0.45, 0.07, sfxGain, 'bandpass', 3000);
}
export function playDeflect() {
  if (!audioCtx) return;
  const t = audioCtx.currentTime;
  tone(1400, t, 0.1, 'square', 0.16, sfxGain, 6000, 700);
  noiseBurst(t, 0.12, 0.2, sfxGain, 'highpass', 5000);
}
export function playCheckpoint() {
  if (!audioCtx) return;
  const t = audioCtx.currentTime;
  tone(523.25, t, 0.1, 'square', 0.16, sfxGain, 4000);
  tone(659.25, t + 0.1, 0.16, 'square', 0.16, sfxGain, 4000);
}
export function playSpaceAmbient() {
  if (!audioCtx) return;
  const t = audioCtx.currentTime;
  // a slow, low swell — not a loop, just enough sustain to read as
  // "establishing shot" rather than a one-shot blip. Gains raised from the
  // first pass (0.1/0.07) — noticeably quiet against the punchier gameplay
  // sfx and the music that kicks in once the level starts, per playtest.
  tone(65, t, 2.2, 'sine', 0.2, sfxGain, 300);
  tone(98, t + 0.15, 2.0, 'sine', 0.15, sfxGain, 400);
}
export function playApproach() {
  if (!audioCtx) return;
  const t = audioCtx.currentTime;
  noiseBurst(t, 1.4, 0.22, sfxGain, 'bandpass', 1200);
  tone(180, t, 1.2, 'sawtooth', 0.18, sfxGain, 800, 340);
}
export function playRumble() {
  if (!audioCtx) return;
  const t = audioCtx.currentTime;
  // lower and longer than playExplosion — meant to feel felt-through-the-
  // floor rather than heard, for the shockwave reaching the house
  tone(55, t, 1.1, 'sine', 0.3, sfxGain, 220);
  noiseBurst(t, 0.9, 0.22, sfxGain, 'lowpass', 300);
}
export function playDoorOpen() {
  if (!audioCtx) return;
  const t = audioCtx.currentTime;
  // a short creak — filtered noise with a rising pitch, plus a soft low
  // thud as it settles open
  noiseBurst(t, 0.35, 0.22, sfxGain, 'bandpass', 700);
  tone(140, t, 0.25, 'triangle', 0.2, sfxGain, 500, 220);
  tone(90, t + 0.28, 0.18, 'sine', 0.22, sfxGain, 300);
}
export function playExtraLife() {
  if (!audioCtx) return;
  const t = audioCtx.currentTime;
  // a bright rising run — distinct from checkpoint (2 notes, square) and
  // win (longer, square): triangle tone, quick 1-up feel
  [659.25, 783.99, 1046.5].forEach((f, i) => tone(f, t + i * 0.09, 0.14, 'triangle', 0.2, sfxGain, 5000));
}
export function playWin() {
  if (!audioCtx) return;
  const t = audioCtx.currentTime;
  [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, t + i * 0.12, 0.18, 'square', 0.18, sfxGain, 4500));
}
export function playGameOver() {
  if (!audioCtx) return;
  const t = audioCtx.currentTime;
  [392, 349.23, 293.66, 220].forEach((f, i) => tone(f, t + i * 0.15, 0.25, 'sawtooth', 0.18, sfxGain, 900));
}
