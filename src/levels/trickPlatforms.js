// PARKED — not wired into any level right now.
//
// These are the three trick platforms from the original level 1: ledges that
// lie to the player. They're out of level 1 (it's the beginner level now) and
// will come back in later levels, where the spheres' trolling ramps up.
//
// Kept as-is rather than generalized into a data-driven platform type: the
// right shape for that isn't knowable until a second level actually wants
// one. The valuable part here is the tuning — the easing rates and trigger
// ranges below took playtesting to land, and the comments say why each
// number is what it is. Adapt to the level-data format when adopting.
//
// Each one needs, per frame: the player's x and isOnGround (as of the END of
// the previous frame — before collision resets it, which is what makes the
// "already committed to the jump" timing work).

// --- The troll pit's stepping-stone island ---
// Looks like an ordinary ledge in the middle of a wide pit, but it eases
// sideways while the player is airborne over the pit, then eases back once
// they land. The original pit spanned 1350-1560 with the island at
// 1400-1480, so the island was genuinely needed to cross — which is exactly
// what made moving it a good prank.
export const TRICK_SHIFT = 38;  // how far the island slides, in pixels
export const TRICK_EASE = 0.09; // eases toward target (lower = smoother/slower)

export function updateTrickIsland(island, player) {
  const nearPit = player.x + player.width > 1300 && player.x < 1640;
  const target = (nearPit && !player.isOnGround) ? TRICK_SHIFT : 0;
  island.offset += (target - island.offset) * TRICK_EASE;
  const prevX = island.x;
  island.x = island.baseX + island.offset;
  // caller must add this delta to the player's x if they're standing on it,
  // or they get left behind as it eases back
  return island.x - prevX;
}

// --- The retracting ledge ---
// At rest it filled 2190-2320, leaving a piddly 40px pit (half the original
// 80px) that looked trivially jumpable. The moment the player left the ground
// it retracted completely, stretching the pit to 170px and holding it open
// for the whole jump: too far to clear from ground level, but just makeable
// from the raised platform at 2040-2230.
export const RETRACT_EASE = 0.12;

export function updateRetractingLedge(ledge, player) {
  const nearPit = player.x + player.width > 2090 && player.x < 2400;
  const target = (nearPit && !player.isOnGround) ? 1 : 0;
  ledge.progress += (target - ledge.progress) * RETRACT_EASE;
  ledge.x = ledge.baseX + ledge.progress * ledge.baseWidth;
  ledge.width = ledge.baseWidth * (1 - ledge.progress);
}

// --- The eroding lip ---
// Looked like ordinary ground running out to x=500. The moment the player was
// airborne over the pit it crumbled backwards — its right edge (the near side
// of the opening) pulling in toward the player, stretching the pit from 80px
// to 160px beneath them. The platform at 470-560 was the way across.
export const ERODE_EASE = 0.14;

export function updateErodingLip(lip, player) {
  const nearPit = player.x + player.width > 330 && player.x < 640;
  const target = nearPit ? 1 : 0;
  lip.progress += (target - lip.progress) * ERODE_EASE;
  // x stays put and the width shrinks, so the RIGHT edge (the front of the
  // opening) travels left, toward the player
  lip.width = lip.baseWidth * (1 - lip.progress);
}
