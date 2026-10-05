// Headless logic checks: node tools/refine-controls-probe.mjs
import assert from 'node:assert/strict';
const listeners = {};
const gradient = { addColorStop() {} };
const ctx = new Proxy({}, { get: (_, key) => key === 'createLinearGradient' || key === 'createRadialGradient' ? () => gradient : key === 'measureText' ? text => ({ width: text.length * 7 }) : () => {} , set: () => true });
globalThis.document = {
  getElementById: () => ({ width: 800, height: 450, getContext: () => ctx }),
  addEventListener: (name, fn) => { listeners[name] = fn; }
};
globalThis.window = { addEventListener: (name, fn) => { listeners[name] = fn; }, location: { search: '', pathname: '/index.html' } };
globalThis.location = window.location;
globalThis.localStorage = { getItem: () => null, setItem() {} };
const { keys, initInput } = await import('../src/engine/input.js');
const { player, updatePlayer, setRespawnPoint } = await import('../src/entities/player.js');
const { updatePlayerWeapon } = await import('../src/weapons/combat.js');
const { state } = await import('../src/state.js');
const { playingScene } = await import('../src/scenes/playingScene.js');
const { gameOverScene } = await import('../src/scenes/gameOverScene.js');
const { registerScene } = await import('../src/scenes/sceneManager.js');
const { titleScene } = await import('../src/scenes/titleScene.js');
const { getLevel } = await import('../src/levels/levelLoader.js');
const { drawHUD } = await import('../src/ui/hud.js');
initInput();
const press = key => listeners.keydown({ key, preventDefault() {} });
const release = key => listeners.keyup({ key });
playingScene.enter({ startAt: 3 });
player.weapon = 'cornerstone'; player.hasWeapon = true; player.ammo = 10;
player.weaponCooldown = 0;
press('Shift'); updatePlayerWeapon(false);
assert.equal(state.projectiles.length, 1, 'holding action starts firing');
for (let i = 0; i < 180; i++) updatePlayerWeapon(false);
assert.ok(state.projectiles.length === 4, 'held action continuously fires triangles');
assert.equal(player.ammo, 10, 'triangles never consume ammo');
release('Shift'); press('b'); updatePlayerWeapon(false);
assert.equal(player.ammo, 10, 'B also fires without consuming ammo');
release('b');
player.weapon = 'pickaxe'; player.weaponCooldown = 0;
press('Shift'); updatePlayerWeapon(false);
assert.ok(player.weaponCooldown > 0, 'Shift swings melee');
for (let i = 0; i < 180; i++) updatePlayerWeapon(false);
assert.ok(player.weaponCooldown > 0, 'held melee repeats');
release('Shift');
const speed = key => {
  player.x = 100; player.y = 0; player.velocityX = 0; player.velocityY = 0;
  player.respawnFreeze = 0; player.isOnGround = true;
  press('ArrowRight'); press(key);
  for (let i = 0; i < 15; i++) updatePlayer(false);
  const result = player.velocityX; release(key); release('ArrowRight'); return result;
};
assert.equal(speed('b'), speed('Shift'), 'both buttons provide the same running speed');
press('b'); listeners.blur(); assert.equal(keys.b, false, 'tab blur clears held buttons');
playingScene.enter({ startAt: 3 }); setRespawnPoint(1000, 200);
state.score = 123; state.coinsCollected = 7; state.lives = 0;
player.weapon = 'cornerstone'; player.hasWeapon = true; player.ammo = 0; player.fireRateTier = 3;
registerScene('playing', playingScene);
gameOverScene.handleKeyDown({key:'Enter'});
assert.equal(player.x, getLevel().playerSpawn.x, 'retry starts at the beginning of the level');
assert.equal(state.score, 0); assert.equal(state.coinsCollected, 0);
assert.equal(state.lives, 3); assert.equal(player.weapon, 'cornerstone');
assert.equal(player.fireRateTier, 0, 'game-over retry resets fire rate');
assert.equal(state.gameState, 'playing');
titleScene.enter(); titleScene.draw(); drawHUD(); playingScene.draw();
console.log('PASS combined run/weapon, unlimited held fire, melee repeat, blur, level retry and render smoke checks');

const { quarrickCornerCuts, createQuarrick, drawRescueNPC } = await import('../src/entities/npc.js');
for (let damage = 0; damage <= 4; damage++) {
  const cuts = quarrickCornerCuts(damage);
  assert.equal(cuts.filter(c => c > 0).length, damage, 'only damaged corners are cut');
  if (damage > 0) {
    const previous = quarrickCornerCuts(damage - 1);
    previous.forEach((cut, i) => { if (cut) assert.equal(cuts[i], cut, 'old scars stay in place'); });
  }
  drawRescueNPC(createQuarrick(100, 410, {damage}), 10);
}
assert.deepEqual(quarrickCornerCuts(1), [0, 12.8, 0, 0]);
assert.equal(quarrickCornerCuts(2.5).filter(c => c === 6.4).length, 1, 'only newest corner animates');
const { levels } = await import('../src/levels/registry.js');
assert.equal(levels[1].quarrickDamage, 1);
assert.equal(levels[2].quarrickDamage, 2);
const { l3Handoff } = await import('../src/cutscenes/level3/handoff.js');
const c = {state: {rescueNPC: createQuarrick(100, 410, {damage: 2})}};
for (const name of ['another-corner', 'corrupt']) {
  const beat = l3Handoff.beats.find(b => b.name === name);
  const start = c.state.rescueNPC.damage;
  for (let f = 0; f < beat.frames; f++) beat.update(c, f);
  beat.exit(c);
  assert.equal(c.state.rescueNPC.damage, start + 1);
}
const { introScene } = await import('../src/scenes/introScene.js');
let starts = 0;
registerScene('playing', {enter() { starts++; }});
introScene.enter();
for (let frame = 0; frame < 620; frame++) { introScene.update(); introScene.draw(); }
assert.equal(starts, 1, 'opening finishes in about ten seconds');
introScene.enter(); introScene.handleKeyDown({key:'Enter'}, true);
assert.equal(starts, 1, 'held key does not skip');
introScene.handleKeyDown({key:'Enter'}, false);
assert.equal(starts, 2, 'fresh key still skips');
console.log('PASS individual corner progression, animated handoff damage and complete opening render/skip smoke checks');

const { fireCooldown, upgradeFireRate, FIRE_COOLDOWNS } = await import('../src/weapons/fireRate.js');
const { spawnAmmoPickup, updateWeaponPickups } = await import('../src/entities/weaponPickup.js');
playingScene.enter({startAt: 3});
player.weapon = 'cornerstone'; player.hasWeapon = true;
player.x = 100; player.y = 100;
for (let tier = 1; tier <= 4; tier++) {
  spawnAmmoPickup(110, 120);
  updateWeaponPickups(player);
  assert.equal(player.fireRateTier, Math.min(3, tier), 'crate upgrades one tier, capped at three');
}
assert.equal(fireCooldown(player), 20);
for (let tier = 0; tier <= 3; tier++) {
  player.fireRateTier = tier; player.weaponCooldown = 0; state.projectiles = [];
  press('Shift');
  for (let f = 0; f < 120; f++) updatePlayerWeapon(false);
  release('Shift');
  assert.equal(state.projectiles.length, Math.ceil(120 / FIRE_COOLDOWNS[tier]), 'actual cadence matches tier');
}
player.fireRateTier = 3;
state.lives = 2; player.invincible = 0; player.y = 1000;
playingScene.update();
assert.equal(state.lives, 1, 'ordinary death occurred');
assert.equal(player.fireRateTier, 0, 'ordinary death resets fire rate');
assert.ok(state.weaponPickups.filter(p => p.kind === 'ammo').every(p => !p.collected), 'speed crates return after death');
assert.equal(player.weapon, 'cornerstone', 'death keeps the gun');
console.log('PASS crate tiers, upgrade cap, all four firing cadences and ordinary-death reset');

playingScene.enter({startAt: 3});
player.weapon = 'cornerstone'; player.hasWeapon = true; player.ammo = 0;
player.weaponCooldown = 0; state.projectiles = [];
press('Shift');
for (let f = 0; f < 120; f++) updatePlayerWeapon(false);
release('Shift');
assert.equal(state.projectiles.length, 2, 'zero legacy ammo never blocks continuous fire');
assert.equal(player.ammo, 0, 'firing does not decrement legacy ammo');
console.log('PASS unlimited firing with zero legacy ammo');
