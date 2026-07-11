/**
 * Profile: the player's current state — everything persisted except the
 * append-only attempt log and daily challenge records (docs/database.md).
 * Derivable facts are intentionally absent: unlocked commands come from
 * lessonClears (R5), the level comes from xp (R17).
 */
import type { AchievementId, ExerciseId, LessonId } from "./ids";
import type { ExerciseBest } from "./practice/best";
import { initialStreakState, type StreakState } from "./progression/streak";

export interface Profile {
  xp: number;
  streak: StreakState;
  lessonClears: Record<LessonId, { clearedAt: Date }>;
  exerciseBests: Record<ExerciseId, ExerciseBest>;
  achievements: Record<AchievementId, { unlockedAt: Date }>;
  /** For the export nudge (UC6): null until the first export. */
  lastExportAt: Date | null;
}

export const initialProfile: Profile = {
  xp: 0,
  streak: initialStreakState,
  lessonClears: {},
  exerciseBests: {},
  achievements: {},
  lastExportAt: null,
};
