// Progress save, versioned from the start (see IMPLEMENTATION_PLAN.md).
// Level data will change under existing saves as more levels get built — a
// moved platform, a rebalanced enemy, a level added — so a version mismatch
// means "reset," never "crash" or "load and hope." localStorage also throws
// outright in private browsing / when storage is disabled, so every access
// goes through try/catch and saving is best-effort: losing a save is fine,
// crashing the game over it is not.
const SAVE_KEY = 'blockbash-save';
// Still 1 after narrative state landed (2026-09-21), deliberately. The
// rule above is about data that can't be trusted, not about every change
// to the shape: a save written before `narrative` existed is perfectly
// interpretable, it just hasn't seen any cutscenes yet, and "hasn't seen
// any cutscenes" is exactly what the default says. Bumping would have
// thrown away real progress to express nothing.
//
// Bump when an existing field changes MEANING or a level's geometry moves
// under a stored position. Adding an optional field that defaults
// correctly is not that.
const SAVE_VERSION = 1;

function defaultSave() {
  return {
    saveVersion: SAVE_VERSION,
    furthestLevelIndex: 0,
    bestScore: 0,
    hasSeenIntro: false,
    // Story position — which cutscenes have played, how far through the
    // NPC arc we are. Owned by narrative.js; save.js only carries it.
    narrative: { seenCutscenes: {}, npcStage: 0, flags: {} }
  };
}

function isWellFormed(save) {
  return save
    && save.saveVersion === SAVE_VERSION
    && Number.isInteger(save.furthestLevelIndex)
    && Number.isInteger(save.bestScore)
    && typeof save.hasSeenIntro === 'boolean';
  // `narrative` is deliberately NOT checked here — see SAVE_VERSION. A save
  // without it, or with a malformed one, is still a valid save; loadSave
  // below just substitutes the default.
}

function isWellFormedNarrative(n) {
  return n
    && typeof n === 'object'
    && typeof n.seenCutscenes === 'object' && n.seenCutscenes !== null
    && Number.isInteger(n.npcStage)
    && typeof n.flags === 'object' && n.flags !== null;
}

export function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return defaultSave();
    const parsed = JSON.parse(raw);
    if (!isWellFormed(parsed)) return defaultSave();
    // Fill in a narrative block for saves written before there was one,
    // rather than discarding an otherwise good save over it.
    if (!isWellFormedNarrative(parsed.narrative)) {
      parsed.narrative = defaultSave().narrative;
    }
    return parsed;
  } catch {
    // corrupted JSON, storage disabled, or a private-browsing throw
    return defaultSave();
  }
}

function writeSave(save) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch {
    // best-effort — nothing else to do if storage isn't available
  }
}

// Call whenever the player might have set a new high point — reaching a
// level, dying, or winning. Cheap to call often: it only writes when
// something actually improved.
export function recordProgress(levelIndex, score) {
  const save = loadSave();
  let changed = false;
  if (levelIndex > save.furthestLevelIndex) { save.furthestLevelIndex = levelIndex; changed = true; }
  if (score > save.bestScore) { save.bestScore = score; changed = true; }
  if (changed) writeSave(save);
  return save;
}

// The opening cutscene plays once automatically, ever. Called both when it
// finishes on its own and when it's skipped — either way it shouldn't play
// again on the next boot.
export function markIntroSeen() {
  const save = loadSave();
  if (!save.hasSeenIntro) {
    save.hasSeenIntro = true;
    writeSave(save);
  }
}

// --- narrative state ---
// Kept in the same blob as progress so there's one thing to version and one
// thing to clear. narrative.js owns the shape; these two just move it.

export function loadNarrative() {
  return loadSave().narrative;
}

export function saveNarrative(narrative) {
  const save = loadSave();
  save.narrative = {
    seenCutscenes: { ...narrative.seenCutscenes },
    npcStage: narrative.npcStage,
    flags: { ...narrative.flags }
  };
  writeSave(save);
}
