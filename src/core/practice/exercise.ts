/**
 * Exercise: the smallest unit of play (docs/domain.md 用語集).
 * Definitions come from curriculum content or the generator — never from
 * storage; only results (Attempt, bests) are persisted.
 */
import type { CommandId, ExerciseId } from "../ids";

export interface Exercise {
  id: ExerciseId;
  /** Shown as the quest title, e.g. 「関数名 fetchData を loadUser に変えよ」 */
  title: string;
  initialBuffer: string;
  /** Clear the exercise the moment the buffer equals this text (R1). */
  targetBuffer: string;
  /** Reference keystroke count for medals (R3). Integer >= 1. */
  par: number;
  /** Commands this exercise practices — the input for weakness analysis (R19). */
  practicedCommands: CommandId[];
}

/** Where an attempt happened; drives XP rules (R15/R16) and analytics. */
export type ExerciseSource = "lesson" | "drill" | "daily";

/**
 * Guard the invariants the generator/content must provide (domain.md
 * 例外ケース: no exercise may start already solved). Throwing here means a
 * content or generator bug, not a user error.
 */
export function assertValidExercise(exercise: Exercise): void {
  if (!Number.isInteger(exercise.par) || exercise.par < 1) {
    throw new RangeError(
      `exercise ${exercise.id}: par must be a positive integer, got ${exercise.par}`,
    );
  }
  if (exercise.initialBuffer === exercise.targetBuffer) {
    throw new RangeError(
      `exercise ${exercise.id}: initialBuffer must differ from targetBuffer`,
    );
  }
}
