// The level-edge transition — the cube-planet premise made literal. The
// level doesn't end, the world turns: the player walks to the edge of this
// face, looks down, jumps, and the world rotates 90° underneath them so
// they come down on the next face. Quarrick is already down there.
//
// Ported verbatim (2026-09-21) from scenes/playingScene.js. The narrative
// description lives in GAME_DESIGN.md; the reasoning behind each constant
// is in IMPLEMENTATION_PLAN's "Level-edge transition" section.
//
// This is the cutscene that motivated the runner's lock vocabulary. Its
// four beats need three different combinations:
//
//   approach   defaults          walk to the lip with real physics
//   brink      camera: scripted  the camera tips down to show the drop
//   leap/land  physics: freeze   there is no "up" while the world rotates
//                camera: scripted

import { player } from '../../entities/player.js';
import { createCornerQuarrick, updateCornerQuarrick, drawRescueNPC } from '../../entities/npc.js';
import { playJump } from '../../audio/sfx.js';
import { state } from '../../state.js';
import { VIEW_WIDTH, VIEW_HEIGHT } from '../../engine/renderer.js';

// How close to the edge the player has to get for the ending to start.
// There's no goal flag any more (2026-09-21) — the edge IS the goal — so
// this is what replaces touching it. 100px keeps the old pacing exactly:
// it's where the flag used to stand, leaving the last stretch of ground as
// the scripted walk-up.
//
// Exported because the boss cutscene needs it: carving its pit into this
// corridor would drop the player into a hole during a beat that runs with
// real physics. See bossShowdown.js's carveMiningGap.
export const EDGE_TRIGGER_MARGIN = 100;

// Auto-walk during 'approach' — deliberately gentler than the player's own
// walk cap (physics.js's P.walkMax): a scripted, slightly reverent arrival
// at the edge, not a run to it.
const APPROACH_SPEED = 1.6;
const APPROACH_ACCEL = 0.12;
// Safety cap. Normally 'approach' ends as soon as the player reaches the
// lip; this guarantees it can't hang if a level's geometry is ever unusual
// enough that the target is never quite reached.
//
// 151, not 150: these counts are "how many times the beat actually ran",
// and the code this was ported from incremented its timer BEFORE comparing
// it, so `> 150` ran 151 times. Kept exact rather than rounded because
// tools/edge-transition-trace.html asserts where the beat boundaries fall.
const APPROACH_MAX_FRAMES = 151;
// Long enough for the camera pan to land and read as a look down over the
// drop rather than a twitch before the jump. Raised from 80 (2026-09-21)
// when Quarrick started walking up the next face during this beat: at 80 he
// was still arriving as the player jumped, so the two never shared a still
// frame. The extra 25 buys the pause where they're both standing there.
const BRINK_FRAMES = 106; // 106, not 105 — see APPROACH_MAX_FRAMES's note
const LEAP_FRAMES = 84;
const LEAP_HEIGHT = 88;   // arc peak above the surface
const LEAP_REACH = 74;    // how far past the corner the player comes down
// The world finishes rotating a little before the player lands, so they
// come down on ground that's already settled rather than still moving.
const LEAP_ROTATE_DONE_AT = 0.82;
const LAND_FRAMES = 35;   // 35, not 34 — see APPROACH_MAX_FRAMES's note
// Slow enough to read as a deliberate look downward.
const BRINK_CAMERA_EASE = 0.07;

// --- Quarrick on the next face ---
// Where he stops, measured from the corner along the next face. Derived
// rather than authored, because the point is a fixed one-tile gap between
// where the player comes down and where he's standing: the player lands
// with their left edge LEAP_REACH past the corner, their trailing edge one
// player-width further, then a tile of air, then his leading edge — and
// `alongFace` tracks his CENTRE, so add half of him.
const TILE = 22;                     // also exactly the player's width
const QUARRICK_GAP = TILE;           // the tile of air the player lands into
const QUARRICK_STOP_ALONG = LEAP_REACH + TILE + QUARRICK_GAP + 44 / 2;
// A trudge, not a jog — he's just been through the boss fight, and he's
// walking up a wall.
const QUARRICK_WALK_SPEED = 1.75;
// He arrives with this many frames of 'brink' left, so there's a held
// moment of the two of them facing each other before the jump.
const QUARRICK_ARRIVE_BEFORE_LEAP = 36;
// Far enough down the face to start below the bottom of the frame and walk
// up into it — the reveal is him climbing into view, not blinking on.
const QUARRICK_ENTER_ALONG = QUARRICK_STOP_ALONG +
  QUARRICK_WALK_SPEED * (BRINK_FRAMES - QUARRICK_ARRIVE_BEFORE_LEAP);

// Smoothstep-style ease — the rotation should read as a deliberate tip, not
// a linear spin at constant speed.
function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export const edgeTransition = {
  id: 'edge-transition',

  // The payoff: advance to the next level, or win if this was the last one.
  // Runs on a skip too — skipping the ending should still end the level.
  onComplete(c) {
    c.finishLevel();
  },

  beats: [
    // --- walk the rest of the way to the lip -------------------------
    // The trigger fires a margin short of the actual drop, which leaves
    // room for this and means the player can never out-run it and walk off
    // the edge under their own power.
    {
      name: 'approach',
      frames: APPROACH_MAX_FRAMES,
      until: c => player.x >= c.level.worldEdgeX - player.width,
      // 'scripted' here means "held still", not "the beat drives it" —
      // nothing below touches the camera. That's deliberate and it's what
      // shipped: the player walks the last stretch while the camera stays
      // put, drifting toward the right of frame, and 'brink' then pulls
      // them back to centre. Letting the camera follow through this beat
      // would flatten that.
      locks: { camera: 'scripted' },
      enter() {
        player.velocityY = 0;
      },
      update() {
        player.facing = 1;
        player.velocityX = Math.min(player.velocityX + APPROACH_ACCEL, APPROACH_SPEED);
      },
      exit(c) {
        player.x = c.level.worldEdgeX - player.width;
        player.velocityX = 0;
      }
    },

    // --- stand at the lip and look down ------------------------------
    {
      name: 'brink',
      frames: BRINK_FRAMES,
      locks: { camera: 'scripted' },
      enter(c) {
        // Quarrick climbs the next face to meet the jump. Spawned here
        // rather than at 'approach' because nothing below the ground line
        // is on screen until this beat's camera pan gets going, so anything
        // earlier is animation nobody sees.
        //
        // Gated on the level having a boss, which today means "a level
        // where he showed up to rescue you". A stand-in for real narrative
        // state — see the NPC arc in IMPLEMENTATION_PLAN step 7.
        if (c.level.boss) {
          c.data.quarrick = createCornerQuarrick(
            c.level.worldEdgeX, c.level.groundY, QUARRICK_ENTER_ALONG);
        }
      },
      update(c) {
        player.velocityX = 0;
        // Centre the player on BOTH axes — x as well as y, so the empty
        // space past the edge takes up the whole right half of the screen
        // instead of being crammed against the frame. That's the only way
        // the drop is legible, since there's deliberately nothing drawn out
        // there to give it scale (see levelRenderer.js's drawWorldEdge).
        c.camera.x += ((player.x + player.width / 2 - VIEW_WIDTH / 2) - c.camera.x) * BRINK_CAMERA_EASE;
        c.camera.y += ((player.y + player.height / 2 - VIEW_HEIGHT / 2) - c.camera.y) * BRINK_CAMERA_EASE;
        if (c.data.quarrick) {
          updateCornerQuarrick(c.data.quarrick, c.level.worldEdgeX, c.level.groundY,
                               QUARRICK_STOP_ALONG, QUARRICK_WALK_SPEED);
        }
      },
      exit(c) {
        c.data.leapFromX = player.x;
        playJump();
      },
      draw: drawQuarrick
    },

    // --- the arc out, world rotating underneath ----------------------
    // Fully scripted. Not physics-driven, because "down" is exactly the
    // thing that's changing during this beat — running gravity through it
    // would mean picking one of the two floors to fall toward, and it looks
    // wrong against either. The camera holds still so the corner the world
    // pivots around stays put on screen.
    //
    // Quarrick needs no handling here at all: he's standing still in world
    // coordinates on the next face and he's drawn inside the rotation, so
    // the same transform that swings that face into place swings him
    // upright with it. He stays on his feet because the ground he's on is
    // what's moving.
    {
      name: 'leap',
      frames: LEAP_FRAMES,
      locks: { physics: 'freeze', camera: 'scripted' },
      update(c, frame) {
        const t = Math.min(1, (frame + 1) / LEAP_FRAMES);
        const surfaceY = c.level.groundY - player.height;
        player.x = c.data.leapFromX + (c.level.worldEdgeX + LEAP_REACH - c.data.leapFromX) * t;
        player.y = surfaceY - LEAP_HEIGHT * Math.sin(Math.PI * t);
        player.facing = 1;

        const spin = Math.min(1, t / LEAP_ROTATE_DONE_AT);
        c.setWorldTransform(c.level.worldEdgeX, c.level.groundY,
                            -Math.PI / 2 * easeInOutCubic(spin));
      },
      exit(c) {
        player.y = c.level.groundY - player.height; // down on the new face
      },
      draw: drawQuarrick
    },

    // --- both of them standing on the new face -----------------------
    {
      name: 'land',
      frames: LAND_FRAMES,
      locks: { physics: 'freeze', camera: 'scripted' },
      draw: drawQuarrick
    }
  ]
};

// Quarrick is drawn INSIDE the world rotation (this hook runs within the
// scene's rotated world transform), unlike the player, who is drawn outside
// it so they stay upright through the arc. He turns WITH the world because
// he's standing on the part of it that's turning.
function drawQuarrick(c) {
  if (c.data.quarrick) drawRescueNPC(c.data.quarrick, state.frameCount);
}
