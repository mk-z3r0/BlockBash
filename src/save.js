// Progress save, versioned from the start (see IMPLEMENTATION_PLAN.md).
// Level data will change under existing saves as more levels get built — a
// moved platform, a rebalanced enemy, a level added — so a version mismatch
// means "reset," never "crash" or "load and hope." localStorage also throws
// outright in private browsing / when storage is disabled, so every access
// goes through try/catch and saving is best-effort: losing a save is fine,
// crashing the game over it is not.
const SAVE_KEY = 'blockbash-save';
const SAVE_VERSION = 1;

function defaultSave() {
  return {
    saveVersion: SAVE_VERSION,
    furthestLevelIndex: 0,
    bestScore: 0
  };
}

function isWellFormed(save) {
  return save
    && save.saveVersion === SAVE_VERSION
    && Number.isInteger(save.furthestLevelIndex)
    && Number.isInteger(save.bestScore);
}

export function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return defaultSave();
    const parsed = JSON.parse(raw);
    return isWellFormed(parsed) ? parsed : defaultSave();
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
