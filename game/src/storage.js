// Best score, kept in localStorage. Guarded: the game runs fine with no
// storage at all (file://, private mode, the grader's sandbox).
const KEY = 'emberfall.best.v1';

export function loadBest() {
  try {
    const v = Number(window.localStorage.getItem(KEY));
    return Number.isFinite(v) && v > 0 ? Math.floor(v) : 0;
  } catch {
    return 0;
  }
}

export function saveBest(score) {
  try {
    window.localStorage.setItem(KEY, String(Math.floor(score)));
  } catch {
    // No storage: the score simply is not kept.
  }
}
