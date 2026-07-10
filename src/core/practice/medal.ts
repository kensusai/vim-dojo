/**
 * Medal judgment for a cleared attempt (docs/domain.md R3).
 * Gold: keystrokes <= par. Silver: keystrokes <= ceil(par * 1.5). Bronze: cleared.
 */

export type Medal = "gold" | "silver" | "bronze";

/**
 * Judge the medal for a cleared attempt.
 *
 * @param par - reference keystroke count of the exercise; generation
 *   guarantees par >= 3 (docs/domain.md 例外ケース), enforced here as a guard
 * @param keystrokes - keys pressed from first input to clear (R2)
 * @throws RangeError when inputs violate domain invariants (non-integer,
 *   par < 1, keystrokes < 1) — callers pass values already shaped by core,
 *   so this firing means a programming error, not user input
 */
export function judgeMedal(par: number, keystrokes: number): Medal {
  if (!Number.isInteger(par) || par < 1) {
    throw new RangeError(`par must be a positive integer, got ${par}`);
  }
  if (!Number.isInteger(keystrokes) || keystrokes < 1) {
    throw new RangeError(
      `keystrokes must be a positive integer, got ${keystrokes}`,
    );
  }
  if (keystrokes <= par) return "gold";
  if (keystrokes <= Math.ceil(par * 1.5)) return "silver";
  return "bronze";
}
