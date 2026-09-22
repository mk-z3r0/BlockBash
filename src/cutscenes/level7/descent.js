// The descent — level 6's ending, and the only edge in the game the player
// doesn't land from.
//
// Five times now, walking off the edge has meant the world turning under
// them and a new face arriving to stand on. GAME_DESIGN's arc puts the
// sixth face last: "After the sixth face, the player descends into the
// planet's hollow centre." So this is the same walk, the same look down,
// and then nothing catches them.
//
// It reuses the edge transition's shape deliberately — approach, brink,
// then the beat where something happens — because the whole effect depends
// on the player expecting the rotation they have seen five times.

import { player } from '../../entities/player.js';
import { playJump, playRumble } from '../../audio/sfx.js';
import { VIEW_WIDTH, VIEW_HEIGHT } from '../../engine/renderer.js';
import { say } from '../say.js';

const APPROACH_SPEED = 1.6;
const APPROACH_ACCEL = 0.12;
const APPROACH_MAX_FRAMES = 151;
const BRINK_FRAMES = 96;
const BRINK_CAMERA_EASE = 0.07;
const FALL_FRAMES = 120;

export const descent = {
  id: 'descent',

  onComplete(c) {
    c.finishLevel();
  },

  beats: [
    {
      name: 'approach',
      frames: APPROACH_MAX_FRAMES,
      until: c => player.x >= c.level.worldEdgeX - player.width,
      locks: { camera: 'scripted' },
      enter() { player.velocityY = 0; },
      update() {
        player.facing = 1;
        player.velocityX = Math.min(player.velocityX + APPROACH_ACCEL, APPROACH_SPEED);
      },
      exit(c) {
        player.x = c.level.worldEdgeX - player.width;
        player.velocityX = 0;
      }
    },

    {
      name: 'brink',
      frames: BRINK_FRAMES,
      locks: { camera: 'scripted' },
      update(c) {
        player.velocityX = 0;
        c.camera.x += ((player.x + player.width / 2 - VIEW_WIDTH / 2) - c.camera.x) * BRINK_CAMERA_EASE;
        c.camera.y += ((player.y + player.height / 2 - VIEW_HEIGHT / 2) - c.camera.y) * BRINK_CAMERA_EASE;
      }
    },

    // The one line. Five faces of expectation, corrected in six words.
    say('narrator', "There is no seventh face."),

    {
      name: 'fall',
      frames: FALL_FRAMES,
      locks: { physics: 'freeze', camera: 'scripted' },
      enter(c) {
        playJump();
        c.data.fromY = player.y;
        c.data.fromCamY = c.camera.y;
      },
      update(c, frame) {
        const t = (frame + 1) / FALL_FRAMES;
        // Accelerating, and the camera going with them rather than watching
        // them leave — the player is not falling past the world here, they
        // are falling INTO it.
        const drop = 1400 * t * t;
        player.y = c.data.fromY + drop;
        c.camera.y = c.data.fromCamY + drop;
        player.facing = 1;
        if (frame === 30) playRumble();
      }
    }
  ]
};
