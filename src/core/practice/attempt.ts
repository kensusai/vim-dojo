/**
 * Attempt: one play of an exercise (docs/domain.md 用語集).
 * Append-only history — the raw material for growth graphs and weakness
 * analysis (docs/database.md attempts store).
 */
import type { CommandId, ExerciseId } from "../ids";
import type { ExerciseSource } from "./exercise";
import type { Medal } from "./medal";

export type AttemptResult = "cleared" | "abandoned";

export interface Attempt {
  exerciseId: ExerciseId;
  source: ExerciseSource;
  /** Completion instant; its *local date* decides the active day (R12). */
  playedAt: Date;
  result: AttemptResult;
  /** All keys pressed from first input to completion (R2). */
  keystrokes: number;
  /** Medal for cleared attempts (R3); abandoned attempts earn none. */
  medal: Medal | null;
  practicedCommands: CommandId[];
  /** First keystroke → completion. 0 when abandoned before any input. */
  durationMs: number;
}
