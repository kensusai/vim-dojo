/**
 * PracticeSession: orchestrates one attempt at one exercise against the
 * VimEngine port. Owns the clear judgment (R1) and keystroke counting (R2) —
 * the engine only reports raw keys and buffer states.
 */
import type { Clock, VimEngine } from "../ports";
import type { Attempt } from "./attempt";
import {
  assertValidExercise,
  type Exercise,
  type ExerciseSource,
} from "./exercise";
import type { Difficulty } from "../difficulty";
import { judgeMedal } from "./medal";

export type SessionState = "playing" | "cleared" | "abandoned";

export interface PracticeSession {
  state(): SessionState;
  /** Keys counted so far (R2). Counting stops the moment the session ends. */
  keystrokes(): number;
  /**
   * Fires exactly once, at the moment the buffer first equals the target
   * (R1). Cursor position is irrelevant. Returns an unsubscribe function.
   */
  onCleared(listener: (attempt: Attempt) => void): () => void;
  /**
   * Give up the exercise. Returns the abandoned attempt (still recorded —
   * it feeds weakness analysis; domain.md 例外ケース).
   * @throws Error if the session already ended (caller bug).
   */
  abandon(): Attempt;
}

export function startPracticeSession(options: {
  exercise: Exercise;
  source: ExerciseSource;
  engine: VimEngine;
  clock: Clock;
  difficulty?: Difficulty;
}): PracticeSession {
  const { exercise, source, engine, clock } = options;
  const difficulty = options.difficulty ?? "normal";
  assertValidExercise(exercise);

  let state: SessionState = "playing";
  let keystrokes = 0;
  let firstKeystrokeAt: Date | null = null;
  const clearedListeners = new Set<(attempt: Attempt) => void>();

  engine.reset(exercise.initialBuffer);

  const buildAttempt = (
    result: Attempt["result"],
    playedAt: Date,
  ): Attempt => ({
    exerciseId: exercise.id,
    source,
    playedAt,
    result,
    keystrokes,
    medal:
      result === "cleared"
        ? judgeMedal(exercise.par, keystrokes, difficulty)
        : null,
    practicedCommands: exercise.practicedCommands,
    durationMs: firstKeystrokeAt
      ? playedAt.getTime() - firstKeystrokeAt.getTime()
      : 0,
  });

  const unsubscribeKeys = engine.onKeystroke(() => {
    if (state !== "playing") return;
    keystrokes += 1;
    firstKeystrokeAt ??= clock.now();
  });

  const unsubscribeBuffer = engine.onBufferChange((buffer) => {
    if (state !== "playing") return;
    if (buffer !== exercise.targetBuffer) return;
    state = "cleared";
    stopListening();
    const attempt = buildAttempt("cleared", clock.now());
    for (const listener of clearedListeners) listener(attempt);
  });

  const stopListening = () => {
    unsubscribeKeys();
    unsubscribeBuffer();
  };

  return {
    state: () => state,
    keystrokes: () => keystrokes,
    onCleared(listener) {
      clearedListeners.add(listener);
      return () => clearedListeners.delete(listener);
    },
    abandon() {
      if (state !== "playing") {
        throw new Error(`cannot abandon a session that is already ${state}`);
      }
      state = "abandoned";
      stopListening();
      return buildAttempt("abandoned", clock.now());
    },
  };
}
