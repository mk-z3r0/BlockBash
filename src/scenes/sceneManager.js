// Minimal scene manager: each scene is an object with optional
// enter(data)/update()/draw()/handleKeyDown(e, alreadyDown) hooks. Switching
// scenes calls the new scene's enter() so it can set up its own state
// (e.g. the playing scene resets the game world when (re)entered). The
// optional `data` passed to switchTo is forwarded to enter() as-is, for
// scenes that need to know why they were entered (e.g. a fresh run vs.
// retrying the level just died on).
const scenes = {};
let current = null;
let currentName = null;

export function registerScene(name, scene) {
  scenes[name] = scene;
}

export function switchTo(name, data) {
  current = scenes[name];
  currentName = name;
  if (current.enter) current.enter(data);
}

export function getCurrentName() {
  return currentName;
}

export function update() {
  if (current && current.update) current.update();
}

export function draw() {
  if (current && current.draw) current.draw();
}

export function handleKeyDown(e, alreadyDown) {
  if (current && current.handleKeyDown) current.handleKeyDown(e, alreadyDown);
}
