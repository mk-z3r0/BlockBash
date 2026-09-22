// The dialogue bar — a fixed panel across the bottom with a speaker name
// and typewritten body text.
//
// Bottom bar rather than speech bubbles over the characters (decided
// 2026-09-21): it takes any length of line without reflowing the
// composition, it sits in the same place every time so the eye knows where
// to go, and it doesn't fight the camera. The cost is that it covers the
// lower third, which is why beats that use it normally freeze the world —
// there's nothing to miss.
//
// This module owns the box and the reveal. It does NOT own pacing: the
// cutscene beat asks whether the line is finished and decides what happens
// next. That keeps "the text has been read" and "the scene moves on" as
// two separate ideas, which matters the first time a line needs to hold
// while something else animates.

import { ctx, VIEW_WIDTH, VIEW_HEIGHT } from '../engine/renderer.js';
import { wrapText, revealLines, totalChars } from './textWrap.js';
import { getSpeaker } from '../cutscenes/speakers.js';
import { playDialogueBlip } from '../audio/sfx.js';

const PANEL_H = 104;
const PANEL_MARGIN = 14;
const PAD_X = 18;
const PAD_TOP = 26;
const LINE_H = 21;
const BODY_FONT = '15px Trebuchet MS, Arial, sans-serif';
const NAME_FONT = 'bold 13px Trebuchet MS, Arial, sans-serif';
// Characters revealed per frame. ~2 is brisk enough not to be a chore at
// 60fps without losing the sense of someone speaking.
const REVEAL_SPEED = 2;
// A blip every character is a machine gun; every third is a voice.
const BLIP_EVERY = 3;

let current = null;

// Opens a line. `speakerId` indexes cutscenes/speakers.js.
export function showDialogue(speakerId, text) {
  const speaker = getSpeaker(speakerId);
  ctx.font = BODY_FONT;   // wrap against the font it'll be drawn in
  const lines = wrapText(ctx, text, VIEW_WIDTH - PANEL_MARGIN * 2 - PAD_X * 2);
  current = {
    speaker,
    lines,
    total: totalChars(lines),
    shown: 0,
    advanced: false
  };
}

export function closeDialogue() {
  current = null;
}

export function isDialogueOpen() {
  return !!current;
}

// True once every character is on screen. A beat waits for this before it
// will accept an advance.
export function isDialogueRevealed() {
  return !!current && current.shown >= current.total;
}

// True once the player has asked to move on from a fully-revealed line.
export function isDialogueAdvanced() {
  return !!current && current.advanced;
}

// The advance key. Mid-reveal it completes the line instantly rather than
// skipping it — the near-universal convention, and the thing people reach
// for without thinking. Only a second press moves on.
export function advanceDialogue() {
  if (!current) return;
  if (current.shown < current.total) {
    current.shown = current.total;
    return;
  }
  current.advanced = true;
}

export function updateDialogue() {
  if (!current || current.shown >= current.total) return;
  const before = current.shown;
  current.shown = Math.min(current.total, current.shown + REVEAL_SPEED);
  if (current.speaker.blip &&
      Math.floor(before / BLIP_EVERY) !== Math.floor(current.shown / BLIP_EVERY)) {
    playDialogueBlip(current.speaker.blip);
  }
}

export function drawDialogue(frameCount) {
  if (!current) return;
  const { speaker } = current;
  const x = PANEL_MARGIN;
  const w = VIEW_WIDTH - PANEL_MARGIN * 2;
  const y = VIEW_HEIGHT - PANEL_H - PANEL_MARGIN;

  ctx.save();

  ctx.fillStyle = 'rgba(10, 13, 28, 0.92)';
  ctx.fillRect(x, y, w, PANEL_H);
  ctx.strokeStyle = speaker.color;
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, PANEL_H - 1);
  // A thicker rule under the name, in the speaker's colour — the bit of
  // the panel that actually changes between speakers, so it carries the
  // identity rather than the border alone.
  if (speaker.name) {
    ctx.fillStyle = speaker.color;
    ctx.fillRect(x, y, 4, PANEL_H);
  }

  ctx.textAlign = 'left';
  let textTop = y + PAD_TOP;
  if (speaker.name) {
    ctx.fillStyle = speaker.color;
    ctx.font = NAME_FONT;
    ctx.fillText(speaker.name, x + PAD_X, y + 22);
  } else {
    textTop = y + 20;   // no name plate: start the body higher
  }

  ctx.fillStyle = '#e8ecf7';
  ctx.font = BODY_FONT;
  const visible = revealLines(current.lines, current.shown);
  visible.forEach((line, i) => {
    ctx.fillText(line, x + PAD_X, textTop + 14 + i * LINE_H);
  });

  // Blinking advance prompt, only once there's nothing left to reveal.
  if (current.shown >= current.total) {
    ctx.globalAlpha = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(frameCount * 0.12));
    ctx.fillStyle = speaker.color;
    ctx.font = NAME_FONT;
    ctx.textAlign = 'right';
    ctx.fillText('SPACE ▾', x + w - PAD_X, y + PANEL_H - 12);
  }

  ctx.restore();
}
