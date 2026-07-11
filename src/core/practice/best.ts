/**
 * Best records per exercise (R4): medals and best keystroke counts only ever
 * improve. Medal and keystrokes always travel together because the medal is
 * a pure function of keystrokes for a fixed par (R3).
 */
import type { Attempt } from "./attempt";
import type { Medal } from "./medal";

export interface ExerciseBest {
  medal: Medal;
  keystrokes: number;
}

/**
 * Fold an attempt into the current best. Abandoned attempts never change
 * the best; a cleared attempt replaces it only with fewer keystrokes (R4).
 */
export function improveBest(
  current: ExerciseBest | undefined,
  attempt: Attempt,
): ExerciseBest | undefined {
  if (attempt.result !== "cleared" || attempt.medal === null) return current;
  if (current && attempt.keystrokes >= current.keystrokes) return current;
  return { medal: attempt.medal, keystrokes: attempt.keystrokes };
}
