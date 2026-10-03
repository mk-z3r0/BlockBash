// Procedural cyberpunk soundtrack + tone/noise primitives.
// No external audio files — everything here is synthesized.
export let audioCtx = null;
export let masterGain = null;
export let musicGain = null;
export let sfxGain = null;
export let muted = false;

let noiseBuffer = null;
let musicTimer = null;
let nextNoteTime = 0;
let step16 = 0;
let musicStarted = false;

// Sets up the audio graph and unlocks the context — required before ANY
// sound (sfx or music) can play, but does not itself start the background
// track. Call this on a user gesture; call startMusic() separately once
// gameplay actually begins (see playingScene.js's startLevel) — title
// screens and cutscenes should stay quiet apart from their own sfx.
export function initAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  masterGain = audioCtx.createGain();
  masterGain.gain.value = 1;
  masterGain.connect(audioCtx.destination);

  musicGain = audioCtx.createGain();
  musicGain.gain.value = MUSIC_LEVEL;
  musicGain.connect(masterGain);

  sfxGain = audioCtx.createGain();
  sfxGain.gain.value = 0.35;
  sfxGain.connect(masterGain);

  // pre-render a short noise buffer, reused for hats/hits/explosions
  const dur = 0.5;
  noiseBuffer = audioCtx.createBuffer(1, audioCtx.sampleRate * dur, audioCtx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
}

// Starts the background loop. Idempotent — safe to call on every level
// start (including retries) without restarting or stuttering the music
// once it's already playing.
export function startMusic() {
  if (!audioCtx || musicStarted) return;
  musicStarted = true;
  nextNoteTime = audioCtx.currentTime + 0.1;
  step16 = 0;
  musicTimer = setInterval(scheduleMusic, 25);
}

export function isMusicPlaying() {
  return musicStarted;
}

export function resumeAudioIfSuspended() {
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
}

export function toggleMute() {
  if (!audioCtx) return;
  muted = !muted;
  masterGain.gain.value = muted ? 0 : 1;
}

export function tone(freq, startTime, duration, type, gainVal, dest, filterFreq, glideTo) {
  const osc = audioCtx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);
  if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, startTime + duration);

  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(gainVal, startTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

  let node = osc;
  if (filterFreq) {
    const filt = audioCtx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = filterFreq;
    osc.connect(filt);
    filt.connect(gain);
  } else {
    osc.connect(gain);
  }
  gain.connect(dest);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.02);
}

export function noiseBurst(startTime, duration, gainVal, dest, filterType, filterFreq) {
  const src = audioCtx.createBufferSource();
  src.buffer = noiseBuffer;
  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(gainVal, startTime);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  const filt = audioCtx.createBiquadFilter();
  filt.type = filterType || 'highpass';
  filt.frequency.value = filterFreq || 4000;
  src.connect(filt);
  filt.connect(gain);
  gain.connect(dest);
  src.start(startTime);
  src.stop(startTime + duration + 0.02);
}

// --- songs ------------------------------------------------------------------
//
// One song per level. For a long time one loop carried all seven, with
// tempo and register nudged per level ("moods"), because the pattern was
// never restarted and a new melody can't be absorbed mid-phrase. That was
// the constraint, and it's gone: a song change is a quick dip of the music
// bus (a quarter second), a pattern swap at step zero, and a swell back in.
// The level toast is on screen for longer than that.
//
// Notes are semitones from A2 (110 Hz); null is a rest. A pattern is one
// bar (`len` steps, sixteenths) or two bars (2*len), in which case it
// alternates. Drums are lists of step indices, or 'eighths'/'sixteenths'.
//
//   1  The First Stand         A minor, the original loop. Bright, steady.
//   2  The Quarry              D minor work-song: pounding kick, offbeat bass,
//                              a slow triangle melody over two bars.
//   3  What the Sanders Left   E minor, an arpeggio that climbs — the level
//                              stands up, so does its music.
//   4  Three Against One       G minor, staccato bass, hats on every
//                              sixteenth. The first face that shoots back.
//   5  The Room That Moves     A waltz, 12 steps to the bar. F major, lilting;
//                              the one level in three.
//   6  No Tricks Left          C minor march: snare roll into every bar, a
//                              brass line over the top.
//   7  The Middle of the World 72 bpm. A drone, a pad, and a drip of water.
//                              No drums. The loudest thing it does is stop.
export const MUSIC_LEVEL = 0.22;
const _ = null;
const hz = semi => 110 * Math.pow(2, semi / 12);

export const SONGS = [
  { name: 'The First Stand', bpm: 128, len: 16,
    bass: [0,_,_,_, 5,_,_,_, 3,_,_,_, -2,_,_,_], bassWave: 'sawtooth', bassDur: 0.42, bassFilter: 500, bassGain: 0.22,
    arp: [12,_,15,19, _,24,19,15, 12,_,17,20, _,24,22,19], arpWave: 'square', arpDur: 0.14, arpFilter: 2400, arpGain: 0.10,
    lead: null,
    kick: [0, 8], snare: [], hat: [2, 6, 10, 14] },

  { name: 'The Quarry', bpm: 118, len: 16,
    bass: [5,_,5,_, _,5,_,1, _,_,-2,_, 1,_,3,_], bassWave: 'sawtooth', bassDur: 0.3, bassFilter: 420, bassGain: 0.24,
    arp: null,
    lead: [17,_,_,_, 20,_,19,_, 17,_,_,_, _,_,_,_,  15,_,_,_, 17,_,15,_, 12,_,_,_, _,_,_,_], leadWave: 'triangle', leadDur: 0.5, leadFilter: 1800, leadGain: 0.12,
    kick: [0, 4, 8, 12], snare: [4, 12], hat: 'eighths' },

  { name: 'What the Sanders Left', bpm: 132, len: 16,
    bass: [7,_,_,7, _,_,7,_, 5,_,_,5, _,_,3,_], bassWave: 'sawtooth', bassDur: 0.36, bassFilter: 520, bassGain: 0.2,
    arp: [7,10,14,19, 10,14,19,22, 14,19,22,26, 19,22,26,31], arpWave: 'square', arpDur: 0.12, arpFilter: 2600, arpGain: 0.075,
    lead: null,
    kick: [0, 8], snare: [4, 12], hat: [1, 3, 5, 7, 9, 11, 13, 15] },

  { name: 'Three Against One', bpm: 140, len: 16,
    bass: [-2,_,-2,_, _,-2,_,_, 6,_,5,_, _,-2,_,1], bassWave: 'sawtooth', bassDur: 0.18, bassFilter: 600, bassGain: 0.24,
    arp: [10,_,13,_, 17,_,13,_, 10,_,13,_, 18,_,17,_], arpWave: 'square', arpDur: 0.1, arpFilter: 2200, arpGain: 0.09,
    lead: null,
    kick: [0, 3, 8, 11], snare: [4, 12], hat: 'sixteenths' },

  { name: 'The Room That Moves', bpm: 150, len: 12,
    bass: [8,_,_,_, _,_,_,_, _,_,_,_,  3,_,_,_, _,_,_,_, _,_,_,_], bassWave: 'triangle', bassDur: 0.7, bassFilter: 700, bassGain: 0.26,
    arp: [_,_,_,_, 20,_,_,_, 24,_,_,_], arpWave: 'triangle', arpDur: 0.22, arpFilter: 2000, arpGain: 0.11,
    lead: [24,_,_,22, _,_,20,_, _,19,_,_,  20,_,_,_, _,_,22,_, _,24,_,_], leadWave: 'sine', leadDur: 0.45, leadFilter: 3000, leadGain: 0.13,
    kick: [0], snare: [], hat: [4, 8] },

  { name: 'No Tricks Left', bpm: 126, len: 16,
    bass: [3,_,_,_, 3,_,_,_, -2,_,_,_, -2,_,3,_], bassWave: 'sawtooth', bassDur: 0.4, bassFilter: 400, bassGain: 0.26,
    arp: null,
    lead: [15,_,_,_, 15,_,_,_, 18,_,17,_, 15,_,_,_,  13,_,_,_, 13,_,_,_, 11,_,13,_, 10,_,_,_], leadWave: 'sawtooth', leadDur: 0.42, leadFilter: 1200, leadGain: 0.09,
    kick: [0, 4, 8, 12], snare: [4, 12, 14, 15], hat: 'eighths' },

  { name: 'The Middle of the World', bpm: 72, len: 16,
    bass: [0,_,_,_, _,_,_,_, _,_,_,_, _,_,_,_], bassWave: 'triangle', bassDur: 2.6, bassFilter: 300, bassGain: 0.3,
    arp: [_,_,_,_, _,_,_,_, _,_,_,_, 36,_,_,_,  _,_,_,_, _,_,36,_, _,_,_,_, _,_,_,_], arpWave: 'sine', arpDur: 0.7, arpFilter: 5000, arpGain: 0.07,
    lead: [12,_,_,_, _,_,_,_, 15,_,_,_, _,_,_,_,  14,_,_,_, _,_,_,_, _,_,_,_, _,_,_,_], leadWave: 'sine', leadDur: 2.2, leadFilter: 1500, leadGain: 0.1,
    kick: [], snare: [], hat: [] }
];

// What plays on `step` of `bar` — a list of events, pure. The scheduler
// plays them; the music probe checks every one of them for every song.
function patternAt(arr, len, bar, step) {
  if (!arr) return null;
  const bars = Math.max(1, Math.round(arr.length / len));
  return arr[(bar % bars) * len + step];
}
function drumHits(spec, len, step) {
  if (!spec) return false;
  if (spec === 'eighths') return step % 2 === 0;
  if (spec === 'sixteenths') return true;
  return spec.includes(step);
}
export function eventsAt(song, bar, step) {
  const ev = [];
  const b = patternAt(song.bass, song.len, bar, step);
  if (b != null) ev.push({ kind: 'tone', freq: hz(b), dur: song.bassDur, wave: song.bassWave, gain: song.bassGain, filter: song.bassFilter });
  const a = patternAt(song.arp, song.len, bar, step);
  if (a != null) ev.push({ kind: 'tone', freq: hz(a), dur: song.arpDur, wave: song.arpWave, gain: song.arpGain, filter: song.arpFilter });
  const l = patternAt(song.lead, song.len, bar, step);
  if (l != null) ev.push({ kind: 'tone', freq: hz(l), dur: song.leadDur, wave: song.leadWave, gain: song.leadGain, filter: song.leadFilter });
  if (drumHits(song.kick, song.len, step)) ev.push({ kind: 'kick' });
  if (drumHits(song.snare, song.len, step)) ev.push({ kind: 'snare' });
  if (drumHits(song.hat, song.len, step)) ev.push({ kind: 'hat' });
  return ev;
}

let song = SONGS[0];
let songIndex = 0;
let bar = 0;
let fadeTimer = null;

// Called on every level load. Same song: nothing happens, so a respawn
// never stutters the music. A different one: dip, swap at step zero, swell.
export function setMusicMood(levelIndex) {
  const i = Math.max(0, Math.min(SONGS.length - 1, levelIndex | 0));
  if (i === songIndex && song === SONGS[i]) return;
  const swap = () => { song = SONGS[i]; songIndex = i; step16 = 0; bar = 0; if (audioCtx) nextNoteTime = audioCtx.currentTime + 0.05; };
  if (!audioCtx || !musicStarted) { swap(); return; }
  const t = audioCtx.currentTime;
  musicGain.gain.cancelScheduledValues(t);
  musicGain.gain.setValueAtTime(musicGain.gain.value, t);
  musicGain.gain.linearRampToValueAtTime(0.0001, t + 0.25);
  clearTimeout(fadeTimer);
  fadeTimer = setTimeout(() => {
    swap();
    const t2 = audioCtx.currentTime;
    musicGain.gain.cancelScheduledValues(t2);
    musicGain.gain.setValueAtTime(0.0001, t2);
    musicGain.gain.linearRampToValueAtTime(MUSIC_LEVEL, t2 + 0.5);
  }, 280);
}
export function currentSongName() { return song.name; }

function playEvent(e, t) {
  if (e.kind === 'tone') tone(e.freq, t, e.dur, e.wave, e.gain, musicGain, e.filter);
  else if (e.kind === 'kick') tone(150, t, 0.16, 'sine', 0.5, musicGain, null, 45);
  else if (e.kind === 'snare') { noiseBurst(t, 0.11, 0.16, musicGain, 'bandpass', 1800); tone(190, t, 0.07, 'triangle', 0.1, musicGain); }
  else if (e.kind === 'hat') noiseBurst(t, 0.04, 0.05, musicGain, 'highpass', 7000);
}

function scheduleMusic() {
  if (!audioCtx) return;
  const sixteenth = (60 / song.bpm) / 4;
  while (nextNoteTime < audioCtx.currentTime + 0.12) {
    for (const e of eventsAt(song, bar, step16)) playEvent(e, nextNoteTime);
    nextNoteTime += sixteenth;
    step16++;
    if (step16 >= song.len) { step16 = 0; bar++; }
  }
}
