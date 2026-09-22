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
  musicGain.gain.value = 0.22;
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

// cyberpunk 16-step loop: sawtooth bass + square arpeggio + noise hats
const BASS_STEPS = [110, null, null, null, 146.83, null, null, null, 130.81, null, null, null, 98, null, null, null];
const ARP_STEPS  = [220, null, 261.63, 329.63, null, 440, 329.63, 261.63, 220, null, 293.66, 349.23, null, 440, 392, 329.63];

// --- moods ---
//
// One loop carried all seven levels for a long time, and GAME_DESIGN's open
// question about music direction was really a question about that: a game
// that runs from a tutorial to the middle of a hollow planet shouldn't sound
// the same the whole way down.
//
// These are variations on the SAME loop rather than different tracks, on
// purpose. The pattern is never restarted — startMusic() is called on every
// level load and is idempotent precisely so transitions don't stutter — so a
// mood change has to be something the running loop can absorb mid-phrase.
// Tempo, register and which layers are playing all can. A new melody can't.
const MOODS = [
  // levels 1-2: the original. Steady, bright, nothing wrong yet.
  { bpm: 128, arp: 1,    hats: true,  bassOct: 1,   arpOct: 1 },
  { bpm: 128, arp: 1,    hats: true,  bassOct: 1,   arpOct: 1 },
  // levels 3-4: faster, and the arpeggio climbs an octave. The story has
  // opened up and the spheres have started shooting back.
  { bpm: 136, arp: 1,    hats: true,  bassOct: 1,   arpOct: 2 },
  { bpm: 136, arp: 1,    hats: true,  bassOct: 1,   arpOct: 2 },
  // levels 5-6: driven, and the bass drops an octave under it.
  { bpm: 144, arp: 1,    hats: true,  bassOct: 0.5, arpOct: 2 },
  { bpm: 148, arp: 1,    hats: true,  bassOct: 0.5, arpOct: 2 },
  // level 7: the cavity. Half speed, no hats, no arpeggio — just the bass,
  // an octave down, with room around it. The loudest thing this soundtrack
  // does is stop.
  { bpm: 84,  arp: null, hats: false, bassOct: 0.5, arpOct: 1 }
];

let mood = MOODS[0];

// Called on every level load. Changes the running loop in place rather than
// restarting it.
export function setMusicMood(levelIndex) {
  mood = MOODS[Math.max(0, Math.min(MOODS.length - 1, levelIndex))] || MOODS[0];
}

function scheduleMusic() {
  if (!audioCtx) return;
  const sixteenth = (60 / mood.bpm) / 4;
  while (nextNoteTime < audioCtx.currentTime + 0.12) {
    const bassFreq = BASS_STEPS[step16];
    if (bassFreq) tone(bassFreq * mood.bassOct, nextNoteTime, 0.42, 'sawtooth', 0.22, musicGain, 500);

    const arpFreq = mood.arp ? ARP_STEPS[step16] : null;
    if (arpFreq) tone(arpFreq * mood.arpOct, nextNoteTime, 0.14, 'square', 0.10, musicGain, 2400);

    if (mood.hats && step16 % 4 === 2) noiseBurst(nextNoteTime, 0.05, 0.05, musicGain, 'highpass', 6000);

    nextNoteTime += sixteenth;
    step16 = (step16 + 1) % 16;
  }
}
