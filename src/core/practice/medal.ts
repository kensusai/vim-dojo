/**
 * Medal judgment for a cleared attempt (docs/domain.md R3).
 * At ふつう: gold <= par, silver <= ceil(par * 1.5), else bronze. Difficulty
 * scales these thresholds (docs/difficulty via core/difficulty.ts) — easy
 * widens the gold band, hard keeps it at par. Thresholds never affect whether
 * a clear happens, only the medal.
 */
import { configFor, type Difficulty } from "../difficulty";

export type Medal = "gold" | "silver" | "bronze";

/** The keystroke lines a cleared attempt is judged against (R3). */
export interface MedalThresholds {
  /** Last keystroke count that still earns gold. */
  goldMax: number;
  /** Last keystroke count that still earns silver. */
  silverMax: number;
}

/**
 * The medal thresholds for an exercise at the given difficulty. This is THE
 * single home of the R3 formula — judgment (judgeMedal) and every gauge /
 * boss display must derive from it, or thresholds drift apart when tuned.
 *
 * @throws RangeError when par is not a positive integer (programming error;
 *   generation guarantees par >= 3, docs/domain.md 例外ケース)
 */
export function medalThresholds(
  par: number,
  difficulty: Difficulty = "normal",
): MedalThresholds {
  if (!Number.isInteger(par) || par < 1) {
    throw new RangeError(`par must be a positive integer, got ${par}`);
  }
  const { goldFactor, silverFactor } = configFor(difficulty);
  return {
    goldMax: Math.floor(par * goldFactor),
    silverMax: Math.ceil(par * silverFactor),
  };
}

/**
 * Judge the medal for a cleared attempt at the given difficulty.
 *
 * @param par - reference keystroke count of the exercise
 * @param keystrokes - keys pressed from first input to clear (R2)
 * @param difficulty - defaults to normal (par-optimal gold)
 * @throws RangeError when inputs violate domain invariants (non-integer,
 *   par < 1, keystrokes < 1) — callers pass values already shaped by core,
 *   so this firing means a programming error, not user input
 */
export function judgeMedal(
  par: number,
  keystrokes: number,
  difficulty: Difficulty = "normal",
): Medal {
  if (!Number.isInteger(keystrokes) || keystrokes < 1) {
    throw new RangeError(
      `keystrokes must be a positive integer, got ${keystrokes}`,
    );
  }
  const { goldMax, silverMax } = medalThresholds(par, difficulty);
  if (keystrokes <= goldMax) return "gold";
  if (keystrokes <= silverMax) return "silver";
  return "bronze";
}
