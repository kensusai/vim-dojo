/**
 * Medal judgment for a cleared attempt (docs/domain.md R3).
 * At ふつう: gold <= par, silver <= ceil(par * 1.5), else bronze. Difficulty
 * scales these thresholds (docs/difficulty via core/difficulty.ts) — easy
 * widens the gold band, hard keeps it at par. Thresholds never affect whether
 * a clear happens, only the medal.
 */
import { configFor, type Difficulty } from "../difficulty";

export type Medal = "gold" | "silver" | "bronze";

/**
 * Judge the medal for a cleared attempt at the given difficulty.
 *
 * @param par - reference keystroke count of the exercise; generation
 *   guarantees par >= 3 (docs/domain.md 例外ケース), enforced here as a guard
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
  if (!Number.isInteger(par) || par < 1) {
    throw new RangeError(`par must be a positive integer, got ${par}`);
  }
  if (!Number.isInteger(keystrokes) || keystrokes < 1) {
    throw new RangeError(
      `keystrokes must be a positive integer, got ${keystrokes}`,
    );
  }
  const { goldFactor, silverFactor } = configFor(difficulty);
  if (keystrokes <= Math.floor(par * goldFactor)) return "gold";
  if (keystrokes <= Math.ceil(par * silverFactor)) return "silver";
  return "bronze";
}
