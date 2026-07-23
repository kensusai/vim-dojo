/**
 * Best records per exercise (R4): medals and best keystroke counts only ever
 * improve. They improve INDEPENDENTLY: medal thresholds depend on difficulty,
 * so a lower keystroke count judged at a harder difficulty may carry a worse
 * medal — the medal must still never go down (R4 / 禁止事項).
 */
import type { Attempt } from "./attempt";
import type { Medal } from "./medal";

export interface ExerciseBest {
  medal: Medal;
  keystrokes: number;
}

const MEDAL_RANK: Record<Medal, number> = { gold: 3, silver: 2, bronze: 1 };

/**
 * Fold an attempt into the current best. Abandoned attempts never change
 * the best; a cleared attempt improves the medal and the keystroke count
 * each monotonically (R4).
 */
export function improveBest(
  current: ExerciseBest | undefined,
  attempt: Attempt,
): ExerciseBest | undefined {
  if (attempt.result !== "cleared" || attempt.medal === null) return current;
  if (!current) return { medal: attempt.medal, keystrokes: attempt.keystrokes };
  const medal =
    MEDAL_RANK[attempt.medal] > MEDAL_RANK[current.medal]
      ? attempt.medal
      : current.medal;
  const keystrokes = Math.min(current.keystrokes, attempt.keystrokes);
  if (medal === current.medal && keystrokes === current.keystrokes)
    return current;
  return { medal, keystrokes };
}
