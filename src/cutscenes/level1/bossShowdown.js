// The pickaxe-boss showdown — level 1's first cutscene, and the one that
// arms the player.
//
// Ported verbatim (2026-09-21) from the hand-rolled state machine that used
// to live in scenes/playingScene.js. Frame counts look odd because they're
// the exact counts the old `cutsceneTimer > N` checks produced: the timer
// was incremented BEFORE the comparison, so `> 120` ran 121 times. They are
// preserved rather than rounded, because tools/cutscene-probe.html asserts
// the boss dies on a specific frame.
//
// Every beat here uses the default locks: input locked, world still
// simulating, camera still following. That's the whole point of the beat —
// the player is pinned in place watching something happen TO the world, not
// cut away from it.

import { state } from '../../state.js';
import { player } from '../../entities/player.js';
import { createRescueNPC } from '../../entities/npc.js';
import { spawnWeaponPickup } from '../../entities/weaponPickup.js';
import { spawnExplosion, spawnDust } from '../../entities/particles.js';
import { carveGap, lastCarveCenter } from '../../levels/terrain.js';
import { playPickaxeReady, playPickaxeSwing, playPickaxeMining, playExplosion } from '../../audio/sfx.js';
import { showToast } from '../../ui/hud.js';
import { EDGE_TRIGGER_MARGIN } from './edgeTransition.js';

const boss = () => state.enemies.find(e => e.boss && e.alive);

// Where the boss's pickaxe is landing while it mines: just past its right
// edge, since it faces right through the whole mining beat.
export function digPointFor(b) {
  return b.x + b.w + 8;
}

// Carves a ~2-block gap out of the ground immediately to the RIGHT of the
// boss — never under it. Enemies have no ground collision of their own (see
// updateEnemies), so a pit opening under the boss's feet would leave it
// hanging in mid-air over its own hole; digging to the side it's actually
// facing keeps the beat readable. Small enough to clear on a plain walk — a
// "look what it did" beat on the way out, not a hazard sprung on the player.
function carveMiningGap(c, b) {
  // Never dig into the last stretch before the world's edge. The player's
  // scripted walk-up to the edge runs with real physics, so a hole in that
  // corridor wouldn't be decoration — they'd walk straight into it
  // mid-cutscene.
  const approachGuard = c.level.worldEdgeX - EDGE_TRIGGER_MARGIN - 24;
  const carved = carveGap(c.level, digPointFor(b), 44, { margin: 20, maxX: approachGuard });
  if (!carved) return;
  const center = lastCarveCenter();
  spawnExplosion(center, c.level.groundY, '#8a6a45');
  spawnDust(center, c.level.groundY, 18, { color: 'rgba(120, 90, 60, 0.9)', spread: 5.5, size: 12, life: 34 });
}

// The outcome, as opposed to the choreography: the boss is down and the
// pickaxe is on the ground. Lives in onComplete rather than in a beat
// because it has to hold however the cutscene ended — played out in full,
// or skipped with Escape halfway through the charge. Idempotent, so the
// normal path (Quarrick's stomp already killed it) costs nothing.
function resolveFight(c) {
  const b = boss();
  if (b) {
    b.alive = false;
    b.squish = 14;
    spawnExplosion(b.x + b.w / 2, b.y + b.w / 2, '#8effc0');
    playExplosion();
    spawnWeaponPickup(b.x + b.w / 2, c.level.groundY);
  }
  // Skipped mid-scene: Quarrick never landed his stomp, so send him away
  // rather than leaving him frozen mid-leap over a boss that's now gone.
  if (state.rescueNPC && !state.rescueNPC.stomped) state.rescueNPC = null;
  showToast('COAST IS CLEAR!', 120);
}

export const bossShowdown = {
  id: 'boss-showdown',

  onComplete: resolveFight,

  beats: [
    // --- 1. mining ---------------------------------------------------
    // It hasn't noticed the player yet; it's busy digging. No "!" here —
    // that belongs to the next beat.
    {
      name: 'freeze',
      frames: 121,
      enter(c) {
        player.velocityX = 0;
        player.velocityY = 0;
        const b = boss();
        if (b) {
          b.awake = true;
          b.mining = true;
          b.swingPhase = 1;
          // Facing is read off the sign of `speed` (see drawEnemies), and
          // the boss stops patrolling the moment it's awake, so setting it
          // once holds until the 'turn' beat flips it. The hole it digs
          // lands on this same side.
          b.speed = Math.abs(b.speed);
        }
        playPickaxeReady();
      },
      update(c) {
        player.velocityX = 0;
        player.shout = 30;
        const b = boss();
        if (!b) return;
        b.swingPhase++;
        // swingPhase % 26 === 7 lands the sound and particles near the
        // downswing's peak (progress = 1 at swingPhase * 0.24 ≈ π/2, i.e.
        // swingPhase ≈ 6.5), not at % 26 === 0 which is the raised point in
        // the same oscillation.
        if (b.swingPhase % 26 === 7) {
          playPickaxeMining();
          // dust flies from where the pick actually lands, not from under
          // the boss — the same spot the gap opens up
          spawnDust(digPointFor(b), c.level.groundY, 10, {
            color: 'rgba(120, 90, 60, 0.85)', spread: 3.5, size: 10, life: 26
          });
          // The third swing of ~5 is the one that breaks through: a couple
          // of ordinary-looking swings first, then the ground visibly gives
          // way. Carving on the very first hit lands before the player has
          // had a beat to read "it's digging."
          if (b.swingPhase === 59) carveMiningGap(c, b);
        }
      },
      exit() {
        const b = boss();
        if (b) b.mining = false; // stops digging to look up — can't do both
      }
    },

    // --- 2. it sees you ----------------------------------------------
    // Without this beat the turn and the charge happen on the same frame,
    // which reads as the boss having known you were there all along.
    {
      name: 'turn',
      frames: 46,
      update(c, frame) {
        player.velocityX = 0;
        player.shout = 30;
        const b = boss();
        if (!b) return;
        b.speed = -Math.abs(b.speed); // face left, toward the player
        b.swingPhase++;
        if (frame === 0) {
          b.shout = 45; // "!"
          playPickaxeReady();
        }
      }
    },

    // --- 3. the charge, and the rescue -------------------------------
    // Ends early the moment Quarrick's stomp connects; the frame cap is the
    // fallback for the stomp somehow not landing.
    {
      name: 'charge',
      frames: 301,
      until: () => state.rescueNPC && state.rescueNPC.stomped,
      update(c, frame) {
        player.velocityX = 0;
        player.shout = 30;
        const b = boss();
        if (b) {
          b.speed = -c.level.boss.chargeSpeed;
          b.x += b.speed;
          b.swingPhase++;
          if (b.swingPhase % 26 === 0) playPickaxeSwing();
        }
        if (frame === 39 && !state.rescueNPC) {
          state.rescueNPC = createRescueNPC(c.camera.x - 60);
        }
        if (b && b.x < player.x + player.width + 40) {
          b.x = player.x + player.width + 40;
        }
      },
      exit(c) {
        // Still alive here means the frame cap ran out rather than the
        // stomp landing. Finish it off NOW rather than leaving it to
        // onComplete: the beat after this one plays for 101 frames, and it
        // should play over a dead boss, not a live one standing still.
        if (boss()) resolveFight(c);
      }
    },

    // --- 4. the beat after ------------------------------------------
    {
      name: 'rescue',
      frames: 101,
      enter() {
        player.shout = 0;
      },
      update() {
        player.shout = 0;
      }
    }
  ]
};
