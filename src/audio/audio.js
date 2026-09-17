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

  nextNoteTime = audioCtx.currentTime + 0.1;
  step16 = 0;
  musicTimer = setInterval(scheduleMusic, 25);
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

function scheduleMusic() {
  if (!audioCtx) return;
  const sixteenth = (60 / 128) / 4;
  while (nextNoteTime < audioCtx.currentTime + 0.12) {
    const bassFreq = BASS_STEPS[step16];
    if (bassFreq) tone(bassFreq, nextNoteTime, 0.42, 'sawtooth', 0.22, musicGain, 500);

    const arpFreq = ARP_STEPS[step16];
    if (arpFreq) tone(arpFreq, nextNoteTime, 0.14, 'square', 0.10, musicGain, 2400);

    if (step16 % 4 === 2) noiseBurst(nextNoteTime, 0.05, 0.05, musicGain, 'highpass', 6000);

    nextNoteTime += sixteenth;
    step16 = (step16 + 1) % 16;
  }
}
