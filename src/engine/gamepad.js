// Xbox / standard-mapping gamepad support. The Gamepad API has no "press"
// events — button state can only be polled, once per frame — so this
// dispatches synthetic keydown/keyup events on every transition, using the
// exact same `key` value a keyboard press would produce. That's deliberate:
// every consumer in the game (movement, jump buffering, bazooka firing,
// pause, skipping the intro) already reads real keyboard events and the
// shared `keys` state, so a gamepad becomes just another input source
// feeding that same pipeline — nothing downstream needs to know it exists.
//
// "Standard" gamepad mapping is what Chrome/Firefox report for an Xbox
// controller (and most others) once connected: button 0=A, 1=B, 2=X,
// 3=Y, 9=Start. Left stick is axes[0] (x); the d-pad is buttons 12-15.
const DEADZONE = 0.35;

const BUTTON_MAP = [
  { key: ' ',          read: pad => !!pad.buttons[0]?.pressed },                                  // A: jump
  { key: 'Shift',       read: pad => !!pad.buttons[1]?.pressed },                                 // B: run
  { key: 'b',           read: pad => !!pad.buttons[2]?.pressed },                                 // X: action/weapon
  { key: 'Escape',      read: pad => !!pad.buttons[9]?.pressed },                                 // Start: menu/pause
  { key: 'ArrowLeft',   read: pad => !!pad.buttons[14]?.pressed || pad.axes[0] < -DEADZONE },
  { key: 'ArrowRight',  read: pad => !!pad.buttons[15]?.pressed || pad.axes[0] > DEADZONE }
];

const prevState = {}; // virtual key -> was it down as of the last poll

export function pollGamepad() {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  const pad = pads && Array.prototype.find.call(pads, p => p && p.connected);

  if (!pad) {
    // nothing connected (or it was just unplugged mid-press) — release
    // anything a pad had been holding so it doesn't get stuck "on"
    for (const { key } of BUTTON_MAP) release(key);
    return;
  }

  for (const { key, read } of BUTTON_MAP) {
    const isDown = read(pad);
    const wasDown = !!prevState[key];
    if (isDown && !wasDown) {
      document.dispatchEvent(new KeyboardEvent('keydown', { key }));
    } else if (!isDown && wasDown) {
      document.dispatchEvent(new KeyboardEvent('keyup', { key }));
    }
    prevState[key] = isDown;
  }
}

function release(key) {
  if (prevState[key]) {
    document.dispatchEvent(new KeyboardEvent('keyup', { key }));
    prevState[key] = false;
  }
}
