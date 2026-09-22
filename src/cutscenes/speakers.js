// Who can talk, and what their name plate looks like.
//
// Colour is the whole of a speaker's identity here — the art is procedural
// squares and the dialogue bar has no room for portraits, so the accent on
// the name is what tells you who's talking at a glance. They're pulled
// from the palette each character is already drawn in, so the association
// is learned from play rather than needing to be taught.
//
// `blip` is the pitch of the tick that plays per character revealed (see
// sfx.js's playDialogueBlip). Lower for bigger characters. That pairing —
// low voice, big body — is doing the same job as the colour.

export const speakers = {
  player:   { name: 'YOU',      color: '#f2c14e', blip: 440 },
  quarrick: { name: 'QUARRICK', color: '#ffd98a', blip: 300 },
  sphere:   { name: '???',      color: '#ff4d8d', blip: 620 },
  // Not a character — for captions and disembodied narration, where a
  // name plate would be wrong.
  narrator: { name: null,       color: '#7a84a8', blip: 0 }
};

const FALLBACK = { name: '???', color: '#e8ecf7', blip: 440 };

export function getSpeaker(id) {
  const s = speakers[id];
  if (!s) {
    console.warn(`unknown dialogue speaker "${id}" — add them to cutscenes/speakers.js`);
    return FALLBACK;
  }
  return s;
}
